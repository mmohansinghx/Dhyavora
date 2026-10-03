import { Router } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "../../config/env.js";
import { databaseStatus } from "../../config/database.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { recordModel } from "../records/model.js";

export const billingRouter = Router();
const providerReady = () => env.PAYMENT_PROVIDER === "stripe" && Boolean(env.PAYMENT_KEY_SECRET && env.PAYMENT_PRICE_ID && env.PAYMENT_WEBHOOK_SECRET);

async function stripePost(path: string, fields: Record<string, string>) {
  const body = new URLSearchParams(fields);
  const response = await fetch(`https://api.stripe.com/v1/${path}`, { method: "POST", headers: { authorization: `Basic ${Buffer.from(`${env.PAYMENT_KEY_SECRET}:`).toString("base64")}`, "content-type": "application/x-www-form-urlencoded" }, body, signal: AbortSignal.timeout(15000) });
  const result = await response.json() as { id?: string; url?: string; error?: { message?: string } };
  if (!response.ok || !result.url) throw new Error(`Payment provider request failed (${response.status}).`);
  return result;
}

billingRouter.get("/billing/plans", (_req, res) => res.json({ success: true, data: [
  { id: "free", title: "Free", features: ["Career profile", "Skill-gap map", "Personal roadmap", "Application tracker"] },
  { id: "premium", title: "Premium", features: ["Everything in Free", "AI interview practice", "Advanced career analytics", "Expanded copilot usage"] },
] }));

billingRouter.get("/billing/entitlements", requireAuth, asyncHandler(async (req, res) => {
  if (!databaseStatus().connected) return res.status(503).json({ success: false, error: { code: "DATABASE_UNAVAILABLE", message: "MongoDB is not connected." } });
  const subscription = await recordModel("subscription").findOne({ userId: req.auth!.uid, deletedAt: null, "data.status": "ACTIVE" }).sort({ updatedAt: -1 }).lean() as { data: Record<string, unknown> } | null;
  res.json({ success: true, data: { plan: subscription ? "premium" : "free", entitlements: subscription ? ["ai_interview", "advanced_analytics", "expanded_copilot"] : ["career_path", "skill_gap", "roadmap", "application_tracker"], subscription: subscription ? { status: subscription.data.status, currentPeriodEnd: subscription.data.currentPeriodEnd } : null } });
}));

billingRouter.post("/billing/checkout", requireAuth, asyncHandler(async (req, res) => {
  z.object({ plan: z.literal("premium") }).strict().parse(req.body);
  if (!providerReady()) return res.status(503).json({ success: false, error: { code: "PAYMENTS_NOT_CONFIGURED", message: "Configure PAYMENT_PROVIDER=stripe, PAYMENT_KEY_SECRET, PAYMENT_PRICE_ID and PAYMENT_WEBHOOK_SECRET." } });
  const session = await stripePost("checkout/sessions", {
    mode: "subscription", "line_items[0][price]": env.PAYMENT_PRICE_ID!, "line_items[0][quantity]": "1",
    success_url: `${env.FRONTEND_URL}/settings?billing=success`, cancel_url: `${env.FRONTEND_URL}/settings?billing=cancelled`,
    client_reference_id: req.auth!.uid, "metadata[userId]": req.auth!.uid, "subscription_data[metadata][userId]": req.auth!.uid,
  });
  res.json({ success: true, data: { url: session.url } });
}));

billingRouter.post("/billing/portal", requireAuth, asyncHandler(async (req, res) => {
  if (!providerReady()) return res.status(503).json({ success: false, error: { code: "PAYMENTS_NOT_CONFIGURED", message: "Configure the Stripe billing adapter first." } });
  if (!databaseStatus().connected) return res.status(503).json({ success: false, error: { code: "DATABASE_UNAVAILABLE", message: "MongoDB is not connected." } });
  const subscription = await recordModel("subscription").findOne({ userId: req.auth!.uid, deletedAt: null, "data.providerCustomerId": { $exists: true } }).sort({ updatedAt: -1 }).lean() as { data: { providerCustomerId: string } } | null;
  if (!subscription) return res.status(404).json({ success: false, error: { code: "CUSTOMER_NOT_FOUND", message: "No payment customer is linked to this account." } });
  const session = await stripePost("billing_portal/sessions", { customer: subscription.data.providerCustomerId, return_url: `${env.FRONTEND_URL}/settings` });
  res.json({ success: true, data: { url: session.url } });
}));

billingRouter.post("/billing/webhook", asyncHandler(async (req, res) => {
  if (!providerReady()) return res.status(503).json({ success: false, error: { code: "PAYMENTS_NOT_CONFIGURED", message: "Payment webhook verification is not configured." } });
  if (!databaseStatus().connected) return res.status(503).json({ success: false, error: { code: "DATABASE_UNAVAILABLE", message: "MongoDB is not connected." } });
  const rawBody = (req as typeof req & { rawBody?: Buffer }).rawBody;
  const signatureHeader = req.header("stripe-signature") ?? "";
  const timestamp = signatureHeader.split(",").find((item) => item.startsWith("t="))?.slice(2);
  const signatures = signatureHeader.split(",").filter((item) => item.startsWith("v1=")).map((item) => item.slice(3));
  const seconds = Number(timestamp);
  if (!rawBody || !Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300) return res.status(400).json({ success: false, error: { code: "INVALID_WEBHOOK", message: "The payment signature is invalid or expired." } });
  const expected = createHmac("sha256", env.PAYMENT_WEBHOOK_SECRET!).update(`${timestamp}.${rawBody.toString("utf8")}`).digest();
  const valid = signatures.some((signature) => { const candidate = Buffer.from(signature, "hex"); return candidate.length === expected.length && timingSafeEqual(candidate, expected); });
  if (!valid) return res.status(400).json({ success: false, error: { code: "INVALID_WEBHOOK", message: "The payment signature could not be verified." } });
  const event = JSON.parse(rawBody.toString("utf8")) as { id: string; type: string; data: { object: Record<string, any> } };
  const prior = await recordModel("payment").findOne({ "data.providerEventId": event.id }).lean();
  if (prior) return res.json({ success: true, data: { received: true, duplicate: true } });
  const object = event.data.object;
  if (event.type === "checkout.session.completed") {
    const uid = typeof object.client_reference_id === "string" ? object.client_reference_id : object.metadata?.userId;
    const paid = object.payment_status === "paid" || object.payment_status === "no_payment_required";
    if (typeof uid === "string" && typeof object.subscription === "string" && paid) {
      const customer = typeof object.customer === "string" ? object.customer : undefined;
      const subscriptionData = { status: "ACTIVE", plan: "premium", provider: "stripe", providerSubscriptionId: object.subscription, providerCustomerId: customer, activatedAt: new Date().toISOString() };
      const existing = await recordModel("subscription").findOne({ userId: uid, "data.providerSubscriptionId": object.subscription });
      if (existing) { existing.set("data", subscriptionData); await existing.save(); }
      else await recordModel("subscription").create({ userId: uid, title: "Premium subscription", data: subscriptionData });
      await recordModel("payment").create({ userId: uid, title: "Stripe subscription payment", data: { providerEventId: event.id, eventType: event.type, providerSubscriptionId: object.subscription, amountTotal: object.amount_total, currency: object.currency, receivedAt: new Date().toISOString() } });
    }
  } else if (["customer.subscription.deleted", "customer.subscription.updated", "invoice.paid", "invoice.payment_failed"].includes(event.type)) {
    const subscriptionId = typeof object.subscription === "string" ? object.subscription : typeof object.id === "string" && object.id.startsWith("sub_") ? object.id : undefined;
    if (subscriptionId) {
      const status = event.type === "customer.subscription.deleted" ? "CANCELLED" : event.type === "invoice.payment_failed" ? "PAST_DUE" : object.status === "active" || event.type === "invoice.paid" ? "ACTIVE" : "PAST_DUE";
      const subscription = await recordModel("subscription").findOne({ "data.providerSubscriptionId": subscriptionId });
      if (subscription) { const data = subscription.get("data") as Record<string, unknown>; subscription.set("data", { ...data, status, updatedAt: new Date().toISOString() }); await subscription.save(); }
    }
  }
  res.json({ success: true, data: { received: true } });
}));
