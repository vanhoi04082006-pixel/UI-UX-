"use client";
/* =====================================================================
 * REQUEST — client gọi API với Bearer token + tự refresh khi 401.
 *
 * Contract BE thật (docs/FE-INTEGRATION-GUIDE.md §5):
 *  · Access token TTL 15 phút, gửi ở header Authorization.
 *  · Khi hết hạn (401) → POST /auth/refresh (cookie vintern_refresh,
 *    path=/api/v1/auth, credentials: include) → { accessToken, user }.
 *  · Refresh xong retry đúng request gốc đúng 1 lần; refresh fail
 *    (REFRESH_MISSING / REFRESH_EXPIRED / REFRESH_REUSE) → force logout.
 * ===================================================================== */
import { apiFetch, ApiError, type ApiFetchOptions, isRecord } from "./api-client";
import { clearSessionToken, getSessionToken, setSessionToken } from "./session-token";

/* Refresh mono-flight: nhiều request 401 cùng lúc chỉ tạo 1 call refresh. */
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const body = await apiFetch("/auth/refresh", { method: "POST", token: null });
    if (!isRecord(body) || typeof body.accessToken !== "string") return null;
    setSessionToken(body.accessToken);
    return body.accessToken;
  } catch {
    return null;
  }
}

export async function request<T>(
  path: string,
  parse: (data: unknown) => T,
  options: Omit<ApiFetchOptions, "token"> = {},
): Promise<T> {
  const token = getSessionToken();
  try {
    return parse(await apiFetch(path, { ...options, token }));
  } catch (error) {
    const retriable =
      error instanceof ApiError &&
      error.statusCode === 401 &&
      !path.startsWith("/auth/login") &&
      !path.startsWith("/auth/refresh") &&
      !path.startsWith("/auth/register");
    if (!retriable) throw error;
    if (options.signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    /* 401 giữa chừng → refresh 1 lần rồi retry request gốc. */
    refreshing = refreshing ?? refreshAccessToken();
    let fresh: string | null = null;
    try {
      fresh = await refreshing;
    } finally {
      refreshing = null;
    }
    if (!fresh) {
      clearSessionToken();
      throw error;
    }
    return parse(await apiFetch(path, { ...options, token: fresh }));
  }
}
