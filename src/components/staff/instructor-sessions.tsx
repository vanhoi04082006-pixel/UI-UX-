"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  VBan,
  VCalendar,
  VChartColumn,
  VCheck,
  VClipboardCheck,
  VClock,
  VFlag,
  VGraduation,
  VHourglass,
  VKanban,
  VPlus,
  VStopwatch,
  VUsers,
} from "@/components/icons/v-icons";
import { FadeIn, InkButton, Stagger, StaggerItem } from "@/components/notebook/reveal";
import { InkBadge, MarginNote, SketchCard, Tape, formatDateVN } from "@/components/notebook/ui";
import {
  AvatarStack,
  CodeChip,
  EmptyState,
  ErrorState,
  FilterChips,
  MiniBar,
  PageHeading,
  SkeletonBlock,
  initialsOf,
} from "@/components/staff/instructor-shared";
import { useApp } from "@/lib/store";
import { useApi } from "@/lib/use-api";
import { completeAssignment, listSessions, transitionSessionStatus } from "@/lib/api/instructor";
import { staffApiErrorMessage } from "@/components/staff/staff-api";
import { sessionStatusLabel } from "@/lib/mock/data";
import type { InstructorSession, SessionMember, SessionStatus } from "@/lib/mock/types";

/* =====================================================================
 * PHIÊN THỰC TẬP — quản lý các phiên đang mở / đã kết thúc.
 * Codex đồng bộ: trạng thái ending + cancelled, hành động vòng đời
 * phiên (SessionLifecycleActions) và hoàn thành phân công
 * (AssignmentCompletion) ngay trong hộp thoại chi tiết.
 * ===================================================================== */

type SessionFilter = "all" | "active" | "upcoming" | "ending" | "closed" | "cancelled";
type BusyAction = "ending" | "closed" | "cancelled" | "assignment";

const MEMBER_ROLES = ["Frontend", "Backend", "QA", "Tài liệu", "DevOps", "Thiết kế"];

/** Màu tem theo trạng thái — ending vàng hổ phách, cancelled đỏ mực. */
const STATUS_TONE: Record<SessionStatus, string> = {
  active: "green",
  upcoming: "blue",
  ending: "amber",
  closed: "neutral",
  cancelled: "red",
};

const FILTER_KEYS: SessionFilter[] = ["active", "upcoming", "ending", "closed", "cancelled"];

interface MemberRow {
  name: string;
  email: string;
  role: string;
  assignmentStatus: SessionMember["assignmentStatus"];
}

/** Thành viên lấy từ memberDetails (email + trạng thái phân công), thiếu thì fallback memberNames. */
function memberRowsOf(session: InstructorSession): MemberRow[] {
  const details: SessionMember[] =
    session.memberDetails.length > 0
      ? session.memberDetails
      : session.memberNames.map((name) => ({
          name,
          email: "",
          assignmentStatus: "active" as const,
        }));
  return details.map((m, i) => ({
    name: m.name,
    email: m.email,
    assignmentStatus: m.assignmentStatus,
    role: MEMBER_ROLES[i % MEMBER_ROLES.length],
  }));
}

export default function InstructorSessions() {
  const navigate = useApp((s) => s.navigate);
  const { data, loading, error, reload } = useApi<InstructorSession[]>(listSessions);

  const [filter, setFilter] = useState<SessionFilter>("all");
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const [form, setForm] = useState({ project: "", start: "", desc: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [creatingBusy, setCreatingBusy] = useState(false);

  /* ---- Vòng đời phiên + hoàn thành phân công (codex đồng bộ) ---- */
  const [busyAction, setBusyAction] = useState<BusyAction | null>(null);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);
  const [confirmTransition, setConfirmTransition] = useState<{
    session: InstructorSession;
    next: Extract<SessionStatus, "closed" | "cancelled">;
  } | null>(null);
  const [assignmentTarget, setAssignmentTarget] = useState<{
    session: InstructorSession;
    member: SessionMember;
  } | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  /** Gói confetti bung khi tạo phiên thành công (JS thêm class `play`). */
  const burstRef = useRef<HTMLSpanElement>(null);
  const createTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (createTimer.current) clearTimeout(createTimer.current);
    };
  }, []);

  const [extra, setExtra] = useState<InstructorSession[]>([]);

  const sessions = useMemo(() => [...extra, ...(data ?? [])], [extra, data]);
  const filtered = useMemo(
    () => (filter === "all" ? sessions : sessions.filter((s) => s.status === filter)),
    [filter, sessions],
  );
  const detail = sessions.find((s) => s.id === detailId) ?? null;
  const detailRows = useMemo(() => (detail ? memberRowsOf(detail) : []), [detail]);
  const memberSummary = useMemo(() => {
    const done = detailRows.filter((m) => m.assignmentStatus === "completed").length;
    const active = detailRows.filter((m) => m.assignmentStatus === "active").length;
    return { done, active, total: detailRows.length };
  }, [detailRows]);
  const busy = busyAction !== null;

  function openCreate() {
    setForm({ project: "", start: "", desc: "" });
    setFormError(null);
    setCreating(true);
  }

  function submitCreate() {
    if (!form.project.trim()) {
      setFormError("Bạn chưa điền tên dự án.");
      return;
    }
    if (!form.start) {
      setFormError("Chọn ngày bắt đầu cho phiên nhé.");
      return;
    }
    setFormError(null);
    setCreatingBusy(true);
    burstRef.current?.classList.add("play");
    // Giữ hộp thoại thêm chốc lát để trông thấy confetti + tem sáng tạo.
    createTimer.current = setTimeout(() => {
      const seq = sessions.filter((s) => s.code.startsWith("SS-2026")).length + 3;
      const end = new Date(form.start);
      end.setDate(end.getDate() + 84);
      setExtra((prev) => [
        {
          id: `local-${Date.now()}`,
          code: `SS-2026-${String(seq).padStart(2, "0")}`,
          project: form.project.trim(),
          members: 0,
          memberNames: [],
          memberDetails: [],
          sprint: "Chưa mở sprint",
          sprintStatus: "Đang chuẩn bị",
          progress: 0,
          startDate: new Date(form.start).toISOString(),
          endDate: end.toISOString(),
          status: "upcoming" as const,
        },
        ...prev,
      ]);
      burstRef.current?.classList.remove("play");
      setCreating(false);
      setCreatingBusy(false);
      toast.success("Đã tạo phiên (mô phỏng)");
    }, 700);
  }

  /** Chuyển trạng thái phiên qua adapter contract — ending đi thẳng, closed/cancelled đã có modal xác nhận. */
  async function runTransition(session: InstructorSession, next: "ending" | "closed" | "cancelled") {
    setBusyAction(next);
    setLifecycleError(null);
    try {
      await transitionSessionStatus(session.id, next);
      setConfirmTransition(null);
      reload();
      toast.success(
        next === "ending"
          ? `Đã chuyển ${session.code} sang Sắp kết thúc`
          : next === "closed"
            ? `Phiên ${session.code} đã hoàn thành — lịch sử được giữ lại`
            : `Đã hủy phiên ${session.code} — lịch sử được giữ lại`,
      );
    } catch (err) {
      setLifecycleError(staffApiErrorMessage(err, "Không đổi được trạng thái phiên."));
    } finally {
      setBusyAction(null);
    }
  }

  /** Chốt phân công của một thành viên — sinh viên có thể được giao vào phiên khác. */
  async function runAssignmentComplete(session: InstructorSession, member: SessionMember) {
    setBusyAction("assignment");
    setAssignmentError(null);
    try {
      await completeAssignment(session.id);
      setAssignmentTarget(null);
      reload();
      toast.success(`Đã hoàn thành phân công của ${member.name}`);
    } catch (err) {
      setAssignmentError(staffApiErrorMessage(err, "Không hoàn tất được phân công."));
    } finally {
      setBusyAction(null);
    }
  }

  if (error) {
    return (
      <div className="space-y-5">
        <PageHeading eyebrow="Sổ tay hành trình · Giảng viên" title="Phiên thực tập" />
        <ErrorState message={error} onRetry={reload} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeading eyebrow="Sổ tay hành trình · Giảng viên" title="Phiên thực tập">
        <InkButton variant="royal" size="sm" onClick={openCreate}>
          <VPlus size={16} /> Mở phiên mới
        </InkButton>
      </PageHeading>

      <FilterChips<SessionFilter>
        ariaLabel="Lọc phiên theo trạng thái"
        value={filter}
        onChange={setFilter}
        options={[
          { key: "all", label: "Tất cả", count: sessions.length },
          ...FILTER_KEYS.map((key) => ({
            key,
            label: sessionStatusLabel(key as SessionStatus),
            count: sessions.filter((s) => s.status === key).length,
          })),
        ]}
      />

      {loading && !data ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-64" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={VKanban}
          title="Chưa có phiên nào ở đây"
          hint="Đổi bộ lọc hoặc mở phiên mới để bắt đầu một hành trình thực tập."
        />
      ) : (
        <Stagger className="grid gap-5 lg:grid-cols-2">
          {filtered.map((s) => {
            const daysToStart = Math.max(
              0,
              Math.ceil((new Date(s.startDate).getTime() - Date.now()) / 86_400_000),
            );
            const daysToEnd = Math.max(
              0,
              Math.ceil((new Date(s.endDate).getTime() - Date.now()) / 86_400_000),
            );
            const shownMembers = s.memberNames.slice(0, 5);
            const restMembers = s.memberNames.length - shownMembers.length;
            const isLocal = s.id.startsWith("local-");
            return (
              <StaggerItem key={s.id} className="h-full">
                <SketchCard
                  as="article"
                  className={`relative card-tilt flex h-full flex-col p-4 sm:p-5 ${
                    isLocal ? "animate-pop-in" : ""
                  } ${s.status === "cancelled" ? "opacity-75" : s.status === "closed" ? "opacity-80" : ""}`}
                >
                  {/* Băng dính: phiên sắp mở dán băng hổ phách nhắc lịch */}
                  {s.status === "upcoming" && (
                    <Tape variant="warm" rotate={-4} className="-top-3 left-7 !w-16 !h-5" />
                  )}
                  {/* Băng dính vàng son — phiên sắp kết thúc cần chốt quân */}
                  {s.status === "ending" && (
                    <Tape variant="warm" rotate={-4} className="tape-gold -top-3 left-7 !w-16 !h-5" />
                  )}
                  {/* Tem xám nghiêng — phiên đã hủy vẫn giữ lịch sử */}
                  {s.status === "cancelled" && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute right-3 top-6 rotate-[9deg] rounded-full border-[2.5px] border-[color-mix(in_srgb,var(--ink)_50%,transparent)] px-3 py-0.5 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--ink)_50%,transparent)]"
                    >
                      Đã hủy
                    </span>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <CodeChip className="!text-[0.72rem]">{s.code}</CodeChip>
                    {s.status === "active" ? (
                      <InkBadge tone={STATUS_TONE[s.status]}>
                        <span aria-hidden="true" className="ws-dot-live" />
                        {sessionStatusLabel(s.status)}
                      </InkBadge>
                    ) : (
                      <InkBadge tone={STATUS_TONE[s.status]} dot>
                        {sessionStatusLabel(s.status)}
                      </InkBadge>
                    )}
                    <span className="ml-auto flex items-center gap-1 font-geist-mono text-[0.66rem] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                      {(s.status === "closed" || s.status === "cancelled") && (
                        <VClock size={13} aria-hidden="true" />
                      )}
                      {s.members} SV
                    </span>
                  </div>

                  <h2 className="mt-2.5 text-[1.05rem] font-bold leading-snug">{s.project}</h2>

                  {s.status === "upcoming" && (
                    <p className="mt-1 flex items-center gap-1.5 font-hand text-[0.95rem] text-[var(--warning)]">
                      <VStopwatch size={14} aria-hidden="true" />
                      bắt đầu sau {daysToStart} ngày
                    </p>
                  )}
                  {s.status === "ending" && (
                    <p className="mt-1 flex items-center gap-1.5 font-hand text-[0.95rem] text-[var(--warning)]">
                      <VHourglass size={14} aria-hidden="true" />
                      còn {daysToEnd} ngày là khép lại
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <InkBadge tone="blue">{s.sprint}</InkBadge>
                    <span className="text-[0.74rem] text-[var(--ink-soft)]">{s.sprintStatus}</span>
                  </div>

                  <div className="mt-3.5">
                    <div className="mb-1 flex items-center justify-between text-[0.72rem] font-bold">
                      <span className="text-[var(--ink-soft)]">Tiến độ</span>
                      <span className="tabular">{s.progress}%</span>
                    </div>
                    <MiniBar
                      value={s.progress}
                      tone={
                        s.status === "closed"
                          ? "success"
                          : s.status === "cancelled"
                            ? "danger"
                            : "royal"
                      }
                      label={`Tiến độ ${s.code}`}
                    />
                  </div>

                  <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.72rem] text-[var(--ink-soft)] tabular">
                    <span className="inline-flex items-center gap-1.5">
                      <VCalendar size={14} />
                      {formatDateVN(s.startDate)} → {formatDateVN(s.endDate)}
                    </span>
                    {s.memberNames.length > 0 && <AvatarStack names={s.memberNames} max={5} size={24} />}
                  </div>

                  {s.memberNames.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {shownMembers.map((n, i) => (
                        <li
                          key={n}
                          className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[color-mix(in_srgb,var(--ink)_28%,transparent)] bg-[var(--paper)] px-2 py-0.5 text-[0.68rem] font-semibold"
                        >
                          <span
                            aria-hidden="true"
                            className="grid h-4 w-4 place-items-center rounded-full bg-[var(--blue-mist)] text-[0.5rem] font-bold text-[var(--royal)]"
                          >
                            {initialsOf(n)}
                          </span>
                          {n}
                          <span className="sr-only">— vai trò {MEMBER_ROLES[i % MEMBER_ROLES.length]}</span>
                        </li>
                      ))}
                      {restMembers > 0 && (
                        <li
                          title={`Còn lại: ${s.memberNames.slice(5).join(", ")}`}
                          className="inline-flex items-center rounded-full border-[1.5px] border-dashed border-[color-mix(in_srgb,var(--ink)_35%,transparent)] bg-[var(--paper)] px-2 py-0.5 text-[0.68rem] font-bold text-[var(--ink-soft)]"
                        >
                          +{restMembers} nữa
                        </li>
                      )}
                    </ul>
                  )}
                  {s.memberNames.length === 0 && (
                    <p className="mt-3 font-hand text-[0.95rem] text-[var(--ink-soft)]">
                      Chưa có sinh viên nào tham gia — mời sinh viên vào phiên nhé.
                    </p>
                  )}

                  <div className="mt-auto flex flex-wrap items-center gap-2.5 pt-4">
                    <InkButton variant="outline" size="sm" onClick={() => setDetailId(s.id)}>
                      Chi tiết
                    </InkButton>
                    {s.status === "closed" && (
                      <button type="button" onClick={() => navigate("reports")} className="link-chip focus-ink">
                        <VChartColumn size={13} aria-hidden="true" />
                        Xem báo cáo
                      </button>
                    )}
                  </div>
                </SketchCard>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}

      {/* ===== Dialog mở phiên mới ===== */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mở phiên thực tập mới</DialogTitle>
            <DialogDescription>
              Phiên mới sẽ ở trạng thái Sắp mở cho tới khi bạn kích hoạt sprint đầu tiên.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ss-project">Tên dự án</Label>
              <Input
                id="ss-project"
                value={form.project}
                onChange={(e) => setForm((f) => ({ ...f, project: e.target.value }))}
                placeholder="VD: Cổng thông tin thực tập số"
                className="focus-ink"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ss-start">Ngày bắt đầu</Label>
              <Input
                id="ss-start"
                type="date"
                value={form.start}
                onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
                className="focus-ink"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ss-desc">Mô tả</Label>
              <Textarea
                id="ss-desc"
                value={form.desc}
                onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
                placeholder="Mục tiêu, phạm vi, kỹ năng sinh viên cần..."
                rows={3}
                className="focus-ink resize-none"
              />
            </div>
            {formError && (
              <p key={formError} role="alert" className="animate-shake-ink text-[0.8rem] font-semibold text-[var(--danger)]">
                {formError}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2.5 pt-1">
              <InkButton variant="ghost" size="sm" onClick={() => setCreating(false)} disabled={creatingBusy}>
                Huỷ
              </InkButton>
              <span ref={burstRef} className="confetti-pop relative inline-flex">
                <InkButton variant="royal" size="sm" onClick={submitCreate} disabled={creatingBusy}>
                  <VPlus size={15} /> {creatingBusy ? "Đang mở phiên…" : "Tạo phiên"}
                </InkButton>
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog chi tiết phiên ===== */}
      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {detail && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CodeChip className="!text-[0.72rem]">{detail.code}</CodeChip>
                  <InkBadge tone={STATUS_TONE[detail.status]} dot>
                    {sessionStatusLabel(detail.status)}
                  </InkBadge>
                </div>
                <DialogTitle className="mt-1.5">{detail.project}</DialogTitle>
                <DialogDescription>
                  {formatDateVN(detail.startDate)} → {formatDateVN(detail.endDate)} · {detail.members} sinh viên
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap items-center gap-2">
                <InkBadge tone="blue">{detail.sprint}</InkBadge>
                <span className="text-[0.78rem] text-[var(--ink-soft)]">{detail.sprintStatus}</span>
                <span className="ml-auto text-[0.78rem] font-bold tabular">Tiến độ {detail.progress}%</span>
              </div>
              <MiniBar
                value={detail.progress}
                tone={detail.status === "closed" ? "success" : "royal"}
                label={`Tiến độ ${detail.code}`}
              />

              {/* ===== Hành động vòng đời phiên (codex: SessionLifecycleActions) ===== */}
              {(detail.status === "active" ||
                detail.status === "ending" ||
                detail.status === "upcoming") && (
                <section
                  aria-label="Hành động vòng đời phiên"
                  className="sketch-border-thin space-y-2.5 bg-[var(--paper)] p-3"
                >
                  <p className="eyebrow">Vòng đời phiên</p>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {detail.status === "active" && (
                      <InkButton
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => runTransition(detail, "ending")}
                        aria-label={`Chuyển phiên ${detail.code} sang Sắp kết thúc`}
                      >
                        <VHourglass size={15} />
                        {busyAction === "ending" ? "Đang xử lý…" : "Chuyển sang Sắp kết thúc"}
                      </InkButton>
                    )}
                    {(detail.status === "active" || detail.status === "ending") && (
                      <InkButton
                        variant="royal"
                        size="sm"
                        disabled={busy}
                        onClick={() => setConfirmTransition({ session: detail, next: "closed" })}
                        aria-label={`Hoàn thành phiên ${detail.code}`}
                      >
                        <VFlag size={15} /> Hoàn thành phiên
                      </InkButton>
                    )}
                    <InkButton
                      variant="coal"
                      size="sm"
                      disabled={busy}
                      onClick={() => setConfirmTransition({ session: detail, next: "cancelled" })}
                      aria-label={`Hủy phiên ${detail.code}`}
                    >
                      <VBan size={15} /> Hủy phiên
                    </InkButton>
                  </div>
                  {lifecycleError && (
                    <p
                      key={lifecycleError}
                      role="alert"
                      className="animate-shake-ink text-[0.8rem] font-semibold text-[var(--danger)]"
                    >
                      {lifecycleError}
                    </p>
                  )}
                </section>
              )}

              {/* Tóm tắt nhanh trạng thái phân công trong phiên */}
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  {
                    icon: VGraduation,
                    label: "Hoàn thành",
                    value: memberSummary.done,
                    tone: "text-[var(--success)]",
                  },
                  {
                    icon: VClipboardCheck,
                    label: "Đang làm",
                    value: memberSummary.active,
                    tone: "text-[var(--royal)]",
                  },
                  {
                    icon: VUsers,
                    label: "Thành viên",
                    value: memberSummary.total,
                    tone: "text-[var(--ink)]",
                  },
                ].map((t) => (
                  <div key={t.label} className="sketch-border-thin flex items-center gap-2.5 bg-[var(--paper)] p-2.5">
                    <t.icon size={18} className={`shrink-0 ${t.tone}`} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-lg font-extrabold leading-none tabular">{t.value}</span>
                      <span className="block text-[0.66rem] font-bold uppercase tracking-[0.08em] text-[var(--ink-soft)]">
                        {t.label}
                      </span>
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-1 overflow-x-auto rounded-[10px_12px_10px_12px] border-2 border-[var(--ink)]">
                <table className="ink-table">
                  <caption className="sr-only">Danh sách thành viên phiên {detail.code}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Thành viên</th>
                      <th scope="col">Vai trò</th>
                      <th scope="col">Phân công</th>
                      <th scope="col" className="text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailRows.map((m) => {
                      const canComplete =
                        (detail.status === "active" ||
                          detail.status === "ending" ||
                          detail.status === "closed") &&
                        m.assignmentStatus === "active" &&
                        m.email !== "";
                      return (
                        <tr key={`${m.email || m.name}`}>
                          <td>
                            <span className="flex flex-col items-start gap-0.5">
                              <span className="flex items-center gap-2 font-semibold">
                                <span
                                  aria-hidden="true"
                                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-[1.5px] border-[var(--ink)] bg-[var(--blue-mist)] text-[0.58rem] font-bold text-[var(--royal)]"
                                >
                                  {initialsOf(m.name)}
                                </span>
                                {m.name}
                              </span>
                              {m.email && (
                                <span className="pl-8 font-geist-mono text-[0.64rem] text-[var(--ink-soft)]">
                                  {m.email}
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="text-[var(--ink-soft)]">{m.role}</td>
                          <td>
                            {m.assignmentStatus === "completed" ? (
                              <span className="flex items-center gap-1.5">
                                <InkBadge tone="green" dot>
                                  Phân công đã hoàn thành
                                </InkBadge>
                              </span>
                            ) : (
                              <InkBadge tone="blue" dot>
                                Đang thực hiện
                              </InkBadge>
                            )}
                          </td>
                          <td className="text-right">
                            {canComplete ? (
                              <InkButton
                                variant="outline"
                                size="sm"
                                disabled={busy}
                                onClick={() =>
                                  setAssignmentTarget({
                                    session: detail,
                                    member: {
                                      name: m.name,
                                      email: m.email,
                                      assignmentStatus: m.assignmentStatus,
                                    },
                                  })
                                }
                                aria-label={`Hoàn thành phân công của ${m.name} trong phiên ${detail.code}`}
                              >
                                <VCheck size={14} /> Hoàn thành phân công
                              </InkButton>
                            ) : (
                              <>
                                <span aria-hidden="true" className="font-hand text-[0.95rem] text-[var(--ink-faint)]">
                                  —
                                </span>
                                <span className="sr-only">Không có thao tác</span>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {detailRows.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center">
                          <span className="font-hand text-lg text-[var(--ink-soft)]">
                            Chưa có thành viên — phiên mới toanh ✎
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <MarginNote>
                trạng thái phân công lấy từ hệ thống — hoàn tất khi sinh viên đã xong việc được giao
              </MarginNote>

              <div className="flex flex-wrap justify-end gap-2.5 pt-1">
                <InkButton variant="ghost" size="sm" onClick={() => setDetailId(null)}>
                  Đóng
                </InkButton>
                <InkButton
                  variant="royal"
                  size="sm"
                  onClick={() => {
                    setDetailId(null);
                    navigate("sprints");
                  }}
                >
                  <VKanban size={15} /> Xem sprint board
                </InkButton>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== Modal xác nhận hoàn thành / hủy phiên (chặn đóng khi đang xử lý) ===== */}
      <Dialog
        open={confirmTransition !== null}
        onOpenChange={(open) => {
          if (!open && busyAction === null) {
            setConfirmTransition(null);
            setLifecycleError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={busyAction === null}>
          {confirmTransition && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 leading-snug">
                  {confirmTransition.next === "closed" ? (
                    <VFlag size={18} className="shrink-0 text-[var(--royal)]" aria-hidden="true" />
                  ) : (
                    <VBan size={18} className="shrink-0 text-[var(--danger)]" aria-hidden="true" />
                  )}
                  {confirmTransition.next === "closed" ? "Hoàn thành phiên?" : "Hủy phiên?"}
                </DialogTitle>
                <DialogDescription>
                  {confirmTransition.next === "closed"
                    ? "Kiểm tra nhiệm vụ, đánh giá và hoàn tất các phân công trước khi kết thúc phiên. Phiên đã hoàn thành không thể bắt đầu lại; lịch sử được giữ."
                    : "Phiên đã hủy không thể bắt đầu lại. Hãy kiểm tra đội hình và công việc đang thực hiện trước khi xác nhận; lịch sử được giữ."}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CodeChip className="!text-[0.72rem]">{confirmTransition.session.code}</CodeChip>
                <InkBadge tone={STATUS_TONE[confirmTransition.session.status]} dot>
                  {sessionStatusLabel(confirmTransition.session.status)}
                </InkBadge>
              </div>
              {lifecycleError && (
                <p
                  key={lifecycleError}
                  role="alert"
                  className="animate-shake-ink text-[0.8rem] font-semibold text-[var(--danger)]"
                >
                  {lifecycleError}
                </p>
              )}
              <div className="flex flex-wrap justify-end gap-2.5 pt-1">
                <InkButton
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    setConfirmTransition(null);
                    setLifecycleError(null);
                  }}
                >
                  Giữ phiên
                </InkButton>
                <InkButton
                  variant={confirmTransition.next === "cancelled" ? "coal" : "royal"}
                  size="sm"
                  disabled={busy}
                  onClick={() => runTransition(confirmTransition.session, confirmTransition.next)}
                  aria-label={
                    confirmTransition.next === "closed"
                      ? `Xác nhận hoàn thành phiên ${confirmTransition.session.code}`
                      : `Xác nhận hủy phiên ${confirmTransition.session.code}`
                  }
                >
                  {confirmTransition.next === "closed" ? <VFlag size={15} /> : <VBan size={15} />}
                  {busyAction === confirmTransition.next
                    ? "Đang xử lý…"
                    : confirmTransition.next === "closed"
                      ? "Xác nhận hoàn thành phiên"
                      : "Xác nhận hủy phiên"}
                </InkButton>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== Modal xác nhận hoàn thành phân công (chặn đóng khi đang xử lý) ===== */}
      <Dialog
        open={assignmentTarget !== null}
        onOpenChange={(open) => {
          if (!open && busyAction === null) {
            setAssignmentTarget(null);
            setAssignmentError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={busyAction === null}>
          {assignmentTarget && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 leading-snug">
                  <VClipboardCheck size={18} className="shrink-0 text-[var(--success)]" aria-hidden="true" />
                  Hoàn thành phân công?
                </DialogTitle>
                <DialogDescription>
                  Xác nhận <b className="font-semibold text-[var(--ink)]">{assignmentTarget.member.name}</b> đã
                  hoàn tất công việc được giao. Phân công sẽ kết thúc và sinh viên có thể được giao vào phiên
                  khác. Thành viên, bài nộp và lịch sử của phiên này được giữ lại.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CodeChip className="!text-[0.72rem]">{assignmentTarget.session.code}</CodeChip>
                <InkBadge tone="blue" dot>
                  {assignmentTarget.member.email}
                </InkBadge>
              </div>
              {assignmentError && (
                <p
                  key={assignmentError}
                  role="alert"
                  className="animate-shake-ink text-[0.8rem] font-semibold text-[var(--danger)]"
                >
                  {assignmentError}
                </p>
              )}
              <div className="flex flex-wrap justify-end gap-2.5 pt-1">
                <InkButton
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    setAssignmentTarget(null);
                    setAssignmentError(null);
                  }}
                >
                  Giữ phân công
                </InkButton>
                <InkButton
                  variant="royal"
                  size="sm"
                  disabled={busy}
                  onClick={() => runAssignmentComplete(assignmentTarget.session, assignmentTarget.member)}
                  aria-label={`Xác nhận hoàn thành phân công của ${assignmentTarget.member.name}`}
                >
                  <VCheck size={15} />
                  {busyAction === "assignment"
                    ? "Đang xử lý…"
                    : "Xác nhận hoàn thành phân công"}
                </InkButton>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <FadeIn delay={0.1}>
        <p className="flex items-center gap-2 text-[0.75rem] text-[var(--ink-soft)]">
          <VUsers size={14} />
          Mọi thay đổi vòng đời phiên (kết thúc, hủy) và phân công đều ghi vào nhật ký hệ thống.
        </p>
      </FadeIn>
    </div>
  );
}
