"use client";
/* =====================================================================
 * WORK ADAPTER (intern) — contract: GET /tasks, PATCH /tasks/:id/my,
 * GET /intern/me/project, GET /sprints/:id/board.
 * View model giữ nguyên type Task của màn hình (points/sprint/acceptance…
 * là preview-extension đã ghi trong SWAP GUIDE).
 * ===================================================================== */
import { request } from "./client";
import { array, nullable, number, oneOf, record, string, parsePage } from "./parse";
import { ApiError } from "./api-client";
import type { InternOverview, Task, TaskStatus } from "@/lib/mock/types";

const taskStatuses = ["todo", "doing", "review", "done"] as const;
const priorities = ["low", "medium", "high", "urgent"] as const;

function parsePreviewTask(value: unknown): Task {
  const v = record(value);
  return {
    id: string(v.id),
    code: string(v.code),
    title: string(v.title),
    status: oneOf(v.status, taskStatuses),
    priority: oneOf(v.priority, priorities),
    sprint: string(v.sprint),
    points: number(v.points),
    progress: number(v.progress),
    dueDate: string(v.dueDate),
    description: string(v.description),
    acceptance: array(v.acceptance, string),
    history: array(v.history, (raw) => {
      const h = record(raw);
      return { at: string(h.at), label: string(h.label) };
    }),
  };
}

export async function listMyTasks(): Promise<Task[]> {
  const body = await request("/tasks?scope=mine&page=1&pageSize=50", (value) =>
    parsePage(value, parsePreviewTask),
  );
  return body.items;
}

export async function updateMyTask(
  id: string,
  status: TaskStatus,
  progress: number,
): Promise<Task> {
  return request(`/tasks/${encodeURIComponent(id)}/my`, parsePreviewTask, {
    method: "PATCH",
    body: { status, progress },
  });
}

/* ------------------------- overview (compose) -------------------------- */

export interface Placement {
  project: string;
  projectCode: string;
  session: string;
  sprint: string;
  sprintStatus: string;
  progressPct: number;
  weekLabel: string;
}

export async function getPlacement(): Promise<Placement | null> {
  try {
    const dto = await request("/intern/me/project", (value) => record(value));
    return {
      project: string(dto.name),
      projectCode: string(dto.code),
      session: string(dto.session),
      sprint: string(dto.sprint),
      sprintStatus: string(dto.sprintStatus),
      progressPct: number(dto.progressPct),
      weekLabel: string(dto.weekLabel),
    };
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) return null;
    throw error;
  }
}

/** Compose InternOverview từ các endpoint contract — như màn /intern của FE thật. */
export async function getInternOverview(userName: string): Promise<InternOverview> {
  const [placement, tasks] = await Promise.all([
    getPlacement(),
    listMyTasks().catch(() => [] as Task[]),
  ]);
  const taskSummary = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    doing: tasks.filter((t) => t.status === "doing").length,
    review: tasks.filter((t) => t.status === "review").length,
    done: tasks.filter((t) => t.status === "done").length,
  };
  const nextTasks = tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => {
      const rank: Record<TaskStatus, number> = { doing: 0, todo: 1, review: 2, done: 3 };
      return rank[a.status] - rank[b.status] || b.points - a.points;
    })
    .slice(0, 3);
  const focusedTask = tasks.find((t) => t.status === "doing") ?? null;
  const recentActivity = tasks
    .flatMap((t) => t.history.slice(-1).map((h) => ({ at: h.at, label: h.label, kind: "Nhiệm vụ" })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 5);
  const hour = new Date().getHours();
  const greeting =
    hour < 11 ? "Chào buổi sáng" : hour < 14 ? "Chào buổi trưa" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";
  return {
    greeting,
    userName,
    internState: "active",
    placement,
    taskSummary,
    nextTasks,
    focusedTask,
    recentActivity,
  };
}

/* ------------------------------ sprint board --------------------------- */

export interface BoardTask {
  id: string;
  code: string;
  title: string;
  status: TaskStatus;
  assignee: string;
  priority: "low" | "medium" | "high" | "urgent";
  points: number;
}

export interface SprintBoardView {
  id: string;
  name: string;
  goal: string;
  week: string;
  daysLeft: number;
  status?: string;
  columns: { key: TaskStatus; label: string; tasks: BoardTask[] }[];
  burndown: number[];
}

export async function getMySprintBoard(): Promise<SprintBoardView> {
  const body = await request("/sprints/preview-sprint/board", (value) => record(value));
  return {
    id: string(body.id),
    name: string(body.name),
    goal: string(body.goal),
    week: string(body.week),
    daysLeft: number(body.daysLeft),
    status: nullable(body.status, string) ?? undefined,
    columns: array(body.columns, (raw) => {
      const c = record(raw);
      return {
        key: oneOf(c.key, taskStatuses),
        label: string(c.label),
        tasks: array(c.tasks, (t) => {
          const task = record(t);
          return {
            id: string(task.id),
            code: string(task.code),
            title: string(task.title),
            status: oneOf(task.status, taskStatuses),
            assignee: string(task.assignee),
            priority: oneOf(task.priority, priorities),
            points: number(task.points),
          };
        }),
      };
    }),
    burndown: array(body.burndown, (x) => number(x)),
  };
}
