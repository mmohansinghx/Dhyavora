import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env.js";

function key() {
  if (!env.TOKEN_ENCRYPTION_KEY || !/^[\da-f]{64}$/i.test(env.TOKEN_ENCRYPTION_KEY)) throw new Error("TOKEN_ENCRYPTION_KEY must be a 32-byte hexadecimal key.");
  return Buffer.from(env.TOKEN_ENCRYPTION_KEY, "hex");
}

export function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptSecret(value: string): string {
  const [ivText, tagText, dataText] = value.split(".");
  if (!ivText || !tagText || !dataText) throw new Error("Encrypted token has invalid format.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataText, "base64url")), decipher.final()]).toString("utf8");
}

function hmac(value: string) { return createHmac("sha256", key()).update(value).digest("base64url"); }
export function createOauthState(uid: string) {
  const payload = `${Buffer.from(uid, "utf8").toString("base64url")}.${Date.now()}.${randomBytes(18).toString("base64url")}`;
  return `${payload}.${hmac(payload)}`;
}
export function verifyOauthState(state: string, uid?: string) {
  const parts = state.split(".");
  if (parts.length !== 4) return false;
  const [stateUid, issued, nonce, signature] = parts;
  if (!stateUid || !issued || !nonce || !signature) return false;
  let decodedUid: string;
  try { decodedUid = Buffer.from(stateUid, "base64url").toString("utf8"); } catch { return false; }
  if (!decodedUid || (uid && decodedUid !== uid)) return false;
  const age = Date.now() - Number(issued);
  if (!Number.isFinite(age) || age < 0 || age > 10 * 60 * 1000) return false;
  const expected = Buffer.from(hmac(`${stateUid}.${issued}.${nonce}`));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function getOauthStateUid(state: string): string | undefined {
  const encodedUid = state.split(".")[0];
  if (!encodedUid) return undefined;
  try { return Buffer.from(encodedUid, "base64url").toString("utf8") || undefined; } catch { return undefined; }
}
