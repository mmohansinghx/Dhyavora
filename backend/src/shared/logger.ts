import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: { paths: ["req.headers.authorization", "req.headers.cookie", "*.accessToken", "*.refreshToken", "*.token", "*.privateKey", "*.private_key", "*.password", "*.secret", "*.clientSecret", "*.client_secret", "*.apiKey", "*.connectionString", "*.uri"], censor: "[REDACTED]" },
});
