"use client";

/* =====================================================================
 * STUDENT PERFORMANCE — "Năng lực & Khuyến nghị" (intern, route "performance").
 * Endpoint BE cover:
 *  · GET  /intern/me/performance           — chỉ số năng lực (null = chưa đo)
 *  · GET  /intern/me/ai-recommendations    — khuyến nghị AI (404 → empty state)
 *  · POST /intern/me/ai-recommendations/refresh — tạo/làm mới (tốn AI quota)
 *  · GET  /participation/me                — {items, summary} phiên tham gia
 * ===================================================================== */

import { useState } from "react";
import { toast } from "sonner";
import {
  getMyAiRecommendations,
  getMyParticipation,
  getMyPerformance,
  refreshMyAiRecommendations,
  type AiRecommendations,
  type MyParticipation,
  type MyPerformance,
} from "@/lib/api/student-extra";
import { errorMessage } from "@/lib/api/api-client";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import {
  InkBadge,
  MarginNote,
  NoteCard,
  SketchCard,
  StampMoc,
  formatDateTimeVN,
} from "@/components/notebook/ui";
import { InkButton } from "@/components/notebook/reveal";
import {
  VAlert,
  VBot,
  VChartColumn,
  VCheck,
  VClock,
  VFlag,
  VInbox,
  VKanban,
  VLightbulb,
  VSparkles,
  VStar,
  VTarget,
  VTrend,
  VUsers,
} from "@/components/icons/v-icons";
import {
  CountUpNumber,
  EmptyFigure,
  ErrorPanel,
  LoadingPanel,
  PageHeading,
  scoreColor,
} from "@/components/student/nb-kit-5c2";
import { MiniBar } from "@/components/student/student-shared";

/* --------------------- hiển thị số "null = chưa đo" --------------------- */

function NumOrDash({
  value,
  decimals = 0,
  suffix = "",
}: {
  value: number | null;
  decimals?: number;
  suffix?: string;
}) {
  if (value === null) return <span className="text-[var(--ink-faint)]">—</span>;
  return (
    <CountUpNumber
      value={value}
      decimals={decimals}
      suffix={suffix}
    />
  );
}

function RateCell({
  rate,
  label,
  hint,
}: {
  rate: number | null;
  label: string;
  hint: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[0.68rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]">{label}</p>
      <p className="tabular mt-1 text-2xl font-extrabold leading-none">
        {rate === null ? (
          <span className="text-[var(--ink-faint)]">—</span>
        ) : (
          <>
            <CountUpNumber value={rate} decimals={rate % 1 === 0 ? 0 : 1} />
            <span className="text-base text-[var(--ink-soft)]">%</span>
          </>
        )}
      </p>
      <div className="mt-2">
        {rate === null ? (
          <p className="text-[0.7rem] leading-snug text-[var(--ink-faint)]">{hint}</p>
        ) : (
          <MiniBar value={rate} tone={rate >= 70 ? "green" : "royal"} label={label} barGrow />
        )}
      </div>
    </div>
  );
}

/* --------------------------- bảng chỉ số --------------------------- */

function MetricsBoard({ data }: { data: MyPerformance }) {
  const m = data.metrics;
  return (
    <SketchCard as="section" className="relative p-5 pt-8">
      <StampMoc tone="red" rotate={-7} className="!text-[0.64rem] absolute right-5 top-5 hidden sm:block">
        CHỈ SỐ THẬT
      </StampMoc>
      <div className="flex flex-wrap items-start gap-3">
        <span
          className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--blue-mist)] text-[var(--royal)]"
          aria-hidden="true"
        >
          <VTrend size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold">Chỉ số năng lực của tôi</h2>
          <p className="mt-0.5 text-[0.78rem] leading-relaxed text-[var(--ink-soft)]">
            Số liệu suy ra trực tiếp từ nhiệm vụ, sprint và đánh giá đã chốt —{" "}
            <b>chưa đo hiển thị “—”</b>, không phải 0.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {/* Tốc độ hoàn thành */}
        <div className="sketch-border-thin rounded-[10px_12px_10px_12px] bg-[var(--paper)] p-4">
          <RateCell
            rate={m.taskCompletionRate}
            label="Tốc độ hoàn thành nhiệm vụ"
            hint="Chưa có nhiệm vụ nào trong kỳ — chỉ số sẽ có khi bạn được giao việc."
          />
          <p className="tabular mt-2.5 text-[0.78rem] text-[var(--ink-soft)]">
            <NumOrDash value={m.completedTaskCount} />/<NumOrDash value={m.totalTaskCount} /> nhiệm
            vụ hoàn thành
          </p>
        </div>

        {/* Story points */}
        <div className="sketch-border-thin rounded-[10px_12px_10px_12px] bg-[var(--paper)] p-4">
          <RateCell
            rate={m.storyPointCompletionRate}
            label="Story points đã giao"
            hint="Chưa có story point cam kết trong kỳ."
          />
          <p className="tabular mt-2.5 flex items-center gap-1.5 text-[0.78rem] text-[var(--ink-soft)]">
            <VStar size={13} className="text-[var(--warning)]" />
            <NumOrDash value={m.completedStoryPoints} />/<NumOrDash value={m.committedStoryPoints} />{" "}
            điểm đã làm xong
          </p>
        </div>

        {/* Đúng hạn */}
        <div className="sketch-border-thin rounded-[10px_12px_10px_12px] bg-[var(--paper)] p-4">
          <RateCell
            rate={m.onTimeCompletionRate}
            label="Nộp đúng hạn"
            hint="Chưa có nhiệm vụ có hạn chót được hoàn thành."
          />
          <p className="tabular mt-2.5 text-[0.78rem] text-[var(--ink-soft)]">
            <VClock size={12} className="mr-1 inline" />
            <NumOrDash value={m.onTimeCompletedTaskCount} /> đúng hạn /{" "}
            <NumOrDash value={m.dueDatedCompletedTaskCount} /> có hạn
          </p>
          {(m.overdueOpenTaskCount ?? 0) > 0 && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--danger)] px-2 py-0.5 text-[0.7rem] font-bold text-[var(--danger)]">
              <VAlert size={12} /> {m.overdueOpenTaskCount} nhiệm vụ quá hạn còn mở
            </p>
          )}
        </div>

        {/* Điểm đánh giá trung bình */}
        <div className="sketch-border-thin rounded-[10px_12px_10px_12px] bg-[var(--paper)] p-4">
          <p className="text-[0.68rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
            Điểm đánh giá trung bình
          </p>
          <p className="tabular mt-1 text-2xl font-extrabold leading-none">
            {m.averageEvaluationScore === null ? (
              <span className="text-[var(--ink-faint)]">—</span>
            ) : (
              <span style={{ color: scoreColor(m.averageEvaluationScore / 10) }}>
                <CountUpNumber
                  value={m.averageEvaluationScore}
                  decimals={m.averageEvaluationScore % 1 === 0 ? 0 : 1}
                />
                <span className="text-base text-[var(--ink-soft)]">/100</span>
              </span>
            )}
          </p>
          <p className="tabular mt-2.5 text-[0.78rem] text-[var(--ink-soft)]">
            <VCheck size={12} className="mr-1 inline" />
            <NumOrDash value={m.finalizedEvaluationCount} /> kỳ đánh giá đã chốt
          </p>
        </div>

        {/* Tiến độ sprint hiện tại */}
        <div className="sketch-border-thin rounded-[10px_12px_10px_12px] bg-[var(--paper)] p-4">
          <RateCell
            rate={m.activeSprintProgress}
            label="Tiến độ sprint hiện tại"
            hint="Chưa có sprint đang chạy — chờ phân công dự án."
          />
          <p className="mt-2.5 flex items-center gap-1.5 text-[0.78rem] text-[var(--ink-soft)]">
            <VKanban size={13} /> sprint đang hoạt động
          </p>
        </div>

        {/* Ghi chú biên kỳ */}
        <div className="flex flex-col justify-between gap-3 rounded-[10px_12px_10px_12px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_28%,transparent)] bg-[var(--paper-raised)] p-4">
          <div>
            <p className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
              <VTarget size={13} /> Kỳ đo
            </p>
            <p className="tabular mt-1.5 text-[0.82rem] font-semibold">
              {data.period.from ? formatDateTimeVN(data.period.from) : "—"}
              {" → "}
              {data.period.to ? formatDateTimeVN(data.period.to) : "đến nay"}
            </p>
          </div>
          {data.period.boundary && (
            <MarginNote className="text-[0.8rem]">{data.period.boundary}</MarginNote>
          )}
        </div>
      </div>
    </SketchCard>
  );
}

/* --------------------------- khuyến nghị AI --------------------------- */

function RecommendationsSection({
  recs,
  onRefresh,
  refreshBusy,
}: {
  recs: AiRecommendations | null;
  onRefresh: () => void;
  refreshBusy: boolean;
}) {
  return (
    <SketchCard as="section" hover={false} className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-[10px_12px_10px_12px] border-2 border-[var(--ink)] bg-[var(--royal)] text-white dark:text-[#101018]">
            <VBot size={19} />
          </span>
          <div className="min-w-0">
            <h2 className="flex flex-wrap items-center gap-2 text-base font-extrabold">
              Khuyến nghị phát triển từ AI
              <InkBadge tone="amber">chỉ mang tính tham khảo</InkBadge>
            </h2>
            <p className="mt-0.5 text-[0.75rem] leading-relaxed text-[var(--ink-soft)]">
              AI đọc chỉ số thật của bạn rồi gợi ý việc nên luyện tiếp — không phải nhận xét chính
              thức từ giảng viên.
            </p>
          </div>
        </div>
        <InkButton
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={refreshBusy}
          title="Tạo/làm mới khuyến nghị từ chỉ số hiện tại"
        >
          {refreshBusy ? <span className="spinner-ink" aria-hidden="true" /> : <VSparkles size={14} />}
          {recs ? "Làm mới" : "Tạo khuyến nghị"}
        </InkButton>
      </div>

      {recs == null || recs.items.length === 0 ? (
        <div className="mt-2">
          <EmptyFigure
            image="/images/empty-states/open-notebook.png"
            alt="Trang sổ trống — chưa có khuyến nghị AI nào"
            title="Chưa có khuyến nghị nào — bấm “Tạo khuyến nghị” để AI đọc chỉ số của bạn"
          >
            <MarginNote className="mt-1 max-w-sm">
              khuyến nghị lấy từ chỉ số hiện tại — có dữ liệu là gợi ý càng sát
            </MarginNote>
          </EmptyFigure>
        </div>
      ) : (
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {recs.items.map((item, i) => (
            <li
              key={item.title ?? item.message ?? `rec-${i}`}
              className="sketch-border-thin relative bg-[var(--paper-raised)] p-4"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--note-yellow)] text-[var(--note-yellow-ink)]">
                <VLightbulb size={15} />
              </span>
              <h3 className="mt-2 text-[0.9rem] font-extrabold leading-snug">
                {item.title ?? `Gợi ý ${i + 1}`}
              </h3>
              {item.message && (
                <p className="mt-1.5 whitespace-pre-wrap text-[0.8rem] leading-relaxed text-[var(--ink-soft)]">
                  {item.message}
                </p>
              )}
              {item.extras.length > 0 && (
                <dl className="mt-2.5 space-y-1">
                  {item.extras.map((x) => (
                    <div key={x.key} className="flex gap-2 text-[0.72rem]">
                      <dt className="w-24 shrink-0 font-bold text-[var(--ink-soft)]">{x.key}</dt>
                      <dd className="min-w-0 break-words">{x.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {item.createdAt && (
                <p className="tabular mt-2 text-[0.66rem] text-[var(--ink-faint)]">
                  Tạo lúc {formatDateTimeVN(item.createdAt)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      {recs?.generatedAt && (
        <p className="tabular mt-3 text-[0.68rem] text-[var(--ink-faint)]">
          Ảnh chụp khuyến nghị: {formatDateTimeVN(recs.generatedAt)}
        </p>
      )}
    </SketchCard>
  );
}

/* --------------------------- phiên tham gia --------------------------- */

const PART_STATUS_TONE: Record<string, string> = {
  active: "green",
  completed: "blue",
  cancelled: "neutral",
  removed: "red",
};

function ParticipationSection({ data }: { data: MyParticipation }) {
  return (
    <SketchCard as="section" hover={false} className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--royal)]">
            <VUsers size={17} />
          </span>
          <div>
            <h2 className="text-base font-extrabold">Tham gia phiên thực tập</h2>
            <p className="text-[0.75rem] text-[var(--ink-soft)]">
              Các phiên bạn từng tham gia cùng tình trạng hiện tại.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <InkBadge tone="neutral">
            <VFlag size={12} /> {data.summary.total.toLocaleString("vi-VN")} phiên
          </InkBadge>
          <InkBadge tone="green" dot>
            {data.summary.active.toLocaleString("vi-VN")} đang hoạt động
          </InkBadge>
          {data.summary.registeredPenalty > 0 && (
            <InkBadge tone="red">
              <VAlert size={12} /> {data.summary.registeredPenalty.toLocaleString("vi-VN")} điểm phạt
            </InkBadge>
          )}
        </div>
      </div>

      {data.items.length === 0 ? (
        <EmptyFigure
          image="/images/empty-states/open-notebook.png"
          alt="Trang sổ trống — chưa tham gia phiên nào"
          title="Chưa tham gia phiên thực tập nào — trúng tuyển và được phân công sẽ xuất hiện tại đây"
        />
      ) : (
        <ul className="mt-4 space-y-2.5">
          {data.items.map((item, i) => (
            <li
              key={item.id ?? item.sessionId ?? `part-${i}`}
              className="sketch-border-thin flex flex-wrap items-center gap-x-4 gap-y-2 bg-[var(--paper-raised)] p-3.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[0.88rem] font-extrabold leading-snug">
                    {item.sessionName ?? item.sessionCode ?? "Phiên thực tập"}
                  </p>
                  {item.status && (
                    <InkBadge tone={PART_STATUS_TONE[item.status.toLowerCase()] ?? "neutral"}>
                      {item.status}
                    </InkBadge>
                  )}
                </div>
                <p className="tabular mt-1 text-[0.72rem] text-[var(--ink-soft)]">
                  {item.role ? `Vai trò ${item.role}` : ""}
                  {item.joinedAt ? ` · tham gia ${formatDateTimeVN(item.joinedAt)}` : ""}
                  {item.penaltyCount != null && item.penaltyCount > 0
                    ? ` · ${item.penaltyCount} điểm phạt`
                    : ""}
                </p>
                {item.extras.length > 0 && (
                  <p className="mt-1 text-[0.7rem] text-[var(--ink-faint)]">
                    {item.extras.map((x) => `${x.key}: ${x.value}`).join(" · ")}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SketchCard>
  );
}

/* ------------------------------ màn hình ------------------------------ */

export default function StudentPerformance() {
  const perfQ = useApi<MyPerformance>(() => getMyPerformance(), []);
  const recsQ = useApi<AiRecommendations | null>(() => getMyAiRecommendations(), []);
  const partQ = useApi<MyParticipation>(() => getMyParticipation(), []);

  const [refreshBusy, setRefreshBusy] = useState(false);

  const refreshRecommendations = async () => {
    setRefreshBusy(true);
    try {
      const next = await refreshMyAiRecommendations();
      toast.success(
        next && next.items.length > 0
          ? "AI đã soạn xong khuyến nghị mới!"
          : "Đã yêu cầu tạo khuyến nghị — chỉ số chưa đủ sẽ thông báo sau.",
      );
      recsQ.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setRefreshBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="NĂNG LỰC & KẾT QUẢ"
        title="Năng lực & Khuyến nghị"
        sub="Bảng chỉ số thật suy ra từ nhiệm vụ, sprint và đánh giá đã chốt — kèm gợi ý luyện tập do AI đọc từ chính số liệu của bạn."
        margin="null nghĩa là chưa đo được — không phải điểm 0 đâu nhé"
      />

      {perfQ.loading && <LoadingPanel rows={2} label="Đang cộng chỉ số..." />}
      {!perfQ.loading && perfQ.error && <ErrorPanel message={perfQ.error} onRetry={perfQ.reload} />}
      {!perfQ.loading && !perfQ.error && perfQ.data && <MetricsBoard data={perfQ.data} />}

      {recsQ.loading ? (
        <LoadingPanel rows={1} label="Đang hỏi AI Mentor..." />
      ) : recsQ.error ? (
        <ErrorPanel message={recsQ.error} onRetry={recsQ.reload} />
      ) : (
        <RecommendationsSection
          recs={recsQ.data ?? null}
          onRefresh={refreshRecommendations}
          refreshBusy={refreshBusy}
        />
      )}

      {partQ.loading && <LoadingPanel rows={1} label="Đang mở sổ phiên tham gia..." />}
      {!partQ.loading && partQ.error && <ErrorPanel message={partQ.error} onRetry={partQ.reload} />}
      {!partQ.loading && !partQ.error && partQ.data && <ParticipationSection data={partQ.data} />}

      <NoteCard title="Sổ tay nhỏ" tone="yellow" rotate={-0.9}>
        Chỉ số cập nhật theo thời gian thực từ máy chủ — muốn cải thiện nhanh, hãy kéo nhiệm vụ{" "}
        <b>Đang làm</b> sang <b>Chờ duyệt</b> đúng hạn và giữ story point đã cam kết.
      </NoteCard>
    </div>
  );
}
