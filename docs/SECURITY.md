# Security notes

- Firebase Admin verifies bearer ID tokens on protected APIs. User identity and ownership filters come from the verified token, not submitted `userId` values.
- Admin access requires a Firebase custom claim `role=admin`; frontend routing is not an authorization boundary.
- Helmet, explicit origin CORS, request IDs, JSON size limits, global and user scoped rate limits, Zod request validation, and centralized error responses are enabled.
- GitHub OAuth uses short lived signed state in an HttpOnly cookie. OAuth tokens are encrypted with AES-256-GCM using `TOKEN_ENCRYPTION_KEY`; the key must be protected and rotated with a migration plan.
- Stripe events require a timestamped HMAC signature and use provider event IDs for idempotence. Entitlements are derived from backend subscription state.
- Users cannot set `SYSTEM_VERIFIED`; resource ownership queries are scoped to `req.auth.uid`. Resume files use owner scoped Firebase Storage paths and parser output is returned for user review instead of being silently applied.
- Logs redact authorization/cookie/token/key fields and do not intentionally include request bodies.
- `storage.rules` restrict Firebase Storage access by Firebase UID. Deploy and verify the rules in the target Firebase project.

Before production, configure TLS at the host, Atlas network restrictions and backups, Firebase Auth authorized domains, exact CORS frontend origin, credential rotation and least privilege. Run live auth/storage/payment/OAuth verification and a security review against the actual cloud configuration; local code checks do not provide those guarantees.

## Dependency audit (2026-10-03)

`npm audit --omit=dev` reports 6 production-tree findings: 4 high findings in the Firebase web package's nested Firestore → `@grpc/grpc-js` dependency and 2 moderate findings in the Google client `gaxios`/`uuid` chain. The app does not call Firestore, but npm still includes it in the Firebase package dependency tree. npm's suggested automatic fix downgrades Firebase to 9.14.0, so that breaking downgrade was not applied. Recheck the advisory feed and verify an upstream-compatible remediation before production deployment.
