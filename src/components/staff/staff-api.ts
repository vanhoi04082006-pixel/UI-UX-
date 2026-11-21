"use client";
/* =====================================================================
 * STAFF API GLUE — phần keo dành riêng cho màn giảng viên / quản trị:
 *  · staffApiErrorMessage: ánh xạ ApiError → đúng chuỗi tiếng Việt mà
 *    màn hình cũ hiển thị (máy chủ mock bọc chuỗi lỗi bằng String(err)
 *    nên dính tiền tố "Error: " — lược bỏ để giữ nguyên văn bản cũ).
 *  · fetchPreviewBoard: bảng Kanban "mặc định" của giảng viên — adapter
 *    getSprintBoard() không truyền id sẽ gọi /sprints/preview-sprint/
 *    board, nhưng máy chủ mock chỉ có bảng thật theo id sprint; nên ta
 *    chốt id sprint active đầu tiên rồi ghim để reload vẫn thấy đúng
 *    bảng đó (giống hành vi dữ liệu gốc trước khi đổi lớp truy cập).
 * Không chứa UI — chỉ dữ liệu.
 * ===================================================================== */
import { ApiError } from "@/lib/api/api-client";
import { getSprintBoard, listSprints } from "@/lib/api/instructor";
import type { SprintBoard } from "@/lib/mock/types";

/** Thông điệp hiển thị cho người dùng — giữ nguyên văn bản màn cũ. */
export function staffApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const message = error.message.replace(/^Error:\s*/, "").trim();
    return message || fallback;
  }
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}

let previewBoardSprintId: string | null = null;

/** Bảng Kanban xem của giảng viên (sprint đang diễn ra, ghim sau lần đầu). */
export async function fetchPreviewBoard(): Promise<SprintBoard | null> {
  if (previewBoardSprintId) return getSprintBoard(previewBoardSprintId);
  const sprints = await listSprints();
  const target = sprints.find((s) => s.status === "active") ?? sprints[0];
  if (!target) return null;
  previewBoardSprintId = target.id;
  return getSprintBoard(target.id);
}
