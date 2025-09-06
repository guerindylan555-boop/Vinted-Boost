import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { createUploadthing, type FileRouter, createRouteHandler } from 'uploadthing/server';

// Node runtime by default with @vercel/node
const app = new Hono();

const f = createUploadthing();

export const fileRouter = {
  imageUploader: f({
    image: { maxFileCount: 3, maxFileSize: '16MB' },
  })
    .middleware(async () => {
      return {};
    })
    .onUploadComplete(async ({ file }) => {
      console.log('UploadThing: uploaded', file.key, file.url);
    }),
} satisfies FileRouter;

export type AppFileRouter = typeof fileRouter;

const utHandler = createRouteHandler({ router: fileRouter });

// Health check at base path
app.get('/', (c) => c.json({ status: 'ok' }));

// Delegate to UploadThing handler for all methods
app.all('*', async (c) => {
  const res = await utHandler(c.req.raw);
  return res as Response;
});

export default handle(app);

