/* =====================================================================
 * V-INTERN DOMAIN TYPES — hợp đồng dữ liệu dùng chung toàn app FE.
 * (Tách từ thư mục mock cũ khi loại bỏ mock khỏi hệ thống — production
 * chỉ gọi BE thật qua NEXT_PUBLIC_API_BASE_URL.)
 * ===================================================================== */

export type Role = "intern" | "instructor" | "admin";
export type InternState = "active" | "waiting" | "finished";
export type AccountStatus = "active" | "locked";

/* Trạng thái phiên thực tập — codex: thêm ending (sắp kết thúc)
 * và cancelled (đã hủy) cho hành động vòng đời phiên. */
export type SessionStatus = "active" | "upcoming" | "ending" | "closed" | "cancelled";

/* Trạng thái sprint — vòng đời planned → active → completed/cancelled. */
export type SprintStatus = "planned" | "active" | "completed" | "cancelled";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  title: string;
  initials: string;
  internState?: InternState;
  mustChangePassword?: boolean;
}

/* ------------------------------ INTERN ------------------------------ */

export type TaskStatus = "todo" | "doing" | "review" | "done";
export type Priority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  code: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  sprint: string;
  points: number;
  progress: number;
  dueDate: string;
  description: string;
  acceptance: string[];
  history: { at: string; label: string }[];
}

export interface InternOverview {
  greeting: string;
  userName: string;
  internState: InternState;
  placement: {
    project: string;
    projectCode: string;
    session: string;
    sprint: string;
    sprintStatus: string;
    progressPct: number;
    weekLabel: string;
  } | null;
  taskSummary: { total: number; todo: number; doing: number; review: number; done: number };
  nextTasks: Task[];
  focusedTask: Task | null;
  recentActivity: { at: string; label: string; kind: string }[];
}

export interface Evaluation {
  id: string;
  sprint: string;
  instructor: string;
  aiScore: number;
  finalScore: number;
  comment: string;
  /** Tiêu chí chấm — điểm luôn hiển thị dạng "score / max";
   * weight (trọng số %) tùy chọn khi kỳ có khai báo (codex: criterion weight). */
  criteria: { label: string; score: number; max: number; weight?: number }[];
  finalizedAt: string;
}

export interface KpiMetric {
  code: string;
  label: string;
  value: number;
  display: string;
  weight: number;
  contribution: number;
}

export interface KpiRecord {
  id: string;
  period: string;
  score: number;
  ruleVersion: string;
  calculatedAt: string;
  metrics: KpiMetric[];
}

export interface SalaryEntry {
  id: string;
  at: string;
  type: "KPI" | "Thưởng" | "Điều chỉnh";
  amount: number;
  note: string;
  /** Kỳ KPI mà giao dịch này thuộc về (vd "Sprint 2 · Tuần 3–4").
   * Codex fix: tách bạch số dư toàn cục và thu nhập theo kỳ. */
  period?: string;
}

export interface Certificate {
  id: string;
  code: string;
  project: string;
  session: string;
  issuedAt: string;
  verifyCode: string;
  status: "valid" | "revoked";
}

export interface MentorMessage {
  id: string;
  from: "ai" | "me";
  text: string;
  at: string;
}

export interface MentorConversation {
  id: string;
  title: string;
  archived: boolean;
  messages: MentorMessage[];
}

/* ---------------------------- INSTRUCTOR ---------------------------- */

/** Thành viên phiên kèm trạng thái phân công — codex: assignment completion. */
export interface SessionMember {
  name: string;
  email: string;
  assignmentStatus: "active" | "completed";
}

export interface InstructorSession {
  id: string;
  code: string;
  project: string;
  members: number;
  memberNames: string[];
  /** Chi tiết thành viên (email + trạng thái phân công) — codex đồng bộ. */
  memberDetails: SessionMember[];
  sprint: string;
  sprintStatus: string;
  progress: number;
  startDate: string;
  endDate: string;
  status: SessionStatus;
}

/** Sprint của phiên — vòng đời đầy đủ (codex: sprint lifecycle actions). */
export interface Sprint {
  id: string;
  sessionId: string;
  name: string;
  goal: string;
  startsAt: string;
  endsAt: string;
  status: SprintStatus;
  totalTasks: number;
  openTasks: number;
}

export interface SprintBoardTask {
  id: string;
  code: string;
  title: string;
  status: TaskStatus;
  assignee: string;
  priority: Priority;
  points: number;
}

export interface SprintBoard {
  id: string;
  name: string;
  goal: string;
  week: string;
  daysLeft: number;
  /** Trạng thái sprint hiện của bảng (đồng bộ từ vòng đời sprint). */
  status?: SprintStatus;
  columns: { key: TaskStatus; label: string; tasks: SprintBoardTask[] }[];
  burndown: number[];
}

export interface GradingItem {
  id: string;
  taskCode: string;
  taskTitle: string;
  student: string;
  submittedAt: string;
  aiScore: number;
  /** Điểm chính thức giảng viên chốt (chỉ có ở bài đã duyệt). */
  finalScore?: number;
  prLink: string;
  status: "pending" | "approved" | "changes";
  notes: string;
}

export interface ReportRow {
  id: string;
  period: string;
  scope: string;
  avgScore: number;
  completion: number;
  kpiAvg: number;
  students: number;
}

/* ------------------------------- ADMIN ------------------------------ */

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  /** BE thật không trả role trong danh sách — null khi không xác định. */
  role: Role | null;
  status: AccountStatus | "pending";
  createdAt: string;
  lastActive: string;
}

export interface QuestionRow {
  id: string;
  code: string;
  role: string;
  content: string;
  difficulty: "Dễ" | "Vừa" | "Khó";
  type: string;
  status: "Đang dùng" | "Bản nháp" | "Ngưng";
}

export interface TemplateRow {
  id: string;
  code: string;
  name: string;
  domain: string;
  description: string;
  blueprints: number;
  tasks: number;
  status: "Công khai" | "Nội bộ";
}

export interface ActivityItem {
  id: string;
  module: string;
  label: string;
  at: string;
  ok: boolean;
}

/* --------------------------- NOTIFICATIONS -------------------------- */

export type NotificationCategory =
  | "Hệ thống"
  | "Nhiệm vụ"
  | "Đánh giá"
  | "KPI"
  | "Lương ảo"
  | "Chứng nhận"
  | "Phiên thực tập"
  | "Tuyển dụng"
  | "Người dùng";

export interface NotificationItem {
  id: string;
  role: Role;
  category: NotificationCategory;
  title: string;
  body: string;
  at: string;
  read: boolean;
}
