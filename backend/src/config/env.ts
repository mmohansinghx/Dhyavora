import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env") });

const optional = z.string().optional().transform((value) => value?.trim() || undefined);
const vercelOrigin = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:5173";
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().url().default(vercelOrigin),
  API_BASE_URL: z.string().url().default(vercelOrigin),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  MONGODB_URI: optional,
  MONGODB_DB_NAME: z.string().default("dhyavora_dev"),
  FIREBASE_PROJECT_ID: optional.default(process.env.VITE_FIREBASE_PROJECT_ID ?? ""),
  FIREBASE_STORAGE_BUCKET: optional,
  FIREBASE_CLIENT_EMAIL: optional,
  FIREBASE_PRIVATE_KEY: optional,
  GOOGLE_APPLICATION_CREDENTIALS: optional,
  TOKEN_ENCRYPTION_KEY: optional,
  AI_PROVIDER: z.enum(["none", "openai", "gemini"]).default("none"),
  AI_API_KEY: optional,
  AI_MODEL: optional,
  GITHUB_CLIENT_ID: optional,
  GITHUB_CLIENT_SECRET: optional,
  GITHUB_CALLBACK_URL: z.string().url().default("http://localhost:4000/api/v1/integrations/github/callback"),
  PAYMENT_PROVIDER: z.string().default("none"),
  PAYMENT_KEY_ID: optional,
  PAYMENT_KEY_SECRET: optional,
  PAYMENT_PRICE_ID: optional,
  PAYMENT_WEBHOOK_SECRET: optional,
  EMAIL_PROVIDER: z.string().default("none"),
  EMAIL_API_KEY: optional,
  OPPORTUNITY_PROVIDER: z.string().default("none"),
  OPPORTUNITY_API_KEY: optional,
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const names = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(`Invalid environment configuration for: ${names}`);
}
export const env = parsed.data;

export function firebaseAdminConfigured(): boolean {
  const serviceAccount = Boolean(env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY);
  return serviceAccount || Boolean(env.GOOGLE_APPLICATION_CREDENTIALS);
}
