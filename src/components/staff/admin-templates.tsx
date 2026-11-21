"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  VBot,
  VCube,
  VDatabase,
  VExternal,
  VGrid,
  VInbox,
  VSearch,
  VServer,
  VSettings,
  VShapes,
  VStampTool,
  type VIconComponent,
} from "@/components/icons/v-icons";
import { InkButton, Stagger, StaggerItem } from "@/components/notebook/reveal";
import {
  InkBadge,
  NoteCard,
  SketchCard,
  Tape,
  formatDateVN,
} from "@/components/notebook/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApi } from "@/lib/use-api";
import { listTemplates, type AdminTemplateRow } from "@/lib/api/admin";
import { cn } from "@/lib/utils";
import { EmptyState, PencilLines, SectionError, StaffPageHeader } from "./staff-kit";

/* =====================================================================
 * MẪU DỰ ÁN — khung dự án dùng để mở phiên thực tập.
 * Dữ liệu: GET /project-templates (BE thật) — chỉ đọc, trạng thái hiển
 * thị nguyên trạng vì BE chưa có endpoint đổi trạng thái mẫu dự án.
 * ===================================================================== */

const TAPE_VARIANTS: { variant: "blue" | "warm" | "candy" | "mint"; rotate: number }[] = [
  { variant: "blue", rotate: -4 },
  { variant: "warm", rotate: 3 },
  { variant: "candy", rotate: -3 },
  { variant: "mint", rotate: 4 },
];

/** Icon theo danh mục — khớp bằng chuỗi con (web / mobile / data...). */
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

/* ------------------ Nhãn hiển thị theo contract BE ------------------ */

/** Độ khó: beginner | intermediate | advanced — giá trị lạ hiển thị nguyên văn. */
const DIFFICULTY_META: Record<string, { label: string; tone: string }> = {
  beginner: { label: "Cơ bản", tone: "green" },
  intermediate: { label: "Trung cấp", tone: "amber" },
  advanced: { label: "Nâng cao", tone: "red" },
};

function difficultyMeta(raw: string): { label: string; tone: string } {
  return DIFFICULTY_META[raw] ?? { label: raw.trim() || "Chưa rõ", tone: "neutral" };
}

/** Trạng thái mẫu — BE hiện trả "active"; giá trị khác hiển thị nguyên văn. */
const STATUS_META: Record<string, { label: string; tone: string }> = {
  active: { label: "Đang dùng", tone: "green" },
};

function statusMeta(raw: string): { label: string; tone: string } {
  return STATUS_META[raw] ?? { label: raw.trim() || "Chưa rõ", tone: "neutral" };
}

/** Chip công nghệ mono — tối đa `max` chip, phần còn lại rút gọn "+n". */
function TechChips({
  items,
  max = 3,
  className,
}: {
  items: string[];
  max?: number;
  className?: string;
}) {
  if (items.length === 0) {
    return <span className={cn("text-xs text-[var(--ink-soft)]", className)}>Chưa ghi rõ</span>;
  }
  const visible = items.slice(0, max);
  const rest = items.slice(max);
  return (
    <span className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {visible.map((tech) => (
        <span
          key={tech}
          className="rounded-full border-2 border-[color-mix(in_srgb,var(--ink)_28%,transparent)] bg-[var(--paper)] px-2 py-0.5 font-mono text-[0.65rem] font-bold text-[var(--ink)]"
        >
          {tech}
        </span>
      ))}
      {rest.length > 0 && (
        <span
          className="rounded-full border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_28%,transparent)] px-2 py-0.5 font-mono text-[0.65rem] font-bold text-[var(--ink-soft)]"
          title={rest.join(", ")}
        >
          +{rest.length}
        </span>
      )}
    </span>
  );
}

/** Ngày tạo an toàn — chuỗi rỗng hoặc sai định dạng hiển thị "—". */
function safeDateVN(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : formatDateVN(iso);
}

/** Dòng thông tin trong hộp thoại chi tiết (bố cục dl/dt/dd). */
function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b-2 border-dashed border-[color-mix(in_srgb,var(--ink)_16%,transparent)] py-2.5 last:border-b-0">
      <dt className="shrink-0 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
        {label}
      </dt>
      <dd className="min-w-0 text-right text-sm font-semibold text-[var(--ink)]">{children}</dd>
    </div>
  );
}

export default function AdminTemplates() {
  const { data, loading, error, reload } = useApi<AdminTemplateRow[]>(listTemplates);

  const [query, setQuery] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

  const rows = useMemo(() => data ?? [], [data]);

  /* Tìm kiếm phía client theo mã, tên, danh mục */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q),
    );
  }, [rows, query]);

  /* Tra cứu mẫu đang mở chi tiết — luôn lấy bản mới nhất từ dữ liệu BE */
  const detail = detailId ? (rows.find((r) => r.id === detailId) ?? null) : null;

  /* Trạng thái chờ */
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
          <InkBadge tone="neutral" className="tabular">
            {rows.length} mẫu
          </InkBadge>
        }
      />

      {/* Tìm kiếm phía client: mã / tên / danh mục */}
      <SketchCard hover={false} className="mb-5 p-4">
        <div className="relative w-full sm:max-w-xs">
          <VSearch
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo mã, tên hoặc danh mục..."
            aria-label="Tìm mẫu dự án theo mã, tên hoặc danh mục"
            className="focus-ink w-full rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] py-2 pl-9 pr-3 text-sm text-[var(--ink)] outline-none transition-colors"
          />
        </div>
      </SketchCard>

      {filtered.length === 0 ? (
        <SketchCard hover={false}>
          <EmptyState
            icon={VInbox}
            title={query.trim() ? "Không có mẫu nào khớp từ khóa" : "Chưa có mẫu dự án nào"}
            note={
              query.trim()
                ? "Thử tìm bằng mã, tên hoặc danh mục khác."
                : "Danh sách mẫu sẽ hiển thị khi hệ thống có dữ liệu."
            }
          />
        </SketchCard>
      ) : (
        <Stagger className="grid gap-5 md:grid-cols-2">
          {filtered.map((tpl, i) => {
            const diff = difficultyMeta(tpl.difficulty);
            const status = statusMeta(tpl.status);
            return (
              <StaggerItem key={tpl.id}>
                <SketchCard className="card-tilt relative flex h-full flex-col p-5 pt-8">
                  <Tape
                    variant={TAPE_VARIANTS[i % TAPE_VARIANTS.length].variant}
                    rotate={TAPE_VARIANTS[i % TAPE_VARIANTS.length].rotate}
                    className="-top-3 left-7 !w-24"
                  />
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-[6px] border border-[color-mix(in_srgb,var(--ink)_30%,transparent)] bg-[var(--paper)] px-1.5 py-0.5 font-mono text-[0.7rem] font-bold text-[var(--ink)]">
                      {tpl.code || "—"}
                    </span>
                    <InkBadge tone={status.tone} className="!text-[0.65rem]">
                      {status.label}
                    </InkBadge>
                  </div>
                  <h3 className="mt-2.5 text-lg font-extrabold leading-snug text-[var(--ink)]">
                    {tpl.name || "Chưa đặt tên"}
                  </h3>
                  <InkBadge tone="blue" className="mt-1.5 self-start !text-[0.65rem]">
                    {(() => {
                      const CategoryIcon = domainIconFor(tpl.category);
                      return <CategoryIcon size={12} aria-hidden="true" />;
                    })()}
                    {tpl.category || "Chưa phân loại"}
                  </InkBadge>

                  <div className="mt-3">
                    <p className="eyebrow !text-[0.6rem]">Công nghệ</p>
                    <div className="mt-1.5">
                      <TechChips items={tpl.techStack} max={3} />
                    </div>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_18%,transparent)] pt-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <InkBadge tone={diff.tone} className="!text-[0.65rem]">
                        {diff.label}
                      </InkBadge>
                      <span className="tabular text-xs font-bold text-[var(--ink-soft)]">
                        {tpl.sprintCount} sprint
                      </span>
                    </div>
                    <InkButton
                      variant="outline"
                      size="sm"
                      onClick={() => setDetailId(tpl.id)}
                      aria-label={`Xem chi tiết mẫu ${tpl.code || tpl.name}`}
                    >
                      <VExternal size={14} /> Xem chi tiết
                    </InkButton>
                  </div>
                </SketchCard>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}

      {/* Ghi chú phạm vi hiển thị */}
      <div className="mt-5 max-w-md">
        <NoteCard tone="yellow" title="Dữ liệu chỉ đọc" tapeVariant="warm">
          Trạng thái mẫu chỉ hiển thị theo dữ liệu hệ thống — hiện chưa hỗ trợ
          đổi trạng thái từ màn quản trị.
        </NoteCard>
      </div>

      {/* Hộp thoại chi tiết mẫu */}
      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-lg">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="font-extrabold text-[var(--ink)]">
                  {detail.name || "Chưa đặt tên"}
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2 text-[var(--ink-soft)]">
                  <span className="rounded-[6px] border border-[color-mix(in_srgb,var(--ink)_30%,transparent)] bg-[var(--paper)] px-1.5 py-0.5 font-mono text-[0.68rem] font-bold text-[var(--ink)]">
                    {detail.code || "—"}
                  </span>
                  <InkBadge tone="blue" className="!text-[0.62rem]">
                    {detail.category || "Chưa phân loại"}
                  </InkBadge>
                  <InkBadge
                    tone={statusMeta(detail.status).tone}
                    className="!text-[0.62rem]"
                  >
                    {statusMeta(detail.status).label}
                  </InkBadge>
                </DialogDescription>
              </DialogHeader>

              {/* Mộc trang trí — con dấu “Đã kiểm” */}
              <div className="flex justify-end" aria-hidden="true">
                <span className="inline-flex rotate-[-4deg] items-center gap-1.5 rounded-[10px] border-2 border-[color-mix(in_srgb,var(--royal)_45%,transparent)] px-2.5 py-1 text-[0.65rem] font-extrabold uppercase tracking-wide text-[var(--royal)]">
                  <VStampTool size={14} />
                  Đã kiểm
                </span>
              </div>

              <dl className="rounded-[10px] border-2 border-[color-mix(in_srgb,var(--ink)_22%,transparent)] bg-[var(--paper)] px-3.5 py-1">
                <InfoRow label="Danh mục">{detail.category || "—"}</InfoRow>
                <InfoRow label="Độ khó">
                  <InkBadge
                    tone={difficultyMeta(detail.difficulty).tone}
                    className="!text-[0.65rem]"
                  >
                    {difficultyMeta(detail.difficulty).label}
                  </InkBadge>
                </InfoRow>
                <InfoRow label="Trạng thái">
                  <InkBadge
                    tone={statusMeta(detail.status).tone}
                    className="!text-[0.65rem]"
                  >
                    {statusMeta(detail.status).label}
                  </InkBadge>
                </InfoRow>
                <InfoRow label="Phiên bản">
                  <span className="font-mono tabular">v{detail.version}</span>
                </InfoRow>
                <InfoRow label="Vai trò trong nhóm">
                  {detail.roles.length > 0 ? (
                    <span className="flex flex-wrap justify-end gap-1.5">
                      {detail.roles.map((role) => (
                        <InkBadge key={role} tone="mint" className="!text-[0.62rem]">
                          {role}
                        </InkBadge>
                      ))}
                    </span>
                  ) : (
                    "—"
                  )}
                </InfoRow>
                <InfoRow label="Quy mô nhóm">
                  <span className="tabular">
                    {detail.teamSize > 0 ? `${detail.teamSize} người` : "Chưa rõ"}
                  </span>
                </InfoRow>
                <InfoRow label="Số sprint">
                  <span className="tabular">{detail.sprintCount}</span>
                </InfoRow>
                <InfoRow label="Ngày tạo">
                  <span className="tabular">{safeDateVN(detail.createdAt)}</span>
                </InfoRow>
              </dl>

              <div>
                <p className="eyebrow !text-[0.62rem]">
                  Công nghệ ({detail.techStack.length})
                </p>
                {/* max=Infinity: hiển thị đầy đủ danh sách công nghệ */}
                <div className="mt-2">
                  <TechChips items={detail.techStack} max={Infinity} />
                </div>
              </div>

              <DialogFooter className="sm:justify-between">
                <p className="text-xs text-[var(--ink-soft)]">
                  Trạng thái chỉ hiển thị — đồng bộ từ hệ thống.
                </p>
                <InkButton variant="outline" size="sm" onClick={() => setDetailId(null)}>
                  Đóng
                </InkButton>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
