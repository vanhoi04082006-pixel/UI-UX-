"use client";
/* =====================================================================
 * INSTRUCTOR EVAL ADAPTER — chu kỳ đánh giá + phiếu đánh giá + AI assist
 * + code review + review nhập ngoài. Contract BE thật:
 *   · GET /evaluation-cycles, /evaluations, /imported-reviews → { items, total }
 *   · GET /evaluation-cycles/{id}/criteria                → { items }
 *   · GET /evaluations/{id}                               → { evaluation, scores }
 *   · GET /evaluations/{id}/ai-suggestions                → { items }
 *   · GET /tasks/{id}/submissions, /submissions/{id}/code-reviews → mảng phẳng
 * ===================================================================== */
import { request } from "./client";
import { array, nullable, number, record, string } from "./parse";

/* ------------------------------- cycles --------------------------------- */

export interface EvaluationCycle {
  id: string;
  code: string;
  name: string;
  sessionId: string | null;
  projectId: string | null;
  type: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  dueDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface EvaluationCriterion {
  id: string;
  cycleId: string;
  code: string;
  name: string;
  description: string | null;
  weight: number;
  maxScore: number;
  sortOrder: number;
  isRequired: boolean;
}

export async function listEvaluationCycles(
  page = 1,
  pageSize = 50,
): Promise<{ items: EvaluationCycle[]; total: number }> {
  return request(`/evaluation-cycles?page=${page}&pageSize=${pageSize}`, (v) => {
    const r = record(v);
    return { items: array(r.items, parseCycle), total: nullable(r.total, number) ?? 0 };
  });
}

export async function getEvaluationCycle(id: string): Promise<EvaluationCycle> {
  return request(`/evaluation-cycles/${encodeURIComponent(id)}`, parseCycle);
}

export async function listCycleCriteria(cycleId: string): Promise<EvaluationCriterion[]> {
  return request(`/evaluation-cycles/${encodeURIComponent(cycleId)}/criteria`, (v) => {
    const r = record(v);
    return array(r.items, parseCriterion);
  });
}

function parseCycle(value: unknown): EvaluationCycle {
  const v = record(value);
  return {
    id: string(v.id),
    code: string(v.code),
    name: string(v.name),
    sessionId: nullable(v.sessionId, string),
    projectId: nullable(v.projectId, string),
    type: nullable(v.type, string) ?? "",
    status: nullable(v.status, string) ?? "",
    startDate: nullable(v.startDate, string),
    endDate: nullable(v.endDate, string),
    dueDate: nullable(v.dueDate, string),
    createdAt: nullable(v.createdAt, string),
    updatedAt: nullable(v.updatedAt, string),
  };
}

function parseCriterion(value: unknown): EvaluationCriterion {
  const v = record(value);
  return {
    id: string(v.id),
    cycleId: nullable(v.cycleId, string) ?? "",
    code: nullable(v.code, string) ?? "",
    name: string(v.name),
    description: nullable(v.description, string),
    weight: nullable(v.weight, number) ?? 0,
    maxScore: nullable(v.maxScore, number) ?? 100,
    sortOrder: nullable(v.sortOrder, number) ?? 0,
    isRequired: v.isRequired === true,
  };
}

/* ----------------------------- evaluations ------------------------------ */

export type EvaluationStatus = "draft" | "submitted" | "finalized";

export interface EvaluationRow {
  id: string;
  cycleId: string;
  internId: string;
  evaluatorId: string | null;
  projectId: string | null;
  sessionId: string | null;
  status: string;
  overallScore: number | null;
  summary: string | null;
  submittedAt: string | null;
  finalizedAt: string | null;
  revisionNumber: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface EvaluationScoreRow {
  id: string;
  evaluationId: string;
  criterionId: string;
  score: number;
  comment: string | null;
}

export interface EvaluationDetail {
  evaluation: EvaluationRow;
  scores: EvaluationScoreRow[];
}

function parseEvaluationRow(value: unknown): EvaluationRow {
  const v = record(value);
  return {
    id: string(v.id),
    cycleId: nullable(v.cycleId, string) ?? "",
    internId: nullable(v.internId, string) ?? "",
    evaluatorId: nullable(v.evaluatorId, string),
    projectId: nullable(v.projectId, string),
    sessionId: nullable(v.sessionId, string),
    status: nullable(v.status, string) ?? "draft",
    overallScore: nullable(v.overallScore, number),
    summary: nullable(v.summary, string),
    submittedAt: nullable(v.submittedAt, string),
    finalizedAt: nullable(v.finalizedAt, string),
    revisionNumber: nullable(v.revisionNumber, number),
    createdAt: nullable(v.createdAt, string),
    updatedAt: nullable(v.updatedAt, string),
  };
}

function parseEvaluationDetail(value: unknown): EvaluationDetail {
  const v = record(value);
  return {
    evaluation: parseEvaluationRow(v.evaluation),
    scores: array(v.scores ?? [], (raw) => {
      const s = record(raw);
      return {
        id: nullable(s.id, string) ?? "",
        evaluationId: nullable(s.evaluationId, string) ?? "",
        criterionId: string(s.criterionId),
        score: nullable(s.score, number) ?? 0,
        comment: nullable(s.comment, string),
      };
    }),
  };
}

export interface ListEvaluationsParams {
  cycleId?: string;
  internId?: string;
  evaluatorId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export async function listEvaluations(
  params: ListEvaluationsParams = {},
): Promise<{ items: EvaluationRow[]; total: number }> {
  const search = new URLSearchParams();
  search.set("page", String(params.page ?? 1));
  search.set("pageSize", String(params.pageSize ?? 50));
  if (params.cycleId) search.set("cycleId", params.cycleId);
  if (params.internId) search.set("internId", params.internId);
  if (params.evaluatorId) search.set("evaluatorId", params.evaluatorId);
  if (params.status) search.set("status", params.status);
  return request(`/evaluations?${search.toString()}`, (v) => {
    const r = record(v);
    return { items: array(r.items, parseEvaluationRow), total: nullable(r.total, number) ?? 0 };
  });
}

export async function createEvaluation(input: {
  cycleId: string;
  internId: string;
  evaluatorId?: string;
}): Promise<EvaluationDetail> {
  return request("/evaluations", parseEvaluationDetail, { method: "POST", body: input });
}

export async function getEvaluation(id: string): Promise<EvaluationDetail> {
  return request(`/evaluations/${encodeURIComponent(id)}`, parseEvaluationDetail);
}

export interface ScoreInput {
  criterionId: string;
  score: number;
  comment?: string;
}

/** Lưu điểm từng tiêu chí — BE luôn tự tính lại overallScore. */
export async function updateEvaluationScores(
  id: string,
  scores: ScoreInput[],
  summary?: string,
): Promise<EvaluationDetail> {
  const body: Record<string, unknown> = { scores };
  if (summary !== undefined) body.summary = summary;
  return request(`/evaluations/${encodeURIComponent(id)}`, parseEvaluationDetail, {
    method: "PATCH",
    body,
  });
}

export async function submitEvaluation(id: string): Promise<Record<string, unknown>> {
  return request(`/evaluations/${encodeURIComponent(id)}/submit`, (v) => record(v), {
    method: "POST",
    body: {},
  });
}

export async function finalizeEvaluation(id: string): Promise<Record<string, unknown>> {
  return request(`/evaluations/${encodeURIComponent(id)}/finalize`, (v) => record(v), {
    method: "POST",
    body: {},
  });
}

/** Yêu cầu làm lại phiếu đã chốt (chính sách admin — vẫn finalized, revisionNumber++). */
export async function reviseEvaluation(
  id: string,
  input: { scores?: ScoreInput[]; summary?: string; reason: string },
): Promise<Record<string, unknown>> {
  return request(`/evaluations/${encodeURIComponent(id)}/revisions`, (v) => record(v), {
    method: "POST",
    body: input,
  });
}

/* --------------------------- AI assistance ------------------------------ */

export interface AiCriterionSuggestion {
  criterionCode: string;
  suggestedScore: number;
  evidence: string[];
  comment: string | null;
}

export interface AiSuggestion {
  id: string;
  evaluationId: string;
  promptVersion: string | null;
  status: string;
  criterionSuggestions: AiCriterionSuggestion[];
  strengths: string[];
  improvementAreas: string[];
  summary: string | null;
  confidence: number | null;
  generatedAt: string | null;
  acceptedAt: string | null;
}

function parseSuggestion(value: unknown): AiSuggestion {
  const v = record(value);
  const suggestion = v.suggestion === null || v.suggestion === undefined ? {} : record(v.suggestion);
  const strList = (x: unknown): string[] =>
    Array.isArray(x) ? x.filter((i): i is string => typeof i === "string") : [];
  return {
    id: string(v.id),
    evaluationId: nullable(v.evaluationId, string) ?? "",
    promptVersion: nullable(v.promptVersion, string),
    status: nullable(v.status, string) ?? "",
    criterionSuggestions: array(suggestion.criterionSuggestions ?? [], (raw) => {
      const c = record(raw);
      return {
        criterionCode: nullable(c.criterionCode, string) ?? "",
        suggestedScore: nullable(c.suggestedScore, number) ?? 0,
        evidence: strList(c.evidence),
        comment: nullable(c.comment, string),
      };
    }),
    strengths: strList(suggestion.strengths),
    improvementAreas: strList(suggestion.improvementAreas),
    summary: nullable(suggestion.summary, string),
    confidence: nullable(suggestion.confidence, number),
    generatedAt: nullable(v.generatedAt, string),
    acceptedAt: nullable(v.acceptedAt, string),
  };
}

export async function listEvaluationAiSuggestions(
  id: string,
): Promise<{ items: AiSuggestion[]; total: number }> {
  return request(`/evaluations/${encodeURIComponent(id)}/ai-suggestions`, (v) => {
    const r = record(v);
    return { items: array(r.items, parseSuggestion), total: nullable(r.total, number) ?? 0 };
  });
}

/** Xin gợi ý chấm từ AI — DRAFT ONLY, tốn quota (throttle 5-15/phút). */
export async function generateEvaluationAiSuggestion(id: string): Promise<AiSuggestion> {
  return request(`/evaluations/${encodeURIComponent(id)}/ai-suggestions`, parseSuggestion, {
    method: "POST",
    body: {},
  });
}

export async function getEvaluationAiSuggestion(
  id: string,
  suggestionId: string,
): Promise<AiSuggestion> {
  return request(
    `/evaluations/${encodeURIComponent(id)}/ai-suggestions/${encodeURIComponent(suggestionId)}`,
    parseSuggestion,
  );
}

/* ---------------------------- code review ------------------------------- */

export interface TaskSubmission {
  id: string;
  taskId: string;
  internId: string | null;
  prUrl: string | null;
  summary: string | null;
  status: string;
  score: number | null;
  rubricVersion: string | null;
  feedback: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  headSha: string | null;
}

export interface CodeReview {
  id: string;
  submissionId: string;
  status: string;
  errorCode: string | null;
  rubricVersion: string | null;
  promptVersion: string | null;
  model: string | null;
  provider: string | null;
  createdAt: string | null;
  completedAt: string | null;
  summary: string | null;
  score: number | null;
  rubric: Record<string, number>;
  findings: Record<string, unknown>[];
  limitations: string[];
  raw: Record<string, unknown>;
}

function parseSubmission(value: unknown): TaskSubmission {
  const v = record(value);
  return {
    id: string(v.id),
    taskId: nullable(v.taskId, string) ?? "",
    internId: nullable(v.internId, string),
    prUrl: nullable(v.prUrl, string),
    summary: nullable(v.summary, string),
    status: nullable(v.status, string) ?? "",
    score: nullable(v.score, number),
    rubricVersion: nullable(v.rubricVersion, string),
    feedback: nullable(v.feedback, string),
    submittedAt: nullable(v.submittedAt, string),
    reviewedAt: nullable(v.reviewedAt, string),
    headSha: nullable(v.headSha, string),
  };
}

function parseCodeReview(value: unknown): CodeReview {
  const v = record(value);
  const result = v.result === null || v.result === undefined ? {} : record(v.result);
  const rubric: Record<string, number> = {};
  if (result.rubric !== null && result.rubric !== undefined && typeof result.rubric === "object") {
    for (const [key, val] of Object.entries(record(result.rubric))) {
      if (typeof val === "number" && Number.isFinite(val)) rubric[key] = val;
    }
  }
  const findingsRaw = result.findings;
  return {
    id: string(v.id),
    submissionId: nullable(v.submissionId, string) ?? "",
    status: nullable(v.status, string) ?? "",
    errorCode: nullable(v.errorCode, string),
    rubricVersion: nullable(v.rubricVersion, string),
    promptVersion: nullable(v.promptVersion, string),
    model: nullable(v.model, string),
    provider: nullable(v.provider, string),
    createdAt: nullable(v.createdAt, string),
    completedAt: nullable(v.completedAt, string),
    summary: nullable(result.summary, string),
    score: nullable(result.score, number),
    rubric,
    findings: Array.isArray(findingsRaw)
      ? findingsRaw.map((f) => (typeof f === "object" && f !== null ? record(f) : {}))
      : [],
    limitations: Array.isArray(result.limitations)
      ? result.limitations.filter((x): x is string => typeof x === "string")
      : [],
    raw: v,
  };
}

export async function listTaskSubmissions(taskId: string): Promise<TaskSubmission[]> {
  return request(`/tasks/${encodeURIComponent(taskId)}/submissions`, (v) => array(v, parseSubmission));
}

export async function listCodeReviews(submissionId: string): Promise<CodeReview[]> {
  return request(`/submissions/${encodeURIComponent(submissionId)}/code-reviews`, (v) =>
    array(v, parseCodeReview),
  );
}

/** Kích hoạt review tự động cho một bài nộp (AI, tốn quota). */
export async function runCodeReview(submissionId: string): Promise<CodeReview> {
  return request(`/submissions/${encodeURIComponent(submissionId)}/code-reviews`, parseCodeReview, {
    method: "POST",
    body: {},
  });
}

/* --------------------------- imported reviews --------------------------- */

/** Review nhập từ ngoài — shape BE chưa công bố, giữ best-effort + raw. */
export interface ImportedReview {
  id: string;
  raw: Record<string, unknown>;
}

export async function listImportedReviews(): Promise<{ items: ImportedReview[]; total: number }> {
  return request("/imported-reviews", (v) => {
    const r = record(v);
    return {
      items: array(r.items, (raw) => ({ id: nullable(record(raw).id, string) ?? "", raw: record(raw) })),
      total: nullable(r.total, number) ?? 0,
    };
  });
}

export async function updateImportedReview(
  id: string,
  input: Record<string, unknown>,
): Promise<ImportedReview> {
  return request(`/imported-reviews/${encodeURIComponent(id)}`, (raw) => {
    const v = record(raw);
    return { id: nullable(v.id, string) ?? "", raw: v };
  }, { method: "PATCH", body: input });
}
