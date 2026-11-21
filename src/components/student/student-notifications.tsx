"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { listNotifications, markNotificationsRead, markNotificationsUnread } from "@/lib/api/outcomes";
import { useApi } from "@/lib/use-api";
import type { NotificationCategory, NotificationItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { InkBadge, formatDateTimeVN } from "@/components/notebook/ui";
import { FadeIn, InkButton } from "@/components/notebook/reveal";
import {
  VArrowRight,
  VCheck,
  VCheckCheck,
  VHistory,
  VInbox,
} from "@/components/icons/v-icons";
import { notifRouteFor, notifToneFor, relativeTimeVN, useShellNotif } from "@/components/shared/bell-utils";
import { ErrorPanel, LoadingPanel, PageHeading } from "./nb-kit-5c2";

/* =====================================================================
 * THÔNG BÁO — hộp thư sinh viên, nhóm theo ngày, điều hướng nhanh.
 * Trạng thái "đã đọc" ghi lên BE (POST notifications/read |
 * unread) qua ShellNotifContext — badge chuông sidebar dùng chung số
 * chưa đọc, cập nhật ngay khi thao tác ở đây.
 * ====================================================================== */

function dayLabel(iso: string) {
  const d = new Date(iso);
  const d0 = new Date(d);
  d0.setHours(0, 0, 0, 0);
  const n0 = new Date();
  n0.setHours(0, 0, 0, 0);
  const diff = Math.round((n0.getTime() - d0.getTime()) / 86_400_000);
  if (diff === 0) return "Hôm nay";
  if (diff === 1) return "Hôm qua";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function NotifRow({
  n,
  read,
  onMarkRead,
  onMarkUnread,
  onOpen,
  route,
}: {
  n: NotificationItem;
  read: boolean;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onOpen: (route: string) => void;
  route: string | null;
}) {
  const tone = notifToneFor(n.category);
  const unread = !read;
  const linked = !!route;
  return (
    <li className="group relative">
      <article
        onClick={linked ? () => onOpen(route!) : undefined}
        onKeyDown={(e) => {
          if (linked && e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onOpen(route!);
          }
        }}
        role={linked ? "link" : undefined}
        tabIndex={linked ? 0 : undefined}
        aria-label={linked ? `${n.title} — mở trang liên quan` : undefined}
        className={cn(
          "sketch-border-thin rounded-[10px] p-3.5 pl-4 pr-12 shadow-ink-2 transition-all duration-150 hover:-translate-y-0.5",
          linked &&
            "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]",
          unread
            ? "border-l-4 border-l-[var(--royal)] bg-[var(--blue-mist)]/60"
            : "bg-[var(--paper-raised)] opacity-75",
        )}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <InkBadge tone={tone}>{n.category}</InkBadge>
              {unread && (
                <span
                  role="img"
                  aria-label="Chưa đọc"
                  className="ws-dot shrink-0"
                  style={{ background: "var(--royal)", borderColor: "var(--royal)" }}
                />
              )}
              <h3 className="text-[0.88rem] font-bold leading-snug">{n.title}</h3>
            </div>
            <p className="mt-1.5 text-[0.8rem] leading-relaxed text-[var(--ink-soft)]">{n.body}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="tabular text-[0.7rem] text-[var(--ink-faint)]" title={formatDateTimeVN(n.at)}>
                {relativeTimeVN(n.at)}
              </p>
              {route && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(route);
                  }}
                  className="focus-ink inline-flex items-center gap-1 rounded-md text-[0.72rem] font-bold text-[var(--royal)] hover:underline"
                >
                  Xem chi tiết <VArrowRight size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
            {unread ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkRead();
                }}
                aria-label={`Đánh dấu thông báo "${n.title}" là đã đọc`}
                title="Đánh dấu đã đọc"
                className="focus-ink grid size-8 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--success)] shadow-ink-2 transition-all hover:-translate-y-0.5 hover:bg-[var(--blue-mist)]"
              >
                <VCheck size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkUnread();
                }}
                aria-label={`Hoàn tác đã đọc cho thông báo "${n.title}"`}
                title="Hoàn tác đã đọc"
                className="focus-ink grid size-8 shrink-0 place-items-center rounded-full border-2 border-[color-mix(in_srgb,var(--ink)_35%,transparent)] bg-[var(--paper-raised)] text-[var(--ink-soft)] opacity-0 shadow-ink-2 transition-all group-hover:opacity-100 hover:-translate-y-0.5 hover:text-[var(--royal)] focus-visible:opacity-100"
              >
                <VHistory size={14} />
              </button>
            )}
          </div>
        </div>
      </article>
    </li>
  );
}

export default function StudentNotifications() {
  const navigate = useApp((s) => s.navigate);
  const user = useApp((s) => s.user);
  const role = user?.role ?? "intern";
  /* Dữ liệu + trạng thái tải/lỗi của riêng trang này. */
  const { data, loading, error, reload } = useApi<NotificationItem[]>(
    () => listNotifications(),
    [],
  );
  /* Hành động đọc/undo ghi lên máy chủ — badge chuông sidebar ăn theo. */
  const shellNotif = useShellNotif();
  const [unreadOnly, setUnreadOnly] = useState(false);
  /* Lớp phủ optimistic: readIds (vừa đánh dấu đọc) / unreadIds (vừa hoàn tác). */
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set<string>());
  const [unreadIds, setUnreadIds] = useState<Set<string>>(() => new Set<string>());

  const items = useMemo(
    () => [...(data ?? [])].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
    [data],
  );

  const isRead = (n: NotificationItem) =>
    unreadIds.has(n.id) ? false : n.read || readIds.has(n.id);
  const unreadCount = items.filter((n) => !isRead(n)).length;
  const shown = unreadOnly ? items.filter((n) => !isRead(n)) : items;

  const groups = useMemo(() => {
    const map = new Map<string, NotificationItem[]>();
    for (const n of shown) {
      const key = dayLabel(n.at);
      const arr = map.get(key) ?? [];
      arr.push(n);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [shown]);

  const markRead = (id: string) => {
    setUnreadIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    /* Ghi đọc lên máy chủ hợp đồng (fire-and-forget như cũ) — giữ nhánh
     * shellNotif để badge chuông/sidebar đồng bộ theo nguồn của shell. */
    markNotificationsRead([id]).catch(() => undefined);
    shellNotif.markRead(id);
  };

  const markUnread = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setUnreadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    markNotificationsUnread([id]).catch(() => undefined);
    shellNotif.markUnread(id);
    toast.info("Đã hoàn tác — thông báo lại thành chưa đọc");
  };

  const markAll = () => {
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const n of items) next.add(n.id);
      return next;
    });
    setUnreadIds(new Set());
    markNotificationsRead(undefined, true).catch(() => undefined);
    shellNotif.markAllRead();
  };

  /* Làm mới lớp phủ sau khi máy chủ ghi nhận — dữ liệu cũ vẫn còn hợp lệ. */
  const refetch = () => {
    setReadIds(new Set());
    setUnreadIds(new Set());
    reload();
    shellNotif.reload();
  };

  return (
    <div>
      <PageHeading
        eyebrow="Tài khoản"
        title="Thông báo"
        sub="Mọi biến động trong hành trình của bạn — nhiệm vụ, đánh giá, KPI, lương ảo và chứng nhận."
      />

      {/* Thanh công cụ */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={unreadOnly}
          onClick={() => setUnreadOnly((v) => !v)}
          className="focus-ink flex items-center gap-2.5 rounded-full py-0.5 pr-1"
        >
          <span
            className={cn(
              "relative h-6 w-11 shrink-0 rounded-full border-2 border-[var(--ink)] transition-colors duration-200",
              unreadOnly ? "bg-[var(--royal)]" : "bg-[var(--paper-raised)]",
            )}
          >
            <span
              className={cn(
                "absolute top-1/2 size-[15px] -translate-y-1/2 rounded-full border-2 border-[var(--ink)] bg-white transition-all duration-200",
                unreadOnly ? "left-[calc(100%-22px)]" : "left-[3px]",
              )}
            />
          </span>
          <span className="text-[0.8rem] font-bold">Chỉ chưa đọc</span>
        </button>

        <InkBadge tone="amber" dot={unreadCount > 0}>
          <span className="tabular">{unreadCount}</span> chưa đọc
        </InkBadge>

        <span className="flex-1" />

        <InkButton variant="ghost" size="sm" onClick={refetch} title="Tải lại hộp thư">
          <VHistory size={15} /> Làm mới
        </InkButton>

        <InkButton variant="outline" size="sm" onClick={markAll} disabled={unreadCount === 0}>
          <VCheckCheck size={15} /> Đánh dấu tất cả đã đọc
        </InkButton>
      </div>

      {loading && <LoadingPanel rows={4} label="Đang mở hộp thư..." />}

      {!loading && error && <ErrorPanel message={error} onRetry={reload} />}

      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <span className="grid size-16 place-items-center rounded-[14px_16px_14px_16px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--ink-soft)] shadow-ink-3">
            <VInbox size={30} />
          </span>
          <p className="font-hand text-2xl">Hộp thư trống — một ngày yên bình ✎</p>
        </div>
      )}

      {!loading && !error && items.length > 0 && shown.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="grid size-14 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--note-mint)] text-[var(--note-mint-ink)]">
            <VCheckCheck size={26} />
          </span>
          <p className="font-hand text-2xl">Đã đọc hết — không còn gì chưa đọc ✎</p>
          <InkButton variant="ghost" size="sm" onClick={() => setUnreadOnly(false)}>
            Xem tất cả thông báo
          </InkButton>
        </div>
      )}

      {!loading && !error && groups.length > 0 && (
        <FadeIn>
          <div className="space-y-6">
            {groups.map(([label, groupItems]) => (
              <section key={label} aria-label={`Nhóm thông báo: ${label}`}>
                <div className="sticky top-16 z-20 flex items-center gap-3 bg-[var(--paper)] py-2">
                  <p className="eyebrow shrink-0">{label}</p>
                  <span
                    aria-hidden="true"
                    className="h-0 flex-1 border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)]"
                  />
                  <p className="tabular shrink-0 text-[0.68rem] font-bold text-[var(--ink-faint)]">
                    {groupItems.length}
                  </p>
                </div>
                <ul className="space-y-2.5">
                  {groupItems.map((n) => (
                    <NotifRow
                      key={n.id}
                      n={n}
                      read={isRead(n)}
                      onMarkRead={() => markRead(n.id)}
                      onMarkUnread={() => markUnread(n.id)}
                      onOpen={navigate}
                      route={notifRouteFor(role as "intern", n.category as NotificationCategory)}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </FadeIn>
      )}
    </div>
  );
}
