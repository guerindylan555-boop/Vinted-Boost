import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { corsStrict } from '../_lib/cors';
import { ensurePgSchema, sql } from '../_lib/dbpg';

const app = new Hono();
app.use('*', corsStrict);

// List history
app.get('/', async (c) => {
  await ensurePgSchema();
  const adminKey = (process as any)?.env?.ADMIN_KEY;
  const provided = c.req.query('key');
  if (adminKey && provided !== adminKey) return c.json({ error: 'Unauthorized' }, 401);
  const limit = Math.max(1, Math.min(200, parseInt(c.req.query('limit') || '50', 10) || 50));
  const { rows } = await sql`SELECT id, created_at, input_url, output_url FROM history ORDER BY created_at DESC LIMIT ${limit}`;
  return c.json(rows);
});

// Create entry
app.post('/', async (c) => {
  await ensurePgSchema();
  const body = await c.req.json().catch(() => null) as any;
  if (!body || (!body.input_url && !body.input_path) || (!body.output_url && !body.output_path)) {
    return c.json({ error: 'Missing input/output' }, 400);
  }
  const id = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
  await sql`
    INSERT INTO history (id, input_url, input_path, output_url, output_path, input_mime, output_mime)
    VALUES (${id}, ${body.input_url || null}, ${body.input_path || null}, ${body.output_url || null}, ${body.output_path || null}, ${body.input_mime || null}, ${body.output_mime || null})
  `;
  return c.json({ id });
});

export const config = { runtime: 'nodejs' };
export default handle(app);

