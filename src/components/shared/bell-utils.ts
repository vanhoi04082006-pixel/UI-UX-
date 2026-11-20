"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { postMock } from "@/lib/use-mock";
import type { NotificationItem, Role, SessionUser } from "@/lib/mock/types";

/* =====================================================================
 * BELL UTILS — dữ liệu chuông thông báo dùng chung shell.
 *
 * Trạng thái "đã đọc" được máy chủ mock lưu bền (POST /api/mock/
 * notifications/read|unread), nên mọi thao tác đều ghi lên server rồi
 * đồng bộ lại. Shell giữ MỘT nguồn dữ liệu duy nhất qua
 * ShellNotifContext để badge sidebar "Thông báo" và badge chuông
 * dùng chung số chưa đọc.
 * ===================================================================== */

/** Màu InkBadge theo nhóm thông báo (hợp nhất bảng student + staff). */
const CATEGORY_TONE: Record<string, string> = {
  "Hệ thống": "neutral",
  "Nhiệm vụ": "blue",
  "Đánh giá": "amber",
  "KPI": "green",
  "Lương ảo": "mint",
  "Chứng nhận": "pink",
  "Phiên thực tập": "blue",
  "Tuyển dụng": "pink",
  "Người dùng": "red",
};

export function notifToneFor(category: string): string {
  return CATEGORY_TONE[category] ?? "neutral";
}

/** Điều hướng thông minh: nhóm thông báo → trang liên quan theo vai trò. */
export function notifRouteFor(role: Role, category: string): string | null {
  if (role === "intern") {
    switch (category) {
      case "Nhiệm vụ":
        return "work";
      case "Đánh giá":
        return "evaluations";
      case "KPI":
      case "Lương ảo":
        return "kpi";
      case "Chứng nhận":
        return "certificates";
      default:
        return null;
    }
  }
  if (role === "instructor") {
    switch (category) {
      case "Nhiệm vụ":
      case "Đánh giá":
        return "grading";
      case "Phiên thực tập":
        return "sessions";
      default:
        return null;
    }
  }
  return category === "Người dùng" ? "users" : null;
}

/** Thời gian tương đối tiếng Việt: "vừa xong", "5 phút trước", "hôm qua"… */
export function relativeTimeVN(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const sec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (sec < 60) return "vừa xong";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} giờ trước`;
  const day = Math.floor(hour / 24);
  if (day === 1) return "hôm qua";
  if (day < 7) return `${day} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/* ----------------------------- Shell context ----------------------------- */

export interface ShellNotifValue {
  items: NotificationItem[];
  unreadCount: number;
  /** Đánh dấu một mục đã đọc — optimistic + POST fire-and-forget. */
  markRead: (id: string) => void;
  /** Đánh dấu tất cả đã đọc → POST { all: true } → reload → toast. */
  markAllRead: () => void;
  /** Hoàn tác đã đọc cho một mục (undo). */
  markUnread: (id: string) => void;
  /** Tải lại từ máy chủ. */
  reload: () => void;
}

const noop = () => undefined;
const FALLBACK: ShellNotifValue = {
  items: [],
  unreadCount: 0,
  markRead: noop,
  markAllRead: noop,
  markUnread: noop,
  reload: noop,
};

export const ShellNotifContext = createContext<ShellNotifValue | null>(null);

/** Điểm đọc chung của shell (sidebar badge + chuông) — an toàn khi thiếu provider. */
export function useShellNotif(): ShellNotifValue {
  return useContext(ShellNotifContext) ?? FALLBACK;
}

/**
 * Nguồn dữ liệu thông báo của shell: poll 45s + visibilitychange,
 * ghi đọc/undo qua server. Tự hủy + tải lại khi đổi vai trò
 * (đăng nhập / đăng xuất).
 */
export function useShellNotifications(user: SessionUser | null): ShellNotifValue {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [reloadToken, setReloadToken] = useState(0);
  const role = user?.role ?? null;

  useEffect(() => {
    /* Đăng xuất/đổi vai trò → không poll; dữ liệu cũ bị thay ngay khi
       fetch vai trò mới về (AppShell render null khi hết user nên không
       hiển thị nhánh lỗi giữa chừng). */
    if (!role) return;
    let alive = true;
    const load = () => {
      fetch(`/api/mock/notifications?role=${role}`)
        .then((r) => r.json() as Promise<{ ok: boolean; data: NotificationItem[] }>)
        .then((json) => {
          if (alive && json.ok) setItems(json.data);
        })
        .catch(() => {
          /* fail-soft: chuông không chặn shell */
        });
    };
    load();
    const timer = setInterval(load, 45_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [role, reloadToken]);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  const markRead = useCallback(
    (id: string) => {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read: true } : i)));
      if (!role) return;
      postMock("notifications/read", { role, ids: [id] })
        .then(() => undefined)
        .catch(() => reload()); /* server-truth fallback, im lặng */
    },
    [role, reload],
  );

  const markAllRead = useCallback(() => {
    if (!role) return;
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    postMock<{ role: string; all: boolean }, { updated: number }>("notifications/read", {
      role,
      all: true,
    })
      .then(() => {
        reload();
        toast.success("Đã đánh dấu tất cả là đã đọc");
      })
      .catch(() => {
        reload();
        toast.error("Không đánh dấu được — thử lại sau.");
      });
  }, [role, reload]);

  const markUnread = useCallback(
    (id: string) => {
      if (!role) return;
      postMock("notifications/unread", { role, ids: [id] })
        .then(() => reload())
        .catch(() => undefined);
    },
    [role, reload],
  );

  const unreadCount = items.filter((i) => !i.read).length;

  return useMemo(
    () => ({ items, unreadCount, markRead, markAllRead, markUnread, reload }),
    [items, unreadCount, markRead, markAllRead, markUnread, reload],
  );
}
