"use client";
/* =====================================================================
 * AUTH ADAPTER — khớp contract BE thật (đối chiếu QA tunnel 2026-11-21):
 *  POST /auth/login   {email, password}
 *      → {accessToken, user: {id, email, displayName, status, roles[], permissions[]}}
 *  GET  /auth/me      → principal phẳng {id, email, displayName, status, roles[], permissions[]}
 *  POST /auth/register {fullName, email, password, acceptedTerms:true} → 201 {message?}
 *  POST /auth/logout  (Bearer) → 204, revoke refresh cookie
 *  POST /auth/change-password {currentPassword, newPassword} → 201, clear cookie
 * Preview-only: GET /auth/demo-accounts (sandbox mock — BE thật không có).
 * ===================================================================== */
import { apiFetch, ApiError } from "./api-client";
import { array, record, string, boolean, nullable, number } from "./parse";
import { setSessionToken, clearSessionToken, getSessionToken } from "./session-token";
import type { Role, SessionUser } from "@/lib/mock/types";

/* ------------------------- principal & mapping ------------------------- */

const ROLES: readonly Role[] = ["intern", "instructor", "admin"];
const ROLE_TITLE: Record<Role, string> = {
  intern: "Sinh viên thực tập",
  instructor: "Giảng viên hướng dẫn",
  admin: "Quản trị hệ thống",
};

/** Principal BE thật: phẳng, roles là mảng, tên là displayName. */
export interface Principal {
  id: string;
  email: string;
  displayName: string;
  status: string;
  roles: Role[];
  permissions: string[];
}

/** Chấp nhận cả flat BE thật và envelope mock cũ {user:{...}} (sandbox). */
export function parsePrincipal(value: unknown): Principal {
  const v = record(value);
  const inner = v.user !== undefined ? record(v.user) : v;
  const rawRoles = Array.isArray(inner.roles)
    ? inner.roles
    : typeof inner.role === "string"
      ? [inner.role]
      : [];
  const roles = ROLES.filter((r) => rawRoles.includes(r));
  return {
    id: string(inner.id),
    email: string(inner.email),
    displayName:
      typeof inner.displayName === "string"
        ? inner.displayName
        : typeof inner.fullName === "string"
          ? inner.fullName
          : string(inner.email),
    status: typeof inner.status === "string" ? inner.status : "active",
    roles: roles.length > 0 ? roles : ["intern"],
    permissions: Array.isArray(v.permissions)
      ? array(v.permissions, string)
      : Array.isArray(inner.permissions)
        ? array(inner.permissions, string)
        : [],
  };
}

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "V";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function principalToSessionUser(p: Principal): SessionUser {
  const role = p.roles[0];
  return {
    id: p.id,
    email: p.email,
    name: p.displayName,
    role,
    title: ROLE_TITLE[role],
    initials: initialsOf(p.displayName),
  };
}

/* ------------------------------ auth flows ------------------------------ */

export interface LoginResult {
  accessToken: string;
  expiresIn: number;
  user: SessionUser;
  permissions: string[];
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const body = await apiFetch("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  const v = record(body);
  const accessToken = string(v.accessToken);
  const expiresIn = nullable(v.expiresIn, number) ?? 900;
  setSessionToken(accessToken);
  /* Login trả kèm principal mới nhất — không cần gọi thêm /auth/me. */
  const principal = parsePrincipal(v.user !== undefined ? v.user : await apiFetch("/auth/me", { token: accessToken }));
  return {
    accessToken,
    expiresIn,
    user: principalToSessionUser(principal),
    permissions: principal.permissions,
  };
}

export async function register(name: string, email: string, password: string): Promise<string> {
  const body = await apiFetch("/auth/register", {
    method: "POST",
    body: { fullName: name, email, password, acceptedTerms: true },
  });
  const v = record(body);
  const message =
    typeof v.message === "string"
      ? v.message
      : `Chào ${name.split(" ").at(-1)}! Tài khoản sinh viên đã được tạo. Đăng nhập để bắt đầu hành trình.`;
  return message;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch("/auth/logout", { method: "POST", token: getSessionToken() });
  } catch {
    /* mạng đi trước việc dọn local cũng được */
  }
  clearSessionToken();
}

/** Đổi mật khẩu (min 12 ký tự) — BE xoá refresh cookie → đăng nhập lại. */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await apiFetch("/auth/change-password", {
    method: "POST",
    body: { currentPassword, newPassword },
    token: getSessionToken(),
  });
  clearSessionToken();
}

export async function fetchMe(): Promise<Principal | null> {
  try {
    return parsePrincipal(await apiFetch("/auth/me", { token: getSessionToken() }));
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) return null;
    throw error;
  }
}

/* ------------------- preview-only demo accounts panel ------------------ */

export interface DemoAccount {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: string;
  title: string;
  internState: string | null;
  mustChangePassword: boolean;
  note: string;
}

/** Chỉ tồn tại ở sandbox mock; BE thật trả 404 → trả [] để panel tự ẩn. */
export async function listDemoAccounts(): Promise<DemoAccount[]> {
  try {
    const body = await apiFetch("/auth/demo-accounts");
    return array(body, (raw) => {
      const v = record(raw);
      return {
        id: string(v.id),
        email: string(v.email),
        name: string(v.name),
        role: ROLES.find((r) => r === string(v.role)) ?? "intern",
        status: string(v.status),
        title: string(v.title),
        internState: nullable(v.internState, string),
        mustChangePassword: boolean(v.mustChangePassword),
        note: string(v.note),
      };
    });
  } catch {
    return [];
  }
}
