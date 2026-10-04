import type { Request, Response } from "express";
import handler from "../backend/dist/vercel-handler.js";

export default function dispatchApiRequest(req: Request, res: Response): void {
  const requestUrl = new URL(req.url ?? "/", "https://dhyavora.invalid");
  const apiPath = requestUrl.searchParams.get("__api_path");
  const segments = apiPath?.split("/") ?? [];

  if (segments[0] !== "v1" || segments.length < 2 || segments.some((segment) => !segment || segment === "." || segment === "..")) {
    res.status(400).json({ success: false, error: { code: "INVALID_API_PATH", message: "The API path is invalid." } });
    return;
  }

  requestUrl.searchParams.delete("__api_path");
  req.url = `/api/${segments.join("/")}${requestUrl.search}`;
  void handler(req, res);
}
