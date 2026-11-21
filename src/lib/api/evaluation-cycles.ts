"use client";
/* =====================================================================
 * EVALUATION-CYCLES ADAPTER (admin) — chu kỳ đánh giá + tiêu chí chấm.
 * Envelope list: { items: T[], total } (live-shapes 2026-11).
 * Ops cover:
 *  GET    /evaluation-cycles (page, pageSize, status, sessionId, projectId)
 *  POST   /evaluation-cycles
 *  GET    /evaluation-cycles/{id}
 *  PATCH  /evaluation-cycles/{id}
 *  POST   /evaluation-cycles/{id}/status
 *  GET    /evaluation-cycles/{id}/criteria
 *  POST   /evaluation-cycles/{id}/criteria
 *  PATCH  /evaluation-cycles/{id}/criteria/{criterionId}
 *  DELETE /evaluation-cycles/{id}/criteria/{criterionId}
 * Trợ giúp cho dialog tạo kỳ: GET /sessions, GET /projects (envelope {data, meta}).
 * ===================================================================== */
import { request } from "./client";
import { array, nullable, number, parsePage, record, string } from "./parse";

export type CycleType = "sprint" | "midterm" | "final";
export type CycleStatus = "draft" | "open" | "closed" | "archived";

export interface EvaluationCycle {
  id: string;
  code: string;
  name: string;
  sessionId: string | null;
  projectId: string | null;
  type: CycleType;
  status: CycleStatus;
  startDate: string;
  endDate: string;
  dueDate: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationCriterion {
  id: string;
  cycleId: string;
  code: string;
  name: string;
  description: string | null;
  weight: number;
  maxScore: number | null;
  sortOrder: number | null;
  isRequired: boolean | null;
  createdAt: string;
}

/** Option phiên thực tập cho dropdown (GET /sessions — envelope {data, meta}). */
export interface SessionOption {
  id: string;
  code: string;
  name: string;
}

/** Option đồ án cho dropdown (GET /projects — envelope {data, meta}). */
export interface ProjectOption {
  id: string;
  code: string;
  name: string;
}

function parseCycle(value: unknown): EvaluationCycle {
  const v = record(value);
  return {
    id: string(v.id),
    code: string(v.code),
    name: string(v.name),
    sessionId: nullable(v.sessionId, string),
    projectId: nullable(v.projectId, string),
    type: string(v.type) as CycleType,
    status: string(v.status) as CycleStatus,
    startDate: string(v.startDate),
    endDate: string(v.endDate),
    dueDate: nullable(v.dueDate, string),
    createdById: nullable(v.createdById, string),
    createdAt: string(v.createdAt),
    updatedAt: string(v.updatedAt),
  };
}

function parseCriterion(value: unknown): EvaluationCriterion {
  const v = record(value);
  return {
    id: string(v.id),
    cycleId: string(v.cycleId),
    code: string(v.code),
    name: string(v.name),
    description: nullable(v.description, string),
    weight: number(v.weight),
    maxScore: nullable(v.maxScore, number),
    sortOrder: nullable(v.sortOrder, number),
    isRequired: nullable(v.isRequired, (x) => x === true),
    createdAt: string(v.createdAt),
  };
}

/** GET /evaluation-cycles — envelope { items, total } (không có page/pageSize trả về). */
export interface CycleListFilter {
  page?: number;
  pageSize?: number;
  status?: CycleStatus;
  sessionId?: string;
  projectId?: string;
}

export async function listEvaluationCycles(
  filter: CycleListFilter = {},
): Promise<{ items: EvaluationCycle[]; total: number }> {
  const params = new URLSearchParams();
  params.set("page", String(filter.page ?? 1));
  params.set("pageSize", String(filter.pageSize ?? 100));
  if (filter.status) params.set("status", filter.status);
  if (filter.sessionId) params.set("sessionId", filter.sessionId);
  if (filter.projectId) params.set("projectId", filter.projectId);
  return request(`/evaluation-cycles?${params.toString()}`, (value) => {
    const r = record(value);
    return { items: array(r.items, parseCycle), total: number(r.total) };
  });
}

export interface CreateCycleInput {
  code: string;
  name: string;
  type: CycleType;
  startDate: string;
  endDate: string;
  sessionId?: string;
  projectId?: string;
  dueDate?: string;
  useDefaultTemplate?: boolean;
}

/** POST /evaluation-cycles — tạo kỳ bản nháp (seed tiêu chí mặc định 35/30/20/15). */
export async function createEvaluationCycle(input: CreateCycleInput): Promise<EvaluationCycle> {
  return request("/evaluation-cycles", parseCycle, { method: "POST", body: input });
}

/** GET /evaluation-cycles/{id} — object phẳng. */
export async function getEvaluationCycle(id: string): Promise<EvaluationCycle> {
  return request(`/evaluation-cycles/${encodeURIComponent(id)}`, parseCycle);
}

export interface UpdateCycleInput {
  name?: string;
  startDate?: string;
  endDate?: string;
  dueDate?: string | null;
}

/** PATCH /evaluation-cycles/{id} — chỉ cho phép sửa kỳ DRAFT. */
export async function updateEvaluationCycle(
  id: string,
  input: UpdateCycleInput,
): Promise<EvaluationCycle> {
  return request(`/evaluation-cycles/${encodeURIComponent(id)}`, parseCycle, {
    method: "PATCH",
    body: input,
  });
}

/** POST /evaluation-cycles/{id}/status — draft→open|archived, open→closed, closed→archived. */
export async function changeCycleStatus(id: string, status: CycleStatus): Promise<unknown> {
  return request(`/evaluation-cycles/${encodeURIComponent(id)}/status`, (v) => v, {
    method: "POST",
    body: { status },
  });
}

/** GET /evaluation-cycles/{id}/criteria — envelope { items }. */
export async function listCycleCriteria(id: string): Promise<EvaluationCriterion[]> {
  return request(`/evaluation-cycles/${encodeURIComponent(id)}/criteria`, (value) => {
    const r = record(value);
    return array(r.items, parseCriterion);
  });
}

export interface CriterionInput {
  code: string;
  name: string;
  weight: number;
  description?: string;
  maxScore?: number;
  sortOrder?: number;
  isRequired?: boolean;
}

/** POST /evaluation-cycles/{id}/criteria — chỉ kỳ draft; 0 < weight <= 100. */
export async function addCycleCriterion(
  id: string,
  input: CriterionInput,
): Promise<EvaluationCriterion> {
  return request(
    `/evaluation-cycles/${encodeURIComponent(id)}/criteria`,
    parseCriterion,
    { method: "POST", body: input },
  );
}

/** PATCH /evaluation-cycles/{id}/criteria/{criterionId} — chỉ kỳ draft. */
export async function updateCycleCriterion(
  id: string,
  criterionId: string,
  input: Partial<CriterionInput>,
): Promise<EvaluationCriterion> {
  return request(
    `/evaluation-cycles/${encodeURIComponent(id)}/criteria/${encodeURIComponent(criterionId)}`,
    parseCriterion,
    { method: "PATCH", body: input },
  );
}

/** DELETE /evaluation-cycles/{id}/criteria/{criterionId} — chỉ kỳ draft. */
export async function deleteCycleCriterion(id: string, criterionId: string): Promise<unknown> {
  return request(
    `/evaluation-cycles/${encodeURIComponent(id)}/criteria/${encodeURIComponent(criterionId)}`,
    (v) => v,
    { method: "DELETE" },
  );
}

/* ------------------- trợ giúp dropdown tạo kỳ đánh giá ------------------- */

/** GET /sessions — danh sách phiên cho dropdown (chỉ lấy id/code/name). */
export async function listSessionOptions(): Promise<SessionOption[]> {
  const body = await request("/sessions?page=1&pageSize=100", (value) =>
    parsePage(value, (raw) => {
      const v = record(raw);
      return { id: string(v.id), code: string(v.code), name: string(v.name) };
    }),
  );
  return body.items;
}

/** GET /projects — danh sách đồ án cho dropdown (chỉ lấy id/code/name). */
export async function listProjectOptions(): Promise<ProjectOption[]> {
  const body = await request("/projects?page=1&pageSize=100", (value) =>
    parsePage(value, (raw) => {
      const v = record(raw);
      return { id: string(v.id), code: string(v.code), name: string(v.name) };
    }),
  );
  return body.items;
}
