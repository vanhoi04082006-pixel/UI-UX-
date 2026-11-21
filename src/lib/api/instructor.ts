"use client";
/* =====================================================================
 * INSTRUCTOR ADAPTER — dashboard, sessions, sprints, board, submissions,
 * reports. Contract path khớp BE thật.
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

function parseSession(value: unknown): InstructorSession {
  const v = record(value);
  return {
    id: string(v.id),
    code: string(v.code),
    project: string(v.project),
    members: number(v.members),
    memberNames: array(v.memberNames, string),
    memberDetails: array(v.memberDetails, (raw) => {
      const m = record(raw);
      return { name: string(m.name), email: string(m.email), assignmentStatus: m.assignmentStatus as "active" | "completed" };
    }),
    sprint: string(v.sprint),
    sprintStatus: string(v.sprintStatus),
    progress: number(v.progress),
    startDate: string(v.startDate),
    endDate: string(v.endDate),
    status: v.status as SessionStatus,
  };
}

function parseGrading(value: unknown): GradingItem {
  const v = record(value);
  return {
    id: string(v.id),
    taskCode: string(v.taskCode),
    taskTitle: string(v.taskTitle),
    student: string(v.student),
    submittedAt: string(v.submittedAt),
    aiScore: number(v.aiScore),
    finalScore: v.finalScore === null || v.finalScore === undefined ? undefined : number(v.finalScore),
    prLink: string(v.prLink),
    status: v.status as GradingItem["status"],
    notes: string(v.notes),
  };
}

export async function getInstructorDashboard(): Promise<InstructorDashboard> {
  return request("/dashboard/instructor", (value) => {
    const v = record(value);
    const m = record(v.metrics);
    return {
      metrics: {
        activeSessions: number(m.activeSessions),
        pendingReviews: number(m.pendingReviews),
        students: number(m.students),
        avgFinalScore: nullable(m.avgFinalScore, number),
      },
      activeSessions: array(v.activeSessions, parseSession),
      pendingQueue: array(v.pendingQueue, parseGrading),
    };
  });
}

/* ------------------------------- sessions ------------------------------ */

export async function listSessions(): Promise<InstructorSession[]> {
  const body = await request("/sessions?page=1&pageSize=50", (value) => parsePage(value, parseSession));
  return body.items;
}

export async function transitionSessionStatus(
  id: string,
  status: SessionStatus,
): Promise<InstructorSession> {
  return request(`/sessions/${encodeURIComponent(id)}/status`, parseSession, {
    method: "POST",
    body: { status },
  });
}

/* -------------------------------- sprints ------------------------------- */

function parseSprint(value: unknown): Sprint {
  const v = record(value);
  return {
    id: string(v.id),
    sessionId: string(v.sessionId),
    name: string(v.name),
    goal: string(v.goal),
    startsAt: string(v.startsAt),
    endsAt: string(v.endsAt),
    status: v.status as Sprint["status"],
    totalTasks: number(v.totalTasks),
    openTasks: number(v.openTasks),
  };
}

export async function listSprints(sessionId?: string): Promise<Sprint[]> {
  const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}&page=1&pageSize=50` : "?page=1&pageSize=50";
  const body = await request(`/sprints${query}`, (value) => parsePage(value, parseSprint));
  return body.items;
}

export async function createSprint(input: {
  sessionId: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
}): Promise<Sprint> {
  return request("/sprints", parseSprint, { method: "POST", body: input });
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

export async function getSprintBoard(sprintId?: string): Promise<SprintBoard> {
  const path = sprintId
    ? `/sprints/${encodeURIComponent(sprintId)}/board`
    : "/sprints/preview-sprint/board";
  return request(path, (value) => {
    const v = record(value);
    return {
      id: string(v.id),
      name: string(v.name),
      goal: string(v.goal),
      week: string(v.week),
      daysLeft: number(v.daysLeft),
      status: (v.status === null || v.status === undefined ? undefined : String(v.status)) as SprintBoard["status"],
      columns: array(v.columns, (raw) => {
        const c = record(raw);
        return {
          key: c.key as TaskStatus,
          label: string(c.label),
          tasks: array(c.tasks, (t) => {
            const task = record(t);
            return {
              id: string(task.id),
              code: string(task.code),
              title: string(task.title),
              status: task.status as TaskStatus,
              assignee: string(task.assignee),
              priority: task.priority as "low" | "medium" | "high" | "urgent",
              points: number(task.points),
            };
          }),
        };
      }),
      burndown: array(v.burndown, (x) => number(x)),
    };
  });
}

export async function createBoardTask(input: {
  title: string;
  assignee: string;
  priority: "low" | "medium" | "high" | "urgent";
  points: number;
  description: string;
}): Promise<{ id: string; code: string; title: string }> {
  return request("/tasks", (value) => {
    const v = record(value);
    return { id: string(v.id), code: string(v.code), title: string(v.title) };
  }, { method: "POST", body: input });
}

/* ------------------------------ submissions ----------------------------- */

export async function listSubmissions(status?: "pending" | "approved" | "changes"): Promise<GradingItem[]> {
  const query = status ? `?status=${status}&page=1&pageSize=50` : "?page=1&pageSize=50";
  const body = await request(`/submissions${query}`, (value) => parsePage(value, parseGrading));
  return body.items;
}

export async function reviewSubmission(
  id: string,
  decision: "approved" | "changes",
  finalScore: number,
  notes: string,
): Promise<GradingItem> {
  return request(`/submissions/${encodeURIComponent(id)}/review`, parseGrading, {
    method: "POST",
    body: { decision, finalScore, notes },
  });
}

export async function completeAssignment(id: string): Promise<string> {
  return request(`/assignments/${encodeURIComponent(id)}/complete`, (value) => {
    const v = record(value);
    return string(v.id);
  }, { method: "POST" });
}

/* -------------------------------- reports ------------------------------- */

export async function listReports(): Promise<ReportRow[]> {
  const body = await request("/reports?page=1&pageSize=50", (value) =>
    parsePage(value, (raw) => {
      const v = record(raw);
      return {
        id: string(v.id),
        period: string(v.period),
        scope: string(v.scope),
        avgScore: number(v.avgScore),
        completion: number(v.completion),
        kpiAvg: number(v.kpiAvg),
        students: number(v.students),
      };
    }),
  );
  return body.items;
}

export async function createReport(period: string, scope: string): Promise<ReportRow> {
  return request("/reports", (value) => {
    const v = record(value);
    return {
      id: string(v.id),
      period: string(v.period),
      scope: string(v.scope),
      avgScore: number(v.avgScore),
      completion: number(v.completion),
      kpiAvg: number(v.kpiAvg),
      students: number(v.students),
    };
  }, { method: "POST", body: { period, scope } });
}

/* ------------------------------ API mismatch guard --------------------- */

export function instructorErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === "SESSION_STATUS_INVALID") return error.message;
  return error instanceof Error ? error.message : "Không hoàn tất được thao tác.";
}
