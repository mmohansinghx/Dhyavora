# Integration configuration

Use a secret manager or private local environment for secret values. `.env.example` contains names and safe defaults only. Never commit `.env`, service account JSON, OAuth secrets, access tokens, or payment keys.

## MongoDB Atlas

Set `MONGODB_URI` to a least-privilege Atlas connection string and `MONGODB_DB_NAME` to the environment-specific database (`dhyavora_dev`, `dhyavora_staging`, or `dhyavora_prod`). Configure the Atlas database user, network access, backups, and separate environment credentials in Atlas. The application creates its declared indexes when connecting. `GET /ready` confirms a database connection; a production CRUD check is still required after configuring Atlas.

## Firebase

Frontend public web configuration:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_APP_ID`
- `VITE_API_BASE_URL`

Backend Admin configuration:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (store the service account PEM with newlines escaped as `\n`; the server restores the line breaks)
- `FIREBASE_STORAGE_BUCKET`

Alternatively, configure Application Default Credentials and `GOOGLE_APPLICATION_CREDENTIALS` on a runtime that securely supports the referenced credential file. Enable Email/Password Auth in Firebase Console. Deploy `storage.rules` to the intended Firebase project. Validate auth, token verification, owner scoped CRUD, and a Storage upload against that project before production use.

## AI

Select `AI_PROVIDER=openai` or `AI_PROVIDER=gemini`, then set `AI_API_KEY` and a provider compatible `AI_MODEL`. `none` is the safe default and causes AI interview/Copilot requests to return an explicit configuration error. AI outputs are provider dependent and should be evaluated before real user rollout.

When a user starts an interview or submits a Copilot question, the associated career context and response content are sent to the configured AI provider. Inform users of the selected provider's data handling and retention terms before enabling the feature in production.

## GitHub OAuth

Set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `GITHUB_CALLBACK_URL` to the exact registered callback, normally `https://<api-host>/api/v1/integrations/github/callback` in production. Set `TOKEN_ENCRYPTION_KEY` to 32 random bytes in 64 hex characters (generate with the command in `.env.example`). The OAuth state is signed, short lived, and stored in an HttpOnly cookie; returned access tokens are encrypted at rest. Current scopes are `read:user user:email`; repository results depend on what GitHub makes available with those scopes. Test connect, repository listing, and disconnect with a real OAuth app.

## Stripe

Set `PAYMENT_PROVIDER=stripe`, `PAYMENT_KEY_SECRET`, `PAYMENT_PRICE_ID`, and `PAYMENT_WEBHOOK_SECRET`. Configure the Stripe webhook to call `POST /api/v1/billing/webhook` and include the implemented checkout/subscription event types. The API verifies Stripe's timestamped signature and deduplicates provider event IDs before changing server side entitlements. `PAYMENT_KEY_ID` is retained for deployment/provider configuration but the current Stripe adapter uses the secret key. Exercise checkout and signed webhook lifecycle events in Stripe test mode before accepting payments.

## Email and opportunity sources

`EMAIL_PROVIDER`, `EMAIL_API_KEY`, `OPPORTUNITY_PROVIDER`, and `OPPORTUNITY_API_KEY` are reserved configuration slots. No email delivery adapter or external opportunity source is implemented, so these variables do not enable those features today. Opportunities can be entered by users with a source URL; the application does not seed or fabricate external listings. Select and approve a source with suitable terms and attribution requirements before implementing its adapter.

## Provider status

`GET /api/v1/integrations/status` and Settings show provider configuration/connection status without returning secret values. `CONFIGURED` means required fields exist; it does not mean a real provider request succeeded. Use **LIVE VERIFIED** only after manually running and recording the relevant provider flow.
