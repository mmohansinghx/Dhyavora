import type { NextFunction, Request, Response } from "express";
import { firebaseAuth } from "../config/firebase.js";

declare module "express-serve-static-core" {
  interface Request { auth?: { uid: string; email?: string; role?: string } }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authorization = req.header("authorization");
  if (!firebaseAuth) return res.status(503).json({ success: false, error: { code: "AUTH_NOT_CONFIGURED", message: "Firebase Authentication is not configured on the server." } });
  if (!authorization?.startsWith("Bearer ")) return res.status(401).json({ success: false, error: { code: "UNAUTHENTICATED", message: "A Firebase ID token is required." } });
  try {
    const token = authorization.slice(7);
    const decoded = await firebaseAuth.verifyIdToken(token, true);
    req.auth = { uid: decoded.uid, ...(decoded.email ? { email: decoded.email } : {}), ...(typeof decoded.role === "string" ? { role: decoded.role } : {}) };
    next();
  } catch {
    res.status(401).json({ success: false, error: { code: "INVALID_TOKEN", message: "The Firebase ID token is invalid or expired." } });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.auth?.role !== "admin") return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Administrator access is required." } });
  next();
}
