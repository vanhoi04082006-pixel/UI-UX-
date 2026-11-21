/* Nhãn hiển thị tiếng Việt cho trạng thái phiên / sprint
 * (tách từ thư mục mock cũ — dùng chung cho các màn hình staff). */
import type { SessionStatus, SprintStatus } from "@/lib/types";

export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  active: "Đang diễn ra",
  upcoming: "Sắp khởi động",
  ending: "Sắp kết thúc",
  closed: "Đã hoàn thành",
  cancelled: "Đã hủy",
};

export const SPRINT_STATUS_LABEL: Record<SprintStatus, string> = {
  planned: "Đã lập kế hoạch",
  active: "Đang diễn ra",
  completed: "Đã hoàn thành",
  cancelled: "Đã hủy",
};

export function sessionStatusLabel(status: SessionStatus): string {
  return SESSION_STATUS_LABEL[status] ?? status;
}

export function sprintStatusLabel(status: SprintStatus): string {
  return SPRINT_STATUS_LABEL[status] ?? status;
}
