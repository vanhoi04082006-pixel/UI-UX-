"use client";
/* =====================================================================
 * GITHUB ADAPTER (cá nhân — intern) — contract BE thật:
 *  · GET    /github/me                     → trạng thái liên kết cá nhân
 *  · POST   /github/connect                → 201 { authorizeUrl } (OAuth)
 *  · DELETE /github/me                     → ngắt liên kết
 *  · GET    /github/me/repository-access   → { items, summary, limit }
 *  · GET    /github/repository-account     → tài khoản repo dùng chung
 *  · POST   /github/repository-account     → chọn tài khoản repo dùng chung
 * (Các op /sessions/{id}/github/* thuộc màn instructor — không thuộc file này.)
 * ===================================================================== */
import { request } from "./client";
import { ApiError } from "./api-client";
import { array, record } from "./parse";

/* --------------------- helpers parse defensive --------------------- */
/** Lấy chuỗi đầu tiên khác rỗng trong các key dự phòng. */
function optStr(v: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const val = v[k];
    if (typeof val === "string" && val.length > 0) return val;
    if (typeof val === "number" && Number.isFinite(val)) return String(val);
  }
  return null;
}
function optNum(v: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const val = v[k];
    if (typeof val === "number" && Number.isFinite(val)) return val;
  }
  return null;
}
function optBool(v: Record<string, unknown>, ...keys: string[]): boolean | null {
  for (const k of keys) {
    const val = v[k];
    if (typeof val === "boolean") return val;
  }
  return null;
}

/* ------------------------------ GET /github/me ------------------------------ */

export interface GithubStatus {
  configured: boolean;
  connected: boolean;
  login: string | null;
  githubUserId: string | null;
  canCreatePublicRepo: boolean;
  reconnectRequired: boolean;
}

function parseGithubStatus(value: unknown): GithubStatus {
  const v = record(value);
  return {
    configured: optBool(v, "configured") ?? false,
    connected: optBool(v, "connected") ?? false,
    login: optStr(v, "login", "username"),
    githubUserId: optStr(v, "githubUserId", "github_id"),
    canCreatePublicRepo: optBool(v, "canCreatePublicRepo") ?? false,
    reconnectRequired: optBool(v, "reconnectRequired") ?? false,
  };
}

export async function getGithubStatus(): Promise<GithubStatus> {
  return request("/github/me", parseGithubStatus);
}

/* ---------------------------- POST /github/connect ---------------------------- */

export interface GithubConnectResult {
  /** URL chuyển hướng tới GitHub OAuth (BE trả { authorizeUrl } — nhận cả { url }). */
  authorizeUrl: string;
}

export async function connectGithub(): Promise<GithubConnectResult> {
  return request(
    "/github/connect",
    (value) => {
      /* 201 + JSON { authorizeUrl }; một số bản trả { url } — parse cả hai,
       * không có URL hợp lệ thì ném INVALID_RESPONSE để màn catch hiển thị. */
      const v = record(value);
      const url = optStr(v, "authorizeUrl", "url", "redirectUrl", "redirect_url");
      if (!url) {
        throw new ApiError(
          0,
          "INVALID_RESPONSE",
          "Máy chủ không trả về đường dẫn kết nối GitHub.",
        );
      }
      return { authorizeUrl: url };
    },
    { method: "POST" },
  );
}

/* ---------------------------- DELETE /github/me ---------------------------- */

/** Ngắt liên kết GitHub — BE trả 200/204 no-content. */
export async function disconnectGithub(): Promise<null> {
  return request("/github/me", () => null, { method: "DELETE" });
}

/* --------------------- GET /github/me/repository-access --------------------- */

export interface RepoAccessItem {
  id: string | null;
  repoName: string;
  permission: string;
  grantedAt: string | null;
  sessionName: string | null;
  sessionCode: string | null;
  status: string | null;
  ownerLogin: string | null;
}

export interface RepoAccessSummaryRow {
  label: string;
  count: number;
}

export interface RepoAccessView {
  items: RepoAccessItem[];
  summary: RepoAccessSummaryRow[];
  limit: number;
}

function parseRepoAccessItem(value: unknown): RepoAccessItem {
  const v = record(value);
  return {
    id: optStr(v, "id"),
    repoName: optStr(v, "repoName", "repo", "repository", "name") ?? "(không tên)",
    permission: optStr(v, "permission", "role", "access") ?? "—",
    grantedAt: optStr(v, "grantedAt", "createdAt", "invitedAt"),
    sessionName: optStr(v, "sessionName", "session"),
    sessionCode: optStr(v, "sessionCode", "code"),
    status: optStr(v, "status", "state"),
    ownerLogin: optStr(v, "ownerLogin", "owner", "organization"),
  };
}

/** summary có thể là mảng {permission,count} hoặc {repoName,permission} — ép về hàng label+count. */
function parseRepoAccessSummary(value: unknown): RepoAccessSummaryRow[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw) => {
    const row = record(raw);
    const label = optStr(row, "permission", "repoName", "label", "status") ?? "khác";
    const count = optNum(row, "count", "total", "value");
    return { label, count: count ?? 1 };
  });
}

export async function getRepositoryAccess(): Promise<RepoAccessView> {
  return request("/github/me/repository-access", (value) => {
    const v = record(value);
    return {
      items: array(v.items ?? [], parseRepoAccessItem),
      summary: parseRepoAccessSummary(v.summary),
      limit: optNum(v, "limit") ?? 50,
    };
  });
}

/* ------------------- GET/POST /github/repository-account ------------------- */

export interface RepositoryAccount {
  configured: boolean | null;
  connected: boolean | null;
  login: string | null;
  githubUserId: string | null;
  canCreatePublicRepo: boolean | null;
  reconnectRequired: boolean | null;
  /** Bản ghi thô khi BE trả field ngoài dự kiến (màn hiển thị dạng note). */
  extra: Record<string, unknown> | null;
}

function parseRepositoryAccount(value: unknown): RepositoryAccount {
  const v = record(value);
  return {
    configured: optBool(v, "configured"),
    connected: optBool(v, "connected"),
    login: optStr(v, "login", "username"),
    githubUserId: optStr(v, "githubUserId"),
    canCreatePublicRepo: optBool(v, "canCreatePublicRepo"),
    reconnectRequired: optBool(v, "reconnectRequired"),
    extra: v,
  };
}

const EMPTY_ACCOUNT: RepositoryAccount = {
  configured: null,
  connected: null,
  login: null,
  githubUserId: null,
  canCreatePublicRepo: null,
  reconnectRequired: null,
  extra: null,
};

/** Tài khoản repo dùng chung (admin scope) — intern thường nhận 403 PERMISSION_DENIED. */
export async function getRepositoryAccount(): Promise<RepositoryAccount> {
  return request("/github/repository-account", (value) =>
    value === null || value === undefined ? EMPTY_ACCOUNT : parseRepositoryAccount(value),
  );
}

/** Chọn tài khoản repo dùng chung — intern nhận 403/GITHUB_RECONNECT_REQUIRED. */
export async function selectRepositoryAccount(): Promise<RepositoryAccount | null> {
  return request(
    "/github/repository-account",
    (value) =>
      value === null || value === undefined ? null : parseRepositoryAccount(value),
    { method: "POST" },
  );
}
