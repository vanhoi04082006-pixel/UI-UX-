"use client";

import { useMemo, useState } from "react";
import {
  VArrowRight,
  VCheck,
  VCheckCheck,
  VClock,
  VHistory,
  VInbox,
} from "@/components/icons/v-icons";
import { InkButton } from "@/components/notebook/reveal";
import { InkBadge, SketchCard, formatDateVN } from "@/components/notebook/ui";
import {
  notifRouteFor,
  notifToneFor,
  relativeTimeVN,
  useShellNotif,
} from "@/components/shared/bell-utils";
import { Switch } from "@/components/ui/switch";
import type { NotificationItem, Role } from "@/lib/mock/types";
import { routeLabel, useApp } from "@/lib/store";
import { useApi } from "@/lib/use-api";
import { listNotifications } from "@/lib/api/outcomes";
import { cn } from "@/lib/utils";
import { ChipGroup, EmptyState, PencilLines, SectionError, StaffPageHeader } from "./staff-kit";

/* =====================================================================
 * THÔNG BÁO — dùng chung cho Giảng viên & Quản trị viên.
 *
 * Trạng thái "đã đọc" giờ ghi lên máy chủ mock (POST notifications/
 * read|unread) và dùng chung nguồn với chuông shell — badge sidebar,
 * badge chuông và trang này cùng đọc một dữ liệu (ShellNotifContext).
 * ===================================================================== */

/** Nhãn ngày: Hôm nay / Hôm qua / ngày cụ thể. */
function dayLabel(iso: string): string {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round(
    (startOfDay(new Date()) - startOfDay(new Date(iso))) / 86_400_000,
  );
  if (diff <= 0) return "Hôm nay";
  if (diff === 1) return "Hôm qua";
  return `Ngày ${formatDateVN(iso)}`;
}

function NotificationRow({
  item,
  routeHint,
  onOpen,
  onMarkRead,
  onMarkUnread,
}: {
  item: NotificationItem;
  routeHint: string | null;
  onOpen: (item: NotificationItem) => void;
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
}) {
  return (
    <li
      className={cn(
        "group relative rounded-[10px_12px_10px_12px] border-2 transition-all",
        item.read
          ? "border-transparent opacity-75 hover:bg-[var(--paper-raised)] hover:opacity-100"
          : "border-[color-mix(in_srgb,var(--ink)_28%,transparent)] border-l-4 border-l-[var(--royal)] bg-[color-mix(in_srgb,var(--blue-mist)_60%,transparent)]",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="focus-ink block w-full rounded-[inherit] px-4 py-3.5 pr-14 text-left"
      >
        <span className="flex flex-wrap items-center gap-2">
          <InkBadge
            tone={notifToneFor(item.category)}
            className="!px-2 !text-[0.62rem]"
          >
            {item.category}
          </InkBadge>
          {!item.read && (
            <span
              className="ws-dot"
              style={{ background: "var(--royal)", borderColor: "transparent" }}
              aria-hidden="true"
            />
          )}
          <span className="tabular ml-auto inline-flex items-center gap-1 text-[0.7rem] text-[var(--ink-soft)]">
            <VClock size={12} aria-hidden="true" />
            {relativeTimeVN(item.at)}
          </span>
        </span>
        <span className="mt-1.5 block text-sm font-bold leading-snug text-[var(--ink)]">
          {item.title}
        </span>
        <span className="mt-1 block text-[0.82rem] leading-relaxed text-[var(--ink-soft)]">
          {item.body}
        </span>
        {routeHint && (
          <span className="mt-2 inline-flex items-center gap-1 text-[0.7rem] font-bold text-[var(--royal)]">
            Mở {routeHint} <VArrowRight size={12} aria-hidden="true" />
          </span>
        )}
      </button>
      {item.read ? (
        /* Hoàn tác — hiện khi rê chuột / tập trung vào hàng */
        <button
          type="button"
          onClick={() => onMarkUnread(item.id)}
          aria-label={`Hoàn tác trạng thái chưa đọc cho "${item.title}"`}
          title="Hoàn tác — về chưa đọc"
          className="focus-ink absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--ink-soft)] opacity-0 transition-all hover:-translate-y-0.5 hover:text-[var(--royal)] group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
        >
          <VHistory size={14} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onMarkRead(item.id)}
          aria-label={`Đánh dấu "${item.title}" là đã đọc`}
          title="Đánh dấu đã đọc"
          className="focus-ink absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--ink-soft)] transition-all hover:-translate-y-0.5 hover:text-[var(--success)]"
        >
          <VCheck size={14} />
        </button>
      )}
    </li>
  );
}

export default function StaffNotifications() {
  const user = useApp((s) => s.user);
  const navigate = useApp((s) => s.navigate);
  const role: Role = user?.role ?? "instructor";

  /* Nguồn chung của shell (badge chuông + sidebar) — POST đọc/undo lên server. */
  const shell = useShellNotif();

  /* useApi làm nền: skeleton/lỗi khi vào thẳng trang trong lúc shell chưa tải
     xong dữ liệu của vai trò này (đổi vai trò → tự tải lại). */
  const { data, loading, error, reload } = useApi<NotificationItem[]>(
    () => listNotifications(),
    [role],
  );

  /* Ghi đè hiển thị tức thời — mọi thao tác đều ghi server rồi đồng bộ lại. */
  const [readOverrides, setReadOverrides] = useState<Record<string, boolean>>({});
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [category, setCategory] = useState<string>("all");

  const items = useMemo(() => {
    const base = shell.items.length > 0 ? shell.items : (data ?? []);
    return base.map((i) =>
      readOverrides[i.id] === undefined ? i : { ...i, read: readOverrides[i.id] },
    );
  }, [shell.items, data, readOverrides]);

  const unreadCount = items.filter((i) => !i.read).length;
  const shellReady = shell.items.length > 0;

  const categoryOptions = useMemo(() => {
    const cats = Array.from(new Set(items.map((i) => i.category)));
    return [{ value: "all", label: "Tất cả" }, ...cats.map((c) => ({ value: c, label: c }))];
  }, [items]);

  const filtered = useMemo(
    () =>
      items
        .filter((i) => {
          if (category !== "all" && i.category !== category) return false;
          if (onlyUnread && i.read) return false;
          return true;
        })
        .sort((a, b) => +new Date(b.at) - +new Date(a.at)),
    [items, category, onlyUnread],
  );

  /** Nhóm theo ngày, giữ thứ tự xuất hiện đầu tiên. */
  const groups = useMemo(() => {
    const map = new Map<string, NotificationItem[]>();
    for (const item of filtered) {
      const key = dayLabel(item.at);
      const bucket = map.get(key) ?? [];
      bucket.push(item);
      map.set(key, bucket);
    }
    return Array.from(map.entries()).map(([key, list]) => ({ key, items: list }));
  }, [filtered]);

  /* Ghi một mục đã đọc — optimistic + POST server (đồng bộ badge chuông). */
  const markRead = (id: string) => {
    setReadOverrides((prev) => ({ ...prev, [id]: true }));
    shell.markRead(id);
  };

  /* Hoàn tác về chưa đọc — POST unread rồi shell tự tải lại. */
  const markUnread = (id: string) => {
    setReadOverrides((prev) => ({ ...prev, [id]: false }));
    shell.markUnread(id);
  };

  /* Đọc tất cả — POST { all: true } lên server, bell-utils tự toast. */
  const markAllRead = () => {
    const next: Record<string, boolean> = {};
    for (const item of items) next[item.id] = true;
    setReadOverrides(next);
    shell.markAllRead();
  };

  const openItem = (item: NotificationItem) => {
    markRead(item.id);
    const route = notifRouteFor(role, item.category);
    if (route) navigate(route);
  };

  /* Trạng thái chờ — chỉ hiện khi shell chưa kịp tải và useApi cũng chưa có dữ liệu */
  if (!shellReady && loading && !data) {
    return (
      <div>
        <StaffPageHeader eyebrow="Hộp thư" title="Thông báo" />
        <SketchCard hover={false} className="p-5">
          <PencilLines rows={6} />
        </SketchCard>
      </div>
    );
  }

  if (!shellReady && (error || !data)) {
    return <SectionError message={error ?? "Chưa tải được hộp thư."} onRetry={reload} />;
  }

  return (
    <div>
      <StaffPageHeader
        eyebrow="Hộp thư"
        title="Thông báo"
        meta={`Đồng bộ với chuông hệ thống · ${items.length} thông báo`}
        actions={
          <InkButton
            variant="outline"
            size="sm"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            <VCheckCheck size={15} /> Đánh dấu tất cả đã đọc
          </InkButton>
        }
      />

      {/* Thanh công cụ */}
      <SketchCard hover={false} className="mb-5 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <label
              htmlFor="only-unread-switch"
              className="flex cursor-pointer select-none items-center gap-2.5 text-sm font-bold text-[var(--ink)]"
            >
              <Switch
                id="only-unread-switch"
                checked={onlyUnread}
                onCheckedChange={setOnlyUnread}
                aria-label="Chỉ xem thông báo chưa đọc"
              />
              Chỉ chưa đọc
            </label>
            <InkBadge tone="amber" className="tabular !text-[0.65rem]">
              {unreadCount} chưa đọc
            </InkBadge>
          </div>
          <p className="tabular text-xs text-[var(--ink-soft)]">
            {filtered.length}/{items.length} thông báo đang hiển thị
          </p>
        </div>
        <div className="mt-3 border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_20%,transparent)] pt-3">
          <ChipGroup
            ariaLabel="Lọc theo nhóm thông báo"
            options={categoryOptions}
            value={category}
            onChange={setCategory}
          />
        </div>
      </SketchCard>

      {/* Danh sách theo ngày */}
      {items.length === 0 ? (
        <SketchCard hover={false}>
          <EmptyState
            icon={VInbox}
            title="Hộp thư trống ✎"
            note="Chưa có thông báo nào gửi tới bạn — yên tâm làm việc thôi."
          />
        </SketchCard>
      ) : filtered.length === 0 ? (
        <SketchCard hover={false}>
          <EmptyState
            icon={VInbox}
            title="Không có thông báo nào khớp bộ lọc ✎"
            note="Thử tắt chế độ 'Chỉ chưa đọc' hoặc chọn nhóm Tất cả."
          />
        </SketchCard>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.key} aria-label={`Thông báo ${group.key}`}>
              <div className="mb-2.5 flex items-center gap-3">
                <h2 className="font-hand text-lg leading-none text-[var(--ink)]">
                  {group.key}
                </h2>
                <span className="tabular text-xs text-[var(--ink-soft)]">
                  {group.items.length} mục
                </span>
                <span
                  aria-hidden="true"
                  className="h-0 flex-1 border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_20%,transparent)]"
                />
              </div>
              <ul className="space-y-2.5">
                {group.items.map((item) => {
                  const route = notifRouteFor(role, item.category);
                  return (
                    <NotificationRow
                      key={item.id}
                      item={item}
                      routeHint={route ? routeLabel(role, route) : null}
                      onOpen={openItem}
                      onMarkRead={markRead}
                      onMarkUnread={markUnread}
                    />
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
