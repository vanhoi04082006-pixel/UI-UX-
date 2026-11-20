"use client";

import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  VCheckCheck,
  VCircleDot,
  VClock,
  VColumns,
  VHourglass,
  VKanban,
  VPlay,
  VRefresh,
  VStar,
} from "@/components/icons/v-icons";
import { CheckDoodle, PushPin, RibbonBookmark } from "@/components/notebook/doodles";
import { FadeIn, InkButton } from "@/components/notebook/reveal";
import {
  CodeChip,
  ErrorState,
  MetricTile,
  MiniBar,
  PageHeading,
  PRIORITY_DOT,
  PRIORITY_LABEL,
  SkeletonBlock,
  initialsOf,
} from "@/components/staff/instructor-shared";
import { InkBadge, MarginNote, NoteCard, SketchCard, Tape } from "@/components/notebook/ui";
import { useMock } from "@/lib/use-mock";
import type { SprintBoard, SprintBoardTask } from "@/lib/mock/types";

/* =====================================================================
 * SPRINT & TASK — bảng kanban chỉ xem của giảng viên + burndown.
 * ===================================================================== */

const COLUMN_TAPE: Record<string, { tape: "slate" | "blue" | "warm" | "mint" }> = {
  todo: { tape: "slate" },
  doing: { tape: "blue" },
  review: { tape: "warm" },
  done: { tape: "mint" },
};

const COLUMN_FILL: Record<string, string> = {
  todo: "color-mix(in srgb, var(--warning) 32%, transparent)",
  doing: "var(--royal)",
  review: "var(--warning)",
  done: "var(--success)",
};

const INK_TOOLTIP = {
  background: "var(--paper-raised)",
  border: "2px solid var(--ink)",
  borderRadius: "10px 12px 10px 12px",
  boxShadow: "3px 3px 0 0 var(--hard-shadow)",
  fontSize: "0.75rem",
  padding: "6px 10px",
} as const;

function TaskStatusIcon({ status }: { status: SprintBoardTask["status"] }) {
  if (status === "done") return <CheckDoodle className="h-4 w-4 text-[var(--success)]" />;
  if (status === "review") return <VClock size={14} className="text-[var(--warning)]" />;
  if (status === "doing") return <VPlay size={14} className="text-[var(--royal)]" />;
  return <VCircleDot size={14} className="text-[var(--ink-soft)]" />;
}

export default function InstructorSprints() {
  const { data: board, loading, error, reload } = useMock<SprintBoard>("instructor/board");
  const reduced = useReducedMotion();

  const burndownData = useMemo(() => {
    const raw = board?.burndown ?? [];
    if (raw.length < 2) return [];
    const start = raw[0];
    const n = raw.length;
    return raw.map((v, i) => ({
      day: i + 1,
      conLai: v,
      lyTuong: Math.round((start * (n - 1 - i)) / (n - 1)),
    }));
  }, [board]);

  const counts = useMemo(() => {
    const by = (key: string) => board?.columns.find((c) => c.key === key)?.tasks.length ?? 0;
    return {
      total: board?.columns.reduce((s, c) => s + c.tasks.length, 0) ?? 0,
      todo: by("todo"),
      doing: by("doing"),
      review: by("review"),
      done: by("done"),
    };
  }, [board]);

  const completion = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;

  if (error) {
    return (
      <div className="space-y-5">
        <PageHeading eyebrow="Sổ tay hành trình · Giảng viên" title="Sprint & Task" />
        <ErrorState message={error} onRetry={reload} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ===== Tiêu đề ===== */}
      <PageHeading eyebrow="Sổ tay hành trình · Giảng viên" title="Sprint & Task">
        <InkButton variant="outline" size="sm" onClick={reload}>
          <VRefresh size={15} /> Làm mới
        </InkButton>
      </PageHeading>

      {loading && !board ? (
        <div className="space-y-5">
          <SkeletonBlock className="h-24" />
          <div className="grid gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-72" />
            ))}
          </div>
        </div>
      ) : board ? (
        <>
          {/* ===== Dải nhận diện sprint ===== */}
          <FadeIn>
            <div className="relative flex flex-wrap items-center gap-2.5 pt-1.5">
              {/* Băng dính đổi màu theo độ gấp của sprint còn lại */}
              <Tape
                variant={board.daysLeft > 7 ? "blue" : "warm"}
                className={board.daysLeft <= 3 ? "tape-gold" : ""}
                rotate={-5}
                style={{ top: -13, left: 2, width: 62, height: 18 }}
              />
              <CodeChip className="!px-2.5 !py-1 !text-[0.74rem]">{board.name}</CodeChip>
              <InkBadge tone="neutral">{board.week}</InkBadge>
              <InkBadge tone="amber">
                <VHourglass size={13} /> còn {board.daysLeft} ngày
              </InkBadge>
              <span className="ml-auto hidden font-geist-mono text-[0.66rem] uppercase tracking-[0.16em] text-[var(--ink-soft)] sm:block">
                chỉ xem · giảng viên
              </span>
            </div>
          </FadeIn>

          {/* ===== Mục tiêu sprint ===== */}
          <FadeIn delay={0.05}>
            <SketchCard as="section" className="relative overflow-hidden p-5">
              <PushPin className="absolute right-5 top-4 h-8 w-8 rotate-6 text-[var(--royal)]" />
              <p className="eyebrow flex items-center gap-2">
                <RibbonBookmark className="h-5 w-5 -rotate-6 text-[var(--gold)]" />
                Mục tiêu sprint
              </p>
              <blockquote className="mt-2 max-w-2xl border-l-4 border-[color-mix(in_srgb,var(--royal)_55%,transparent)] pl-3.5 font-hand text-xl leading-snug">
                “{board.goal}”
              </blockquote>
              <MarginNote className="mt-3">
                cột Chờ duyệt đang giữ {counts.review} thẻ — dọn sớm, đừng dồn hết cuối tuần
              </MarginNote>
            </SketchCard>
          </FadeIn>

          {/* ===== Kanban board ===== */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {board.columns.map((col) => (
              <section key={col.key} aria-label={`Cột ${col.label}`} className="flex flex-col">
                <SketchCard hover={false} className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                  {COLUMN_TAPE[col.key] && (
                    <span aria-hidden="true" className={`tape ${`tape-${COLUMN_TAPE[col.key].tape}`}`} style={{ top: -10, left: "50%", width: 72, height: 20, transform: "translateX(-50%) rotate(-3deg)" }} />
                  )}
                  <header className="flex items-center justify-between gap-2 px-3.5 pb-2.5 pt-6">
                    <h2 className="flex items-center gap-1.5 text-[0.92rem] font-bold">
                      <VColumns size={15} className="text-[var(--ink-soft)]" aria-hidden="true" />
                      {col.label}
                    </h2>
                    <span className="rounded-full border-[1.5px] border-[var(--ink)] bg-[var(--paper)] px-2 py-px font-geist-mono text-[0.66rem] font-bold tabular">
                      {col.tasks.length}
                    </span>
                  </header>
                  <div className="paper-lined flex-1 border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_18%,transparent)] p-2.5">
                    <ul className="space-y-2.5">
                      {col.tasks.map((t) => (
                        <li
                          key={t.id}
                          className={`sketch-border-thin bg-[var(--paper-raised)] p-3 transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:rotate-[-0.4deg] hover:shadow-ink-3 ${
                            t.status === "review" ? "border-l-[3px] border-l-[var(--warning)]" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <CodeChip>{t.code}</CodeChip>
                            <TaskStatusIcon status={t.status} />
                          </div>
                          <p
                            className={`mt-1.5 line-clamp-2 min-h-[2.4rem] text-[0.82rem] font-semibold leading-snug ${
                              t.status === "done" ? "strikethrough-ink" : ""
                            }`}
                          >
                            {t.title}
                          </p>
                          <div className="mt-2 flex items-center gap-1.5 text-[0.7rem] font-semibold text-[var(--ink-soft)]">
                            <span
                              aria-hidden="true"
                              className="grid h-4.5 w-4.5 place-items-center rounded-full border-[1.5px] border-[var(--ink)] bg-[var(--blue-mist)] text-[0.5rem] font-bold text-[var(--royal)]"
                              style={{ height: 18, width: 18 }}
                            >
                              {initialsOf(t.assignee)}
                            </span>
                            <span className="truncate">{t.assignee}</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between border-t border-dashed border-[color-mix(in_srgb,var(--ink)_20%,transparent)] pt-2">
                            <span
                              title={`Ưu tiên: ${PRIORITY_LABEL[t.priority]}`}
                              className="inline-flex items-center gap-1.5 text-[0.66rem] font-bold text-[var(--ink-soft)]"
                            >
                              <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full border border-[var(--ink)] ${PRIORITY_DOT[t.priority]}`} />
                              <span className="sr-only">Ưu tiên {PRIORITY_LABEL[t.priority]} —</span>
                              {PRIORITY_LABEL[t.priority]}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[0.68rem] font-bold tabular">
                              <VStar size={12} className="text-[var(--royal)]" />
                              {t.points} điểm
                            </span>
                          </div>
                        </li>
                      ))}
                      {col.tasks.length === 0 && (
                        <li className="py-4 text-center font-hand text-[0.95rem] text-[var(--ink-soft)]">
                          cột trống trơn ✎
                        </li>
                      )}
                    </ul>
                  </div>
                </SketchCard>
              </section>
            ))}
          </div>

          {/* ===== Burndown + phân bố ===== */}
          <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
            <FadeIn>
              <SketchCard as="section" className="p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-[1.02rem] font-bold">Burndown sprint</h2>
                  <span className="flex items-center gap-3 text-[0.68rem] font-semibold text-[var(--ink-soft)]">
                    <span className="inline-flex items-center gap-1.5">
                      <span aria-hidden="true" className="h-0.5 w-4 rounded bg-[var(--royal)]" />
                      thực tế
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span aria-hidden="true" className="h-0.5 w-4 rounded border-t-2 border-dashed border-[var(--success)]" />
                      Nhịp độ lý tưởng
                    </span>
                  </span>
                </div>
                <div className="chart-ink mt-3 h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={burndownData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                      <defs>
                        <linearGradient id="spBurndownFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--royal)" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="var(--royal)" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--line)" strokeDasharray="4 4" vertical={false} />
                      <XAxis
                        dataKey="day"
                        tickFormatter={(v: number) => `N${v}`}
                        tick={{ fill: "var(--ink-soft)", fontSize: 10 }}
                        axisLine={{ stroke: "var(--ink-soft)" }}
                        tickLine={false}
                        interval={1}
                      />
                      <YAxis
                        tick={{ fill: "var(--ink-soft)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                      />
                      <Tooltip
                        cursor={{ stroke: "var(--ink-soft)", strokeDasharray: "4 4" }}
                        contentStyle={INK_TOOLTIP}
                        labelFormatter={(v) => `Ngày ${v}`}
                        labelStyle={{ color: "var(--ink-soft)", fontSize: "0.66rem" }}
                        itemStyle={{ color: "var(--ink)", fontWeight: 700 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="lyTuong"
                        name="Nhịp độ lý tưởng"
                        stroke="var(--success)"
                        strokeWidth={1.8}
                        strokeDasharray="5 5"
                        fill="none"
                        dot={false}
                        isAnimationActive={!reduced}
                      />
                      <Area
                        type="monotone"
                        dataKey="conLai"
                        name="Còn lại"
                        stroke="var(--royal)"
                        strokeWidth={2.5}
                        fill="url(#spBurndownFill)"
                        dot={{ r: 2.5, fill: "var(--paper-raised)", stroke: "var(--royal)", strokeWidth: 2 }}
                        activeDot={{ r: 4.5, fill: "var(--royal)", stroke: "var(--ink)", strokeWidth: 2 }}
                        isAnimationActive={!reduced}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <MarginNote className="mt-2">
                  trục dọc là số điểm còn lại — đường xanh tụt nhanh là tín hiệu tốt
                </MarginNote>
              </SketchCard>
            </FadeIn>

            <div className="space-y-5">
              <FadeIn delay={0.06}>
                <SketchCard as="section" className="p-4 sm:p-5">
                  <h2 className="text-[1.02rem] font-bold">Phân bố nhiệm vụ</h2>
                  <div className="chart-ink relative mt-2 h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={board.columns.map((c) => ({ name: c.label, value: c.tasks.length, key: c.key }))}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius="58%"
                          outerRadius="86%"
                          paddingAngle={4}
                          stroke="var(--ink)"
                          strokeWidth={2}
                          isAnimationActive={!reduced}
                        >
                          {board.columns.map((c) => (
                            <Cell key={c.key} fill={COLUMN_FILL[c.key]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={INK_TOOLTIP}
                          itemStyle={{ color: "var(--ink)", fontWeight: 700 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 grid place-items-center">
                      <div className="text-center">
                        <p className="text-2xl font-extrabold leading-none tabular">{counts.total}</p>
                        <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                          nhiệm vụ
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Chip chú giải kèm số đếm từng cột */}
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {board.columns.map((c) => (
                      <li
                        key={c.key}
                        className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[color-mix(in_srgb,var(--ink)_30%,transparent)] bg-[var(--paper)] px-2.5 py-0.5 text-[0.7rem] font-semibold"
                      >
                        <span
                          aria-hidden="true"
                          className="h-2.5 w-2.5 rounded-full border-[1.5px] border-[var(--ink)]"
                          style={{ background: COLUMN_FILL[c.key] }}
                        />
                        {c.label}
                        <span className="font-geist-mono text-[0.62rem] font-bold tabular text-[var(--ink-soft)]">
                          {c.tasks.length}
                        </span>
                      </li>
                    ))}
                  </ul>
                </SketchCard>
              </FadeIn>

              <FadeIn delay={0.12}>
                <NoteCard title="Chế độ chia sẻ" tone="yellow" rotate={1}>
                  Bảng này chia sẻ cho sinh viên ở chế độ <b>chỉ xem</b> — sinh viên kéo thẻ trên kanban cá nhân
                  của họ.
                </NoteCard>
              </FadeIn>
            </div>
          </div>

          {/* ===== Tóm tắt ===== */}
          <FadeIn>
            <div className="nb-stagger grid grid-cols-2 gap-3.5 lg:grid-cols-4">
              <MetricTile
                icon={VKanban}
                label="Tổng nhiệm vụ"
                value={counts.total}
                countUp={{ to: counts.total }}
                tone="neutral"
              />
              <MetricTile
                icon={VCircleDot}
                label="Cần làm"
                value={counts.todo}
                countUp={{ to: counts.todo }}
                tone="amber"
              />
              <MetricTile
                icon={VPlay}
                label="Đang làm"
                value={counts.doing}
                countUp={{ to: counts.doing }}
                tone="royal"
              />
              <MetricTile
                icon={VCheckCheck}
                label="Hoàn thành"
                value={counts.done}
                countUp={{ to: counts.done }}
                tone="green"
              />
            </div>
            <SketchCard hover={false} className="mt-3.5 p-4">
              <div className="mb-1.5 flex items-center justify-between text-[0.78rem] font-bold">
                <span>Mức hoàn thành sprint</span>
                <span className="tabular">{completion}%</span>
              </div>
              <MiniBar value={completion} tone="success" label="Mức hoàn thành sprint" />
            </SketchCard>
          </FadeIn>
        </>
      ) : null}
    </div>
  );
}
