"use client";
/* =====================================================================
 * ADMIN EVALUATION — Chu kỳ đánh giá (route admin "cycles").
 *
 * Endpoint BE cover (evaluation-cycles, 9 ops + criteria CRUD):
 *  GET    /evaluation-cycles?page&pageSize&status          — bảng kỳ
 *  POST   /evaluation-cycles                              — dialog tạo kỳ
 *  GET    /evaluation-cycles/{id}                         — panel chi tiết
 *  PATCH  /evaluation-cycles/{id}                         — dialog sửa (draft only)
 *  POST   /evaluation-cycles/{id}/status                  — chuyển trạng thái
 *  GET    /evaluation-cycles/{id}/criteria                — danh sách tiêu chí
 *  POST   /evaluation-cycles/{id}/criteria                — thêm tiêu chí
 *  PATCH  /evaluation-cycles/{id}/criteria/{criterionId}  — sửa tiêu chí
 *  DELETE /evaluation-cycles/{id}/criteria/{criterionId}  — xóa tiêu chí
 * Trợ giúp: GET /sessions, GET /projects (dropdown tạo kỳ).
 * ===================================================================== */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  VAlert,
  VArchive,
  VAward,
  VCheck,
  VClipboardCheck,
  VEdit,
  VFlag,
  VInbox,
  VLock,
  VPlus,
  VTarget,
  VTimer,
  VTrash,
  type VIconComponent,
} from "@/components/icons/v-icons";
import { InkButton } from "@/components/notebook/reveal";
import {
  InkBadge,
  MarginNote,
  NoteCard,
  SketchCard,
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
import {
  type CriterionInput,
  type CycleStatus,
  type CycleType,
  type EvaluationCriterion,
  type EvaluationCycle,
  addCycleCriterion,
  changeCycleStatus,
  createEvaluationCycle,
  deleteCycleCriterion,
  getEvaluationCycle,
  listCycleCriteria,
  listEvaluationCycles,
  listProjectOptions,
  listSessionOptions,
  updateCycleCriterion,
  updateEvaluationCycle,
} from "@/lib/api/evaluation-cycles";
import { errorMessage } from "@/lib/api/api-client";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import {
  ChipGroup,
  EmptyState,
  PencilLines,
  SectionError,
  SketchInput,
  SketchTextarea,
  StaffPageHeader,
} from "@/components/staff/staff-kit";

/* ------------------------------- meta maps ------------------------------- */

const CYCLE_STATUS_META: Record<CycleStatus, { label: string; tone: string }> = {
  draft: { label: "Bản nháp", tone: "neutral" },
  open: { label: "Đang mở", tone: "blue" },
  closed: { label: "Đã đóng", tone: "red" },
  archived: { label: "Lưu trữ", tone: "pink" },
};

const CYCLE_TYPE_META: Record<CycleType, { label: string; tone: string; icon: VIconComponent }> = {
  sprint: { label: "Sprint", tone: "blue", icon: VTimer },
  midterm: { label: "Giữa kỳ", tone: "amber", icon: VFlag },
  final: { label: "Cuối kỳ", tone: "mint", icon: VAward },
};

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "draft", label: "Bản nháp" },
  { value: "open", label: "Đang mở" },
  { value: "closed", label: "Đã đóng" },
  { value: "archived", label: "Lưu trữ" },
] as const;

/** Chuyển trạng thái hợp lệ: draft→open|archived, open→closed, closed→archived. */
const NEXT_STATUS: Record<CycleStatus, { status: CycleStatus; label: string; desc: string }[]> = {
  draft: [
    {
      status: "open",
      label: "Mở kỳ",
      desc: "Mở kỳ để giảng viên bắt đầu chấm. Tổng trọng số tiêu chí phải đúng 100%.",
    },
    { status: "archived", label: "Lưu trữ", desc: "Cất kỳ nháp này vào kho lưu trữ." },
  ],
  open: [{ status: "closed", label: "Đóng kỳ", desc: "Khóa kỳ lại — không chỉnh sửa hay chấm thêm." }],
  closed: [{ status: "archived", label: "Lưu trữ", desc: "Đưa kỳ đã đóng vào kho lưu trữ." }],
  archived: [],
};

/* ------------------------------ tiện ích nhỏ ----------------------------- */

function isoToDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

function SketchSelect({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "focus-ink w-full appearance-none rounded-[9px_11px_10px_12px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] outline-none transition-colors",
        className,
      )}
    />
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]"
    >
      {children}
    </label>
  );
}

/** Chu kỳ đang chọn trong bảng — tô nền giấy xanh nhạt. */
function CycleTypeBadge({ type }: { type: CycleType }) {
  const meta = CYCLE_TYPE_META[type] ?? CYCLE_TYPE_META.sprint;
  const Icon = meta.icon;
  return (
    <InkBadge tone={meta.tone} className="!text-[0.65rem]">
      <Icon size={12} aria-hidden="true" /> {meta.label}
    </InkBadge>
  );
}

/* ================================== SCREEN ================================ */

export default function AdminEvaluation() {
  /* ------------------------------ dữ liệu chính --------------------------- */
  const cyclesApi = useApi(() => listEvaluationCycles({ pageSize: 100 }), []);
  const cycles = cyclesApi.data?.items ?? [];

  const [statusFilter, setStatusFilter] = useState<"all" | CycleStatus>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailVersion, setDetailVersion] = useState(0);

  const selected = useMemo(
    () => cycles.find((c) => c.id === selectedId) ?? null,
    [cycles, selectedId],
  );

  /* Chi tiết kỳ qua GET /{id} — cover endpoint + dữ liệu mới nhất sau mutation. */
  const detailApi = useApi(
    () => (selectedId ? getEvaluationCycle(selectedId) : Promise.resolve(null)),
    [selectedId, detailVersion],
  );
  const detail: EvaluationCycle | null = detailApi.data ?? selected;

  const criteriaApi = useApi(
    () =>
      selectedId
        ? listCycleCriteria(selectedId)
        : Promise.resolve([] as EvaluationCriterion[]),
    [selectedId, detailVersion],
  );

  /* Dropdown tạo kỳ: phiên thực tập + đồ án. */
  const sessionsApi = useApi(() => listSessionOptions(), []);
  const projectsApi = useApi(() => listProjectOptions(), []);

  /* ------------------------------- mutations ------------------------------ */
  const [busy, setBusy] = useState(false);
  const refreshAll = () => {
    cyclesApi.reload();
    setDetailVersion((v) => v + 1);
  };

  /* Dialog tạo kỳ */
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    code: "",
    name: "",
    type: "sprint" as CycleType,
    sessionId: "",
    projectId: "",
    startDate: "",
    endDate: "",
    dueDate: "",
  });

  /* Dialog sửa kỳ */
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", startDate: "", endDate: "", dueDate: "" });

  /* Dialog tiêu chí */
  const [critDialog, setCritDialog] = useState<
    | { mode: "add" }
    | { mode: "edit"; criterion: EvaluationCriterion }
    | null
  >(null);
  const [critForm, setCritForm] = useState({ code: "", name: "", weight: "", maxScore: "", description: "" });

  /* Dialog xác nhận chuyển trạng thái */
  const [confirmStatus, setConfirmStatus] = useState<{
    cycleId: string;
    cycleName: string;
    status: CycleStatus;
    label: string;
    desc: string;
  } | null>(null);

  /* --------------------------------- lọc ---------------------------------- */
  const filtered = useMemo(
    () => (statusFilter === "all" ? cycles : cycles.filter((c) => c.status === statusFilter)),
    [cycles, statusFilter],
  );

  /* ---------------------------- tổng trọng số ----------------------------- */
  const criteria = criteriaApi.data ?? [];
  const totalWeight = useMemo(
    () => Math.round(criteria.reduce((s, c) => s + c.weight, 0) * 100) / 100,
    [criteria],
  );
  const weightOk = criteria.length > 0 && Math.abs(totalWeight - 100) < 0.005;

  /* ------------------------------- handlers ------------------------------- */

  const openCreate = () => {
    setCreateForm({
      code: "",
      name: "",
      type: "sprint",
      sessionId: "",
      projectId: "",
      startDate: "",
      endDate: "",
      dueDate: "",
    });
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    const { code, name, type, startDate, endDate, sessionId, projectId, dueDate } = createForm;
    if (!code.trim()) return toast.error("Chưa nhập mã kỳ (code).");
    if (!name.trim()) return toast.error("Chưa nhập tên kỳ đánh giá.");
    if (!startDate) return toast.error("Chưa chọn ngày bắt đầu.");
    if (!endDate) return toast.error("Chưa chọn ngày kết thúc.");
    if (endDate < startDate) return toast.error("Ngày kết thúc phải sau ngày bắt đầu.");
    setBusy(true);
    try {
      const created = await createEvaluationCycle({
        code: code.trim(),
        name: name.trim(),
        type,
        startDate,
        endDate,
        ...(sessionId ? { sessionId } : {}),
        ...(projectId ? { projectId } : {}),
        ...(dueDate ? { dueDate } : {}),
      });
      toast.success(`Đã tạo kỳ "${created.name}" — tiêu chí mẫu đã được seed theo mẫu chuẩn.`);
      setCreateOpen(false);
      refreshAll();
      setSelectedId(created.id);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const openEdit = () => {
    if (!detail) return;
    setEditForm({
      name: detail.name,
      startDate: isoToDateInput(detail.startDate),
      endDate: isoToDateInput(detail.endDate),
      dueDate: isoToDateInput(detail.dueDate),
    });
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!detail) return;
    if (!editForm.name.trim()) return toast.error("Chưa nhập tên kỳ.");
    if (!editForm.startDate || !editForm.endDate)
      return toast.error("Chưa chọn đủ ngày bắt đầu / kết thúc.");
    setBusy(true);
    try {
      await updateEvaluationCycle(detail.id, {
        name: editForm.name.trim(),
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        dueDate: editForm.dueDate || null,
      });
      toast.success("Đã cập nhật kỳ đánh giá.");
      setEditOpen(false);
      refreshAll();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submitStatus = async () => {
    if (!confirmStatus) return;
    setBusy(true);
    try {
      await changeCycleStatus(confirmStatus.cycleId, confirmStatus.status);
      toast.success(`Đã ${confirmStatus.label.toLowerCase()} "${confirmStatus.cycleName}".`);
      setConfirmStatus(null);
      refreshAll();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const openCritAdd = () => {
    setCritForm({ code: "", name: "", weight: "", maxScore: "", description: "" });
    setCritDialog({ mode: "add" });
  };

  const openCritEdit = (c: EvaluationCriterion) => {
    setCritForm({
      code: c.code,
      name: c.name,
      weight: String(c.weight),
      maxScore: c.maxScore === null ? "" : String(c.maxScore),
      description: c.description ?? "",
    });
    setCritDialog({ mode: "edit", criterion: c });
  };

  const submitCriterion = async () => {
    if (!detail || !critDialog) return;
    const weight = Number(critForm.weight);
    if (!critForm.code.trim()) return toast.error("Chưa nhập mã tiêu chí.");
    if (!critForm.name.trim()) return toast.error("Chưa nhập tên tiêu chí.");
    if (!Number.isFinite(weight) || weight < 0.01 || weight > 100)
      return toast.error("Trọng số phải là số từ 0.01 đến 100.");
    const maxScore = critForm.maxScore.trim() === "" ? undefined : Number(critForm.maxScore);
    if (maxScore !== undefined && !Number.isFinite(maxScore))
      return toast.error("Điểm tối đa phải là số.");
    const payload: CriterionInput = {
      code: critForm.code.trim(),
      name: critForm.name.trim(),
      weight,
      ...(maxScore !== undefined ? { maxScore } : {}),
      ...(critForm.description.trim() ? { description: critForm.description.trim() } : {}),
    };
    setBusy(true);
    try {
      if (critDialog.mode === "add") await addCycleCriterion(detail.id, payload);
      else
        await updateCycleCriterion(detail.id, critDialog.criterion.id, {
          code: payload.code,
          name: payload.name,
          weight: payload.weight,
          ...(maxScore !== undefined ? { maxScore } : {}),
          ...(critForm.description.trim() ? { description: critForm.description.trim() } : {}),
        });
      toast.success(critDialog.mode === "add" ? "Đã thêm tiêu chí." : "Đã cập nhật tiêu chí.");
      setCritDialog(null);
      setDetailVersion((v) => v + 1);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submitDeleteCriterion = async (c: EvaluationCriterion) => {
    if (!detail) return;
    setBusy(true);
    try {
      await deleteCycleCriterion(detail.id, c.id);
      toast.success(`Đã xóa tiêu chí "${c.name}".`);
      setDetailVersion((v) => v + 1);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------ trạng thái chờ -------------------------- */
  if (cyclesApi.loading && !cyclesApi.data) {
    return (
      <div>
        <StaffPageHeader
          eyebrow="Quản trị · đánh giá"
          title="Chu kỳ đánh giá"
          icon={VClipboardCheck}
        />
        <SketchCard hover={false} className="p-5">
          <PencilLines rows={8} />
        </SketchCard>
      </div>
    );
  }
  if (cyclesApi.error || !cyclesApi.data) {
    return (
      <SectionError
        message={cyclesApi.error ?? "Chưa tải được danh sách kỳ đánh giá."}
        onRetry={cyclesApi.reload}
      />
    );
  }

  return (
    <div>
      <StaffPageHeader
        eyebrow="Quản trị · đánh giá"
        title="Chu kỳ đánh giá"
        sub="Kỳ sprint / giữa kỳ / cuối kỳ cùng bộ tiêu chí chấm và trạng thái vòng đời."
        icon={VClipboardCheck}
        note="Kỳ chỉ sửa được khi còn là bản nháp — mở kỳ rồi thì khóa chặt."
        actions={
          <>
            <InkBadge tone="neutral" className="tabular">
              {cyclesApi.data.total} kỳ
            </InkBadge>
            <InkButton variant="royal" size="sm" onClick={openCreate}>
              <VPlus size={15} /> Tạo kỳ đánh giá
            </InkButton>
          </>
        }
      />

      {/* Thanh lọc trạng thái */}
      <SketchCard hover={false} className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow !text-[0.6rem]">Trạng thái</span>
          <ChipGroup
            ariaLabel="Lọc kỳ đánh giá theo trạng thái"
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </div>
      </SketchCard>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* --------------------------- BẢNG KỲ ĐÁNH GIÁ -------------------------- */}
        <SketchCard hover={false} className="overflow-hidden">
          <div className="hidden overflow-x-auto md:block">
            <table className="ink-table min-w-[760px]">
              <thead>
                <tr>
                  <th>Kỳ đánh giá</th>
                  <th>Loại</th>
                  <th>Trạng thái</th>
                  <th>Thời gian</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-0">
                      <EmptyState
                        icon={VInbox}
                        title="Chưa có kỳ đánh giá nào khớp bộ lọc ✎"
                        note="Tạo kỳ mới hoặc bỏ lọc trạng thái để xem toàn bộ."
                      />
                    </td>
                  </tr>
                ) : (
                  filtered.map((cycle) => {
                    const active = cycle.id === selectedId;
                    return (
                      <tr
                        key={cycle.id}
                        onClick={() => setSelectedId(cycle.id)}
                        className={cn("sticker-pop cursor-pointer", active && "bg-[var(--blue-mist)]")}
                        aria-selected={active}
                      >
                        <td>
                          <p className="text-sm font-bold leading-tight text-[var(--ink)]">
                            {cycle.name}
                          </p>
                          <p className="mt-0.5 font-mono text-[0.68rem] text-[var(--ink-soft)]">
                            {cycle.code}
                          </p>
                        </td>
                        <td>
                          <CycleTypeBadge type={cycle.type} />
                        </td>
                        <td>
                          <InkBadge
                            tone={CYCLE_STATUS_META[cycle.status]?.tone ?? "neutral"}
                            className="!text-[0.65rem]"
                          >
                            {CYCLE_STATUS_META[cycle.status]?.label ?? cycle.status}
                          </InkBadge>
                        </td>
                        <td className="whitespace-nowrap text-[0.78rem] tabular text-[var(--ink-soft)]">
                          {formatDateVN(cycle.startDate)} → {formatDateVN(cycle.endDate)}
                          {cycle.dueDate && (
                            <span className="block text-[0.68rem]">
                              Hạn chấm: {formatDateVN(cycle.dueDate)}
                            </span>
                          )}
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedId(cycle.id);
                            }}
                            className="focus-ink sketch-border-thin bg-[var(--paper-raised)] px-2.5 py-1.5 text-xs font-bold text-[var(--ink)] transition-all hover:bg-[var(--blue-mist)]"
                            aria-label={`Xem chi tiết kỳ ${cycle.name}`}
                          >
                            Chi tiết
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Bản card cho mobile */}
          <div className="divide-y-2 divide-dashed divide-[color-mix(in_srgb,var(--ink)_15%,transparent)] md:hidden">
            {filtered.length === 0 ? (
              <EmptyState
                icon={VInbox}
                title="Chưa có kỳ đánh giá nào khớp bộ lọc ✎"
                note="Tạo kỳ mới hoặc bỏ lọc trạng thái để xem toàn bộ."
              />
            ) : (
              filtered.map((cycle) => (
                <button
                  key={cycle.id}
                  type="button"
                  onClick={() => setSelectedId(cycle.id)}
                  className={cn(
                    "sticker-pop block w-full p-4 text-left transition-colors",
                    cycle.id === selectedId && "bg-[var(--blue-mist)]",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold leading-tight text-[var(--ink)]">
                        {cycle.name}
                      </p>
                      <p className="mt-0.5 font-mono text-[0.68rem] text-[var(--ink-soft)]">
                        {cycle.code}
                      </p>
                    </div>
                    <InkBadge
                      tone={CYCLE_STATUS_META[cycle.status]?.tone ?? "neutral"}
                      className="!text-[0.62rem]"
                    >
                      {CYCLE_STATUS_META[cycle.status]?.label ?? cycle.status}
                    </InkBadge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <CycleTypeBadge type={cycle.type} />
                    <span className="text-[0.72rem] tabular text-[var(--ink-soft)]">
                      {formatDateVN(cycle.startDate)} → {formatDateVN(cycle.endDate)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_20%,transparent)] px-4 py-3">
            <p className="tabular text-xs text-[var(--ink-soft)]">
              {filtered.length} kỳ hiển thị · bấm một dòng để xem chi tiết + tiêu chí
            </p>
          </div>
        </SketchCard>

        {/* ---------------------------- PANEL CHI TIẾT ---------------------------- */}
        <div className="space-y-4">
          {!detail ? (
            <SketchCard hover={false} className="p-5">
              <EmptyState
                icon={VClipboardCheck}
                title="Chọn một kỳ để xem chi tiết"
                note="Panel bên này hiện thông tin kỳ, chuyển trạng thái và bộ tiêu chí chấm."
              />
            </SketchCard>
          ) : (
            <>
              {/* Thông tin kỳ */}
              <SketchCard hover={false} className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="eyebrow !text-[0.6rem]">Chi tiết kỳ đánh giá</p>
                    <h2 className="mt-1 text-lg font-extrabold leading-tight text-[var(--ink)]">
                      {detail.name}
                    </h2>
                    <p className="mt-0.5 font-mono text-[0.7rem] text-[var(--ink-soft)]">
                      {detail.code}
                    </p>
                  </div>
                  <InkBadge
                    tone={CYCLE_STATUS_META[detail.status]?.tone ?? "neutral"}
                    className="shrink-0"
                  >
                    {CYCLE_STATUS_META[detail.status]?.label ?? detail.status}
                  </InkBadge>
                </div>

                {detailApi.loading && <div className="mt-3"><PencilLines rows={2} /></div>}

                <dl className="mt-4 divide-y-2 divide-dashed divide-[color-mix(in_srgb,var(--ink)_15%,transparent)] rounded-[12px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3.5">
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <dt className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                      Loại kỳ
                    </dt>
                    <dd><CycleTypeBadge type={detail.type} /></dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <dt className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                      Bắt đầu
                    </dt>
                    <dd className="tabular text-sm font-semibold text-[var(--ink)]">
                      {formatDateVN(detail.startDate)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <dt className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                      Kết thúc
                    </dt>
                    <dd className="tabular text-sm font-semibold text-[var(--ink)]">
                      {formatDateVN(detail.endDate)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <dt className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                      Hạn chấm
                    </dt>
                    <dd className="tabular text-sm font-semibold text-[var(--ink)]">
                      {detail.dueDate ? formatDateVN(detail.dueDate) : "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <dt className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                      Phiên / Đồ án
                    </dt>
                    <dd className="font-mono text-[0.68rem] text-[var(--ink-soft)]">
                      {detail.sessionId ? `${detail.sessionId.slice(0, 8)}…` : "—"}
                      {detail.projectId ? ` / ${detail.projectId.slice(0, 8)}…` : ""}
                    </dd>
                  </div>
                </dl>

                {/* Hành động theo trạng thái */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {detail.status === "draft" && (
                    <InkButton variant="outline" size="sm" onClick={openEdit}>
                      <VEdit size={14} /> Sửa kỳ
                    </InkButton>
                  )}
                  {NEXT_STATUS[detail.status].map((next) => (
                    <InkButton
                      key={next.status}
                      variant={next.status === "open" ? "royal" : "outline"}
                      size="sm"
                      onClick={() =>
                        setConfirmStatus({
                          cycleId: detail.id,
                          cycleName: detail.name,
                          status: next.status,
                          label: next.label,
                          desc: next.desc,
                        })
                      }
                    >
                      {next.status === "archived" ? <VArchive size={14} /> : <VCheck size={14} />}
                      {next.label}
                    </InkButton>
                  ))}
                  {detail.status === "archived" && (
                    <MarginNote>Kỳ đã lưu trữ — chỉ xem lại, không thao tác.</MarginNote>
                  )}
                </div>
                {detail.status === "open" && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--ink-soft)]">
                    <VLock size={13} aria-hidden="true" /> Kỳ đang mở — không sửa được thông tin
                    và tiêu chí.
                  </p>
                )}
              </SketchCard>

              {/* Tiêu chí chấm */}
              <SketchCard hover={false} className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="eyebrow !text-[0.6rem]">Tiêu chí chấm</p>
                    <h3 className="mt-1 text-base font-extrabold text-[var(--ink)]">
                      Bộ tiêu chí của kỳ
                    </h3>
                  </div>
                  {detail.status === "draft" && (
                    <InkButton variant="outline" size="sm" onClick={openCritAdd}>
                      <VPlus size={14} /> Tiêu chí
                    </InkButton>
                  )}
                </div>

                {/* Tổng trọng số nổi bật */}
                <div
                  className={cn(
                    "mt-4 flex items-center justify-between gap-3 rounded-[12px] border-2 px-4 py-3",
                    weightOk
                      ? "border-[var(--success)] bg-[color-mix(in_srgb,var(--success)_10%,transparent)]"
                      : "border-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_12%,transparent)]",
                  )}
                  role="status"
                >
                  <div className="flex items-center gap-2.5">
                    <VTarget
                      size={18}
                      className={weightOk ? "text-[var(--success)]" : "text-[var(--warning)]"}
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                        Tổng trọng số
                      </p>
                      <p
                        className={cn(
                          "text-lg font-extrabold tabular",
                          weightOk ? "text-[var(--success)]" : "text-[var(--warning)]",
                        )}
                      >
                        {totalWeight.toLocaleString("vi-VN")}%
                      </p>
                    </div>
                  </div>
                  <p className="max-w-[180px] text-right text-[0.72rem] leading-snug text-[var(--ink-soft)]">
                    {weightOk
                      ? "Đủ 100% — đủ điều kiện mở kỳ."
                      : "Chưa đúng 100% — mở kỳ sẽ bị từ chối."}
                  </p>
                </div>

                {criteriaApi.loading ? (
                  <div className="mt-4">
                    <PencilLines rows={3} />
                  </div>
                ) : criteriaApi.error ? (
                  <div className="mt-4">
                    <SectionError message={criteriaApi.error} onRetry={criteriaApi.reload} />
                  </div>
                ) : criteria.length === 0 ? (
                  <div className="mt-4">
                    <EmptyState
                      icon={VTarget}
                      title="Kỳ chưa có tiêu chí nào"
                      note={
                        detail.status === "draft"
                          ? "Thêm tiêu chí hoặc tạo kỳ mới để seed bộ mẫu 35/30/20/15."
                          : "Kỳ không còn ở trạng thái nháp nên không xem được chỉnh sửa."
                      }
                    />
                  </div>
                ) : (
                  <ul className="mt-4 max-h-96 space-y-2 overflow-y-auto pr-1">
                    {criteria
                      .slice()
                      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                      .map((c) => (
                        <li
                          key={c.id}
                          className="sticker-pop rounded-[10px_12px_10px_12px] border-2 border-[color-mix(in_srgb,var(--ink)_30%,transparent)] bg-[var(--paper)] p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-bold leading-tight text-[var(--ink)]">
                                {c.name}
                              </p>
                              <p className="mt-0.5 font-mono text-[0.66rem] text-[var(--ink-soft)]">
                                {c.code}
                                {c.maxScore !== null && ` · điểm tối đa ${c.maxScore}`}
                                {c.isRequired === false && " · không bắt buộc"}
                              </p>
                              {c.description && (
                                <p className="mt-1 text-xs text-[var(--ink-soft)]">
                                  {c.description}
                                </p>
                              )}
                            </div>
                            <InkBadge tone="blue" className="shrink-0 tabular !text-[0.68rem]">
                              {c.weight}%
                            </InkBadge>
                          </div>
                          {detail.status === "draft" && (
                            <div className="mt-2 flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openCritEdit(c)}
                                className="focus-ink inline-flex items-center gap-1 rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] px-2.5 py-1 text-xs font-bold text-[var(--ink)] transition-all hover:bg-[var(--blue-mist)]"
                                aria-label={`Sửa tiêu chí ${c.name}`}
                              >
                                <VEdit size={12} /> Sửa
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => submitDeleteCriterion(c)}
                                className="focus-ink inline-flex items-center gap-1 rounded-full border-2 border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-2.5 py-1 text-xs font-bold text-[var(--danger)] transition-all hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-40"
                                aria-label={`Xóa tiêu chí ${c.name}`}
                              >
                                <VTrash size={12} /> Xóa
                              </button>
                            </div>
                          )}
                        </li>
                      ))}
                  </ul>
                )}
              </SketchCard>
            </>
          )}

          <div className="max-w-md">
            <NoteCard tone="mint" title="Vòng đời kỳ đánh giá">
              Bản nháp → Đang mở → Đã đóng → Lưu trữ. Mở kỳ yêu cầu tổng trọng số tiêu chí
              <b> đúng 100%</b>; sau khi mở, mọi thứ khóa chặt.
            </NoteCard>
          </div>
        </div>
      </div>

      {/* ------------------------- DIALOG: TẠO KỲ ĐÁNH GIÁ ------------------------ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[var(--ink)]">Tạo kỳ đánh giá</DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Kỳ mới ở trạng thái bản nháp và được seed bộ tiêu chí mẫu 35/30/20/15.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="cycle-code">Mã kỳ (code)</FieldLabel>
                <SketchInput
                  id="cycle-code"
                  value={createForm.code}
                  onChange={(e) => setCreateForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="VD: EVAL-2026-SPRINT-1"
                />
              </div>
              <div>
                <FieldLabel htmlFor="cycle-name">Tên kỳ</FieldLabel>
                <SketchInput
                  id="cycle-name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="VD: Đánh giá Sprint 1"
                />
              </div>
            </div>

            <fieldset>
              <legend className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                Loại kỳ
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(CYCLE_TYPE_META) as CycleType[]).map((t) => {
                  const meta = CYCLE_TYPE_META[t];
                  const Icon = meta.icon;
                  const active = createForm.type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setCreateForm((f) => ({ ...f, type: t }))}
                      className={cn(
                        "focus-ink flex flex-col items-center gap-1.5 rounded-[10px] border-2 px-2 py-3 text-xs font-bold transition-all",
                        active
                          ? "border-[var(--ink)] bg-[var(--blue-mist)] text-[var(--ink)] shadow-ink-2"
                          : "border-[color-mix(in_srgb,var(--ink)_28%,transparent)] bg-[var(--paper)] text-[var(--ink-soft)] hover:border-[var(--ink)] hover:text-[var(--ink)]",
                      )}
                    >
                      <Icon
                        size={20}
                        className={active ? "text-[var(--royal)]" : undefined}
                        aria-hidden="true"
                      />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="cycle-start">Ngày bắt đầu</FieldLabel>
                <SketchInput
                  id="cycle-start"
                  type="date"
                  value={createForm.startDate}
                  onChange={(e) => setCreateForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div>
                <FieldLabel htmlFor="cycle-end">Ngày kết thúc</FieldLabel>
                <SketchInput
                  id="cycle-end"
                  type="date"
                  value={createForm.endDate}
                  onChange={(e) => setCreateForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <FieldLabel htmlFor="cycle-due">Hạn chấm (tùy chọn)</FieldLabel>
              <SketchInput
                id="cycle-due"
                type="date"
                value={createForm.dueDate}
                onChange={(e) => setCreateForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="cycle-session">Phiên thực tập (tùy chọn)</FieldLabel>
                <SketchSelect
                  id="cycle-session"
                  value={createForm.sessionId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, sessionId: e.target.value }))}
                >
                  <option value="">— Không gắn phiên —</option>
                  {(sessionsApi.data ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </SketchSelect>
              </div>
              <div>
                <FieldLabel htmlFor="cycle-project">Đồ án (tùy chọn)</FieldLabel>
                <SketchSelect
                  id="cycle-project"
                  value={createForm.projectId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, projectId: e.target.value }))}
                >
                  <option value="">— Không gắn đồ án —</option>
                  {(projectsApi.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </SketchSelect>
              </div>
            </div>
          </div>
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
              Hủy
            </InkButton>
            <InkButton variant="royal" size="sm" disabled={busy} onClick={submitCreate}>
              <VPlus size={14} /> Tạo kỳ
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------- DIALOG: SỬA KỲ (DRAFT) ------------------------ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[var(--ink)]">Sửa kỳ đánh giá</DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Chỉ kỳ bản nháp mới sửa được tên và mốc thời gian.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <FieldLabel htmlFor="edit-cycle-name">Tên kỳ</FieldLabel>
              <SketchInput
                id="edit-cycle-name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="edit-cycle-start">Ngày bắt đầu</FieldLabel>
                <SketchInput
                  id="edit-cycle-start"
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div>
                <FieldLabel htmlFor="edit-cycle-end">Ngày kết thúc</FieldLabel>
                <SketchInput
                  id="edit-cycle-end"
                  type="date"
                  value={editForm.endDate}
                  onChange={(e) => setEditForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <FieldLabel htmlFor="edit-cycle-due">Hạn chấm (tùy chọn)</FieldLabel>
              <SketchInput
                id="edit-cycle-due"
                type="date"
                value={editForm.dueDate}
                onChange={(e) => setEditForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setEditOpen(false)}>
              Hủy
            </InkButton>
            <InkButton variant="royal" size="sm" disabled={busy} onClick={submitEdit}>
              <VCheck size={14} /> Lưu thay đổi
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------------- DIALOG: THÊM/SỬA TIÊU CHÍ ---------------------- */}
      <Dialog open={!!critDialog} onOpenChange={(open) => !open && setCritDialog(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[var(--ink)]">
              {critDialog?.mode === "edit" ? "Sửa tiêu chí" : "Thêm tiêu chí"}
            </DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Trọng số mỗi tiêu chí từ 0.01 đến 100 — cả bộ phải tổng đúng 100% mới mở được kỳ.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="crit-code">Mã tiêu chí</FieldLabel>
                <SketchInput
                  id="crit-code"
                  value={critForm.code}
                  onChange={(e) => setCritForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="VD: technical_quality"
                />
              </div>
              <div>
                <FieldLabel htmlFor="crit-weight">Trọng số (%)</FieldLabel>
                <SketchInput
                  id="crit-weight"
                  type="number"
                  min={0.01}
                  max={100}
                  step={0.01}
                  value={critForm.weight}
                  onChange={(e) => setCritForm((f) => ({ ...f, weight: e.target.value }))}
                  placeholder="VD: 35"
                />
              </div>
            </div>
            <div>
              <FieldLabel htmlFor="crit-name">Tên tiêu chí</FieldLabel>
              <SketchInput
                id="crit-name"
                value={critForm.name}
                onChange={(e) => setCritForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="VD: Chất lượng kỹ thuật"
              />
            </div>
            <div>
              <FieldLabel htmlFor="crit-max">Điểm tối đa (tùy chọn)</FieldLabel>
              <SketchInput
                id="crit-max"
                type="number"
                min={1}
                value={critForm.maxScore}
                onChange={(e) => setCritForm((f) => ({ ...f, maxScore: e.target.value }))}
                placeholder="VD: 100"
              />
            </div>
            <div>
              <FieldLabel htmlFor="crit-desc">Mô tả (tùy chọn)</FieldLabel>
              <SketchTextarea
                id="crit-desc"
                rows={3}
                value={critForm.description}
                onChange={(e) => setCritForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Giải thích ngắn cách chấm tiêu chí này..."
              />
            </div>
          </div>
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setCritDialog(null)}>
              Hủy
            </InkButton>
            <InkButton variant="royal" size="sm" disabled={busy} onClick={submitCriterion}>
              <VCheck size={14} /> {critDialog?.mode === "edit" ? "Lưu tiêu chí" : "Thêm tiêu chí"}
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------- DIALOG: XÁC NHẬN CHUYỂN TRẠNG THÁI ------------------ */}
      <Dialog open={!!confirmStatus} onOpenChange={(open) => !open && setConfirmStatus(null)}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-sm">
          {confirmStatus && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-extrabold text-[var(--ink)]">
                  <VAlert size={18} className="text-[var(--warning)]" aria-hidden="true" />
                  {confirmStatus.label} kỳ này?
                </DialogTitle>
                <DialogDescription className="text-[var(--ink-soft)]">
                  {confirmStatus.desc}
                </DialogDescription>
              </DialogHeader>
              {confirmStatus.status === "open" && !weightOk && (
                <NoteCard tone="pink" title="Tổng trọng số chưa đúng 100%">
                  Hiện đang <b>{totalWeight.toLocaleString("vi-VN")}%</b>. Hệ thống sẽ từ chối mở
                  kỳ nếu tổng trọng số không đúng 100%.
                </NoteCard>
              )}
              <DialogFooter>
                <InkButton variant="ghost" size="sm" onClick={() => setConfirmStatus(null)}>
                  Hủy
                </InkButton>
                <InkButton variant="royal" size="sm" disabled={busy} onClick={submitStatus}>
                  <VCheck size={14} /> Xác nhận
                </InkButton>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
