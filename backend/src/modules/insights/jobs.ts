import { Agenda } from "agenda";
import { MongoBackend } from "@agendajs/mongo-backend";
import type { Db } from "mongodb";
import mongoose from "mongoose";
import { recordModel } from "../records/model.js";
import { logger } from "../../shared/logger.js";

let agenda: Agenda | undefined;
let started = false;

export function backgroundJobsStatus() {
  return { configured: Boolean(mongoose.connection.db), started };
}

export async function startBackgroundJobs(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) return;

  const runner = new Agenda({
    backend: new MongoBackend({ mongo: db as unknown as Db, collection: "agendaJobs" }),
    name: "dhyavora-api",
    processEvery: "30 seconds",
    maxConcurrency: 1,
    defaultConcurrency: 1,
    defaultLockLifetime: 5 * 60 * 1000,
  });

  runner.define("application-deadline-reminders", async () => {
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString().slice(0, 10);
    const endOfWindow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2)).toISOString().slice(0, 10);
    const applications = await recordModel("application").find({
      deletedAt: null,
      "data.deadline": { $gte: startOfToday, $lt: endOfWindow },
      "data.status": { $nin: ["offer", "rejected", "withdrawn"] },
    }).select({ _id: 1, userId: 1, title: 1, "data.deadline": 1 }).lean() as unknown as Array<{
      _id: { toString(): string };
      userId: string;
      title: string;
      data: { deadline: string };
    }>;

    for (const application of applications) {
      const deadline = new Date(application.data.deadline).toISOString().slice(0, 10);
      const providerEventId = `application-deadline:${application.userId}:${application._id.toString()}:${deadline}`;
      await recordModel("notification").updateOne(
        { "data.providerEventId": providerEventId },
        { $setOnInsert: {
          userId: application.userId,
          title: "Application date coming up",
          data: {
            providerEventId,
            type: "APPLICATION_DEADLINE",
            message: `${application.title} has a date on ${deadline}.`,
            applicationId: application._id.toString(),
            deadline,
          },
        } },
        { upsert: true },
      );
    }
    logger.info({ reminders: applications.length }, "Application deadline reminder scan completed");
  }, { concurrency: 1, lockLifetime: 5 * 60 * 1000 });

  runner.on("fail", (error, job) => logger.error({ errorName: error instanceof Error ? error.name : "UnknownError", job: job.attrs.name }, "Background job failed"));
  agenda = runner;
  try {
    await runner.start();
    await runner.every("1 day", "application-deadline-reminders", {}, { skipImmediate: true });
    await runner.now("application-deadline-reminders", {});
    started = true;
  } catch (error) {
    agenda = undefined;
    await runner.stop().catch(() => undefined);
    throw error;
  }
  logger.info("MongoDB-backed background jobs started");
}

export async function stopBackgroundJobs(): Promise<void> {
  if (!agenda) return;
  const running = agenda;
  agenda = undefined;
  started = false;
  await running.stop();
}
