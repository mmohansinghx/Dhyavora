import { createApp } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { logger } from "./shared/logger.js";
import mongoose from "mongoose";
import { startBackgroundJobs, stopBackgroundJobs } from "./modules/insights/jobs.js";

const app = createApp();
try {
  await connectDatabase();
} catch (error) {
  logger.error({ errorName: error instanceof Error ? error.name : "UnknownError" }, "MongoDB connection failed; service will remain unready");
}
try {
  await startBackgroundJobs();
} catch (error) {
  logger.error({ errorName: error instanceof Error ? error.name : "UnknownError" }, "Background jobs failed to start; service will remain unready");
}
const server = app.listen(env.PORT, () => logger.info({ port: env.PORT }, "Dhyavora API listening"));

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close(() => { void stopBackgroundJobs().finally(() => mongoose.disconnect()).finally(() => process.exit(0)); }));
}
