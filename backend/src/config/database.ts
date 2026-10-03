import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../shared/logger.js";
import { recordModel, RESOURCE_KINDS } from "../modules/records/model.js";

export async function connectDatabase(): Promise<void> {
  if (!env.MONGODB_URI) {
    logger.warn("MongoDB is not configured; API will start but remain unready");
    return;
  }
  await mongoose.connect(env.MONGODB_URI, { dbName: env.MONGODB_DB_NAME, serverSelectionTimeoutMS: 10000, autoIndex: env.NODE_ENV !== "production" });
  await Promise.all(RESOURCE_KINDS.map((kind) => recordModel(kind).createIndexes()));
  logger.info({ database: env.MONGODB_DB_NAME }, "MongoDB connected");
}

export function databaseStatus() {
  const readyState = mongoose.connection.readyState;
  return { configured: Boolean(env.MONGODB_URI), connected: readyState === 1, state: ["disconnected", "connected", "connecting", "disconnecting"][readyState] ?? "unknown" };
}
