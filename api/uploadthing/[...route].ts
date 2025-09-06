import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { createUploadthing, type FileRouter, createRouteHandler } from 'uploadthing/server';

// Default to Node runtime (no explicit edge config) so it works with @vercel/node
const app = new Hono();

const f = createUploadthing();

export const fileRouter = {
  // Endpoint slug must match the client: endpoint: 'imageUploader'
  imageUploader: f({
    image: { maxFileCount: 3, maxFileSize: '16MB' },
  })
    .middleware(async ({ req }) => {
      // Place to verify auth/session if needed
      return {};
    })
    .onUploadComplete(async ({ file }) => {
      console.log('UploadThing: uploaded', file.key, file.url);
    }),
} satisfies FileRouter;

export type AppFileRouter = typeof fileRouter;

const utHandler = createRouteHandler({ router: fileRouter });

// Health check for base path
app.get('/', (c) => c.json({ status: 'ok' }));

// Catch-all for UploadThing routes
app.all('*', async (c) => {
  const res = await utHandler(c.req.raw);
  return res as Response;
});

export default handle(app);
