"use client";
/* =====================================================================
 * ADMIN KPI — KPI & Lương ảo (route admin "kpi"), 2 tab.
 *
 * Endpoint BE cover:
 *  KỲ KPI (kpi-periods, 8 ops):
 *   GET   /kpi-periods                          — bảng kỳ
 *   POST  /kpi-periods                          — dialog tạo kỳ
 *   GET   /kpi-periods/{id}                     — object kỳ (panel chi tiết)
 *   PATCH /kpi-periods/{id}                     — sửa (draft/open)
 *   POST  /kpi-periods/{id}/calculate           — nút "Tính KPI" (confirm)
 *   POST  /kpi-periods/{id}/finalize            — nút "Chốt kỳ" (confirm)
 *   GET   /kpi-periods/{id}/results             — bảng kết quả theo user
 *   POST  /kpi-periods/{id}/status              — chuyển trạng thái
 *  KẾT QUẢ (kpi-results, 1 op):
 *   GET   /kpi-results/{id}                     — dialog chi tiết {result, metrics}
 *  LƯƠNG ẢO (virtual-salary, 4 ops):
 *   GET   /virtual-salary                       — sổ lương (filter type/userId)
 *   POST  /virtual-salary/generate/{kpiPeriodId} — sinh lương từ kỳ đã chốt
 *   POST  /virtual-salary/adjustments           — điều chỉnh thủ công
 *   GET   /virtual-salary/users/{userId}/balance — số dư 1 user
 * Trợ giúp: GET /users (picker user).
 * ===================================================================== */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  VAlert,
  VCheck,
  VChartColumn,
  VCoins,
  VInbox,
  VLock,
  VPlay,
  VPlus,
  VRefresh,
  VTarget,
  VTimer,
  VUsers,
  VWallet,
} from "@/components/icons/v-icons";
import { InkButton } from "@/components/notebook/reveal";
import {
  InkBadge,
  MarginNote,
  NoteCard,
  SketchCard,
  formatDateTimeVN,
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
  type AdjustmentType,
  type KpiPeriod,
  type KpiPeriodStatus,
  type KpiResultDetail,
  type KpiResultRow,
  type SalaryLedgerEntry,
  calculateKpiPeriod,
  changeKpiPeriodStatus,
  createKpiPeriod,
  createSalaryAdjustment,
  finalizeKpiPeriod,
  generateVirtualSalary,
  getKpiResult,
  getUserSalaryBalance,
  listKpiPeriodResults,
  listKpiPeriods,
  listVirtualSalary,
  updateKpiPeriod,
} from "@/lib/api/kpi-admin";
import { listUserOptions } from "@/lib/api/groups";
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

const PERIOD_STATUS_META: Record<KpiPeriodStatus, { label: string; tone: string }> = {
  draft: { label: "Bản nháp", tone: "neutral" },
  open: { label: "Đang mở", tone: "blue" },
  calculating: { label: "Đang tính", tone: "amber" },
  finalized: { label: "Đã chốt", tone: "green" },
  closed: { label: "Đã đóng", tone: "red" },
};

const PERIOD_STATUS_FILTER = [
  { value: "all", label: "Tất cả" },
  { value: "draft", label: "Bản nháp" },
  { value: "open", label: "Đang mở" },
  { value: "calculating", label: "Đang tính" },
  { value: "finalized", label: "Đã chốt" },
  { value: "closed", label: "Đã đóng" },
] as const;

/** Tất cả trạng thái cho select chuyển trạng thái thủ công. */
const ALL_PERIOD_STATUSES: KpiPeriodStatus[] = [
  "draft",
  "open",
  "calculating",
  "finalized",
  "closed",
];

const SALARY_TYPE_META: Record<string, { label: string; tone: string }> = {
  kpi_earning: { label: "KPI", tone: "blue" },
  bonus: { label: "Thưởng", tone: "green" },
  penalty: { label: "Phạt", tone: "red" },
  adjustment: { label: "Điều chỉnh", tone: "amber" },
  reversal: { label: "Hoàn đảo", tone: "pink" },
};

const SALARY_TYPE_FILTER = [
  { value: "all", label: "Tất cả" },
  { value: "kpi_earning", label: "KPI" },
  { value: "bonus", label: "Thưởng" },
  { value: "penalty", label: "Phạt" },
  { value: "adjustment", label: "Điều chỉnh" },
  { value: "reversal", label: "Hoàn đảo" },
] as const;

const ADJUST_TYPE_META: Record<AdjustmentType, { label: string; hint: string }> = {
  bonus: { label: "Thưởng (+)", hint: "Nhập số dương — sổ ghi dương." },
  penalty: { label: "Phạt (−)", hint: "Nhập số dương — hệ thống lưu thành số âm." },
  adjustment: { label: "Điều chỉnh (có dấu)", hint: "Nhập số mang dấu dương/âm trực tiếp." },
  reversal: { label: "Hoàn đảo dòng cũ", hint: "Đảo dấu của dòng nguồn cần hoàn." },
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

/** Số tiền ảo — dương xanh, âm đỏ, luôn kèm "đ ảo". */
function AmountText({ amount, className }: { amount: number; className?: string }) {
  return (
    <span
      className={cn(
        "tabular font-extrabold",
        amount < 0 ? "text-[var(--danger)]" : "text-[var(--success)]",
        className,
      )}
    >
      {amount > 0 ? "+" : ""}
      {amount.toLocaleString("vi-VN")} đ ảo
    </span>
  );
}

/* ================================== SCREEN ================================ */

export default function AdminKpi() {
  const [tab, setTab] = useState<"periods" | "salary">("periods");

  /* ------------------------------ dữ liệu chung --------------------------- */
  const periodsApi = useApi(() => listKpiPeriods({ pageSize: 100 }), []);
  const periods = periodsApi.data?.items ?? [];
  const usersApi = useApi(() => listUserOptions(), []);
  const users = usersApi.data ?? [];
  const userName = (userId: string) =>
    users.find((u) => u.id === userId)?.displayName ?? `${userId.slice(0, 8)}…`;

  const [busy, setBusy] = useState(false);

  /* ============================== TAB 1: KỲ KPI ============================ */

  const [statusFilter, setStatusFilter] = useState<"all" | KpiPeriodStatus>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailVersion, setDetailVersion] = useState(0);

  const selected = useMemo(
    () => periods.find((p) => p.id === selectedId) ?? null,
    [periods, selectedId],
  );

  const resultsApi = useApi(
    () =>
      selectedId
        ? listKpiPeriodResults(selectedId)
        : Promise.resolve({ items: [] as KpiResultRow[], total: 0 }),
    [selectedId, detailVersion],
  );
  const results = resultsApi.data?.items ?? [];

  const filteredPeriods = useMemo(
    () => (statusFilter === "all" ? periods : periods.filter((p) => p.status === statusFilter)),
    [periods, statusFilter],
  );

  /* Dialog tạo kỳ KPI */
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ code: "", name: "", startDate: "", endDate: "" });

  /* Dialog sửa kỳ */
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", startDate: "", endDate: "" });

  /* Dialog xác nhận (tính / chốt / chuyển trạng thái) */
  const [confirmAction, setConfirmAction] = useState<{
    kind: "calculate" | "finalize" | "status";
    period: KpiPeriod;
    status?: KpiPeriodStatus;
    label: string;
    desc: string;
  } | null>(null);

  /* Dialog chi tiết kết quả */
  const [resultDetail, setResultDetail] = useState<KpiResultDetail | null>(null);
  const [resultLoading, setResultLoading] = useState(false);

  const openResultDetail = async (row: KpiResultRow) => {
    setResultLoading(true);
    setResultDetail(null);
    try {
      const detail = await getKpiResult(row.id);
      setResultDetail(detail);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setResultLoading(false);
    }
  };

  const refreshPeriods = () => {
    periodsApi.reload();
    setDetailVersion((v) => v + 1);
  };

  const submitCreatePeriod = async () => {
    if (!createForm.code.trim()) return toast.error("Chưa nhập mã kỳ KPI.");
    if (!createForm.name.trim()) return toast.error("Chưa nhập tên kỳ KPI.");
    if (!createForm.startDate || !createForm.endDate)
      return toast.error("Chưa chọn đủ ngày bắt đầu / kết thúc.");
    setBusy(true);
    try {
      const created = await createKpiPeriod({
        code: createForm.code.trim(),
        name: createForm.name.trim(),
        startDate: createForm.startDate,
        endDate: createForm.endDate,
      });
      toast.success(`Đã tạo kỳ KPI "${created.name}" (rule ${created.ruleVersion}).`);
      setCreateOpen(false);
      refreshPeriods();
      setSelectedId(created.id);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submitEditPeriod = async () => {
    if (!selected) return;
    if (!editForm.name.trim()) return toast.error("Chưa nhập tên kỳ.");
    setBusy(true);
    try {
      await updateKpiPeriod(selected.id, {
        name: editForm.name.trim(),
        startDate: editForm.startDate,
        endDate: editForm.endDate,
      });
      toast.success("Đã cập nhật kỳ KPI.");
      setEditOpen(false);
      refreshPeriods();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submitConfirm = async () => {
    if (!confirmAction) return;
    setBusy(true);
    try {
      if (confirmAction.kind === "calculate") {
        await calculateKpiPeriod(confirmAction.period.id);
        toast.success(`Đã chạy batch tính KPI cho "${confirmAction.period.name}".`);
      } else if (confirmAction.kind === "finalize") {
        await finalizeKpiPeriod(confirmAction.period.id);
        toast.success(`Đã chốt kỳ "${confirmAction.period.name}" — kết quả được khóa và gửi thông báo.`);
      } else {
        await changeKpiPeriodStatus(confirmAction.period.id, confirmAction.status!);
        toast.success(`Đã chuyển "${confirmAction.period.name}" sang trạng thái mới.`);
      }
      setConfirmAction(null);
      refreshPeriods();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  /* ============================== TAB 2: LƯƠNG ẢO ========================== */

  const [salaryTypeFilter, setSalaryTypeFilter] = useState<string>("all");
  const [salaryVersion, setSalaryVersion] = useState(0);
  const salaryApi = useApi(
    () =>
      listVirtualSalary({
        pageSize: 100,
        ...(salaryTypeFilter !== "all" ? { type: salaryTypeFilter } : {}),
      }),
    [salaryTypeFilter, salaryVersion],
  );
  const ledger = salaryApi.data?.items ?? [];

  /* Dialog sinh lương từ kỳ KPI */
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generatePeriodId, setGeneratePeriodId] = useState("");
  const finalizedPeriods = periods.filter((p) => p.status === "finalized");

  /* Dialog điều chỉnh thủ công */
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState<{
    userId: string;
    type: AdjustmentType;
    amount: string;
    reason: string;
  }>({ userId: "", type: "bonus", amount: "", reason: "" });

  /* Dialog số dư user */
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [balanceUserId, setBalanceUserId] = useState("");
  const [balanceVersion, setBalanceVersion] = useState(0);
  const balanceApi = useApi(
    () =>
      balanceUserId
        ? getUserSalaryBalance(balanceUserId)
        : Promise.resolve(null),
    [balanceUserId, balanceVersion],
  );

  const submitGenerate = async () => {
    if (!generatePeriodId) return toast.error("Chọn một kỳ KPI đã chốt để sinh lương.");
    setBusy(true);
    try {
      await generateVirtualSalary(generatePeriodId);
      toast.success("Đã sinh lương ảo từ kỳ KPI — thao tác idempotent, không sinh đôi.");
      setGenerateOpen(false);
      setSalaryVersion((v) => v + 1);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submitAdjustment = async () => {
    if (!adjustForm.userId) return toast.error("Chưa chọn người dùng.");
    if (!adjustForm.reason.trim()) return toast.error("Nhập lý do điều chỉnh (bắt buộc, lưu audit).");
    const amount = adjustForm.amount.trim() === "" ? undefined : Number(adjustForm.amount);
    if (amount !== undefined && !Number.isFinite(amount))
      return toast.error("Số tiền phải là số.");
    setBusy(true);
    try {
      await createSalaryAdjustment({
        userId: adjustForm.userId,
        type: adjustForm.type,
        reason: adjustForm.reason.trim(),
        ...(amount !== undefined ? { amount } : {}),
      });
      toast.success("Đã ghi bút điều chỉnh vào sổ lương ảo.");
      setAdjustOpen(false);
      setAdjustForm({ userId: "", type: "bonus", amount: "", reason: "" });
      setSalaryVersion((v) => v + 1);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------ trạng thái chờ -------------------------- */
  if (periodsApi.loading && !periodsApi.data) {
    return (
      <div>
        <StaffPageHeader eyebrow="Quản trị · hiệu suất" title="KPI & Lương ảo" icon={VChartColumn} />
        <SketchCard hover={false} className="p-5">
          <PencilLines rows={8} />
        </SketchCard>
      </div>
    );
  }
  if (periodsApi.error || !periodsApi.data) {
    return (
      <SectionError
        message={periodsApi.error ?? "Chưa tải được danh sách kỳ KPI."}
        onRetry={periodsApi.reload}
      />
    );
  }

  return (
    <div>
      <StaffPageHeader
        eyebrow="Quản trị · hiệu suất"
        title="KPI & Lương ảo"
        sub="Kỳ KPI chuẩn kpi-v1 — tính, chốt, rồi sinh lương ảo vào sổ chung."
        icon={VChartColumn}
        note="Lương ảo VND_VIRTUAL chỉ để gamification — không phải tiền thật."
        actions={
          <>
            <InkBadge tone="neutral" className="tabular">
              {periodsApi.data.total} kỳ KPI
            </InkBadge>
            {tab === "periods" ? (
              <InkButton
                variant="royal"
                size="sm"
                onClick={() => {
                  setCreateForm({ code: "", name: "", startDate: "", endDate: "" });
                  setCreateOpen(true);
                }}
              >
                <VPlus size={15} /> Tạo kỳ KPI
              </InkButton>
            ) : (
              <>
                <InkButton variant="outline" size="sm" onClick={() => setBalanceOpen(true)}>
                  <VWallet size={14} /> Xem số dư
                </InkButton>
                <InkButton variant="outline" size="sm" onClick={() => setAdjustOpen(true)}>
                  <VCoins size={14} /> Điều chỉnh
                </InkButton>
                <InkButton
                  variant="royal"
                  size="sm"
                  onClick={() => {
                    setGeneratePeriodId("");
                    setGenerateOpen(true);
                  }}
                >
                  <VPlay size={14} /> Sinh lương
                </InkButton>
              </>
            )}
          </>
        }
      />

      {/* Tab switch */}
      <SketchCard hover={false} className="mb-4 p-4">
        <ChipGroup
          ariaLabel="Chọn phân mục"
          options={[
            { value: "periods", label: "Kỳ KPI" },
            { value: "salary", label: "Lương ảo" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </SketchCard>

      {/* ============================ TAB 1: KỲ KPI ============================ */}
      {tab === "periods" && (
        <>
          <SketchCard hover={false} className="mb-4 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow !text-[0.6rem]">Trạng thái</span>
              <ChipGroup
                ariaLabel="Lọc kỳ KPI theo trạng thái"
                options={PERIOD_STATUS_FILTER}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </div>
          </SketchCard>

          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
            {/* Bảng kỳ KPI */}
            <SketchCard hover={false} className="overflow-hidden">
              <div className="hidden overflow-x-auto md:block">
                <table className="ink-table min-w-[720px]">
                  <thead>
                    <tr>
                      <th>Kỳ KPI</th>
                      <th>Trạng thái</th>
                      <th>Thời gian</th>
                      <th>Rule</th>
                      <th className="text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPeriods.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-0">
                          <EmptyState
                            icon={VInbox}
                            title="Chưa có kỳ KPI nào khớp bộ lọc ✎"
                            note="Tạo kỳ mới hoặc bỏ lọc trạng thái."
                          />
                        </td>
                      </tr>
                    ) : (
                      filteredPeriods.map((p) => (
                        <tr
                          key={p.id}
                          onClick={() => setSelectedId(p.id)}
                          className={cn(
                            "sticker-pop cursor-pointer",
                            p.id === selectedId && "bg-[var(--blue-mist)]",
                          )}
                          aria-selected={p.id === selectedId}
                        >
                          <td>
                            <p className="text-sm font-bold leading-tight text-[var(--ink)]">
                              {p.name}
                            </p>
                            <p className="mt-0.5 font-mono text-[0.68rem] text-[var(--ink-soft)]">
                              {p.code}
                            </p>
                          </td>
                          <td>
                            <InkBadge
                              tone={PERIOD_STATUS_META[p.status]?.tone ?? "neutral"}
                              className="!text-[0.65rem]"
                            >
                              {PERIOD_STATUS_META[p.status]?.label ?? p.status}
                            </InkBadge>
                          </td>
                          <td className="whitespace-nowrap text-[0.78rem] tabular text-[var(--ink-soft)]">
                            {formatDateVN(p.startDate)} → {formatDateVN(p.endDate)}
                          </td>
                          <td className="font-mono text-[0.68rem] text-[var(--ink-soft)]">
                            {p.ruleVersion}
                          </td>
                          <td className="text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedId(p.id);
                              }}
                              className="focus-ink sketch-border-thin bg-[var(--paper-raised)] px-2.5 py-1.5 text-xs font-bold text-[var(--ink)] transition-all hover:bg-[var(--blue-mist)]"
                              aria-label={`Xem chi tiết kỳ ${p.name}`}
                            >
                              Chi tiết
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bản card mobile */}
              <div className="divide-y-2 divide-dashed divide-[color-mix(in_srgb,var(--ink)_15%,transparent)] md:hidden">
                {filteredPeriods.length === 0 ? (
                  <EmptyState
                    icon={VInbox}
                    title="Chưa có kỳ KPI nào khớp bộ lọc ✎"
                    note="Tạo kỳ mới hoặc bỏ lọc trạng thái."
                  />
                ) : (
                  filteredPeriods.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedId(p.id)}
                      className={cn(
                        "sticker-pop block w-full p-4 text-left transition-colors",
                        p.id === selectedId && "bg-[var(--blue-mist)]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold leading-tight text-[var(--ink)]">
                            {p.name}
                          </p>
                          <p className="mt-0.5 font-mono text-[0.68rem] text-[var(--ink-soft)]">
                            {p.code}
                          </p>
                        </div>
                        <InkBadge
                          tone={PERIOD_STATUS_META[p.status]?.tone ?? "neutral"}
                          className="!text-[0.62rem]"
                        >
                          {PERIOD_STATUS_META[p.status]?.label ?? p.status}
                        </InkBadge>
                      </div>
                      <p className="mt-2 text-[0.72rem] tabular text-[var(--ink-soft)]">
                        {formatDateVN(p.startDate)} → {formatDateVN(p.endDate)} · {p.ruleVersion}
                      </p>
                    </button>
                  ))
                )}
              </div>

              <div className="border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_20%,transparent)] px-4 py-3">
                <p className="tabular text-xs text-[var(--ink-soft)]">
                  {filteredPeriods.length} kỳ hiển thị · bấm một dòng để xem kết quả
                </p>
              </div>
            </SketchCard>

            {/* Panel chi tiết kỳ */}
            <div className="space-y-4">
              {!selected ? (
                <SketchCard hover={false} className="p-5">
                  <EmptyState
                    icon={VTarget}
                    title="Chọn một kỳ KPI"
                    note="Panel này hiện trạng thái, nút tính / chốt và kết quả từng người."
                  />
                </SketchCard>
              ) : (
                <>
                  <SketchCard hover={false} className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="eyebrow !text-[0.6rem]">Chi tiết kỳ KPI</p>
                        <h2 className="mt-1 text-lg font-extrabold leading-tight text-[var(--ink)]">
                          {selected.name}
                        </h2>
                        <p className="mt-0.5 font-mono text-[0.7rem] text-[var(--ink-soft)]">
                          {selected.code} · {selected.ruleVersion}
                        </p>
                      </div>
                      <InkBadge
                        tone={PERIOD_STATUS_META[selected.status]?.tone ?? "neutral"}
                        className="shrink-0"
                      >
                        {PERIOD_STATUS_META[selected.status]?.label ?? selected.status}
                      </InkBadge>
                    </div>

                    <dl className="mt-4 divide-y-2 divide-dashed divide-[color-mix(in_srgb,var(--ink)_15%,transparent)] rounded-[12px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3.5">
                      <div className="flex items-center justify-between gap-3 py-2.5">
                        <dt className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                          Thời gian
                        </dt>
                        <dd className="tabular text-sm font-semibold text-[var(--ink)]">
                          {formatDateVN(selected.startDate)} → {formatDateVN(selected.endDate)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3 py-2.5">
                        <dt className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                          Cập nhật
                        </dt>
                        <dd className="tabular text-sm font-semibold text-[var(--ink)]">
                          {formatDateTimeVN(selected.updatedAt)}
                        </dd>
                      </div>
                    </dl>

                    {/* Hành động theo trạng thái */}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {(selected.status === "open" || selected.status === "calculating") && (
                        <InkButton
                          variant="royal"
                          size="sm"
                          onClick={() =>
                            setConfirmAction({
                              kind: "calculate",
                              period: selected,
                              label: "Tính KPI",
                              desc: "Chạy batch kpi-v1: open → calculating → open, sinh kết quả từng người kèm truy vết thành phần. Kỳ đã chốt không tính lại.",
                            })
                          }
                        >
                          <VPlay size={14} /> Tính KPI
                        </InkButton>
                      )}
                      {selected.status === "open" && (
                        <InkButton
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setConfirmAction({
                              kind: "finalize",
                              period: selected,
                              label: "Chốt kỳ",
                              desc: "open → finalized. Yêu cầu vừa tính KPI thành công cho kỳ hiện tại; chốt xong khóa kỳ và gửi thông báo.",
                            })
                          }
                        >
                          <VCheck size={14} /> Chốt kỳ
                        </InkButton>
                      )}
                      {selected.status === "draft" && (
                        <InkButton
                          variant="royal"
                          size="sm"
                          onClick={() =>
                            setConfirmAction({
                              kind: "status",
                              period: selected,
                              status: "open",
                              label: "Mở kỳ",
                              desc: "draft → open — mở kỳ để bắt đầu chạy tính KPI.",
                            })
                          }
                        >
                          <VCheck size={14} /> Mở kỳ
                        </InkButton>
                      )}
                      {(selected.status === "open" || selected.status === "finalized") && (
                        <InkButton
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setConfirmAction({
                              kind: "status",
                              period: selected,
                              status: "closed",
                              label: "Đóng kỳ",
                              desc: "Đóng kỳ lại — không tính lại hay sinh lương từ kỳ này nữa.",
                            })
                          }
                        >
                          <VLock size={14} /> Đóng kỳ
                        </InkButton>
                      )}
                      {(selected.status === "draft" || selected.status === "open") && (
                        <button
                          type="button"
                          className="focus-ink sketch-border-thin bg-[var(--paper-raised)] px-2.5 py-1.5 text-xs font-bold text-[var(--ink)] transition-all hover:bg-[var(--blue-mist)]"
                          onClick={() => {
                            setEditForm({
                              name: selected.name,
                              startDate: isoToDateInput(selected.startDate),
                              endDate: isoToDateInput(selected.endDate),
                            });
                            setEditOpen(true);
                          }}
                        >
                          Sửa kỳ
                        </button>
                      )}
                    </div>

                    {/* Chuyển trạng thái thủ công — cover đủ enum */}
                    <div className="mt-3 flex items-center gap-2">
                      <label
                        htmlFor="kpi-status-select"
                        className="text-[0.68rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]"
                      >
                        Chuyển trạng thái
                      </label>
                      <SketchSelect
                        id="kpi-status-select"
                        value=""
                        onChange={(e) => {
                          const next = e.target.value as KpiPeriodStatus;
                          if (!next) return;
                          setConfirmAction({
                            kind: "status",
                            period: selected,
                            status: next,
                            label: PERIOD_STATUS_META[next]?.label ?? next,
                            desc: `Chuyển "${selected.name}" sang "${PERIOD_STATUS_META[next]?.label ?? next}". Lưu ý: "calculating" do engine quản, chốt kỳ cần tính KPI trước.`,
                          });
                        }}
                        className="max-w-[200px] py-1.5 text-xs"
                        aria-label="Chuyển trạng thái kỳ KPI"
                      >
                        <option value="">— chọn —</option>
                        {ALL_PERIOD_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {PERIOD_STATUS_META[s].label}
                          </option>
                        ))}
                      </SketchSelect>
                    </div>
                  </SketchCard>

                  {/* Kết quả theo user */}
                  <SketchCard hover={false} className="p-5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="eyebrow !text-[0.6rem]">Kết quả đã lưu</p>
                        <h3 className="mt-1 text-base font-extrabold text-[var(--ink)]">
                          Kết quả theo người
                        </h3>
                      </div>
                      <InkBadge tone="neutral" className="tabular !text-[0.68rem]">
                        {resultsApi.data?.total ?? 0} kết quả
                      </InkBadge>
                    </div>

                    {resultsApi.loading ? (
                      <div className="mt-4">
                        <PencilLines rows={3} />
                      </div>
                    ) : resultsApi.error ? (
                      <div className="mt-4">
                        <SectionError message={resultsApi.error} onRetry={resultsApi.reload} />
                      </div>
                    ) : results.length === 0 ? (
                      <div className="mt-4">
                        <EmptyState
                          icon={VTarget}
                          title="Kỳ chưa có kết quả"
                          note='Bấm "Tính KPI" để chạy batch và sinh kết quả từng người.'
                        />
                      </div>
                    ) : (
                      <ul className="mt-4 max-h-96 space-y-2 overflow-y-auto pr-1">
                        {results.map((r) => (
                          <li key={r.id}>
                            <button
                              type="button"
                              onClick={() => openResultDetail(r)}
                              className="focus-ink sticker-pop flex w-full items-center justify-between gap-3 rounded-[10px_12px_10px_12px] border-2 border-[color-mix(in_srgb,var(--ink)_30%,transparent)] bg-[var(--paper)] p-3 text-left transition-all hover:border-[var(--ink)]"
                              aria-label={`Xem chi tiết kết quả của ${userName(r.userId)}`}
                            >
                              <div className="min-w-0">
                                <p className="flex items-center gap-1.5 text-sm font-bold text-[var(--ink)]">
                                  <VUsers size={14} className="shrink-0 text-[var(--royal)]" aria-hidden="true" />
                                  {userName(r.userId)}
                                </p>
                                <p className="mt-0.5 text-[0.68rem] text-[var(--ink-soft)]">
                                  {r.calculatedAt
                                    ? `Tính lúc ${formatDateTimeVN(r.calculatedAt)}`
                                    : "Chưa tính"}
                                </p>
                              </div>
                              <span className="shrink-0 text-right">
                                <span
                                  className={cn(
                                    "block text-lg font-extrabold tabular",
                                    (r.finalScore ?? 0) >= 80
                                      ? "text-[var(--success)]"
                                      : (r.finalScore ?? 0) >= 50
                                        ? "text-[var(--warning)]"
                                        : "text-[var(--danger)]",
                                  )}
                                >
                                  {r.finalScore === null ? "—" : r.finalScore.toLocaleString("vi-VN")}
                                </span>
                                <span className="block font-mono text-[0.62rem] text-[var(--ink-soft)]">
                                  điểm · {r.status}
                                </span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </SketchCard>
                </>
              )}

              <div className="max-w-md">
                <NoteCard tone="yellow" title="Luồng kỳ KPI">
                  Bản nháp → Đang mở → (Tính KPI) → <b>Chốt kỳ</b> → Đóng. Chốt kỳ yêu cầu batch
                  tính mới nhất thành công — lỗi sẽ báo <b>KPI_CALCULATION_REQUIRED</b>.
                </NoteCard>
              </div>
            </div>
          </div>
        </>
      )}

      {/* =========================== TAB 2: LƯƠNG ẢO =========================== */}
      {tab === "salary" && (
        <>
          <div className="mb-4">
            <NoteCard tone="pink" title="Đơn vị tiền ảo VND_VIRTUAL">
              Toàn bộ sổ lương trên trang này là <b>tiền ảo VND_VIRTUAL</b> dùng cho gamification
              — <b>không phải lương thật</b>. Mọi bút đều có lý do + audit log.
            </NoteCard>
          </div>

          <SketchCard hover={false} className="mb-4 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow !text-[0.6rem]">Loại bút</span>
              <ChipGroup
                ariaLabel="Lọc sổ lương theo loại"
                options={SALARY_TYPE_FILTER}
                value={salaryTypeFilter as (typeof SALARY_TYPE_FILTER)[number]["value"]}
                onChange={setSalaryTypeFilter}
              />
            </div>
          </SketchCard>

          <SketchCard hover={false} className="overflow-hidden">
            {salaryApi.loading ? (
              <div className="p-5">
                <PencilLines rows={6} />
              </div>
            ) : salaryApi.error ? (
              <div className="p-5">
                <SectionError message={salaryApi.error} onRetry={salaryApi.reload} />
              </div>
            ) : ledger.length === 0 ? (
              <EmptyState
                icon={VWallet}
                title="Sổ lương ảo trống ✎"
                note="Sinh lương từ một kỳ KPI đã chốt, hoặc tạo bút điều chỉnh thủ công."
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="ink-table min-w-[820px]">
                    <thead>
                      <tr>
                        <th>Người nhận</th>
                        <th>Loại</th>
                        <th>Số tiền</th>
                        <th>Nguồn</th>
                        <th>Ghi chú</th>
                        <th>Thời gian</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.map((entry: SalaryLedgerEntry) => (
                        <tr key={entry.id} className="sticker-pop">
                          <td>
                            <p className="text-sm font-bold text-[var(--ink)]">
                              {userName(entry.userId)}
                            </p>
                            <p className="mt-0.5 font-mono text-[0.64rem] text-[var(--ink-soft)]">
                              {entry.userId.slice(0, 8)}…
                            </p>
                          </td>
                          <td>
                            <InkBadge
                              tone={SALARY_TYPE_META[entry.type]?.tone ?? "neutral"}
                              className="!text-[0.65rem]"
                            >
                              {SALARY_TYPE_META[entry.type]?.label ?? entry.type}
                            </InkBadge>
                          </td>
                          <td>
                            <AmountText amount={entry.amount} className="text-sm" />
                            <span className="block font-mono text-[0.6rem] text-[var(--ink-soft)]">
                              {entry.unit}
                            </span>
                          </td>
                          <td className="font-mono text-[0.66rem] text-[var(--ink-soft)]">
                            {entry.sourceType ?? "—"}
                          </td>
                          <td className="max-w-[260px]">
                            <p className="truncate text-xs text-[var(--ink-soft)]" title={entry.description ?? ""}>
                              {entry.description ?? "—"}
                            </p>
                          </td>
                          <td className="whitespace-nowrap text-[0.74rem] tabular text-[var(--ink-soft)]">
                            {formatDateTimeVN(entry.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bản card mobile */}
                <div className="divide-y-2 divide-dashed divide-[color-mix(in_srgb,var(--ink)_15%,transparent)] md:hidden">
                  {ledger.map((entry) => (
                    <div key={entry.id} className="sticker-pop p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[var(--ink)]">
                            {userName(entry.userId)}
                          </p>
                          <InkBadge
                            tone={SALARY_TYPE_META[entry.type]?.tone ?? "neutral"}
                            className="mt-1 !text-[0.62rem]"
                          >
                            {SALARY_TYPE_META[entry.type]?.label ?? entry.type}
                          </InkBadge>
                        </div>
                        <AmountText amount={entry.amount} />
                      </div>
                      {entry.description && (
                        <p className="mt-2 text-xs leading-snug text-[var(--ink-soft)]">
                          {entry.description}
                        </p>
                      )}
                      <p className="mt-1.5 font-mono text-[0.62rem] text-[var(--ink-soft)]">
                        {entry.sourceType ?? "—"} · {formatDateTimeVN(entry.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_20%,transparent)] px-4 py-3">
                  <p className="tabular text-xs text-[var(--ink-soft)]">
                    {salaryApi.data?.total ?? 0} bút trong sổ · đơn vị {ledger[0]?.unit ?? "VND_VIRTUAL"}
                  </p>
                </div>
              </>
            )}
          </SketchCard>
        </>
      )}

      {/* ---------------------- DIALOG: TẠO KỲ KPI ---------------------- */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[var(--ink)]">Tạo kỳ KPI</DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Kỳ mới bắt đầu ở trạng thái bản nháp, ghim rule <b>kpi-v1</b>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="kpi-code">Mã kỳ</FieldLabel>
                <SketchInput
                  id="kpi-code"
                  value={createForm.code}
                  onChange={(e) => setCreateForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="VD: KPI-2026-Q4"
                />
              </div>
              <div>
                <FieldLabel htmlFor="kpi-name">Tên kỳ</FieldLabel>
                <SketchInput
                  id="kpi-name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="VD: KPI quý 4 / 2026"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="kpi-start">Ngày bắt đầu</FieldLabel>
                <SketchInput
                  id="kpi-start"
                  type="date"
                  value={createForm.startDate}
                  onChange={(e) => setCreateForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div>
                <FieldLabel htmlFor="kpi-end">Ngày kết thúc</FieldLabel>
                <SketchInput
                  id="kpi-end"
                  type="date"
                  value={createForm.endDate}
                  onChange={(e) => setCreateForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
              Hủy
            </InkButton>
            <InkButton variant="royal" size="sm" disabled={busy} onClick={submitCreatePeriod}>
              <VPlus size={14} /> Tạo kỳ
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------------- DIALOG: SỬA KỲ KPI ---------------------- */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[var(--ink)]">Sửa kỳ KPI</DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Chỉ sửa được kỳ draft/open — mã kỳ và rule version không đổi được.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <FieldLabel htmlFor="edit-kpi-name">Tên kỳ</FieldLabel>
              <SketchInput
                id="edit-kpi-name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="edit-kpi-start">Ngày bắt đầu</FieldLabel>
                <SketchInput
                  id="edit-kpi-start"
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div>
                <FieldLabel htmlFor="edit-kpi-end">Ngày kết thúc</FieldLabel>
                <SketchInput
                  id="edit-kpi-end"
                  type="date"
                  value={editForm.endDate}
                  onChange={(e) => setEditForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setEditOpen(false)}>
              Hủy
            </InkButton>
            <InkButton variant="royal" size="sm" disabled={busy} onClick={submitEditPeriod}>
              <VCheck size={14} /> Lưu thay đổi
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------- DIALOG: CHI TIẾT 1 KẾT QUẢ KPI (metrics) ------------- */}
      <Dialog open={!!resultDetail || resultLoading} onOpenChange={(open) => !open && setResultDetail(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[var(--ink)]">
              Kết quả KPI — {resultDetail ? userName(resultDetail.result.userId) : "đang tải"}
            </DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              {resultDetail
                ? `Truy vết đầy đủ theo rule ${resultDetail.result.ruleVersion}: giá trị nguồn, trọng số cấu hình / hiệu dụng và đóng góp từng thành phần.`
                : "Đang tải kết quả từ hệ thống..."}
            </DialogDescription>
          </DialogHeader>
          {resultLoading && (
            <div className="py-4">
              <PencilLines rows={4} />
            </div>
          )}
          {resultDetail && (
            <>
              <div className="flex items-center justify-between gap-3 rounded-[12px] border-2 border-[var(--ink)] bg-[var(--paper)] px-4 py-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                    Điểm cuối
                  </p>
                  <p className="text-3xl font-extrabold tabular text-[var(--royal)]">
                    {(resultDetail.result.finalScore ?? 0).toLocaleString("vi-VN")}
                  </p>
                </div>
                <div className="text-right text-[0.7rem] text-[var(--ink-soft)]">
                  <p className="font-mono">{resultDetail.result.status}</p>
                  <p>
                    {resultDetail.result.calculatedAt
                      ? formatDateTimeVN(resultDetail.result.calculatedAt)
                      : "—"}
                  </p>
                </div>
              </div>

              {resultDetail.metrics.length === 0 ? (
                <EmptyState
                  icon={VTarget}
                  title="Không có thành phần nào"
                  note="Kết quả này chưa ghi nhận metric chi tiết."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="ink-table min-w-[420px]">
                    <thead>
                      <tr>
                        <th>Thành phần</th>
                        <th>Giá trị</th>
                        <th>Trọng số</th>
                        <th>Đóng góp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultDetail.metrics.map((m) => (
                        <tr key={m.id} className="sticker-pop">
                          <td className="font-mono text-[0.72rem] font-bold text-[var(--ink)]">
                            {m.metricCode}
                          </td>
                          <td className="tabular text-sm">{m.sourceValue.toLocaleString("vi-VN")}</td>
                          <td className="tabular text-[0.78rem] text-[var(--ink-soft)]">
                            {m.effectiveWeight}%
                            {m.configuredWeight !== m.effectiveWeight && (
                              <span className="block text-[0.62rem]">
                                (cấu hình {m.configuredWeight}%)
                              </span>
                            )}
                          </td>
                          <td className="tabular text-sm font-extrabold text-[var(--royal)]">
                            {m.weightedContribution.toLocaleString("vi-VN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <MarginNote>
                Thiếu thành phần nào thì loại bỏ và chuẩn hóa lại trọng số — không phạt 0.
              </MarginNote>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ---------------- DIALOG: XÁC NHẬN TÍNH / CHỐT / TRẠNG THÁI ---------------- */}
      <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-sm">
          {confirmAction && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-extrabold text-[var(--ink)]">
                  <VAlert size={18} className="text-[var(--warning)]" aria-hidden="true" />
                  {confirmAction.label} — "{confirmAction.period.name}"?
                </DialogTitle>
                <DialogDescription className="text-[var(--ink-soft)]">
                  {confirmAction.desc}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <InkButton variant="ghost" size="sm" onClick={() => setConfirmAction(null)}>
                  Hủy
                </InkButton>
                <InkButton variant="royal" size="sm" disabled={busy} onClick={submitConfirm}>
                  <VCheck size={14} /> Xác nhận
                </InkButton>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ---------------- DIALOG: SINH LƯƠNG TỪ KỲ KPI ---------------- */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[var(--ink)]">
              Sinh lương ảo từ kỳ KPI
            </DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Chỉ kỳ <b>đã chốt (finalized)</b> mới sinh được lương. Lương cơ sở lấy từ cấu hình
              hệ thống; thao tác idempotent — chạy lại không nhân đôi bút.
            </DialogDescription>
          </DialogHeader>
          <div>
            <FieldLabel htmlFor="generate-period">Kỳ KPI đã chốt</FieldLabel>
            {finalizedPeriods.length === 0 ? (
              <p className="rounded-[10px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_30%,transparent)] px-3 py-3 text-sm text-[var(--ink-soft)]">
                Chưa có kỳ KPI nào ở trạng thái đã chốt.
              </p>
            ) : (
              <SketchSelect
                id="generate-period"
                value={generatePeriodId}
                onChange={(e) => setGeneratePeriodId(e.target.value)}
              >
                <option value="">— chọn kỳ —</option>
                {finalizedPeriods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </SketchSelect>
            )}
          </div>
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setGenerateOpen(false)}>
              Hủy
            </InkButton>
            <InkButton
              variant="royal"
              size="sm"
              disabled={busy || !generatePeriodId}
              onClick={submitGenerate}
            >
              <VPlay size={14} /> Sinh lương
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- DIALOG: ĐIỀU CHỈNH THỦ CÔNG ---------------- */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[var(--ink)]">
              Điều chỉnh sổ lương ảo
            </DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Mọi bút đều kèm lý do, ghi audit log và gửi thông báo cho người dùng.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <FieldLabel htmlFor="adjust-user">Người dùng</FieldLabel>
              <SketchSelect
                id="adjust-user"
                value={adjustForm.userId}
                onChange={(e) => setAdjustForm((f) => ({ ...f, userId: e.target.value }))}
              >
                <option value="">— chọn người dùng —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName} ({u.email})
                  </option>
                ))}
              </SketchSelect>
            </div>
            <fieldset>
              <legend className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                Loại điều chỉnh
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(ADJUST_TYPE_META) as AdjustmentType[]).map((t) => {
                  const active = adjustForm.type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setAdjustForm((f) => ({ ...f, type: t }))}
                      className={cn(
                        "focus-ink rounded-[10px] border-2 px-2.5 py-2 text-xs font-bold transition-all",
                        active
                          ? "border-[var(--ink)] bg-[var(--blue-mist)] text-[var(--ink)] shadow-ink-2"
                          : "border-[color-mix(in_srgb,var(--ink)_28%,transparent)] bg-[var(--paper)] text-[var(--ink-soft)] hover:border-[var(--ink)] hover:text-[var(--ink)]",
                      )}
                    >
                      {ADJUST_TYPE_META[t].label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[0.7rem] text-[var(--ink-soft)]">
                {ADJUST_TYPE_META[adjustForm.type].hint}
              </p>
            </fieldset>
            <div>
              <FieldLabel htmlFor="adjust-amount">Số tiền (tùy chọn)</FieldLabel>
              <SketchInput
                id="adjust-amount"
                type="number"
                step={1000}
                value={adjustForm.amount}
                onChange={(e) => setAdjustForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="VD: 5000"
              />
            </div>
            <div>
              <FieldLabel htmlFor="adjust-reason">Lý do (bắt buộc)</FieldLabel>
              <SketchTextarea
                id="adjust-reason"
                rows={3}
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="VD: Thưởng đột xuất hoàn thành sớm sprint..."
              />
            </div>
          </div>
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setAdjustOpen(false)}>
              Hủy
            </InkButton>
            <InkButton variant="royal" size="sm" disabled={busy} onClick={submitAdjustment}>
              <VCoins size={14} /> Ghi bút
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- DIALOG: SỐ DƯ USER ---------------- */}
      <Dialog open={balanceOpen} onOpenChange={setBalanceOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[var(--ink)]">Số dư lương ảo</DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Số dư suy ra từ toàn bộ sổ lương ảo của người dùng (VND_VIRTUAL).
            </DialogDescription>
          </DialogHeader>
          <div>
            <FieldLabel htmlFor="balance-user">Người dùng</FieldLabel>
            <div className="flex gap-2">
              <SketchSelect
                id="balance-user"
                value={balanceUserId}
                onChange={(e) => setBalanceUserId(e.target.value)}
                className="flex-1"
              >
                <option value="">— chọn người dùng —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName} ({u.email})
                  </option>
                ))}
              </SketchSelect>
              <InkButton
                variant="outline"
                size="sm"
                onClick={() => setBalanceVersion((v) => v + 1)}
                aria-label="Tải lại số dư"
              >
                <VRefresh size={14} />
              </InkButton>
            </div>
          </div>

          {balanceUserId && balanceApi.loading && (
            <div className="mt-4">
              <PencilLines rows={2} />
            </div>
          )}
          {balanceUserId && balanceApi.error && (
            <div className="mt-4">
              <SectionError message={balanceApi.error} onRetry={() => setBalanceVersion((v) => v + 1)} />
            </div>
          )}
          {balanceUserId && balanceApi.data && (
            <>
              <div className="mt-4 flex items-center justify-between gap-3 rounded-[12px] border-2 border-[var(--ink)] bg-[var(--paper)] px-4 py-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                    Số dư toàn cục
                  </p>
                  <p className="text-3xl font-extrabold tabular text-[var(--royal)]">
                    {balanceApi.data.balance.toLocaleString("vi-VN")}
                  </p>
                  <p className="font-mono text-[0.66rem] text-[var(--ink-soft)]">
                    {balanceApi.data.unit} · {balanceApi.data.virtual ? "tiền ảo" : "tiền thật"}
                  </p>
                </div>
                <VTimer size={26} className="text-[var(--ink-soft)]" aria-hidden="true" />
              </div>

              {balanceApi.data.latestEntries.length > 0 && (
                <div className="mt-4">
                  <p className="eyebrow !text-[0.62rem]">Bút gần nhất</p>
                  <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto pr-1">
                    {balanceApi.data.latestEntries.map((e) => (
                      <li
                        key={e.id}
                        className="flex items-center justify-between gap-2 rounded-[9px] border-2 border-[color-mix(in_srgb,var(--ink)_25%,transparent)] bg-[var(--paper)] px-3 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <InkBadge
                            tone={SALARY_TYPE_META[e.type]?.tone ?? "neutral"}
                            className="!text-[0.6rem]"
                          >
                            {SALARY_TYPE_META[e.type]?.label ?? e.type}
                          </InkBadge>
                          <p className="mt-1 truncate text-[var(--ink-soft)]">
                            {e.description ?? "—"}
                          </p>
                        </div>
                        <AmountText amount={e.amount} className="shrink-0 text-xs" />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
