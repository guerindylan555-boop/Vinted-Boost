import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { corsStrict } from '../_lib/cors';
import { put } from '@vercel/blob';

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
    const token = (process as any)?.env?.BLOB_READ_WRITE_TOKEN;
    const resPut = await put(pathname, buf, { access: 'public', contentType: mime, addRandomSuffix: false, token });
    return c.json({ id: pathname, url: resPut.url, mime });
  } catch (e: any) {
    return c.json({ error: e?.message || 'Failed to save data URL' }, 500);
  }
});

export const config = { runtime: 'nodejs' };
export default handle(app);

