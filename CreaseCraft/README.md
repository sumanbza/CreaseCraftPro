# CreaseCraft Pro

React + Vite app on Firebase (Hosting, Auth, Firestore, Cloud Functions).

## Deploying

The app deploys itself through GitHub Actions (`.github/workflows/` at the repo root):

| When | What happens |
|---|---|
| A pull request changes `CreaseCraft/` | It is built and deployed to a temporary **preview link** (kept 7 days), posted as a comment on the pull request. The live site is not touched. |
| Changes reach `main` (a pull request is merged) | It is built and deployed to the **live site**. |

To redeploy `main` by hand: GitHub → **Actions** → **Deploy live site (main)** → **Run workflow**.

### Still manual

Only Hosting deploys automatically. These change rarely and must run in a set order, so run them yourself when a change asks for it:

- Firestore security rules: `firebase deploy --only firestore:rules`
- Cloud Functions: `firebase deploy --only functions`
- Data migrations, e.g. `functions/scripts/migrate-secure-schema.js` (see the comment at the top of the script)

### One-time setup

The workflows need the repository secret `FIREBASE_SERVICE_ACCOUNT_CREASECRAFT_23140`. Create it by running this once in this folder:

```bash
firebase init hosting:github
```

Choose the `sumanbza/CreaseCraftPro` repository. Answer **No** to setting up a build script and automatic deployment, and delete any workflow files it writes under `CreaseCraft/.github/`: the real workflows live at the repo root.

## Local development

```bash
npm install
npm run dev
```

Against local Firebase emulators instead of the real project (needs the Firebase CLI and Java):

```bash
firebase emulators:start --only auth,firestore
npm run dev:emulators
```

Firestore security rules tests: `npm run test:rules`.
