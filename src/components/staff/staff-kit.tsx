"use client";

import { animate, useReducedMotion } from "framer-motion";
import {
  useEffect,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { VAlert, VRefresh, type VIconComponent } from "@/components/icons/v-icons";
import { InkButton } from "@/components/notebook/reveal";
import { Eyebrow, MarginNote, SketchCard, formatDateTimeVN } from "@/components/notebook/ui";
import type { Role } from "@/lib/mock/types";
import { cn } from "@/lib/utils";

/* =====================================================================
 * STAFF-KIT — mảnh UI dùng chung cho các trang Giảng viên & Quản trị.
 * Gói nhẹ, không quản state riêng, dùng ngay trong JSX trang.
 * ===================================================================== */

/** Nhãn + màu badge chuẩn theo vai trò. */
export const ROLE_META: Record<Role, { label: string; tone: string }> = {
  intern: { label: "Sinh viên", tone: "blue" },
  instructor: { label: "Giảng viên", tone: "amber" },
  admin: { label: "Quản trị", tone: "red" },
};

/** Chữ cái viết tắt từ họ tên (lấy 2 chữ cuối). */
export function initialsOf(name: string): string {
  const words = name.split(" ").filter((w) => /[a-zA-ZÀ-ỹ]/.test(w[0] ?? ""));
  return words
    .slice(-2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Thời gian tương đối tiếng Việt — quá 7 ngày thì rơi về ngày giờ cụ thể. */
export function relativeVN(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return formatDateTimeVN(iso);
}

/** Header chuẩn các trang staff: eyebrow + H1 + mô tả + ghi chú lề + nút hành động. */
export function StaffPageHeader({
  eyebrow,
  title,
  sub,
  note,
  meta,
  actions,
  icon: Icon,
  className,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  note?: string;
  meta?: string;
  actions?: ReactNode;
  /** Icon trang trí (tùy chọn) — tile mực đặt trước tiêu đề. */
  icon?: VIconComponent;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-wrap items-start justify-between gap-x-4 gap-y-3",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3.5">
        {Icon && (
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px_14px_11px_13px] border-2 border-[var(--ink)] bg-[var(--blue-mist)] text-[var(--royal)]"
            aria-hidden="true"
          >
            <Icon size={20} />
          </span>
        )}
        <div className="min-w-0">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--ink)] sm:text-[1.75rem]">
            {title}
          </h1>
          {sub && <p className="mt-1.5 text-sm text-[var(--ink-soft)]">{sub}</p>}
          {note && <MarginNote className="mt-2">{note}</MarginNote>}
          {meta && (
            <p className="mt-2.5 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-[var(--ink-soft)]">
              {meta}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Hạt chọn lọc kiểu chip — chọn duy nhất một giá trị. */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("flex flex-wrap items-center gap-1.5", className)}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "focus-ink sketch-border-thin px-3 py-1.5 text-xs font-bold transition-all",
              active
                ? "border-[var(--ink)] bg-[var(--royal)] text-white shadow-ink-2 dark:text-[#101018]"
                : "border-[color-mix(in_srgb,var(--ink)_28%,transparent)] bg-[var(--paper-raised)] text-[var(--ink-soft)] hover:border-[var(--ink)] hover:text-[var(--ink)]",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Đếm chạy từ 0 tới target trong ~1 giây (tôn trọng reduced-motion). */
export function useCountUp(target: number, start = true): number {
  const [value, setValue] = useState(0);
  const reduced = useReducedMotion();
  const active = start && !reduced && target > 0;

  useEffect(() => {
    if (!active) return;
    const controls = animate(0, target, {
      duration: 1,
      ease: [0.21, 0.47, 0.32, 0.98],
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [target, active]);

  return active ? value : target;
}

/** Số đếm có chạy — dùng trong các ô số liệu. */
export function CountUpNumber({ value, className }: { value: number; className?: string }) {
  const current = useCountUp(value);
  return <span className={cn("tabular", className)}>{current.toLocaleString("vi-VN")}</span>;
}

/** Lỗi tải dữ liệu section + nút thử lại. */
export function SectionError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <SketchCard hover={false} className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]">
        <VAlert size={22} />
      </span>
      <div>
        <p className="font-extrabold">Không tải được dữ liệu</p>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">{message}</p>
      </div>
      {onRetry && (
        <InkButton variant="outline" size="sm" onClick={onRetry}>
          <VRefresh size={14} /> Thử lại
        </InkButton>
      )}
    </SketchCard>
  );
}

/** Mảnh skeleton nét chì — dùng khi chờ dữ liệu. */
export function PencilLines({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2.5", className)} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-pencil h-10" />
      ))}
    </div>
  );
}

/** Trạng thái rỗng dùng chung. */
export function EmptyState({
  icon: Icon,
  title,
  note,
}: {
  icon: VIconComponent;
  title: string;
  note?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="sticker-pop grid h-14 w-14 place-items-center rounded-full border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_35%,transparent)] text-[var(--ink-soft)]">
        <Icon size={24} />
      </span>
      <p className="font-hand text-lg text-[var(--ink)]">{title}</p>
      {note && <p className="max-w-sm text-sm text-[var(--ink-soft)]">{note}</p>}
    </div>
  );
}

/** Input style sổ tay — nét mực 2px, nền giấy. */
export function SketchInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "focus-ink w-full rounded-[9px_11px_10px_12px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] outline-none transition-colors placeholder:text-[color-mix(in_srgb,var(--ink-soft)_70%,transparent)]",
        className,
      )}
    />
  );
}

/** Textarea style sổ tay. */
export function SketchTextarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "focus-ink w-full resize-y rounded-[9px_11px_10px_12px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 text-sm leading-relaxed text-[var(--ink)] outline-none transition-colors placeholder:text-[color-mix(in_srgb,var(--ink-soft)_70%,transparent)]",
        className,
      )}
    />
  );
}
