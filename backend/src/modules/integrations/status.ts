import { env, firebaseAdminConfigured } from "../../config/env.js";
import { firebaseStatus } from "../../config/firebase.js";
import { databaseStatus } from "../../config/database.js";
import { resumeStorageStatus } from "./storage.js";

export function integrationStatus() {
  const aiConfigured = env.AI_PROVIDER !== "none" && Boolean(env.AI_API_KEY && env.AI_MODEL);
  const githubConfigured = Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && env.TOKEN_ENCRYPTION_KEY && /^[\da-f]{64}$/i.test(env.TOKEN_ENCRYPTION_KEY));
  const storageConfigured = firebaseAdminConfigured() && Boolean(env.FIREBASE_STORAGE_BUCKET);
  const resumeStorage = resumeStorageStatus();
  const paymentsConfigured = env.PAYMENT_PROVIDER === "stripe" && Boolean(env.PAYMENT_KEY_SECRET && env.PAYMENT_PRICE_ID && env.PAYMENT_WEBHOOK_SECRET);
  return {
    mongo: { state: databaseStatus().connected ? "CONNECTED" : databaseStatus().state === "connecting" ? "CONNECTING" : env.MONGODB_URI ? "NOT_CONNECTED" : "NOT_CONFIGURED" },
    firebaseAuth: { state: firebaseStatus().initialized ? "CONNECTED" : "NOT_CONFIGURED" },
    firebaseStorage: { state: storageConfigured ? "CONFIGURED" : "NOT_CONFIGURED" },
    resumeStorage,
    ai: { provider: env.AI_PROVIDER, state: aiConfigured ? "CONFIGURED" : "NOT_CONFIGURED" },
    github: { state: githubConfigured ? "CONFIGURED" : "NOT_CONFIGURED" },
    payments: { provider: env.PAYMENT_PROVIDER, state: paymentsConfigured ? "CONFIGURED" : "NOT_CONFIGURED" },
    email: { provider: env.EMAIL_PROVIDER, state: "NOT_CONFIGURED" },
    opportunities: { provider: env.OPPORTUNITY_PROVIDER, state: "NOT_CONFIGURED" },
  } as const;
}
