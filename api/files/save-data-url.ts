import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { corsStrict } from '../_lib/cors';
import { getSupaAdmin, getBucket } from '../_lib/supabase';

const app = new Hono();
app.use('*', corsStrict);

app.post('/', async (c) => {
  try {
    const body = await c.req.json().catch(() => null) as { dataUrl?: string; prefix?: string } | null;
    if (!body?.dataUrl) return c.json({ error: 'Missing dataUrl' }, 400);
    const prefix = (body.prefix && /^[a-z0-9_/.-]+$/i.test(body.prefix)) ? body.prefix.replace(/\/$/, '') : 'uploads';

    const m = /^data:([^;,]+);base64,(.+)$/.exec(body.dataUrl);
    if (!m) return c.json({ error: 'Invalid data URL' }, 400);
    const mime = m[1];
    const b64 = m[2];
    const buf = Buffer.from(b64, 'base64');
    const ext = (mime.split('/')[1] || 'bin').replace(/[^a-z0-9]/gi, '') || 'bin';
    const id = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
    const pathname = `${prefix}/${id}.${ext}`;
    const { error } = await getSupaAdmin().storage.from(getBucket()).upload(pathname, buf, { contentType: mime, upsert: true });
    if (error) return c.json({ error: error.message }, 500);
    const { data: pub } = getSupaAdmin().storage.from(getBucket()).getPublicUrl(pathname);
    return c.json({ id: pathname, url: pub.publicUrl, mime });
  } catch (e: any) {
    return c.json({ error: e?.message || 'Failed to save data URL' }, 500);
  }
});

export const config = { runtime: 'nodejs' };
export default handle(app);
