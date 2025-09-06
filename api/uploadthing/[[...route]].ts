import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { createUploadthing, type FileRouter, createRouteHandler } from 'uploadthing/server';

export const config = {
  runtime: 'edge',
};

const app = new Hono();

const f = createUploadthing();

export const fileRouter = {
  // Endpoint slug must match the client: endpoint: 'imageUploader'
  imageUploader: f({
    image: { maxFileCount: 3, maxFileSize: '16MB' },
  })
    .middleware(async ({ req }) => {
      // Place to verify auth/session if needed
      // Example: const userId = await getUserIdFromHeader(req)
      return {};
    })
    .onUploadComplete(async ({ file }) => {
      console.log('UploadThing: uploaded', file.key, file.url);
    }),
} satisfies FileRouter;

export type AppFileRouter = typeof fileRouter;

const utHandler = createRouteHandler({ router: fileRouter });

// Catch-all under this function path: supports /api/uploadthing and /api/uploadthing/<slug>
app.all('*', async (c) => {
  const res = await utHandler(c.req.raw);
  return res as Response;
});

export default handle(app);
