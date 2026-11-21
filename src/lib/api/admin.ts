"use client";
/* =====================================================================
 * ADMIN ADAPTER — dashboard, users, question-bank, project-templates,
 * activity-events, audit-logs. Contract path khớp BE thật.
 * ===================================================================== */
import { request } from "./client";
import { array, number, parsePage, record, string } from "./parse";
import type { ActivityItem, AdminUserRow, QuestionRow, Role, TemplateRow } from "@/lib/mock/types";

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

export async function getAdminDashboard(): Promise<AdminStats> {
  return request("/dashboard/admin", (value) => {
    const v = record(value);
    return {
      users: number(v.users),
      interns: number(v.interns),
      instructors: number(v.instructors),
      admins: number(v.admins),
      pendingAccounts: number(v.pendingAccounts),
      lockedAccounts: number(v.lockedAccounts),
      activeSessions: number(v.activeSessions),
      certificatesIssued: number(v.certificatesIssued),
      questions: number(v.questions),
      templates: number(v.templates),
      aiCallsToday: number(v.aiCallsToday),
      uptime: number(v.uptime),
    };
  });
}

/* --------------------------------- users -------------------------------- */

function parseUser(value: unknown): AdminUserRow {
  const v = record(value);
  return {
    id: string(v.id),
    name: string(v.name),
    email: string(v.email),
    role: v.role as Role,
    status: v.status as AdminUserRow["status"],
    createdAt: string(v.createdAt),
    lastActive: string(v.lastActive),
  };
}

export async function listUsers(): Promise<AdminUserRow[]> {
  const body = await request("/users?page=1&pageSize=50", (value) => parsePage(value, parseUser));
  return body.items;
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

/* ----------------------------- question bank ---------------------------- */

function parseQuestion(value: unknown): QuestionRow {
  const v = record(value);
  return {
    id: string(v.id),
    code: string(v.code),
    role: string(v.role),
    content: string(v.content),
    difficulty: v.difficulty as QuestionRow["difficulty"],
    type: string(v.type),
    status: v.status as QuestionRow["status"],
  };
}

export async function listQuestions(): Promise<QuestionRow[]> {
  const body = await request("/admin/question-bank?page=1&pageSize=50", (value) =>
    parsePage(value, parseQuestion),
  );
  return body.items;
}

export async function createQuestion(input: {
  role: string;
  content: string;
  difficulty: "Dễ" | "Vừa" | "Khó";
  type: string;
}): Promise<QuestionRow> {
  return request("/admin/question-bank", parseQuestion, { method: "POST", body: input });
}

export async function updateQuestion(
  id: string,
  input: { status?: QuestionRow["status"]; content?: string },
): Promise<QuestionRow> {
  return request(`/admin/question-bank/${encodeURIComponent(id)}`, parseQuestion, {
    method: "PATCH",
    body: input,
  });
}

/* ------------------------------- templates ------------------------------ */

function parseTemplate(value: unknown): TemplateRow {
  const v = record(value);
  return {
    id: string(v.id),
    code: string(v.code),
    name: string(v.name),
    domain: string(v.domain),
    description: string(v.description),
    blueprints: number(v.blueprints),
    tasks: number(v.tasks),
    status: v.status as TemplateRow["status"],
  };
}

export async function listTemplates(): Promise<TemplateRow[]> {
  const body = await request("/project-templates?page=1&pageSize=50", (value) =>
    parsePage(value, parseTemplate),
  );
  return body.items;
}

/* --------------------------- activity & audit ---------------------------- */

function parseActivity(value: unknown): ActivityItem {
  const v = record(value);
  return {
    id: string(v.id),
    module: string(v.module),
    label: string(v.label),
    at: string(v.at),
    ok: v.ok === true,
  };
}

export async function listActivity(): Promise<ActivityItem[]> {
  const body = await request("/activity-events?page=1&pageSize=50", (value) =>
    parsePage(value, parseActivity),
  );
  return body.items;
}

export interface AuditRow extends ActivityItem {
  actor: string;
  action: string;
}

export async function listAuditLogs(): Promise<AuditRow[]> {
  const body = await request("/audit-logs?page=1&pageSize=50", (value) =>
    parsePage(value, (raw) => {
      const v = record(raw);
      return {
        id: string(v.id),
        module: string(v.module),
        label: string(v.label),
        at: string(v.at),
        ok: v.ok === true,
        actor: string(v.actor),
        action: string(v.action),
      };
    }),
  );
  return body.items;
}
