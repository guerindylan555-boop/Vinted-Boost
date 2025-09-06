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

export const config = {
  runtime: 'nodejs',
};

export default handle(app);

