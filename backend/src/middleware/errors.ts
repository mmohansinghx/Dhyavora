import type { ErrorRequestHandler, Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../shared/logger.js";

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "The requested API route does not exist." } });
}

export const errorHandler: ErrorRequestHandler = (error: unknown, req: Request, res: Response, _next: NextFunction) => {
  const requestId = res.locals.requestId;
  if (error instanceof ZodError) return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Some fields are invalid.", details: error.flatten() } });
  if (error && typeof error === "object" && "name" in error && error.name === "MulterError") return res.status(400).json({ success: false, error: { code: "UPLOAD_ERROR", message: "The file could not be accepted." } });
  if (error instanceof Error && error.message === "Only PDF and plain text resumes are supported.") return res.status(400).json({ success: false, error: { code: "UNSUPPORTED_FILE", message: error.message } });
logger.error(
  {
    requestId,
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorMessage: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  },
  "Unhandled request error"
);
  res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "The request could not be completed." } });
};
