Turso upload backend (Hono)

- API endpoints:
  - GET `/api/files/health` — ping/health.
  - GET `/api/files?limit=100[&key=ADMIN_KEY]` — liste (admin optionnel).
  - POST `/api/files` — multipart/form-data (field `files`), jusqu’à 3 images, 16MB max chacune. Retourne `[ { id, url } ]`.
  - DELETE `/api/files/:id[?key=ADMIN_KEY]` — suppression (admin optionnel).
  - GET `/api/files/:id` — renvoie l’image avec `Content-Type` correct et cache long.

- Storage: Turso (libSQL). Table `files(id TEXT PK, mime TEXT, size INTEGER, data BLOB, created_at INTEGER)`.

- Env vars (Vercel → Project Settings → Environment Variables):
  - `TURSO_DATABASE_URL`
  - `TURSO_AUTH_TOKEN`
  - `ALLOWED_ORIGINS` (ex: `https://your-app.vercel.app,https://other.example`)

- Client: utilisez `lib/upload/uploadService.ts` pour envoyer des images via `FormData`.

Remarques:
- Pour des volumes/tailles importantes, déporter les blobs sur un object storage (S3/R2) et garder Turso pour les métadonnées.
- Les fonctions API utilisent le runtime Node (`@vercel/node`) pour une meilleure compatibilité multipart/env.
- Attention: les Serverless Functions Vercel ont une limite de taille de requête (~5MB). Pour des fichiers >5MB, utilisez un stockage objet (S3/R2/Vercel Blob) ou un serveur dédié.
 - CORS: activé (origin `*`) pour simplifier les tests cross-origin (Expo dev web, natif → prod). Restreignez à votre domaine en prod si besoin.
