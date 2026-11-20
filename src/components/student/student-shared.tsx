"use client";

/* =====================================================================
 * STUDENT SHARED — mảnh ghép dùng chung cho các trang workspace sinh viên:
 * tính hạn chót, chip mã nhiệm vụ, thanh tiến độ nhỏ, khối skeleton,
 * lỗi + thử lại, meta hoạt động gần đây, màu gáy theo ưu tiên, đếm số
 * tăng dần (useCountUp/CountUpNumber) và thước độ mạnh mật khẩu.
 * ===================================================================== */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { InkButton } from "@/components/notebook/reveal";
import {
  SketchCard,
  formatDateVN,
} from "@/components/notebook/ui";
import {
  VChartColumn,
  VClipboardCheck,
  VInfo,
  VKanban,
  VListTodo,
  VStar,
  VAlert,
  VRefresh,
  VCertificate,
  type VIconComponent,
} from "@/components/icons/v-icons";
import { cn } from "@/lib/utils";
import type { Priority, Task, TaskStatus } from "@/lib/mock/types";

/* ------------------------- Hạn chót nhiệm vụ ------------------------- */

const DAY_MS = 86_400_000;

/** Số ngày còn lại tới hạn (âm = đã quá hạn), làm tròn theo ngày. */
export function daysUntil(iso: string): number {
  const d = new Date(iso);
  const now = new Date();
  const due = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((due - today) / DAY_MS);
}

export type DueTone = "neutral" | "amber" | "red" | "green";

/** Nhãn đếm ngược hạn nộp + tông màu chữ. */
export function dueInfo(iso: string): { text: string; tone: DueTone } {
  const days = daysUntil(iso);
  if (days < 0) return { text: `quá hạn ${-days} ngày`, tone: "red" };
  if (days === 0) return { text: "đến hạn hôm nay", tone: "amber" };
  return { text: `còn ${days} ngày`, tone: days <= 2 ? "amber" : "neutral" };
}

export const DUE_TONE_TEXT: Record<DueTone, string> = {
  neutral: "text-[var(--ink-soft)]",
  amber: "text-[var(--warning)]",
  red: "text-[var(--danger)]",
  green: "text-[var(--success)]",
};

/* --------------------------- Chip & thanh --------------------------- */

/** Chip mã nhiệm vụ — nét mono, nền mờ xanh. */
export function CodeChip({ code, className }: { code: string; className?: string }) {
  return (
    <span
      className={cn(
        "font-geist-mono inline-flex shrink-0 items-center rounded-[6px_8px_6px_8px] border border-[color-mix(in_srgb,var(--ink)_45%,transparent)] bg-[var(--blue-mist)] px-1.5 py-0.5 text-[0.7rem] font-semibold text-[var(--royal-deep)]",
        className,
      )}
    >
      {code}
    </span>
  );
}

/** Thanh tiến độ nhỏ viền mực — fill royal (hoặc success khi tone green).
 *  `barGrow`: fill mọc từ đáy khi vừa gắn vào DOM (class .bar-grow). */
export function MiniBar({
  value,
  tone = "royal",
  className,
  label,
  barGrow = false,
}: {
  value: number;
  tone?: "royal" | "green";
  className?: string;
  label?: string;
  barGrow?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={cn("flex items-center gap-2", className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `Tiến độ ${pct}%`}
    >
      <div className="h-2.5 flex-1 overflow-hidden rounded-full border-2 border-[var(--ink)] bg-[var(--paper)]">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300",
            tone === "green" ? "bg-[var(--success)]" : "bg-[var(--royal)]",
            barGrow && "bar-grow",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="tabular w-8 text-right text-[0.7rem] font-bold text-[var(--ink-soft)]">{pct}%</span>
    </div>
  );
}

/** Chip điểm story task. */
export function PointsChip({ points }: { points: number }) {
  return (
    <span className="tabular inline-flex shrink-0 items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--ink)_40%,transparent)] px-2 py-0.5 text-[0.68rem] font-semibold text-[var(--ink-soft)]">
      <VStar size={11} className="text-[var(--warning)]" />
      {points} điểm
    </span>
  );
}

/* --------------------- Trạng thái & ưu tiên hệ thống --------------------- */

export const STATUS_ORDER: TaskStatus[] = ["todo", "doing", "review", "done"];

/** Màu gáy bên trái theo mức ưu tiên (dùng inline style để thắng border của .sketch-card). */
export const PRIORITY_SPINE: Record<Priority, string> = {
  low: "var(--ink-faint)",
  medium: "var(--royal)",
  high: "var(--warning)",
  urgent: "var(--danger)",
};

/* --------------------- Hoạt động gần đây (Tổng quan) --------------------- */

export const ACTIVITY_KIND_META: Record<string, { icon: VIconComponent; tone: string }> = {
  "Nhiệm vụ": { icon: VListTodo, tone: "text-[var(--royal)] border-[var(--royal)]" },
  "Đánh giá": { icon: VClipboardCheck, tone: "text-[var(--warning)] border-[var(--warning)]" },
  KPI: { icon: VChartColumn, tone: "text-[var(--success)] border-[var(--success)]" },
  "Chứng nhận": { icon: VCertificate, tone: "text-[var(--note-mint-ink)] border-[var(--success)]" },
  "Phiên thực tập": { icon: VKanban, tone: "text-[var(--ink-soft)] border-[var(--ink-soft)]" },
  "Hệ thống": { icon: VInfo, tone: "text-[var(--ink-soft)] border-[var(--ink-soft)]" },
  "Tuyển dụng": { icon: VStar, tone: "text-[#d6548a] border-[#d6548a]" },
};

export function activityMeta(kind: string) {
  return ACTIVITY_KIND_META[kind] ?? ACTIVITY_KIND_META["Hệ thống"];
}

/* ------------------------- Số đếm tăng dần (count-up) ------------------------- */

/** Đăng ký nghe thay đổi cài đặt "giảm chuyển động" (nhận diện module-level). */
function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** Người dùng có bật "giảm chuyển động" không — an toàn SSR (mặc định false). */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/** Đếm từ giá trị hiện hữu lên `target` bằng requestAnimationFrame.
 *  Người dùng giảm chuyển động → trả thẳng `target`, không chạy animation. */
export function useCountUp(target: number, duration = 900): number {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    const jump = reduced || from === target;
    let raf = 0;
    const tick = (now: number) => {
      if (jump) {
        fromRef.current = target;
        setValue(target);
        return;
      }
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (target - from) * eased;
      fromRef.current = v;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduced]);

  return value;
}

/** `<span>` số đếm tăng dần — giữ font tabular khi cần qua `className`. */
export function CountUpNumber({
  value,
  duration = 900,
  decimals = 0,
  format,
  prefix,
  suffix,
  className,
  title,
}: {
  value: number;
  duration?: number;
  decimals?: number;
  /** Định dạng riêng (VD: tiền tệ) — thắng `decimals`. */
  format?: (n: number) => string;
  prefix?: string;
  suffix?: string;
  className?: string;
  title?: string;
}) {
  const v = useCountUp(value, duration);
  return (
    <span className={cn("tabular", className)} title={title}>
      {prefix}
      {format ? format(Math.round(v * 10 ** decimals) / 10 ** decimals) : v.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/* ------------------------- Lời chào theo giờ ------------------------- */

/** "Chào buổi sáng/trưa/chiều/tối" theo giờ địa phương. */
export function timeGreetingVN(now: Date = new Date()): string {
  const h = now.getHours();
  if (h >= 5 && h < 11) return "Chào buổi sáng";
  if (h >= 11 && h < 14) return "Chào buổi trưa";
  if (h >= 14 && h < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

/* ------------------------- Trạng thái tải dữ liệu ------------------------- */

/** 3 khối skeleton nét chì khi đang tải trang. */
export function LoadingBlocks({ label = "Đang lật sổ…" }: { label?: string }) {
  return (
    <div className="space-y-4 py-2" role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="skeleton-pencil-block h-24 w-full" />
      <div className="skeleton-pencil-block h-36 w-full" />
      <div className="skeleton-pencil-block h-24 w-full" />
    </div>
  );
}

/** Lỗi inline + nút thử lại. */
export function ErrorNote({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <SketchCard hover={false} className="border-[var(--danger)] p-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]">
          <VAlert size={18} />
        </span>
        <p className="min-w-0 flex-1 text-sm font-semibold text-[var(--ink)]">
          {message}
          <span className="mt-0.5 block text-[0.78rem] font-normal text-[var(--ink-soft)]">
            Mạng giấy có thể bị gập lúc này — thử lại xem sao nhé.
          </span>
        </p>
        <InkButton variant="outline" size="sm" onClick={onRetry}>
          <VRefresh size={14} /> Thử lại
        </InkButton>
      </div>
    </SketchCard>
  );
}

/* ------------------------- Tiện ích hiển thị nhỏ ------------------------- */

/** Ngày hết hạn: dùng ngày thường cho task hoàn thành, ngược lại đếm ngược. */
export function dueDisplay(task: Task): { text: string; tone: DueTone } {
  if (task.status === "done") {
    return { text: `hoàn thành · ${formatDateVN(task.dueDate)}`, tone: "green" };
  }
  return dueInfo(task.dueDate);
}

/** Giờ ngắn "14:05" hoặc ngày "12/03" nếu không phải hôm nay. */
export function shortTimeVN(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  if (sameDay) return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

/* ------------------------- Thước độ mạnh mật khẩu ------------------------- */

/** Chấm điểm 0–4: chiều dài + chữ hoa/thường + số + ký tự đặc biệt. */
export function passwordScore(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (!pw) return 0;
  let pts = 0;
  if (pw.length >= 8) pts++;
  if (pw.length >= 12) pts++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) pts++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) pts++;
  return Math.max(1, Math.min(4, pts)) as 0 | 1 | 2 | 3 | 4;
}

const PW_STRENGTH_META: Record<number, { label: string; tone: string; filled: string }> = {
  0: { label: "Chưa nhập", tone: "var(--ink-faint)", filled: "var(--ink-faint)" },
  1: { label: "Yếu — thêm chữ hoa và số nhé", tone: "var(--danger)", filled: "var(--danger)" },
  2: { label: "Trung bình — thử kéo dài 12 ký tự", tone: "var(--warning)", filled: "var(--warning)" },
  3: { label: "Khá — gần đạt chuẩn", tone: "var(--royal)", filled: "var(--royal)" },
  4: { label: "Mạnh — bút chì gật gù", tone: "var(--success)", filled: "var(--success)" },
};

/** Thước độ mạnh mật khẩu: 4 thanh mực + nhãn viết tay. */
export function PasswordStrength({ value, id = "pw-strength" }: { value: string; id?: string }) {
  const score = passwordScore(value);
  const meta = PW_STRENGTH_META[score];
  return (
    <div className="mt-1.5" role="meter" aria-labelledby={id} aria-valuenow={score} aria-valuemin={0} aria-valuemax={4}>
      <div className="flex gap-1.5" aria-hidden="true">
        {[1, 2, 3, 4].map((seg) => (
          <span
            key={seg}
            className={cn(
              "h-1.5 flex-1 rounded-full border border-[var(--ink)] transition-colors duration-300",
              seg <= score ? "" : "bg-transparent",
            )}
            style={seg <= score ? { background: meta.filled } : { borderColor: "color-mix(in srgb, var(--ink) 40%, transparent)" }}
          />
        ))}
      </div>
      <p id={id} className="mt-1 text-[0.66rem] font-semibold" style={{ color: meta.tone }}>
        {meta.label}
      </p>
    </div>
  );
}
