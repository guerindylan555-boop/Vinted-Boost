import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { ensureSchema, getDb } from '../_lib/db';
import { corsStrict } from '../_lib/cors';

const app = new Hono();

// Restrictive CORS (allow only env-configured origins)
app.use('*', corsStrict);

// Health
app.get('/health', (c) => c.json({ status: 'ok' }));

// List files (admin). If ADMIN_KEY is set, require ?key=...
app.get('/', async (c) => {
  await ensureSchema();
  const adminKey = (process as any)?.env?.ADMIN_KEY;
  const provided = c.req.query('key');
  if (adminKey && provided !== adminKey) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const db = getDb();
  const limit = Math.max(1, Math.min(200, parseInt(c.req.query('limit') || '50', 10) || 50));
  const res = await db.execute({
    sql: 'SELECT id, mime, size, created_at FROM files ORDER BY created_at DESC LIMIT ?',
    args: [limit],
  });
  const rows = res.rows as any[];
  return c.json(rows.map((r) => ({ id: r.id, mime: r.mime, size: r.size, created_at: r.created_at })));
});

// Upload up to 3 images via multipart/form-data (field name: "files")
app.post('/', async (c) => {
  await ensureSchema();

  // Web-standard FormData (supported on Vercel Node runtimes as of Node 18+)
  let form: FormData;
  try {
    form = await c.req.formData();
  } catch (e: any) {
    return c.json({ error: 'Invalid multipart/form-data' }, 400);
  }

  const candidates = [
    ...form.getAll('files'),
    // also accept single-field variants just in case
    ...[form.get('file'), form.get('image')].filter(Boolean) as any[],
  ];
  const files = candidates.filter((x: any) => x && typeof x.arrayBuffer === 'function') as any[];

  if (files.length === 0) {
    return c.json({ error: 'No files provided' }, 400);
  }
  if (files.length > 3) {
    return c.json({ error: 'Too many files (max 3)' }, 400);
  }

  const db = getDb();
  const now = Date.now();
  const results: Array<{ id: string; url: string; size: number; mime: string }> = [];

  for (const file of files as any[]) {
    const mime: string = (file as any).type || 'application/octet-stream';
    if (!mime.startsWith('image/')) {
      return c.json({ error: 'Only image uploads are allowed' }, 400);
    }

    const ab = await (file as any).arrayBuffer();
    const buf = Buffer.from(ab);
    const size = buf.byteLength;
    if (size > 16 * 1024 * 1024) {
      return c.json({ error: 'File too large (max 16MB)' }, 400);
    }

    const id = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)) as string;

    await db.execute({
      sql: 'INSERT INTO files (id, mime, size, data, created_at) VALUES (?, ?, ?, ?, ?)',
      args: [id, mime, size, buf, now],
    });

    const base = new URL(c.req.url);
    // build absolute URL to the file endpoint
    const url = `${base.origin}/api/files/${id}`;
    results.push({ id, url, size, mime });
  }

  return c.json(results, 201);
});

export const config = {
  runtime: 'nodejs',
};

export default handle(app);
