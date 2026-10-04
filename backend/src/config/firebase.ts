import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import { env, firebaseAdminConfigured } from "./env.js";

let initError: string | undefined;
if (env.FIREBASE_PROJECT_ID && !getApps().length) {
  try {
    const credential = env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY
      ? cert({ projectId: env.FIREBASE_PROJECT_ID, clientEmail: env.FIREBASE_CLIENT_EMAIL, privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") })
      : applicationDefault();
    initializeApp({ credential, ...(env.FIREBASE_PROJECT_ID ? { projectId: env.FIREBASE_PROJECT_ID } : {}) });
  } catch (error) {
    initError = error instanceof Error ? error.message : "Firebase initialization failed";
  }
}

export const firebaseAuth = getApps().length ? getAuth() : undefined;
export const firebaseStorage = getApps().length ? getStorage() : undefined;
export function firebaseStatus() {
  return { configured: Boolean(env.FIREBASE_PROJECT_ID), adminConfigured: firebaseAdminConfigured(), initialized: Boolean(firebaseAuth), error: initError };
}
