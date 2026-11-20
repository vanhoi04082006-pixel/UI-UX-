"use client";

import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { VBell, VCheckCheck, VInbox } from "@/components/icons/v-icons";
import { InkBadge } from "@/components/notebook/ui";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/store";
import type { NotificationItem } from "@/lib/mock/types";
import { notifRouteFor, notifToneFor, relativeTimeVN, useShellNotif } from "./bell-utils";

/* =====================================================================
 * Chuông thông báo — dữ liệu server-persisted qua ShellNotifContext
 * (shell là chủ sở hữu state: poll 45s + visibilitychange, POST
 * read/unread lên mock API). Badge sidebar "Thông báo" dùng chung
 * unreadCount từ context này.
 * ===================================================================== */
export function NotificationBell() {
  const user = useApp((s) => s.user);
  const navigate = useApp((s) => s.navigate);
  const { items, unreadCount, markRead, markAllRead } = useShellNotif();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const bobControls = useAnimationControls();

  /* 6 mục mới nhất, mới lên trên */
  const latest = useMemo(
    () => [...items].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 6),
    [items],
  );

  /* Bob nhẹ khi có thông báo CHƯA ĐỌC MỚI đến (so sánh với lần trước) —
     điều khiển imperatively qua AnimationControls, không cần state. */
  const prevUnread = useRef(unreadCount);
  useEffect(() => {
    const grew = unreadCount > prevUnread.current;
    prevUnread.current = unreadCount;
    if (!grew || reduced) return;
    void bobControls.start({
      y: [0, -5, 0, -3, 0],
      transition: { duration: 0.85, ease: "easeInOut" },
    });
  }, [unreadCount, reduced, bobControls]);

  /* Đóng khi click ngoài hoặc Esc */
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const label = unreadCount > 99 ? "99+" : String(unreadCount);

  const openItem = (item: NotificationItem) => {
    markRead(item.id); /* fire-and-forget POST lên server */
    setOpen(false);
    const target = user ? notifRouteFor(user.role, item.category) : null;
    navigate(target ?? "notifications");
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unreadCount ? `Thông báo — ${unreadCount} mục chưa đọc` : "Thông báo"}
        aria-expanded={open}
        className="focus-ink group relative inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--ink)] shadow-ink-2 transition-all hover:-translate-y-0.5 hover:shadow-ink-3"
      >
        <motion.span animate={bobControls} className="inline-flex">
          <motion.span
            animate={open && !reduced ? { rotate: [0, -18, 14, -9, 6, 0] } : { rotate: 0 }}
            transition={{ duration: 0.55 }}
            className="inline-flex"
          >
            <VBell size={19} className="transition-transform group-hover:rotate-[8deg]" />
          </motion.span>
        </motion.span>
        {unreadCount > 0 && (
          <span
            key={unreadCount}
            className="animate-pop-in absolute -right-1 -top-1 grid min-w-[20px] place-items-center rounded-full border border-[var(--ink)] bg-[var(--royal)] px-1 text-[10px] font-bold tabular text-white dark:text-[#101018]"
            style={{ boxShadow: "0 0 0 2px var(--paper)" }}
          >
            {label}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(92vw,360px)] overflow-hidden rounded-[12px_14px_12px_14px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4"
            role="dialog"
            aria-label="Thông báo mới nhất"
          >
            <div className="flex items-center justify-between gap-2 border-b-2 border-[var(--ink)] bg-[var(--blue-mist)] px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <p className="text-sm font-bold">Hộp thư</p>
                {unreadCount > 0 && (
                  <InkBadge tone="blue" className="shrink-0 px-2 py-0 text-[0.62rem]">
                    <span className="tabular">{unreadCount}</span> chưa đọc
                  </InkBadge>
                )}
              </div>
              <button
                type="button"
                onClick={markAllRead}
                disabled={unreadCount === 0}
                className="focus-ink inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-[var(--royal)] transition-colors hover:bg-[var(--paper)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <VCheckCheck size={14} /> Đọc tất cả
              </button>
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {latest.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className={cn(
                      "focus-ink block w-full px-4 py-3 text-left transition-colors hover:bg-[var(--blue-mist)]",
                      item.read
                        ? "opacity-70"
                        : "bg-[color-mix(in_srgb,var(--blue-mist)_55%,transparent)]",
                    )}
                  >
                    <span className="mb-1 flex items-center gap-2">
                      <InkBadge tone={notifToneFor(item.category)} className="px-2 py-0 text-[0.62rem]">
                        {item.category}
                      </InkBadge>
                      {!item.read && (
                        <span
                          role="img"
                          aria-label="Chưa đọc"
                          className="ws-dot shrink-0"
                          style={{ background: "var(--royal)", borderColor: "transparent" }}
                        />
                      )}
                    </span>
                    <span className="block truncate text-[0.82rem] font-semibold leading-snug">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--ink-soft)]">
                      {relativeTimeVN(item.at)}
                    </span>
                  </button>
                </li>
              ))}
              {latest.length === 0 && (
                <li className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                  <VInbox size={30} className="text-[var(--ink-soft)]" aria-hidden="true" />
                  <p className="font-hand text-[0.95rem] text-[var(--ink-soft)]">
                    Chưa có gì mới trong hộp thư cả — yên tâm làm việc thôi! ✎
                  </p>
                </li>
              )}
            </ul>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate("notifications");
              }}
              className="block w-full border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_25%,transparent)] py-2.5 text-center text-xs font-bold text-[var(--royal)] hover:bg-[var(--blue-mist)]"
            >
              Xem tất cả thông báo →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
