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
  VCalendar,
  VChartColumn,
  VClock,
  VGraduation,
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
  SESSION_STATUS,
  SkeletonBlock,
  initialsOf,
} from "@/components/staff/instructor-shared";
import { useApp } from "@/lib/store";
import { useMock } from "@/lib/use-mock";
import type { InstructorSession } from "@/lib/mock/types";

/* =====================================================================
 * PHIÊN THỰC TẬP — quản lý các phiên đang mở / đã kết thúc.
 * ===================================================================== */

type SessionFilter = "all" | "active" | "upcoming" | "closed";

const MEMBER_ROLES = ["Frontend", "Backend", "QA", "Tài liệu", "DevOps", "Thiết kế"];

/** Dữ liệu từng thành viên — sinh nhất quán theo vị trí trong danh sách. */
function memberRowsOf(session: InstructorSession) {
  return session.memberNames.map((name, i) => {
    const progress =
      session.status === "closed" ? 100 : (i * 13 + 40) % 100;
    const status =
      session.status === "closed"
        ? { label: "Hoàn thành", tone: "green" as const }
        : progress >= 85
          ? { label: "Hoàn thành", tone: "green" as const }
          : progress >= 10
            ? { label: "Đang làm", tone: "blue" as const }
            : { label: "Cần bắt đầu", tone: "neutral" as const };
    return { name, role: MEMBER_ROLES[i % MEMBER_ROLES.length], progress, status };
  });
}

export default function InstructorSessions() {
  const navigate = useApp((s) => s.navigate);
  const { data, loading, error, reload } = useMock<InstructorSession[]>("instructor/sessions");

  const [filter, setFilter] = useState<SessionFilter>("all");
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const [form, setForm] = useState({ project: "", start: "", desc: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [creatingBusy, setCreatingBusy] = useState(false);

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
    const done = detailRows.filter((m) => m.progress >= 85).length;
    const working = detailRows.filter((m) => m.progress >= 10 && m.progress < 85).length;
    return { done, working, idle: detailRows.length - done - working };
  }, [detailRows]);

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

      <FilterChips
        ariaLabel="Lọc phiên theo trạng thái"
        value={filter}
        onChange={setFilter}
        options={[
          { key: "all", label: "Tất cả", count: sessions.length },
          { key: "active", label: "Đang diễn ra", count: sessions.filter((s) => s.status === "active").length },
          { key: "upcoming", label: "Sắp mở", count: sessions.filter((s) => s.status === "upcoming").length },
          { key: "closed", label: "Đã kết thúc", count: sessions.filter((s) => s.status === "closed").length },
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
            const meta = SESSION_STATUS[s.status] ?? SESSION_STATUS.active;
            const daysToStart = Math.max(
              0,
              Math.ceil((new Date(s.startDate).getTime() - Date.now()) / 86_400_000),
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
                  } ${s.status === "closed" ? "opacity-80" : ""}`}
                >
                  {/* Băng dính: phiên sắp mở dán băng hổ phách nhắc lịch */}
                  {s.status === "upcoming" && (
                    <Tape variant="warm" rotate={-4} className="-top-3 left-7 !w-16 !h-5" />
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <CodeChip className="!text-[0.72rem]">{s.code}</CodeChip>
                    {s.status === "active" ? (
                      <InkBadge tone={meta.tone}>
                        <span aria-hidden="true" className="ws-dot-live" />
                        {meta.label}
                      </InkBadge>
                    ) : (
                      <InkBadge tone={meta.tone} dot>
                        {meta.label}
                      </InkBadge>
                    )}
                    <span className="ml-auto flex items-center gap-1 font-geist-mono text-[0.66rem] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                      {s.status === "closed" && <VClock size={13} aria-hidden="true" />}
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
                      tone={s.status === "closed" ? "success" : "royal"}
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
                  <InkBadge tone={SESSION_STATUS[detail.status]?.tone ?? "neutral"} dot>
                    {SESSION_STATUS[detail.status]?.label ?? detail.status}
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

              {/* Tóm tắt nhanh từng nhóm tiến độ trong phiên */}
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { icon: VGraduation, label: "Hoàn thành", value: memberSummary.done, tone: "text-[var(--success)]" },
                  { icon: VUsers, label: "Đang làm", value: memberSummary.working, tone: "text-[var(--royal)]" },
                  { icon: VClock, label: "Cần bắt đầu", value: memberSummary.idle, tone: "text-[var(--warning)]" },
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
                      <th scope="col" className="min-w-[8.5rem]">Tiến độ</th>
                      <th scope="col">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailRows.map((m) => (
                      <tr key={m.name}>
                        <td>
                          <span className="flex items-center gap-2 font-semibold">
                            <span
                              aria-hidden="true"
                              className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-[1.5px] border-[var(--ink)] bg-[var(--blue-mist)] text-[0.58rem] font-bold text-[var(--royal)]"
                            >
                              {initialsOf(m.name)}
                            </span>
                            {m.name}
                          </span>
                        </td>
                        <td className="text-[var(--ink-soft)]">{m.role}</td>
                        <td>
                          <span className="flex items-center gap-2">
                            <MiniBar value={m.progress} className="w-16" label={`Tiến độ ${m.name}`} />
                            <span className="text-[0.72rem] font-bold tabular">{m.progress}%</span>
                          </span>
                        </td>
                        <td>
                          <InkBadge tone={m.status.tone} dot>
                            {m.status.label}
                          </InkBadge>
                        </td>
                      </tr>
                    ))}
                    {detail.memberNames.length === 0 && (
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
                tiến độ từng người lấy từ kanban cá nhân — sinh viên tự kéo thẻ
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

      <FadeIn delay={0.1}>
        <p className="flex items-center gap-2 text-[0.75rem] text-[var(--ink-soft)]">
          <VUsers size={14} />
          Mọi thay đổi phiên (mở, đóng, thêm thành viên) đều ghi vào nhật ký hệ thống.
        </p>
      </FadeIn>
    </div>
  );
}
