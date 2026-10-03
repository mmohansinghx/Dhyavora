# Architecture

## Runtime

The project is a single TypeScript npm workspace and modular monolith. The Vite/React frontend calls the Express API over `/api/v1`. The API verifies each Firebase ID token and takes identity only from `req.auth.uid`; Mongoose stores users and domain resources in their named MongoDB collections. Shared Zod contracts live in `packages/contracts` so the skill vocabulary and engine are consistent across the UI and API.

The backend has provider boundaries for AI, Firebase Storage, GitHub OAuth/repository reads, and Stripe payments. Provider-specific keys stay in the backend environment. Email and third party opportunity sources are not currently implemented or configured; user sourced opportunities remain manually entered with their original link.

## Data collections

The Mongoose record model maps resource kinds to `users`, `careers`, `roadmaps`, `assessments`, `assessmentAttempts`, `questions`, `interviewSessions`, `projects`, `learningResources`, `resourceProgress`, `resumeDocuments`, `opportunities`, `applications`, `notifications`, `analytics`, `mentors`, `mentorSessions`, `communityPosts`, `communityComments`, `subscriptions`, `payments`, `auditLogs`, `githubConnections`, `copilotSessions`, `communityReports`, and `userBlocks`. Agenda stores scheduled jobs in `agendaJobs`.

Records have timestamps and soft deletion. The shared schema indexes user ownership and update time, adds unique active user profiles/GitHub connections, and uses a unique sparse-like partial event key for idempotent provider and reminder events. MongoDB creates indexes when the backend connects.

## Canonical career flow

`computeSkillGap(userSkills, careerRequirements)` is deterministic and shared. It labels each required skill `MISSING` (no user entry), `DEVELOPING` (below the required level), or `MATCHED` (at or above it). Roadmaps have stable task IDs; regeneration preserves completed items. Learning recommendations and copilot context derive their skill gap from this engine.

## Background work

Agenda 6 with its Mongo backend persists jobs in the same database. A daily job scans application deadlines for today and tomorrow and inserts at most one in-app notification per application and deadline date. The provider event ID is unique so startup scans and job retries do not duplicate notifications. Scheduler state is included in `/ready`; graceful shutdown stops Agenda before MongoDB disconnects.

## Health and readiness

- `GET /health`: process liveness and non-secret integration configuration/status.
- `GET /ready`: HTTP 200 only when MongoDB, Firebase Admin, and Agenda background jobs are initialized; otherwise HTTP 503 with component status.

Firebase token verification is lazy per protected request. Firebase Auth sign-in and Storage requests are not represented as live verified merely because the SDK initialized.
