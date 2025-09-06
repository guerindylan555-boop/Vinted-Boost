# Vinted Try-On (MVP)

Page mobile-first permettant d’upload une image de vêtement, de générer une image « portée » (via OpenRouter / Google Gemini 2.5 preview), et d’afficher le résultat.

## Démarrage rapide

1. Créez une clé API OpenRouter: https://openrouter.ai/settings/keys
2. Exportez la clé au lancement (les variables débutant par `EXPO_PUBLIC_` sont exposées au client):

```sh
EXPO_PUBLIC_OPENROUTER_API_KEY=sk-or-xxxxxxxxxxxx npm run web
# ou
EXPO_PUBLIC_OPENROUTER_API_KEY=sk-or-xxxxxxxxxxxx npm start
## (optionnel) si vous testez l’upload en natif:
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

3. Sur le web, utilisez le bouton « Choisir une image ». Sur mobile (Expo Go), le sélecteur de galerie sera utilisé.
4. Cliquez « Générer » puis attendez le chargement; le résultat s’affiche en 4:5 avec le label « Image assistée par IA ».

Réglages (clé API dans l’UI)
- Cliquez sur « Réglages » en haut de l’écran pour coller votre clé `sk-or-...`.
- La clé est stockée localement (LocalStorage sur web, fichier app sur mobile) et surcharge la variable d’environnement si présente.

## Stack

- Expo (SDK 53) + Expo Router
- NativeWind (Tailwind RN) pour le style mobile-first
- Upload web: input `capture` (fallback) / mobile: `expo-image-picker`
- Appel IA client: OpenRouter `google/gemini-2.5-flash-image-preview`
- Upload API: Turso-backed blob storage (Hono on Vercel). POST `/api/files` accepts up to 3 images; GET `/api/files/:id` serves them.

## Fichiers clés

- `app/index.tsx`: écran unique Upload → Générer → Résultat
- `lib/openrouter.ts`: appel API OpenRouter pour l’image « portée »
- `tailwind.config.js` + `babel.config.js`: config NativeWind

## Notes

- Production: privilégier un appel côté serveur (Fastify) pour ne pas exposer la clé. Ici, c’est un MVP client-side.
- Vous pouvez enrichir (poses multiples, étapes temps réel, etc.).

## Upload via Turso (nouveau)

- Backend: `api/files` utilise Turso pour stocker les blobs et renvoyer des URLs publiques.
- Front: `lib/upload/uploadService.ts` envoie les fichiers via `FormData` (web et natif) et met à jour `useUploadStore`.
- Limites: images uniquement, max 3 fichiers, max 16MB par fichier.
 - Note Vercel: les Serverless Functions ont une limite de taille de requête d’environ 5MB. Au‑delà, envisagez un stockage objet (S3/R2/Vercel Blob) et n’enregistrez dans Turso que les métadonnées.

### Configuration requise

Définir ces variables (Vercel → Project → Settings → Environment Variables):

```
TURSO_DATABASE_URL=libsql://<your-db>.turso.io
TURSO_AUTH_TOKEN=<turso-auth-token>
```

Optionnel pour l’app Expo native (Android/iOS):

```
EXPO_PUBLIC_API_BASE_URL=https://your-app.vercel.app
```

En local, vous pouvez exporter ces variables avant de démarrer.

### Test rapide de l’API

```sh
# POST un fichier (web: via un formulaire; shell: via curl)
curl -s -X POST -F "files=@/path/to/image.jpg" https://your-app.vercel.app/api/files | jq

# GET le fichier
curl -I https://your-app.vercel.app/api/files/<id>
```
