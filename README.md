# Dhyavora

Dhyavora is a career intelligence workspace for students: profile and career goals feed one deterministic skill-gap engine, which drives a personal roadmap, learning recommendations, interview practice, applications, analytics, and a context-aware copilot.

## Current delivery status

The local implementation, provider adapters, application UI, API, contracts, CI configuration, and deployment manifests are in this repository. **This is not yet a live cloud deployment and is not marked production-ready.** This workspace did not expose MongoDB Atlas, Firebase, AI, GitHub OAuth, payment, Vercel, Render, or GitHub repository credentials. Build and local test results do not verify those external services. See [Phase status](docs/PHASE_STATUS.md) and [Deployment](docs/DEPLOYMENT.md).

## Stack and layout

- `frontend/`: React, TypeScript, Vite, Firebase Web Auth, TanStack Query, React Hook Form, Zod, Tailwind, Framer Motion.
- `backend/`: Node.js, TypeScript, Express, Mongoose, Firebase Admin, Zod, provider adapters, Agenda background jobs.
- `packages/contracts/`: shared Zod contracts and the canonical deterministic `computeSkillGap` implementation.
- `docs/`: setup, architecture, security, provider configuration, deployment, and honest phase status.
- `.github/workflows/`: CI and gated Vercel/Render deployment workflow.
- `render.yaml`, `vercel.json`, `firebase.json`, `storage.rules`: cloud configuration templates.

The backend uses a modular monolith and shared timestamped Mongoose records mapped to named collections. User owned records are queried by the verified Firebase UID. See [Architecture](docs/ARCHITECTURE.md).

## Local setup

Requirements: Node.js **22.12 or newer**, npm 10+, Firebase project configuration, and a MongoDB database for persistent workflows.

1. Copy `.env.example` to `.env` and enter local credentials through your secret manager or local environment. Do not commit `.env`.
2. Configure the Firebase Web values (`VITE_FIREBASE_*`), Firebase Admin values, and `MONGODB_URI` as documented in [Integrations](docs/INTEGRATIONS.md).
3. Run `npm ci` and `npm run dev` from this directory.
4. Frontend: `http://localhost:5173`. Backend: `http://localhost:4000`; `/health` reports liveness and `/ready` requires MongoDB, Firebase Admin, and the MongoDB backed Agenda scheduler.

The frontend deliberately shows setup status instead of seeding fake accounts or career data. An administrator with Firebase custom claim `role=admin` can publish catalog items after the services are configured.

## Checks

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. CI runs the same gates on Node 22. Unit and API smoke tests cover the shared contracts, backend non-ready behavior, and a frontend component. The suite does not replace a live Firebase sign-in, Atlas CRUD, Storage upload, OAuth, payment webhook, or end-to-end cloud test. Do not report those as verified until they are exercised against configured services.

## Main API areas

All feature endpoints use `/api/v1` and the `{ success, data }` / `{ success: false, error }` envelope. Authentication uses Firebase bearer ID tokens.

| Area | Routes |
| --- | --- |
| Integration status | `GET /api/v1/integrations/status` |
| Profile and user records | `/api/v1/resources/:kind` |
| Career, canonical skill gap, roadmap | `/api/v1/careers`, `/api/v1/career/*`, `/api/v1/roadmap/*` |
| Assessments | `/api/v1/assessments*`, `/api/v1/assessment-attempts*`, `/api/v1/admin/assessments` |
| AI interviews and copilot | `/api/v1/interviews*`, `/api/v1/copilot*` |
| GitHub OAuth | `/api/v1/integrations/github*` |
| Resume upload and review | `/api/v1/resumes*` |
| Today, reminders, analytics | `/api/v1/today`, `/api/v1/notifications*`, `/api/v1/analytics` |
| Mentorship and community | `/api/v1/mentors*`, `/api/v1/mentorship/*`, `/api/v1/community/*` |
| Premium and admin | `/api/v1/billing/*`, `/api/v1/admin/*` |

See source route modules for exact methods and request schemas.

## Cloud deployment

The repository is prepared for Vercel (frontend), Render (API), MongoDB Atlas (database), Firebase (auth/storage), and GitHub Actions. Deployment is gated by the repository variable `DHYAVORA_DEPLOY_ENABLED=true` and secrets documented in [Deployment](docs/DEPLOYMENT.md). No deploy was run because this workspace has no repository remote, Vercel credentials, Render deploy hook, or production cloud configuration; therefore there are no deployment URLs to report.

## Branding

The provided Dhyavora emerald spark mark is included at `frontend/public/dhyavora-logo.png` and used by the app shell.
