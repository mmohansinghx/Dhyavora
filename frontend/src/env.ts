import { z } from "zod";

const webEnvSchema = z.object({
  VITE_FIREBASE_API_KEY: z.string().optional(),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().optional(),
  VITE_FIREBASE_PROJECT_ID: z.string().optional(),
  VITE_FIREBASE_STORAGE_BUCKET: z.string().optional(),
  VITE_FIREBASE_APP_ID: z.string().optional(),
  VITE_API_BASE_URL: z.string().default("/api/v1"),
});
export const webEnv = webEnvSchema.parse(import.meta.env);
export const firebaseWebConfigured = Boolean(webEnv.VITE_FIREBASE_API_KEY && webEnv.VITE_FIREBASE_AUTH_DOMAIN && webEnv.VITE_FIREBASE_PROJECT_ID && webEnv.VITE_FIREBASE_APP_ID);
