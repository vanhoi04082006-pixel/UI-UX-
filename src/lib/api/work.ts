"use client";
/* =====================================================================
 * WORK ADAPTER (intern) — contract BE thật:
 *  · GET   /tasks?mine=true              — nhiệm vụ của tôi ({data, meta})
 *  · PATCH /tasks/{id}/my                — cập nhật trạng thái nhiệm vụ của tôi
 *  · GET   /tasks/{id}/submissions       — lịch sử nộp bài ({data, meta})
 *  · POST  /tasks/{id}/submissions       — nộp bài
 *  · POST  /submissions/{id}/withdraw    — rút bài nộp
 *  · GET   /intern/me/project            — dự án đang phân công (404 → null)
 *  · GET   /intern/me/workspace          — workspace hiện tại (compose overview)
 *  · GET   /intern/me/sprints            — {items} sprint của tôi
 *  · GET   /intern/me/sprint/board       — bảng sprint hiện tại (404 ASSIGNMENT_NOT_ACTIVE)
 *  · GET   /intern/me/sprints/{id}/board — bảng một sprint đã chọn
 * View model giữ nguyên type Task của màn hình cũ (acceptance/history là
 * trường mở rộng — BE không trả thì fallback rỗng, màn không crash).
 * ===================================================================== */
import { request } from "./client";
import { ApiError } from "./api-client";
import { array, parsePage, record } from "./parse";
import type { InternOverview, Task, TaskStatus } from "@/lib/types";

/* --------------------- helpers parse defensive --------------------- */

/** Chuỗi khác rỗng đầu tiên trong các giá trị dự phòng. */
function pickStr(...values: unknown[]): string | null {
  for (const val of values) {
    if (typeof val === "string" && val.length > 0) return val;
    if (typeof val === "number" && Number.isFinite(val)) return String(val);
  }
  return null;
}
function pickNum(...values: unknown[]): number | null {
  for (const val of values) {
    if (typeof val === "number" && Number.isFinite(val)) return val;
  }
  return null;
}
function isRec(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const taskStatuses = ["todo", "doing", "review", "done"] as const;

/** BE dùng "critical" — màn cũ dùng "urgent" (PRIORITY_META) → ánh xạ giữ tương thích. */
function parsePriority(value: unknown): Task["priority"] {
  if (value === "low" || value === "medium" || value === "high") return value;
  if (value === "critical" || value === "urgent") return "urgent";
  return "medium";
}

function parseStatus(value: unknown): TaskStatus {
  return taskStatuses.includes(value as (typeof taskStatuses)[number])
    ? (value as TaskStatus)
    : "todo";
}

/** Hạn chót dự phòng 30 ngày — chỉ dùng khi BE không trả dueDate (tránh NaN). */
function fallbackDue(): string {
  return new Date(Date.now() + 30 * 86_400_000).toISOString();
}

function parsePreviewTask(value: unknown): Task {
  const v = record(value);
  const status = parseStatus(v.status);
  const sprintRec = isRec(v.sprint) ? v.sprint : null;
  return {
    id: pickStr(v.id) ?? "",
    code: pickStr(v.code) ?? (pickStr(v.id)?.slice(0, 8).toUpperCase() || "TASK"),
    title: pickStr(v.title, v.name) ?? "(không tiêu đề)",
    status,
    priority: parsePriority(v.priority),
    sprint: pickStr(v.sprintName, v.sprint) ?? (sprintRec ? pickStr(sprintRec.name, sprintRec.code) : null) ?? "Sprint",
    points: pickNum(v.storyPoints, v.points) ?? 0,
    progress: pickNum(v.progress) ?? (status === "done" ? 100 : 0),
    dueDate: pickStr(v.dueDate, v.dueAt) ?? fallbackDue(),
    description: pickStr(v.description) ?? "",
    acceptance: Array.isArray(v.acceptance)
      ? v.acceptance.filter((x): x is string => typeof x === "string")
      : [],
    history: [],
  };
}

/* ----------------------------- /tasks ----------------------------- */

export async function listMyTasks(): Promise<Task[]> {
  const body = await request("/tasks?mine=true&page=1&pageSize=50", (value) =>
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

/* ------------------------- /tasks/{id}/submissions ------------------------- */

export interface TaskSubmissionRow {
  id: string;
  taskId: string | null;
  status: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  score: number | null;
  note: string | null;
  raw: Record<string, unknown>;
}

function parseSubmission(value: unknown): TaskSubmissionRow {
  const v = record(value);
  return {
    id: pickStr(v.id) ?? "",
    taskId: pickStr(v.taskId, v.task_id),
    status: pickStr(v.status, v.state),
    submittedAt: pickStr(v.submittedAt, v.submitted_at, v.createdAt),
    reviewedAt: pickStr(v.reviewedAt, v.reviewed_at, v.decidedAt),
    score: pickNum(v.score, v.finalScore, v.aiScore),
    note: pickStr(v.note, v.notes, v.comment, v.reviewComment),
    raw: v,
  };
}

export async function listTaskSubmissions(taskId: string): Promise<TaskSubmissionRow[]> {
  const body = await request(
    `/tasks/${encodeURIComponent(taskId)}/submissions?page=1&pageSize=50`,
    (value) => parsePage(value, parseSubmission),
  );
  return body.items;
}

/** POST /tasks/{id}/submissions — SubmitTaskDto mờ (body truyền thẳng, thường {}). */
export async function submitTaskWork(
  taskId: string,
  input: Record<string, unknown> = {},
): Promise<TaskSubmissionRow> {
  return request(`/tasks/${encodeURIComponent(taskId)}/submissions`, parseSubmission, {
    method: "POST",
    body: input,
  });
}

/** POST /submissions/{id}/withdraw — rút bài nộp đang chờ duyệt. */
export async function withdrawSubmission(submissionId: string): Promise<null> {
  return request(`/submissions/${encodeURIComponent(submissionId)}/withdraw`, () => null, {
    method: "POST",
  });
}

/* ------------------------- /intern/me/project ------------------------- */

export interface Placement {
  project: string;
  projectCode: string;
  session: string;
  sprint: string;
  sprintStatus: string;
  progressPct: number;
  weekLabel: string;
}

const SPRINT_STATUS_VN: Record<string, string> = {
  active: "Đang diễn ra",
  planned: "Chưa bắt đầu",
  completed: "Đã kết thúc",
  cancelled: "Đã hủy",
};

export async function getPlacement(): Promise<Placement | null> {
  try {
    return await request("/intern/me/project", (value) => {
      const v = record(value);
      const sprintRec = isRec(v.currentSprint) ? v.currentSprint : isRec(v.sprint) ? v.sprint : null;
      const rawStatus = sprintRec ? pickStr(sprintRec.status) : pickStr(v.sprintStatus);
      return {
        project: pickStr(v.name, v.projectName) ?? "Dự án thực tập",
        projectCode: pickStr(v.code, v.projectCode) ?? "—",
        session: pickStr(v.sessionName) ?? (isRec(v.session) ? pickStr(v.session.name, v.session.code) : null) ?? "Phiên thực tập",
        sprint: (sprintRec ? pickStr(sprintRec.name, sprintRec.code) : null) ?? pickStr(v.sprintName) ?? "Sprint hiện tại",
        sprintStatus: rawStatus ? SPRINT_STATUS_VN[rawStatus] ?? rawStatus : "Đang diễn ra",
        progressPct: pickNum(v.progressPct, v.progress) ?? 0,
        weekLabel: pickStr(v.weekLabel) ?? "Tuần hiện tại",
      };
    });
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) return null;
    throw error;
  }
}

/* ------------------------ /intern/me/workspace ------------------------ */

interface WorkspaceView {
  status: string;
  hasAssignmentHistory: boolean;
  hasAssignment: boolean;
  taskSummary: { total: number; todo: number; doing: number; review: number; done: number };
  focusedTask: Task | null;
}

async function getWorkspace(): Promise<WorkspaceView | null> {
  try {
    return await request("/intern/me/workspace", (value) => {
      const v = record(value);
      const summary = isRec(v.taskSummary) ? v.taskSummary : {};
      return {
        status: pickStr(v.status) ?? "",
        hasAssignmentHistory: v.hasAssignmentHistory === true,
        hasAssignment: v.assignment != null,
        taskSummary: {
          total: pickNum(summary.total) ?? 0,
          todo: pickNum(summary.todo) ?? 0,
          doing: pickNum(summary.doing) ?? 0,
          review: pickNum(summary.review) ?? 0,
          done: pickNum(summary.done) ?? 0,
        },
        focusedTask: v.focusedTask == null ? null : parsePreviewTask(v.focusedTask),
      };
    });
  } catch {
    /* workspace là nguồn compose — fail-soft để overview vẫn dựng được từ /tasks */
    return null;
  }
}

/** Compose InternOverview từ các endpoint contract — như màn /intern của FE thật. */
export async function getInternOverview(userName: string): Promise<InternOverview> {
  const [workspace, placement, tasks] = await Promise.all([
    getWorkspace(),
    getPlacement(),
    listMyTasks().catch(() => [] as Task[]),
  ]);

  /* Trạng thái intern: có assignment → active; hết mà từng có → finished;
   * còn lại (đang tuyển dụng/in_progress…) → waiting. */
  let internState: InternOverview["internState"] = "waiting";
  if (workspace) {
    const status = workspace.status.toLowerCase();
    if (workspace.hasAssignment) internState = "active";
    else if (status.includes("complet") || status.includes("finish")) internState = "finished";
    else if (workspace.hasAssignmentHistory) internState = "finished";
  }

  const taskSummary = workspace?.taskSummary ?? {
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
  const focusedTask = workspace?.focusedTask ?? tasks.find((t) => t.status === "doing") ?? null;
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
    internState,
    placement,
    taskSummary,
    nextTasks,
    focusedTask,
    recentActivity,
  };
}

/* ------------------------------ sprint board ------------------------------ */

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

export interface MySprint {
  id: string;
  name: string;
  goal: string | null;
  status: string | null;
  startsAt: string | null;
  endsAt: string | null;
}

const COLUMN_LABELS: Record<TaskStatus, string> = {
  todo: "Cần làm",
  doing: "Đang làm",
  review: "Chờ duyệt",
  done: "Hoàn thành",
};

function parseBoardTask(value: unknown): BoardTask {
  const v = record(value);
  return {
    id: pickStr(v.id) ?? "",
    code: pickStr(v.code) ?? (pickStr(v.id)?.slice(0, 8).toUpperCase() || "TASK"),
    title: pickStr(v.title, v.name) ?? "(không tiêu đề)",
    status: parseStatus(v.status),
    assignee: pickStr(v.assigneeName, v.assignee) ?? (isRec(v.assignee) ? pickStr(v.assignee.name, v.assignee.displayName) : null) ?? "—",
    priority: parsePriority(v.priority),
    points: pickNum(v.storyPoints, v.points) ?? 0,
  };
}

/** Tasks có thể là mảng, {data, meta} hoặc {items} — ép về mảng BoardTask. */
function parseTaskList(value: unknown): BoardTask[] {
  if (Array.isArray(value)) return value.map(parseBoardTask);
  if (isRec(value)) {
    if (Array.isArray(value.data)) return value.data.map(parseBoardTask);
    if (Array.isArray(value.items)) return value.items.map(parseBoardTask);
    if (Array.isArray(value.tasks)) return value.tasks.map(parseBoardTask);
  }
  return [];
}

function daysUntilIso(iso: string | null): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.round((t - Date.now()) / 86_400_000));
}

/** Board BE có thể trả columns dạng mảng hoặc object key→cột — defensive cả hai. */
function parseBoardColumns(value: unknown): SprintBoardView["columns"] {
  const empty = (): SprintBoardView["columns"] =>
    (["todo", "doing", "review", "done"] as TaskStatus[]).map((key) => ({
      key,
      label: COLUMN_LABELS[key],
      tasks: [] as BoardTask[],
    }));
  if (Array.isArray(value)) {
    const cols = value.map((raw) => {
      const c = record(raw);
      const key = parseStatus(c.key ?? c.status);
      return {
        key,
        label: pickStr(c.label, c.title, c.name) ?? COLUMN_LABELS[key],
        tasks: parseTaskList(c.tasks ?? c.items),
      };
    });
    /* Bổ sung cột thiếu để màn kanban luôn đủ 4 cột. */
    return empty().map((def) => {
      const found = cols.find((c) => c.key === def.key);
      return found ? { ...def, label: found.label, tasks: found.tasks } : def;
    });
  }
  if (isRec(value)) {
    return empty().map((def) => {
      const col = value[def.key];
      if (isRec(col)) {
        return { ...def, tasks: parseTaskList(col.tasks ?? col.items ?? col.data) };
      }
      if (Array.isArray(col)) return { ...def, tasks: parseTaskList(col) };
      return def;
    });
  }
  return empty();
}

function parseSprintBoard(value: unknown): SprintBoardView {
  const v = record(value);
  const sprint = isRec(v.sprint) ? v.sprint : v;
  const startsAt = pickStr(sprint.startsAt, sprint.startDate, sprint.startAt);
  const endsAt = pickStr(sprint.endsAt, sprint.endDate, sprint.endAt, sprint.dueAt);
  const name = pickStr(sprint.name, sprint.code) ?? "Sprint hiện tại";
  const week =
    pickStr(sprint.week) ??
    (startsAt && endsAt
      ? `${new Date(startsAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} – ${new Date(endsAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}`
      : "—");
  return {
    id: pickStr(sprint.id) ?? "current",
    name,
    goal: pickStr(sprint.goal, sprint.description) ?? "",
    week,
    daysLeft: pickNum(sprint.daysLeft) ?? daysUntilIso(endsAt),
    status: pickStr(sprint.status) ?? undefined,
    columns: parseBoardColumns(v.columns),
    burndown: Array.isArray(v.burndown) ? v.burndown.filter((x): x is number => typeof x === "number") : [],
  };
}

/** 404 khi chưa có assignment/sprint → lỗi rõ ràng thay vì mã máy. */
function rethrowAssignmentError(error: unknown): never {
  if (error instanceof ApiError && error.statusCode === 404) {
    throw new ApiError(404, "ASSIGNMENT_NOT_ACTIVE", "Chưa có sprint nào — chờ phân công dự án.");
  }
  throw error;
}

/** GET /intern/me/sprint/board — bảng sprint hiện tại của tôi. */
export async function getMySprintBoard(): Promise<SprintBoardView> {
  try {
    return await request("/intern/me/sprint/board?page=1&pageSize=50", parseSprintBoard);
  } catch (error) {
    rethrowAssignmentError(error);
  }
}

/** GET /intern/me/sprints/{id}/board — bảng một sprint đã chọn (kể cả planned). */
export async function getMySprintBoardById(sprintId: string): Promise<SprintBoardView> {
  try {
    return await request(
      `/intern/me/sprints/${encodeURIComponent(sprintId)}/board?page=1&pageSize=50`,
      parseSprintBoard,
    );
  } catch (error) {
    rethrowAssignmentError(error);
  }
}

/** GET /intern/me/sprints — {items} các sprint trong assignment đang hoạt động. */
export async function listMySprints(page = 1, pageSize = 50): Promise<MySprint[]> {
  return request(`/intern/me/sprints?page=${page}&pageSize=${pageSize}`, (value) => {
    const v = record(value);
    return array(v.items ?? [], (raw) => {
      const s = record(raw);
      return {
        id: pickStr(s.id) ?? "",
        name: pickStr(s.name, s.code) ?? "Sprint",
        goal: pickStr(s.goal, s.description),
        status: pickStr(s.status),
        startsAt: pickStr(s.startsAt, s.startDate),
        endsAt: pickStr(s.endsAt, s.endDate),
      };
    });
  });
}
