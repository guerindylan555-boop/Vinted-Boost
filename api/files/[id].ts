import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { ensureSchema, getDb } from '../_lib/db';

const app = new Hono();

app.get('/:id', async (c) => {
  await ensureSchema();
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'Missing id' }, 400);

  const db = getDb();
  const res = await db.execute({ sql: 'SELECT mime, data FROM files WHERE id = ?', args: [id] });
  const row = res.rows?.[0] as any;
  if (!row) return c.json({ error: 'Not found' }, 404);

  const mime = row.mime as string;
  const data = row.data as Uint8Array | Buffer;
  return new Response(data, {
    status: 200,
    headers: {
      'Content-Type': mime || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
});

// Delete (admin). If ADMIN_KEY is set, require ?key=...
app.delete('/:id', async (c) => {
  await ensureSchema();
  const adminKey = (process as any)?.env?.ADMIN_KEY;
  const provided = c.req.query('key');
  if (adminKey && provided !== adminKey) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'Missing id' }, 400);
  const db = getDb();
  await db.execute({ sql: 'DELETE FROM files WHERE id = ?', args: [id] });
  return c.json({ ok: true });
});

export const config = {
  runtime: 'nodejs',
};

export default handle(app);
