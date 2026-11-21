"use client";
/* =====================================================================
 * STUDENT EXTRA ADAPTER — các endpoint intern mở rộng:
 *  · GET  /intern/me/performance           — chỉ số năng lực (null = chưa đo)
 *  · GET  /intern/me/ai-recommendations    — khuyến nghị AI (404 → null)
 *  · POST /intern/me/ai-recommendations/refresh — tạo/làm mới (tốn AI quota)
 *  · GET  /participation/me                — {items, summary} phiên tham gia
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
  }
  return null;
}
function isRec(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/* --------------------------- GET /intern/me/performance --------------------------- */

export interface PerformancePeriod {
  from: string | null;
  to: string | null;
  /** Chuỗi mô tả biên khoảng thời gian (hiển thị dạng margin note). */
  boundary: string | null;
}

export interface PerformanceMetrics {
  totalTaskCount: number | null;
  completedTaskCount: number | null;
  /** null = chưa đo (KHÔNG phải 0). */
  taskCompletionRate: number | null;
  committedStoryPoints: number | null;
  completedStoryPoints: number | null;
  storyPointCompletionRate: number | null;
  onTimeCompletionRate: number | null;
  onTimeCompletedTaskCount: number | null;
  dueDatedCompletedTaskCount: number | null;
  overdueOpenTaskCount: number | null;
  averageEvaluationScore: number | null;
  finalizedEvaluationCount: number | null;
  activeSprintProgress: number | null;
}

export interface MyPerformance {
  userId: string | null;
  period: PerformancePeriod;
  metrics: PerformanceMetrics;
}

function parseMetrics(value: unknown): PerformanceMetrics {
  const v = record(value);
  return {
    totalTaskCount: optNum(v, "totalTaskCount"),
    completedTaskCount: optNum(v, "completedTaskCount"),
    taskCompletionRate: optNum(v, "taskCompletionRate"),
    committedStoryPoints: optNum(v, "committedStoryPoints"),
    completedStoryPoints: optNum(v, "completedStoryPoints"),
    storyPointCompletionRate: optNum(v, "storyPointCompletionRate"),
    onTimeCompletionRate: optNum(v, "onTimeCompletionRate"),
    onTimeCompletedTaskCount: optNum(v, "onTimeCompletedTaskCount"),
    dueDatedCompletedTaskCount: optNum(v, "dueDatedCompletedTaskCount"),
    overdueOpenTaskCount: optNum(v, "overdueOpenTaskCount"),
    averageEvaluationScore: optNum(v, "averageEvaluationScore"),
    finalizedEvaluationCount: optNum(v, "finalizedEvaluationCount"),
    activeSprintProgress: optNum(v, "activeSprintProgress"),
  };
}

export async function getMyPerformance(): Promise<MyPerformance> {
  return request("/intern/me/performance", (value) => {
    const v = record(value);
    const period = isRec(v.period) ? v.period : {};
    return {
      userId: optStr(v, "userId"),
      period: {
        from: optStr(period, "from"),
        to: optStr(period, "to"),
        boundary: optStr(period, "boundary"),
      },
      metrics: parseMetrics(v.metrics ?? {}),
    };
  });
}

/* ----------------------- GET/POST /intern/me/ai-recommendations ----------------------- */

export interface AiRecommendationItem {
  title: string | null;
  message: string | null;
  createdAt: string | null;
  /** Các cặp key/value bổ sung (BE có thể trả field ngoài dự kiến). */
  extras: { key: string; value: string }[];
}

export interface AiRecommendations {
  generatedAt: string | null;
  items: AiRecommendationItem[];
}

const REC_HIDDEN_KEYS = new Set([
  "title", "message", "content", "text", "summary", "description",
  "createdat", "created_at", "generatedat", "generated_at", "updatedat", "id",
]);

function parseRecommendationItem(value: unknown): AiRecommendationItem {
  const v = record(value);
  const extras: { key: string; value: string }[] = [];
  for (const [key, val] of Object.entries(v)) {
    if (REC_HIDDEN_KEYS.has(key.toLowerCase())) continue;
    if (val === null || val === undefined) continue;
    if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
      extras.push({ key, value: String(val) });
    }
  }
  return {
    title: optStr(v, "title", "heading", "name"),
    message: optStr(v, "message", "content", "text", "summary", "description", "advice"),
    createdAt: optStr(v, "createdAt", "created_at", "generatedAt"),
    extras,
  };
}

/** Ép nhiều dạng response có thể ({items}, {recommendations}, hoặc chính nó là 1 gợi ý). */
function parseRecommendations(value: unknown): AiRecommendations {
  if (!isRec(value)) return { generatedAt: null, items: [] };
  const generatedAt = optStr(value, "generatedAt", "generated_at", "createdAt", "updated_at");
  const listRaw =
    Array.isArray(value.items)
      ? value.items
      : Array.isArray(value.recommendations)
        ? value.recommendations
        : Array.isArray(value.entries)
          ? value.entries
          : null;
  if (listRaw) {
    return { generatedAt, items: array(listRaw, parseRecommendationItem) };
  }
  /* Object phẳng — nếu có nội dung giống một khuyến nghị thì coi là 1 mục. */
  const single = parseRecommendationItem(value);
  if (single.title || single.message) {
    return { generatedAt: generatedAt ?? single.createdAt, items: [single] };
  }
  return { generatedAt, items: [] };
}

/** GET /intern/me/ai-recommendations — 404 AI_RECOMMENDATION_NOT_AVAILABLE → null. */
export async function getMyAiRecommendations(): Promise<AiRecommendations | null> {
  try {
    return await request("/intern/me/ai-recommendations", parseRecommendations);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) return null;
    throw error;
  }
}

/** POST /intern/me/ai-recommendations/refresh — tốn AI quota, disable khi busy. */
export async function refreshMyAiRecommendations(): Promise<AiRecommendations | null> {
  return request(
    "/intern/me/ai-recommendations/refresh",
    (value) => (value === null || value === undefined ? null : parseRecommendations(value)),
    { method: "POST" },
  );
}

/* ------------------------------ GET /participation/me ------------------------------ */

export interface ParticipationItem {
  id: string | null;
  sessionId: string | null;
  sessionName: string | null;
  sessionCode: string | null;
  status: string | null;
  role: string | null;
  joinedAt: string | null;
  penaltyCount: number | null;
  extras: { key: string; value: string }[];
}

export interface ParticipationSummary {
  total: number;
  active: number;
  registeredPenalty: number;
}

export interface MyParticipation {
  items: ParticipationItem[];
  summary: ParticipationSummary;
  page: number;
  pageSize: number;
}

const PART_HIDDEN_KEYS = new Set([
  "id", "sessionid", "session_id", "sessionname", "session_name", "sessioncode",
  "session_code", "status", "role", "joinedat", "joined_at", "penaltycount",
  "penaltycount", "penalty_count", "penalties",
]);

function parseParticipationItem(value: unknown): ParticipationItem {
  const v = record(value);
  const extras: { key: string; value: string }[] = [];
  for (const [key, val] of Object.entries(v)) {
    if (PART_HIDDEN_KEYS.has(key.toLowerCase())) continue;
    if (val === null || val === undefined) continue;
    if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
      extras.push({ key, value: String(val) });
    }
  }
  return {
    id: optStr(v, "id", "participationId"),
    sessionId: optStr(v, "sessionId", "session_id"),
    sessionName: optStr(v, "sessionName", "session_name", "session"),
    sessionCode: optStr(v, "sessionCode", "session_code", "code"),
    status: optStr(v, "status", "state"),
    role: optStr(v, "role", "roleCode"),
    joinedAt: optStr(v, "joinedAt", "joined_at", "startedAt", "createdAt"),
    penaltyCount: optNum(v, "penaltyCount", "penalty_count", "penalties"),
    extras,
  };
}

export async function getMyParticipation(
  page = 1,
  pageSize = 20,
): Promise<MyParticipation> {
  return request(`/participation/me?page=${page}&pageSize=${pageSize}`, (value) => {
    const v = record(value);
    const summary = isRec(v.summary) ? v.summary : {};
    return {
      items: array(v.items ?? [], parseParticipationItem),
      summary: {
        total: optNum(summary, "total") ?? 0,
        active: optNum(summary, "active") ?? 0,
        registeredPenalty: optNum(summary, "registeredPenalty", "penalty") ?? 0,
      },
      page: optNum(v, "page") ?? page,
      pageSize: optNum(v, "pageSize") ?? pageSize,
    };
  });
}
