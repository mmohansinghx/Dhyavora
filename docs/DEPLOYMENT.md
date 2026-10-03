# Deployment runbook

No cloud resources or public deployments were created from this workspace: no repository remote, MongoDB Atlas URI, Firebase project/service credentials, Vercel credentials, or Render deploy hook were available. Configure the existing manifests only after creating/choosing the corresponding provider resources.

## GitHub Actions

Push the repository to a GitHub repo with default branch `main`. CI runs on pushes, pull requests, and manual dispatch using Node 22, then lint, typecheck, tests, and build. The deploy workflow only proceeds after successful CI (or manual dispatch) and repository variable `DHYAVORA_DEPLOY_ENABLED=true`.

Required GitHub Actions secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `RENDER_DEPLOY_HOOK_URL` (Render service deploy hook)

Configure Vercel production environment variables for all `VITE_FIREBASE_*` public config and `VITE_API_BASE_URL=https://<render-api-host>/api/v1`. Public Firebase web values are designed for the frontend; do not put service account, AI, Stripe, Mongo, or OAuth secrets into `VITE_*` variables.

## Vercel frontend

The root `vercel.json` builds the frontend workspace and serves `frontend/dist`, rewriting client routes to `index.html`. Connect the GitHub repository to the Vercel project or use the gated action. After deploy, set the resulting frontend origin in the Render `FRONTEND_URL` value and Firebase Auth authorized domains.

## Render backend

`render.yaml` declares `dhyavora-api`, Node runtime, backend build/start commands, and `/ready` health check. `autoDeploy` is disabled because the action triggers deploys only after CI succeeds. Set Render environment values listed by the manifest, including:

- `MONGODB_URI`, `MONGODB_DB_NAME`
- `FRONTEND_URL`, `API_BASE_URL`, `GITHUB_CALLBACK_URL`
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`
- `TOKEN_ENCRYPTION_KEY`
- Optional provider variables from [Integrations](INTEGRATIONS.md)

Create the Render service from the blueprint and copy its deploy-hook URL into GitHub Actions secrets. Set Firebase, GitHub OAuth and Stripe callback/webhook URLs to the actual service URL. Verify `/health` then `/ready`, sign-in, a protected API operation, Atlas CRUD and a Storage upload before calling the deployment operational.

## Environment separation

Use different MongoDB databases and provider keys for development, staging, and production. Create separate Firebase web app/service-account config as appropriate and separate Vercel/Render environment values. Do not reuse development credentials in production. Configure Atlas network restrictions, backups and rotation out of band.

## Rollback

Use Vercel and Render deployment history to roll back a bad release. Mongo schema changes should be backward compatible; the current schema uses shared collection documents and creates indexes on startup. Back up production data before any future data migration.
