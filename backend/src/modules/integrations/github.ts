import { Router } from "express";
import { env } from "../../config/env.js";
import { databaseStatus } from "../../config/database.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { recordModel } from "../records/model.js";
import { createOauthState, decryptSecret, encryptSecret, getOauthStateUid, verifyOauthState } from "./crypto.js";

export const githubRouter = Router();
const secureCookie = env.NODE_ENV === "production" ? "; Secure" : "";
const configured = () => Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && env.TOKEN_ENCRYPTION_KEY && /^[\da-f]{64}$/i.test(env.TOKEN_ENCRYPTION_KEY));

githubRouter.get("/github", requireAuth, asyncHandler(async (req, res) => {
  if (!databaseStatus().connected) return res.status(503).json({ success: false, error: { code: "DATABASE_UNAVAILABLE", message: "MongoDB is not connected." } });
  const row = await recordModel("github-connection").findOne({ userId: req.auth!.uid, deletedAt: null }).lean() as { _id: unknown; data: { username: string; scopes: string[] } } | null;
  res.json({ success: true, data: row ? { connected: true, username: row.data.username, scopes: row.data.scopes } : { connected: false } });
}));

githubRouter.get("/github/connect", requireAuth, (req, res) => {
  const url = getAuthorizationURL(req.auth!.uid, res);
  if (url) res.redirect(url);
});

githubRouter.post("/github/connect", requireAuth, (req, res) => {
  const url = getAuthorizationURL(req.auth!.uid, res);
  if (url) res.json({ success: true, data: { url } });
});

function getAuthorizationURL(uid: string, res: import("express").Response) {
  if (!configured()) { res.status(503).json({ success: false, error: { code: "GITHUB_NOT_CONFIGURED", message: "Configure GitHub OAuth credentials and TOKEN_ENCRYPTION_KEY." } }); return undefined; }
  const state = createOauthState(uid);
  res.setHeader("Set-Cookie", `dhyavora_github_state=${encodeURIComponent(state)}; HttpOnly; SameSite=Lax; Path=/api/v1/integrations/github/callback; Max-Age=600${secureCookie}`);
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", env.GITHUB_CLIENT_ID!);
  url.searchParams.set("redirect_uri", env.GITHUB_CALLBACK_URL);
  url.searchParams.set("scope", "read:user user:email");
  url.searchParams.set("state", state);
  return url.toString();
}

githubRouter.get("/github/callback", asyncHandler(async (req, res) => {
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const cookie = req.header("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith("dhyavora_github_state="))?.slice("dhyavora_github_state=".length);
  res.setHeader("Set-Cookie", `dhyavora_github_state=; HttpOnly; SameSite=Lax; Path=/api/v1/integrations/github/callback; Max-Age=0${secureCookie}`);
  if (!configured() || !state || !cookie || cookie !== state || !verifyOauthState(state)) return res.redirect(`${env.FRONTEND_URL}/settings?github=failed`);
  const code = typeof req.query.code === "string" ? req.query.code : "";
  if (!code) return res.redirect(`${env.FRONTEND_URL}/settings?github=cancelled`);
  const uid = getOauthStateUid(state);
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", { method: "POST", signal: AbortSignal.timeout(15000), headers: { accept: "application/json", "content-type": "application/json" }, body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, redirect_uri: env.GITHUB_CALLBACK_URL }) });
  if (!tokenResponse.ok) return res.redirect(`${env.FRONTEND_URL}/settings?github=failed`);
  const tokenData = await tokenResponse.json() as { access_token?: string; scope?: string; error?: string };
  if (!tokenData.access_token || tokenData.error) return res.redirect(`${env.FRONTEND_URL}/settings?github=failed`);
  const userResponse = await fetch("https://api.github.com/user", { headers: { authorization: `Bearer ${tokenData.access_token}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28" }, signal: AbortSignal.timeout(15000) });
  if (!userResponse.ok) return res.redirect(`${env.FRONTEND_URL}/settings?github=failed`);
  const user = await userResponse.json() as { login: string };
  if (databaseStatus().connected && uid) {
    const existing = await recordModel("github-connection").findOne({ userId: uid, deletedAt: null });
    const data = { username: user.login, scopes: tokenData.scope?.split(",").filter(Boolean) ?? [], encryptedAccessToken: encryptSecret(tokenData.access_token), connectedAt: new Date().toISOString() };
    if (existing) { existing.set("data", data); await existing.save(); }
    else await recordModel("github-connection").create({ userId: uid, title: user.login, data });
    return res.redirect(`${env.FRONTEND_URL}/settings?github=connected`);
  }
  res.redirect(`${env.FRONTEND_URL}/settings?github=failed`);
}));

githubRouter.get("/github/repositories", requireAuth, asyncHandler(async (req, res) => {
  if (!configured()) return res.status(503).json({ success: false, error: { code: "GITHUB_NOT_CONFIGURED", message: "Configure GitHub OAuth and token encryption first." } });
  const connection = await recordModel("github-connection").findOne({ userId: req.auth!.uid, deletedAt: null }).lean() as { data: { encryptedAccessToken: string } } | null;
  if (!connection) return res.status(404).json({ success: false, error: { code: "GITHUB_NOT_CONNECTED", message: "Connect a GitHub account first." } });
  const token = decryptSecret(connection.data.encryptedAccessToken);
  const response = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100&type=owner", { headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28" }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) return res.status(502).json({ success: false, error: { code: "GITHUB_API_ERROR", message: "GitHub could not return repositories for the connected account." } });
  const repos = await response.json() as Array<{ id: number; name: string; full_name: string; html_url: string; language: string | null; updated_at: string; private: boolean }>;
  res.json({ success: true, data: repos.map(({ id, name, full_name, html_url, language, updated_at, private: isPrivate }) => ({ id, name, fullName: full_name, url: html_url, language, updatedAt: updated_at, private: isPrivate })) });
}));

githubRouter.delete("/github", requireAuth, asyncHandler(async (req, res) => {
  if (!databaseStatus().connected) return res.status(503).json({ success: false, error: { code: "DATABASE_UNAVAILABLE", message: "MongoDB is not connected." } });
  await recordModel("github-connection").updateOne({ userId: req.auth!.uid, deletedAt: null }, { $set: { deletedAt: new Date() } });
  res.json({ success: true, data: { disconnected: true } });
}));
