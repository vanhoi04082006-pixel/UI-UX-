import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Con dấu mộc — trạng thái quan trọng (ĐÃ DUYỆT / ĐÃ HOÀN THÀNH / PASS). */
export function StampMoc({
  children,
  tone = "red",
  size = "md",
  thump = false,
  rotate = -3,
  className,
}: {
  children: ReactNode;
  /** Mực đỏ (mặc định) hay mực xanh. */
  tone?: "red" | "blue";
  size?: "md" | "sm";
  /** Hiệu ứng đóng dấu khi mount (tôn trọng reduced-motion). */
  thump?: boolean;
  rotate?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "stamp-moc",
        size === "sm" && "stamp-moc-sm",
        thump && "animate-stamp-thump",
        tone === "red" ? "text-[var(--stamp-red)]" : "text-[var(--stamp-blue)]",
        className,
      )}
      style={{ "--stamp-rotate": `${rotate}deg` } as React.CSSProperties}
    >
      {children}
    </span>
  );
}
