"use client";

import type { ReactNode } from "react";
import { SketchCard, MarginNote } from "@/components/notebook/ui";
import { InkButton } from "@/components/notebook/reveal";
import { VAlert, VRefresh } from "@/components/icons/v-icons";
import { CountUpNumber } from "./student-shared";

/* =====================================================================
 * NB-KIT 5c2 — nguyên liệu dùng chung cho 5 trang workspace sinh viên:
 * Đánh giá / KPI & Lương ảo / Chứng nhận / Thông báo / Hồ sơ.
 * (CountUpNumber đếm tăng dần tái xuất từ student-shared cho tiện.)
 * ====================================================================== */

export { CountUpNumber };

/** Đầu trang chuẩn: eyebrow + H1 + mô tả + ghi chú lề viết tay. */
export function PageHeading({
  eyebrow,
  title,
  sub,
  margin,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  /** Ghi chú lề viết tay (tự động thêm dấu ✎ ở cuối). */
  margin?: string;
}) {
  return (
    <header className="nb-rise mb-6">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
      {sub && (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--ink-soft)]">{sub}</p>
      )}
      {margin && <MarginNote className="mt-2.5">{margin}</MarginNote>}
    </header>
  );
}

/** Bộ khung giấy đang chờ nét chép — skeleton nét chì. */
export function LoadingPanel({ rows = 3, label = "Đang tải dữ liệu..." }: { rows?: number; label?: string }) {
  return (
    <div className="nb-stagger space-y-5" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="sketch-card p-5">
          <div className="skeleton-pencil h-7 w-44" />
          <div className="skeleton-pencil mt-3 h-4 w-3/4" />
          <div className="skeleton-pencil mt-2 h-4 w-1/2" />
          <div className="skeleton-pencil-block mt-5 h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

/** Trang lỗi tải dữ liệu kèm nút thử lại. */
export function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <SketchCard hover={false} className="flex flex-col items-center gap-3 p-8 text-center">
      <span className="grid size-12 place-items-center rounded-full border-2 border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]">
        <VAlert size={22} />
      </span>
      <p className="font-bold">Không tải được dữ liệu</p>
      <p className="max-w-sm text-sm text-[var(--ink-soft)]">{message}</p>
      <InkButton variant="outline" size="sm" onClick={onRetry}>
        <VRefresh size={15} /> Thử lại
      </InkButton>
    </SketchCard>
  );
}

/** Trạng thái rỗng: hình linh vật / minh họa + câu viết tay + nội dung thêm. */
export function EmptyFigure({
  image,
  alt,
  title,
  children,
}: {
  image?: string;
  alt?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-10 text-center">
      {image && (
        <img
          src={image}
          alt={alt ?? ""}
          className="w-44 max-w-[72%] select-none"
          draggable={false}
        />
      )}
      <p className="mt-2 max-w-md font-hand text-[1.45rem] leading-snug">{title}</p>
      {children}
    </div>
  );
}

/** Định dạng số tiền kiểu Việt Nam, không kèm đơn vị. */
export function fmtMoney(n: number) {
  return n.toLocaleString("vi-VN");
}

/** Màu điểm theo ngưỡng: xanh ≥ 8 · vàng ≥ 6.5 · đỏ dưới đó. */
export function scoreColor(score: number) {
  if (score >= 8) return "var(--success)";
  if (score >= 6.5) return "var(--warning)";
  return "var(--danger)";
}
