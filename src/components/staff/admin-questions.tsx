"use client";

import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  VArchive,
  VClock,
  VEdit,
  VInbox,
  VNotebookPen,
  VPlus,
  VSearch,
} from "@/components/icons/v-icons";
import { InkButton } from "@/components/notebook/reveal";
import { InkBadge, SketchCard } from "@/components/notebook/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminErrorMessage,
  createQuestion,
  listQuestions,
  retireQuestion,
  updateQuestion,
  type AdminQuestionRow,
  type QuestionDifficulty,
  type QuestionPhase,
} from "@/lib/api/admin";
import { useApi } from "@/lib/use-api";
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
  relativeVN,
} from "./staff-kit";

/* =====================================================================
 * NGÂN HÀNG CÂU HỎI — câu hỏi dùng cho phỏng vấn AI tuyển dụng.
 * Dữ liệu thật từ BE: GET/POST/PUT/DELETE /admin/question-bank.
 * ===================================================================== */

/* Vai trò theo contract BE (roleCode). */
const ROLE_OPTIONS = [
  { value: "frontend", label: "Frontend" },
  { value: "backend", label: "Backend" },
  { value: "fullstack", label: "Fullstack" },
  { value: "data", label: "Data" },
] as const;

type QuestionRoleCode = (typeof ROLE_OPTIONS)[number]["value"];

const ROLE_LABEL: Record<string, string> = {
  frontend: "Frontend",
  backend: "Backend",
  fullstack: "Fullstack",
  data: "Data",
};

/* Giai đoạn phỏng vấn theo contract BE (phase). */
const PHASE_OPTIONS = [
  { value: "technical", label: "Kỹ thuật" },
  { value: "introduction", label: "Giới thiệu" },
  { value: "english", label: "Tiếng Anh" },
  { value: "communication", label: "Giao tiếp" },
] as const;

const PHASE_LABEL: Record<string, string> = {
  technical: "Kỹ thuật",
  introduction: "Giới thiệu",
  english: "Tiếng Anh",
  communication: "Giao tiếp",
};

const PHASE_VALUES: readonly QuestionPhase[] = [
  "technical",
  "introduction",
  "english",
  "communication",
];

/* Độ khó theo contract BE (easy | medium | hard). */
const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Dễ" },
  { value: "medium", label: "Vừa" },
  { value: "hard", label: "Khó" },
] as const;

const DIFF_LABEL: Record<QuestionDifficulty, string> = {
  easy: "Dễ",
  medium: "Vừa",
  hard: "Khó",
};

const DIFF_TONE: Record<QuestionDifficulty, string> = {
  easy: "green",
  medium: "amber",
  hard: "red",
};

/* Ngôn ngữ câu hỏi (vi | en). */
const LANGUAGE_OPTIONS = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "Tiếng Anh" },
] as const;

type QuestionLanguage = "vi" | "en";

const LANGUAGE_LABEL: Record<string, string> = {
  vi: "Tiếng Việt",
  en: "Tiếng Anh",
};

/* Style chung cho Select trong dialog (giữ chất sổ tay). */
const SELECT_TRIGGER_CLASS =
  "focus-ink h-9 w-full rounded-[9px_11px_10px_12px] border-2 border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] shadow-none data-[placeholder]:text-[var(--ink-soft)]";
const SELECT_CONTENT_CLASS =
  "rounded-[10px_13px_11px_12px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--ink)] shadow-ink-3";

const FIELD_LABEL_CLASS =
  "mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]";
const FIELD_HINT_CLASS = "mt-1 text-[0.7rem] text-[var(--ink-soft)]";

const NO_QUESTIONS: AdminQuestionRow[] = [];

/** Ép an toàn phase từ BE (string) về union của contract. */
function asPhase(value: string): QuestionPhase {
  return PHASE_VALUES.includes(value as QuestionPhase) ? (value as QuestionPhase) : "technical";
}

/** Tách chuỗi khái niệm (phân tách bằng dấu phẩy) thành mảng đã chuẩn hoá. */
function parseConcepts(raw: string): string[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/** Chip mã câu hỏi — nét mực, font mono. */
function CodeChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-[6px] border border-[color-mix(in_srgb,var(--ink)_30%,transparent)] bg-[var(--paper)] px-1.5 py-0.5 font-mono text-[0.7rem] font-bold text-[var(--ink)]">
      {children}
    </span>
  );
}

/** Trạng thái câu hỏi theo BE: isActive = đang dùng, ngược lại đã nghỉ. */
function StatusCell({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <InkBadge tone="green" dot className="!text-[0.65rem]">
        Đang dùng
      </InkBadge>
    );
  }
  return (
    <InkBadge tone="neutral" className="!text-[0.65rem]">
      <VClock size={12} aria-hidden="true" />
      <span className="line-through decoration-2 decoration-[color-mix(in_srgb,var(--danger)_80%,transparent)]">
        Đã nghỉ
      </span>
    </InkBadge>
  );
}

/* ------------------------------ form state ------------------------------ */

interface QuestionFormState {
  roleCode: QuestionRoleCode;
  phase: QuestionPhase;
  difficulty: QuestionDifficulty;
  language: QuestionLanguage;
  prompt: string;
  concepts: string;
  exampleAnswer: string;
  rubric: string;
  hints: string;
  tags: string;
}

const EMPTY_QUESTION_FORM: QuestionFormState = {
  roleCode: "frontend",
  phase: "technical",
  difficulty: "medium",
  language: "vi",
  prompt: "",
  concepts: "",
  exampleAnswer: "",
  rubric: "",
  hints: "",
  tags: "",
};

interface EditFormState {
  prompt: string;
  exampleAnswer: string;
  difficulty: QuestionDifficulty;
  phase: QuestionPhase;
}

const EMPTY_EDIT_FORM: EditFormState = {
  prompt: "",
  exampleAnswer: "",
  difficulty: "medium",
  phase: "technical",
};

export default function AdminQuestions() {
  const { data, loading, error, reload } = useApi<AdminQuestionRow[]>(listQuestions);
  const rows = data ?? NO_QUESTIONS;

  /* Bộ lọc client-side: từ khóa + vai trò + độ khó */
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [diffFilter, setDiffFilter] = useState<"all" | QuestionDifficulty>("all");

  /* Dialog thêm câu hỏi */
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<QuestionFormState>(EMPTY_QUESTION_FORM);
  const [confetti, setConfetti] = useState(false);

  /* Dialog sửa câu hỏi — gửi kèm version hiện tại của dòng */
  const [editQ, setEditQ] = useState<AdminQuestionRow | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>(EMPTY_EDIT_FORM);
  const [saving, setSaving] = useState(false);

  /* Dialog xem chi tiết */
  const [detailQ, setDetailQ] = useState<AdminQuestionRow | null>(null);

  /* Xác nhận nghỉ dùng câu hỏi (DELETE /admin/question-bank/{id}?version=N) */
  const [retireQ, setRetireQ] = useState<AdminQuestionRow | null>(null);
  const [retiring, setRetiring] = useState(false);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (roleFilter !== "all" && row.roleCode !== roleFilter) return false;
      if (diffFilter !== "all" && row.difficulty !== diffFilter) return false;
      if (
        keyword &&
        !row.prompt.toLowerCase().includes(keyword) &&
        !row.roleCode.toLowerCase().includes(keyword) &&
        !row.code.toLowerCase().includes(keyword)
      )
        return false;
      return true;
    });
  }, [rows, roleFilter, diffFilter, search]);

  const roleFilterOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) counts.set(row.roleCode, (counts.get(row.roleCode) ?? 0) + 1);
    return [
      { value: "all", label: `Tất cả (${rows.length})` },
      ...ROLE_OPTIONS.map((role) => ({
        value: role.value,
        label: `${role.label} (${counts.get(role.value) ?? 0})`,
      })),
    ];
  }, [rows]);

  const diffFilterOptions: readonly { value: "all" | QuestionDifficulty; label: string }[] = [
    { value: "all", label: "Tất cả" },
    ...DIFFICULTY_OPTIONS,
  ];

  /* --------------------------- thêm câu hỏi --------------------------- */

  const submitCreate = async () => {
    if (creating) return;
    const prompt = form.prompt.trim();
    const exampleAnswer = form.exampleAnswer.trim();
    const concepts = parseConcepts(form.concepts);
    const rubric = form.rubric.trim();
    const hints = parseConcepts(form.hints);
    const tags = parseConcepts(form.tags);

    /* Validate client trước khi gọi BE */
    if (prompt.length < 10) {
      toast.error("Câu hỏi cần ít nhất 10 ký tự.");
      return;
    }
    if (concepts.length === 0) {
      toast.error("Nhập ít nhất 1 khái niệm mong đợi, phân tách bằng dấu phẩy.");
      return;
    }
    if (concepts.length > 20) {
      toast.error("Tối đa 20 khái niệm mong đợi.");
      return;
    }
    if (new Set(concepts).size !== concepts.length) {
      toast.error("Khái niệm mong đợi không được trùng nhau.");
      return;
    }
    if (exampleAnswer.length < 10) {
      toast.error("Câu trả lời mẫu cần ít nhất 10 ký tự.");
      return;
    }
    if (rubric.length < 10) {
      toast.error("Rubric chấm điểm cần ít nhất 10 ký tự (vd: 0-40 sai; 41-70 thiếu ví dụ; 71-100 chuẩn)." );
      return;
    }
    if (hints.length === 0 || hints.length > 8) {
      toast.error("Gợi ý hỏi sâu: nhập 1–8 gợi ý, phân tách bằng dấu phẩy.");
      return;
    }
    if (hints.some((h) => h.length < 5)) {
      toast.error("Mỗi gợi ý hỏi sâu cần ít nhất 5 ký tự.");
      return;
    }
    if (tags.length === 0 || tags.length > 20 || new Set(tags).size !== tags.length) {
      toast.error("Thẻ phân loại: nhập 1–20 thẻ, phân tách bằng dấu phẩy, không trùng.");
      return;
    }

    setCreating(true);
    try {
      const created = await createQuestion({
        roleCode: form.roleCode,
        phase: form.phase,
        difficulty: form.difficulty,
        language: form.language,
        prompt,
        expectedConcepts: concepts,
        exampleAnswer,
        scoringRubric: rubric,
        followUpHints: hints,
        tags,
        isActive: true,
      });
      setCreateOpen(false);
      setForm(EMPTY_QUESTION_FORM);
      setConfetti(true);
      window.setTimeout(() => setConfetti(false), 950);
      toast.success(`Đã thêm câu hỏi ${created.code} vào ngân hàng.`);
      reload();
    } catch (err) {
      toast.error(adminErrorMessage(err, "Không thêm được câu hỏi."));
    } finally {
      setCreating(false);
    }
  };

  /* ---------------------------- sửa câu hỏi ---------------------------- */

  const openEdit = (row: AdminQuestionRow) => {
    setEditQ(row);
    setEditForm({
      prompt: row.prompt,
      exampleAnswer: row.exampleAnswer,
      difficulty: row.difficulty,
      phase: asPhase(row.phase),
    });
  };

  const saveEdit = async () => {
    if (!editQ || saving) return;
    const prompt = editForm.prompt.trim();
    const exampleAnswer = editForm.exampleAnswer.trim();

    if (prompt.length < 10) {
      toast.error("Câu hỏi cần ít nhất 10 ký tự.");
      return;
    }
    if (exampleAnswer.length < 10) {
      toast.error("Câu trả lời mẫu cần ít nhất 10 ký tự.");
      return;
    }

    setSaving(true);
    try {
      await updateQuestion(editQ.id, editQ.version, {
        prompt,
        exampleAnswer,
        difficulty: editForm.difficulty,
        phase: editForm.phase,
      });
      toast.success(`Đã lưu chỉnh sửa câu hỏi ${editQ.code}.`);
      setEditQ(null);
      reload();
    } catch (err) {
      toast.error(adminErrorMessage(err, "Không lưu được chỉnh sửa câu hỏi."));
    } finally {
      setSaving(false);
    }
  };

  /* --------------------------- nghỉ dùng ------------------------------ */

  const confirmRetire = async () => {
    if (!retireQ || retiring) return;
    setRetiring(true);
    try {
      await retireQuestion(retireQ.id, retireQ.version);
      toast.success(`Câu hỏi ${retireQ.code} đã nghỉ dùng.`);
      setRetireQ(null);
      reload();
    } catch (err) {
      toast.error(adminErrorMessage(err, "Không nghỉ dùng được câu hỏi."));
    } finally {
      setRetiring(false);
    }
  };

  /* Thống kê chân bảng */
  const inUse = rows.filter((row) => row.isActive).length;
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

      {/* Bộ lọc + tìm kiếm */}
      <SketchCard hover={false} className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
          <div className="flex min-w-[240px] flex-1 items-center gap-2 sm:max-w-sm">
            <span className="eyebrow !text-[0.6rem]">Tìm</span>
            <div className="relative min-w-0 flex-1">
              <VSearch
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]"
                aria-hidden="true"
              />
              <SketchInput
                id="question-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Mã, vai trò hoặc nội dung câu hỏi..."
                aria-label="Tìm câu hỏi theo mã, vai trò hoặc nội dung"
                className="pl-8"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow !text-[0.6rem]">Vai trò</span>
            <ChipGroup
              ariaLabel="Lọc câu hỏi theo vai trò"
              options={roleFilterOptions}
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
                <th>Mã câu hỏi</th>
                <th>Vai trò</th>
                <th>Giai đoạn</th>
                <th>Độ khó</th>
                <th>Trạng thái</th>
                <th>Cập nhật</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <EmptyState
                      icon={VInbox}
                      title={
                        rows.length === 0
                          ? "Ngân hàng câu hỏi đang trống"
                          : "Không có câu hỏi nào khớp bộ lọc"
                      }
                      note={
                        rows.length === 0
                          ? "Nhấn Thêm câu hỏi để tạo câu hỏi đầu tiên cho vòng phỏng vấn AI."
                          : "Thử bỏ từ khóa tìm kiếm hoặc chọn lại vai trò, độ khó."
                      }
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.id}
                    className={cn("sticker-pop", !row.isActive && "opacity-75")}
                  >
                    <td className="w-[26rem] max-w-[26rem]">
                      <div className="flex min-w-0 flex-col items-start gap-1">
                        <CodeChip>{row.code}</CodeChip>
                        <button
                          type="button"
                          onClick={() => setDetailQ(row)}
                          aria-label={`Xem chi tiết câu hỏi ${row.code}`}
                          title={`Xem chi tiết câu hỏi ${row.code}`}
                          className="focus-ink block w-full max-w-full truncate text-left text-sm font-medium text-[var(--ink)] underline-offset-2 hover:underline"
                        >
                          {row.prompt}
                        </button>
                      </div>
                    </td>
                    <td>
                      <InkBadge tone="blue" className="!text-[0.65rem]">
                        {ROLE_LABEL[row.roleCode] ?? row.roleCode}
                      </InkBadge>
                    </td>
                    <td>
                      <InkBadge tone="mint" className="!text-[0.65rem]">
                        {PHASE_LABEL[row.phase] ?? row.phase}
                      </InkBadge>
                    </td>
                    <td>
                      <InkBadge tone={DIFF_TONE[row.difficulty]} className="!text-[0.65rem]">
                        {DIFF_LABEL[row.difficulty]}
                      </InkBadge>
                    </td>
                    <td>
                      <StatusCell isActive={row.isActive} />
                    </td>
                    <td className="whitespace-nowrap text-xs text-[var(--ink-soft)]">
                      {row.updatedAt ? relativeVN(row.updatedAt) : "—"}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          aria-label={`Sửa câu hỏi ${row.code}`}
                          title="Sửa câu hỏi"
                          className="focus-ink grid h-8 w-8 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--ink-soft)] transition-all hover:-translate-y-0.5 hover:bg-[var(--blue-mist)] hover:text-[var(--ink)]"
                        >
                          <VEdit size={14} />
                        </button>
                        {row.isActive && (
                          <button
                            type="button"
                            onClick={() => setRetireQ(row)}
                            aria-label={`Nghỉ dùng câu hỏi ${row.code}`}
                            title="Nghỉ dùng câu hỏi"
                            className="focus-ink grid h-8 w-8 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--ink-soft)] transition-all hover:-translate-y-0.5 hover:bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] hover:text-[var(--danger)]"
                          >
                            <VArchive size={14} />
                          </button>
                        )}
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
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[var(--ink)]">Thêm câu hỏi</DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Câu hỏi mới sẽ vào ngân hàng, dùng cho vòng phỏng vấn AI.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="new-question-role" className={FIELD_LABEL_CLASS}>
                  Vai trò
                </label>
                <Select
                  value={form.roleCode}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, roleCode: v as QuestionRoleCode }))
                  }
                >
                  <SelectTrigger id="new-question-role" className={SELECT_TRIGGER_CLASS} aria-label="Chọn vai trò">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={SELECT_CONTENT_CLASS}>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="new-question-phase" className={FIELD_LABEL_CLASS}>
                  Giai đoạn
                </label>
                <Select
                  value={form.phase}
                  onValueChange={(v) => setForm((f) => ({ ...f, phase: v as QuestionPhase }))}
                >
                  <SelectTrigger id="new-question-phase" className={SELECT_TRIGGER_CLASS} aria-label="Chọn giai đoạn phỏng vấn">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={SELECT_CONTENT_CLASS}>
                    {PHASE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="new-question-difficulty" className={FIELD_LABEL_CLASS}>
                  Độ khó
                </label>
                <Select
                  value={form.difficulty}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, difficulty: v as QuestionDifficulty }))
                  }
                >
                  <SelectTrigger id="new-question-difficulty" className={SELECT_TRIGGER_CLASS} aria-label="Chọn độ khó">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={SELECT_CONTENT_CLASS}>
                    {DIFFICULTY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="new-question-language" className={FIELD_LABEL_CLASS}>
                  Ngôn ngữ
                </label>
                <Select
                  value={form.language}
                  onValueChange={(v) => setForm((f) => ({ ...f, language: v as QuestionLanguage }))}
                >
                  <SelectTrigger id="new-question-language" className={SELECT_TRIGGER_CLASS} aria-label="Chọn ngôn ngữ câu hỏi">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={SELECT_CONTENT_CLASS}>
                    {LANGUAGE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label htmlFor="new-question-prompt" className={FIELD_LABEL_CLASS}>
                Câu hỏi
              </label>
              <SketchTextarea
                id="new-question-prompt"
                rows={3}
                value={form.prompt}
                onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
                placeholder="Đặt câu hỏi rõ tình huống — tránh câu trả lời được bằng một từ."
                aria-describedby="new-question-prompt-hint"
              />
              <p id="new-question-prompt-hint" className={FIELD_HINT_CLASS}>
                Tối thiểu 10 ký tự.
              </p>
            </div>
            <div>
              <label htmlFor="new-question-concepts" className={FIELD_LABEL_CLASS}>
                Khái niệm mong đợi
              </label>
              <SketchInput
                id="new-question-concepts"
                value={form.concepts}
                onChange={(e) => setForm((f) => ({ ...f, concepts: e.target.value }))}
                placeholder="VD: REST API, xác thực JWT, phân trang"
                aria-describedby="new-question-concepts-hint"
              />
              <p id="new-question-concepts-hint" className={FIELD_HINT_CLASS}>
                Phân tách bằng dấu phẩy — từ 1 đến 20 khái niệm, không trùng nhau.
              </p>
            </div>
            <div>
              <label htmlFor="new-question-example" className={FIELD_LABEL_CLASS}>
                Câu trả lời mẫu
              </label>
              <SketchTextarea
                id="new-question-example"
                rows={4}
                value={form.exampleAnswer}
                onChange={(e) => setForm((f) => ({ ...f, exampleAnswer: e.target.value }))}
                placeholder="Câu trả lời chuẩn mà vòng phỏng vấn AI mong đợi."
                aria-describedby="new-question-example-hint"
              />
              <p id="new-question-example-hint" className={FIELD_HINT_CLASS}>
                Tối thiểu 10 ký tự.
              </p>
            </div>
            <div>
              <label htmlFor="new-question-rubric" className={FIELD_LABEL_CLASS}>
                Rubric chấm điểm
              </label>
              <SketchTextarea
                id="new-question-rubric"
                rows={3}
                value={form.rubric}
                onChange={(e) => setForm((f) => ({ ...f, rubric: e.target.value }))}
                placeholder="VD: 0-40 thiếu/sai; 41-70 đúng nhưng thiếu ví dụ; 71-100 đúng, có ví dụ và đánh giá đổi mới."
                aria-describedby="new-question-rubric-hint"
              />
              <p id="new-question-rubric-hint" className={FIELD_HINT_CLASS}>
                Thang điểm AI dùng để chấm — tối thiểu 10 ký tự.
              </p>
            </div>
            <div>
              <label htmlFor="new-question-hints" className={FIELD_LABEL_CLASS}>
                Gợi ý hỏi sâu
              </label>
              <SketchInput
                id="new-question-hints"
                value={form.hints}
                onChange={(e) => setForm((f) => ({ ...f, hints: e.target.value }))}
                placeholder="VD: hỏi thêm ví dụ cụ thể, hỏi về đánh đổi hiệu năng"
                aria-describedby="new-question-hints-hint"
              />
              <p id="new-question-hints-hint" className={FIELD_HINT_CLASS}>
                Phân tách bằng dấu phẩy — 1 đến 8 gợi ý, mỗi gợi ý tối thiểu 5 ký tự.
              </p>
            </div>
            <div>
              <label htmlFor="new-question-tags" className={FIELD_LABEL_CLASS}>
                Thẻ phân loại
              </label>
              <SketchInput
                id="new-question-tags"
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="VD: frontend, security, cookie"
                aria-describedby="new-question-tags-hint"
              />
              <p id="new-question-tags-hint" className={FIELD_HINT_CLASS}>
                Phân tách bằng dấu phẩy — 1 đến 20 thẻ, không trùng. Câu hỏi mới tạo ở
                trạng thái Đang dùng.
              </p>
            </div>
          </div>
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setCreateOpen(false)} disabled={creating}>
              Hủy
            </InkButton>
            <InkButton
              variant="royal"
              size="sm"
              onClick={() => void submitCreate()}
              disabled={creating}
            >
              <VPlus size={14} /> {creating ? "Đang thêm..." : "Thêm vào ngân hàng"}
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hộp thoại: sửa câu hỏi — gửi kèm version hiện tại */}
      <Dialog open={!!editQ} onOpenChange={(open) => !open && setEditQ(null)}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-lg">
          {editQ && (
            <>
              <DialogHeader>
                <DialogTitle className="font-extrabold text-[var(--ink)]">
                  Sửa câu hỏi {editQ.code}
                </DialogTitle>
                <DialogDescription className="text-[var(--ink-soft)]">
                  Chỉnh câu hỏi, câu trả lời mẫu, giai đoạn và độ khó — mã, vai trò, ngôn ngữ giữ
                  nguyên theo phiên bản v{editQ.version}.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <CodeChip>{editQ.code}</CodeChip>
                  <InkBadge tone="blue" className="!text-[0.65rem]">
                    {ROLE_LABEL[editQ.roleCode] ?? editQ.roleCode}
                  </InkBadge>
                  <InkBadge tone="mint" className="!text-[0.65rem]">
                    {PHASE_LABEL[editQ.phase] ?? editQ.phase}
                  </InkBadge>
                  <InkBadge tone={DIFF_TONE[editQ.difficulty]} className="!text-[0.65rem]">
                    {DIFF_LABEL[editQ.difficulty]}
                  </InkBadge>
                  <StatusCell isActive={editQ.isActive} />
                  <span
                    className="ml-auto font-mono text-[0.7rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]"
                    title="Phiên bản hiện tại của câu hỏi trên BE"
                  >
                    v{editQ.version}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="edit-question-phase" className={FIELD_LABEL_CLASS}>
                      Giai đoạn
                    </label>
                    <Select
                      value={editForm.phase}
                      onValueChange={(v) => setEditForm((f) => ({ ...f, phase: v as QuestionPhase }))}
                    >
                      <SelectTrigger id="edit-question-phase" className={SELECT_TRIGGER_CLASS} aria-label="Đổi giai đoạn phỏng vấn">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={SELECT_CONTENT_CLASS}>
                        {PHASE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label htmlFor="edit-question-difficulty" className={FIELD_LABEL_CLASS}>
                      Độ khó
                    </label>
                    <Select
                      value={editForm.difficulty}
                      onValueChange={(v) =>
                        setEditForm((f) => ({ ...f, difficulty: v as QuestionDifficulty }))
                      }
                    >
                      <SelectTrigger id="edit-question-difficulty" className={SELECT_TRIGGER_CLASS} aria-label="Đổi độ khó">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={SELECT_CONTENT_CLASS}>
                        {DIFFICULTY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label htmlFor="edit-question-prompt" className={FIELD_LABEL_CLASS}>
                    Câu hỏi
                  </label>
                  <SketchTextarea
                    id="edit-question-prompt"
                    rows={3}
                    value={editForm.prompt}
                    onChange={(e) => setEditForm((f) => ({ ...f, prompt: e.target.value }))}
                    aria-describedby="edit-question-prompt-hint"
                  />
                  <p id="edit-question-prompt-hint" className={FIELD_HINT_CLASS}>
                    Tối thiểu 10 ký tự.
                  </p>
                </div>
                <div>
                  <label htmlFor="edit-question-answer" className={FIELD_LABEL_CLASS}>
                    Câu trả lời mẫu
                  </label>
                  <SketchTextarea
                    id="edit-question-answer"
                    rows={4}
                    value={editForm.exampleAnswer}
                    onChange={(e) => setEditForm((f) => ({ ...f, exampleAnswer: e.target.value }))}
                    aria-describedby="edit-question-answer-hint"
                  />
                  <p id="edit-question-answer-hint" className={FIELD_HINT_CLASS}>
                    Tối thiểu 10 ký tự.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <InkButton variant="ghost" size="sm" onClick={() => setEditQ(null)} disabled={saving}>
                  Hủy
                </InkButton>
                <InkButton variant="royal" size="sm" onClick={() => void saveEdit()} disabled={saving}>
                  {saving ? "Đang lưu..." : "Lưu chỉnh sửa"}
                </InkButton>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Hộp thoại: xem chi tiết câu hỏi */}
      <Dialog open={!!detailQ} onOpenChange={(open) => !open && setDetailQ(null)}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-lg">
          {detailQ && (
            <>
              <DialogHeader>
                <DialogTitle className="font-extrabold text-[var(--ink)]">
                  Chi tiết câu hỏi {detailQ.code}
                </DialogTitle>
                <DialogDescription className="text-[var(--ink-soft)]">
                  Thông tin đầy đủ của câu hỏi trong ngân hàng.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <InkBadge tone="blue" className="!text-[0.65rem]">
                    {ROLE_LABEL[detailQ.roleCode] ?? detailQ.roleCode}
                  </InkBadge>
                  <InkBadge tone="mint" className="!text-[0.65rem]">
                    {PHASE_LABEL[detailQ.phase] ?? detailQ.phase}
                  </InkBadge>
                  <InkBadge tone={DIFF_TONE[detailQ.difficulty]} className="!text-[0.65rem]">
                    {DIFF_LABEL[detailQ.difficulty]}
                  </InkBadge>
                  <InkBadge tone="neutral" className="!text-[0.65rem]">
                    {LANGUAGE_LABEL[detailQ.language] ?? detailQ.language}
                  </InkBadge>
                  <StatusCell isActive={detailQ.isActive} />
                </div>
                <div>
                  <p className="eyebrow !text-[0.6rem]">Câu hỏi</p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--ink)]">{detailQ.prompt}</p>
                </div>
                <div>
                  <p className="eyebrow !text-[0.6rem]">Khái niệm mong đợi</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {detailQ.expectedConcepts.length > 0 ? (
                      detailQ.expectedConcepts.map((concept) => (
                        <InkBadge key={concept} tone="neutral" className="!text-[0.65rem]">
                          {concept}
                        </InkBadge>
                      ))
                    ) : (
                      <span className="text-sm text-[var(--ink-soft)]">
                        Chưa có khái niệm nào.
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="eyebrow !text-[0.6rem]">Câu trả lời mẫu</p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-[var(--ink)]">
                    {detailQ.exampleAnswer || "Chưa có câu trả lời mẫu."}
                  </p>
                </div>
                <p className="font-mono text-[0.7rem] uppercase tracking-wide text-[var(--ink-soft)]">
                  Phiên bản v{detailQ.version} · Cập nhật{" "}
                  {detailQ.updatedAt ? relativeVN(detailQ.updatedAt) : "—"}
                </p>
              </div>
              <DialogFooter>
                <InkButton variant="ghost" size="sm" onClick={() => setDetailQ(null)}>
                  Đóng
                </InkButton>
                <InkButton
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const row = detailQ;
                    setDetailQ(null);
                    openEdit(row);
                  }}
                >
                  <VEdit size={14} /> Sửa câu hỏi này
                </InkButton>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Xác nhận nghỉ dùng câu hỏi — không thể hoàn tác */}
      <AlertDialog open={!!retireQ} onOpenChange={(open) => !open && !retiring && setRetireQ(null)}>
        <AlertDialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          {retireQ && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-extrabold text-[var(--ink)]">
                  Nghỉ dùng câu hỏi {retireQ.code}?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[var(--ink-soft)]">
                  Câu hỏi sẽ bị gỡ khỏi các vòng phỏng vấn AI. Hành động này không thể hoàn tác —
                  không thể bật lại câu hỏi đã nghỉ.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="rounded-[9px_11px_10px_12px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_25%,transparent)] bg-[var(--paper)] px-3 py-2.5">
                <p className="text-sm leading-relaxed text-[var(--ink)]">{retireQ.prompt}</p>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel
                  className="focus-ink border-2 border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--blue-mist)]"
                  disabled={retiring}
                >
                  Hủy
                </AlertDialogCancel>
                <AlertDialogAction
                  className="focus-ink bg-[var(--danger)] text-white hover:bg-[color-mix(in_srgb,var(--danger)_85%,black)]"
                  disabled={retiring}
                  onClick={(e) => {
                    e.preventDefault();
                    void confirmRetire();
                  }}
                >
                  {retiring ? "Đang xử lý..." : "Nghỉ dùng"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

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
