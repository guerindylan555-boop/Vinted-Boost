import { Hono } from 'hono';
import { handle } from 'hono/vercel';

const app = new Hono();
app.get('/', (c) => c.json({ status: 'ok' }));

export const config = { runtime: 'nodejs' };
export default handle(app);
