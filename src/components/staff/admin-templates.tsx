"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  VBot,
  VCube,
  VDatabase,
  VExternal,
  VGrid,
  VListTodo,
  VPlus,
  VServer,
  VSettings,
  VShapes,
  VStampTool,
  type VIconComponent,
} from "@/components/icons/v-icons";
import { Stagger, StaggerItem, InkButton } from "@/components/notebook/reveal";
import {
  InkBadge,
  NoteCard,
  SketchCard,
  Tape,
} from "@/components/notebook/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TemplateRow } from "@/lib/mock/types";
import { useApi } from "@/lib/use-api";
import { listTemplates } from "@/lib/api/admin";
import { PencilLines, SectionError, StaffPageHeader } from "./staff-kit";

/* =====================================================================
 * MẪU DỰ ÁN — khung dự án dùng để mở phiên thực tập.
 * ===================================================================== */

const TAPE_VARIANTS: { variant: "blue" | "warm" | "candy" | "mint"; rotate: number }[] = [
  { variant: "blue", rotate: -4 },
  { variant: "warm", rotate: 3 },
  { variant: "candy", rotate: -3 },
  { variant: "mint", rotate: 4 },
];

const BP_POOL = [
  "Khung ứng dụng",
  "Thiết kế dữ liệu",
  "API lõi",
  "Luồng xác thực",
  "Giao diện dashboard",
  "Tích hợp AI Mentor",
  "Kiểm thử tự động",
  "Triển khai & vận hành",
];

/** Chia nhiệm vụ mẫu cho các bản thiết kế (minh họa). */
function blueprintsFor(tpl: TemplateRow) {
  const names = BP_POOL.slice(0, Math.min(tpl.blueprints, BP_POOL.length));
  if (names.length === 0) return [];
  const base = Math.floor(tpl.tasks / names.length);
  let remaining = tpl.tasks;
  return names.map((name, i) => {
    const isLast = i === names.length - 1;
    const count = isLast ? Math.max(remaining, 2) : Math.max(2, base + (i % 3 === 0 ? 1 : 0));
    if (!isLast) remaining -= count;
    return { name, tasks: count };
  });
}

/** Icon theo lĩnh vực mẫu — khớp bằng chuỗi con cho dữ liệu mới. */
const DOMAIN_ICON_RULES: { test: RegExp; icon: VIconComponent }[] = [
  { test: /web/i, icon: VGrid },
  { test: /mobile/i, icon: VCube },
  { test: /data/i, icon: VDatabase },
  { test: /ai|rag/i, icon: VBot },
  { test: /platform|api/i, icon: VServer },
  { test: /internal|tool/i, icon: VSettings },
];

function domainIconFor(domain: string): VIconComponent {
  return DOMAIN_ICON_RULES.find((r) => r.test.test(domain))?.icon ?? VShapes;
}

const TASK_SAMPLES: { test: RegExp; items: string[] }[] = [
  {
    test: /backend|nestjs/i,
    items: [
      "Thiết kế schema CSDL cho bảng nhiệm vụ",
      "REST API CRUD + phân quyền theo vai trò",
      "Hàng đợi gửi email nhắc hạn nộp bài",
      "Viết integration test cho luồng chính",
      "Seed dữ liệu mẫu cho buổi demo",
    ],
  },
  {
    test: /fullstack/i,
    items: [
      "Trang tra cứu công khai theo mã chứng nhận",
      "API băm mã xác minh một chiều",
      "Trang in chứng nhận chuẩn A4",
      "Kiểm thử đầu cuối luồng tra cứu",
      "Bật chỉ mục CSDL cho truy vấn mã",
    ],
  },
  {
    test: /realtime/i,
    items: [
      "Thiết lập kết nối WebSocket có phòng",
      "Hàng đợi sự kiện nội bộ dành cho Kanban",
      "Canvas kéo – thả với fallback bàn phím",
      "Xử lý tái kết nối khi rớt mạng",
      "Giám sát độ trễ realtime trên dashboard",
    ],
  },
];

const FE_TASKS = [
  "Dựng layout theo design system",
  "Bộ component nút & badge tái sử dụng",
  "Kết nối API danh sách nhiệm vụ",
  "Kiểm tra responsive từ 375px",
  "Tối ưu ảnh & font tải trước",
];

/** Nhiệm vụ mẫu theo lĩnh vực của mẫu (minh họa). */
function tasksFor(tpl: TemplateRow) {
  const matched = TASK_SAMPLES.find((t) => t.test.test(tpl.domain));
  return matched ? matched.items : FE_TASKS;
}

export default function AdminTemplates() {
  const { data, loading, error, reload } = useApi<TemplateRow[]>(listTemplates);

  /* Ghi đè trạng thái cục bộ (mô phỏng) + mẫu đang mở chi tiết */
  const [overrides, setOverrides] = useState<Record<string, Partial<TemplateRow>>>({});
  const [detail, setDetail] = useState<TemplateRow | null>(null);

  const rows = useMemo(
    () => (data ?? []).map((r) => (overrides[r.id] ? { ...r, ...overrides[r.id] } : r)),
    [data, overrides],
  );

  /* Bật/tắt trạng thái hiển thị (mô phỏng) */
  const toggleStatus = (tpl: TemplateRow) => {
    const next: TemplateRow["status"] = tpl.status === "Công khai" ? "Nội bộ" : "Công khai";
    setOverrides((prev) => ({ ...prev, [tpl.id]: { ...prev[tpl.id], status: next } }));
    setDetail((d) => (d && d.id === tpl.id ? { ...d, status: next } : d));
    toast.success(`${tpl.code} chuyển sang "${next}" (mô phỏng)`);
  };

  if (loading && !data) {
    return (
      <div>
        <StaffPageHeader eyebrow="Quản trị · khung dự án" title="Mẫu dự án" />
        <div className="grid gap-5 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-pencil h-56 rounded-[10px]" />
          ))}
        </div>
        <div className="mt-5">
          <PencilLines rows={1} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <SectionError message={error ?? "Chưa tải được danh sách mẫu dự án."} onRetry={reload} />;
  }

  return (
    <div>
      <StaffPageHeader
        eyebrow="Quản trị · khung dự án"
        title="Mẫu dự án"
        sub="Khung dự án dùng để mở phiên thực tập."
        actions={
          <InkButton
            variant="outline"
            size="sm"
            className="shine-sweep"
            onClick={() => toast.info("Trình tạo mẫu sẽ mở sau (demo)")}
          >
            <VPlus size={15} /> Tạo mẫu mới
          </InkButton>
        }
      />

      <Stagger className="grid gap-5 md:grid-cols-2">
        {rows.map((tpl, i) => (
          <StaggerItem key={tpl.id}>
            <SketchCard className="card-tilt relative flex h-full flex-col p-5 pt-8">
              <Tape
                variant={TAPE_VARIANTS[i % TAPE_VARIANTS.length].variant}
                rotate={TAPE_VARIANTS[i % TAPE_VARIANTS.length].rotate}
                className="-top-3 left-7 !w-24"
              />
              <div className="flex items-start justify-between gap-2">
                <span className="rounded-[6px] border border-[color-mix(in_srgb,var(--ink)_30%,transparent)] bg-[var(--paper)] px-1.5 py-0.5 font-mono text-[0.7rem] font-bold text-[var(--ink)]">
                  {tpl.code}
                </span>
                <InkBadge
                  tone={tpl.status === "Công khai" ? "green" : "neutral"}
                  className="!text-[0.65rem]"
                >
                  {tpl.status}
                </InkBadge>
              </div>
              <h3 className="mt-2.5 text-lg font-extrabold leading-snug text-[var(--ink)]">
                {tpl.name}
              </h3>
              <InkBadge tone="blue" className="mt-1.5 self-start !text-[0.65rem]">
                {(() => {
                  const DomainIcon = domainIconFor(tpl.domain);
                  return <DomainIcon size={12} aria-hidden="true" />;
                })()}
                {tpl.domain}
              </InkBadge>
              <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-[var(--ink-soft)]">
                {tpl.description}
              </p>
              <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-[var(--ink-soft)]">
                <VListTodo size={14} className="shrink-0 text-[var(--royal)]" aria-hidden="true" />
                <span className="tabular">
                  {tpl.tasks} nhiệm vụ · {tpl.blueprints} bản thiết kế
                </span>
              </p>
              <div className="mt-auto flex justify-end border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_18%,transparent)] pt-3.5">
                <InkButton variant="outline" size="sm" onClick={() => setDetail(tpl)}>
                  <VExternal size={14} /> Xem chi tiết
                </InkButton>
              </div>
            </SketchCard>
          </StaggerItem>
        ))}
      </Stagger>

      {/* Ghi chú phạm vi hiển thị */}
      <div className="mt-5 max-w-md">
        <NoteCard tone="yellow" title="Mẫu nội bộ" tapeVariant="warm">
          Mẫu nội bộ chỉ giảng viên thấy — sinh viên chỉ thấy dự án sau khi được phân công.
        </NoteCard>
      </div>

      {/* Hộp thoại chi tiết mẫu */}
      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-lg">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="font-extrabold text-[var(--ink)]">
                  {detail.name}
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2 text-[var(--ink-soft)]">
                  <span className="rounded-[6px] border border-[color-mix(in_srgb,var(--ink)_30%,transparent)] bg-[var(--paper)] px-1.5 py-0.5 font-mono text-[0.68rem] font-bold text-[var(--ink)]">
                    {detail.code}
                  </span>
                  {detail.domain}
                  <InkBadge
                    tone={detail.status === "Công khai" ? "green" : "neutral"}
                    className="!text-[0.62rem]"
                  >
                    {detail.status}
                  </InkBadge>
                </DialogDescription>
              </DialogHeader>

              <p className="text-sm leading-relaxed text-[var(--ink)]">{detail.description}</p>

              {/* Mộc trang trí — con dấu “Đã kiểm” */}
              <div className="flex justify-end" aria-hidden="true">
                <span className="inline-flex rotate-[-4deg] items-center gap-1.5 rounded-[10px] border-2 border-[color-mix(in_srgb,var(--royal)_45%,transparent)] px-2.5 py-1 text-[0.65rem] font-extrabold uppercase tracking-wide text-[var(--royal)]">
                  <VStampTool size={14} />
                  Đã kiểm
                </span>
              </div>

              <div>
                <p className="eyebrow !text-[0.62rem]">Bản thiết kế ({detail.blueprints})</p>
                <ul className="mt-2 space-y-1.5">
                  {blueprintsFor(detail).map((bp) => (
                    <li
                      key={bp.name}
                      className="flex items-center justify-between gap-3 rounded-[9px] border-2 border-[color-mix(in_srgb,var(--ink)_22%,transparent)] bg-[var(--paper)] px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 flex-1 font-semibold text-[var(--ink)]">
                        {bp.name}
                      </span>
                      <span className="tabular shrink-0 text-xs font-bold text-[var(--ink-soft)]">
                        {bp.tasks} nhiệm vụ
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="eyebrow !text-[0.62rem]">Nhiệm vụ mẫu</p>
                <ul className="mt-2 space-y-1.5">
                  {tasksFor(detail).map((t) => (
                    <li
                      key={t}
                      className="flex items-start gap-2 text-sm leading-snug text-[var(--ink)]"
                    >
                      <VListTodo size={14} className="mt-0.5 shrink-0 text-[var(--royal)]" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              <DialogFooter>
                <InkButton variant="outline" size="sm" onClick={() => toggleStatus(detail)}>
                  {detail.status === "Công khai" ? "Chuyển sang Nội bộ" : "Chuyển sang Công khai"}
                </InkButton>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
