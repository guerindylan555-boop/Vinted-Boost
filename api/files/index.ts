import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { corsStrict } from '../_lib/cors';
import { getSupaAdmin, getBucket } from '../_lib/supabase';

const app = new Hono();

// Restrictive CORS (allow only env-configured origins)
app.use('*', corsStrict);

// Health
app.get('/health', (c) => c.json({ status: 'ok' }));

// Create a client-direct signed upload URL (Supabase Storage)
// Body: { filename?: string, prefix?: string, expiresIn?: number }
app.post('/create-upload', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as any;
    const prefix = (body?.prefix && /^[a-z0-9_\/-]+$/i.test(body.prefix)) ? String(body.prefix).replace(/\/$/, '') : 'uploads';
    const filename = String(body?.filename || '').trim();
    const ext = filename && filename.includes('.') ? filename.split('.').pop() : 'bin';
    const id = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
    const path = `${prefix}/${id}.${ext}`;
    // Supabase createSignedUploadUrl does not take expiresIn as a number param; use options only.
    const supa = getSupaAdmin();
    const bucket = getBucket();
    const { data, error } = await supa.storage.from(bucket).createSignedUploadUrl(path, { upsert: true } as any);
    if (error || !data) return c.json({ error: error?.message || 'Failed to create signed upload URL' }, 500);
    const { data: pub } = getSupaAdmin().storage.from(getBucket()).getPublicUrl(path);
    return c.json({ path, token: data.token, url: data.signedUrl, publicUrl: pub.publicUrl });
  } catch (e: any) {
    return c.json({ error: e?.message || 'Failed to create upload URL' }, 500);
  }
});

// Debug (requires ADMIN_KEY): shows env presence and Storage connectivity
app.get('/debug', async (c) => {
  const adminKey = (process as any)?.env?.ADMIN_KEY;
  const provided = c.req.query('key');
  if (adminKey && provided !== adminKey) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const env = (process as any)?.env || {};
  const out: any = {
    env: {
      SUPABASE_URL: Boolean(env.SUPABASE_URL),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
      ALLOWED_ORIGINS: (env.ALLOWED_ORIGINS || '').split(',').map((s: string) => s.trim()).filter(Boolean).length,
    },
    storage: { ok: false, files: null as null | number, error: null as null | string },
  };
  try {
    const { data, error } = await getSupaAdmin().storage.from(getBucket()).list('', { limit: 1 });
    if (error) throw error;
    out.storage.ok = true;
    out.storage.files = (data || []).length;
  } catch (e: any) {
    out.storage.error = e?.message || String(e);
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
  const { data, error } = await getSupaAdmin().storage.from(getBucket()).list('uploads', { limit, sortBy: { column: 'created_at', order: 'desc' } as any });
  if (error) return c.json({ error: error.message }, 500);
  const rows = (data || []).map((o) => {
    const path = `uploads/${o.name}`;
    const { data: pub } = getSupaAdmin().storage.from(getBucket()).getPublicUrl(path);
    return { id: path, url: pub.publicUrl, size: (o as any).size ?? 0, created_at: o.created_at ? new Date(o.created_at).getTime() : Date.now(), mime: undefined };
  });
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
    const path = `uploads/${id}.${ext}`;
    const { error } = await getSupaAdmin().storage.from(getBucket()).upload(path, file as any, { contentType: mime, upsert: true });
    if (error) return c.json({ error: error.message }, 500);
    const { data: pub } = getSupaAdmin().storage.from(getBucket()).getPublicUrl(path);
    results.push({ id: path, url: pub.publicUrl, size, mime });
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
  const { error } = await getSupaAdmin().storage.from(getBucket()).remove([String(id)]);
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ ok: true });
});

export const config = {
  runtime: 'nodejs',
};

export default handle(app);
