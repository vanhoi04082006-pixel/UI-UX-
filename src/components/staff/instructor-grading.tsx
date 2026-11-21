"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  VBot,
  VCheckCheck,
  VCircleCheck,
  VClock,
  VEdit,
  VGitPullRequest,
  VPlus,
  VX,
} from "@/components/icons/v-icons";
import { FadeIn, InkButton } from "@/components/notebook/reveal";
import {
  CodeChip,
  EmptyState,
  ErrorState,
  FilterChips,
  InitialDot,
  PageHeading,
  SkeletonBlock,
} from "@/components/staff/instructor-shared";
import { InkBadge, MarginNote, SketchCard, StampMoc, formatDateTimeVN } from "@/components/notebook/ui";
import { useApi } from "@/lib/use-api";
import { listSubmissions, reviewSubmission } from "@/lib/api/instructor";
import type { GradingItem } from "@/lib/mock/types";

/* =====================================================================
 * CHẤM BÀI — AI chấm nháp trước, giảng viên chốt điểm chính thức.
 * ===================================================================== */

type GradingFilter = "pending" | "approved" | "changes" | "all";
type GradingRow = GradingItem & { finalScore?: number };

const STATUS_META: Record<GradingItem["status"], { label: string; tone: string }> = {
  pending: { label: "Chờ duyệt", tone: "amber" },
  approved: { label: "Đã duyệt", tone: "green" },
  changes: { label: "Cần sửa", tone: "red" },
};

function aiTone(score: number): string {
  if (score >= 8) return "green";
  if (score >= 6.5) return "amber";
  return "red";
}

export default function InstructorGrading() {
  const { data, loading, error, reload } = useApi<GradingItem[]>(listSubmissions);

  /** Ghi đè cục bộ sau khi chấm — không đụng vào dữ liệu gốc từ API. */
  const [overrides, setOverrides] = useState<Record<string, { status: GradingItem["status"]; finalScore?: number }>>({});

  const [filter, setFilter] = useState<GradingFilter>("pending");
  const [activeId, setActiveId] = useState<string | null>(null);

  const [score, setScore] = useState("");
  const [comment, setComment] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [stamping, setStamping] = useState(false);
  const stampTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Gói confetti bung khi duyệt xong bài (JS thêm class `play`). */
  const approveBurstRef = useRef<HTMLSpanElement>(null);

  /** Mục "yêu cầu sửa": mở vùng nhập lý do trước khi chốt. */
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (stampTimer.current) clearTimeout(stampTimer.current);
    };
  }, []);

  const rows: GradingRow[] = (data ?? []).map((r) => (overrides[r.id] ? { ...r, ...overrides[r.id] } : r));
  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);
  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const active = rows.find((r) => r.id === activeId) ?? null;

  function openGrading(row: GradingRow) {
    setActiveId(row.id);
    setScore(row.aiScore.toFixed(1));
    setComment("");
    setFormError(null);
    setStamping(false);
    setReasonOpen(false);
    setReason("");
    setReasonError(null);
  }

  function closeDialog() {
    if (stampTimer.current) clearTimeout(stampTimer.current);
    approveBurstRef.current?.classList.remove("play");
    setStamping(false);
    setReasonOpen(false);
    setReason("");
    setReasonError(null);
    setActiveId(null);
  }

  function applyStatus(id: string, patch: { status: GradingItem["status"]; finalScore?: number }) {
    setOverrides((prev) => ({ ...prev, [id]: patch }));
  }

  /** Bước ± 0,25 điểm cho ô điểm — kẹp trong khoảng 0–10. */
  function stepScore(delta: number) {
    const cur = Number(score.replace(",", "."));
    const base = Number.isFinite(cur) ? Math.min(10, Math.max(0, cur)) : 0;
    const next = Math.min(10, Math.max(0, base + delta));
    setScore(String(Number(next.toFixed(2))));
  }

  function approve() {
    if (!active) return;
    const num = Number(score.replace(",", "."));
    if (!Number.isFinite(num) || num < 0 || num > 10) {
      setFormError("Điểm phải nằm trong khoảng 0 đến 10.");
      return;
    }
    if (comment.trim().length < 10) {
      setFormError("Nhận xét ít nhất 10 ký tự — sinh viên cần biết vì sao.");
      return;
    }
    setFormError(null);
    setStamping(true);
    approveBurstRef.current?.classList.add("play");
    const student = active.student;
    const finalScore = Math.round(num * 10) / 10;
    stampTimer.current = setTimeout(() => {
      applyStatus(active.id, { status: "approved", finalScore });
      closeDialog();
      toast.success(`Đã chốt ${finalScore.toFixed(1)} cho ${student}`);
      /* Ghi điểm chốt lên server qua adapter — UI optimistic giữ nguyên như cũ. */
      reviewSubmission(active.id, "approved", finalScore, comment.trim()).catch(() => undefined);
    }, 700);
  }

  function requestChanges() {
    if (!active) return;
    // Bấm lần đầu: mở vùng lý do để giảng viên nêu rõ điều cần sửa.
    setReason("");
    setReasonError(null);
    setReasonOpen(true);
  }

  function confirmRequestChanges() {
    if (!active) return;
    if (reason.trim().length < 10) {
      setReasonError("Lý do cần tối thiểu 10 ký tự — sinh viên phải biết sửa gì.");
      return;
    }
    setReasonError(null);
    applyStatus(active.id, { status: "changes" });
    closeDialog();
    const short = reason.trim().slice(0, 60);
    toast.info(`Đã gửi yêu cầu sửa: ${short}${reason.trim().length > 60 ? "…" : ""}`);
    /* Ghi yêu cầu sửa lên server qua adapter — fire-and-forget như hành vi cũ. */
    reviewSubmission(active.id, "changes", active.aiScore, reason.trim()).catch(() => undefined);
  }

  if (error) {
    return (
      <div className="space-y-5">
        <PageHeading eyebrow="Sổ tay hành trình · Giảng viên" title="Chấm bài" />
        <ErrorState message={error} onRetry={reload} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeading eyebrow="Sổ tay hành trình · Giảng viên" title="Chấm bài">
        <InkBadge tone="amber" dot>
          {pendingCount} bài chờ duyệt
        </InkBadge>
        <InkBadge tone="neutral">
          <VClock size={13} /> 48h khuyến nghị
        </InkBadge>
      </PageHeading>

      <MarginNote>AI chấm nháp trước — bạn là người chốt điểm chính thức</MarginNote>

      <FilterChips
        ariaLabel="Lọc bài nộp theo trạng thái"
        value={filter}
        onChange={setFilter}
        options={[
          { key: "pending", label: "Chờ duyệt", count: rows.filter((r) => r.status === "pending").length },
          { key: "approved", label: "Đã duyệt", count: rows.filter((r) => r.status === "approved").length },
          { key: "changes", label: "Cần sửa", count: rows.filter((r) => r.status === "changes").length },
          { key: "all", label: "Tất cả", count: rows.length },
        ]}
      />

      {loading && !data ? (
        <SkeletonBlock className="h-72" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={VCheckCheck}
          title="Không có bài nào ở đây"
          hint="Hàng chờ trống — thử đổi bộ lọc hoặc quay lại sau."
        />
      ) : (
        <FadeIn>
          <SketchCard hover={false} className="overflow-x-auto p-0">
            <table className="ink-table min-w-[56rem]">
              <caption className="sr-only">Hàng chờ chấm bài của giảng viên</caption>
              <thead>
                <tr>
                  <th scope="col">Bài nộp</th>
                  <th scope="col">Sinh viên</th>
                  <th scope="col">Nộp lúc</th>
                  <th scope="col">Điểm AI</th>
                  <th scope="col">PR</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col" className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="flex flex-col gap-1">
                        <CodeChip>{r.taskCode}</CodeChip>
                        <span className="max-w-[16rem] truncate text-[0.76rem] text-[var(--ink-soft)]">
                          {r.taskTitle}
                        </span>
                      </span>
                    </td>
                    <td>
                      <span className="flex items-center gap-2 font-semibold">
                        <InitialDot name={r.student} />
                        {r.student}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-[0.78rem] text-[var(--ink-soft)] tabular">
                      {formatDateTimeVN(r.submittedAt)}
                    </td>
                    <td>
                      <span className="flex flex-col items-start gap-1.5">
                        <InkBadge tone={aiTone(r.aiScore)} className="tabular">
                          {r.aiScore.toFixed(1)}
                        </InkBadge>
                        {/* Spark-bar tí hon: điểm AI trên thang 10 */}
                        <span
                          aria-hidden="true"
                          title={`Điểm AI ${r.aiScore.toFixed(1)}/10`}
                          className="inline-flex h-[7px] w-12 overflow-hidden rounded-[3px_3px_1px_1px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_35%,transparent)] bg-[var(--paper)]"
                        >
                          <span className="spark-bar block h-full" style={{ width: `${Math.round(r.aiScore * 10)}%` }} />
                        </span>
                      </span>
                    </td>
                    <td>
                      <a
                        href={r.prLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Mở pull request của ${r.student} (bài ${r.taskCode})`}
                        className="link-chip focus-ink"
                      >
                        <VGitPullRequest size={13} aria-hidden="true" /> PR
                      </a>
                    </td>
                    <td>
                      <span className="flex flex-col items-start gap-1">
                        <span className="flex items-center gap-1.5">
                          <InkBadge tone={STATUS_META[r.status].tone} dot>
                            {STATUS_META[r.status].label}
                          </InkBadge>
                          {r.status === "approved" && (
                            <VCircleCheck
                              size={15}
                              aria-hidden="true"
                              className="draw-check shrink-0 text-[var(--success)]"
                            />
                          )}
                        </span>
                        {r.status === "approved" && typeof r.finalScore === "number" && (
                          <InkBadge tone="mint" className="tabular">
                            chốt {r.finalScore.toFixed(1)}
                          </InkBadge>
                        )}
                      </span>
                    </td>
                    <td className="text-right">
                      <InkButton
                        variant="royal"
                        size="sm"
                        onClick={() => openGrading(r)}
                        disabled={r.status !== "pending"}
                        aria-label={
                          r.status === "pending"
                            ? `Chấm bài ${r.taskCode} của ${r.student}`
                            : `Bài ${r.taskCode} đã xử lý`
                        }
                      >
                        Chấm
                      </InkButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SketchCard>
        </FadeIn>
      )}

      {/* ===== Dialog chấm bài ===== */}
      <Dialog open={!!active} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
          {active && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CodeChip className="!text-[0.72rem]">{active.taskCode}</CodeChip>
                  <InkBadge tone={STATUS_META[active.status].tone} dot>
                    {STATUS_META[active.status].label}
                  </InkBadge>
                </div>
                <DialogTitle className="mt-1.5 leading-snug">{active.taskTitle}</DialogTitle>
                <DialogDescription>
                  Nộp lúc {formatDateTimeVN(active.submittedAt)} · sinh viên {active.student}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Đề xuất AI — tem mộc xanh nhỏ đính góc */}
                <div className="relative rounded-[10px_12px_10px_12px] border-2 border-[var(--ink)] bg-[var(--blue-mist)] p-4">
                  <span className="absolute -top-3.5 right-3">
                    <StampMoc tone="blue" rotate={5} className="!px-2 !py-0.5 !text-[0.7rem]">
                      AI ĐỀ XUẤT
                    </StampMoc>
                  </span>
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-[9px_11px_9px_11px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--royal)]"
                    >
                      <VBot size={19} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="eyebrow">Đề xuất của AI</p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold leading-none tabular">
                          {active.aiScore.toFixed(1)}
                        </span>
                        <span className="text-[0.78rem] font-bold text-[var(--ink-soft)]">/ 10 nháp</span>
                      </div>
                      <p className="mt-2 text-[0.82rem] leading-relaxed">{active.notes}</p>
                    </div>
                  </div>
                  <MarginNote className="mt-2">điểm AI chỉ để tham khảo</MarginNote>
                </div>

                <a
                  href={active.prLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-chip focus-ink"
                >
                  <VGitPullRequest size={13} aria-hidden="true" /> Mở pull request
                </a>

                {/* Điểm chính thức: ô điểm + nút bước ±0,25 + chip nhanh */}
                <div className="space-y-2">
                  <label htmlFor="grade-score" className="text-[0.82rem] font-bold">
                    Điểm chính thức <span className="font-normal text-[var(--ink-soft)]">(0 – 10)</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => stepScore(-0.25)}
                        disabled={stamping}
                        aria-label="Bớt 0,25 điểm"
                        className="focus-ink grid h-9 w-9 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] transition-all hover:-translate-y-0.5 hover:bg-[var(--blue-mist)] hover:text-[var(--royal)] disabled:opacity-50"
                      >
                        <VX size={13} />
                      </button>
                      <input
                        id="grade-score"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={10}
                        step={0.1}
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                        className="focus-ink sketch-border-thin w-24 bg-[var(--paper)] px-2 py-2 text-center text-2xl font-extrabold tabular [appearance:textfield] focus:outline-2 focus:outline-[var(--ink)] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => stepScore(0.25)}
                        disabled={stamping}
                        aria-label="Thêm 0,25 điểm"
                        className="focus-ink grid h-9 w-9 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] transition-all hover:-translate-y-0.5 hover:bg-[var(--blue-mist)] hover:text-[var(--royal)] disabled:opacity-50"
                      >
                        <VPlus size={13} />
                      </button>
                    </span>
                    {[
                      { label: "8.0", value: "8.0" },
                      { label: "8.5", value: "8.5" },
                      { label: "theo AI", value: active.aiScore.toFixed(1) },
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => setScore(chip.value)}
                        className="focus-ink rounded-full border-[1.5px] border-[color-mix(in_srgb,var(--ink)_32%,transparent)] bg-[var(--paper)] px-3 py-1 text-[0.72rem] font-bold transition-all hover:border-[var(--ink)] hover:bg-[var(--blue-mist)]"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nhận xét */}
                <div className="space-y-2">
                  <label htmlFor="grade-comment" className="text-[0.82rem] font-bold">
                    Nhận xét
                  </label>
                  <Textarea
                    id="grade-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    placeholder="Nhận xét giúp sinh viên biết mình làm tốt ở đâu và cần cải thiện gì..."
                    className="focus-ink resize-none"
                  />
                </div>

                {formError && (
                  <p key={formError} role="alert" className="animate-shake-ink text-[0.8rem] font-semibold text-[var(--danger)]">
                    {formError}
                  </p>
                )}

                {reasonOpen ? (
                  /* Vùng lý do yêu cầu sửa — xác nhận mới gửi cho sinh viên */
                  <div className="sketch-border-thin space-y-2.5 bg-[var(--paper)] p-3.5">
                    <p className="text-[0.82rem] font-bold">Lý do yêu cầu sửa</p>
                    <Textarea
                      aria-label="Lý do yêu cầu sửa"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      placeholder="Nêu rõ điều sinh viên cần sửa — có thể tham khảo góp ý của AI ở trên..."
                      className="focus-ink resize-none"
                    />
                    {reasonError && (
                      <p
                        key={reasonError}
                        role="alert"
                        className="animate-shake-ink text-[0.8rem] font-semibold text-[var(--danger)]"
                      >
                        {reasonError}
                      </p>
                    )}
                    <div className="flex flex-wrap justify-end gap-2.5">
                      <InkButton
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReasonOpen(false);
                          setReasonError(null);
                        }}
                      >
                        Huỷ
                      </InkButton>
                      <InkButton variant="outline" size="sm" onClick={confirmRequestChanges}>
                        <VEdit size={15} /> Gửi yêu cầu sửa
                      </InkButton>
                    </div>
                  </div>
                ) : (
                  <div className="relative flex flex-wrap justify-end gap-2.5">
                    {stamping && (
                      <span className="pointer-events-none absolute -top-9 right-2 z-10">
                        <StampMoc tone="red" rotate={-8}>
                          ĐÃ DUYỆT
                        </StampMoc>
                      </span>
                    )}
                    <InkButton variant="outline" size="sm" onClick={requestChanges} disabled={stamping}>
                      <VEdit size={15} /> Yêu cầu sửa
                    </InkButton>
                    <span ref={approveBurstRef} className="confetti-pop relative inline-flex">
                      <InkButton variant="royal" size="sm" onClick={approve} disabled={stamping}>
                        <VCheckCheck size={16} /> Duyệt — chốt điểm
                      </InkButton>
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
