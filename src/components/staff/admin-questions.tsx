"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  VAlert,
  VCircleCheck,
  VClock,
  VEdit,
  VFlag,
  VInbox,
  VNotebookPen,
  VPlus,
  VRefresh,
  VSmile,
  type VIconComponent,
} from "@/components/icons/v-icons";
import { InkButton } from "@/components/notebook/reveal";
import { InkBadge, SketchCard } from "@/components/notebook/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { QuestionRow } from "@/lib/mock/types";
import { useApi } from "@/lib/use-api";
import { listQuestions } from "@/lib/api/admin";
import { cn } from "@/lib/utils";
import {
  ChipGroup,
  CountUpNumber,
  EmptyState,
  PencilLines,
  SectionError,
  SketchInput,
  SketchTextarea,
  StaffPageHeader,
} from "./staff-kit";

/* =====================================================================
 * NGÂN HÀNG CÂU HỎI — câu hỏi dùng cho phỏng vấn AI tuyển dụng.
 * ===================================================================== */

const QUESTION_ROLES = ["Frontend", "Backend", "QA", "Business Analyst"] as const;
const DIFFICULTIES = ["Dễ", "Vừa", "Khó"] as const;

type Difficulty = (typeof DIFFICULTIES)[number];

const DIFF_TONE: Record<Difficulty, string> = {
  "Dễ": "green",
  "Vừa": "amber",
  "Khó": "red",
};

/** Icon chọn độ khó — mặt cười / cờ / báo động. */
const DIFF_ICON: Record<Difficulty, VIconComponent> = {
  "Dễ": VSmile,
  "Vừa": VFlag,
  "Khó": VAlert,
};

const DIFF_OPTIONS = DIFFICULTIES.map((d) => ({ value: d, label: d }));

const ROLE_PREFIX: Record<string, string> = {
  Frontend: "FE",
  Backend: "BE",
  QA: "QA",
  "Business Analyst": "BA",
};

/** Ô trạng thái câu hỏi — dòng “Ngưng” mang chip đồng hồ + mờ nhẹ. */
function StatusCell({ status }: { status: QuestionRow["status"] }) {
  if (status === "Đang dùng")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--success)]">
        <span
          className="ws-dot"
          style={{ background: "var(--success)", borderColor: "transparent" }}
          aria-hidden="true"
        />
        Đang dùng
      </span>
    );
  if (status === "Ngưng")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[color-mix(in_srgb,var(--ink)_30%,transparent)] px-2 py-0.5 text-xs font-bold text-[var(--ink-soft)]">
        <VClock size={12} aria-hidden="true" />
        Ngưng
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--ink-soft)]">
      <span className="ws-dot" style={{ background: "var(--ink-soft)", borderColor: "transparent" }} aria-hidden="true" />
      Bản nháp
    </span>
  );
}

export default function AdminQuestions() {
  const { data, loading, error, reload } = useApi<QuestionRow[]>(listQuestions);

  const [overrides, setOverrides] = useState<Record<string, Partial<QuestionRow>>>({});
  const [added, setAdded] = useState<QuestionRow[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [diffFilter, setDiffFilter] = useState<"all" | Difficulty>("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [flashSaved, setFlashSaved] = useState<string | null>(null);
  const [form, setForm] = useState<{
    role: (typeof QUESTION_ROLES)[number];
    content: string;
    difficulty: Difficulty;
    type: string;
  }>({ role: "Frontend", content: "", difficulty: "Vừa", type: "Tư duy" });

  const [editQ, setEditQ] = useState<QuestionRow | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editDiff, setEditDiff] = useState<Difficulty>("Vừa");
  const [editRole, setEditRole] = useState<(typeof QUESTION_ROLES)[number]>("Frontend");

  const rows = useMemo(
    () =>
      [...added, ...(data ?? [])].map((r) =>
        overrides[r.id] ? { ...r, ...overrides[r.id] } : r,
      ),
    [added, data, overrides],
  );

  /* Id các câu vừa thêm trong phiên — dùng cho hiệu ứng pop-in */
  const addedIds = useMemo(() => new Set(added.map((a) => a.id)), [added]);

  const applyOverride = (id: string, patch: Partial<QuestionRow>) =>
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  /* Lọc theo vai trò + độ khó */
  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (roleFilter !== "all" && r.role !== roleFilter) return false;
        if (diffFilter !== "all" && r.difficulty !== diffFilter) return false;
        return true;
      }),
    [rows, roleFilter, diffFilter],
  );

  const roleOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.role, (counts.get(r.role) ?? 0) + 1);
    const roles = Array.from(new Set(rows.map((r) => r.role)));
    return [
      { value: "all", label: `Tất cả (${rows.length})` },
      ...roles.map((r) => ({ value: r, label: `${r} (${counts.get(r) ?? 0})` })),
    ];
  }, [rows]);

  const diffFilterOptions = [
    { value: "all", label: "Tất cả" },
    ...DIFF_OPTIONS,
  ] as const;

  /* Hành động (mô phỏng) */
  const toggleStatus = (row: QuestionRow) => {
    const next: QuestionRow["status"] = row.status === "Đang dùng" ? "Ngưng" : "Đang dùng";
    applyOverride(row.id, { status: next });
    toast.success(`${row.code} chuyển sang "${next}" (mô phỏng)`);
  };

  const openEdit = (row: QuestionRow) => {
    setEditQ(row);
    setEditContent(row.content);
    setEditDiff(row.difficulty);
    setEditRole(QUESTION_ROLES.includes(row.role as (typeof QUESTION_ROLES)[number])
      ? (row.role as (typeof QUESTION_ROLES)[number])
      : "Frontend");
  };

  const saveEdit = () => {
    if (!editQ) return;
    const content = editContent.trim();
    if (!content) {
      toast.error("Nội dung câu hỏi không được để trống.");
      return;
    }
    applyOverride(editQ.id, { content, difficulty: editDiff, role: editRole });
    setFlashSaved(editQ.id);
    window.setTimeout(() => setFlashSaved(null), 1800);
    toast.success(`Đã lưu chỉnh sửa ${editQ.code} (mô phỏng)`);
    setEditQ(null);
  };

  const submitCreate = () => {
    const content = form.content.trim();
    if (!content) {
      toast.error("Chưa nhập nội dung câu hỏi.");
      return;
    }
    const code = `Q-${ROLE_PREFIX[form.role] ?? "XX"}-${String(30 + rows.length).padStart(3, "0")}`;
    setAdded((prev) => [
      { id: `q-new-${Date.now()}`, code, role: form.role, content, difficulty: form.difficulty, type: form.type.trim() || "Tư duy", status: "Đang dùng" },
      ...prev,
    ]);
    setCreateOpen(false);
    setForm({ role: "Frontend", content: "", difficulty: "Vừa", type: "Tư duy" });
    setConfetti(true);
    window.setTimeout(() => setConfetti(false), 950);
    toast.success(`Đã thêm câu hỏi ${code} (mô phỏng)`);
  };

  /* Thống kê chân bảng */
  const inUse = rows.filter((r) => r.status === "Đang dùng").length;
  const usagePct = rows.length ? Math.round((inUse / rows.length) * 100) : 0;

  /* Trạng thái chờ */
  if (loading && !data) {
    return (
      <div>
        <StaffPageHeader eyebrow="Quản trị · phỏng vấn" title="Ngân hàng câu hỏi" />
        <SketchCard hover={false} className="p-5">
          <PencilLines rows={7} />
        </SketchCard>
      </div>
    );
  }

  if (error || !data) {
    return <SectionError message={error ?? "Chưa tải được ngân hàng câu hỏi."} onRetry={reload} />;
  }

  return (
    <div>
      <StaffPageHeader
        eyebrow="Quản trị · phỏng vấn"
        title="Ngân hàng câu hỏi"
        sub="Câu hỏi dùng cho phỏng vấn AI tuyển dụng."
        note="câu hỏi hay là câu hỏi khiến người ta phải suy nghĩ — không phải câu khó nhất"
        actions={
          <InkButton variant="royal" size="sm" onClick={() => setCreateOpen(true)}>
            <VPlus size={15} /> Thêm câu hỏi
          </InkButton>
        }
      />

      {/* Bộ lọc */}
      <SketchCard hover={false} className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow !text-[0.6rem]">Vai trò</span>
            <ChipGroup
              ariaLabel="Lọc câu hỏi theo vai trò"
              options={roleOptions}
              value={roleFilter}
              onChange={setRoleFilter}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow !text-[0.6rem]">Độ khó</span>
            <ChipGroup
              ariaLabel="Lọc câu hỏi theo độ khó"
              options={diffFilterOptions}
              value={diffFilter}
              onChange={setDiffFilter}
            />
          </div>
        </div>
      </SketchCard>

      {/* Bảng câu hỏi */}
      <SketchCard hover={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ink-table min-w-[900px]">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Vai trò</th>
                <th>Nội dung</th>
                <th>Độ khó</th>
                <th>Loại</th>
                <th>Trạng thái</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <EmptyState
                      icon={VInbox}
                      title="Không có câu hỏi nào khớp bộ lọc ✎"
                      note="Thử chọn Tất cả vai trò hoặc Tất cả độ khó."
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "sticker-pop",
                      row.status === "Ngưng" && "opacity-75",
                      addedIds.has(row.id) && "animate-pop-in",
                    )}
                  >
                    <td>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="rounded-[6px] border border-[color-mix(in_srgb,var(--ink)_30%,transparent)] bg-[var(--paper)] px-1.5 py-0.5 font-mono text-[0.7rem] font-bold text-[var(--ink)]">
                          {row.code}
                        </span>
                        {flashSaved === row.id && (
                          <span className="draw-check" aria-hidden="true">
                            <VCircleCheck size={16} className="text-[var(--success)]" />
                          </span>
                        )}
                      </span>
                    </td>
                    <td>
                      <InkBadge tone="blue" className="!text-[0.65rem]">
                        {row.role}
                      </InkBadge>
                    </td>
                    <td className="max-w-md">
                      <p className="truncate text-sm font-medium text-[var(--ink)]" title={row.content}>
                        {row.content}
                      </p>
                    </td>
                    <td>
                      <InkBadge tone={DIFF_TONE[row.difficulty]} className="!text-[0.65rem]">
                        {row.difficulty}
                      </InkBadge>
                    </td>
                    <td className="whitespace-nowrap text-xs text-[var(--ink-soft)]">{row.type}</td>
                    <td>
                      <StatusCell status={row.status} />
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleStatus(row)}
                          aria-label={
                            row.status === "Đang dùng"
                              ? `Ngưng sử dụng câu ${row.code}`
                              : `Bật lại sử dụng câu ${row.code}`
                          }
                          title={row.status === "Đang dùng" ? "Ngưng sử dụng" : "Bật lại sử dụng"}
                          className="focus-ink grid h-8 w-8 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--ink-soft)] transition-all hover:-translate-y-0.5 hover:bg-[var(--blue-mist)] hover:text-[var(--ink)]"
                        >
                          <VRefresh size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          aria-label={`Sửa câu hỏi ${row.code}`}
                          title="Sửa câu hỏi"
                          className="focus-ink grid h-8 w-8 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--ink-soft)] transition-all hover:-translate-y-0.5 hover:bg-[var(--blue-mist)] hover:text-[var(--ink)]"
                        >
                          <VEdit size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Thống kê chân bảng — số chạy dần lên */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_20%,transparent)] px-4 py-3">
          <VNotebookPen size={14} className="text-[var(--ink-soft)]" />
          <p className="tabular text-xs text-[var(--ink-soft)]">
            <CountUpNumber value={rows.length} /> câu hỏi ·{" "}
            <b className="text-[var(--ink)]">
              <CountUpNumber value={inUse} /> đang dùng
            </b>{" "}
            · {usagePct}% tỷ lệ dùng
          </p>
        </div>
      </SketchCard>

      {/* Hộp thoại: thêm câu hỏi */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[var(--ink)]">Thêm câu hỏi</DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Câu hỏi mới vào thẳng hàng "Đang dùng" cho vòng phỏng vấn AI.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <fieldset>
              <legend className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                Vai trò
              </legend>
              <ChipGroup
                ariaLabel="Chọn vai trò cho câu hỏi mới"
                options={QUESTION_ROLES.map((r) => ({ value: r, label: r }))}
                value={form.role}
                onChange={(role) =>
                  setForm((f) => ({ ...f, role: role as (typeof QUESTION_ROLES)[number] }))
                }
              />
            </fieldset>
            <div>
              <label
                htmlFor="new-question-content"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]"
              >
                Nội dung
              </label>
              <SketchTextarea
                id="new-question-content"
                rows={3}
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Đặt câu hỏi rõ tình huống — tránh câu trả lời được bằng một từ."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <fieldset>
                <legend className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                  Độ khó
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  {DIFF_OPTIONS.map((d) => {
                    const DiffIcon = DIFF_ICON[d.value];
                    const active = form.difficulty === d.value;
                    return (
                      <button
                        key={d.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setForm((f) => ({ ...f, difficulty: d.value }))}
                        className={cn(
                          "focus-ink flex flex-col items-center gap-1 rounded-[10px] border-2 px-1 py-2.5 text-xs font-bold transition-all",
                          active
                            ? "border-[var(--ink)] bg-[var(--blue-mist)] text-[var(--ink)] shadow-ink-2"
                            : "border-[color-mix(in_srgb,var(--ink)_28%,transparent)] bg-[var(--paper)] text-[var(--ink-soft)] hover:border-[var(--ink)] hover:text-[var(--ink)]",
                        )}
                      >
                        <DiffIcon
                          size={18}
                          className={cn(
                            active &&
                              (d.value === "Dễ"
                                ? "text-[var(--success)]"
                                : d.value === "Vừa"
                                  ? "text-[var(--warning)]"
                                  : "text-[var(--danger)]"),
                          )}
                          aria-hidden="true"
                        />
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div>
                <label
                  htmlFor="new-question-type"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]"
                >
                  Loại
                </label>
                <SketchInput
                  id="new-question-type"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  placeholder="Tư duy / Kỹ thuật / Tình huống..."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
              Hủy
            </InkButton>
            <InkButton variant="royal" size="sm" onClick={submitCreate}>
              <VPlus size={14} /> Thêm vào ngân hàng
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hộp thoại: sửa câu hỏi */}
      <Dialog open={!!editQ} onOpenChange={(open) => !open && setEditQ(null)}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          {editQ && (
            <>
              <DialogHeader>
                <DialogTitle className="font-extrabold text-[var(--ink)]">
                  Sửa câu hỏi {editQ.code}
                </DialogTitle>
                <DialogDescription className="text-[var(--ink-soft)]">
                  Chỉnh nội dung và độ khó — mã giữ nguyên.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-[6px] border border-[color-mix(in_srgb,var(--ink)_30%,transparent)] bg-[var(--paper)] px-1.5 py-0.5 font-mono text-[0.7rem] font-bold text-[var(--ink)]">
                    {editQ.code}
                  </span>
                  <InkBadge tone="blue" className="!text-[0.65rem]">
                    {editQ.role}
                  </InkBadge>
                  <InkBadge tone="neutral" className="!text-[0.65rem]">
                    {editQ.type}
                  </InkBadge>
                  <span
                    className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-[9px] border-2 border-[var(--ink)] bg-[var(--blue-mist)] text-[var(--royal)]"
                    aria-hidden="true"
                  >
                    <VEdit size={16} />
                  </span>
                </div>
                <fieldset>
                  <legend className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                    Vai trò
                  </legend>
                  <ChipGroup
                    ariaLabel="Đổi vai trò câu hỏi"
                    options={QUESTION_ROLES.map((r) => ({ value: r, label: r }))}
                    value={editRole}
                    onChange={setEditRole}
                  />
                </fieldset>
                <div>
                  <label
                    htmlFor="edit-question-content"
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]"
                  >
                    Nội dung
                  </label>
                  <SketchTextarea
                    id="edit-question-content"
                    rows={3}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                  />
                </div>
                <fieldset>
                  <legend className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                    Độ khó
                  </legend>
                  <ChipGroup
                    ariaLabel="Đổi độ khó câu hỏi"
                    options={DIFF_OPTIONS}
                    value={editDiff}
                    onChange={setEditDiff}
                  />
                </fieldset>
              </div>
              <DialogFooter>
                <InkButton variant="ghost" size="sm" onClick={() => setEditQ(null)}>
                  Hủy
                </InkButton>
                <InkButton variant="royal" size="sm" onClick={saveEdit}>
                  Lưu chỉnh sửa
                </InkButton>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confetti khi thêm câu hỏi thành công */}
      {confetti && (
        <span
          aria-hidden="true"
          className="confetti-pop play pointer-events-none fixed left-1/2 top-28 z-[60] h-1 w-1"
        />
      )}
    </div>
  );
}
