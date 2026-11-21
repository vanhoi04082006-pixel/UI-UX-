"use client";
/* =====================================================================
 * INSTRUCTOR AI PLAN — "Lập kế hoạch AI" (route: instructor → ai-plan).
 * Endpoint BE cover:
 *   · POST /ai-generations/sprint-plan/draft   (sinh nháp, KHÔNG lưu)
 *   · POST /ai-generations/sprint-plan/confirm (chốt nháp đã duyệt)
 *   · POST /ai-generations/plans/generate      (sinh + lưu plan)
 *   · GET  /ai-generations/plans?sessionId=    (lịch sử plan)
 *   · GET  /ai-generations/plans/{id}          (chi tiết 1 plan)
 * Selector dùng GET /projects + GET /sessions (adapter operations).
 * Lưu ý AI throttle 5-15 lượt/phút — nút disable khi busy.
 * ===================================================================== */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  VAlert,
  VBot,
  VCheck,
  VClock,
  VInbox,
  VLayers,
  VPlay,
  VSparkles,
  VTarget,
  VUsers,
} from "@/components/icons/v-icons";
import { InkButton } from "@/components/notebook/reveal";
import { InkBadge, MarginNote, NoteCard, SketchCard, StampMoc, Tape, formatDateVN, formatDateTimeVN } from "@/components/notebook/ui";
import {
  EmptyState,
  PencilLines,
  SectionError,
  SketchInput,
  StaffPageHeader,
} from "@/components/staff/staff-kit";
import { useApi } from "@/lib/use-api";
import { errorMessage } from "@/lib/api/api-client";
import {
  confirmSprintPlan,
  draftSprintPlan,
  generatePlan,
  getAiPlan,
  listAiPlans,
  newRequestId,
  type AiPlanDetail,
  type SprintPlanDraft,
} from "@/lib/api/ai-plan";
import { listOpSessions } from "@/lib/api/operations";
import { listProjects } from "@/lib/api/projects";
import { cn } from "@/lib/utils";

/* ------------------------------ hiển thị ------------------------------- */

const PRIORITY_META: Record<string, { label: string; tone: string }> = {
  low: { label: "Thấp", tone: "neutral" },
  medium: { label: "Trung bình", tone: "blue" },
  high: { label: "Cao", tone: "amber" },
  critical: { label: "Khẩn cấp", tone: "red" },
};

/* =====================================================================
 * MÀN CHÍNH
 * ===================================================================== */

export default function InstructorAiPlan() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <StaffPageHeader
        eyebrow="Sổ tay hành trình · Giảng viên"
        title="Lập kế hoạch AI"
        sub="Để AI soạn nháp kế hoạch sprint, duyệt lại rồi chốt thành kế hoạch thật."
        note="AI chỉ soạn nháp — bạn duyệt từng nhiệm vụ trước khi chốt. Điểm mạnh nhất là tiết kiệm thời gian lập kế hoạch lặp lại."
        icon={VBot}
      />
      <SprintAssistant />
      <PlanLibrary />
    </main>
  );
}

/* =====================================================================
 * KHỐI 1 — TRỢ LÝ LẬP SPRINT (draft → confirm)
 * ===================================================================== */

function SprintAssistant() {
  const projects = useApi(() => listProjects({ page: 1, pageSize: 50 }), []);
  const sessions = useApi(() => listOpSessions({ page: 1, pageSize: 50 }), []);

  const [projectId, setProjectId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [sprintCount, setSprintCount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [busy, setBusy] = useState<"draft" | "confirm" | "generate" | null>(null);
  const [draft, setDraft] = useState<SprintPlanDraft | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const hasScope = (projects.data?.items.length ?? 0) > 0 && (sessions.data?.items.length ?? 0) > 0;
  const scopeMissing =
    (projects.data?.items.length ?? 0) === 0 || (sessions.data?.items.length ?? 0)  === 0;

  async function runDraft() {
    if (!projectId || !sessionId) {
      toast.error("Chọn dự án và phiên trước khi nhờ AI soạn.");
      return;
    }
    setBusy("draft");
    setDraft(null);
    try {
      const result = await draftSprintPlan({
        projectId,
        sessionId,
        sprintCount: sprintCount ? Number(sprintCount) : undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
      });
      setDraft(result);
      toast.success("AI đã soạn xong nháp — hãy duyệt rồi chốt.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function runConfirm() {
    if (!draft) return;
    setBusy("confirm");
    try {
      await confirmSprintPlan({
        projectId,
        sessionId,
        draft: draft.raw,
        requestId: newRequestId(),
      });
      toast.success("Đã chốt kế hoạch sprint từ nháp AI.");
      setConfirmOpen(false);
      setDraft(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function runGenerate() {
    if (!projectId || !sessionId) {
      toast.error("Chọn dự án và phiên trước khi sinh plan.");
      return;
    }
    setBusy("generate");
    try {
      const plan = await generatePlan({
        projectId,
        sessionId,
        sprintCount: sprintCount ? Number(sprintCount) : undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
      });
      toast.success(`Đã sinh và lưu plan AI (${plan.sprintCount ?? 0} sprint).`);
      setDraft(plan.draft);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-label="Trợ lý lập sprint" className="space-y-4">
      <SketchCard hover={false} className="relative space-y-4 p-4 sm:p-5">
        <Tape variant="candy" rotate={-4} className="-top-3 left-8 !w-16 !h-5" />
        <div className="flex flex-wrap items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-[11px] border-2 border-[var(--ink)] bg-[var(--blue-mist)] text-[var(--royal)]">
            <VSparkles size={19} />
          </span>
          <div>
            <h2 className="text-lg font-extrabold leading-tight">Trợ lý lập Sprint</h2>
            <p className="text-[0.78rem] text-[var(--ink-soft)]">
              Chọn dự án + phiên, để AI soạn nháp sprint/nhiệm vụ, duyệt rồi chốt.
            </p>
          </div>
          <InkBadge tone="amber" className="ml-auto" dot>AI giới hạn 5-15 lượt/phút</InkBadge>
        </div>

        {projects.error ? (
          <SectionError message={projects.error} onRetry={projects.reload} />
        ) : sessions.error ? (
          <SectionError message={sessions.error} onRetry={sessions.reload} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs font-bold" htmlFor="ai-project">Dự án *</label>
              <select
                id="ai-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="focus-ink w-full rounded-[9px] border-2 border-[var(--ink)] bg-[var(--paper)] px-2.5 py-2 text-sm font-semibold"
              >
                <option value="">— Chọn dự án —</option>
                {(projects.data?.items ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold" htmlFor="ai-session">Phiên *</label>
              <select
                id="ai-session"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="focus-ink w-full rounded-[9px] border-2 border-[var(--ink)] bg-[var(--paper)] px-2.5 py-2 text-sm font-semibold"
              >
                <option value="">— Chọn phiên —</option>
                {(sessions.data?.items ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold" htmlFor="ai-count">Số sprint (1-8)</label>
              <SketchInput
                id="ai-count"
                type="number"
                min={1}
                max={8}
                value={sprintCount}
                onChange={(e) => setSprintCount(e.target.value)}
                placeholder="AI tự chọn"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold" htmlFor="ai-start">Ngày bắt đầu</label>
              <SketchInput id="ai-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
          </div>
        )}

        {scopeMissing && !projects.loading && !sessions.loading && (
          <NoteCard title="Chưa có phạm vi để lập kế hoạch" tone="yellow">
            Bạn cần có dự án đang quản lý và phiên đang chạy (có ít nhất 1 sinh viên) trước khi AI soạn được kế hoạch.
            Mở phiên mới ở trang <b>Phiên thực tập</b> hoặc <b>Điều phối phiên</b>.
          </NoteCard>
        )}

        <div className="flex flex-wrap items-center gap-2.5">
          <InkButton variant="royal" size="md" disabled={busy !== null} onClick={runDraft}>
            <VBot size={16} /> {busy === "draft" ? "AI đang soạn…" : "Sinh nháp kế hoạch"}
          </InkButton>
          <InkButton variant="outline" size="md" disabled={busy !== null} onClick={runGenerate}>
            <VLayers size={15} /> {busy === "generate" ? "Đang sinh & lưu…" : "Sinh + lưu plan"}
          </InkButton>
          {busy && (
            <span className="inline-flex items-center gap-2 text-[0.78rem] font-semibold text-[var(--ink-soft)]">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--ink)] border-t-transparent" aria-hidden="true" />
              AI có thể mất tới 1-2 phút — tránh bấm lặp.
            </span>
          )}
        </div>
        <MarginNote>
          "Sinh nháp" không lưu gì — chỉ xem trước. "Sinh + lưu plan" tạo bản ghi plan để dùng lại sau.
        </MarginNote>
      </SketchCard>

      {/* Xem trước nháp */}
      {busy === "draft" && !draft && <PencilLines rows={4} />}
      {draft && (
        <SketchCard hover={false} className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[1.05rem] font-extrabold">Nháp kế hoạch · {draft.sprints.length} sprint</h3>
            <span className="ml-auto flex flex-wrap gap-2">
              <InkButton variant="ghost" size="sm" disabled={busy !== null} onClick={() => setDraft(null)}>
                Bỏ nháp
              </InkButton>
              <InkButton variant="royal" size="sm" disabled={busy !== null} onClick={() => setConfirmOpen(true)}>
                <VCheck size={14} /> {busy === "confirm" ? "Đang chốt…" : "Chốt kế hoạch"}
              </InkButton>
            </span>
          </div>

          {draft.warnings.length > 0 && (
            <div className="space-y-1.5 rounded-[10px] border-2 border-dashed border-[var(--warning)] p-3">
              <p className="flex items-center gap-1.5 text-[0.8rem] font-bold text-[var(--warning)]">
                <VAlert size={14} /> {draft.warnings.length} cảnh báo từ hệ thống
              </p>
              <ul className="list-inside list-disc space-y-0.5 text-[0.72rem]">
                {draft.warnings.map((w, i) => (
                  <li key={i}>{w.taskTitle ? `${w.taskTitle}: ` : ""}{w.message}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-3">
            {draft.sprints.map((sprint, i) => (
              <div key={`${sprint.name}-${i}`} className="sketch-border-thin space-y-2.5 bg-[var(--paper)] p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <InkBadge tone="blue">Sprint {i + 1}</InkBadge>
                  <p className="font-bold">{sprint.name}</p>
                  <span className="ml-auto text-[0.7rem] tabular text-[var(--ink-soft)]">
                    {sprint.startDate ? formatDateVN(sprint.startDate) : "?"} → {sprint.endDate ? formatDateVN(sprint.endDate) : "?"}
                  </span>
                </div>
                {sprint.goal && <p className="text-[0.76rem] text-[var(--ink-soft)]">{sprint.goal}</p>}
                {sprint.tasks.length === 0 ? (
                  <p className="text-[0.74rem] text-[var(--ink-soft)]">Sprint chưa có nhiệm vụ nào.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {sprint.tasks.map((task, j) => (
                      <li key={task.key ?? j} className="rounded-[9px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_20%,transparent)] p-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[0.8rem] font-bold">{task.title}</p>
                          {task.priority && (
                            <InkBadge tone={PRIORITY_META[task.priority]?.tone ?? "neutral"}>
                              {PRIORITY_META[task.priority]?.label ?? task.priority}
                            </InkBadge>
                          )}
                          {task.storyPoints !== null && <InkBadge tone="neutral">{task.storyPoints.toLocaleString("vi-VN")} điểm</InkBadge>}
                          {task.suggestedRole && <InkBadge tone="blue">{task.suggestedRole}</InkBadge>}
                          {task.dueDate && (
                            <span className="ml-auto inline-flex items-center gap-1 text-[0.66rem] text-[var(--ink-soft)]">
                              <VClock size={12} /> {formatDateVN(task.dueDate)}
                            </span>
                          )}
                        </div>
                        {task.description && <p className="mt-0.5 text-[0.72rem] text-[var(--ink-soft)]">{task.description}</p>}
                        {task.acceptanceCriteria.length > 0 && (
                          <ul className="mt-1 list-inside list-disc text-[0.7rem] text-[var(--ink-soft)]">
                            {task.acceptanceCriteria.map((a) => <li key={a}>{a}</li>)}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {draft.milestones.length > 0 && (
            <div className="space-y-1.5">
              <p className="eyebrow">Mốc giao</p>
              <ul className="space-y-1">
                {draft.milestones.map((m, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2 text-[0.76rem]">
                    <VTarget size={13} className="text-[var(--ink-soft)]" />
                    <span className="font-bold">{m.title ?? "Mốc"}</span>
                    {m.dueDate && <span className="text-[var(--ink-soft)]">hạn {formatDateVN(m.dueDate)}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SketchCard>
      )}

      {/* Xác nhận chốt */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chốt kế hoạch từ nháp AI?</DialogTitle>
            <DialogDescription>
              Hệ thống kiểm tra lại tính hợp lệ của nháp (phân công, ngày tháng) trước khi tạo sprint + nhiệm vụ thật.
              Hành động được ghi nhật ký và idempotent theo mã yêu cầu.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <InkButton variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>Hủy</InkButton>
            <InkButton variant="royal" size="sm" disabled={busy !== null} onClick={runConfirm}>
              <VCheck size={14} /> {busy === "confirm" ? "Đang chốt…" : "Chốt kế hoạch"}
            </InkButton>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/* =====================================================================
 * KHỐI 2 — THƯ VIỆN PLAN AI
 * ===================================================================== */

function PlanLibrary() {
  const sessions = useApi(() => listOpSessions({ page: 1, pageSize: 50 }), []);
  const [sessionId, setSessionId] = useState("");
  const plans = useApi(
    () => (sessionId ? listAiPlans(sessionId) : Promise.resolve([])),
    [sessionId],
  );
  const [detailId, setDetailId] = useState<string | null>(null);

  return (
    <section aria-label="Thư viện plan AI" className="space-y-4">
      <SketchCard hover={false} className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-[11px] border-2 border-[var(--ink)] bg-[var(--note-mint)] text-[var(--note-mint-ink)]">
            <VLayers size={19} />
          </span>
          <div>
            <h2 className="text-lg font-extrabold leading-tight">Thư viện plan AI</h2>
            <p className="text-[0.78rem] text-[var(--ink-soft)]">Lịch sử các kế hoạch AI đã sinh theo phiên.</p>
          </div>
        </div>
        <div className="max-w-md space-y-1">
          <label className="text-xs font-bold" htmlFor="plan-session">Phiên</label>
          <select
            id="plan-session"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="focus-ink w-full rounded-[9px] border-2 border-[var(--ink)] bg-[var(--paper)] px-2.5 py-2 text-sm font-semibold"
          >
            <option value="">— Chọn phiên để xem plan —</option>
            {(sessions.data?.items ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
            ))}
          </select>
        </div>

        {!sessionId ? (
          <EmptyState
            icon={VInbox}
            title="Chưa chọn phiên"
            note="Chọn một phiên bạn quản lý để xem các kế hoạch AI đã sinh cho phiên đó."
          />
        ) : plans.loading ? (
          <PencilLines rows={3} />
        ) : plans.error ? (
          <SectionError message={plans.error} onRetry={plans.reload} />
        ) : !plans.data || plans.data.length === 0 ? (
          <EmptyState
            icon={VInbox}
            title="Phiên này chưa có plan AI nào"
            note="Dùng khối Trợ lý lập Sprint phía trên với đúng phiên này để sinh plan đầu tiên."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {plans.data.map((plan) => (
              <button
                key={plan.planId}
                type="button"
                onClick={() => setDetailId(plan.planId)}
                className="focus-ink sketch-card sketch-card-hover flex flex-col gap-2 p-4 text-left"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <InkBadge tone={plan.status === "confirmed" ? "green" : "amber"} dot>{plan.status}</InkBadge>
                  {plan.hasDraft && <InkBadge tone="blue">có nháp</InkBadge>}
                  <span className="ml-auto text-[0.68rem] text-[var(--ink-soft)]">
                    {plan.createdAt ? formatDateTimeVN(plan.createdAt) : "—"}
                  </span>
                </div>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.78rem] font-semibold tabular">
                  <span className="inline-flex items-center gap-1"><VTarget size={13} /> {plan.sprintCount ?? 0} sprint</span>
                  <span className="inline-flex items-center gap-1"><VPlay size={12} /> {plan.taskCount ?? 0} nhiệm vụ</span>
                  <span className="inline-flex items-center gap-1 text-[var(--ink-soft)]">mẫu v{plan.templateVersion ?? "?"}</span>
                </p>
              </button>
            ))}
          </div>
        )}
      </SketchCard>

      {detailId && <PlanDetailDialog planId={detailId} onClose={() => setDetailId(null)} />}
    </section>
  );
}

function PlanDetailDialog({ planId, onClose }: { planId: string; onClose: () => void }) {
  const { data, loading, error, reload } = useApi(() => getAiPlan(planId), [planId]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
        {error ? (
          <>
            <DialogHeader><DialogTitle>Không tải được plan</DialogTitle></DialogHeader>
            <SectionError message={error} onRetry={reload} />
          </>
        ) : loading || !data ? (
          <>
            <DialogHeader><DialogTitle>Đang tải plan…</DialogTitle></DialogHeader>
            <PencilLines rows={4} />
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <InkBadge tone={data.status === "confirmed" ? "green" : "amber"} dot>{data.status}</InkBadge>
                {data.deduped && <InkBadge tone="blue">bản tái sử dụng</InkBadge>}
              </div>
              <DialogTitle className="mt-1.5">
                Plan AI · {data.sprintCount ?? 0} sprint / {data.taskCount ?? 0} nhiệm vụ
              </DialogTitle>
              <DialogDescription>
                {data.createdAt ? formatDateTimeVN(data.createdAt) : "—"} · mẫu v{data.templateVersion ?? "?"}
              </DialogDescription>
            </DialogHeader>

            {data.error && (
              <p className="rounded-[10px] border-2 border-dashed border-[var(--danger)] p-3 text-[0.78rem] text-[var(--danger)]">
                {data.error}
              </p>
            )}
            {data.warnings.length > 0 && (
              <div className="space-y-1 rounded-[10px] border-2 border-dashed border-[var(--warning)] p-3">
                <p className="text-[0.8rem] font-bold text-[var(--warning)]">Cảnh báo hiện hành</p>
                <ul className="list-inside list-disc text-[0.72rem]">
                  {data.warnings.map((w, i) => <li key={i}>{w.taskTitle ? `${w.taskTitle}: ` : ""}{w.message}</li>)}
                </ul>
              </div>
            )}

            {data.draft ? (
              <div className="space-y-3">
                {data.draft.sprints.map((sprint, i) => (
                  <div key={`${sprint.name}-${i}`} className="sketch-border-thin space-y-2 bg-[var(--paper)] p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <InkBadge tone="blue">Sprint {i + 1}</InkBadge>
                      <p className="font-bold">{sprint.name}</p>
                      <span className="ml-auto text-[0.68rem] tabular text-[var(--ink-soft)]">
                        {sprint.startDate ? formatDateVN(sprint.startDate) : "?"} → {sprint.endDate ? formatDateVN(sprint.endDate) : "?"}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {sprint.tasks.map((task, j) => (
                        <li key={task.key ?? j} className="flex flex-wrap items-center gap-2 text-[0.76rem]">
                          <span className="min-w-0 flex-1 truncate font-semibold">{task.title}</span>
                          {task.priority && (
                            <InkBadge tone={PRIORITY_META[task.priority]?.tone ?? "neutral"}>
                              {PRIORITY_META[task.priority]?.label ?? task.priority}
                            </InkBadge>
                          )}
                          {task.storyPoints !== null && (
                            <span className="tabular text-[var(--ink-soft)]">{task.storyPoints.toLocaleString("vi-VN")} điểm</span>
                          )}
                          {task.suggestedRole && (
                            <span className="inline-flex items-center gap-1 text-[0.66rem] text-[var(--ink-soft)]">
                              <VUsers size={12} /> {task.suggestedRole}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {data.draft.sprints.length === 0 && (
                  <EmptyState icon={VInbox} title="Plan chưa có sprint nào" />
                )}
              </div>
            ) : (
              <EmptyState icon={VInbox} title="Plan này chưa có nội dung nháp" note="Nội dung sẽ có sau khi AI hoàn tất." />
            )}

            {data.status === "confirmed" && (
              <div className="flex items-center gap-3">
                <StampMoc tone="blue" rotate={-6}>Đã chốt</StampMoc>
                <p className="text-[0.76rem] text-[var(--ink-soft)]">Kế hoạch đã được giảng viên duyệt và áp dụng.</p>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
