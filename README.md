# Vinted Try-On (MVP)

Page mobile-first permettant d’upload une image de vêtement, de générer une image « portée » (via OpenRouter / Google Gemini 2.5 preview), et d’afficher le résultat.

## Démarrage rapide

1. Créez une clé API OpenRouter: https://openrouter.ai/settings/keys
2. Exportez la clé au lancement (les variables débutant par `EXPO_PUBLIC_` sont exposées au client):

```sh
EXPO_PUBLIC_OPENROUTER_API_KEY=sk-or-xxxxxxxxxxxx npm run web
# ou
EXPO_PUBLIC_OPENROUTER_API_KEY=sk-or-xxxxxxxxxxxx npm start
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
- Upload: UploadThing (`@uploadthing/expo`) — endpoint `imageUploader` (3 images, 20MB, ACL public-read)

## Fichiers clés

- `app/index.tsx`: écran unique Upload → Générer → Résultat
- `lib/openrouter.ts`: appel API OpenRouter pour l’image « portée »
- `tailwind.config.js` + `babel.config.js`: config NativeWind

## Notes

- Production: privilégier un appel côté serveur (Fastify) pour ne pas exposer la clé. Ici, c’est un MVP client-side.
- Vous pouvez enrichir (poses multiples, étapes temps réel, UploadThing, etc.).

## UploadThing (étape 2)

- Backend: créez un FileRouter `imageUploader` (3 images, 20MB, ACL `public-read`). Voir `server/README.md`.
- Front: le service `lib/upload/uploadService.ts` envoie les fichiers via `@uploadthing/expo` et remplit `useUploadStore` (progression, erreurs, URLs).
- Config: définissez `EXPO_PUBLIC_UPLOADTHING_URL` si vous utilisez une origine personnalisée.
