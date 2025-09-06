Vercel Blob upload backend (Hono)

- API endpoints:
  - GET `/api/files/health` — ping/health.
  - GET `/api/files?limit=100[&key=ADMIN_KEY]` — liste (admin optionnel).
  - POST `/api/files` — multipart/form-data (field `files`), jusqu’à 3 images, 16MB max chacune. Retourne `[ { id, url } ]`.
  - DELETE `/api/files?id=uploads/<uuid>.<ext>[&key=ADMIN_KEY]` — suppression (admin optionnel).

- Storage: Vercel Blob (public). Les objets sont sous le préfixe `uploads/`.

- Env vars (Vercel → Project Settings → Environment Variables):
  - `ALLOWED_ORIGINS` (ex: `https://your-app.vercel.app,http://localhost:19006`)
  - `BLOB_READ_WRITE_TOKEN` (optionnel selon configuration)

- Client: utilisez `lib/upload/uploadService.ts` pour envoyer des images via `FormData`.

Remarques:
- Pour des volumes/tailles importantes, déporter les blobs sur un object storage (S3/R2) et garder Turso pour les métadonnées.
- Les fonctions API utilisent le runtime Node par défaut (Vercel) compatible multipart/env.
- Limite de taille de requête: privilégiez des images de petite taille.
- CORS: restreint via `ALLOWED_ORIGINS`.
