"use client";
/* =====================================================================
 * ADMIN RECRUITMENT — quản lý vòng tuyển dụng (route admin "recruitment").
 *
 * Endpoint BE cover (RecruitmentRounds group — 16/16 + career-roles):
 *  GET  /recruitment-rounds                          — bảng đợt tuyển
 *  POST /recruitment-rounds {name,opensAt,closesAt}  — tạo đợt (mặc định draft)
 *  GET  /recruitment-rounds/{id}                     — chi tiết + slots
 *  POST /recruitment-rounds/{id}/status {status}     — draft|open|closed
 *  POST /recruitment-rounds/{id}/slots               — tạo khung giờ phỏng vấn
 *  POST /recruitment-rounds/{id}/slots/{slotId}/close — đóng slot
 *  GET  /recruitment-rounds/{id}/applications        — bảng hồ sơ ứng viên
 *  GET  /recruitment-rounds/{id}/applications/{aid}  — chi tiết hồ sơ (timeline)
 *  GET  /recruitment-rounds/{id}/applications/{aid}/cv — tải CV (blob)
 *  POST /recruitment-rounds/{id}/applications/{aid}/retry
 *  POST /recruitment-rounds/{id}/applications/{aid}/cancel
 *  POST /recruitment-rounds/{id}/applications/{aid}/reschedule {slotId}
 *  POST /recruitment-rounds/{id}/applications/{aid}/resend-credentials
 *  GET  /recruitment-rounds/{id}/applications/{aid}/credential-recovery?slotId=
 *  POST /recruitment-rounds/{id}/applications/{aid}/recover-credentials
 *  POST /recruitment-rounds/{id}/applications/{aid}/retake {reason,slotId}
 *  GET  /career-roles                                — dropdown vai trò khi tạo slot
 * =====================================================================
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  VBan,
  VBadgeCheck,
  VCalendar,
  VCalendarCheck,
  VCheck,
  VClock,
  VDownload,
  VEye,
  VInbox,
  VKey,
  VListTodo,
  VMore,
  VPlay,
  VPlus,
  VRefresh,
  VSearch,
  VSend,
  VSparkles,
  VUserSearch,
} from "@/components/icons/v-icons";
import { InkButton } from "@/components/notebook/reveal";
import {
  InkBadge,
  NoteCard,
  SketchCard,
  formatDateVN,
  formatDateTimeVN,
} from "@/components/notebook/ui";
import {
  ChipGroup,
  EmptyState,
  PencilLines,
  SectionError,
  SketchInput,
  SketchTextarea,
  StaffPageHeader,
  initialsOf,
  relativeVN,
} from "@/components/staff/staff-kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { errorMessage } from "@/lib/api/api-client";
import { cvExtension } from "@/lib/api/applications";
import {
  cancelRoundApplication,
  closeInterviewSlot,
  createInterviewSlot,
  createRecruitmentRound,
  downloadRoundApplicationCv,
  getRecruitmentRound,
  getRoundApplication,
  listCareerRoleOptions,
  listRecruitmentRounds,
  listRoundApplications,
  previewCredentialRecovery,
  recoverRoundApplicationCredentials,
  rescheduleRoundApplication,
  resendRoundApplicationCredentials,
  retakeRoundApplication,
  retryRoundApplication,
  saveBlobAs,
  setRecruitmentRoundStatus,
  type CredentialRecoveryPreview,
  type InterviewSlot,
  type RecruitmentRoundDetail,
  type RecruitmentRoundRow,
  type RoundApplicationDetail,
  type RoundApplicationRow,
  type RoundStatus,
} from "@/lib/api/recruitment";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";

/* ------------------------------- meta maps ------------------------------ */

const ROUND_STATUS_META: Record<string, { label: string; tone: string }> = {
  draft: { label: "Nháp", tone: "neutral" },
  open: { label: "Đang mở", tone: "mint" },
  closed: { label: "Đã đóng", tone: "red" },
};

const SLOT_STATUS_META: Record<string, { label: string; tone: string }> = {
  open: { label: "Mở", tone: "green" },
  closed: { label: "Đã đóng", tone: "red" },
  full: { label: "Hết chỗ", tone: "amber" },
};

const APP_STATUS_META: Record<string, { label: string; tone: string }> = {
  unverified: { label: "Chưa xác thực", tone: "amber" },
  verified: { label: "Đã xác thực", tone: "green" },
  analysing: { label: "Đang phân tích CV", tone: "blue" },
  analyzed: { label: "Đã phân tích CV", tone: "blue" },
  booked: { label: "Đã đặt lịch", tone: "mint" },
  interviewing: { label: "Đang phỏng vấn", tone: "blue" },
  passed: { label: "Đạt", tone: "green" },
  failed: { label: "Chưa đạt", tone: "red" },
  hired: { label: "Đã tuyển", tone: "mint" },
  rejected: { label: "Loại", tone: "red" },
  withdrawn: { label: "Đã rút", tone: "neutral" },
  cancelled: { label: "Đã hủy", tone: "red" },
};

function roundStatusMeta(status: string) {
  return ROUND_STATUS_META[status] ?? { label: status, tone: "neutral" };
}
function slotStatusMeta(status: string) {
  return SLOT_STATUS_META[status] ?? { label: status, tone: "neutral" };
}
function appStatusMeta(status: string) {
  return APP_STATUS_META[status] ?? { label: status, tone: "neutral" };
}

/** datetime-local ("2026-12-15T09:00") → ISO UTC; null khi rỗng/sai. */
function localToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/* ============================== component ============================== */

export default function AdminRecruitment() {
  /* ------------------------------ dữ liệu ------------------------------ */
  const rounds = useApi(listRecruitmentRounds);
  const roles = useApi(listCareerRoleOptions);

  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const detail = useApi(
    async (): Promise<RecruitmentRoundDetail | null> =>
      selectedRoundId ? await getRecruitmentRound(selectedRoundId) : null,
    [selectedRoundId],
  );
  const applications = useApi(
    async (): Promise<RoundApplicationRow[] | null> =>
      selectedRoundId ? await listRoundApplications(selectedRoundId) : null,
    [selectedRoundId],
  );

  const reloadSelection = () => {
    detail.reload();
    applications.reload();
  };

  /* --------------------------- tạo đợt tuyển --------------------------- */
  const [createOpen, setCreateOpen] = useState(false);
  const [roundForm, setRoundForm] = useState({ name: "", opensAt: "", closesAt: "" });
  const [roundBusy, setRoundBusy] = useState(false);

  const submitCreateRound = async () => {
    const name = roundForm.name.trim();
    if (name.length < 3) {
      toast.error("Tên đợt cần tối thiểu 3 ký tự.");
      return;
    }
    const opensAt = localToIso(roundForm.opensAt);
    const closesAt = localToIso(roundForm.closesAt);
    if (!opensAt || !closesAt) {
      toast.error("Chọn đủ thời gian mở và đóng đợt tuyển.");
      return;
    }
    if (new Date(opensAt) >= new Date(closesAt)) {
      toast.error("Thời gian đóng phải sau thời gian mở.");
      return;
    }
    setRoundBusy(true);
    try {
      const created = await createRecruitmentRound({ name, opensAt, closesAt });
      toast.success(`Đã tạo đợt "${created.name}" — đang ở trạng thái Nháp.`);
      setCreateOpen(false);
      setRoundForm({ name: "", opensAt: "", closesAt: "" });
      rounds.reload();
      setSelectedRoundId(created.id);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setRoundBusy(false);
    }
  };

  /* --------------------------- đổi trạng thái --------------------------- */
  const [statusBusy, setStatusBusy] = useState<string | null>(null);

  const changeStatus = async (round: RecruitmentRoundRow, status: RoundStatus) => {
    setStatusBusy(round.id);
    try {
      await setRecruitmentRoundStatus(round.id, status);
      toast.success(`Đã chuyển "${round.name}" sang ${roundStatusMeta(status).label.toLowerCase()}.`);
      rounds.reload();
      if (selectedRoundId === round.id) detail.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setStatusBusy(null);
    }
  };

  /* ------------------------------ tạo slot ------------------------------ */
  const [slotOpen, setSlotOpen] = useState(false);
  const [slotForm, setSlotForm] = useState({
    roleCode: "",
    startsAt: "",
    endsAt: "",
    timezone: "Asia/Ho_Chi_Minh",
    capacity: "5",
  });
  const [slotBusy, setSlotBusy] = useState(false);

  const submitCreateSlot = async () => {
    if (!selectedRoundId || !detail.data) return;
    if (!slotForm.roleCode) {
      toast.error("Chọn vai trò cho khung giờ phỏng vấn.");
      return;
    }
    const startsAt = localToIso(slotForm.startsAt);
    const endsAt = localToIso(slotForm.endsAt);
    if (!startsAt || !endsAt) {
      toast.error("Chọn đủ thời gian bắt đầu và kết thúc.");
      return;
    }
    if (new Date(startsAt) >= new Date(endsAt)) {
      toast.error("Thời gian kết thúc phải sau bắt đầu.");
      return;
    }
    const capacity = Number.parseInt(slotForm.capacity, 10);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) {
      toast.error("Sức chứa từ 1 đến 100 ứng viên.");
      return;
    }
    if (!slotForm.timezone.trim()) {
      toast.error("Nhập múi giờ (vd Asia/Ho_Chi_Minh).");
      return;
    }
    setSlotBusy(true);
    try {
      await createInterviewSlot(selectedRoundId, {
        roleCode: slotForm.roleCode,
        startsAt,
        endsAt,
        timezone: slotForm.timezone.trim(),
        capacity,
      });
      toast.success("Đã mở khung giờ phỏng vấn mới.");
      setSlotOpen(false);
      setSlotForm((f) => ({ ...f, roleCode: "", startsAt: "", endsAt: "", capacity: "5" }));
      detail.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSlotBusy(false);
    }
  };

  const [closeSlotBusy, setCloseSlotBusy] = useState<string | null>(null);

  const closeSlot = async (slot: InterviewSlot) => {
    if (!selectedRoundId) return;
    setCloseSlotBusy(slot.id);
    try {
      await closeInterviewSlot(selectedRoundId, slot.id);
      toast.success(`Đã đóng khung ${formatDateTimeVN(slot.startsAt)}.`);
      detail.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setCloseSlotBusy(null);
    }
  };

  /* --------------------------- hồ sơ ứng viên --------------------------- */
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const statusOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of applications.data ?? []) {
      if (!seen.has(row.status)) seen.set(row.status, appStatusMeta(row.status).label);
    }
    return [
      { value: "all", label: "Tất cả" },
      ...Array.from(seen.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [applications.data]);

  const filteredApplications = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (applications.data ?? []).filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (
        q &&
        !row.fullName.toLowerCase().includes(q) &&
        !(row.email ?? "").toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [applications.data, query, statusFilter]);

  /* Chi tiết hồ sơ (dialog) */
  const [appDetailId, setAppDetailId] = useState<string | null>(null);
  const [appDetail, setAppDetail] = useState<RoundApplicationDetail | null>(null);
  const [appDetailLoading, setAppDetailLoading] = useState(false);

  const openAppDetail = async (row: RoundApplicationRow) => {
    if (!selectedRoundId) return;
    setAppDetailId(row.id);
    setAppDetail(null);
    setAppDetailLoading(true);
    try {
      const loaded = await getRoundApplication(selectedRoundId, row.id);
      setAppDetail(loaded);
    } catch (error) {
      toast.error(errorMessage(error));
      setAppDetailId(null);
    } finally {
      setAppDetailLoading(false);
    }
  };

  /* Hành động từng hồ sơ */
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const downloadCv = async (row: RoundApplicationRow) => {
    if (!selectedRoundId) return;
    setActionBusy(`${row.id}:cv`);
    try {
      const blob = await downloadRoundApplicationCv(selectedRoundId, row.id);
      const ext = await cvExtension(blob);
      saveBlobAs(blob, `CV-${row.fullName.replace(/\s+/g, "-") || "ung-vien"}.${ext}`);
      toast.success("Đã tải CV về máy.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setActionBusy(null);
    }
  };

  const retryAnalysis = async (row: RoundApplicationRow) => {
    if (!selectedRoundId) return;
    setActionBusy(`${row.id}:retry`);
    try {
      await retryRoundApplication(selectedRoundId, row.id);
      toast.success(`Đã xếp hàng phân tích lại CV của ${row.fullName}.`);
      reloadSelection();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setActionBusy(null);
    }
  };

  const resendCredentials = async (row: RoundApplicationRow) => {
    if (!selectedRoundId) return;
    setActionBusy(`${row.id}:resend`);
    try {
      await resendRoundApplicationCredentials(selectedRoundId, row.id);
      toast.success(`Đã gửi lại chứng danh phỏng vấn cho ${row.fullName}.`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setActionBusy(null);
    }
  };

  /* Hủy hồ sơ */
  const [cancelApp, setCancelApp] = useState<RoundApplicationRow | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  const confirmCancel = async () => {
    if (!cancelApp || !selectedRoundId) return;
    setCancelBusy(true);
    try {
      await cancelRoundApplication(selectedRoundId, cancelApp.id);
      toast.success(`Đã hủy hồ sơ của ${cancelApp.fullName}.`);
      setCancelApp(null);
      reloadSelection();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setCancelBusy(false);
    }
  };

  /* Đổi lịch (reschedule) */
  const [rescheduleApp, setRescheduleApp] = useState<RoundApplicationRow | null>(null);
  const [rescheduleSlotId, setRescheduleSlotId] = useState("");
  const [rescheduleBusy, setRescheduleBusy] = useState(false);

  const submitReschedule = async () => {
    if (!rescheduleApp || !selectedRoundId) return;
    if (!rescheduleSlotId) {
      toast.error("Chọn khung giờ đích.");
      return;
    }
    setRescheduleBusy(true);
    try {
      await rescheduleRoundApplication(selectedRoundId, rescheduleApp.id, rescheduleSlotId);
      toast.success(`Đã chuyển lịch của ${rescheduleApp.fullName}.`);
      setRescheduleApp(null);
      setRescheduleSlotId("");
      reloadSelection();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setRescheduleBusy(false);
    }
  };

  /* Đặt thi lại (retake) */
  const [retakeApp, setRetakeApp] = useState<RoundApplicationRow | null>(null);
  const [retakeReason, setRetakeReason] = useState("");
  const [retakeSlotId, setRetakeSlotId] = useState("");
  const [retakeBusy, setRetakeBusy] = useState(false);

  const submitRetake = async () => {
    if (!retakeApp || !selectedRoundId) return;
    if (retakeReason.trim().length < 10) {
      toast.error("Lý do cần tối thiểu 10 ký tự.");
      return;
    }
    if (!retakeSlotId) {
      toast.error("Chọn khung giờ thi lại.");
      return;
    }
    setRetakeBusy(true);
    try {
      await retakeRoundApplication(selectedRoundId, retakeApp.id, {
        reason: retakeReason.trim(),
        slotId: retakeSlotId,
      });
      toast.success(`Đã đặt lịch thi lại cho ${retakeApp.fullName}.`);
      setRetakeApp(null);
      setRetakeReason("");
      setRetakeSlotId("");
      reloadSelection();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setRetakeBusy(false);
    }
  };

  /* Khôi phục chứng danh (recover-credentials) */
  const [recoverApp, setRecoverApp] = useState<RoundApplicationRow | null>(null);
  const [recoverSlotId, setRecoverSlotId] = useState("");
  const [recoverPreview, setRecoverPreview] = useState<CredentialRecoveryPreview | null>(null);
  const [recoverPreviewBusy, setRecoverPreviewBusy] = useState(false);
  const [recoverReason, setRecoverReason] = useState("");
  const [recoverBusy, setRecoverBusy] = useState(false);

  const loadRecoverPreview = async () => {
    if (!recoverApp || !selectedRoundId) return;
    if (!recoverSlotId) {
      toast.error("Chọn khung giờ của lịch cần khôi phục.");
      return;
    }
    setRecoverPreviewBusy(true);
    setRecoverPreview(null);
    try {
      const preview = await previewCredentialRecovery(selectedRoundId, recoverApp.id, recoverSlotId);
      setRecoverPreview(preview);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setRecoverPreviewBusy(false);
    }
  };

  const submitRecover = async () => {
    if (!recoverApp || !selectedRoundId || !recoverPreview?.revision) return;
    if (recoverReason.trim().length < 10) {
      toast.error("Lý do cần tối thiểu 10 ký tự.");
      return;
    }
    setRecoverBusy(true);
    try {
      await recoverRoundApplicationCredentials(selectedRoundId, recoverApp.id, {
        expectedRevision: recoverPreview.revision,
        reason: recoverReason.trim(),
        slotId: recoverSlotId,
      });
      toast.success(`Đã cấp lại chứng danh cho ${recoverApp.fullName}.`);
      setRecoverApp(null);
      setRecoverPreview(null);
      setRecoverReason("");
      setRecoverSlotId("");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setRecoverBusy(false);
    }
  };

  /* ------------------------------- derived ------------------------------ */
  const slots = detail.data?.slots ?? [];
  const openSlots = slots.filter((s) => s.status === "open" && s.booked < s.capacity);

  /* ================================ render =============================== */

  return (
    <div>
      <StaffPageHeader
        eyebrow="Quản trị · tuyển dụng"
        title="Vòng tuyển dụng"
        sub="Đợt tuyển, khung giờ phỏng vấn và hồ sơ ứng viên — tất cả trong một sổ tay."
        icon={VSparkles}
        actions={
          <>
            <InkBadge tone="neutral" className="tabular">
              {rounds.data?.length ?? 0} đợt
            </InkBadge>
            <InkButton variant="royal" size="sm" onClick={() => setCreateOpen(true)}>
              <VPlus size={15} /> Tạo đợt
            </InkButton>
          </>
        }
      />

      {/* ============================ ĐỢT TUYỂN ============================ */}
      <section aria-label="Danh sách đợt tuyển" className="mb-6">
        <SketchCard hover={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ink-table min-w-[860px]">
              <thead>
                <tr>
                  <th>Đợt tuyển</th>
                  <th>Trạng thái</th>
                  <th>Mở cửa</th>
                  <th>Đóng cửa</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rounds.loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-4">
                        <div className="skeleton-pencil my-2 h-9" />
                      </td>
                    </tr>
                  ))
                ) : rounds.error ? (
                  <tr>
                    <td colSpan={5} className="p-0">
                      <SectionError message={rounds.error} onRetry={rounds.reload} />
                    </td>
                  </tr>
                ) : (rounds.data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-0">
                      <EmptyState
                        icon={VListTodo}
                        title="Chưa có đợt tuyển nào ✎"
                        note="Tạo đợt đầu tiên, mở cửa rồi thêm khung giờ phỏng vấn cho từng vai trò."
                      />
                    </td>
                  </tr>
                ) : (
                  (rounds.data ?? []).map((round) => {
                    const meta = roundStatusMeta(round.status);
                    const active = round.id === selectedRoundId;
                    return (
                      <tr key={round.id} className={cn(active && "bg-[var(--blue-mist)]")}>
                        <td>
                          <button
                            type="button"
                            onClick={() => setSelectedRoundId(round.id)}
                            className="focus-ink text-left font-bold text-[var(--ink)] underline-offset-4 hover:underline"
                          >
                            {round.name}
                          </button>
                          <p className="mt-0.5 font-mono text-[0.65rem] text-[var(--ink-soft)]">
                            {round.id.slice(0, 8)}…
                          </p>
                        </td>
                        <td>
                          <InkBadge tone={meta.tone} dot className="!text-[0.65rem]">
                            {meta.label}
                          </InkBadge>
                        </td>
                        <td className="whitespace-nowrap text-[0.8rem] tabular text-[var(--ink-soft)]">
                          {formatDateTimeVN(round.opensAt)}
                        </td>
                        <td className="whitespace-nowrap text-[0.8rem] tabular text-[var(--ink-soft)]">
                          {formatDateTimeVN(round.closesAt)}
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1.5">
                            <InkButton
                              variant={active ? "royal" : "outline"}
                              size="sm"
                              onClick={() => setSelectedRoundId(round.id)}
                            >
                              <VEye size={14} /> Chi tiết
                            </InkButton>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  aria-label={`Đổi trạng thái đợt ${round.name}`}
                                  disabled={statusBusy === round.id}
                                  className="focus-ink grid h-8 w-8 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--ink)] transition-colors hover:bg-[var(--blue-mist)] disabled:opacity-50"
                                >
                                  <VMore size={15} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="rounded-[10px_12px_10px_12px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] p-1.5 shadow-ink-3"
                              >
                                <DropdownMenuLabel className="px-2 py-1 text-[0.68rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                                  Chuyển trạng thái
                                </DropdownMenuLabel>
                                {(["draft", "open", "closed"] as const).map((status) => {
                                  const m = roundStatusMeta(status);
                                  const isCurrent = round.status === status;
                                  return (
                                    <DropdownMenuItem
                                      key={status}
                                      disabled={isCurrent}
                                      onClick={() => changeStatus(round, status)}
                                      className="cursor-pointer gap-2 rounded-[7px] px-2.5 py-2 text-[0.8rem] font-semibold focus:bg-[var(--blue-mist)] focus:text-[var(--ink)]"
                                    >
                                      {isCurrent ? <VCheck size={14} /> : <VClock size={14} />}
                                      {m.label}
                                      {isCurrent && <span className="ml-auto text-[0.65rem] text-[var(--ink-soft)]">hiện tại</span>}
                                    </DropdownMenuItem>
                                  );
                                })}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </SketchCard>
      </section>

      {/* ========================= CHI TIẾT ĐỢT ========================= */}
      {selectedRoundId && (
        <section aria-label="Chi tiết đợt tuyển" className="space-y-6">
          {detail.error ? (
            <SectionError message={detail.error} onRetry={detail.reload} />
          ) : detail.loading && !detail.data ? (
            <SketchCard hover={false} className="p-5">
              <PencilLines rows={4} />
            </SketchCard>
          ) : detail.data ? (
            <>
              {/* Thông tin đợt */}
              <SketchCard hover={false} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="eyebrow !text-[0.62rem]">Đợt đang xem</p>
                    <h2 className="mt-1 text-xl font-extrabold tracking-tight">{detail.data.name}</h2>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8rem] text-[var(--ink-soft)]">
                      <span className="inline-flex items-center gap-1">
                        <VCalendar size={14} /> {formatDateTimeVN(detail.data.opensAt)} → {formatDateTimeVN(detail.data.closesAt)}
                      </span>
                      {detail.data.createdAt && (
                        <span className="inline-flex items-center gap-1">
                          <VClock size={14} /> tạo {relativeVN(detail.data.createdAt)}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <InkBadge tone={roundStatusMeta(detail.data.status).tone} dot>
                      {roundStatusMeta(detail.data.status).label}
                    </InkBadge>
                    <InkBadge tone="neutral" className="tabular !text-[0.65rem]">
                      {slots.length} khung giờ
                    </InkBadge>
                    <InkBadge tone="neutral" className="tabular !text-[0.65rem]">
                      {applications.data?.length ?? 0} hồ sơ
                    </InkBadge>
                  </div>
                </div>
              </SketchCard>

              {/* ------------------------- Khung giờ ------------------------- */}
              <section aria-label="Khung giờ phỏng vấn">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
                  <h3 className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
                    <VCalendarCheck size={18} className="text-[var(--royal)]" /> Khung giờ phỏng vấn
                  </h3>
                  <InkButton variant="outline" size="sm" onClick={() => setSlotOpen(true)}>
                    <VPlus size={14} /> Mở khung giờ
                  </InkButton>
                </div>
                <SketchCard hover={false} className="overflow-hidden">
                  {slots.length === 0 ? (
                    <EmptyState
                      icon={VCalendarCheck}
                      title="Chưa có khung giờ nào ✎"
                      note="Mỗi vai trò (backend, frontend…) cần khung giờ riêng để ứng viên đặt lịch phỏng vấn AI."
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="ink-table min-w-[820px]">
                        <thead>
                          <tr>
                            <th>Vai trò</th>
                            <th>Thời gian</th>
                            <th>Múi giờ</th>
                            <th>Sức chứa</th>
                            <th>Trạng thái</th>
                            <th className="text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {slots.map((slot) => {
                            const meta = slotStatusMeta(slot.status);
                            const full = slot.booked >= slot.capacity;
                            return (
                              <tr key={slot.id}>
                                <td>
                                  <InkBadge tone="blue" className="!text-[0.65rem]">
                                    {slot.roleCode}
                                  </InkBadge>
                                </td>
                                <td className="whitespace-nowrap text-[0.8rem] tabular">
                                  {formatDateTimeVN(slot.startsAt)} → {formatDateTimeVN(slot.endsAt)}
                                </td>
                                <td className="whitespace-nowrap font-mono text-[0.7rem] text-[var(--ink-soft)]">
                                  {slot.timezone}
                                </td>
                                <td className="tabular text-[0.8rem]">
                                  <span className={cn("font-bold", full && "text-[var(--warning)]")}>
                                    {slot.booked}/{slot.capacity}
                                  </span>
                                </td>
                                <td>
                                  <InkBadge tone={meta.tone} dot className="!text-[0.65rem]">
                                    {meta.label}
                                  </InkBadge>
                                </td>
                                <td>
                                  <div className="flex items-center justify-end">
                                    <InkButton
                                      variant="outline"
                                      size="sm"
                                      className="!text-[var(--danger)]"
                                      onClick={() => closeSlot(slot)}
                                      disabled={slot.status !== "open" || closeSlotBusy === slot.id}
                                    >
                                      <VBan size={13} />
                                      {closeSlotBusy === slot.id ? "Đang đóng…" : "Đóng slot"}
                                    </InkButton>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </SketchCard>
              </section>

              {/* ----------------------- Hồ sơ ứng viên ----------------------- */}
              <section aria-label="Hồ sơ ứng viên">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
                  <h3 className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
                    <VUserSearch size={18} className="text-[var(--royal)]" /> Hồ sơ ứng viên
                  </h3>
                  <div className="w-full sm:w-64">
                    <div className="relative">
                      <VSearch
                        size={15}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]"
                      />
                      <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Tìm theo tên hoặc email…"
                        aria-label="Tìm hồ sơ ứng viên"
                        className="focus-ink w-full rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] py-2 pl-9 pr-3 text-sm text-[var(--ink)] outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {statusOptions.length > 1 && (
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="eyebrow !text-[0.6rem]">Trạng thái</span>
                    <ChipGroup
                      ariaLabel="Lọc hồ sơ theo trạng thái"
                      options={statusOptions}
                      value={statusFilter}
                      onChange={setStatusFilter}
                    />
                  </div>
                )}

                <SketchCard hover={false} className="overflow-hidden">
                  {applications.loading ? (
                    <div className="p-4">
                      <PencilLines rows={4} />
                    </div>
                  ) : applications.error ? (
                    <SectionError message={applications.error} onRetry={applications.reload} />
                  ) : filteredApplications.length === 0 ? (
                    <EmptyState
                      icon={VInbox}
                      title={
                        (applications.data ?? []).length === 0
                          ? "Chưa có hồ sơ nào nộp vào đợt này ✎"
                          : "Không có hồ sơ khớp bộ lọc ✎"
                      }
                      note={
                        (applications.data ?? []).length === 0
                          ? "Ứng viên nộp qua cổng công khai — hồ sở sẽ xuất hiện ở đây ngay sau khi nộp."
                          : "Thử bỏ lọc trạng thái hoặc đổi từ khóa tìm kiếm."
                      }
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="ink-table min-w-[940px]">
                        <thead>
                          <tr>
                            <th>Ứng viên</th>
                            <th>Trạng thái</th>
                            <th>Vai trò khớp</th>
                            <th>Nộp lúc</th>
                            <th className="text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredApplications.map((row) => {
                            const meta = appStatusMeta(row.status);
                            return (
                              <tr key={row.id}>
                                <td>
                                  <div className="flex items-center gap-3">
                                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--blue-mist)] text-[0.68rem] font-extrabold text-[var(--royal)]">
                                      {initialsOf(row.fullName || "?")}
                                    </span>
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-bold leading-tight">{row.fullName}</p>
                                      <p className="mt-0.5 truncate font-mono text-[0.68rem] text-[var(--ink-soft)]">
                                        {row.email ?? "—"}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <InkBadge tone={meta.tone} dot className="!text-[0.65rem]">
                                    {meta.label}
                                  </InkBadge>
                                </td>
                                <td>
                                  {row.matchedRole ? (
                                    <InkBadge tone="blue" className="!text-[0.65rem]">
                                      {row.matchedRole}
                                    </InkBadge>
                                  ) : (
                                    <span className="text-xs text-[var(--ink-soft)]">—</span>
                                  )}
                                </td>
                                <td className="whitespace-nowrap text-[0.8rem] tabular text-[var(--ink-soft)]">
                                  {row.createdAt ? relativeVN(row.createdAt) : "—"}
                                </td>
                                <td>
                                  <div className="flex items-center justify-end gap-1.5">
                                    <InkButton
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openAppDetail(row)}
                                    >
                                      <VEye size={13} /> Chi tiết
                                    </InkButton>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button
                                          type="button"
                                          aria-label={`Thao tác với hồ sơ ${row.fullName}`}
                                          className="focus-ink grid h-8 w-8 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--ink)] transition-colors hover:bg-[var(--blue-mist)]"
                                        >
                                          <VMore size={15} />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent
                                        align="end"
                                        className="rounded-[10px_12px_10px_12px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] p-1.5 shadow-ink-3"
                                      >
                                        <DropdownMenuItem
                                          onClick={() => downloadCv(row)}
                                          disabled={actionBusy === `${row.id}:cv`}
                                          className="cursor-pointer gap-2 rounded-[7px] px-2.5 py-2 text-[0.8rem] font-semibold focus:bg-[var(--blue-mist)] focus:text-[var(--ink)]"
                                        >
                                          <VDownload /> Tải CV
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => retryAnalysis(row)}
                                          disabled={actionBusy === `${row.id}:retry`}
                                          className="cursor-pointer gap-2 rounded-[7px] px-2.5 py-2 text-[0.8rem] font-semibold focus:bg-[var(--blue-mist)] focus:text-[var(--ink)]"
                                        >
                                          <VRefresh /> Phân tích lại CV
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => resendCredentials(row)}
                                          disabled={actionBusy === `${row.id}:resend`}
                                          className="cursor-pointer gap-2 rounded-[7px] px-2.5 py-2 text-[0.8rem] font-semibold focus:bg-[var(--blue-mist)] focus:text-[var(--ink)]"
                                        >
                                          <VSend /> Gửi lại chứng danh
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="my-1 border-t border-dashed border-[color-mix(in_srgb,var(--ink)_25%,transparent)]" />
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setRescheduleSlotId("");
                                            setRescheduleApp(row);
                                          }}
                                          disabled={openSlots.length === 0}
                                          className="cursor-pointer gap-2 rounded-[7px] px-2.5 py-2 text-[0.8rem] font-semibold focus:bg-[var(--blue-mist)] focus:text-[var(--ink)]"
                                        >
                                          <VCalendarCheck /> Đổi lịch phỏng vấn
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setRetakeSlotId("");
                                            setRetakeReason("");
                                            setRetakeApp(row);
                                          }}
                                          disabled={openSlots.length === 0}
                                          className="cursor-pointer gap-2 rounded-[7px] px-2.5 py-2 text-[0.8rem] font-semibold focus:bg-[var(--blue-mist)] focus:text-[var(--ink)]"
                                        >
                                          <VPlay /> Đặt thi lại
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setRecoverSlotId("");
                                            setRecoverPreview(null);
                                            setRecoverReason("");
                                            setRecoverApp(row);
                                          }}
                                          className="cursor-pointer gap-2 rounded-[7px] px-2.5 py-2 text-[0.8rem] font-semibold focus:bg-[var(--blue-mist)] focus:text-[var(--ink)]"
                                        >
                                          <VKey /> Khôi phục chứng danh
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="my-1 border-t border-dashed border-[color-mix(in_srgb,var(--ink)_25%,transparent)]" />
                                        <DropdownMenuItem
                                          onClick={() => setCancelApp(row)}
                                          variant="destructive"
                                          className="cursor-pointer gap-2 rounded-[7px] px-2.5 py-2 text-[0.8rem] font-semibold focus:bg-[var(--blue-mist)] focus:text-[var(--ink)]"
                                        >
                                          <VBan /> Hủy hồ sơ
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </SketchCard>
              </section>

              {/* Ghi chú nghiệp vụ */}
              <div className="max-w-xl">
                <NoteCard tone="yellow" title="Trình tự nhỏ nhưng cần đúng">
                  Đợt ở <b>Nháp</b> không hiện ở cổng ứng tuyển. Mở cửa đợt khi đã đủ khung giờ cho
                  từng vai trò — ứng viên chỉ đặt được lịch vào slot còn chỗ.
                </NoteCard>
              </div>
            </>
          ) : null}
        </section>
      )}

      {/*
       * DIALOGS
       * ------------------------------------------------------------------ */}

      {/* Tạo đợt tuyển */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold">Tạo đợt tuyển mới</DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Đợt mới khởi tạo ở trạng thái Nháp — mở cửa khi sẵn sàng nhận hồ sơ.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="round-name" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                Tên đợt (tối thiểu 3 ký tự)
              </label>
              <SketchInput
                id="round-name"
                value={roundForm.name}
                onChange={(e) => setRoundForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="VD: Đợt thực tập Xuân 2027"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="round-opens" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                  Mở cửa
                </label>
                <SketchInput
                  id="round-opens"
                  type="datetime-local"
                  value={roundForm.opensAt}
                  onChange={(e) => setRoundForm((f) => ({ ...f, opensAt: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="round-closes" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                  Đóng cửa
                </label>
                <SketchInput
                  id="round-closes"
                  type="datetime-local"
                  value={roundForm.closesAt}
                  onChange={(e) => setRoundForm((f) => ({ ...f, closesAt: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setCreateOpen(false)} disabled={roundBusy}>
              Hủy
            </InkButton>
            <InkButton variant="royal" size="sm" onClick={submitCreateRound} disabled={roundBusy}>
              <VPlus size={14} /> {roundBusy ? "Đang tạo…" : "Tạo đợt"}
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tạo khung giờ */}
      <Dialog open={slotOpen} onOpenChange={setSlotOpen}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold">Mở khung giờ phỏng vấn</DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Khung giờ gắn với một vai trò — ứng viên đặt lịch theo sức chứa còn lại.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="slot-role" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                Vai trò
              </label>
              <select
                id="slot-role"
                value={slotForm.roleCode}
                onChange={(e) => setSlotForm((f) => ({ ...f, roleCode: e.target.value }))}
                className="focus-ink w-full rounded-[9px_11px_10px_12px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] outline-none"
              >
                <option value="">— Chọn vai trò —</option>
                {(roles.data ?? []).map((role) => (
                  <option key={role.code} value={role.code}>
                    {role.label} ({role.code})
                  </option>
                ))}
                {slotForm.roleCode && !(roles.data ?? []).some((r) => r.code === slotForm.roleCode) && (
                  <option value={slotForm.roleCode}>{slotForm.roleCode}</option>
                )}
              </select>
              {roles.error && (
                <p className="mt-1 text-[0.7rem] text-[var(--ink-soft)]">
                  Không tải được danh sách vai trò — vẫn nhập tay được phía BE.
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="slot-starts" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                  Bắt đầu
                </label>
                <SketchInput
                  id="slot-starts"
                  type="datetime-local"
                  value={slotForm.startsAt}
                  onChange={(e) => setSlotForm((f) => ({ ...f, startsAt: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="slot-ends" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                  Kết thúc
                </label>
                <SketchInput
                  id="slot-ends"
                  type="datetime-local"
                  value={slotForm.endsAt}
                  onChange={(e) => setSlotForm((f) => ({ ...f, endsAt: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="slot-tz" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                  Múi giờ
                </label>
                <SketchInput
                  id="slot-tz"
                  value={slotForm.timezone}
                  onChange={(e) => setSlotForm((f) => ({ ...f, timezone: e.target.value }))}
                  placeholder="Asia/Ho_Chi_Minh"
                  className="font-mono text-[0.78rem]"
                />
              </div>
              <div>
                <label htmlFor="slot-capacity" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                  Sức chứa (1–100)
                </label>
                <SketchInput
                  id="slot-capacity"
                  type="number"
                  min={1}
                  max={100}
                  value={slotForm.capacity}
                  onChange={(e) => setSlotForm((f) => ({ ...f, capacity: e.target.value }))}
                  className="tabular"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setSlotOpen(false)} disabled={slotBusy}>
              Hủy
            </InkButton>
            <InkButton variant="royal" size="sm" onClick={submitCreateSlot} disabled={slotBusy}>
              <VPlus size={14} /> {slotBusy ? "Đang mở…" : "Mở khung giờ"}
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chi tiết hồ sơ ứng viên */}
      <Dialog open={!!appDetailId} onOpenChange={(open) => !open && setAppDetailId(null)}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-extrabold">Hồ sơ ứng viên</DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Dòng thời gian, lịch hẹn và kết quả phân tích CV mới nhất.
            </DialogDescription>
          </DialogHeader>
          {appDetailLoading || !appDetail ? (
            <PencilLines rows={4} />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3.5 rounded-[12px] border-2 border-[var(--ink)] bg-[var(--paper)] p-3.5">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--blue-mist)] text-sm font-extrabold text-[var(--royal)]">
                  {initialsOf(appDetail.fullName || "?")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold">{appDetail.fullName || "—"}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <InkBadge tone={appStatusMeta(appDetail.status).tone} dot className="!text-[0.62rem]">
                      {appStatusMeta(appDetail.status).label}
                    </InkBadge>
                    {appDetail.matchedRole && (
                      <InkBadge tone="blue" className="!text-[0.62rem]">
                        {appDetail.matchedRole}
                      </InkBadge>
                    )}
                    {appDetail.hasCv && (
                      <InkBadge tone="mint" className="!text-[0.62rem]">
                        Có CV
                      </InkBadge>
                    )}
                  </div>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-3">
                <div className="rounded-[10px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)] p-3">
                  <dt className="text-[0.62rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]">Phiên bản hồ sơ</dt>
                  <dd className="mt-1 tabular text-sm font-bold">{appDetail.revision ?? "—"}</dd>
                </div>
                <div className="rounded-[10px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)] p-3">
                  <dt className="text-[0.62rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]">Phân tích CV</dt>
                  <dd className="mt-1 text-sm font-bold">
                    {appDetail.analysisFactsPresent ? (
                      <span className="inline-flex items-center gap-1 text-[var(--success)]">
                        <VBadgeCheck size={14} /> Đã có
                      </span>
                    ) : (
                      <span className="text-[var(--ink-soft)]">Chưa có</span>
                    )}
                  </dd>
                </div>
              </dl>

              {appDetail.booking && (
                <div className="rounded-[10px_12px_9px_11px] border-2 border-[var(--ink)] bg-[var(--paper)] p-3.5">
                  <p className="eyebrow !text-[0.62rem]">Lịch phỏng vấn hiện tại</p>
                  <p className="mt-1.5 text-sm font-bold">
                    {appDetail.booking.startsAt ? formatDateTimeVN(appDetail.booking.startsAt) : "—"}
                    {appDetail.booking.endsAt ? ` → ${formatDateTimeVN(appDetail.booking.endsAt)}` : ""}
                  </p>
                  <p className="mt-0.5 text-[0.72rem] text-[var(--ink-soft)]">
                    {[appDetail.booking.roleCode, appDetail.booking.timezone].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
              )}

              <div>
                <p className="eyebrow !text-[0.62rem]">Dòng thời gian</p>
                {appDetail.timeline.length === 0 ? (
                  <p className="mt-2 text-sm text-[var(--ink-soft)]">Chưa có sự kiện nào.</p>
                ) : (
                  <ol className="mt-2 max-h-60 space-y-2 overflow-y-auto pr-1">
                    {appDetail.timeline
                      .slice()
                      .reverse()
                      .map((entry, i) => (
                        <li
                          key={`${entry.createdAt}-${i}`}
                          className="rounded-[9px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)] bg-[var(--paper)] p-2.5"
                        >
                          <p className="text-[0.8rem] font-semibold leading-snug">{entry.message}</p>
                          <p className="mt-0.5 text-[0.66rem] tabular text-[var(--ink-soft)]">
                            {entry.createdAt ? formatDateTimeVN(entry.createdAt) : ""}
                            {entry.kind ? ` · ${entry.kind}` : ""}
                          </p>
                        </li>
                      ))}
                  </ol>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <InkButton
              variant="outline"
              size="sm"
              onClick={() => {
                const row = (applications.data ?? []).find((r) => r.id === appDetailId);
                if (row) downloadCv(row);
              }}
            >
              <VDownload size={14} /> Tải CV
            </InkButton>
            <InkButton variant="ghost" size="sm" onClick={() => setAppDetailId(null)}>
              Đóng
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hủy hồ sơ */}
      <Dialog open={!!cancelApp} onOpenChange={(open) => !open && setCancelApp(null)}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold">Hủy hồ sơ này?</DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Hồ sơ của <b>{cancelApp?.fullName}</b> và lịch phỏng vấn liên quan sẽ bị hủy. Email chưa
              gửi của lịch cũ bị vô hiệu. Thao tác không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setCancelApp(null)} disabled={cancelBusy}>
              Giữ lại
            </InkButton>
            <InkButton
              variant="outline"
              size="sm"
              className="!border-[var(--danger)] !text-[var(--danger)]"
              onClick={confirmCancel}
              disabled={cancelBusy}
            >
              <VBan size={14} /> {cancelBusy ? "Đang hủy…" : "Hủy hồ sơ"}
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Đổi lịch phỏng vấn */}
      <Dialog open={!!rescheduleApp} onOpenChange={(open) => !open && setRescheduleApp(null)}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold">Đổi lịch phỏng vấn</DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Chuyển <b>{rescheduleApp?.fullName}</b> sang khung giờ khác (chỉ hiện slot còn chỗ).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="reschedule-slot" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                Khung giờ đích
              </label>
              <select
                id="reschedule-slot"
                value={rescheduleSlotId}
                onChange={(e) => setRescheduleSlotId(e.target.value)}
                className="focus-ink w-full rounded-[9px_11px_10px_12px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] outline-none"
              >
                <option value="">— Chọn khung giờ —</option>
                {openSlots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.roleCode} · {formatDateTimeVN(slot.startsAt)} ({slot.capacity - slot.booked} chỗ)
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setRescheduleApp(null)} disabled={rescheduleBusy}>
              Hủy
            </InkButton>
            <InkButton variant="royal" size="sm" onClick={submitReschedule} disabled={rescheduleBusy}>
              <VCalendarCheck size={14} /> {rescheduleBusy ? "Đang chuyển…" : "Chuyển lịch"}
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Đặt thi lại */}
      <Dialog open={!!retakeApp} onOpenChange={(open) => !open && setRetakeApp(null)}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold">Đặt lịch thi lại</DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Cho phép <b>{retakeApp?.fullName}</b> làm vòng phỏng vấn tiếp theo. Lý do (≥ 10 ký tự)
              sẽ lưu kèm để đối chiếu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="retake-reason" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                Lý do cho phép thi lại
              </label>
              <SketchTextarea
                id="retake-reason"
                rows={3}
                value={retakeReason}
                onChange={(e) => setRetakeReason(e.target.value)}
                placeholder="VD: Mất kết nối mạng giữa chừng vòng phỏng vấn ngày…"
              />
              <p className="mt-1 text-[0.68rem] tabular text-[var(--ink-soft)]">
                {retakeReason.trim().length}/10 ký tự tối thiểu
              </p>
            </div>
            <div>
              <label htmlFor="retake-slot" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                Khung giờ thi lại
              </label>
              <select
                id="retake-slot"
                value={retakeSlotId}
                onChange={(e) => setRetakeSlotId(e.target.value)}
                className="focus-ink w-full rounded-[9px_11px_10px_12px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] outline-none"
              >
                <option value="">— Chọn khung giờ —</option>
                {openSlots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.roleCode} · {formatDateTimeVN(slot.startsAt)} ({slot.capacity - slot.booked} chỗ)
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setRetakeApp(null)} disabled={retakeBusy}>
              Hủy
            </InkButton>
            <InkButton variant="royal" size="sm" onClick={submitRetake} disabled={retakeBusy}>
              <VPlay size={14} /> {retakeBusy ? "Đang đặt…" : "Đặt thi lại"}
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Khôi phục chứng danh */}
      <Dialog open={!!recoverApp} onOpenChange={(open) => !open && setRecoverApp(null)}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold">Khôi phục chứng danh phỏng vấn</DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Cấp lại email/mật khẩu đăng nhập phỏng vấn cho <b>{recoverApp?.fullName}</b>. Xem trước
              trạng thái theo khung giờ trước khi xác nhận.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="recover-slot" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                Khung giờ của lịch cần khôi phục
              </label>
              <select
                id="recover-slot"
                value={recoverSlotId}
                onChange={(e) => {
                  setRecoverSlotId(e.target.value);
                  setRecoverPreview(null);
                }}
                className="focus-ink w-full rounded-[9px_11px_10px_12px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] outline-none"
              >
                <option value="">— Chọn khung giờ —</option>
                {slots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.roleCode} · {formatDateTimeVN(slot.startsAt)} · {slotStatusMeta(slot.status).label}
                  </option>
                ))}
              </select>
            </div>

            <InkButton
              variant="outline"
              size="sm"
              onClick={loadRecoverPreview}
              disabled={!recoverSlotId || recoverPreviewBusy}
            >
              <VEye size={14} /> {recoverPreviewBusy ? "Đang xem trước…" : "Xem trước khả năng khôi phục"}
            </InkButton>

            {recoverPreview && (
              <div
                className={cn(
                  "rounded-[10px_12px_9px_11px] border-2 p-3.5 text-[0.8rem]",
                  recoverPreview.allowed
                    ? "border-[var(--success)] bg-[color-mix(in_srgb,var(--success)_8%,transparent)]"
                    : "border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)]",
                )}
                role="status"
              >
                <p className="font-bold">
                  {recoverPreview.allowed ? "Có thể khôi phục" : "Chưa khôi phục được"}
                </p>
                <p className="mt-1 leading-relaxed text-[var(--ink)]">{recoverPreview.message || "—"}</p>
                {recoverPreview.expiresAt && (
                  <p className="mt-1 text-[0.7rem] tabular text-[var(--ink-soft)]">
                    Thông tin hiệu lực tới {formatDateTimeVN(recoverPreview.expiresAt)}
                  </p>
                )}
              </div>
            )}

            {recoverPreview?.allowed && (
              <div>
                <label htmlFor="recover-reason" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                  Lý do khôi phục (≥ 10 ký tự)
                </label>
                <SketchTextarea
                  id="recover-reason"
                  rows={3}
                  value={recoverReason}
                  onChange={(e) => setRecoverReason(e.target.value)}
                  placeholder="VD: Ứng viên báo mất email chứng danh sau khi đổi máy…"
                />
                <p className="mt-1 text-[0.68rem] tabular text-[var(--ink-soft)]">
                  {recoverReason.trim().length}/10 ký tự tối thiểu
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setRecoverApp(null)} disabled={recoverBusy}>
              Đóng
            </InkButton>
            <InkButton
              variant="royal"
              size="sm"
              onClick={submitRecover}
              disabled={!recoverPreview?.allowed || recoverBusy}
            >
              <VKey size={14} /> {recoverBusy ? "Đang cấp lại…" : "Cấp lại chứng danh"}
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
