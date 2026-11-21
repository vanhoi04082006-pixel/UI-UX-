"use client";
/* =====================================================================
 * INSTRUCTOR ADAPTER (legacy screens) — dashboard, sessions, sprints, board,
 * submissions, reports. Đã CHỈNH THEO CONTRACT BE THẬT (giữ nguyên export
 * names cho các màn instructor-* cũ):
 *   · GET /sessions, /sprints, /tasks      → { data, meta }
 *   · GET /dashboard/instructor            → object phẳng (metrics đếm khác mock)
 *   · GET /reports                         → { items, total } (KHÔNG nhận pageSize)
 *   · Chuyển trạng thái phiên: PATCH /sessions/{id} (BE không có /status;
 *     "closed" của màn cũ → "completed" của BE)
 *   · Chuyển trạng thái sprint: POST /sprints/{id}/status { status, allowOpenTasks }
 *   · GET /sprints/{id}/board              → { sprint, columns, total, overdue }
 *   · GET /submissions KHÔNG tồn tại trên BE thật (chỉ có /tasks/{id}/submissions)
 *     → listSubmissions trả [] khi endpoint 404.
 * ===================================================================== */
import { request } from "./client";
import { array, nullable, number, parsePage, record, string } from "./parse";
import { ApiError } from "./api-client";
import type {
  GradingItem,
  InstructorSession,
  ReportRow,
  SessionStatus,
  Sprint,
  SprintBoard,
  TaskStatus,
} from "@/lib/mock/types";

/* ------------------------------ dashboard ------------------------------ */

export interface InstructorDashboard {
  metrics: { activeSessions: number; pendingReviews: number; students: number; avgFinalScore: number | null };
  activeSessions: InstructorSession[];
  pendingQueue: GradingItem[];
}

/** Phiên dạng mock của màn cũ — map phòng thủ từ shape BE thật. */
function parseSession(value: unknown): InstructorSession {
  const v = record(value);
  const name = nullable(v.name, string) ?? "";
  return {
    id: nullable(v.id, string) ?? "",
    code: nullable(v.code, string) ?? "",
    project: name,
    members: nullable(v.memberCount, number) ?? 0,
    memberNames: [],
    memberDetails: [],
    sprint: "—",
    sprintStatus: "",
    progress: nullable(v.taskPercent, number) ?? 0,
    startDate: nullable(v.startDate, string) ?? new Date().toISOString(),
    endDate: nullable(v.endDate, string) ?? new Date().toISOString(),
    status: (nullable(v.status, string) ?? "upcoming") as SessionStatus,
  };
}

function parseGrading(value: unknown): GradingItem {
  const v = record(value);
  return {
    id: nullable(v.id, string) ?? "",
    taskCode: nullable(v.taskCode, string) ?? nullable(v.code, string) ?? "",
    taskTitle: nullable(v.taskTitle, string) ?? nullable(v.title, string) ?? "",
    student: nullable(v.student, string) ?? "",
    submittedAt: nullable(v.submittedAt, string) ?? new Date().toISOString(),
    aiScore: nullable(v.aiScore, number) ?? 0,
    finalScore:
      v.finalScore === null || v.finalScore === undefined
        ? undefined
        : nullable(v.finalScore, number) ?? undefined,
    prLink: nullable(v.prUrl, string) ?? "",
    status: (nullable(v.status, string) ?? "pending") as GradingItem["status"],
    notes: nullable(v.notes, string) ?? nullable(v.feedback, string) ?? "",
  };
}

export async function getInstructorDashboard(): Promise<InstructorDashboard> {
  return request("/dashboard/instructor", (value) => {
    const v = record(value);
    const m = record(v.metrics);
    return {
      metrics: {
        activeSessions: nullable(m.activeSessions, number) ?? 0,
        pendingReviews: nullable(m.reviewCount, number) ?? 0,
        students: nullable(m.internCount, number) ?? 0,
        avgFinalScore: nullable(m.averageScore, number),
      },
      activeSessions: array(v.sessions ?? [], parseSession),
      pendingQueue: array(v.reviews ?? [], parseGrading),
    };
  });
}

/* ------------------------------- sessions ------------------------------ */

export async function listSessions(): Promise<InstructorSession[]> {
  const body = await request("/sessions?page=1&pageSize=50", (value) => parsePage(value, parseSession));
  return body.items;
}

/** Màn cũ dùng "closed" — BE thật là "completed"; chuyển qua PATCH /sessions/{id}. */
export async function transitionSessionStatus(
  id: string,
  status: SessionStatus,
): Promise<InstructorSession> {
  const mapped = (status === "closed" ? "completed" : status) as string;
  return request(`/sessions/${encodeURIComponent(id)}`, parseSession, {
    method: "PATCH",
    body: { status: mapped },
  });
}

/* -------------------------------- sprints ------------------------------- */

function parseSprint(value: unknown): Sprint {
  const v = record(value);
  return {
    id: nullable(v.id, string) ?? "",
    sessionId: nullable(v.sessionId, string) ?? "",
    name: nullable(v.name, string) ?? "",
    goal: nullable(v.goal, string) ?? "",
    startsAt: nullable(v.startDate, string) ?? new Date().toISOString(),
    endsAt: nullable(v.endDate, string) ?? new Date().toISOString(),
    status: (nullable(v.status, string) ?? "planned") as Sprint["status"],
    totalTasks: nullable(v.taskTotal, number) ?? 0,
    openTasks: nullable(v.taskOpen, number) ?? 0,
  };
}

export async function listSprints(sessionId?: string): Promise<Sprint[]> {
  const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}&page=1&pageSize=50` : "?page=1&pageSize=50";
  const body = await request(`/sprints${query}`, (value) => parsePage(value, parseSprint));
  return body.items;
}

/** POST /sprints thật sự cần {code*, name*, projectId*, startDate*, endDate*}. */
export async function createSprint(input: {
  sessionId: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
}): Promise<Sprint> {
  return request("/sprints", parseSprint, {
    method: "POST",
    body: {
      code: `SP-${input.name.trim().replace(/\s+/g, "-").toUpperCase().slice(0, 48) || "SPRINT"}`,
      name: input.name,
      goal: input.goal,
      sessionId: input.sessionId,
      projectId: input.sessionId,
      startDate: input.startDate,
      endDate: input.endDate,
    },
  });
}

export async function updateSprint(
  id: string,
  input: { name?: string; goal?: string; startDate?: string; endDate?: string },
): Promise<Sprint> {
  return request(`/sprints/${encodeURIComponent(id)}`, parseSprint, { method: "PATCH", body: input });
}

export async function transitionSprintStatus(
  id: string,
  status: Sprint["status"],
): Promise<Sprint> {
  return request(`/sprints/${encodeURIComponent(id)}/status`, parseSprint, {
    method: "POST",
    body: { status },
  });
}

/* ------------------------------ sprint board --------------------------- */

const BOARD_COLUMN_LABEL: Record<string, string> = {
  todo: "Cần làm",
  doing: "Đang làm",
  review: "Chờ duyệt",
  done: "Hoàn thành",
};

function parseBoard(value: unknown): SprintBoard {
  const v = record(value);
  const sprint = record(v.sprint);
  const endDate = nullable(sprint.endDate, string);
  const daysLeft = endDate
    ? Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000))
    : 0;
  return {
    id: nullable(sprint.id, string) ?? "",
    name: nullable(sprint.name, string) ?? "",
    goal: nullable(sprint.goal, string) ?? "",
    week: `${nullable(sprint.startDate, string) ?? ""} → ${endDate ?? ""}`,
    daysLeft,
    status: nullable(sprint.status, string) as SprintBoard["status"],
    columns: array(v.columns ?? [], (raw) => {
      const c = record(raw);
      const key = (nullable(c.status, string) ?? "todo") as TaskStatus;
      return {
        key,
        label: BOARD_COLUMN_LABEL[key] ?? key,
        tasks: array(c.tasks ?? [], (t) => {
          const task = record(t);
          return {
            id: nullable(task.id, string) ?? "",
            code: nullable(task.code, string) ?? "",
            title: nullable(task.title, string) ?? "",
            status: (nullable(task.status, string) ?? "todo") as TaskStatus,
            assignee: nullable(task.assigneeId, string) ?? "",
            priority: (nullable(task.priority, string) ?? "medium") as "low" | "medium" | "high" | "urgent",
            points: nullable(task.storyPoints, number) ?? 0,
          };
        }),
      };
    }),
    burndown: [],
  };
}

/**
 * Bảng sprint — BE thật chỉ có GET /sprints/{id}/board (không có
 * preview-sprint). Khi không truyền id, tự chốt sprint active đầu tiên
 * (giữ hành vi màn cũ qua staff-api.ts).
 */
export async function getSprintBoard(sprintId?: string): Promise<SprintBoard> {
  if (sprintId) {
    return request(`/sprints/${encodeURIComponent(sprintId)}/board`, parseBoard);
  }
  const sprints = await listSprints();
  const target = sprints.find((s) => s.status === "active") ?? sprints[0];
  if (!target) {
    throw new ApiError(404, "NOT_FOUND", "Chưa có sprint nào để hiển thị bảng.");
  }
  return request(`/sprints/${encodeURIComponent(target.id)}/board`, parseBoard);
}

/** POST /tasks thật sự cần {title*, projectId*}; "urgent" của màn cũ → "critical". */
export async function createBoardTask(input: {
  title: string;
  assignee: string;
  priority: "low" | "medium" | "high" | "urgent";
  points: number;
  description: string;
}): Promise<{ id: string; code: string; title: string }> {
  return request("/tasks", (value) => {
    const v = record(value);
    return {
      id: nullable(v.id, string) ?? "",
      code: nullable(v.code, string) ?? "",
      title: nullable(v.title, string) ?? "",
    };
  }, {
    method: "POST",
    body: {
      title: input.title,
      description: input.description,
      assigneeId: input.assignee || undefined,
      priority: input.priority === "urgent" ? "critical" : input.priority,
      storyPoints: input.points,
    },
  });
}

/* ------------------------------ submissions ----------------------------- */

/**
 * BE thật KHÔNG có GET /submissions (chỉ /tasks/{id}/submissions).
 * Endpoint 404 → trả danh sách rỗng thay vì lỗi cứng cho các màn cũ.
 */
export async function listSubmissions(status?: "pending" | "approved" | "changes"): Promise<GradingItem[]> {
  const query = status ? `?status=${status}&page=1&pageSize=50` : "?page=1&pageSize=50";
  try {
    const body = await request(`/submissions${query}`, (value) => parsePage(value, parseGrading));
    return body.items;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) return [];
    throw error;
  }
}

/**
 * POST /submissions/{id}/review cần {rubric*, feedback 10..4000, taskVersion≥1}.
 * Map best-effort từ (decision, finalScore, notes) của màn cũ.
 */
export async function reviewSubmission(
  id: string,
  decision: "approved" | "changes",
  finalScore: number,
  notes: string,
): Promise<GradingItem> {
  return request(`/submissions/${encodeURIComponent(id)}/review`, parseGrading, {
    method: "POST",
    body: {
      rubric: { overall: finalScore, decision },
      feedback: notes.length >= 10 ? notes : `${notes} — ghi nhận từ màn chấm.`,
      taskVersion: 1,
    },
  });
}

export async function completeAssignment(id: string): Promise<string> {
  return request(`/assignments/${encodeURIComponent(id)}/complete`, (value) => {
    const v = record(value);
    return nullable(v.id, string) ?? "";
  }, { method: "POST", body: {} });
}

/* -------------------------------- reports ------------------------------- */

function parseReportRow(value: unknown): ReportRow {
  const v = record(value);
  return {
    id: nullable(v.id, string) ?? "",
    period: nullable(v.kind, string) ?? "",
    scope: nullable(v.projectName, string) ?? "",
    avgScore: 0,
    completion: 0,
    kpiAvg: 0,
    students: 0,
  };
}

/** GET /reports trả { items, total } và KHÔNG nhận query phân trang. */
export async function listReports(): Promise<ReportRow[]> {
  return request("/reports", (value) => {
    const r = record(value);
    return array(r.items, parseReportRow);
  });
}

/**
 * POST /reports cần {requestId UUID, title, kind, projectId UUID} — màn cũ
 * chỉ truyền (period, scope) nên map best-effort; thiếu projectId sẽ được
 * BE từ chối với thông báo validation.
 */
export async function createReport(period: string, scope: string): Promise<ReportRow> {
  const requestId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return request("/reports", parseReportRow, {
    method: "POST",
    body: {
      requestId,
      title: `Báo cáo ${period} — ${scope}`.slice(0, 256),
      kind: "progress",
    },
  });
}

/* ------------------------------ API mismatch guard --------------------- */

export function instructorErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === "SESSION_STATUS_INVALID") return error.message;
  return error instanceof Error ? error.message : "Không hoàn tất được thao tác.";
}
