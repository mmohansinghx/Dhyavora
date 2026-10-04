import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { env } from "./config/env.js";
import { firebaseStatus } from "./config/firebase.js";
import { databaseStatus } from "./config/database.js";
import { integrationStatus } from "./modules/integrations/status.js";
import { recordsRouter } from "./modules/records/routes.js";
import { careerRouter } from "./modules/skill-gap/routes.js";
import { assessmentRouter } from "./modules/assessments/routes.js";
import { copilotRouter } from "./modules/copilot/routes.js";
import { githubRouter } from "./modules/integrations/github.js";
import { resumeRouter } from "./modules/resumes/routes.js";
import { billingRouter } from "./modules/billing/routes.js";
import { insightsRouter } from "./modules/insights/routes.js";
import { collaborationRouter } from "./modules/collaboration/routes.js";
import { interviewRouter } from "./modules/interviews/routes.js";
import { adminRouter } from "./modules/admin/routes.js";
import { errorHandler, notFound } from "./middleware/errors.js";
import { logger } from "./shared/logger.js";
import { backgroundJobsStatus } from "./modules/insights/jobs.js";

export function createApp(options: { serverless?: boolean } = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: [env.FRONTEND_URL], credentials: true, methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"] }));
  app.use((req, res, next) => { const requestId = req.header("x-request-id")?.slice(0, 100) || randomUUID(); res.setHeader("X-Request-Id", requestId); res.locals.requestId = requestId; next(); });
  app.use(express.json({ limit: "1mb", strict: true, verify: (req, _res, body) => { (req as typeof req & { rawBody?: Buffer }).rawBody = Buffer.from(body); } }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));
  app.use((req, _res, next) => { logger.info({ requestId: _res.locals.requestId, method: req.method, path: req.path }, "API request"); next(); });

  app.get("/health", (_req, res) => res.json({ success: true, data: { status: "ALIVE", time: new Date().toISOString(), integrations: integrationStatus() } }));
  app.get("/ready", (_req, res) => {
    const mongo = databaseStatus();
    const firebase = firebaseStatus();
    const jobs = backgroundJobsStatus();
    const schedulerReady = options.serverless || jobs.started;
    const ready = mongo.connected && firebase.initialized && schedulerReady;
    return res.status(ready ? 200 : 503).json({ success: ready, data: { status: ready ? "READY" : "NOT_READY", mongo: mongo.state, firebaseAuth: firebase.initialized ? "CONNECTED" : "NOT_CONFIGURED", backgroundJobs: options.serverless ? "DISABLED_SERVERLESS" : jobs.started ? "CONNECTED" : jobs.configured ? "NOT_STARTED" : "NOT_CONFIGURED" } });
  });

  app.use("/api/v1", rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: "draft-7", legacyHeaders: false, message: { success: false, error: { code: "RATE_LIMITED", message: "Too many requests. Try again shortly." } } }));
  app.get("/api/v1/integrations/status", (_req, res) => res.json({ success: true, data: integrationStatus() }));
  app.use("/api/v1", careerRouter);
  app.use("/api/v1", assessmentRouter);
  app.use("/api/v1", copilotRouter);
  app.use("/api/v1/integrations", githubRouter);
  app.use("/api/v1", resumeRouter);
  app.use("/api/v1", billingRouter);
  app.use("/api/v1", insightsRouter);
  app.use("/api/v1", collaborationRouter);
  app.use("/api/v1", interviewRouter);
  app.use("/api/v1/admin", adminRouter);
  app.use("/api/v1/resources", recordsRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
