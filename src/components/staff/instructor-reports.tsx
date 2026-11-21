"use client";

import { useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  VChevronRight,
  VDownload,
  VMedal,
  VStar,
  VTarget,
  VTrend,
  VUsers,
} from "@/components/icons/v-icons";
import { FadeIn } from "@/components/notebook/reveal";
import {
  ErrorState,
  MetricTile,
  MiniBar,
  PageHeading,
  SkeletonBlock,
  InitialDot,
} from "@/components/staff/instructor-shared";
import { InkBadge, MarginNote, NoteCard, SketchCard } from "@/components/notebook/ui";
import { useApi } from "@/lib/use-api";
import {
  downloadBlob,
  exportReportPdf,
  exportReportXlsx,
  getReport,
  listReports,
} from "@/lib/api/instructor";
import { errorMessage } from "@/lib/api/api-client";
import type { ReportDetail, ReportMember, ReportRow } from "@/lib/types";

/* =====================================================================
 * BÁO CÁO — danh sách report thật (GET /reports), chi tiết snapshot
 * (GET /reports/{id}) và xuất file PDF/XLSX thật từ BE.
 * ===================================================================== */

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function InstructorReports() {
  const { data, loading, error, reload } = useApi<ReportRow[]>(listReports);
  const reduced = useReducedMotion();

  const [detailId, setDetailId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  const detail = useApi<ReportDetail | null>(
    () => (detailId ? getReport(detailId) : Promise.resolve(null)),
    [detailId],
  );

  const rows = data ?? [];

  /* Tổng hợp thật từ snapshot chi tiết (chỉ tính thành viên có điểm). */
  const summary = useMemo(() => {
    const snap = detail.data;
    if (!snap || snap.members.length === 0) return null;
    const members = snap.members;
    const scored = members.filter((m) => m.averageEvaluationScore !== null);
    const avg = (pick: (m: ReportMember) => number | null) => {
      const vals = members.map(pick).filter((x): x is number => x !== null);
      return vals.length === 0 ? 0 : Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
    };
    return {
      members: members.length,
      avgScore: avg((m) => m.averageEvaluationScore),
      completion: Math.round(avg((m) => m.taskCompletionRate)),
      onTime: Math.round(avg((m) => m.onTimeCompletionRate)),
      submissions: members.reduce((s, m) => s + m.submissionCount, 0),
      scoredCount: scored.length,
    };
  }, [detail.data]);

  const topMemberName = useMemo(() => {
    const snap = detail.data;
    if (!snap) return null;
    const scored = snap.members.filter((m) => m.averageEvaluationScore !== null);
    if (scored.length === 0) return null;
    return scored.reduce((best, m) =>
      (m.averageEvaluationScore ?? 0) > (best.averageEvaluationScore ?? 0) ? m : best,
    ).displayName;
  }, [detail.data]);

  async function handleExport(row: ReportRow, kind: "pdf" | "xlsx") {
    if (exporting !== null) return;
    setExporting(`${row.id}:${kind}`);
    try {
      const blob =
        kind === "pdf" ? await exportReportPdf(row.id) : await exportReportXlsx(row.id);
      downloadBlob(blob, `bao-cao-${row.id.slice(0, 8)}.${kind}`);
      toast.success(kind === "pdf" ? "Đã tải báo cáo PDF" : "Đã tải báo cáo Excel");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setExporting(null);
    }
  }

  if (error) {
    return (
      <div className="space-y-5">
        <PageHeading eyebrow="Sổ tay hành trình · Giảng viên" title="Báo cáo" />
        <ErrorState message={error} onRetry={reload} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Sổ tay hành trình · Giảng viên"
        title="Báo cáo"
        sub="Báo cáo tiến độ từ hệ thống — xem chi tiết và tải PDF/Excel."
      />

      {loading && !data ? (
        <SkeletonBlock className="h-64" />
      ) : rows.length === 0 ? (
        <SketchCard hover={false} className="px-6 py-12 text-center">
          <p className="font-hand text-xl">Chưa có báo cáo nào được tạo</p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Báo cáo xuất hiện ở đây sau khi được tổng hợp cho phiên của bạn.
          </p>
        </SketchCard>
      ) : (
        <FadeIn>
          <SketchCard hover={false} className="overflow-x-auto p-0">
            <table className="ink-table min-w-[46rem]">
              <caption className="sr-only">Bảng báo cáo đã tổng hợp</caption>
              <thead>
                <tr>
                  <th scope="col">Báo cáo</th>
                  <th scope="col">Loại</th>
                  <th scope="col">Dự án</th>
                  <th scope="col">Ngày tạo</th>
                  <th scope="col" className="text-right">Tải / Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="sticker-pop transition-colors hover:bg-[var(--blue-mist)]">
                    <td>
                      <button
                        type="button"
                        onClick={() => setDetailId(r.id)}
                        aria-label={`Xem chi tiết báo cáo ${r.title}`}
                        className="link-chip focus-ink max-w-[22rem] truncate text-left font-semibold"
                      >
                        {r.title}
                      </button>
                    </td>
                    <td>
                      <InkBadge tone="amber">{r.kind}</InkBadge>
                    </td>
                    <td className="max-w-[14rem] truncate">{r.projectName}</td>
                    <td className="tabular">{formatDate(r.createdAt)}</td>
                    <td>
                      <span className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleExport(r, "pdf")}
                          disabled={exporting !== null}
                          aria-label={`Tải PDF báo cáo ${r.title}`}
                          className="focus-ink inline-grid h-9 w-9 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] transition-all hover:-translate-y-0.5 hover:bg-[var(--blue-mist)] hover:text-[var(--royal)] disabled:opacity-50"
                        >
                          <VDownload size={15} />
                          <span className="sr-only">(PDF)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExport(r, "xlsx")}
                          disabled={exporting !== null}
                          aria-label={`Tải Excel báo cáo ${r.title}`}
                          className="focus-ink inline-grid h-9 w-9 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] text-[0.62rem] font-extrabold transition-all hover:-translate-y-0.5 hover:bg-[var(--blue-mist)] hover:text-[var(--royal)] disabled:opacity-50"
                        >
                          XLS
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailId(r.id)}
                          aria-label={`Xem chi tiết báo cáo ${r.title}`}
                          className="focus-ink inline-grid h-9 w-9 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] transition-all hover:-translate-y-0.5 hover:bg-[var(--blue-mist)] hover:text-[var(--royal)]"
                        >
                          <VChevronRight size={16} />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SketchCard>
        </FadeIn>
      )}

      <MarginNote>snapshot chốt tại thời điểm tổng hợp — không đổi theo dữ liệu mới</MarginNote>

      {/* ===== Dialog chi tiết báo cáo ===== */}
      <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {detail.loading && !detail.data ? (
            <div className="space-y-3">
              <DialogHeader>
                <DialogTitle>Chi tiết báo cáo</DialogTitle>
              </DialogHeader>
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-40" />
            </div>
          ) : detail.error ? (
            <>
              <DialogHeader>
                <DialogTitle>Chi tiết báo cáo</DialogTitle>
              </DialogHeader>
              <ErrorState message={detail.error} onRetry={detail.reload} />
            </>
          ) : detail.data ? (
            <>
              <DialogHeader>
                <DialogTitle className="leading-snug">{detail.data.title}</DialogTitle>
                <DialogDescription>
                  {detail.data.kind} · {detail.data.projectName ?? "—"} ·{" "}
                  {formatDate(detail.data.createdAt)}
                </DialogDescription>
              </DialogHeader>

              {summary ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MetricTile
                    icon={VUsers}
                    label="Thành viên"
                    value={summary.members}
                    sub="trong snapshot"
                    tone="neutral"
                  />
                  <MetricTile
                    icon={VStar}
                    label="Điểm ĐG TB"
                    value={summary.avgScore.toFixed(1)}
                    sub={`${summary.scoredCount} người có điểm`}
                    tone="green"
                  />
                  <MetricTile
                    icon={VTarget}
                    label="Hoàn thành TB"
                    value={`${summary.completion}%`}
                    bar={summary.completion}
                    tone="royal"
                  />
                  <MetricTile
                    icon={VTrend}
                    label="Lượt nộp bài"
                    value={summary.submissions}
                    sub="toàn phiên"
                    tone="amber"
                  />
                </div>
              ) : null}

              {detail.data.members.length === 0 ? (
                <NoteCard title="Snapshot trống" tone="mint" rotate={-1}>
                  Báo cáo này chưa có dữ liệu thành viên.
                </NoteCard>
              ) : (
                <div className="overflow-x-auto rounded-[10px_12px_10px_12px] border-2 border-[var(--ink)]">
                  <table className="ink-table">
                    <caption className="sr-only">Chỉ số từng thành viên trong báo cáo</caption>
                    <thead>
                      <tr>
                        <th scope="col">Thành viên</th>
                        <th scope="col">Nhiệm vụ</th>
                        <th scope="col">Điểm ĐG</th>
                        <th scope="col">Nộp / Duyệt / Làm lại</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.data.members.map((m) => (
                        <tr key={m.userId}>
                          <td>
                            <span className="flex items-center gap-2 font-semibold">
                              <InitialDot name={m.displayName} />
                              {m.displayName}
                              {m.displayName === topMemberName && (
                                <>
                                  <VMedal size={15} className="text-[var(--gold)]" aria-hidden="true" />
                                  <span className="sr-only">— thành viên xuất sắc nhất</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td>
                            <span className="flex items-center gap-2">
                              <span className="tabular font-bold">
                                {m.completedTaskCount}/{m.totalTaskCount}
                              </span>
                              <MiniBar
                                value={m.taskCompletionRate}
                                tone="success"
                                className="w-14"
                                label={`Tiến độ ${m.displayName}`}
                              />
                            </span>
                          </td>
                          <td>
                            {m.averageEvaluationScore === null ? (
                              <InkBadge tone="neutral">—</InkBadge>
                            ) : (
                              <InkBadge
                                tone={
                                  m.averageEvaluationScore >= 8
                                    ? "green"
                                    : m.averageEvaluationScore >= 6.5
                                      ? "amber"
                                      : "red"
                                }
                                className="tabular"
                              >
                                {m.averageEvaluationScore.toFixed(1)}
                              </InkBadge>
                            )}
                          </td>
                          <td className="tabular">
                            {m.submissionCount} / {m.approvedCount} / {m.reworkCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <NoteCard title="Ghi chú" tone="mint" rotate={-1}>
                Đúng hạn TB: {summary ? `${summary.onTime}%` : "—"} · snapshot chốt khi báo cáo
                được tạo{reduced ? "" : ""}.
              </NoteCard>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
