"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { VAlert, VRefresh } from "@/components/icons/v-icons";
import type { VIconComponent } from "@/components/icons/v-icons";
import { InkButton } from "@/components/notebook/reveal";
import { SketchCard } from "@/components/notebook/ui";

/* =====================================================================
 * INSTRUCTOR SHARED — mảnh dùng chung cho 5 trang workspace giảng viên.
 * ===================================================================== */

/** Lấy 2 chữ cái đầu của 2 từ cuối trong họ tên. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const tail = parts.slice(-2);
  const letters = tail.map((w) => w[0] ?? "").join("").toUpperCase();
  return letters || "?";
}

/* ---------------------------- Count-up ------------------------------ */

/**
 * Đếm dần 0 → target bằng requestAnimationFrame (ease-out cubic).
 * Tôn trọng reduced-motion: trả thẳng giá trị cuối, không chạy animation.
 */
export function useCountUp(target: number, opts?: { duration?: number; decimals?: number }) {
  const { duration = 850, decimals = 0 } = opts ?? {};
  const reduced = useReducedMotion();
  const animatable = !reduced && Number.isFinite(target);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!animatable) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Number((target * eased).toFixed(decimals)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animatable, target, duration, decimals]);

  if (!Number.isFinite(target)) return 0;
  return animatable ? display : target;
}

/** Số hiển thị có count-up + tuỳ chọn prefix/suffix (VD: 67%, 7.8/10). */
export function CountUpNumber({
  to,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration,
  className = "",
}: {
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const value = useCountUp(to, { duration, decimals });
  return (
    <span className={`tabular ${className}`}>
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/* ----------------------------- Avatar ------------------------------- */

const AVATAR_TONES = [
  "bg-[var(--blue-mist)] text-[var(--royal)]",
  "bg-[var(--note-yellow)] text-[var(--note-yellow-ink)]",
  "bg-[var(--note-pink)] text-[var(--note-pink-ink)]",
  "bg-[var(--note-mint)] text-[var(--note-mint-ink)]",
];

/** Chuỗi avatar tròn chồng nhau từ danh sách họ tên. */
export function AvatarStack({ names, max = 4, size = 28 }: { names: string[]; max?: number; size?: number }) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  if (names.length === 0) return null;
  return (
    <div className="flex items-center" role="img" aria-label={`${names.length} thành viên: ${names.join(", ")}`}>
      {shown.map((n, i) => (
        <span
          key={`${n}-${i}`}
          title={n}
          style={{ width: size, height: size, zIndex: shown.length - i }}
          className={`grid place-items-center rounded-full border-[1.5px] border-[var(--ink)] text-[0.6rem] font-bold ${AVATAR_TONES[i % AVATAR_TONES.length]} ${i > 0 ? "-ml-2" : ""}`}
        >
          <span className="translate-y-[0.5px]">{initialsOf(n)}</span>
        </span>
      ))}
      {rest > 0 && (
        <span
          style={{ width: size, height: size }}
          className={`-ml-2 grid place-items-center rounded-full border-[1.5px] border-[var(--ink)] bg-[var(--paper)] text-[0.58rem] font-bold text-[var(--ink-soft)]`}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}

/** Chấm tròn initials đơn (bảng, hàng chờ). */
export function InitialDot({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-[1.5px] border-[var(--ink)] bg-[var(--blue-mist)] text-[0.58rem] font-bold text-[var(--royal)] ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
}

/* ----------------------------- Thanh ------------------------------- */

/** Thanh tiến độ mini nét mực — mọc từ đáy (`.bar-grow`) trừ reduced-motion. */
export function MiniBar({
  value,
  tone = "royal",
  label,
  className = "",
  animate = true,
}: {
  value: number;
  tone?: "royal" | "success" | "warning" | "danger";
  label?: string;
  className?: string;
  /** Bật hiệu ứng `.bar-grow` khi mới xuất hiện (mặc định bật). */
  animate?: boolean;
}) {
  const reduced = useReducedMotion();
  const bg = {
    royal: "bg-[var(--royal)]",
    success: "bg-[var(--success)]",
    warning: "bg-[var(--warning)]",
    danger: "bg-[var(--danger)]",
  }[tone];
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Tiến độ"}
      className={`h-2.5 overflow-hidden rounded-full border-[1.5px] border-[var(--ink)] bg-[var(--paper)] ${className}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${bg} ${animate && !reduced ? "bar-grow" : ""}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Chip mã nhiệm vụ / phiên — font mono, nền xanh mờ. */
export function CodeChip({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border-[1.5px] border-[var(--ink)] bg-[var(--blue-mist)] px-1.5 py-0.5 font-geist-mono text-[0.66rem] font-bold text-[var(--royal)] ${className}`}
    >
      {children}
    </span>
  );
}

/* --------------------------- Page header ---------------------------- */

export function PageHeading({
  eyebrow,
  title,
  sub,
  children,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-1.5 text-2xl font-extrabold leading-tight tracking-tight sm:text-[1.75rem]">{title}</h1>
        {sub && <p className="mt-1 text-sm text-[var(--ink-soft)]">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2.5">{children}</div>}
    </div>
  );
}

/** Dải meta mỏng kiểu dòng chú thích mono đầu trang. */
export function MetaStrip({ items }: { items: string[] }) {
  return (
    <SketchCard hover={false} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5">
      {items.map((item, i) => (
        <span
          key={i}
          className="flex items-center gap-3 font-geist-mono text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]"
        >
          {i > 0 && <span aria-hidden="true" className="text-[var(--ink-faint)]">/</span>}
          {item}
        </span>
      ))}
    </SketchCard>
  );
}

/* ------------------------- Metric tile ------------------------------ */

const TILE_TONES: Record<string, string> = {
  royal: "bg-[var(--blue-mist)] text-[var(--royal)]",
  green: "bg-[color-mix(in_srgb,var(--success)_16%,transparent)] text-[var(--success)]",
  amber: "bg-[color-mix(in_srgb,var(--warning)_18%,transparent)] text-[var(--warning)]",
  red: "bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] text-[var(--danger)]",
  neutral: "bg-[var(--paper)] text-[var(--ink)]",
};

export function MetricTile({
  icon: Icon,
  label,
  value,
  sub,
  note,
  tone = "royal",
  bar,
  onClick,
  countUp,
}: {
  icon: VIconComponent;
  label: string;
  value: ReactNode;
  sub?: string;
  note?: string;
  tone?: keyof typeof TILE_TONES;
  bar?: number;
  onClick?: () => void;
  /** Có thì số hiển thị chạy count-up thay cho chuỗi `value` tĩnh. */
  countUp?: {
    to: number;
    decimals?: number;
    prefix?: string;
    suffix?: string;
    duration?: number;
  };
}) {
  const shown = countUp ? (
    <CountUpNumber
      to={countUp.to}
      decimals={countUp.decimals ?? 0}
      prefix={countUp.prefix}
      suffix={countUp.suffix}
      duration={countUp.duration}
    />
  ) : (
    value
  );
  const ariaValue = countUp
    ? `${countUp.prefix ?? ""}${countUp.to.toFixed(countUp.decimals ?? 0)}${countUp.suffix ?? ""}`
    : typeof value === "string" || typeof value === "number"
      ? String(value)
      : "";
  const body = (
    <>
      <span
        aria-hidden="true"
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-[10px_12px_10px_12px] border-2 border-[var(--ink)] ${TILE_TONES[tone]}`}
      >
        <Icon size={20} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[1.45rem] font-extrabold leading-none tabular">{shown}</span>
        <span className="mt-1 block text-[0.74rem] font-semibold leading-tight text-[var(--ink-soft)]">{label}</span>
        {sub && <span className="mt-0.5 block text-[0.68rem] leading-tight text-[var(--ink-faint)]">{sub}</span>}
        {typeof bar === "number" && <MiniBar value={bar} className="mt-2" label={label} />}
        {note && (
          <span className={`mt-1.5 block font-hand text-[0.82rem] leading-tight ${tone === "amber" ? "text-[var(--warning)]" : "text-[var(--ink-soft)]"}`}>
            {note}
          </span>
        )}
      </span>
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="sketch-card sketch-card-hover focus-ink flex w-full items-center gap-3.5 p-4 text-left"
        aria-label={`${label}: ${ariaValue} — mở trang liên quan`}
      >
        {body}
      </button>
    );
  }
  return <div className="sketch-card flex items-center gap-3.5 p-4">{body}</div>;
}

/* --------------------------- Filter chips --------------------------- */

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap items-center gap-2">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.key)}
            className={`focus-ink inline-flex items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 text-[0.78rem] font-bold transition-all duration-150 ${
              active
                ? "border-[var(--ink)] bg-[var(--royal)] text-white shadow-ink-2 hover:-translate-y-0.5 dark:text-[#101018]"
                : "border-[color-mix(in_srgb,var(--ink)_32%,transparent)] bg-[var(--paper-raised)] text-[var(--ink)] hover:border-[var(--ink)] hover:bg-[var(--blue-mist)]"
            }`}
          >
            {o.label}
            {typeof o.count === "number" && (
              <span
                className={`rounded-full px-1.5 text-[0.64rem] leading-4 tabular ${
                  active ? "bg-[rgba(255,255,255,0.28)] dark:bg-[rgba(16,16,24,0.22)]" : "bg-[color-mix(in_srgb,var(--ink)_10%,transparent)] text-[var(--ink-soft)]"
                }`}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------- Trạng thái chung ------------------------- */

export const SESSION_STATUS: Record<string, { label: string; tone: string }> = {
  active: { label: "Đang diễn ra", tone: "green" },
  upcoming: { label: "Sắp mở", tone: "blue" },
  closed: { label: "Đã kết thúc", tone: "neutral" },
};

/** Chấm màu mức ưu tiên (urgent đỏ / high vàng / medium royal / low nhạt). */
export const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-[var(--danger)]",
  high: "bg-[var(--warning)]",
  medium: "bg-[var(--royal)]",
  low: "bg-[var(--ink-soft)]",
};

export const PRIORITY_LABEL: Record<string, string> = {
  urgent: "Khẩn cấp",
  high: "Cao",
  medium: "Trung bình",
  low: "Thấp",
};

/* ------------------------- Skeleton / lỗi / rỗng -------------------- */

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton-pencil-block ${className}`} />;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <SketchCard hover={false} className="flex flex-col items-center gap-3 border-[var(--danger)] px-6 py-10 text-center">
      <VAlert size={32} className="text-[var(--danger)]" />
      <p className="font-hand text-xl">Hổng tải được dữ liệu rồi...</p>
      <p className="max-w-md text-[0.8rem] leading-relaxed text-[var(--ink-soft)]">{message}</p>
      {onRetry && (
        <InkButton variant="outline" size="sm" onClick={onRetry}>
          <VRefresh size={14} /> Thử lại
        </InkButton>
      )}
    </SketchCard>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon?: VIconComponent;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 rounded-[12px_15px_13px_14px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_30%,transparent)] px-6 py-12 text-center">
      {Icon && <Icon size={30} className="text-[var(--ink-soft)]" />}
      <p className="font-hand text-xl">{title}</p>
      {hint && <p className="max-w-sm text-[0.8rem] leading-relaxed text-[var(--ink-soft)]">{hint}</p>}
    </div>
  );
}
