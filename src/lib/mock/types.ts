/* =====================================================================
 * V-INTERN MOCK TYPES — hợp đồng dữ liệu dùng chung FE/BE mock.
 * ===================================================================== */

export type Role = "intern" | "instructor" | "admin";
export type InternState = "active" | "waiting" | "finished";
export type AccountStatus = "active" | "locked";

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

export interface MockAccount {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  status: AccountStatus;
  title: string;
  internState?: InternState;
  /** true → sau đăng nhập phải đổi mật khẩu mặc định trước khi dùng tiếp. */
  mustChangePassword?: boolean;
  note: string;
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
  criteria: { label: string; score: number; max: number }[];
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

export interface InstructorSession {
  id: string;
  code: string;
  project: string;
  members: number;
  memberNames: string[];
  sprint: string;
  sprintStatus: string;
  progress: number;
  startDate: string;
  endDate: string;
  status: "active" | "upcoming" | "closed";
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
  role: Role;
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

export interface ApiEnvelope<T> {
  ok: boolean;
  data: T;
  message?: string;
}
