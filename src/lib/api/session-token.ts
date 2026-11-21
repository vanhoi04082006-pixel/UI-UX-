"use client";
/* =====================================================================
 * SESSION TOKEN — lưu accessToken do /auth/login cấp (localStorage).
 * Access token TTL ngắn (15 phút); khi hết hạn, cookie/refresh
 * sẽ nằm ở đây (production dùng cookie coordination — xem repo thật).
 * ===================================================================== */

const TOKEN_KEY = "v-intern-token";

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setSessionToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode — bỏ qua */
  }
}
export function clearSessionToken() {
  setSessionToken(null);
}
