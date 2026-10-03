import type { RequestHandler } from "express";
import { databaseStatus } from "../config/database.js";
import { recordModel } from "../modules/records/model.js";
import { asyncHandler } from "../shared/asyncHandler.js";

export function requireEntitlement(entitlement: string): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    if (!req.auth) return res.status(401).json({ success: false, error: { code: "UNAUTHENTICATED", message: "A Firebase ID token is required." } });
    if (!databaseStatus().connected) return res.status(503).json({ success: false, error: { code: "DATABASE_UNAVAILABLE", message: "MongoDB is not connected." } });
    const subscription = await recordModel("subscription").findOne({ userId: req.auth.uid, deletedAt: null, "data.status": "ACTIVE" }).lean() as { data?: { entitlements?: string[]; currentPeriodEnd?: string } } | null;
    const expiry = subscription?.data?.currentPeriodEnd ? Date.parse(subscription.data.currentPeriodEnd) : undefined;
    const inGoodStanding = !expiry || (Number.isFinite(expiry) && expiry > Date.now());
    if (!subscription || !inGoodStanding || (subscription.data?.entitlements && !subscription.data.entitlements.includes(entitlement))) {
      return res.status(403).json({ success: false, error: { code: "PREMIUM_REQUIRED", message: "This feature requires an active premium plan." } });
    }
    next();
  });
}
