"use client";

import { useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { listMyEvaluations } from "@/lib/api/outcomes";
import { useApi } from "@/lib/use-api";
import type { Evaluation } from "@/lib/mock/types";
import { cn } from "@/lib/utils";
import {
  InkBadge,
  MarginNote,
  SketchCard,
  StampMoc,
  formatDateVN,
} from "@/components/notebook/ui";
import { SquiggleUnderline } from "@/components/notebook/doodles";
import { Stagger, StaggerItem } from "@/components/notebook/reveal";
import {
  VChevronDown,
  VClipboardCheck,
  VClock,
  VCompass,
  VUser,
} from "@/components/icons/v-icons";
import {
  CountUpNumber,
  usePrefersReducedMotion,
} from "./student-shared";
import {
  EmptyFigure,
  ErrorPanel,
  LoadingPanel,
  PageHeading,
  scoreColor,
} from "./nb-kit-5c2";

/* =====================================================================
 * ĐÁNH GIÁ — sổ điểm chính thức đã chốt bởi giảng viên.
 * Điểm AI chỉ là nháp trong từng bài nộp, không tự thành điểm chính thức.
 * ====================================================================== */

const STEPS = [
  "AI chấm nháp từng bài nộp",
  "Giảng viên xem, chỉnh và chốt",
  "Điểm chính thức vào sổ của bạn",
];

/** Màu thanh tiêu chí theo tỷ lệ đạt được: ≥80% xanh · ≥65% vàng · đỏ. */
function criteriaColor(pct: number) {
  if (pct >= 80) return "var(--success)";
  if (pct >= 65) return "var(--warning)";
  return "var(--danger)";
}

/** Dữ liệu một trục radar: tên tiêu chí đủ + điểm gốc dạng "score / max". */
type RadarDatum = {
  subject: string;
  score: number;
  max: number;
  diem: number;
  weight?: number;
};

/** Tooltip radar nét mực — điểm gốc hiển thị "score / max" (codex). */
function RadarTip({ active, payload }: { active?: boolean; payload?: { payload?: RadarDatum }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="rounded-[10px_12px_10px_12px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] px-3 py-1.5 shadow-ink-3">
      <p className="text-[0.72rem] font-extrabold text-[var(--ink)]">{d.subject}</p>
      <p className="tabular mt-0.5 text-[0.72rem] font-bold text-[var(--royal)]">
        {d.score.toFixed(1)} / {d.max} điểm
      </p>
      {d.weight !== undefined && (
        <p className="tabular mt-0.5 text-[0.66rem] font-bold text-[var(--ink-soft)]">Trọng số {d.weight}%</p>
      )}
    </div>
  );
}

/** Tách nhãn dài thành tối đa 2 dòng cân bằng — đủ tên tiêu chí, không cắt cụt. */
function wrap2(label: string): string[] {
  if (label.length <= 14) return [label];
  const words = label.split(" ");
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const diff = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

/** Tick trục radar viết tay — tên tiêu chí đầy đủ, xuống dòng khi dài. */
function RadarAxisTick({
  x,
  y,
  textAnchor,
  payload,
}: {
  x?: number | string;
  y?: number | string;
  textAnchor?: string;
  payload?: { value?: string };
}) {
  const lines = wrap2(payload?.value ?? "");
  const anchor = (textAnchor ?? "middle") as "start" | "middle" | "end";
  return (
    <text x={Number(x)} y={Number(y)} textAnchor={anchor} fill="var(--ink-soft)" fontSize={11}>
      {lines.map((l, i) => (
        <tspan key={l} x={Number(x)} dy={i === 0 ? (lines.length > 1 ? -5 : 0) : 13}>
          {l}
        </tspan>
      ))}
    </text>
  );
}

/** Bảng tiêu chí kỳ đánh giá MỚI NHẤT dưới dạng radar nét mực. */
function CriteriaRadar({ ev }: { ev: Evaluation }) {
  const reduced = usePrefersReducedMotion();
  const data: RadarDatum[] = ev.criteria.map((c) => ({
    subject: c.label,
    score: c.score,
    max: c.max,
    ...(c.weight !== undefined ? { weight: c.weight } : {}),
    diem: Math.round((c.score / c.max) * 100),
  }));
  return (
    <SketchCard hover={false} as="section" aria-label={`Biểu đồ radar tiêu chí ${ev.sprint}`} className="relative p-5">
      <StampMoc tone="blue" rotate={-7} className="absolute right-4 top-4 !px-2.5 !py-0.5 !text-[0.6rem]">
        {ev.sprint}
      </StampMoc>
      <h2 className="flex items-center gap-2 text-base font-extrabold">
        <VCompass size={17} className="text-[var(--royal)]" aria-hidden="true" />
        Bảng tiêu chí dạng radar
      </h2>
      <p className="mt-0.5 text-[0.75rem] text-[var(--ink-soft)]">
        Tỷ lệ đạt của từng tiêu chí (0–100%) — chạm biểu đồ để xem điểm gốc dạng x / max.
      </p>
      <div className="chart-ink relative mt-3 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} margin={{ top: 12, right: 28, bottom: 12, left: 28 }}>
            <PolarGrid
              stroke="color-mix(in srgb, var(--ink) 45%, transparent)"
              strokeDasharray="4 4"
            />
            <PolarAngleAxis
              dataKey="subject"
              tick={(props) => <RadarAxisTick {...props} />}
            />
            <PolarRadiusAxis
              domain={[0, 100]}
              tickCount={5}
              tick={{ fill: "var(--ink-faint)", fontSize: 10 }}
              axisLine={false}
            />
            <Tooltip cursor={false} content={<RadarTip />} />
            <Radar
              name="Đạt (%)"
              dataKey="diem"
              stroke="var(--royal)"
              strokeWidth={2}
              fill="var(--royal)"
              fillOpacity={0.25}
              dot={{ r: 2.5, fill: "var(--royal)", stroke: "var(--ink)", strokeWidth: 1 }}
              isAnimationActive={!reduced}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <MarginNote className="mt-2">mực loang càng rộng — kỹ năng càng đều</MarginNote>
    </SketchCard>
  );
}

function EvalCard({ ev, defaultOpen }: { ev: Evaluation; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <StaggerItem>
      <SketchCard as="article" className="relative p-5">
        <span className="absolute right-4 top-4 hidden rotate-[-8deg] sm:block">
          <StampMoc tone="blue" rotate={-8} className="!px-2.5 !py-0.5 !text-[0.6rem]">
            Đã chốt
          </StampMoc>
        </span>

        <div className="flex flex-col gap-5 sm:flex-row sm:gap-7">
          {/* Cột điểm số */}
          <div className="shrink-0 sm:w-36">
            <p
              className="tabular text-5xl font-extrabold leading-none"
              style={{ color: scoreColor(ev.finalScore) }}
            >
              <CountUpNumber value={ev.finalScore} decimals={1} duration={1000} />
            </p>
            <p className="mt-1 text-sm font-bold text-[var(--ink-soft)]">/ 10 điểm</p>
            <SquiggleUnderline className="mt-1.5 h-2.5 w-28 text-[var(--royal)]" />
            <p className="mt-2.5 font-hand text-xs leading-snug text-[var(--pencil)]">
              AI đề xuất {ev.aiScore.toFixed(1)} → chốt <b>{ev.finalScore.toFixed(1)}</b>
            </p>
          </div>

          {/* Nội dung chính */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 pr-20 sm:pr-24">
              <InkBadge tone="blue">{ev.sprint}</InkBadge>
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.78rem] text-[var(--ink-soft)]">
              <span className="inline-flex items-center gap-1.5">
                <VUser size={14} /> {ev.instructor}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <VClock size={14} /> Chốt ngày {formatDateVN(ev.finalizedAt)}
              </span>
            </p>

            <blockquote className="mt-3 border-l-2 border-[var(--stamp-red)] pl-3.5 font-hand text-[1.05rem] leading-snug">
              &ldquo;{ev.comment}&rdquo;
            </blockquote>

            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="focus-ink mt-3.5 inline-flex items-center gap-1.5 rounded-md text-[0.78rem] font-bold text-[var(--royal)] hover:underline"
            >
              {open ? "Thu gọn tiêu chí" : "Xem tiêu chí chấm"}
              <VChevronDown
                size={14}
                className={cn("transition-transform duration-200", open && "rotate-180")}
              />
            </button>

            {open && (
              <div className="nb-rise mt-3 grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
                {ev.criteria.map((c) => {
                  const pct = Math.round((c.score / c.max) * 100);
                  const tone = criteriaColor(pct);
                  return (
                    <div key={c.label}>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-[0.78rem] font-semibold">
                          {c.label}
                          {c.weight !== undefined && (
                            <span className="tabular ml-1.5 text-[0.66rem] font-bold text-[var(--ink-soft)]">
                              · trọng số {c.weight}%
                            </span>
                          )}
                        </p>
                        <p className="tabular shrink-0 text-[0.78rem] font-bold" style={{ color: tone }}>
                          {c.score.toFixed(1)} / {c.max} điểm
                        </p>
                      </div>
                      <div className="mt-1 h-2.5 overflow-hidden rounded-full border-2 border-[var(--ink)] bg-[var(--paper)]">
                        <div
                          className="bar-grow h-full rounded-full"
                          style={{ width: `${pct}%`, background: tone }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SketchCard>
    </StaggerItem>
  );
}

export default function StudentEvaluations() {
  const { data, loading, error, reload } = useApi<Evaluation[]>(() => listMyEvaluations(), []);

  return (
    <div>
      <PageHeading
        eyebrow="Năng lực & kết quả"
        title="Đánh giá"
        sub="Chỉ hiển thị đánh giá chính thức đã chốt — nháp AI nằm trong từng bài nộp."
        margin="điểm chính thức do giảng viên chốt, không tự động từ AI"
      />

      {/* Giải thích luồng đánh giá */}
      <SketchCard hover={false} className="mb-6 p-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--blue-mist)] text-[var(--royal)]">
            <VClipboardCheck size={15} />
          </span>
          <h2 className="text-base font-extrabold">Đánh giá diễn ra thế nào?</h2>
        </div>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step}
              className="rounded-[10px_12px_10px_12px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_28%,transparent)] bg-[var(--paper)] p-3"
            >
              <p className="font-hand text-lg leading-none text-[var(--royal)]">Bước {i + 1}</p>
              <p className="mt-1.5 text-[0.82rem] font-semibold leading-snug">{step}</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 font-hand text-[0.95rem] text-[var(--ink-soft)]">
          Lưu ý: điểm AI đề xuất không tự trở thành điểm chính thức.
        </p>
      </SketchCard>

      {loading && <LoadingPanel rows={2} label="Đang mở sổ đánh giá..." />}

      {!loading && error && <ErrorPanel message={error} onRetry={reload} />}

      {!loading && !error && (data?.length ?? 0) === 0 && (
        <SketchCard hover={false} className="p-4">
          <EmptyFigure
            image="/images/student-mascot-v2.png"
            alt="Linh vật sinh viên V-Intern đang đọc sổ tay"
            title="Chưa có đánh giá nào — sách mới mở trang đầu"
          >
            <MarginNote className="mt-1 max-w-sm">
              kỳ đánh giá đầu tiên sẽ xuất hiện sau khi giảng viên chốt điểm sprint của bạn
            </MarginNote>
          </EmptyFigure>
        </SketchCard>
      )}

      {!loading && !error && (data?.length ?? 0) > 0 && (
        <Stagger className="space-y-5">
          {/* Kỳ mới nhất: thẻ điểm + bảng radar tiêu chí cạnh nhau trên màn lớn */}
          <div className="grid items-start gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <EvalCard ev={data![0]} defaultOpen />
            <CriteriaRadar ev={data![0]} />
          </div>
          {data!.slice(1).map((ev) => (
            <EvalCard key={ev.id} ev={ev} defaultOpen={false} />
          ))}
        </Stagger>
      )}
    </div>
  );
}
