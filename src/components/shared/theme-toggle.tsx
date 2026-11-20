"use client";

import { useSyncExternalStore, useRef } from "react";
import type { KeyboardEvent } from "react";
import { useTheme } from "next-themes";
import { VMoon, VSun } from "@/components/icons/v-icons";

/* =====================================================================
 * ThemeToggle — cụm radio "Sáng / Tối" (theme giấy kem ↔ bảng đen).
 *
 * Provider của app (layout.tsx) bật enableSystem={false} nên hệ thống
 * chỉ có 2 preference thật — nhóm radio đúng nghĩa với 2 mục này.
 *
 * Điều hướng bàn phím theo mẫu radiogroup (fix a11y codex):
 *   ArrowRight / ArrowDown → mục kế tiếp  (index + 1) % length (vòng lặp)
 *   ArrowLeft  / ArrowUp   → mục trước đó (vòng lặp)
 *   Home / End            → mục đầu / mục cuối
 * Sau khi đổi preference, focus dời sang nút mới qua mảng ref
 * buttons.current[index] — giữ roving tabindex chuẩn radiogroup.
 * ===================================================================== */

const OPTIONS = [
  { value: "light", label: "Sáng — theme giấy kem", icon: VSun, title: "Sáng" },
  { value: "dark", label: "Tối — theme bảng đen", icon: VMoon, title: "Tối" },
] as const;

type ThemeValue = (typeof OPTIONS)[number]["value"];

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  // "mounted" an toàn hydrat: snapshot server = false, client = true —
  // không cần setState trong effect.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  /* Mảng ref nút radio — dùng để focus nút mới sau khi đổi preference. */
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  /* Trước khi mount (SSR) chưa biết theme thật → không nút nào checked,
     markup hai bên giống hệt để tránh lệch hydrat. */
  const current: ThemeValue | null = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : null;

  /* Đổi preference; focusIndex dùng khi điều hướng bằng bàn phím
     (và cả khi click — Safari không tự focus nút được bấm). */
  function select(value: ThemeValue, focusIndex?: number) {
    setTheme(value);
    if (typeof focusIndex === "number") {
      buttons.current[focusIndex]?.focus();
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const length = OPTIONS.length;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      next = (index + 1) % length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      next = (index - 1 + length) % length;
    } else if (e.key === "Home") {
      next = 0;
    } else if (e.key === "End") {
      next = length - 1;
    }
    if (next === null) return;
    e.preventDefault();
    select(OPTIONS[next].value, next);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Chọn giao diện: sáng hoặc tối"
      className={`sticker-pop inline-flex items-center gap-1 rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] p-0.5 shadow-ink-2 ${className ?? ""}`}
    >
      {OPTIONS.map((opt, i) => {
        const Icon = opt.icon;
        const checked = current === opt.value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={opt.label}
            title={opt.title}
            tabIndex={checked || (current === null && i === 0) ? 0 : -1}
            onClick={() => select(opt.value, i)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`focus-ink grid h-8 w-8 place-items-center rounded-full border-2 transition-all ${
              checked
                ? "animate-pop-in border-[var(--ink)] bg-[var(--royal)] text-white shadow-ink-2 dark:text-[#101018]"
                : "border-transparent text-[var(--ink-soft)] hover:-translate-y-0.5 hover:border-[var(--ink)] hover:text-[var(--ink)]"
            }`}
          >
            {mounted ? (
              <Icon size={16} />
            ) : (
              <span className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        );
      })}
    </div>
  );
}
