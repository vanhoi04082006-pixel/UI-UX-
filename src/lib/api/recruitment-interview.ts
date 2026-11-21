"use client";
/* =====================================================================
 * RECRUITMENT ADAPTER (phỏng vấn AI cho ứng viên intern) — 16 ops BE thật:
 *  · GET    /recruitment/me                              hồ sơ tuyển dụng của tôi
 *  · PATCH  /recruitment/me/role                         {role} — đổi vai trò ứng tuyển
 *  · GET    /recruitment/me/interviews                   {items} — lịch sử phiên
 *  · POST   /recruitment/me/interviews                   tạo phiên phỏng vấn mới
 *  · GET    /recruitment/me/interviews/{id}              chi tiết một phiên
 *  · GET    /recruitment/me/interviews/{id}/questions    {session, questions}
 *  · GET    /recruitment/me/interviews/{id}/conversation {session, messages, answeredCount, currentQuestion}
 *  · POST   /recruitment/me/interviews/{id}/conversation/clarify  — xin làm rõ
 *  · POST   /recruitment/me/interviews/{id}/conversation/next     — sang câu tiếp
 *  · PUT    /recruitment/me/interviews/{id}/answers/{questionId}  {answerText}
 *  · PUT    /recruitment/me/interviews/{id}/follow-ups/{questionId} {answerText}
 *  · POST   /recruitment/me/interviews/{id}/submit       — nộp bài (idempotent)
 *  · POST   /recruitment/me/interviews/{id}/retry-evaluation — chấm lại khi evaluation_failed
 *  · GET    /recruitment/me/result                       — kết quả tổng (404 = chưa có)
 *  · GET    /recruitment/candidates (+ /{userId})        — instructor/admin (đủ bộ 16 op)
 * Kèm: GET /career-roles (public) — danh mục vai trò đang tuyển.
 * ===================================================================== */
import { request } from "./client";
import { ApiError } from "./api-client";
import { array, record } from "./parse";

/* --------------------- helpers parse defensive --------------------- */

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
    if (typeof val === "string" && val.trim() !== "" && Number.isFinite(Number(val))) {
      return Number(val);
    }
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
function isRec(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/* ------------------------------ types ------------------------------ */

export interface RecruitmentMe {
  status: string;
  selectedRole: string | null;
  selectedRoleLabel: string | null;
  attemptNumber: number | null;
  attemptsRemaining: number | null;
  nextEligibleAt: string | null;
  currentInterviewSessionId: string | null;
  recruitedAt: string | null;
  result: Record<string, unknown> | null;
  interviewSchedule: Record<string, unknown> | null;
}

export interface InterviewSession {
  id: string;
  roleCode: string | null;
  status: string;
  attemptNumber: number | null;
  startedAt: string | null;
  expiresAt: string | null;
  submittedAt: string | null;
  evaluatedAt: string | null;
  questionCount: number | null;
  serverNow: string | null;
  secondsRemaining: number | null;
}

export interface RecruitmentResultSummary {
  passed: boolean | null;
  overallScore: number | null;
  roleCode: string | null;
  raw: Record<string, unknown> | null;
}

export interface InterviewHistoryItem extends InterviewSession {
  result: RecruitmentResultSummary | null;
}

export interface InterviewQuestion {
  id: string;
  position: number | null;
  category: string | null;
  phase: string | null;
  prompt: string | null;
  answered: boolean;
  status: string | null;
}

export interface InterviewQuestionView {
  session: InterviewSession;
  questions: InterviewQuestion[];
}

export interface ConversationMessage {
  id: string;
  from: "ai" | "me";
  text: string;
  at: string | null;
  kind: string | null;
}

export interface CurrentQuestionRef {
  kind: string | null;
  id: string;
  position: number | null;
  phase: string | null;
  status: string | null;
  errorCode: string | null;
}

export interface ConversationView {
  session: InterviewSession;
  messages: ConversationMessage[];
  answeredCount: number;
  currentQuestion: CurrentQuestionRef | null;
}

export interface RecruitmentResult {
  passed: boolean | null;
  decision: string | null;
  overallScore: number | null;
  technicalScore: number | null;
  softScore: number | null;
  englishScore: number | null;
  roleCode: string | null;
  attemptNumber: number | null;
  evaluatedAt: string | null;
  raw: Record<string, unknown>;
}

export interface CareerRole {
  code: string;
  label: string;
  description: string | null;
  level: string | null;
  language: string | null;
  requiredSkills: string[];
  version: number | null;
}

export interface RecruitmentCandidate {
  userId: string;
  displayName: string | null;
  email: string | null;
  status: string | null;
  roleCode: string | null;
  overallScore: number | null;
  updatedAt: string | null;
  raw: Record<string, unknown>;
}

/* ---------------------------- parsers ---------------------------- */

function parseSession(value: unknown): InterviewSession {
  const v = record(value);
  return {
    id: optStr(v, "id") ?? "",
    roleCode: optStr(v, "roleCode", "role"),
    status: optStr(v, "status") ?? "unknown",
    attemptNumber: optNum(v, "attemptNumber", "attempt"),
    startedAt: optStr(v, "startedAt", "createdAt"),
    expiresAt: optStr(v, "expiresAt", "expiredAt"),
    submittedAt: optStr(v, "submittedAt"),
    evaluatedAt: optStr(v, "evaluatedAt"),
    questionCount: optNum(v, "questionCount", "totalQuestions"),
    serverNow: optStr(v, "serverNow"),
    secondsRemaining: optNum(v, "secondsRemaining", "secondsLeft"),
  };
}

function detectPassed(v: Record<string, unknown>): boolean | null {
  const direct = optBool(v, "passed", "isPassed");
  if (direct !== null) return direct;
  const decision = optStr(v, "decision", "status", "result", "outcome");
  if (decision) {
    const d = decision.toLowerCase();
    if (["pass", "passed", "recruited", "admitted", "达标", "dat"].includes(d)) return true;
    if (["fail", "failed", "rejected", "not_passed"].includes(d)) return false;
  }
  if (v.passedAt || v.recruitedAt) return true;
  return null;
}

function parseResultSummary(value: unknown): RecruitmentResultSummary {
  if (!isRec(value)) return { passed: null, overallScore: null, roleCode: null, raw: null };
  return {
    passed: detectPassed(value),
    overallScore: optNum(value, "overallScore", "overall", "score", "finalScore"),
    roleCode: optStr(value, "roleCode", "role"),
    raw: value,
  };
}

function parseHistoryItem(value: unknown): InterviewHistoryItem {
  const v = record(value);
  return {
    ...parseSession(value),
    result: v.result === null || v.result === undefined ? null : parseResultSummary(v.result),
  };
}

function parseQuestion(value: unknown): InterviewQuestion {
  const v = record(value);
  return {
    id: optStr(v, "id", "questionId") ?? "",
    position: optNum(v, "position", "order", "index"),
    category: optStr(v, "category", "type"),
    phase: optStr(v, "phase", "category"),
    prompt: optStr(v, "prompt", "question", "text", "content"),
    answered: optBool(v, "answered", "hasAnswer", "isAnswered") ?? false,
    status: optStr(v, "status", "state"),
  };
}

/** Thông điệp hội thoại — BE chưa trả mẫu (AI provider), parse cực defensive. */
const AI_ROLES = new Set(["interviewer", "ai", "assistant", "bot", "system", "model", "question", "main"]);
const ME_ROLES = new Set(["candidate", "user", "me", "intern", "answer", "student", "applicant"]);

function parseMessage(value: unknown, index: number): ConversationMessage {
  if (!isRec(value)) return { id: `msg-${index}`, from: "ai", text: String(value), at: null, kind: null };
  const v = value;
  const roleRaw = optStr(v, "role", "from", "sender", "author", "type", "kind") ?? "";
  const roleLower = roleRaw.toLowerCase();
  const from: "ai" | "me" = ME_ROLES.has(roleLower)
    ? "me"
    : AI_ROLES.has(roleLower)
      ? "ai"
      : /* mặc định: người hỏi là AI, người trả lời là ứng viên */ "ai";
  return {
    id: optStr(v, "id", "messageId") ?? `msg-${index}`,
    from,
    text: optStr(v, "text", "content", "message", "prompt", "body", "answerText") ?? "",
    at: optStr(v, "at", "createdAt", "sentAt", "timestamp", "time"),
    kind: optStr(v, "kind", "type") ?? (roleLower || null),
  };
}

function parseCurrentQuestion(value: unknown): CurrentQuestionRef | null {
  if (!isRec(value)) return null;
  return {
    kind: optStr(value, "kind", "type"),
    id: optStr(value, "id", "questionId") ?? "",
    position: optNum(value, "position", "order"),
    phase: optStr(value, "phase", "category"),
    status: optStr(value, "status", "state"),
    errorCode: optStr(value, "errorCode", "error"),
  };
}

function parseConversationView(value: unknown): ConversationView {
  const v = record(value);
  const sessionRaw = v.session !== undefined && v.session !== null ? v.session : v;
  const rawMessages = Array.isArray(v.messages) ? v.messages : [];
  return {
    session: parseSession(sessionRaw),
    messages: rawMessages.map((raw, index) => parseMessage(raw, index)),
    answeredCount: optNum(v, "answeredCount", "answered") ?? 0,
    currentQuestion: v.currentQuestion === undefined || v.currentQuestion === null
      ? null
      : parseCurrentQuestion(v.currentQuestion),
  };
}

function parseRecruitmentMe(value: unknown): RecruitmentMe {
  const v = record(value);
  return {
    status: optStr(v, "status") ?? "unknown",
    selectedRole: optStr(v, "selectedRole", "role"),
    selectedRoleLabel: optStr(v, "selectedRoleLabel", "roleLabel"),
    attemptNumber: optNum(v, "attemptNumber", "attempt"),
    attemptsRemaining: optNum(v, "attemptsRemaining", "attemptsLeft"),
    nextEligibleAt: optStr(v, "nextEligibleAt", "cooldownUntil"),
    currentInterviewSessionId: optStr(v, "currentInterviewSessionId", "activeInterviewId"),
    recruitedAt: optStr(v, "recruitedAt"),
    result: isRec(v.result) ? v.result : null,
    interviewSchedule: isRec(v.interviewSchedule) ? v.interviewSchedule : null,
  };
}

function parseResult(value: unknown): RecruitmentResult {
  const v = record(value);
  return {
    passed: detectPassed(v),
    decision: optStr(v, "decision", "status", "outcome"),
    overallScore: optNum(v, "overallScore", "overall", "score", "finalScore"),
    technicalScore: optNum(v, "technicalScore", "technical"),
    softScore: optNum(v, "softScore", "soft", "softskillsScore", "communicationScore"),
    englishScore: optNum(v, "englishScore", "english"),
    roleCode: optStr(v, "roleCode", "role"),
    attemptNumber: optNum(v, "attemptNumber", "attempt"),
    evaluatedAt: optStr(v, "evaluatedAt", "createdAt", "decidedAt"),
    raw: v,
  };
}

function parseCareerRole(value: unknown): CareerRole {
  const v = record(value);
  return {
    code: optStr(v, "code") ?? "",
    label: optStr(v, "label", "name") ?? optStr(v, "code") ?? "",
    description: optStr(v, "description"),
    level: optStr(v, "level"),
    language: optStr(v, "language"),
    requiredSkills: Array.isArray(v.requiredSkills)
      ? v.requiredSkills.filter((s): s is string => typeof s === "string")
      : [],
    version: optNum(v, "version"),
  };
}

function parseCandidate(value: unknown): RecruitmentCandidate {
  const v = record(value);
  return {
    userId: optStr(v, "userId", "id") ?? "",
    displayName: optStr(v, "displayName", "name", "fullName"),
    email: optStr(v, "email"),
    status: optStr(v, "status", "recruitmentStatus"),
    roleCode: optStr(v, "roleCode", "selectedRole"),
    overallScore: optNum(v, "overallScore", "score"),
    updatedAt: optStr(v, "updatedAt"),
    raw: v,
  };
}

/* ------------------------------ API ops ------------------------------ */

/** GET /recruitment/me — hồ sơ tuyển dụng của tôi (status, lượt thử, cooldown). */
export async function getMyRecruitment(): Promise<RecruitmentMe> {
  return request("/recruitment/me", parseRecruitmentMe);
}

/** PATCH /recruitment/me/role — chọn/đổi vai trò ứng tuyển. */
export async function selectRecruitmentRole(role: string): Promise<RecruitmentMe> {
  return request("/recruitment/me/role", parseRecruitmentMe, {
    method: "PATCH",
    body: { role },
  });
}

/** GET /recruitment/me/interviews — {items} lịch sử phiên, mới nhất trước. */
export async function listMyInterviews(
  page = 1,
  pageSize = 20,
): Promise<InterviewHistoryItem[]> {
  return request(
    `/recruitment/me/interviews?page=${page}&pageSize=${pageSize}`,
    (value) => {
      const v = record(value);
      return array(v.items ?? [], parseHistoryItem);
    },
  );
}

/** POST /recruitment/me/interviews — tạo phiên mới (10 câu, backend timer). */
export async function startInterview(): Promise<InterviewSession> {
  return request("/recruitment/me/interviews", parseSession, { method: "POST" });
}

/** GET /recruitment/me/interviews/{id} — chi tiết phiên (own only, 404-safe). */
export async function getInterviewSession(id: string): Promise<InterviewSession> {
  return request(`/recruitment/me/interviews/${encodeURIComponent(id)}`, parseSession);
}

/** GET /recruitment/me/interviews/{id}/questions — câu hỏi đã làm sạch (không rubric). */
export async function getInterviewQuestions(id: string): Promise<InterviewQuestionView> {
  return request(
    `/recruitment/me/interviews/${encodeURIComponent(id)}/questions`,
    (value) => {
      const v = record(value);
      const sessionRaw = v.session !== undefined && v.session !== null ? v.session : v;
      return {
        session: parseSession(sessionRaw),
        questions: array(v.questions ?? [], parseQuestion),
      };
    },
  );
}

/** GET /recruitment/me/interviews/{id}/conversation — khung hội thoại AI ↔ ứng viên. */
export async function getInterviewConversation(id: string): Promise<ConversationView> {
  return request(
    `/recruitment/me/interviews/${encodeURIComponent(id)}/conversation`,
    parseConversationView,
  );
}

/** POST .../conversation/clarify — xin làm rõ câu hỏi hiện tại (trả view mới). */
export async function clarifyInterviewQuestion(
  id: string,
  text?: string,
): Promise<ConversationView> {
  return request(
    `/recruitment/me/interviews/${encodeURIComponent(id)}/conversation/clarify`,
    parseConversationView,
    { method: "POST", body: text ? { text } : {} },
  );
}

/** POST .../conversation/next — sang câu tiếp theo (trả view mới). */
export async function nextInterviewQuestion(id: string): Promise<ConversationView> {
  return request(
    `/recruitment/me/interviews/${encodeURIComponent(id)}/conversation/next`,
    parseConversationView,
    { method: "POST" },
  );
}

/** PUT .../answers/{questionId} — lưu/cập nhật câu trả lời (chỉ khi in_progress). */
export async function saveInterviewAnswer(
  id: string,
  questionId: string,
  answerText: string,
): Promise<ConversationView | null> {
  return request(
    `/recruitment/me/interviews/${encodeURIComponent(id)}/answers/${encodeURIComponent(questionId)}`,
    (value) => (value === null || value === undefined ? null : parseConversationView(value)),
    { method: "PUT", body: { answerText } },
  );
}

/** PUT .../follow-ups/{questionId} — trả lời câu hỏi follow-up. */
export async function answerInterviewFollowUp(
  id: string,
  questionId: string,
  answerText: string,
): Promise<ConversationView | null> {
  return request(
    `/recruitment/me/interviews/${encodeURIComponent(id)}/follow-ups/${encodeURIComponent(questionId)}`,
    (value) => (value === null || value === undefined ? null : parseConversationView(value)),
    { method: "PUT", body: { answerText } },
  );
}

/** POST .../submit — nộp bài (idempotent, BE tự chấm overall = 0.7kt + 0.3 mềm). */
export async function submitInterview(id: string): Promise<InterviewSession | null> {
  return request(
    `/recruitment/me/interviews/${encodeURIComponent(id)}/submit`,
    (value) => {
      if (value === null || value === undefined) return null;
      /* BE có thể trả session hoặc conversation view — lấy session nếu có. */
      if (isRec(value) && (value.session !== undefined)) return parseSession(value.session);
      if (isRec(value) && optStr(value, "id")) return parseSession(value);
      return null;
    },
    { method: "POST" },
  );
}

/** POST .../retry-evaluation — yêu cầu chấm lại (chỉ khi evaluation_failed). */
export async function retryInterviewEvaluation(id: string): Promise<InterviewSession | null> {
  return request(
    `/recruitment/me/interviews/${encodeURIComponent(id)}/retry-evaluation`,
    (value) => {
      if (value === null || value === undefined) return null;
      if (isRec(value) && value.session !== undefined) return parseSession(value.session);
      if (isRec(value) && optStr(value, "id")) return parseSession(value);
      return null;
    },
    { method: "POST" },
  );
}

/** GET /recruitment/me/result — kết quả chính thức; 404 → null (chưa có). */
export async function getMyRecruitmentResult(): Promise<RecruitmentResult | null> {
  try {
    return await request("/recruitment/me/result", parseResult);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) return null;
    throw error;
  }
}

/* -------------------- career roles (public catalog) -------------------- */

/** GET /career-roles — danh mục vai trò đang tuyển (public, {items}). */
export async function listPublicCareerRoles(): Promise<CareerRole[]> {
  return request("/career-roles", (value) => {
    const v = record(value);
    return array(v.items ?? [], parseCareerRole);
  });
}

/* ------------- candidates (instructor/admin — đủ 16 op nhóm) ------------- */

/** GET /recruitment/candidates — danh sách ứng viên (instructor/admin). */
export async function listRecruitmentCandidates(
  page = 1,
  pageSize = 20,
): Promise<RecruitmentCandidate[]> {
  return request(
    `/recruitment/candidates?page=${page}&pageSize=${pageSize}`,
    (value) => {
      const v = record(value);
      return array(v.items ?? [], parseCandidate);
    },
  );
}

/** GET /recruitment/candidates/{userId} — hồ sơ tuyển dụng một ứng viên. */
export async function getRecruitmentCandidate(userId: string): Promise<RecruitmentCandidate> {
  return request(
    `/recruitment/candidates/${encodeURIComponent(userId)}`,
    parseCandidate,
  );
}
