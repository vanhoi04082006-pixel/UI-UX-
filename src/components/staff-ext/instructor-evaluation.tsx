"use client";
/* =====================================================================
 * INSTRUCTOR EVALUATION — "Chu kỳ đánh giá" (route: instructor → evaluations).
 * Endpoint BE cover:
 *   · GET  /evaluation-cycles · GET /evaluation-cycles/{id}
 *   · GET  /evaluation-cycles/{id}/criteria
 *   · GET  /evaluations (lọc cycleId/status) · POST /evaluations
 *   · GET  /evaluations/{id} · PATCH /evaluations/{id} (lưu điểm + nhận xét)
 *   · POST /evaluations/{id}/submit · POST /evaluations/{id}/finalize
 *   · POST /evaluations/{id}/revisions (yêu cầu làm lại — chính sách admin)
 *   · POST /evaluations/{id}/ai-suggestions · GET /evaluations/{id}/ai-suggestions
 *   · GET  /evaluations/{id}/ai-suggestions/{suggestionId}
 *   · GET  /tasks/{id}/submissions · GET /submissions/{id}/code-reviews
 *   · POST /submissions/{id}/code-reviews (chạy review AI)
 *   · GET  /imported-reviews · PATCH /imported-reviews/{id}
 * ===================================================================== */
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  VBot,
  VCheck,
  VClipboardCheck,
  VCode,
  VExternal,
  VInbox,
  VPlus,
  VRefresh,
  VSearch,
  VSparkles,
  VUser,
} from "@/components/icons/v-icons";
import { InkButton } from "@/components/notebook/reveal";
import { InkBadge, MarginNote, SketchCard, StampMoc, formatDateVN, formatDateTimeVN } from "@/components/notebook/ui";
import {
  ChipGroup,
  EmptyState,
  PencilLines,
  SectionError,
  SketchInput,
  SketchTextarea,
  StaffPageHeader,
} from "@/components/staff/staff-kit";
import { useApi } from "@/lib/use-api";
import { errorMessage } from "@/lib/api/api-client";
import {
  createEvaluation,
  finalizeEvaluation,
  generateEvaluationAiSuggestion,
  getEvaluation,
  getEvaluationAiSuggestion,
  listCodeReviews,
  listCycleCriteria,
  listEvaluationAiSuggestions,
  listEvaluationCycles,
  listEvaluations,
  listImportedReviews,
  listTaskSubmissions,
  reviseEvaluation,
  runCodeReview,
  submitEvaluation,
  updateEvaluationScores,
  updateImportedReview,
  type AiSuggestion,
} from "@/lib/api/instructor-eval";
import { listInternPerformances } from "@/lib/api/performance";
import { cn } from "@/lib/utils";

/* ------------------------------ hiển thị ------------------------------- */

const EVAL_STATUS_META: Record<string, { label: string; tone: string }> = {
  draft: { label: "Nháp", tone: "neutral" },
  submitted: { label: "Đã nộp", tone: "blue" },
  finalized: { label: "Đã chốt", tone: "green" },
  revision_requested: { label: "Yêu cầu làm lại", tone: "amber" },
};

const CYCLE_STATUS_META: Record<string, { label: string; tone: string }> = {
  draft: { label: "Nháp", tone: "neutral" },
  open: { label: "Đang mở", tone: "green" },
  closed: { label: "Đã đóng", tone: "neutral" },
  archived: { label: "Lưu trữ", tone: "neutral" },
};

function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

/* =====================================================================
 * MÀN CHÍNH
 * ===================================================================== */

type MainTab = "evaluations" | "cycles" | "imported";
type EvalStatusFilter = "all" | "draft" | "submitted" | "finalized";

export default function InstructorEvaluation() {
  const [tab, setTab] = useState<MainTab>("evaluations");

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-8 sm:px-6">
      <StaffPageHeader
        eyebrow="Sổ tay hành trình · Giảng viên"
        title="Chu kỳ đánh giá"
        sub="Chấm điểm theo tiêu chí, xin gợi ý AI và chốt kết quả từng sinh viên."
        note="Điểm tổng luôn được hệ thống tính lại theo trọng số — bạn chỉ chấm từng tiêu chí."
        icon={VClipboardCheck}
      />
      <ChipGroup
        ariaLabel="Chọn khu vực xem"
        value={tab}
        onChange={setTab}
        options={[
          { value: "evaluations", label: "Phiếu đánh giá" },
          { value: "cycles", label: "Kỳ đánh giá" },
          { value: "imported", label: "Review nhập ngoài" },
        ]}
      />
      {tab === "evaluations" && <EvaluationsTab />}
      {tab === "cycles" && <CyclesTab />}
      {tab === "imported" && <ImportedTab />}
    </main>
  );
}

/* =====================================================================
 * TAB PHIẾU ĐÁNH GIÁ
 * ===================================================================== */

function EvaluationsTab() {
  const [status, setStatus] = useState<EvalStatusFilter>("all");
  const [cycleId, setCycleId] = useState("all");
  const cycles = useApi(() => listEvaluationCycles(1, 50), []);
  const interns = useApi(() => listInternPerformances(1, 100), []);
  const nameOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of interns.data?.items ?? []) map.set(row.userId, row.displayName);
    return map;
  }, [interns.data]);
  const cycleOf = useMemo(() => {
    const byId = new Map<string, { code: string; name: string }>();
    for (const c of cycles.data?.items ?? []) byId.set(c.id, { code: c.code, name: c.name });
    return byId;
  }, [cycles.data]);

  const { data, loading, error, reload } = useApi(
    () =>
      listEvaluations({
        status: status === "all" ? undefined : status,
        cycleId: cycleId === "all" ? undefined : cycleId,
        page: 1,
        pageSize: 50,
      }),
    [status, cycleId],
  );

  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reviewTaskId, setReviewTaskId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Bộ lọc */}
      <SketchCard hover={false} className="flex flex-wrap items-center gap-2 p-4">
        <ChipGroup
          ariaLabel="Lọc phiếu theo trạng thái"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "Tất cả" },
            { value: "draft", label: "Nháp" },
            { value: "submitted", label: "Đã nộp" },
            { value: "finalized", label: "Đã chốt" },
          ]}
        />
        <select
          aria-label="Lọc theo kỳ đánh giá"
          value={cycleId}
          onChange={(e) => setCycleId(e.target.value)}
          className="focus-ink rounded-[9px] border-2 border-[var(--ink)] bg-[var(--paper)] px-2.5 py-1.5 text-xs font-bold"
        >
          <option value="all">Mọi kỳ đánh giá</option>
          {(cycles.data?.items ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
          ))}
        </select>
        <span className="ml-auto flex flex-wrap gap-2">
          <InkButton variant="outline" size="sm" onClick={() => setReviewTaskId("__open__")}>
            <VCode size={14} /> Code review
          </InkButton>
          <InkButton variant="royal" size="sm" onClick={() => setCreating(true)}>
            <VPlus size={15} /> Tạo phiếu
          </InkButton>
        </span>
      </SketchCard>

      {error ? (
        <SectionError message={error} onRetry={reload} />
      ) : loading ? (
        <PencilLines rows={4} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={VClipboardCheck}
          title="Chưa có phiếu đánh giá nào"
          note="Tạo phiếu cho một sinh viên trong kỳ đang mở, hoặc đổi bộ lọc. Phiếu chỉ tạo được với kỳ đang mở và sinh viên thuộc phạm vi của bạn."
        />
      ) : (
        <SketchCard hover={false} className="overflow-hidden p-0">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--paper-raised)]">
                <tr className="font-geist-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                  <th className="px-3 py-2.5">Kỳ</th>
                  <th className="px-3 py-2.5">Sinh viên</th>
                  <th className="px-3 py-2.5">Trạng thái</th>
                  <th className="px-3 py-2.5">Điểm tổng</th>
                  <th className="px-3 py-2.5">Cập nhật</th>
                  <th className="px-3 py-2.5" aria-label="Thao tác" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((ev) => {
                  const cycle = cycleOf.get(ev.cycleId);
                  return (
                    <tr
                      key={ev.id}
                      className="cursor-pointer border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_14%,transparent)] transition-colors hover:bg-[var(--blue-mist)]"
                      onClick={() => setDetailId(ev.id)}
                    >
                      <td className="px-3 py-2.5">
                        <p className="font-bold leading-tight">{cycle?.code ?? shortId(ev.cycleId)}</p>
                        {cycle && <p className="text-[0.66rem] text-[var(--ink-soft)]">{cycle.name}</p>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1.5">
                          <VUser size={13} className="text-[var(--ink-soft)]" />
                          {nameOf.get(ev.internId) ?? shortId(ev.internId)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <InkBadge tone={EVAL_STATUS_META[ev.status]?.tone ?? "neutral"} dot>
                          {EVAL_STATUS_META[ev.status]?.label ?? ev.status}
                        </InkBadge>
                      </td>
                      <td className="px-3 py-2.5 font-bold tabular">
                        {ev.overallScore === null ? "—" : ev.overallScore.toLocaleString("vi-VN")}
                      </td>
                      <td className="px-3 py-2.5 text-[0.72rem] text-[var(--ink-soft)]">
                        {ev.updatedAt ? formatDateTimeVN(ev.updatedAt) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <InkButton variant="outline" size="sm" onClick={() => setDetailId(ev.id)}>
                          Chấm
                        </InkButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SketchCard>
      )}

      <CreateEvaluationDialog
        open={creating}
        onClose={setCreating}
        cycles={cycles.data?.items ?? []}
        internOptions={interns.data?.items ?? []}
        onCreated={reload}
      />
      {detailId && <EvaluationDetailDialog id={detailId} onClose={() => setDetailId(null)} onChanged={reload} />}
      {reviewTaskId && (
        <CodeReviewDialog
          initialTaskId={reviewTaskId === "__open__" ? "" : reviewTaskId}
          onClose={() => setReviewTaskId(null)}
        />
      )}
    </div>
  );
}

/* ------------------------ tạo phiếu (POST /evaluations) ----------------- */

function CreateEvaluationDialog({
  open,
  onClose,
  cycles,
  internOptions,
  onCreated,
}: {
  open: boolean;
  onClose: (open: boolean) => void;
  cycles: { id: string; code: string; name: string; status: string }[];
  internOptions: { userId: string; displayName: string }[];
  onCreated: () => void;
}) {
  const [cycleId, setCycleId] = useState("");
  const [internId, setInternId] = useState("");
  const [manualIntern, setManualIntern] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openCycles = cycles.filter((c) => c.status === "open");

  async function submit() {
    const chosenIntern = internOptions.length > 0 ? internId : manualIntern.trim();
    if (!cycleId) {
      setFormError("Chọn kỳ đánh giá đang mở.");
      return;
    }
    if (!chosenIntern) {
      setFormError("Chọn sinh viên thuộc kỳ đánh giá.");
      return;
    }
    setFormError(null);
    setBusy(true);
    try {
      await createEvaluation({ cycleId, internId: chosenIntern });
      toast.success("Đã tạo phiếu đánh giá nháp.");
      onCreated();
      onClose(false);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo phiếu đánh giá</DialogTitle>
          <DialogDescription>
            Phiếu được tạo ở dạng nháp trong kỳ đang mở. Bạn là người chấm chính theo mặc định.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-bold" htmlFor="ev-cycle">Kỳ đánh giá đang mở *</label>
            <select
              id="ev-cycle"
              value={cycleId}
              onChange={(e) => setCycleId(e.target.value)}
              className="focus-ink w-full rounded-[9px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 text-sm font-semibold"
            >
              <option value="">— Chọn kỳ —</option>
              {openCycles.map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
              ))}
            </select>
            {openCycles.length === 0 && (
              <p className="text-[0.72rem] text-[var(--ink-soft)]">
                Hiện không có kỳ nào đang mở — kỳ phải ở trạng thái "Đang mở" mới tạo được phiếu.
              </p>
            )}
          </div>
          {internOptions.length > 0 ? (
            <div className="space-y-1">
              <label className="text-xs font-bold" htmlFor="ev-intern">Sinh viên *</label>
              <select
                id="ev-intern"
                value={internId}
                onChange={(e) => setInternId(e.target.value)}
                className="focus-ink w-full rounded-[9px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 text-sm font-semibold"
              >
                <option value="">— Chọn sinh viên —</option>
                {internOptions.map((i) => (
                  <option key={i.userId} value={i.userId}>{i.displayName}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-xs font-bold" htmlFor="ev-intern-manual">Mã sinh viên (UUID) *</label>
              <SketchInput
                id="ev-intern-manual"
                value={manualIntern}
                onChange={(e) => setManualIntern(e.target.value)}
                placeholder="Dán UUID sinh viên thuộc kỳ…"
              />
              <p className="text-[0.72rem] text-[var(--ink-soft)]">
                Danh sách sinh viên bạn quản lý đang trống — dán mã sinh viên thuộc phạm vi kỳ đánh giá.
              </p>
            </div>
          )}
          {formError && <p role="alert" className="text-[0.8rem] font-semibold text-[var(--danger)]">{formError}</p>}
          <div className="flex justify-end gap-2">
            <InkButton variant="ghost" size="sm" disabled={busy} onClick={() => onClose(false)}>Hủy</InkButton>
            <InkButton variant="royal" size="sm" disabled={busy} onClick={submit}>
              <VPlus size={14} /> {busy ? "Đang tạo…" : "Tạo phiếu"}
            </InkButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------- chi tiết phiếu + chấm điểm ---------------------- */

interface ScoreDraft {
  score: string;
  comment: string;
}

function EvaluationDetailDialog({
  id,
  onClose,
  onChanged,
}: {
  id: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { data, loading, error, reload } = useApi(() => getEvaluation(id), [id]);
  const criteria = useApi(
    () => (data ? listCycleCriteria(data.evaluation.cycleId) : Promise.resolve([])),
    [data?.evaluation.cycleId],
  );
  const suggestions = useApi(
    () => (data ? listEvaluationAiSuggestions(id) : Promise.resolve({ items: [], total: 0 })),
    [id, data?.evaluation.id],
  );

  const [drafts, setDrafts] = useState<Record<string, ScoreDraft> | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<"submit" | "finalize" | "revise" | null>(null);
  const [reviseReason, setReviseReason] = useState("");
  const [focusedSuggestion, setFocusedSuggestion] = useState<AiSuggestion | null>(null);

  const evaluation = data?.evaluation;
  const locked = evaluation?.status === "finalized";

  /* Khởi tạo biểu mẫu chấm khi có dữ liệu. */
  const criteriaList = criteria.data ?? [];
  const draftKey = `${id}:${data?.evaluation.updatedAt ?? ""}:${criteriaList.length}`;
  const [appliedKey, setAppliedKey] = useState("");
  if (data && criteriaList.length > 0 && appliedKey !== draftKey) {
    setAppliedKey(draftKey);
    const next: Record<string, ScoreDraft> = {};
    for (const c of criteriaList) {
      const existing = data.scores.find((s) => s.criterionId === c.id);
      next[c.id] = {
        score: existing ? String(existing.score) : "",
        comment: existing?.comment ?? "",
      };
    }
    setDrafts(next);
    setSummary(evaluation?.summary ?? "");
  }

  function applySuggestion(suggestion: AiSuggestion) {
    if (!drafts) return;
    const next: Record<string, ScoreDraft> = { ...drafts };
    for (const cs of suggestion.criterionSuggestions) {
      const criterion = criteriaList.find((c) => c.code === cs.criterionCode);
      if (!criterion) continue;
      next[criterion.id] = {
        score: String(Math.min(cs.suggestedScore, criterion.maxScore)),
        comment: cs.comment ?? next[criterion.id]?.comment ?? "",
      };
    }
    setDrafts(next);
    toast.success("Đã điền điểm gợi ý vào biểu mẫu — nhớ bấm Lưu điểm.");
  }

  async function runSave() {
    if (!drafts) return;
    const payload = criteriaList
      .filter((c) => drafts[c.id]?.score !== "")
      .map((c) => ({
        criterionId: c.id,
        score: Number(drafts[c.id].score),
        comment: drafts[c.id].comment.trim() || undefined,
      }));
    setBusy("save");
    try {
      await updateEvaluationScores(id, payload, summary ?? undefined);
      toast.success("Đã lưu điểm — hệ thống tự tính lại điểm tổng.");
      reload();
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function runLifecycle(action: "submit" | "finalize" | "revise") {
    setBusy(action);
    try {
      if (action === "submit") {
        await submitEvaluation(id);
        toast.success("Đã nộp phiếu để chốt.");
      } else if (action === "finalize") {
        await finalizeEvaluation(id);
        toast.success("Đã chốt đánh giá — sinh viên được thông báo.");
      } else {
        await reviseEvaluation(id, {
          reason: reviseReason.trim(),
          summary: summary ?? undefined,
        });
        toast.success("Đã ghi nhận yêu cầu điều chỉnh.");
      }
      setConfirmAction(null);
      setReviseReason("");
      reload();
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function runAiSuggest() {
    setBusy("ai");
    try {
      const created = await generateEvaluationAiSuggestion(id);
      toast.success("AI đã trả lời gợi ý mới.");
      suggestions.reload();
      setFocusedSuggestion(created);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function openSuggestionDetail(suggestionId: string) {
    setBusy(`sug-${suggestionId}`);
    try {
      const detail = await getEvaluationAiSuggestion(id, suggestionId);
      setFocusedSuggestion(detail);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
        {error ? (
          <>
            <DialogHeader><DialogTitle>Không tải được phiếu</DialogTitle></DialogHeader>
            <SectionError message={error} onRetry={reload} />
          </>
        ) : loading || !data ? (
          <>
            <DialogHeader><DialogTitle>Đang tải phiếu…</DialogTitle></DialogHeader>
            <PencilLines rows={4} />
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <InkBadge tone={EVAL_STATUS_META[data.evaluation.status]?.tone ?? "neutral"} dot>
                  {EVAL_STATUS_META[data.evaluation.status]?.label ?? data.evaluation.status}
                </InkBadge>
                <span className="font-geist-mono text-[0.66rem] text-[var(--ink-soft)]">
                  {shortId(data.evaluation.internId)}
                </span>
                {data.evaluation.revisionNumber !== null && data.evaluation.revisionNumber > 0 && (
                  <InkBadge tone="amber">điều chỉnh lần {data.evaluation.revisionNumber}</InkBadge>
                )}
              </div>
              <DialogTitle className="mt-1.5">
                Chấm phiếu {data.evaluation.overallScore !== null ? `· tổng ${data.evaluation.overallScore.toLocaleString("vi-VN")}` : ""}
              </DialogTitle>
              <DialogDescription>
                Nộp {data.evaluation.submittedAt ? formatDateTimeVN(data.evaluation.submittedAt) : "—"} ·
                Chốt {data.evaluation.finalizedAt ? formatDateTimeVN(data.evaluation.finalizedAt) : "—"}
              </DialogDescription>
            </DialogHeader>

            {locked && (
              <div className="flex items-center gap-3 rounded-[10px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_25%,transparent)] p-3">
                <StampMoc tone="blue" rotate={-7}>Đã chốt</StampMoc>
                <p className="text-[0.78rem] text-[var(--ink-soft)]">
                  Phiếu đã khóa. Chỉ có thể tạo yêu cầu điều chỉnh đặc biệt (chính sách quản trị).
                </p>
              </div>
            )}

            {/* Biểu mẫu chấm */}
            {criteria.loading ? (
              <PencilLines rows={3} />
            ) : criteria.error ? (
              <SectionError message={criteria.error} onRetry={criteria.reload} />
            ) : criteriaList.length === 0 ? (
              <EmptyState icon={VInbox} title="Kỳ này chưa có tiêu chí" note="Tiêu chí do quản trị cấu hình cho từng kỳ đánh giá." />
            ) : (
              <section aria-label="Chấm điểm theo tiêu chí" className="space-y-2.5">
                {criteriaList.map((c) => {
                  const draft = drafts?.[c.id];
                  return (
                    <SketchCard key={c.id} hover={false} className="space-y-2 p-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold">{c.name}</p>
                        <InkBadge tone="blue">trọng số {c.weight.toLocaleString("vi-VN")}%</InkBadge>
                        {c.isRequired && <InkBadge tone="amber">bắt buộc</InkBadge>}
                        <span className="ml-auto font-geist-mono text-[0.64rem] text-[var(--ink-soft)]">{c.code}</span>
                      </div>
                      {c.description && <p className="text-[0.74rem] text-[var(--ink-soft)]">{c.description}</p>}
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-2">
                          <label className="sr-only" htmlFor={`score-${c.id}`}>Điểm tiêu chí {c.name}</label>
                          <SketchInput
                            id={`score-${c.id}`}
                            type="number"
                            min={0}
                            max={c.maxScore}
                            disabled={locked}
                            value={draft?.score ?? ""}
                            onChange={(e) =>
                              setDrafts((prev) =>
                                prev ? { ...prev, [c.id]: { score: e.target.value, comment: prev[c.id]?.comment ?? "" } } : prev,
                              )
                            }
                            className="w-24"
                            placeholder="0"
                          />
                          <span className="text-[0.72rem] text-[var(--ink-soft)]">/ {c.maxScore}</span>
                        </div>
                        <div className="flex-1">
                          <label className="sr-only" htmlFor={`comment-${c.id}`}>Nhận xét tiêu chí {c.name}</label>
                          <SketchInput
                            id={`comment-${c.id}`}
                            disabled={locked}
                            value={draft?.comment ?? ""}
                            onChange={(e) =>
                              setDrafts((prev) =>
                                prev ? { ...prev, [c.id]: { score: prev[c.id]?.score ?? "", comment: e.target.value } } : prev,
                              )
                            }
                            placeholder="Nhận xét cho tiêu chí này…"
                          />
                        </div>
                      </div>
                    </SketchCard>
                  );
                })}

                <div className="space-y-1">
                  <label className="text-xs font-bold" htmlFor="ev-summary">Tổng kết phiếu</label>
                  <SketchTextarea
                    id="ev-summary"
                    rows={2}
                    disabled={locked}
                    value={summary ?? ""}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Điểm mạnh, điểm cần cải thiện, định hướng tiếp theo…"
                  />
                </div>

                {!locked && (
                  <div className="flex flex-wrap items-center gap-2">
                    <InkButton variant="outline" size="sm" disabled={busy !== null} onClick={runSave}>
                      <VCheck size={14} /> {busy === "save" ? "Đang lưu…" : "Lưu điểm"}
                    </InkButton>
                    {data.evaluation.status === "draft" && (
                      <InkButton variant="royal" size="sm" disabled={busy !== null} onClick={() => setConfirmAction("submit")}>
                        Nộp phiếu
                      </InkButton>
                    )}
                    {data.evaluation.status === "submitted" && (
                      <InkButton variant="royal" size="sm" disabled={busy !== null} onClick={() => setConfirmAction("finalize")}>
                        Chốt đánh giá
                      </InkButton>
                    )}
                  </div>
                )}
                {locked && (
                  <InkButton variant="outline" size="sm" disabled={busy !== null} onClick={() => setConfirmAction("revise")}>
                    <VRefresh size={14} /> Yêu cầu điều chỉnh đặc biệt
                  </InkButton>
                )}
              </section>
            )}

            {/* AI assist */}
            <section aria-label="Trợ lý AI chấm điểm" className="sketch-border-thin space-y-2.5 bg-[var(--paper)] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="eyebrow flex items-center gap-1.5"><VBot size={14} /> Trợ lý AI gợi ý chấm</p>
                <span className="ml-auto">
                  <InkButton
                    variant="outline"
                    size="sm"
                    disabled={busy !== null || data.evaluation.status !== "draft"}
                    onClick={runAiSuggest}
                  >
                    <VSparkles size={14} /> {busy === "ai" ? "AI đang soạn…" : "Xin gợi ý AI"}
                  </InkButton>
                </span>
              </div>
              {data.evaluation.status !== "draft" && (
                <p className="text-[0.72rem] text-[var(--ink-soft)]">
                  AI chỉ gợi ý cho phiếu nháp — gợi ý mang tính tham khảo, không tự ghi điểm.
                </p>
              )}
              <MarginNote>AI giới hạn 5-15 lượt/phút — tránh bấm liên tục, chờ phản hồi xong.</MarginNote>
              {suggestions.loading ? (
                <PencilLines rows={2} />
              ) : suggestions.error ? (
                <p className="text-xs text-[var(--danger)]">{suggestions.error}</p>
              ) : !suggestions.data || suggestions.data.items.length === 0 ? (
                <p className="text-xs text-[var(--ink-soft)]">Chưa có gợi ý nào cho phiếu này.</p>
              ) : (
                <ul className="max-h-44 space-y-1.5 overflow-y-auto">
                  {suggestions.data.items.map((sug) => (
                    <li key={sug.id}>
                      <button
                        type="button"
                        onClick={() => openSuggestionDetail(sug.id)}
                        className={cn(
                          "focus-ink flex w-full flex-wrap items-center gap-2 rounded-[9px] border-[1.5px] px-2.5 py-1.5 text-left text-[0.76rem] transition-colors",
                          focusedSuggestion?.id === sug.id
                            ? "border-[var(--ink)] bg-[var(--blue-mist)]"
                            : "border-[color-mix(in_srgb,var(--ink)_20%,transparent)] hover:bg-[var(--blue-mist)]",
                        )}
                      >
                        <InkBadge tone={sug.status === "generated" ? "green" : "neutral"} dot>{sug.status}</InkBadge>
                        <span>{sug.criterionSuggestions.length} tiêu chí gợi ý</span>
                        <span className="ml-auto text-[var(--ink-soft)]">
                          {sug.generatedAt ? formatDateTimeVN(sug.generatedAt) : "—"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {focusedSuggestion && (
                <div className="space-y-2 rounded-[10px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)] p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[0.8rem] font-bold">Gợi ý chi tiết</p>
                    {focusedSuggestion.confidence !== null && (
                      <InkBadge tone="blue">độ tin cậy {(focusedSuggestion.confidence * 100).toFixed(0)}%</InkBadge>
                    )}
                    {!locked && (
                      <span className="ml-auto">
                        <InkButton variant="royal" size="sm" onClick={() => applySuggestion(focusedSuggestion)}>
                          Áp dụng điểm gợi ý
                        </InkButton>
                      </span>
                    )}
                  </div>
                  <ul className="space-y-1">
                    {focusedSuggestion.criterionSuggestions.map((cs) => {
                      const criterion = criteriaList.find((c) => c.code === cs.criterionCode);
                      return (
                        <li key={cs.criterionCode} className="rounded-[8px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_18%,transparent)] p-2 text-[0.74rem]">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold">{criterion?.name ?? cs.criterionCode}</span>
                            <InkBadge tone="amber">{cs.suggestedScore.toLocaleString("vi-VN")} điểm</InkBadge>
                          </div>
                          {cs.comment && <p className="mt-0.5 text-[var(--ink-soft)]">{cs.comment}</p>}
                          {cs.evidence.length > 0 && (
                            <p className="mt-0.5 text-[0.68rem] text-[var(--ink-soft)]">Bằng chứng: {cs.evidence.join(" · ")}</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {focusedSuggestion.strengths.length > 0 && (
                    <p className="text-[0.74rem]"><b>Điểm mạnh:</b> {focusedSuggestion.strengths.join(", ")}</p>
                  )}
                  {focusedSuggestion.improvementAreas.length > 0 && (
                    <p className="text-[0.74rem]"><b>Cần cải thiện:</b> {focusedSuggestion.improvementAreas.join(", ")}</p>
                  )}
                  {focusedSuggestion.summary && (
                    <p className="font-hand text-[0.9rem] text-[var(--ink-soft)]">{focusedSuggestion.summary}</p>
                  )}
                </div>
              )}
            </section>
          </>
        )}

        {/* Xác nhận lifecycle */}
        <Dialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
          <DialogContent className="sm:max-w-md">
            {confirmAction === "revise" ? (
              <>
                <DialogHeader>
                  <DialogTitle>Yêu cầu điều chỉnh đặc biệt</DialogTitle>
                  <DialogDescription>
                    Dành cho chính sách quản trị: phiếu vẫn ở trạng thái đã chốt, số lần điều chỉnh tăng lên và lưu vết lý do.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold" htmlFor="revise-reason">Lý do (tối thiểu 10 ký tự) *</label>
                    <SketchTextarea id="revise-reason" rows={3} value={reviseReason} onChange={(e) => setReviseReason(e.target.value)} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <InkButton variant="ghost" size="sm" onClick={() => setConfirmAction(null)}>Hủy</InkButton>
                    <InkButton
                      variant="royal"
                      size="sm"
                      disabled={busy !== null || reviseReason.trim().length < 10}
                      onClick={() => runLifecycle("revise")}
                    >
                      <VCheck size={14} /> Gửi yêu cầu
                    </InkButton>
                  </div>
                </div>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {confirmAction === "submit" ? "Nộp phiếu này?" : "Chốt đánh giá này?"}
                  </DialogTitle>
                  <DialogDescription>
                    {confirmAction === "submit"
                      ? "Hệ thống sẽ kiểm tra đủ tiêu chí bắt buộc và tổng trọng số bằng 100% trước khi chấp nhận."
                      : "Sau khi chốt, phiếu bị khóa và sinh viên nhận thông báo kèm kết quả. Hành động được ghi nhật ký."}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2">
                  <InkButton variant="ghost" size="sm" onClick={() => setConfirmAction(null)}>Hủy</InkButton>
                  <InkButton
                    variant="royal"
                    size="sm"
                    disabled={busy !== null}
                    onClick={() => confirmAction && runLifecycle(confirmAction)}
                  >
                    <VCheck size={14} /> Xác nhận
                  </InkButton>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------- code review ------------------------------ */

function CodeReviewDialog({
  initialTaskId,
  onClose,
}: {
  initialTaskId: string;
  onClose: () => void;
}) {
  const [taskId, setTaskId] = useState(initialTaskId);
  const [submittedTaskId, setSubmittedTaskId] = useState<string | null>(initialTaskId || null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submissions = useApi(
    () => (submittedTaskId ? listTaskSubmissions(submittedTaskId) : Promise.resolve([])),
    [submittedTaskId],
  );
  const reviews = useApi(
    () => (submissionId ? listCodeReviews(submissionId) : Promise.resolve([])),
    [submissionId],
  );

  async function runReview() {
    if (!submissionId) return;
    setBusy(true);
    try {
      await runCodeReview(submissionId);
      toast.success("Đã kích hoạt review tự động cho bài nộp.");
      reviews.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Code review bài nộp</DialogTitle>
          <DialogDescription>
            Nhập mã nhiệm vụ (UUID) để liệt kê bài nộp, chọn một bài và xem hoặc kích hoạt review tự động.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <VSearch size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]" />
              <SketchInput
                aria-label="Mã nhiệm vụ (UUID)"
                className="pl-9"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                placeholder="UUID nhiệm vụ, VD: 3df91060-…"
              />
            </div>
            <InkButton variant="royal" size="sm" onClick={() => { setSubmittedTaskId(taskId.trim() || null); setSubmissionId(null); }}>
              <VSearch size={14} /> Liệt kê bài nộp
            </InkButton>
          </div>

          {submissions.loading ? (
            <PencilLines rows={2} />
          ) : submissions.error ? (
            <SectionError message={submissions.error} onRetry={submissions.reload} />
          ) : !submittedTaskId ? (
            <p className="text-xs text-[var(--ink-soft)]">Chưa nhập mã nhiệm vụ.</p>
          ) : !submissions.data || submissions.data.length === 0 ? (
            <EmptyState icon={VInbox} title="Nhiệm vụ chưa có bài nộp" note="Sinh viên chưa nộp bài cho nhiệm vụ này." />
          ) : (
            <div className="space-y-1.5">
              <p className="eyebrow">Bài nộp của nhiệm vụ</p>
              <ul className="max-h-40 space-y-1 overflow-y-auto">
                {submissions.data.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSubmissionId(s.id)}
                      className={cn(
                        "focus-ink flex w-full flex-wrap items-center gap-2 rounded-[9px] border-[1.5px] px-2.5 py-1.5 text-left text-[0.76rem] transition-colors",
                        submissionId === s.id
                          ? "border-[var(--ink)] bg-[var(--blue-mist)]"
                          : "border-[color-mix(in_srgb,var(--ink)_20%,transparent)] hover:bg-[var(--blue-mist)]",
                      )}
                    >
                      <InkBadge tone={s.status === "approved" ? "green" : s.status === "pending" ? "amber" : "neutral"} dot>
                        {s.status}
                      </InkBadge>
                      <span className="font-geist-mono text-[0.64rem] text-[var(--ink-soft)]">{s.headSha?.slice(0, 8) ?? "—"}</span>
                      <span className="ml-auto text-[var(--ink-soft)]">
                        {s.submittedAt ? formatDateTimeVN(s.submittedAt) : "—"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {submissionId && (
            <section aria-label="Danh sách review" className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="eyebrow">Review của bài nộp ({reviews.data?.length ?? 0})</p>
                <span className="ml-auto">
                  <InkButton variant="royal" size="sm" disabled={busy} onClick={runReview}>
                    <VBot size={14} /> {busy ? "Đang chạy…" : "Chạy review AI"}
                  </InkButton>
                </span>
              </div>
              <MarginNote>Review AI chỉ mang tính tham khảo — giảng viên quyết định điểm cuối cùng.</MarginNote>
              {reviews.loading ? (
                <PencilLines rows={2} />
              ) : reviews.error ? (
                <SectionError message={reviews.error} onRetry={reviews.reload} />
              ) : !reviews.data || reviews.data.length === 0 ? (
                <EmptyState icon={VInbox} title="Chưa có review nào" note="Bấm 'Chạy review AI' để kích hoạt review tự động cho bài nộp này." />
              ) : (
                <ul className="max-h-64 space-y-2 overflow-y-auto">
                  {reviews.data.map((r) => (
                    <li key={r.id} className="rounded-[9px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_22%,transparent)] p-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <InkBadge tone={r.status === "ready" || r.status === "approved" ? "green" : r.status === "inconclusive" ? "amber" : "neutral"} dot>
                          {r.status}
                        </InkBadge>
                        {r.score !== null && <InkBadge tone="blue">{r.score.toLocaleString("vi-VN")} điểm AI</InkBadge>}
                        <span className="ml-auto text-[0.68rem] text-[var(--ink-soft)]">
                          {r.completedAt ? formatDateTimeVN(r.completedAt) : "đang chạy"}
                        </span>
                      </div>
                      {r.summary && <p className="mt-1 text-[0.76rem]">{r.summary}</p>}
                      {Object.keys(r.rubric).length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {Object.entries(r.rubric).map(([key, value]) => (
                            <span key={key} className="rounded-full border-[1.5px] border-[color-mix(in_srgb,var(--ink)_24%,transparent)] px-2 py-0.5 text-[0.64rem] font-semibold tabular">
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      )}
                      {r.limitations.length > 0 && (
                        <p className="mt-1 text-[0.68rem] text-[var(--ink-soft)]">Giới hạn: {r.limitations.join(" · ")}</p>
                      )}
                      {r.errorCode && <p className="mt-1 text-[0.68rem] text-[var(--danger)]">Lỗi: {r.errorCode}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* =====================================================================
 * TAB KỲ ĐÁNH GIÁ
 * ===================================================================== */

function CyclesTab() {
  const { data, loading, error, reload } = useApi(() => listEvaluationCycles(1, 50), []);
  const [detailId, setDetailId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {error ? (
        <SectionError message={error} onRetry={reload} />
      ) : loading ? (
        <PencilLines rows={4} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={VClipboardCheck}
          title="Chưa có kỳ đánh giá nào"
          note="Kỳ đánh giá do quản trị tạo cho từng phiên/dự án. Bạn sẽ thấy các kỳ thuộc phạm vi mình quản lý."
        />
      ) : (
        <SketchCard hover={false} className="overflow-hidden p-0">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--paper-raised)]">
                <tr className="font-geist-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                  <th className="px-3 py-2.5">Kỳ</th>
                  <th className="px-3 py-2.5">Loại</th>
                  <th className="px-3 py-2.5">Trạng thái</th>
                  <th className="px-3 py-2.5">Thời gian</th>
                  <th className="px-3 py-2.5" aria-label="Thao tác" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => (
                  <tr
                    key={c.id}
                    className="cursor-pointer border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_14%,transparent)] transition-colors hover:bg-[var(--blue-mist)]"
                    onClick={() => setDetailId(c.id)}
                  >
                    <td className="px-3 py-2.5">
                      <p className="font-bold leading-tight">{c.name}</p>
                      <p className="font-geist-mono text-[0.66rem] text-[var(--ink-soft)]">{c.code}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <InkBadge tone="blue">{c.type || "—"}</InkBadge>
                    </td>
                    <td className="px-3 py-2.5">
                      <InkBadge tone={CYCLE_STATUS_META[c.status]?.tone ?? "neutral"} dot>
                        {CYCLE_STATUS_META[c.status]?.label ?? c.status}
                      </InkBadge>
                    </td>
                    <td className="px-3 py-2.5 text-[0.72rem] tabular text-[var(--ink-soft)]">
                      {c.startDate ? formatDateVN(c.startDate) : "?"} → {c.endDate ? formatDateVN(c.endDate) : "?"}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <InkButton variant="outline" size="sm" onClick={() => setDetailId(c.id)}>
                        Tiêu chí
                      </InkButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SketchCard>
      )}
      {detailId && <CycleDetailDialog id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

function CycleDetailDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const cycles = useApi(() => listEvaluationCycles(1, 50), []);
  const criteria = useApi(() => listCycleCriteria(id), [id]);
  const cycle = cycles.data?.items.find((c) => c.id === id) ?? null;
  const totalWeight = (criteria.data ?? []).reduce((sum, c) => sum + c.weight, 0);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            {cycle && (
              <InkBadge tone={CYCLE_STATUS_META[cycle.status]?.tone ?? "neutral"} dot>
                {CYCLE_STATUS_META[cycle.status]?.label ?? cycle.status}
              </InkBadge>
            )}
            {cycle && <InkBadge tone="blue">{cycle.type}</InkBadge>}
          </div>
          <DialogTitle className="mt-1.5">{cycle?.name ?? "Kỳ đánh giá"}</DialogTitle>
          <DialogDescription>
            {cycle ? `${cycle.code} · ${cycle.startDate ? formatDateVN(cycle.startDate) : "?"} → ${cycle.endDate ? formatDateVN(cycle.endDate) : "?"}` : id}
          </DialogDescription>
        </DialogHeader>
        {criteria.loading ? (
          <PencilLines rows={3} />
        ) : criteria.error ? (
          <SectionError message={criteria.error} onRetry={criteria.reload} />
        ) : !criteria.data || criteria.data.length === 0 ? (
          <EmptyState icon={VInbox} title="Kỳ này chưa có tiêu chí" note="Tiêu chí do quản trị cấu hình cho kỳ." />
        ) : (
          <section aria-label="Tiêu chí kỳ đánh giá" className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="eyebrow">Tiêu chí ({criteria.data.length})</p>
              <InkBadge tone={totalWeight === 100 ? "green" : "amber"}>
                tổng trọng số {totalWeight.toLocaleString("vi-VN")}%
              </InkBadge>
            </div>
            <ul className="max-h-72 space-y-1.5 overflow-y-auto">
              {criteria.data.map((c) => (
                <li key={c.id} className="rounded-[9px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_22%,transparent)] p-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[0.82rem] font-bold">{c.name}</p>
                    <InkBadge tone="blue">{c.weight.toLocaleString("vi-VN")}%</InkBadge>
                    <InkBadge tone="neutral">tối đa {c.maxScore.toLocaleString("vi-VN")}</InkBadge>
                    {c.isRequired && <InkBadge tone="amber">bắt buộc</InkBadge>}
                  </div>
                  {c.description && <p className="mt-0.5 text-[0.72rem] text-[var(--ink-soft)]">{c.description}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* =====================================================================
 * TAB REVIEW NHẬP NGOÀI
 * ===================================================================== */

function ImportedTab() {
  const { data, loading, error, reload } = useApi(() => listImportedReviews(), []);
  const [editing, setEditing] = useState<{ id: string; draft: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function runUpdate() {
    if (!editing) return;
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(editing.draft) as Record<string, unknown>;
    } catch {
      toast.error("Nội dung chưa phải JSON hợp lệ.");
      return;
    }
    setBusy(true);
    try {
      await updateImportedReview(editing.id, body);
      toast.success("Đã cập nhật review nhập ngoài.");
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <SectionError message={error} onRetry={reload} />
      ) : loading ? (
        <PencilLines rows={3} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={VInbox}
          title="Chưa có review nhập ngoài"
          note="Đây là các nhận xét được nhập từ nguồn ngoài hệ thống (QA hiện chưa có dữ liệu)."
        />
      ) : (
        <div className="space-y-2">
          {data.items.map((r) => (
            <SketchCard key={r.id} hover={false} className="space-y-2 p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-geist-mono text-[0.66rem] text-[var(--ink-soft)]">{r.id}</span>
                <span className="ml-auto">
                  <InkButton
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing({ id: r.id, draft: JSON.stringify(r.raw, null, 2) })}
                  >
                    <VExternal size={13} /> Cập nhật
                  </InkButton>
                </span>
              </div>
              <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded-[8px] bg-[var(--paper-raised)] p-2 font-geist-mono text-[0.66rem]">
                {JSON.stringify(r.raw, null, 2)}
              </pre>
            </SketchCard>
          ))}
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cập nhật review nhập ngoài</DialogTitle>
            <DialogDescription>Chỉnh JSON rồi lưu — hệ thống ghi nhận thay đổi.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <SketchTextarea
              aria-label="Nội dung review (JSON)"
              rows={10}
              value={editing?.draft ?? ""}
              onChange={(e) => setEditing((prev) => (prev ? { ...prev, draft: e.target.value } : prev))}
              className="font-geist-mono text-[0.72rem]"
            />
            <div className="flex justify-end gap-2">
              <InkButton variant="ghost" size="sm" onClick={() => setEditing(null)}>Hủy</InkButton>
              <InkButton variant="royal" size="sm" disabled={busy} onClick={runUpdate}>
                <VCheck size={14} /> {busy ? "Đang lưu…" : "Lưu"}
              </InkButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
