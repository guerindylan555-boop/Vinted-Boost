import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { corsStrict } from '../_lib/cors';
import { put, list, del, generateUploadURL } from '@vercel/blob';

const app = new Hono();

// Restrictive CORS (allow only env-configured origins)
app.use('*', corsStrict);

// Health
app.get('/health', (c) => c.json({ status: 'ok' }));

// Create a client-direct signed upload URL
app.post('/create-upload', async (c) => {
  try {
    const { url, pathname } = await generateUploadURL({ access: 'public' } as any);
    return c.json({ url, pathname });
  } catch (e: any) {
    return c.json({ error: e?.message || 'Failed to create upload URL' }, 500);
  }
});

// Debug (requires ADMIN_KEY): shows env presence and DB connectivity
app.get('/debug', async (c) => {
  const adminKey = (process as any)?.env?.ADMIN_KEY;
  const provided = c.req.query('key');
  if (adminKey && provided !== adminKey) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const env = (process as any)?.env || {};
  const out: any = {
    env: {
      BLOB_READ_WRITE_TOKEN: Boolean(env.BLOB_READ_WRITE_TOKEN),
      ALLOWED_ORIGINS: (env.ALLOWED_ORIGINS || '').split(',').map((s: string) => s.trim()).filter(Boolean).length,
    },
    blob: { ok: false, files: null as null | number, error: null as null | string },
  };
  try {
    const { blobs } = await list({ prefix: 'uploads/' });
    out.blob.ok = true;
    out.blob.files = (blobs || []).length;
  } catch (e: any) {
    out.blob.error = e?.message || String(e);
  }
  return c.json(out);
});

// List files (admin). If ADMIN_KEY is set, require ?key=...
app.get('/', async (c) => {
  const adminKey = (process as any)?.env?.ADMIN_KEY;
  const provided = c.req.query('key');
  if (adminKey && provided !== adminKey) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const limit = Math.max(1, Math.min(200, parseInt(c.req.query('limit') || '50', 10) || 50));
  const { blobs } = await list({ prefix: 'uploads/' });
  const rows = (blobs || [])
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .slice(0, limit)
    .map((b) => ({ id: b.pathname, url: b.url, size: b.size, created_at: new Date(b.uploadedAt).getTime(), mime: undefined }));
  return c.json(rows);
});

// Upload up to 3 images via multipart/form-data (field name: "files")
app.post('/', async (c) => {
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

  const results: Array<{ id: string; url: string; size: number; mime: string }> = [];

  for (const file of files as any[]) {
    const mime: string = (file as any).type || 'application/octet-stream';
    if (!mime.startsWith('image/')) {
      return c.json({ error: 'Only image uploads are allowed' }, 400);
    }

    const size = (file as any).size ?? 0;
    if (size > 16 * 1024 * 1024) {
      return c.json({ error: 'File too large (max 16MB)' }, 400);
    }

    const name = (file as any).name as string | undefined;
    const ext = (name && name.includes('.')) ? name.split('.').pop() : (mime.split('/')[1] || 'bin');
    const id = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)) as string;
    const pathname = `uploads/${id}.${ext}`;
    const token = (process as any)?.env?.BLOB_READ_WRITE_TOKEN;
    const resPut = await put(pathname, file as any, { access: 'public', contentType: mime, addRandomSuffix: false, token });
    results.push({ id: pathname, url: resPut.url, size, mime });
  }

  return c.json(results, 201);
});

// Delete with query (?id=uploads/uuid.ext) — admin optional
app.delete('/', async (c) => {
  const adminKey = (process as any)?.env?.ADMIN_KEY;
  const provided = c.req.query('key');
  if (adminKey && provided !== adminKey) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.query('id');
  if (!id) return c.json({ error: 'Missing id' }, 400);
  const token = (process as any)?.env?.BLOB_READ_WRITE_TOKEN;
  await del(id, { token });
  return c.json({ ok: true });
});

export const config = {
  runtime: 'nodejs',
};

export default handle(app);
