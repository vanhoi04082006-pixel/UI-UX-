"use client";
/* =====================================================================
 * AUTH ADAPTER — khớp contract production:
 *  POST /auth/login → {accessToken, expiresIn}
 *  GET  /auth/me    → principal {user, permissions}
 *  POST /auth/register · /auth/logout · /auth/change-password
 * Preview-only: GET /auth/demo-accounts (landing demo cards — KHÔNG có ở
 * BE thật, sẽ không gọi khi swap; tài liệu SWAP ghi rõ).
 * ===================================================================== */
import { apiFetch, ApiError } from "./api-client";
import { array, record, string, boolean, nullable, number } from "./parse";
import { setSessionToken, clearSessionToken, getSessionToken } from "./session-token";
import type { Role, SessionUser } from "@/lib/mock/types";

/* ------------------------- principal & mapping ------------------------- */

const ROLES: readonly Role[] = ["intern", "instructor", "admin"];

export interface Principal {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: Role;
    title: string;
    internState: string | null;
    mustChangePassword: boolean;
  };
  permissions: string[];
}

export function parsePrincipal(value: unknown): Principal {
  const v = record(value);
  const u = record(v.user);
  const role = ROLES.find((r) => r === string(u.role)) ?? "intern";
  return {
    user: {
      id: string(u.id),
      email: string(u.email),
      fullName: string(u.fullName),
      role,
      title: string(u.title),
      internState: nullable(u.internState, string),
      mustChangePassword: boolean(u.mustChangePassword),
    },
    permissions: array(v.permissions, string),
  };
}

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "V";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function principalToSessionUser(p: Principal): SessionUser {
  const internState =
    p.user.internState === "active" || p.user.internState === "waiting" || p.user.internState === "finished"
      ? (p.user.internState as SessionUser["internState"])
      : undefined;
  return {
    id: p.user.id,
    email: p.user.email,
    name: p.user.fullName,
    role: p.user.role,
    title: p.user.title,
    initials: initialsOf(p.user.fullName),
    internState,
    mustChangePassword: p.user.mustChangePassword || undefined,
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
  const expiresIn = nullable(v.expiresIn, number) ?? 3600;
  setSessionToken(accessToken);
  const principal = parsePrincipal(await apiFetch("/auth/me", { token: accessToken }));
  return { accessToken, expiresIn, user: principalToSessionUser(principal), permissions: principal.permissions };
}

export async function register(name: string, email: string, password: string): Promise<string> {
  const body = await apiFetch("/auth/register", {
    method: "POST",
    body: { name, email, password },
  });
  return string(record(body).message);
}

export async function logout(): Promise<void> {
  try {
    await apiFetch("/auth/logout", { method: "POST", token: null });
  } catch {
    /* mạng đi trước việc dọn local cũng được */
  }
  clearSessionToken();
}

export async function changePassword(
  email: string,
  currentPassword: string,
  newPassword: string,
): Promise<SessionUser> {
  const body = await apiFetch("/auth/change-password", {
    method: "POST",
    body: { email, currentPassword, newPassword },
    token: getSessionToken(),
  });
  return principalToSessionUser(parsePrincipal(record(body)));
}

export async function fetchMe(): Promise<Principal | null> {
  try {
    return parsePrincipal(await apiFetch("/auth/me"));
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

export async function listDemoAccounts(): Promise<DemoAccount[]> {
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
}
