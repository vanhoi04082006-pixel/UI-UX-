"use client";
/* =====================================================================
 * INSTRUCTOR PERFORMANCE — "Hiệu suất SV" (route: instructor → performance).
 * Endpoint BE cover:
 *   · GET /performance/interns ({ items, total, ranking })
 *   · GET /performance/interns/{userId} (tổng quan metrics)
 *   · GET /performance/interns/{userId}/detail (profile, phỏng vấn,
 *     assignments, tasks, trend)
 *   · GET /performance/interns/{userId}/ai-recommendations (404 khi chưa
 *     có snapshot — AI_RECOMMENDATION_NOT_AVAILABLE đã có message map)
 * ===================================================================== */
import { useState } from "react";
import { toast } from "sonner";
import {
  VAlert,
  VBot,
  VCheck,
  VInbox,
  VLightbulb,
  VTarget,
  VTrend,
  VTrophy,
  VUser,
} from "@/components/icons/v-icons";
import { InkButton } from "@/components/notebook/reveal";
import { InkBadge, MarginNote, SketchCard, Tape, formatDateVN, formatDateTimeVN } from "@/components/notebook/ui";
import {
  EmptyState,
  PencilLines,
  SectionError,
  StaffPageHeader,
} from "@/components/staff/staff-kit";
import { MiniBar } from "@/components/staff/instructor-shared";
import { useApi } from "@/lib/use-api";
import { errorMessage } from "@/lib/api/api-client";
import {
  getInternAiRecommendations,
  getInternPerformance,
  getInternPerformanceDetail,
  listInternPerformances,
} from "@/lib/api/performance";
import { cn } from "@/lib/utils";

/* ------------------------------ hiển thị ------------------------------- */

function pct(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `${value.toLocaleString("vi-VN")}%`;
}

function num(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : value.toLocaleString("vi-VN");
}

const PRIORITY_META: Record<string, { label: string; tone: string }> = {
  low: { label: "Thấp", tone: "neutral" },
  medium: { label: "Trung bình", tone: "blue" },
  high: { label: "Cao", tone: "amber" },
  critical: { label: "Khẩn cấp", tone: "red" },
};

const TASK_STATUS_META: Record<string, { label: string; tone: string }> = {
  todo: { label: "Cần làm", tone: "neutral" },
  doing: { label: "Đang làm", tone: "blue" },
  review: { label: "Chờ duyệt", tone: "amber" },
  done: { label: "Hoàn thành", tone: "green" },
};

/* =====================================================================
 * MÀN CHÍNH
 * ===================================================================== */

export default function InstructorPerformance() {
  const { data, loading, error, reload } = useApi(() => listInternPerformances(1, 100), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = selectedId ?? data?.items[0]?.userId ?? null;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-8 sm:px-6">
      <StaffPageHeader
        eyebrow="Sổ tay hành trình · Giảng viên"
        title="Hiệu suất sinh viên"
        sub="Chỉ số nghiệm thu quyết định: hoàn thành nhiệm vụ, điểm đánh giá, tiến độ đúng hạn."
        note={
          data?.ranking
            ? `Thứ tự xếp hạng của hệ thống: ${data.ranking}.`
            : "Bạn chỉ thấy sinh viên mình trực tiếp hướng dẫn trong phiên/dự án."
        }
        icon={VTrend}
      />

      {error ? (
        <SectionError message={error} onRetry={reload} />
      ) : loading ? (
        <PencilLines rows={5} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={VTrend}
          title="Chưa có sinh viên nào trong phạm vi của bạn"
          note="Danh sách gồm sinh viên bạn là giảng viên phiên hoặc mentor dự án. Hãy mở phiên và thêm thành viên để bắt đầu theo dõi."
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          {/* Bảng xếp hạng */}
          <SketchCard hover={false} className="overflow-hidden p-0">
            <div className="flex items-center gap-2 border-b-2 border-dashed border-[color-mix(in_srgb,var(--ink)_16%,transparent)] px-3 py-2.5">
              <VTrophy size={15} className="text-[var(--royal)]" />
              <p className="text-[0.8rem] font-bold">Xếp hạng ({data.total.toLocaleString("vi-VN")} SV)</p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-[var(--paper-raised)]">
                  <tr className="font-geist-mono text-[0.6rem] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                    <th className="px-2.5 py-2">#</th>
                    <th className="px-2.5 py-2">Sinh viên</th>
                    <th className="px-2.5 py-2">Hoàn thành</th>
                    <th className="px-2.5 py-2">Điểm TB</th>
                    <th className="px-2.5 py-2">Quá hạn</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row) => {
                    const active = row.userId === selected;
                    return (
                      <tr
                        key={row.userId}
                        onClick={() => setSelectedId(row.userId)}
                        className={cn(
                          "cursor-pointer border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_14%,transparent)] transition-colors hover:bg-[var(--blue-mist)]",
                          active && "bg-[var(--blue-mist)]",
                        )}
                      >
                        <td className="px-2.5 py-2.5 font-bold tabular">
                          {row.rank !== null ? row.rank.toLocaleString("vi-VN") : "—"}
                        </td>
                        <td className="px-2.5 py-2.5">
                          <p className="font-bold leading-tight">{row.displayName}</p>
                          {row.primaryProjectName && (
                            <p className="text-[0.64rem] text-[var(--ink-soft)]">{row.primaryProjectName}</p>
                          )}
                        </td>
                        <td className="px-2.5 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-10 text-[0.72rem] font-bold tabular">{pct(row.taskCompletionRate)}</span>
                            <MiniBar value={row.taskCompletionRate ?? 0} className="w-16" label={`Tiến độ ${row.displayName}`} animate={false} />
                          </div>
                        </td>
                        <td className="px-2.5 py-2.5 font-bold tabular">{num(row.averageEvaluationScore)}</td>
                        <td className="px-2.5 py-2.5">
                          {(row.overdueOpenTaskCount ?? 0) > 0 ? (
                            <InkBadge tone="red">{row.overdueOpenTaskCount?.toLocaleString("vi-VN")}</InkBadge>
                          ) : (
                            <InkBadge tone="green">0</InkBadge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SketchCard>

          {/* Chi tiết sinh viên được chọn */}
          {selected && <InternDetailPanel userId={selected} />}
        </div>
      )}
    </main>
  );
}

/* ------------------------ chi tiết 1 sinh viên -------------------------- */

function InternDetailPanel({ userId }: { userId: string }) {
  const overview = useApi(() => getInternPerformance(userId), [userId]);
  const detail = useApi(() => getInternPerformanceDetail(userId, 1, 20), [userId]);
  const recommendations = useApi(() => getInternAiRecommendations(userId), [userId]);
  const [busy, setBusy] = useState(false);

  const profile = detail.data?.profile;
  const metrics = detail.data?.metrics ?? overview.data?.metrics ?? null;
  const trendMax = Math.max(1, ...(detail.data?.trend ?? []).map((t) => Math.max(t.created, t.completed)));

  async function refreshRecommendations() {
    setBusy(true);
    try {
      /* Endpoint refresh là của riêng sinh viên (intern/me) — ở phía giảng viên
       * chỉ đọc snapshot mới nhất, nên nút này chỉ tải lại. */
      recommendations.reload();
      toast.info("Đã tải lại khuyến nghị mới nhất.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Hồ sơ + metrics */}
      <SketchCard hover={false} className="relative space-y-3 p-4 sm:p-5">
        <Tape variant="mint" rotate={-3} className="-top-3 right-8 !w-14 !h-5" />
        {detail.loading ? (
          <PencilLines rows={2} />
        ) : detail.error ? (
          <SectionError message={detail.error} onRetry={detail.reload} />
        ) : profile ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--blue-mist)] text-[var(--royal)]">
                <VUser size={17} />
              </span>
              <div className="min-w-0">
                <p className="font-bold leading-tight">{profile.displayName}</p>
                <p className="text-[0.7rem] text-[var(--ink-soft)]">{profile.email ?? "—"}</p>
              </div>
              {profile.selectedRole && <InkBadge tone="blue" className="ml-auto">{profile.selectedRole}</InkBadge>}
            </div>

            {metrics && (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                <MetricMini label="Hoàn thành nhiệm vụ" value={pct(metrics.taskCompletionRate)} tone="royal" icon={VCheck} />
                <MetricMini label="Hoàn thành điểm story" value={pct(metrics.storyPointCompletionRate)} tone="royal" icon={VTarget} />
                <MetricMini label="Đúng hạn" value={pct(metrics.onTimeCompletionRate)} tone="green" icon={VTrend} />
                <MetricMini label="Điểm đánh giá TB" value={num(metrics.averageEvaluationScore)} tone="amber" icon={VTrophy} />
                <MetricMini label="Nhiệm vụ quá hạn" value={num(metrics.overdueOpenTaskCount)} tone="red" icon={VAlert} />
                <MetricMini label="Đánh giá đã chốt" value={num(metrics.finalizedEvaluationCount)} tone="neutral" icon={VCheck} />
              </div>
            )}

            {/* Xu hướng theo tháng */}
            {(detail.data?.trend.length ?? 0) > 0 && (
              <div className="space-y-1.5">
                <p className="eyebrow">Xu hướng nhiệm vụ 6 tháng</p>
                <div className="flex items-end gap-2">
                  {detail.data?.trend.map((t) => (
                    <div key={t.month} className="flex flex-1 flex-col items-center gap-1" title={`${t.month}: tạo ${t.created}, hoàn thành ${t.completed}`}>
                      <div className="flex h-20 w-full items-end justify-center gap-1">
                        <span
                          className="w-3 rounded-t-[4px] border-[1.5px] border-[var(--ink)] bg-[var(--blue-mist)]"
                          style={{ height: `${Math.max(6, (t.created / trendMax) * 100)}%` }}
                          aria-label={`${t.month}: ${t.created} nhiệm vụ tạo`}
                        />
                        <span
                          className="w-3 rounded-t-[4px] border-[1.5px] border-[var(--ink)] bg-[var(--royal)]"
                          style={{ height: `${Math.max(6, (t.completed / trendMax) * 100)}%` }}
                          aria-label={`${t.month}: ${t.completed} nhiệm vụ hoàn thành`}
                        />
                      </div>
                      <span className="font-geist-mono text-[0.56rem] text-[var(--ink-soft)]">{t.month.slice(5)}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[0.62rem] text-[var(--ink-soft)]">
                  <span className="mr-2 inline-block h-2 w-2 rounded-full border border-[var(--ink)] bg-[var(--blue-mist)]" />tạo
                  <span className="ml-3 mr-2 inline-block h-2 w-2 rounded-full border border-[var(--ink)] bg-[var(--royal)]" />hoàn thành
                </p>
              </div>
            )}
          </>
        ) : (
          <EmptyState icon={VInbox} title="Không tải được hồ sơ" />
        )}
      </SketchCard>

      {/* Phỏng vấn đầu vào */}
      {detail.data?.interview && (
        <SketchCard hover={false} className="space-y-2 p-4">
          <p className="eyebrow">Kết quả phỏng vấn đầu vào</p>
          <div className="flex flex-wrap gap-2">
            <InkBadge tone={detail.data.interview.decision === "passed" ? "green" : "amber"} dot>
              {detail.data.interview.decision ?? "—"}
            </InkBadge>
            {detail.data.interview.overallScore !== null && (
              <InkBadge tone="blue">tổng {detail.data.interview.overallScore.toLocaleString("vi-VN")}</InkBadge>
            )}
            {detail.data.interview.technicalScore !== null && (
              <InkBadge tone="neutral">kỹ thuật {detail.data.interview.technicalScore.toLocaleString("vi-VN")}</InkBadge>
            )}
            {detail.data.interview.englishScore !== null && (
              <InkBadge tone="neutral">tiếng Anh {detail.data.interview.englishScore.toLocaleString("vi-VN")}</InkBadge>
            )}
          </div>
          {detail.data.interview.strengths.length > 0 && (
            <p className="text-[0.76rem]"><b>Điểm mạnh:</b> {detail.data.interview.strengths.join(", ")}</p>
          )}
          {detail.data.interview.feedback && (
            <p className="text-[0.74rem] text-[var(--ink-soft)]">{detail.data.interview.feedback}</p>
          )}
        </SketchCard>
      )}

      {/* Lịch sử phân công */}
      {(detail.data?.assignments.length ?? 0) > 0 && (
        <SketchCard hover={false} className="space-y-2 p-4">
          <p className="eyebrow">Phân công ({detail.data?.assignments.length ?? 0})</p>
          <ul className="max-h-40 space-y-1.5 overflow-y-auto">
            {detail.data?.assignments.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 text-[0.76rem]">
                <span className="font-bold">{a.projectName ?? "Dự án"}</span>
                <span className="text-[var(--ink-soft)]">{a.sessionName ?? ""}</span>
                {a.roleInProject && <InkBadge tone="blue">{a.roleInProject}</InkBadge>}
                <InkBadge tone={a.status === "completed" ? "green" : "neutral"} dot>{a.status ?? "—"}</InkBadge>
                <span className="ml-auto text-[0.66rem] text-[var(--ink-soft)]">
                  {a.assignedAt ? formatDateVN(a.assignedAt) : ""}
                  {a.completedAt ? ` → ${formatDateVN(a.completedAt)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </SketchCard>
      )}

      {/* Nhiệm vụ gần đây */}
      <SketchCard hover={false} className="space-y-2 p-4">
        <p className="eyebrow">Nhiệm vụ ({detail.data?.taskTotal ?? 0})</p>
        {detail.loading ? (
          <PencilLines rows={2} />
        ) : !detail.data || detail.data.tasks.length === 0 ? (
          <p className="text-xs text-[var(--ink-soft)]">Chưa có nhiệm vụ nào trong giai đoạn xem.</p>
        ) : (
          <ul className="max-h-72 space-y-1.5 overflow-y-auto">
            {detail.data.tasks.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2 rounded-[9px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_20%,transparent)] px-2.5 py-1.5 text-[0.76rem]">
                <span className="font-geist-mono text-[0.64rem] font-bold text-[var(--royal)]">{t.code}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{t.title}</span>
                {t.status && <InkBadge tone={TASK_STATUS_META[t.status]?.tone ?? "neutral"} dot>{TASK_STATUS_META[t.status]?.label ?? t.status}</InkBadge>}
                {t.instructorScore !== null && <InkBadge tone="amber">{t.instructorScore.toLocaleString("vi-VN")}đ</InkBadge>}
                <span className="text-[0.64rem] text-[var(--ink-soft)]">
                  {t.dueDate ? `hạn ${formatDateVN(t.dueDate)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SketchCard>

      {/* Khuyến nghị AI */}
      <SketchCard hover={false} className="space-y-2.5 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="eyebrow flex items-center gap-1.5"><VBot size={14} /> Khuyến nghị AI</p>
          <span className="ml-auto">
            <InkButton variant="outline" size="sm" disabled={busy} onClick={refreshRecommendations}>
              Tải lại
            </InkButton>
          </span>
        </div>
        <MarginNote>Khuyến nghị do AI sinh từ chỉ số hiện tại — chỉ mang tính tham khảo.</MarginNote>
        {recommendations.loading ? (
          <PencilLines rows={2} />
        ) : recommendations.error ? (
          <EmptyState
            icon={VLightbulb}
            title="Chưa có khuyến nghị AI cho sinh viên này"
            note={recommendations.error}
          />
        ) : !recommendations.data || recommendations.data.items.length === 0 ? (
          <EmptyState icon={VLightbulb} title="Chưa có khuyến nghị" note="Snapshot khuyến nghị sẽ xuất hiện sau khi hệ thống làm mới." />
        ) : (
          <ul className="space-y-2">
            {recommendations.data.items.map((rec, i) => (
              <li key={`${rec.type ?? i}-${i}`} className="rounded-[10px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_20%,transparent)] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[0.8rem] font-bold">{rec.title ?? rec.type ?? "Khuyến nghị"}</p>
                  {rec.priority && (
                    <InkBadge tone={PRIORITY_META[rec.priority]?.tone ?? "neutral"} dot>
                      {PRIORITY_META[rec.priority]?.label ?? rec.priority}
                    </InkBadge>
                  )}
                </div>
                {rec.reason && <p className="mt-1 text-[0.74rem] text-[var(--ink-soft)]">{rec.reason}</p>}
                {rec.actions.length > 0 && (
                  <ul className="mt-1.5 list-inside list-disc text-[0.74rem]">
                    {rec.actions.map((a) => <li key={a}>{a}</li>)}
                  </ul>
                )}
              </li>
            ))}
            {recommendations.data.createdAt && (
              <p className="text-[0.66rem] text-[var(--ink-soft)]">
                Cập nhật lần cuối {formatDateTimeVN(recommendations.data.createdAt)}
                {recommendations.data.reused ? " (tái sử dụng snapshot)" : ""}
              </p>
            )}
          </ul>
        )}
      </SketchCard>
    </div>
  );
}

function MetricMini({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone: "royal" | "green" | "amber" | "red" | "neutral";
  icon: typeof VCheck;
}) {
  const tones: Record<string, string> = {
    royal: "bg-[var(--blue-mist)] text-[var(--royal)]",
    green: "bg-[color-mix(in_srgb,var(--success)_16%,transparent)] text-[var(--success)]",
    amber: "bg-[color-mix(in_srgb,var(--warning)_18%,transparent)] text-[var(--warning)]",
    red: "bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] text-[var(--danger)]",
    neutral: "bg-[var(--paper)] text-[var(--ink)]",
  };
  return (
    <div className="flex items-center gap-2.5 rounded-[10px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_20%,transparent)] p-2.5">
      <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-[8px] border-2 border-[var(--ink)]", tones[tone])}>
        <Icon size={15} />
      </span>
      <span className="min-w-0">
        <span className="block text-[1.05rem] font-extrabold leading-none tabular">{value}</span>
        <span className="mt-0.5 block text-[0.62rem] font-semibold leading-tight text-[var(--ink-soft)]">{label}</span>
      </span>
    </div>
  );
}
