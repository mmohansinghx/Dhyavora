import { webEnv } from "./env";
import { getAuth } from "firebase/auth";

export type ApiResult<T> = { success: true; data: T };
export type ApiFailure = { success: false; error: { code: string; message: string; details?: unknown } };
export class ApiError extends Error { constructor(public code: string, message: string, public status: number, public details?: unknown) { super(message); } }

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const auth = getAuthSafe();
  const token = auth?.currentUser ? await auth.currentUser.getIdToken() : undefined;
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${webEnv.VITE_API_BASE_URL}${path}`, { ...init, headers, credentials: "include" });
  const payload = await response.json().catch(() => null) as ApiResult<T> | ApiFailure | null;
  if (!response.ok || !payload || !payload.success) {
    const error = payload && !payload.success ? payload.error : undefined;
    throw new ApiError(error?.code ?? "REQUEST_FAILED", error?.message ?? `Request failed (${response.status}).`, response.status, error?.details);
  }
  return payload.data;
}

function getAuthSafe() { try { return getAuth(); } catch { return undefined; } }
export const api = {
  get: <T,>(path: string) => apiRequest<T>(path),
  post: <T,>(path: string, data?: unknown) => apiRequest<T>(path, { method: "POST", body: JSON.stringify(data ?? {}) }),
  put: <T,>(path: string, data: unknown) => apiRequest<T>(path, { method: "PUT", body: JSON.stringify(data) }),
  patch: <T,>(path: string, data: unknown) => apiRequest<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
  delete: <T,>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
  upload: <T,>(path: string, data: FormData) => apiRequest<T>(path, { method: "POST", body: data }),
};
