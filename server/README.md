UploadThing backend placeholder

- Create a small server (Fastify/Hono/Next) exposing UploadThing FileRouter.
- Configure an endpoint name `imageUploader` with constraints: images only, max 3 files, size up to 20MB, ACL `public-read`.
- Set your server URL in an environment variable (e.g., EXPO_PUBLIC_UPLOADTHING_URL) for the Expo app to call.

Example (Hono + Vercel/Node adapter) — not implemented here to keep client repo clean.

