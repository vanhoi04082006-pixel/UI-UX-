"use client";
import { ApiError, apiFetch, type ApiFetchOptions } from "./api-client";
import { clearSessionToken, getSessionToken } from "./session-token";
/** request() — port cấu trúc từ production client.ts (1 retry khi 401).
 * Sandbox không có refresh endpoint; mock token không hết hạn nên nhánh
 * retry chủ yếu giữ đúng hình dạng contract cho lúc swap. */
export async function request<T>(
  path: string,
  parse: (data: unknown) => T,
  options: Omit<ApiFetchOptions, "token"> = {},
): Promise<T> {
  const token = getSessionToken();
  try {
    return parse(await apiFetch(path, { ...options, token }));
  } catch (error) {
    if (!(error instanceof ApiError) || error.statusCode !== 401) throw error;
    if (options.signal?.aborted)
      throw new DOMException("Cancelled", "AbortError");
    clearSessionToken();
    throw error;
  }
}
