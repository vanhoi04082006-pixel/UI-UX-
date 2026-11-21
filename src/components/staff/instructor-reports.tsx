"use client";

import { useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
import { FadeIn, InkButton } from "@/components/notebook/reveal";
import {
  ErrorState,
  MetricTile,
  MiniBar,
  PageHeading,
  SkeletonBlock,
  InitialDot,
} from "@/components/staff/instructor-shared";
import { InkBadge, MarginNote, NoteCard, SketchCard, Tape } from "@/components/notebook/ui";
import { useApi } from "@/lib/use-api";
import { listReports, listSessions } from "@/lib/api/instructor";
import type { InstructorSession, ReportRow } from "@/lib/mock/types";

/* =====================================================================
 * BÁO CÁO — số liệu tổng hợp theo sprint và phiên.
 * ===================================================================== */

const INK_TOOLTIP = {
  background: "var(--paper-raised)",
  border: "2px solid var(--ink)",
  borderRadius: "10px 12px 10px 12px",
  boxShadow: "3px 3px 0 0 var(--hard-shadow)",
  fontSize: "0.75rem",
  padding: "6px 10px",
} as const;

function sessionCodeOf(period: string): string | null {
  const match = period.match(/SS-\d{4}-\d{2}/);
  return match ? match[0] : null;
}

/** Rút gọn nhãn kỳ cho trục biểu đồ / chip (VD: "Sprint 3 · SS-2026-01…" → "Sprint 3"). */
function shortPeriod(period: string): string {
  return period.split("·")[0]?.trim() || period;
}

/** Điểm / KPI từng sinh viên — sinh nhất quán theo (vị trí, kỳ). */
function studentRowsOf(report: ReportRow, index: number, sessions: InstructorSession[]) {
  const code = sessionCodeOf(report.period);
  const session = sessions.find((s) => s.code === code) ?? sessions[0];
  const names = session?.memberNames ?? [];
  return names.map((name, i) => {
    const score = Math.min(10, Math.round((6.5 + ((i * 7 + index * 13) % 36) / 10) * 10) / 10);
    const kpi = 60 + ((i * 11 + index * 7) % 40);
    return { name, score, kpi };
  });
}

/** Escape ô CSV: bọc ngoặc kép khi chứa dấu phẩy / ngoặc / xuống dòng. */
function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Xuất CSV thật: ghép chuỗi từ các hàng đang có → Blob → tải → revoke. */
function downloadReportCsv(rows: ReportRow[]) {
  if (rows.length === 0) {
    toast.info("Chưa có kỳ nào để xuất — dữ liệu vẫn đang trống.");
    return;
  }
  const header = ["Kỳ", "Điểm TB", "Hoàn thành (%)", "KPI TB", "Sinh viên"];
  const lines = [header.map(csvCell).join(",")];
  for (const r of rows) {
    lines.push(
      [r.period, r.avgScore, r.completion, r.kpiAvg, r.students].map(csvCell).join(","),
    );
  }
  // BOM UTF-8 để Excel đọc đúng tiếng Việt.
  const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "bao-cao-ky-thuc-tap.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  toast.success("Đã tải xuống báo cáo CSV");
}

export default function InstructorReports() {
  const { data, loading, error, reload } = useApi<ReportRow[]>(listReports);
  const sessions = useApi<InstructorSession[]>(listSessions);
  const reduced = useReducedMotion();

  const [detailId, setDetailId] = useState<string | null>(null);

  const rows = data ?? [];
  const detailIndex = rows.findIndex((r) => r.id === detailId);
  const detail = detailIndex >= 0 ? rows[detailIndex] : null;

  const totals = useMemo(() => {
    if (!data || data.length === 0) return null;
    const avg = (pick: (r: ReportRow) => number) =>
      Math.round((data.reduce((s, r) => s + pick(r), 0) / data.length) * 10) / 10;
    return {
      avgScore: avg((r) => r.avgScore),
      completion: Math.round(avg((r) => r.completion)),
      kpiAvg: Math.round(avg((r) => r.kpiAvg)),
      students: data.reduce((s, r) => s + r.students, 0),
    };
  }, [data]);

  /** Xu hướng theo kỳ: điểm TB (thang 10) + KPI & hoàn thành (thang 100). */
  const trendData = useMemo(
    () =>
      rows.map((r) => ({
        ky: shortPeriod(r.period),
        diem: r.avgScore,
        kpi: r.kpiAvg,
        hoanThanh: r.completion,
      })),
    [rows],
  );

  const detailRows = useMemo(
    () => (detail ? studentRowsOf(detail, detailIndex, sessions.data ?? []) : []),
    [detail, detailIndex, sessions.data],
  );
  const topStudentIndex = useMemo(() => {
    if (detailRows.length === 0) return -1;
    return detailRows.reduce((best, m, i) => (m.score > detailRows[best].score ? i : best), 0);
  }, [detailRows]);

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
      <PageHeading eyebrow="Sổ tay hành trình · Giảng viên" title="Báo cáo" sub="Số liệu tổng hợp theo sprint và phiên.">
        <InkButton variant="outline" size="sm" onClick={() => downloadReportCsv(rows)}>
          <VDownload size={15} /> Xuất CSV
        </InkButton>
      </PageHeading>

      {(loading && !data) || (sessions.loading && !sessions.data) ? (
        <div className="nb-stagger grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-[7.25rem]" />
          ))}
        </div>
      ) : totals ? (
        <div className="nb-stagger grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <MetricTile
            icon={VStar}
            label="Điểm TB toàn kỳ"
            value={totals.avgScore.toFixed(1)}
            countUp={{ to: totals.avgScore, decimals: 1 }}
            sub="thang 10"
            tone="green"
          />
          <MetricTile
            icon={VTarget}
            label="Hoàn thành TB"
            value={`${totals.completion}%`}
            countUp={{ to: totals.completion, suffix: "%" }}
            bar={totals.completion}
            tone="royal"
          />
          <MetricTile
            icon={VTrend}
            label="KPI TB"
            value={totals.kpiAvg}
            countUp={{ to: totals.kpiAvg }}
            sub="thang 100"
            tone="amber"
          />
          <MetricTile
            icon={VUsers}
            label="Sinh viên đã đánh giá"
            value={totals.students}
            countUp={{ to: totals.students }}
            sub="mọi kỳ"
            tone="neutral"
          />
        </div>
      ) : null}

      {/* ===== Biểu đồ xu hướng theo kỳ ===== */}
      {loading && !data ? (
        <SkeletonBlock className="h-64" />
      ) : trendData.length >= 2 ? (
        <FadeIn>
          <SketchCard hover={false} className="relative p-4 sm:p-5">
            <Tape variant="warm" className="tape-gold -top-2.5 left-10 !w-16 !h-5" rotate={-4} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[1.02rem] font-bold">Xu hướng theo kỳ</h2>
              <span className="flex flex-wrap items-center gap-3 text-[0.68rem] font-semibold text-[var(--ink-soft)]">
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-0.5 w-4 rounded bg-[var(--royal)]" />
                  Điểm TB (thang 10)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-0.5 w-4 rounded bg-[var(--gold)]" />
                  KPI TB
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-0.5 w-4 rounded border-t-2 border-dashed border-[var(--ink-soft)]" />
                  Hoàn thành
                </span>
              </span>
            </div>
            <div className="chart-ink mt-3 h-[190px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 4, bottom: 0, left: -14 }}>
                  <CartesianGrid stroke="var(--line)" strokeDasharray="4 4" vertical={false} />
                  <XAxis
                    dataKey="ky"
                    tick={{ fill: "var(--ink-soft)", fontSize: 10 }}
                    axisLine={{ stroke: "var(--ink-soft)" }}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis
                    yAxisId="left"
                    domain={[0, 10]}
                    ticks={[0, 2, 4, 6, 8, 10]}
                    tick={{ fill: "var(--ink-soft)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={34}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tick={{ fill: "var(--ink-soft)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={34}
                  />
                  <Tooltip
                    cursor={{ stroke: "var(--ink-soft)", strokeDasharray: "4 4" }}
                    contentStyle={INK_TOOLTIP}
                    labelStyle={{ color: "var(--ink-soft)", fontSize: "0.66rem" }}
                    itemStyle={{ color: "var(--ink)", fontWeight: 700 }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="diem"
                    name="Điểm TB"
                    stroke="var(--royal)"
                    strokeWidth={2.4}
                    dot={{ r: 2.5, fill: "var(--paper-raised)", stroke: "var(--royal)", strokeWidth: 2 }}
                    activeDot={{ r: 4, fill: "var(--royal)", stroke: "var(--ink)", strokeWidth: 2 }}
                    isAnimationActive={!reduced}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="kpi"
                    name="KPI TB"
                    stroke="var(--gold)"
                    strokeWidth={2.2}
                    dot={{ r: 2.5, fill: "var(--paper-raised)", stroke: "var(--gold)", strokeWidth: 2 }}
                    activeDot={{ r: 4, fill: "var(--gold)", stroke: "var(--ink)", strokeWidth: 2 }}
                    isAnimationActive={!reduced}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="hoanThanh"
                    name="Hoàn thành"
                    stroke="var(--ink-soft)"
                    strokeWidth={1.6}
                    strokeDasharray="5 5"
                    dot={false}
                    isAnimationActive={!reduced}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <MarginNote className="mt-2">
              điểm thang 10 đọc trục trái — KPI &amp; hoàn thành đọc trục phải
            </MarginNote>
          </SketchCard>
        </FadeIn>
      ) : null}

      {loading && !data ? (
        <SkeletonBlock className="h-64" />
      ) : rows.length === 0 ? (
        <SketchCard hover={false} className="px-6 py-12 text-center">
          <p className="font-hand text-xl">Chưa có kỳ nào được tổng hợp</p>
        </SketchCard>
      ) : (
        <FadeIn>
          <SketchCard hover={false} className="overflow-x-auto p-0">
            <table className="ink-table min-w-[46rem]">
              <caption className="sr-only">Bảng báo cáo theo kỳ và phiên</caption>
              <thead>
                <tr>
                  <th scope="col">Kỳ</th>
                  <th scope="col">Điểm TB</th>
                  <th scope="col">Hoàn thành</th>
                  <th scope="col">KPI TB</th>
                  <th scope="col">Sinh viên</th>
                  <th scope="col" className="text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="sticker-pop transition-colors hover:bg-[var(--blue-mist)]">
                    <td>
                      <span className="flex flex-col items-start gap-1">
                        <button
                          type="button"
                          onClick={() => setDetailId(r.id)}
                          aria-label={`Xem chi tiết kỳ ${r.period}`}
                          className="link-chip focus-ink"
                        >
                          {shortPeriod(r.period)}
                        </button>
                        <span className="text-[0.7rem] text-[var(--ink-soft)]">{r.scope}</span>
                      </span>
                    </td>
                    <td>
                      <span className="flex items-center gap-2">
                        <span className="w-9 font-bold tabular">{r.avgScore.toFixed(1)}</span>
                        <MiniBar value={r.avgScore * 10} className="w-16" label={`Điểm TB ${r.period}`} />
                      </span>
                    </td>
                    <td>
                      <span className="flex items-center gap-2">
                        <span className="w-9 font-bold tabular">{r.completion}%</span>
                        <MiniBar value={r.completion} tone="success" className="w-16" label={`Hoàn thành ${r.period}`} />
                      </span>
                    </td>
                    <td>
                      <InkBadge tone="amber" className="tabular">
                        {r.kpiAvg}
                      </InkBadge>
                    </td>
                    <td className="font-bold tabular">{r.students}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => setDetailId(r.id)}
                        aria-label={`Xem chi tiết kỳ ${r.period}`}
                        className="focus-ink inline-grid h-9 w-9 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] transition-all hover:-translate-y-0.5 hover:bg-[var(--blue-mist)] hover:text-[var(--royal)]"
                      >
                        <VChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SketchCard>
        </FadeIn>
      )}

      <MarginNote>số liệu nói phạm vi của nó — đừng so sánh kỳ khác quy mô khác</MarginNote>

      {/* ===== Dialog chi tiết kỳ ===== */}
      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>Chi tiết kỳ</DialogTitle>
                <DialogDescription>
                  {detail.period} · {detail.scope}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Điểm TB", value: detail.avgScore.toFixed(1), sub: "thang 10" },
                  { label: "Hoàn thành", value: `${detail.completion}%`, sub: "tiến độ" },
                  { label: "KPI TB", value: String(detail.kpiAvg), sub: "thang 100" },
                  { label: "Sinh viên", value: String(detail.students), sub: "đã đánh giá" },
                ].map((m) => (
                  <div key={m.label} className="sketch-border-thin bg-[var(--paper)] p-3 text-center">
                    <p className="text-xl font-extrabold leading-none tabular">{m.value}</p>
                    <p className="mt-1 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[var(--ink-soft)]">
                      {m.label}
                    </p>
                    <p className="text-[0.62rem] text-[var(--ink-faint)]">{m.sub}</p>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto rounded-[10px_12px_10px_12px] border-2 border-[var(--ink)]">
                <table className="ink-table">
                  <caption className="sr-only">Điểm từng sinh viên kỳ {detail.period}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Sinh viên</th>
                      <th scope="col">Điểm</th>
                      <th scope="col">KPI</th>
                      <th scope="col">Nhận định</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailRows.map((s, i) => (
                      <tr key={s.name}>
                        <td>
                          <span className="flex items-center gap-2 font-semibold">
                            <InitialDot name={s.name} />
                            {s.name}
                            {i === topStudentIndex && (
                              <>
                                <VMedal size={15} className="text-[var(--gold)]" aria-hidden="true" />
                                <span className="sr-only">— sinh viên xuất sắc nhất kỳ</span>
                              </>
                            )}
                          </span>
                        </td>
                        <td>
                          <span className="flex items-center gap-2">
                            <InkBadge
                              tone={s.score >= 8 ? "green" : s.score >= 6.5 ? "amber" : "red"}
                              className="tabular"
                            >
                              {s.score.toFixed(1)}
                            </InkBadge>
                            <MiniBar value={s.score * 10} className="w-14" label={`Điểm ${s.name}`} />
                          </span>
                        </td>
                        <td className="font-bold tabular">{s.kpi}</td>
                        <td>
                          {s.score >= 8 ? (
                            <InkBadge tone="green">Xuất sắc</InkBadge>
                          ) : s.score >= 7 ? (
                            <InkBadge tone="blue">Đạt</InkBadge>
                          ) : (
                            <InkBadge tone="amber">Cần kéo</InkBadge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <NoteCard title="Ghi chú" tone="mint" rotate={-1}>
                Báo cáo cập nhật mỗi lần KPI được tổng hợp.
              </NoteCard>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
