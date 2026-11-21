"use client";
/* =====================================================================
 * ADMIN ADAPTER — đã CHỈNH THEO CONTRACT BE THẬT (docs/api-specs:
 * dashboard.md · users.md · QuestionBank.md · project_templates.md):
 *  · GET /dashboard/admin   → {metrics{userCount,instructorCount,internCount,
 *      activeSessions,aiRunsToday}, users[], roles[], activity[], statuses[]}
 *  · GET /dashboard/access  → {roles[{code,name,userCount,permissionCount}], …}
 *  · GET /users             → {data:[{id,email,username,displayName,status,
 *      lastLoginAt,createdAt,updatedAt}], meta} — KHÔNG có role từng dòng;
 *      lọc role bằng query roleCode (server-side)
 *  · POST /users            → CreateUserDto {email,username,displayName,
 *      password,roleCodes[]} (mật khẩu 10–72 ký tự)
 *  · PATCH /users/{id}/status → SetUserStatusDto {status}
 *  · GET /activity-events   → {data:[{id,actorId,module,action,targetType,
 *      targetId,summary,createdAt}], meta}
 *  · GET /admin/question-bank → {items:[{id,roleCode,phase,difficulty,prompt,
 *      language,expectedConcepts,exampleAnswer,isActive,version,…}], total}
 *  · POST /admin/question-bank (QuestionContentDto) · PUT /{id}
 *      (UpdateQuestionDto) · DELETE /{id}?version= (retire)
 *  · GET /project-templates → {data:[{id,code,name,category,difficulty,
 *      status,version,techStack[],roles[],teamSize,sprintCount,createdAt}], meta}
 * Map phòng thủ (nullable) sang view-model legacy — màn hình cũ vẫn chạy.
 * ===================================================================== */
import { request } from "./client";
import { array, nullable, number, parsePage, record, string } from "./parse";
import { ApiError } from "./api-client";
import type { AccountStatus, ActivityItem, AdminUserRow, Role } from "@/lib/types";

/* ------------------------------ dashboard ------------------------------ */

export interface AdminStats {
  users: number;
  interns: number;
  instructors: number;
  admins: number;
  pendingAccounts: number;
  lockedAccounts: number;
  activeSessions: number;
  certificatesIssued: number;
  questions: number;
  templates: number;
  aiCallsToday: number;
  uptime: number;
}

/** Vai trò kèm số người dùng thật (GET /dashboard/access). */
export interface AdminRoleSlice {
  code: string;
  name: string;
  userCount: number;
  permissionCount: number;
}

/** Trạng thái tài khoản đếm theo nhóm (GET /dashboard/admin.statuses). */
export interface AdminStatusCount {
  status: string;
  count: number;
}

export interface AdminDashboardView {
  stats: AdminStats;
  roles: AdminRoleSlice[];
  statuses: AdminStatusCount[];
  recentLogins: AdminUserRow[];
  generatedAt: string;
}

/* ------------------------------- users ---------------------------------- */

function parseUser(value: unknown): AdminUserRow {
  const v = record(value);
  const displayName = nullable(v.displayName, string) ?? nullable(v.name, string) ?? "";
  return {
    id: nullable(v.id, string) ?? "",
    name: displayName,
    email: nullable(v.email, string) ?? "",
    /* BE thật không trả role trong danh sách — lọc server-side bằng roleCode. */
    role: (nullable(v.role, string) as Role | null) ?? null,
    status: (nullable(v.status, string) ?? "active") as AdminUserRow["status"],
    createdAt: nullable(v.createdAt, string) ?? "",
    lastActive: nullable(v.lastLoginAt, string) ?? nullable(v.lastActive, string) ?? "",
  };
}

export async function listUsers(roleCode?: string, q?: string): Promise<AdminUserRow[]> {
  const params = new URLSearchParams({ page: "1", pageSize: "100" });
  if (roleCode && roleCode !== "all") params.set("roleCode", roleCode);
  if (q && q.trim()) params.set("q", q.trim());
  const body = await request(`/users?${params.toString()}`, (value) =>
    parsePage(value, parseUser),
  );
  return body.items;
}

export async function createUser(input: {
  email: string;
  username: string;
  displayName: string;
  password: string;
  roleCodes: string[];
}): Promise<AdminUserRow> {
  return request("/users", parseUser, { method: "POST", body: input });
}

export async function setUserStatus(
  id: string,
  status: "active" | "locked" | "pending",
): Promise<AdminUserRow> {
  return request(`/users/${encodeURIComponent(id)}/status`, parseUser, {
    method: "PATCH",
    body: { status },
  });
}

/** Chi tiết một người dùng — GET /users/{id} (kèm roleCodes nếu BE trả về). */
export async function getUserDetail(id: string): Promise<AdminUserRow & { username: string }> {
  return request(`/users/${encodeURIComponent(id)}`, (value) => {
    const v = record(value);
    const base = parseUser(value);
    return { ...base, username: nullable(v.username, string) ?? "" };
  });
}

/* ------------------------------ activity -------------------------------- */

function parseActivity(value: unknown): ActivityItem {
  const v = record(value);
  return {
    id: nullable(v.id, string) ?? "",
    module: nullable(v.module, string) ?? nullable(v.action, string) ?? "",
    label:
      nullable(v.label, string) ??
      nullable(v.summary, string) ??
      nullable(v.action, string) ??
      "",
    at: nullable(v.at, string) ?? nullable(v.createdAt, string) ?? "",
    ok: v.ok === true || (v.ok === undefined && v.createdAt !== undefined),
  };
}

export async function listActivity(): Promise<ActivityItem[]> {
  const body = await request("/activity-events?page=1&pageSize=50", (value) =>
    parsePage(value, parseActivity),
  );
  return body.items;
}

/* ------------------------------ dashboard ------------------------------- */

function parseDashboard(value: unknown) {
  const v = record(value);
  const m = record(v.metrics);
  const statuses = array(v.statuses ?? [], (raw) => {
    const s = record(raw);
    return {
      status: nullable(s.status, string) ?? "",
      count: nullable(s.count, number) ?? 0,
    };
  });
  return {
    metrics: {
      userCount: nullable(m.userCount, number) ?? nullable(m.users, number) ?? 0,
      internCount: nullable(m.internCount, number) ?? nullable(m.interns, number) ?? 0,
      instructorCount:
        nullable(m.instructorCount, number) ?? nullable(m.instructors, number) ?? 0,
      activeSessions: nullable(m.activeSessions, number) ?? 0,
      aiRunsToday: nullable(m.aiRunsToday, number) ?? nullable(m.aiCallsToday, number) ?? 0,
    },
    recentLogins: array(v.users ?? [], parseUser),
    roles: array(v.roles ?? [], (raw) => {
      const r = record(raw);
      return {
        code: nullable(r.code, string) ?? "",
        name: nullable(r.name, string) ?? "",
        userCount: nullable(r.userCount, number) ?? 0,
        permissionCount: nullable(r.permissionCount, number) ?? 0,
      };
    }),
    activity: array(v.activity ?? [], parseActivity),
    statuses,
    generatedAt: nullable(v.generatedAt, string) ?? "",
  };
}

async function fetchTotal(path: string, envelope: "items" | "data"): Promise<number> {
  return request(`${path}?page=1&pageSize=1`, (value) => {
    const v = record(value);
    const total = nullable(v.total, number);
    if (total != null) return total;
    const meta = v.meta !== undefined ? record(v.meta) : null;
    const metaTotal = meta ? nullable(meta.total, number) : null;
    if (metaTotal != null) return metaTotal;
    const list = envelope === "items" ? v.items : v.data;
    return Array.isArray(list) ? list.length : 0;
  });
}

/** Compose tổng quan quản trị từ nhiều endpoint BE thật. */
export async function getAdminDashboardView(): Promise<AdminDashboardView> {
  const dash = await request("/dashboard/admin", parseDashboard);
  /* /dashboard/access cho userCount theo role (biểu đồ cơ cấu thật);
   * các total phụ có endpoint rơi cũng không làm hỏng tổng quan. */
  const [access, questions, templates, certificates] = await Promise.all([
    request("/dashboard/access", (value) => {
      const v = record(value);
      return array(v.roles ?? [], (raw) => {
        const r = record(raw);
        return {
          code: nullable(r.code, string) ?? "",
          name: nullable(r.name, string) ?? "",
          userCount: nullable(r.userCount, number) ?? 0,
          permissionCount: nullable(r.permissionCount, number) ?? 0,
        };
      });
    }).catch(() => [] as AdminRoleSlice[]),
    fetchTotal("/admin/question-bank", "items").catch(() => 0),
    fetchTotal("/project-templates", "data").catch(() => 0),
    fetchTotal("/certificates", "items").catch(() => 0),
  ]);
  const roles = access.length > 0 ? access : dash.roles;
  const stats: AdminStats = {
    users: dash.metrics.userCount,
    interns: dash.metrics.internCount,
    instructors: dash.metrics.instructorCount,
    admins: roles.find((r) => r.code === "admin")?.userCount ?? 0,
    pendingAccounts: dash.statuses.find((s) => s.status === "pending")?.count ?? 0,
    lockedAccounts: dash.statuses.find((s) => s.status === "locked")?.count ?? 0,
    activeSessions: dash.metrics.activeSessions,
    certificatesIssued: certificates,
    questions,
    templates,
    aiCallsToday: dash.metrics.aiRunsToday,
    uptime: 100,
  };
  return {
    stats,
    roles,
    statuses: dash.statuses,
    recentLogins: dash.recentLogins,
    generatedAt: dash.generatedAt,
  };
}

/** Bản rút gọn legacy — giữ tương thích các màn cũ chỉ cần số liệu. */
export async function getAdminDashboard(): Promise<AdminStats> {
  return (await getAdminDashboardView()).stats;
}

/* ----------------------------- question bank ---------------------------- */

export type QuestionDifficulty = "easy" | "medium" | "hard";
export type QuestionPhase = "technical" | "introduction" | "english" | "communication";

export interface AdminQuestionRow {
  id: string;
  /** Mã hiển thị — BE không có code, dùng 8 ký tự đầu id. */
  code: string;
  roleCode: string;
  phase: string;
  difficulty: QuestionDifficulty;
  language: string;
  prompt: string;
  expectedConcepts: string[];
  exampleAnswer: string;
  scoringRubric: string;
  followUpHints: string[];
  tags: string[];
  isActive: boolean;
  version: number;
  updatedAt: string;
}

function parseQuestion(value: unknown): AdminQuestionRow {
  const v = record(value);
  const id = nullable(v.id, string) ?? "";
  const difficultyRaw = nullable(v.difficulty, string) ?? "medium";
  return {
    id,
    code: nullable(v.code, string) ?? (id ? `Q-${id.slice(0, 8).toUpperCase()}` : ""),
    roleCode: nullable(v.roleCode, string) ?? nullable(v.role, string) ?? "",
    phase: nullable(v.phase, string) ?? nullable(v.type, string) ?? "",
    difficulty:
      difficultyRaw === "easy" || difficultyRaw === "hard" ? difficultyRaw : "medium",
    language: nullable(v.language, string) ?? "vi",
    prompt: nullable(v.prompt, string) ?? nullable(v.content, string) ?? "",
    expectedConcepts: array(v.expectedConcepts ?? [], (x) => String(x)),
    exampleAnswer: nullable(v.exampleAnswer, string) ?? "",
    scoringRubric: nullable(v.scoringRubric, string) ?? "",
    followUpHints: array(v.followUpHints ?? [], (x) => String(x)),
    tags: array(v.tags ?? [], (x) => String(x)),
    isActive: v.isActive === true || v.status === "Đang dùng",
    version: nullable(v.version, number) ?? 1,
    updatedAt: nullable(v.updatedAt, string) ?? "",
  };
}

/** GET /admin/question-bank → envelope {items, total} (pageSize tối đa 100). */
function parseQuestionPage(value: unknown): { items: AdminQuestionRow[]; total: number } {
  const v = record(value);
  const raw = Array.isArray(v.items) ? v.items : Array.isArray(v.data) ? v.data : [];
  return {
    items: array(raw, parseQuestion),
    total: nullable(v.total, number) ?? raw.length,
  };
}

export async function listQuestions(): Promise<AdminQuestionRow[]> {
  /* BE giới hạn pageSize ≤ 100 — duyệt hết các trang (tối đa 5 trang). */
  const first = await request("/admin/question-bank?page=1&pageSize=100", parseQuestionPage);
  const all = [...first.items];
  const totalPages = Math.min(Math.ceil(first.total / 100) || 1, 5);
  for (let page = 2; page <= totalPages; page++) {
    const next = await request(
      `/admin/question-bank?page=${page}&pageSize=100`,
      parseQuestionPage,
    );
    all.push(...next.items);
  }
  return all;
}

export async function createQuestion(input: {
  roleCode: string;
  phase: QuestionPhase;
  difficulty: QuestionDifficulty;
  language: "vi" | "en";
  prompt: string;
  expectedConcepts: string[];
  exampleAnswer: string;
  scoringRubric: string;
  followUpHints: string[];
  tags: string[];
  isActive: boolean;
}): Promise<AdminQuestionRow> {
  return request("/admin/question-bank", parseQuestion, { method: "POST", body: input });
}

export async function updateQuestion(
  id: string,
  version: number,
  input: Partial<{
    roleCode: string;
    phase: QuestionPhase;
    difficulty: QuestionDifficulty;
    language: "vi" | "en";
    prompt: string;
    expectedConcepts: string[];
    exampleAnswer: string;
  }>,
): Promise<AdminQuestionRow> {
  return request(
    `/admin/question-bank/${encodeURIComponent(id)}?version=${encodeURIComponent(String(version))}`,
    parseQuestion,
    { method: "PUT", body: input },
  );
}

/** Nghỉ dùng câu hỏi — DELETE /admin/question-bank/{id}?version=N. */
export async function retireQuestion(id: string, version: number): Promise<void> {
  await request(
    `/admin/question-bank/${encodeURIComponent(id)}?version=${encodeURIComponent(String(version))}`,
    (value) => (value == null ? null : record(value)),
    { method: "DELETE" },
  );
}

/* ------------------------------- templates ------------------------------ */

export interface AdminTemplateRow {
  id: string;
  code: string;
  name: string;
  category: string;
  difficulty: string;
  status: string;
  version: number;
  techStack: string[];
  roles: string[];
  teamSize: number;
  sprintCount: number;
  createdAt: string;
}

function parseTemplate(value: unknown): AdminTemplateRow {
  const v = record(value);
  return {
    id: nullable(v.id, string) ?? "",
    code: nullable(v.code, string) ?? "",
    name: nullable(v.name, string) ?? "",
    category: nullable(v.category, string) ?? nullable(v.domain, string) ?? "",
    difficulty: nullable(v.difficulty, string) ?? "",
    status: nullable(v.status, string) ?? "",
    version: nullable(v.version, number) ?? 1,
    techStack: array(v.techStack ?? [], (x) => String(x)),
    roles: array(v.roles ?? [], (x) => String(x)),
    teamSize: nullable(v.teamSize, number) ?? 0,
    sprintCount: nullable(v.sprintCount, number) ?? nullable(v.tasks, number) ?? 0,
    createdAt: nullable(v.createdAt, string) ?? "",
  };
}

export async function listTemplates(): Promise<AdminTemplateRow[]> {
  const body = await request("/project-templates?page=1&pageSize=50", (value) =>
    parsePage(value, parseTemplate),
  );
  return body.items;
}

/* ------------------------------ API mismatch guard --------------------- */

export function adminErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const message = error.message.replace(/^Error:\s*/, "").trim();
    return message || fallback;
  }
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}
