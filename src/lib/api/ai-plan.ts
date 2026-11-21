"use client";
/* =====================================================================
 * AI PLAN ADAPTER — trợ lý lập kế hoạch sprint bằng AI (ai-generations 5 ops).
 * Contract BE thật:
 *   · POST /ai-generations/sprint-plan/draft   → nháp KHÔNG lưu (body
 *     {projectId*, sessionId*, sprintCount?, startDate?})
 *   · POST /ai-generations/sprint-plan/confirm → chốt nháp đã duyệt
 *     (body {projectId*, sessionId*, draft*, requestId* UUID, planId?})
 *   · POST /ai-generations/plans/generate      → sinh + lưu plan
 *     (body {projectId*, sessionId*, regenerate?, sprintCount?, startDate?, requestId?})
 *   · GET  /ai-generations/plans?sessionId=    → mảng phẳng
 *   · GET  /ai-generations/plans/{id}          → object phẳng { draft, warnings }
 * Lưu ý: BE throttle AI 5-15 lượt/phút — màn hình phải disable nút khi busy.
 * ===================================================================== */
import { request } from "./client";
import { array, nullable, number, record, string } from "./parse";

/* ------------------------------- shapes --------------------------------- */

export interface DraftTask {
  key: string | null;
  title: string;
  description: string | null;
  priority: string | null;
  storyPoints: number | null;
  dueDate: string | null;
  suggestedRole: string | null;
  assigneeId: string | null;
  complexity: string | null;
  estimatedHours: number | null;
  acceptanceCriteria: string[];
  dependsOn: string[];
  skillTags: string[];
}

export interface DraftSprint {
  code: string | null;
  name: string;
  goal: string | null;
  startDate: string | null;
  endDate: string | null;
  tasks: DraftTask[];
}

export interface DraftMilestone {
  title: string | null;
  dueDate: string | null;
  description: string | null;
}

/** Nháp kế hoạch sprint do AI sinh (draft persist nothing). */
export interface SprintPlanDraft {
  sprints: DraftSprint[];
  milestones: DraftMilestone[];
  warnings: { taskTitle: string | null; message: string }[];
  raw: Record<string, unknown>;
}

export interface AiPlanSummary {
  planId: string;
  projectId: string;
  sessionId: string;
  templateVersion: number | null;
  status: string;
  createdAt: string | null;
  sprintCount: number | null;
  taskCount: number | null;
  hasDraft: boolean;
}

export interface AiPlanDetail extends AiPlanSummary {
  draft: SprintPlanDraft | null;
  warnings: { taskTitle: string | null; message: string }[];
  error: string | null;
  deduped: boolean;
}

/* ------------------------------ parsers --------------------------------- */

function strList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : [];
}

function parseDraftTask(value: unknown): DraftTask {
  const v = record(value);
  return {
    key: nullable(v.key, string),
    title: nullable(v.title, string) ?? "",
    description: nullable(v.description, string),
    priority: nullable(v.priority, string),
    storyPoints: nullable(v.storyPoints, number),
    dueDate: nullable(v.dueDate, string),
    suggestedRole: nullable(v.suggestedRole, string),
    assigneeId: nullable(v.assigneeId, string),
    complexity: nullable(v.complexity, string),
    estimatedHours: nullable(v.estimatedHours, number),
    acceptanceCriteria: strList(v.acceptanceCriteria),
    dependsOn: strList(v.dependsOn),
    skillTags: strList(v.skillTags),
  };
}

function parseDraftSprint(value: unknown): DraftSprint {
  const v = record(value);
  return {
    code: nullable(v.code, string),
    name: nullable(v.name, string) ?? "",
    goal: nullable(v.goal, string),
    startDate: nullable(v.startDate, string),
    endDate: nullable(v.endDate, string),
    tasks: array(v.tasks ?? [], parseDraftTask),
  };
}

function parseWarning(value: unknown): { taskTitle: string | null; message: string } {
  const v = record(value);
  return { taskTitle: nullable(v.taskTitle, string), message: nullable(v.message, string) ?? "" };
}

/** Chuẩn hóa response draft: BE có thể trả {draft:{...}} hoặc bản thân draft. */
function parseSprintPlanDraft(value: unknown): SprintPlanDraft {
  const outer = record(value);
  const bodyRaw = outer.draft !== undefined ? outer.draft : outer;
  const v = record(bodyRaw);
  return {
    sprints: array(v.sprints ?? [], parseDraftSprint),
    milestones: array(v.milestones ?? [], (raw) => {
      const m = record(raw);
      return {
        title: nullable(m.title, string),
        dueDate: nullable(m.dueDate, string),
        description: nullable(m.description, string),
      };
    }),
    warnings: array(outer.warnings ?? [], parseWarning),
    raw: outer,
  };
}

function parsePlanSummary(value: unknown): AiPlanSummary {
  const v = record(value);
  return {
    planId: string(v.planId ?? v.id),
    projectId: nullable(v.projectId, string) ?? "",
    sessionId: nullable(v.sessionId, string) ?? "",
    templateVersion: nullable(v.templateVersion, number),
    status: nullable(v.status, string) ?? "",
    createdAt: nullable(v.createdAt, string),
    sprintCount: nullable(v.sprintCount, number),
    taskCount: nullable(v.taskCount, number),
    hasDraft: v.hasDraft === true,
  };
}

function parsePlanDetail(value: unknown): AiPlanDetail {
  const v = record(value);
  return {
    ...parsePlanSummary(v),
    draft: v.draft === null || v.draft === undefined ? null : parseSprintPlanDraft(v.draft),
    warnings: array(v.warnings ?? [], parseWarning),
    error: nullable(v.error, string),
    deduped: v.deduped === true,
  };
}

/* ------------------------------ endpoints ------------------------------- */

export interface DraftSprintPlanInput {
  projectId: string;
  sessionId: string;
  sprintCount?: number;
  startDate?: string;
}

/** Sinh NHÁP kế hoạch sprint bằng AI — không lưu, có thể lâu (timeoutMs 120s). */
export async function draftSprintPlan(input: DraftSprintPlanInput): Promise<SprintPlanDraft> {
  return request("/ai-generations/sprint-plan/draft", parseSprintPlanDraft, {
    method: "POST",
    body: input,
  });
}

export interface ConfirmSprintPlanInput {
  projectId: string;
  sessionId: string;
  draft: Record<string, unknown>;
  requestId: string;
  planId?: string;
}

/** Chốt nháp thành kế hoạch thật — BE re-validate, idempotent theo requestId. */
export async function confirmSprintPlan(input: ConfirmSprintPlanInput): Promise<Record<string, unknown>> {
  return request("/ai-generations/sprint-plan/confirm", (v) => record(v), {
    method: "POST",
    body: input,
  });
}

export interface GeneratePlanInput {
  projectId: string;
  sessionId: string;
  regenerate?: boolean;
  sprintCount?: number;
  startDate?: string;
  requestId?: string;
}

/** Sinh + LƯU plan AI (idempotent theo session+version / requestId). */
export async function generatePlan(input: GeneratePlanInput): Promise<AiPlanDetail> {
  return request("/ai-generations/plans/generate", parsePlanDetail, {
    method: "POST",
    body: input,
  });
}

export async function listAiPlans(sessionId: string): Promise<AiPlanSummary[]> {
  return request(
    `/ai-generations/plans?sessionId=${encodeURIComponent(sessionId)}`,
    (v) => array(v, parsePlanSummary),
  );
}

export async function getAiPlan(planId: string): Promise<AiPlanDetail> {
  return request(`/ai-generations/plans/${encodeURIComponent(planId)}`, parsePlanDetail);
}

/**RequestId idempotency cho confirm — UUID v4 phía client. */
export function newRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}-${Math.random()
    .toString(16)
    .slice(2, 10)}-${Math.random().toString(16).slice(2, 10)}`;
}
