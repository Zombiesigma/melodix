# Melodix

Melodix is a Next.js + Firebase music community website for lyrics, chords, bands, albums, and band submissions.

## Stack
- Next.js App Router, React, TypeScript, Tailwind CSS
- Firebase Authentication + Cloud Firestore for application data
- GitHub Contents API for public image assets in `Zombiesigma/chord-aset`

## Local setup
1. Install Node.js 20.9+.
2. Run `npm install`.
3. Copy `.env.local.example` to `.env.local` and fill all Firebase Admin and GitHub server secrets.
4. Run `npm run dev`.

## GitHub image storage
The application uploads images through authenticated server routes. The browser receives only the resulting public raw URL; `GITHUB_TOKEN` is never exposed to client code.

Configure a fine-grained GitHub token for owner `Zombiesigma`, repository `chord-aset`, with **Contents: Read and write**. Configure:
- `GITHUB_OWNER=Zombiesigma`
- `GITHUB_REPO=chord-aset`
- `GITHUB_BRANCH=main`

The repository must be **public** for `raw.githubusercontent.com` image URLs to be readable by visitors. Keep the token secret in Vercel Environment Variables and local `.env.local`; never commit it. Images are written under `public/uploads/songs`, `public/uploads/albums`, `public/uploads/bands/logos`, and `public/uploads/bands/covers`.

The upload API verifies Firebase ID tokens with Firebase Admin SDK and checks active-admin status or approved-band ownership before accepting a file. Allowed formats: JPG, PNG, WEBP, AVIF. Maximum size: 4 MB.

## Firebase Admin setup
Create a service account in Firebase Console → Project settings → Service accounts. Add its project ID, client email, and private key as `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, and `FIREBASE_ADMIN_PRIVATE_KEY`. For Vercel, store the private key with literal `\n` line breaks; the server normalizes them.

Firebase Authentication and Firestore remain the source of truth for users, roles, bands, songs, albums, and review status. GitHub stores image binaries only; Firestore stores their returned URLs.

## Validation
```bash
npm run lint
npm run typecheck
npm run build
```

Before production, deploy `firestore.rules` and `firestore.indexes.json`, create an active admin document at `admins/{uid}`, configure Firebase Admin service-account variables, and test uploads using a non-admin band account and an admin account.
