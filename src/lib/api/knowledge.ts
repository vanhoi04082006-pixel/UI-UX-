"use client";
/* =====================================================================
 * KNOWLEDGE ADAPTER (admin) — nhóm knowledge (10 ops) + agents (5 ops).
 * Contract khớp BE thật (docs/api-specs/knowledge.md · agents.md):
 *  · GET  /admin/knowledge                       → {items,total,page,pageSize}
 *  · POST /admin/knowledge                       {code, draft}
 *  · POST /admin/knowledge/import/dry-run        {entries: object[]}
 *  · GET  /admin/knowledge/{code}                → chi tiết + snapshot
 *  · PUT  /admin/knowledge/{code}                {version, draft}
 *  · POST /admin/knowledge/{code}/archive        {version}
 *  · GET  /admin/knowledge/{code}/publication-check
 *  · POST /admin/knowledge/{code}/publish        {version}
 *  · POST /admin/knowledge/{code}/restore        {version, sourceVersion}
 *  · GET  /admin/knowledge/{code}/revisions      → {items,total,...}
 *  · POST /admin/agents/knowledge-runs           {requestId, question, roleCode?}
 *  · GET  /admin/agents/knowledge-runs/{id}
 *  · POST /admin/agents/knowledge-runs/{id}/cancel
 *  · POST /admin/agents/knowledge-runs/{id}/resume
 *  · GET  /admin/agents/business-runs            → {definitions,items,total,...}
 * ===================================================================== */
import { request } from "./client";
import { array, boolean, nullable, number, record, string } from "./parse";

/* ------------------------------- types --------------------------------- */

export type KnowledgeKind =
  | "qa"
  | "guide"
  | "exercise"
  | "solution"
  | "rubric"
  | "plan_template"
  | "communication";

export type KnowledgeStatus = "draft" | "published" | "archived";
export type KnowledgeAudience = "student_safe" | "staff_only" | "grading_only";

export interface KnowledgeSource {
  title: string;
  url: string | null;
  reference: string | null;
}

export interface KnowledgeSnapshot {
  code: string;
  kind: string;
  title: string;
  summary: string;
  language: string;
  difficulty: string | null;
  audience: string;
  purposes: string[];
  roleCodes: string[];
  tags: string[];
  sources: KnowledgeSource[];
  body: Record<string, unknown>;
  status: string;
  version: number;
  schemaVersion: number | null;
}

export interface KnowledgeListItem {
  id: string;
  code: string;
  version: number;
  status: string;
  updatedAt: string | null;
  sha256: string | null;
  title: string;
  summary: string;
  kind: string;
  language: string;
  difficulty: string | null;
  audience: string;
  purposes: string[];
  roleCodes: string[];
  tags: string[];
}

export interface KnowledgeDetail {
  id: string;
  code: string;
  version: number;
  status: string;
  snapshot: KnowledgeSnapshot | null;
  sha256: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface KnowledgeRevision {
  version: number;
  sha256: string | null;
  createdBy: string | null;
  createdAt: string | null;
  snapshot: KnowledgeSnapshot | null;
}

export interface PublicationCheck {
  code: string;
  currentVersion: number;
  status: string;
  publishable: boolean;
  issues: string[];
}

/** Body draft gửi lên POST/PUT — sources động, body là object tự do. */
export interface KnowledgeDraftInput {
  kind: string;
  title: string;
  summary: string;
  language: string;
  difficulty: string;
  audience: string;
  purposes: string[];
  roleCodes: string[];
  tags: string[];
  sources: { title: string; url?: string; reference?: string }[];
  body: Record<string, unknown>;
}

export interface CreateKnowledgeInput {
  code: string;
  draft: KnowledgeDraftInput;
}

export interface KnowledgePage {
  items: KnowledgeListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface KnowledgeListFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  kind?: string;
  audience?: string;
  purpose?: string;
  roleCode?: string;
}

/* ------------------------------ parsers -------------------------------- */

function parseSource(value: unknown): KnowledgeSource {
  const v = record(value);
  return {
    title: nullable(v.title, string) ?? "",
    url: nullable(v.url, string),
    reference: nullable(v.reference, string),
  };
}

function parseSnapshot(value: unknown): KnowledgeSnapshot {
  const v = record(value);
  return {
    code: nullable(v.code, string) ?? "",
    kind: nullable(v.kind, string) ?? "",
    title: nullable(v.title, string) ?? "",
    summary: nullable(v.summary, string) ?? "",
    language: nullable(v.language, string) ?? "vi",
    difficulty: nullable(v.difficulty, string),
    audience: nullable(v.audience, string) ?? "student_safe",
    purposes: array(v.purposes ?? [], (x) => string(x)),
    roleCodes: array(v.roleCodes ?? [], (x) => string(x)),
    tags: array(v.tags ?? [], (x) => string(x)),
    sources: array(v.sources ?? [], parseSource),
    body: v.body === undefined || v.body === null ? {} : record(v.body),
    status: nullable(v.status, string) ?? "draft",
    version: nullable(v.version, number) ?? 1,
    schemaVersion: nullable(v.schemaVersion, number),
  };
}

function parseListItem(value: unknown): KnowledgeListItem {
  const v = record(value);
  return {
    id: nullable(v.id, string) ?? v.code as string,
    code: string(v.code),
    version: nullable(v.version, number) ?? 1,
    status: nullable(v.status, string) ?? "draft",
    updatedAt: nullable(v.updatedAt, string),
    sha256: nullable(v.sha256, string),
    title: nullable(v.title, string) ?? "",
    summary: nullable(v.summary, string) ?? "",
    kind: nullable(v.kind, string) ?? "",
    language: nullable(v.language, string) ?? "vi",
    difficulty: nullable(v.difficulty, string),
    audience: nullable(v.audience, string) ?? "",
    purposes: array(v.purposes ?? [], (x) => string(x)),
    roleCodes: array(v.roleCodes ?? [], (x) => string(x)),
    tags: array(v.tags ?? [], (x) => string(x)),
  };
}

/** Parser lỏng — dùng cho cả GET lẫn response mutation (BE có thể trả bản rút gọn). */
function parseKnowledgeDetail(value: unknown): KnowledgeDetail {
  const v = record(value);
  const snapshot =
    v.snapshot === undefined || v.snapshot === null ? null : parseSnapshot(v.snapshot);
  return {
    id: nullable(v.id, string) ?? "",
    code: nullable(v.code, string) ?? snapshot?.code ?? "",
    version: nullable(v.version, number) ?? snapshot?.version ?? 1,
    status: nullable(v.status, string) ?? snapshot?.status ?? "draft",
    snapshot,
    sha256: nullable(v.sha256, string),
    createdAt: nullable(v.createdAt, string),
    updatedAt: nullable(v.updatedAt, string),
  };
}

function parseRevision(value: unknown): KnowledgeRevision {
  const v = record(value);
  return {
    version: nullable(v.version, number) ?? 0,
    sha256: nullable(v.sha256, string),
    createdBy: nullable(v.createdBy, string),
    createdAt: nullable(v.createdAt, string),
    snapshot:
      v.snapshot === undefined || v.snapshot === null ? null : parseSnapshot(v.snapshot),
  };
}

function parsePublicationCheck(value: unknown): PublicationCheck {
  const v = record(value);
  return {
    code: nullable(v.code, string) ?? "",
    currentVersion: nullable(v.currentVersion, number) ?? 0,
    status: nullable(v.status, string) ?? "",
    publishable: v.publishable === true,
    issues: array(v.issues ?? [], (x) => string(x)),
  };
}

/* ------------------------------ knowledge ------------------------------ */

export async function listKnowledge(
  filters: KnowledgeListFilters = {},
): Promise<KnowledgePage> {
  const params = new URLSearchParams();
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 10));
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.kind) params.set("kind", filters.kind);
  if (filters.audience) params.set("audience", filters.audience);
  if (filters.purpose) params.set("purpose", filters.purpose);
  if (filters.roleCode) params.set("roleCode", filters.roleCode);
  return request(`/admin/knowledge?${params.toString()}`, (value) => {
    const v = record(value);
    return {
      items: array(v.items ?? [], parseListItem),
      total: nullable(v.total, number) ?? 0,
      page: nullable(v.page, number) ?? 1,
      pageSize: nullable(v.pageSize, number) ?? 10,
    };
  });
}

export async function getKnowledge(code: string): Promise<KnowledgeDetail> {
  return request(
    `/admin/knowledge/${encodeURIComponent(code)}`,
    parseKnowledgeDetail,
  );
}

export async function createKnowledge(
  input: CreateKnowledgeInput,
): Promise<KnowledgeDetail | null> {
  return request("/admin/knowledge", (value) =>
    value === null ? null : parseKnowledgeDetail(value), {
    method: "POST",
    body: input,
  });
}

export async function updateKnowledge(
  code: string,
  input: { version: number; draft: KnowledgeDraftInput },
): Promise<KnowledgeDetail | null> {
  return request(
    `/admin/knowledge/${encodeURIComponent(code)}`,
    (value) => (value === null ? null : parseKnowledgeDetail(value)),
    { method: "PUT", body: input },
  );
}

export async function listKnowledgeRevisions(
  code: string,
  page = 1,
  pageSize = 25,
): Promise<{ items: KnowledgeRevision[]; total: number }> {
  return request(
    `/admin/knowledge/${encodeURIComponent(code)}/revisions?page=${page}&pageSize=${pageSize}`,
    (value) => {
      const v = record(value);
      return {
        items: array(v.items ?? [], parseRevision),
        total: nullable(v.total, number) ?? 0,
      };
    },
  );
}

export async function checkKnowledgePublication(
  code: string,
): Promise<PublicationCheck> {
  return request(
    `/admin/knowledge/${encodeURIComponent(code)}/publication-check`,
    parsePublicationCheck,
  );
}

export async function publishKnowledge(
  code: string,
  version: number,
): Promise<Record<string, unknown> | null> {
  return request(
    `/admin/knowledge/${encodeURIComponent(code)}/publish`,
    (value) => (value === null ? null : record(value)),
    { method: "POST", body: { version } },
  );
}

export async function archiveKnowledge(
  code: string,
  version: number,
): Promise<Record<string, unknown> | null> {
  return request(
    `/admin/knowledge/${encodeURIComponent(code)}/archive`,
    (value) => (value === null ? null : record(value)),
    { method: "POST", body: { version } },
  );
}

export async function restoreKnowledge(
  code: string,
  input: { version: number; sourceVersion: number },
): Promise<Record<string, unknown> | null> {
  return request(
    `/admin/knowledge/${encodeURIComponent(code)}/restore`,
    (value) => (value === null ? null : record(value)),
    { method: "POST", body: input },
  );
}

/** Dry-run import: dán JSON mảng entries (1-50) — BE trả preview, không ghi. */
export async function dryRunKnowledgeImport(
  entries: Record<string, unknown>[],
): Promise<Record<string, unknown>> {
  return request("/admin/knowledge/import/dry-run", record, {
    method: "POST",
    body: { entries },
  });
}

/* --------------------------- agents: knowledge runs --------------------- */

export interface KnowledgeRun {
  id: string;
  status: string | null;
  raw: Record<string, unknown>;
}

function parseKnowledgeRun(value: unknown): KnowledgeRun {
  const v = record(value);
  return {
    id: nullable(v.id, string) ?? nullable(v.requestId, string) ?? "",
    status: nullable(v.status, string),
    raw: v,
  };
}

export async function createKnowledgeRun(input: {
  requestId: string;
  question: string;
  roleCode?: string;
}): Promise<KnowledgeRun | null> {
  return request(
    "/admin/agents/knowledge-runs",
    (value) => (value === null ? null : parseKnowledgeRun(value)),
    { method: "POST", body: input },
  );
}

export async function getKnowledgeRun(id: string): Promise<KnowledgeRun> {
  return request(
    `/admin/agents/knowledge-runs/${encodeURIComponent(id)}`,
    parseKnowledgeRun,
  );
}

export async function cancelKnowledgeRun(
  id: string,
): Promise<Record<string, unknown> | null> {
  return request(
    `/admin/agents/knowledge-runs/${encodeURIComponent(id)}/cancel`,
    (value) => (value === null ? null : record(value)),
    { method: "POST", body: {} },
  );
}

export async function resumeKnowledgeRun(
  id: string,
): Promise<Record<string, unknown> | null> {
  return request(
    `/admin/agents/knowledge-runs/${encodeURIComponent(id)}/resume`,
    (value) => (value === null ? null : record(value)),
    { method: "POST", body: {} },
  );
}

/* --------------------------- agents: business runs ---------------------- */

export interface AgentDefinition {
  id: string;
  version: string | null;
  promptVersion: string | null;
  features: string[];
  tools: string[];
  budget: {
    maxSteps: number | null;
    maxTokens: number | null;
    maxToolCalls: number | null;
    maxDurationMs: number | null;
  };
}

export interface BusinessRun {
  id: string;
  agentId: string;
  agentVersion: string | null;
  promptVersion: string | null;
  policyVersion: string | null;
  status: string;
  stepCount: number;
  attempts: number;
  inputTokens: number | null;
  outputTokens: number | null;
  errorCode: string | null;
  retryable: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
  model: string | null;
  toolCalls: number;
}

export interface BusinessRunsPage {
  definitions: AgentDefinition[];
  items: BusinessRun[];
  total: number;
  page: number;
  pageSize: number;
}

function parseAgentDefinition(value: unknown): AgentDefinition {
  const v = record(value);
  const budget = v.budget === undefined || v.budget === null ? {} : record(v.budget);
  return {
    id: string(v.id),
    version: nullable(v.version, string),
    promptVersion: nullable(v.promptVersion, string),
    features: array(v.features ?? [], (x) => string(x)),
    tools: array(v.tools ?? [], (x) => string(x)),
    budget: {
      maxSteps: nullable(budget.maxSteps, number),
      maxTokens: nullable(budget.maxTokens, number),
      maxToolCalls: nullable(budget.maxToolCalls, number),
      maxDurationMs: nullable(budget.maxDurationMs, number),
    },
  };
}

function parseBusinessRun(value: unknown): BusinessRun {
  const v = record(value);
  return {
    id: string(v.id),
    agentId: nullable(v.agentId, string) ?? "",
    agentVersion: nullable(v.agentVersion, string),
    promptVersion: nullable(v.promptVersion, string),
    policyVersion: nullable(v.policyVersion, string),
    status: nullable(v.status, string) ?? "",
    stepCount: nullable(v.stepCount, number) ?? 0,
    attempts: nullable(v.attempts, number) ?? 0,
    inputTokens: nullable(v.inputTokens, number),
    outputTokens: nullable(v.outputTokens, number),
    errorCode: nullable(v.errorCode, string),
    retryable: nullable(v.retryable, boolean),
    createdAt: nullable(v.createdAt, string),
    updatedAt: nullable(v.updatedAt, string),
    model: nullable(v.model, string),
    toolCalls: nullable(v.toolCalls, number) ?? 0,
  };
}

export interface BusinessRunsFilters {
  page?: number;
  pageSize?: number;
  agentId?: string;
  status?: string;
}

export async function listBusinessRuns(
  filters: BusinessRunsFilters = {},
): Promise<BusinessRunsPage> {
  const params = new URLSearchParams();
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 10));
  if (filters.agentId) params.set("agentId", filters.agentId);
  if (filters.status) params.set("status", filters.status);
  return request(`/admin/agents/business-runs?${params.toString()}`, (value) => {
    const v = record(value);
    return {
      definitions: array(v.definitions ?? [], parseAgentDefinition),
      items: array(v.items ?? [], parseBusinessRun),
      total: nullable(v.total, number) ?? 0,
      page: nullable(v.page, number) ?? 1,
      pageSize: nullable(v.pageSize, number) ?? 10,
    };
  });
}
