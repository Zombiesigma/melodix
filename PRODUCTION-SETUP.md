# Melodix — Production Setup & Migration Notes

## 1. Firebase project configuration

The repository intentionally does not include the previous `.env.local` values. Copy `.env.local.example` to `.env.local` and add the Firebase Web App configuration for the intended project. Add the same values to Vercel for Production, Preview, and Development as needed.

Firebase Web API keys are public client configuration. They are not authorization. Firestore Security Rules are the enforcement boundary. Never commit Firebase Admin SDK service-account JSON or private keys.

## 2. GitHub image repository

Configure the server-only GitHub environment variables in `.env.local` and Vercel: `GITHUB_TOKEN`, `GITHUB_OWNER=Zombiesigma`, `GITHUB_REPO=chord-aset`, and `GITHUB_BRANCH=main`. The repository must be public because public pages use `raw.githubusercontent.com` image URLs. Use a fine-grained token restricted to this repository with Contents read/write permission. Never expose the token in client code or `NEXT_PUBLIC_` variables.

Configure Firebase Admin SDK server variables: `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, and `FIREBASE_ADMIN_PRIVATE_KEY`. These are required by the protected upload/delete API routes. Do not commit service-account keys.

Images are uploaded under `public/uploads/` in the GitHub repository. Firestore stores only image URLs. The upload API accepts JPG, PNG, WEBP, and AVIF up to 4 MB and verifies the Firebase ID token plus active-admin or approved-band ownership.

## 3. Admin bootstrap

1. Create the administrator account in Firebase Authentication.
2. Copy the account UID.
3. In Firestore, create `admins/{UID}` with `active: true`.
4. Do not create or promote admins from a public client form.
5. To disable the admin, set `active: false` or delete the document.

Admin pages now consistently require `active === true`.

## 4. Deploy Firestore rules and indexes

Install Firebase CLI and select the correct Firebase project:

```bash
firebase login
firebase use --add
firebase deploy --only firestore:rules,firestore:indexes
```

Test in a staging Firebase project first. The new rules are intentionally restrictive and will reject legacy documents that do not have the expected owner fields.

## 5. Data expectations

- `users/{uid}`: `uid`, `email`, `displayName`, `role` (`fan` or admin-assigned `band`), timestamps; approved band accounts additionally receive `bandId`.
- `admins/{uid}`: `active: true` for an enabled admin.
- `bandApplications/{id}`: `ownerUid`, `bandName`, `slug`, `status`, contact/profile fields.
- `bands/{id}`: `ownerUid`, `verificationStatus: approved`, `isPublished: true` after approval.
- `songs/{id}`: `bandId`, `ownerUid` for band-owned work, `isPublished`, `status`, `slug`, `title`, `artist`, `lyricsWithChords`.
- `albums/{id}`: `bandId`, `ownerUid`, `isPublished`, `status`.
- `announcements/{id}`: `isPublished` and content fields.

Admin-created songs may omit `ownerUid`; only admins can create or manage those records.

## 6. Existing data compatibility

Band profile song lookup now uses stable `bandId` first. If no songs are found by `bandId`, it falls back to the legacy `artist` name lookup. Existing song documents can be migrated gradually by adding the correct `bandId` after reviewing each record. Do not mass-update records without a backup.

The `/artists` route redirects to `/bands` to preserve old inbound links.

## 7. Validation commands

```bash
npm install
npm run lint
npm run typecheck
npm run build
```

The source package was prepared in an environment where dependency installation timed out, so a successful build has not been confirmed here. Run all commands locally or in CI after installing dependencies. Fix any type or lint issues before production deployment.

## 8. Go-live checklist

- [ ] Fill Firebase Web, Firebase Admin, and GitHub media environment variables in Vercel.
- [ ] Confirm `Zombiesigma/chord-aset` is public and the fine-grained token has Contents read/write permission.
- [ ] Test uploads for song cover, album cover, band profile cover, and band logo.
- [ ] Enable Email/Password authentication.
- [ ] Add production domain to Firebase Auth authorized domains.
- [ ] Deploy Firestore rules and indexes to the correct Firebase project.
- [ ] Create and test an active admin UID.
- [ ] Test fan registration and sign-in.
- [ ] Test band application submission and admin approval.
- [ ] Test band profile edit and song/album draft creation.
- [ ] Test admin song publishing and public song visibility.
- [ ] Test public users cannot read drafts or write admin records.
- [ ] Test all pages on mobile, tablet, and desktop.
- [ ] Configure Firebase App Check, backups, monitoring, and an admin recovery process.
