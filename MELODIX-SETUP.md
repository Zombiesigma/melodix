# Melodix — deployment checklist

## Vercel environment variables

**Firebase Web config**
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_SITE_URL`

**Firebase Admin (server-only)**
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

**GitHub media repository (server-only)**
- `GITHUB_TOKEN`
- `GITHUB_OWNER=Zombiesigma`
- `GITHUB_REPO=chord-aset`
- `GITHUB_BRANCH=main`

## GitHub token
Create a fine-grained personal access token restricted to `Zombiesigma/chord-aset`. Grant repository permission **Contents: Read and write**. Do not add the token to any `NEXT_PUBLIC_` variable, source file, or Git commit.

The `chord-aset` repository must be public because public Melodix pages render images from `raw.githubusercontent.com`. Do not store private or sensitive user files in this repository. Uploads are committed as GitHub content and therefore create repository commits.

## Firebase Admin service account
Create a service account for the same Firebase project used by the web client. Store the private key as a Vercel secret. Never commit a service-account JSON file.

## Media upload API
- `POST /api/media/upload` — multipart fields: `file`, `kind`, optional `bandId`; Authorization header: `Bearer <Firebase ID token>`.
- `POST /api/media/delete` — admin-only deletion; JSON body `{ "path": "public/uploads/..." }`.
- Kinds: `song-cover`, `album-cover`, `band-logo`, `band-cover`.
- Formats: JPG, PNG, WEBP, AVIF. Max size: 4 MB.
- Band users may upload only when they own an approved band document. Admins must have `admins/{uid}.active === true`.

## Before production
1. Configure all environment variables in Vercel Preview and Production.
2. Confirm GitHub repository visibility is Public and branch `main` exists.
3. Deploy Firestore rules and indexes.
4. Confirm active admin document exists.
5. Test profile logo, profile cover, album cover, and song cover uploads.
6. Run lint, typecheck, and production build.
