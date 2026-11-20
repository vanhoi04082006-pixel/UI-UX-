"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { VMoon, VSun } from "@/components/icons/v-icons";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  // "mounted" an toàn hydrat: snapshot server = false, client = true —
  // không cần setState trong effect.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const dark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Chuyển sang theme giấy kem" : "Chuyển sang theme bảng đen"}
      aria-pressed={dark}
      title={dark ? "Sáng" : "Tối"}
      className={`focus-ink sticker-pop inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--ink)] shadow-ink-2 transition-all hover:-translate-y-0.5 hover:shadow-ink-3 ${className ?? ""}`}
    >
      {mounted ? (
        dark ? (
          <VMoon size={19} />
        ) : (
          <VSun size={19} />
        )
      ) : (
        <span className="h-[19px] w-[19px]" />
      )}
    </button>
  );
}
