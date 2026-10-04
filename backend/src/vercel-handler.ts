import type { Request, Response } from "express";
import { createApp } from "./app.js";
import { connectDatabase, databaseStatus } from "./config/database.js";
import { logger } from "./shared/logger.js";

const app = createApp({ serverless: true });
let databaseConnection: Promise<void> | undefined;

async function ensureDatabaseConnection(): Promise<void> {
  if (databaseStatus().connected) return;
  if (!databaseConnection) {
    databaseConnection = connectDatabase().finally(() => {
      if (!databaseStatus().connected) databaseConnection = undefined;
    });
  }
  await databaseConnection;
}

function requestPath(req: Request): string {
  try {
    return new URL(req.url ?? "/", "https://dhyavora.invalid").pathname;
  } catch {
    return "/";
  }
}

export default async function vercelHandler(req: Request, res: Response): Promise<void> {
  const path = requestPath(req);
  if (path === "/api/health") req.url = (req.url ?? "/api/health").replace(/^\/api(?=\/health(?:\?|$))/, "");
  if (path === "/api/ready") req.url = (req.url ?? "/api/ready").replace(/^\/api(?=\/ready(?:\?|$))/, "");

  if (req.method === "OPTIONS" || path === "/api/health" || path === "/health" || path === "/api/v1/integrations/status") {
    app(req, res);
    return;
  }

  try {
    await ensureDatabaseConnection();
  } catch (error) {
    logger.error({ errorName: error instanceof Error ? error.name : "UnknownError" }, "MongoDB connection failed in Vercel Function");
    if (path === "/api/ready" || path === "/ready") {
      app(req, res);
      return;
    }
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ success: false, error: { code: "DATABASE_UNAVAILABLE", message: "The Dhyavora API database is unavailable. Try again shortly." } }));
    return;
  }

  if (!databaseStatus().connected && path !== "/api/ready" && path !== "/ready") {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ success: false, error: { code: "DATABASE_NOT_CONFIGURED", message: "The Dhyavora API database is not connected." } }));
    return;
  }

  app(req, res);
}
