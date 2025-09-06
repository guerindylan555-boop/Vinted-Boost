import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { corsStrict } from '../_lib/cors';

const app = new Hono();

app.use('*', corsStrict);

// Optional redirect handler if you ever link to /api/files/:id
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'Missing id' }, 400);
  // We don't know the extension here; prefer using the public URL returned at upload time (Supabase Storage).
  return c.json({ error: 'Use the returned public URL to fetch the file.' }, 400);
});

// Delete (admin). If ADMIN_KEY is set, require ?key=...
// Prefer DELETE /api/files?id=uploads/uuid.ext (implemented in index.ts)

export const config = {
  runtime: 'nodejs20.x',
};

export default handle(app);
