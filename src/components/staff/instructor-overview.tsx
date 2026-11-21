"use client";

import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import {
  VChartColumn,
  VChevronRight,
  VClipboardCheck,
  VArrowRight,
  VCalendarCheck,
  VCheckCheck,
  VGitPullRequest,
  VHourglass,
  VKanban,
  VSparkles,
  VStopwatch,
  VUsers,
  VX,
} from "@/components/icons/v-icons";
import type { VIconComponent } from "@/components/icons/v-icons";
import { relativeTimeVN } from "@/components/shared/bell-utils";
import { FadeIn } from "@/components/notebook/reveal";
import {
  AvatarStack,
  CodeChip,
  ErrorState,
  MetaStrip,
  MetricTile,
  MiniBar,
  PageHeading,
  SkeletonBlock,
} from "@/components/staff/instructor-shared";
import {
  InkBadge,
  MarginNote,
  NoteCard,
  SketchCard,
  formatDateVN,
  formatDateTimeVN,
} from "@/components/notebook/ui";
import { useApp } from "@/lib/store";
import { useApi } from "@/lib/use-api";
import {
  getInstructorDashboard,
  listSessions,
  listSubmissions,
} from "@/lib/api/instructor";
import type { InstructorDashboard } from "@/lib/api/instructor";
import { fetchPreviewBoard } from "@/components/staff/staff-api";
import type {
  GradingItem,
  InstructorSession,
  SprintBoard,
} from "@/lib/mock/types";

/* =====================================================================
 * TỔNG QUAN GIẢNG DẠY — Sổ tay hành trình, vai trò giảng viên.
 * ===================================================================== */

interface OverviewStats {
  sessions: number;
  interns: number;
  sprintCompletion: number;
  avgAiScore: number;
  pendingReviews: number;
}

export default function InstructorOverview() {
  const navigate = useApp((s) => s.navigate);
  const user = useApp((s) => s.user);
  const reduced = useReducedMotion();

  const dashboard = useApi<InstructorDashboard>(getInstructorDashboard);
  const sessions = useApi<InstructorSession[]>(listSessions);
  const grading = useApi<GradingItem[]>(listSubmissions);
  const {
    data: board,
    loading: boardLoading,
    error: boardError,
    reload: reloadBoard,
  } = useApi<SprintBoard | null>(fetchPreviewBoard);

  const loading = dashboard.loading || sessions.loading || boardLoading;
  const error = dashboard.error ?? sessions.error ?? boardError;

  const updatedAt = useMemo(() => formatDateTimeVN(new Date().toISOString()), []);
  const sessionList = sessions.data ?? [];
  const activeSessions = sessionList.filter((s) => s.status === "active");
  const pendingItems = (grading.data ?? []).filter((g) => g.status === "pending");

  /* Tổng quan — gộp từ dashboard contract; sprintCompletion/avgAiScore không có
     trong metrics nên suy ra đúng công thức máy chủ cũ (giữ nguyên số hiển thị). */
  const stats = useMemo<OverviewStats | null>(() => {
    const metrics = dashboard.data?.metrics;
    if (!metrics || sessions.data === undefined || grading.data === undefined) return null;
    const gradingRows = grading.data;
    return {
      sessions: metrics.activeSessions,
      interns: activeSessions.reduce((sum, s) => sum + s.members, 0),
      sprintCompletion: Math.round(
        activeSessions.reduce((s, x) => s + x.progress, 0) / Math.max(activeSessions.length, 1),
      ),
      avgAiScore:
        Math.round((gradingRows.reduce((s, g) => s + g.aiScore, 0) / Math.max(gradingRows.length, 1)) * 10) / 10,
      pendingReviews: metrics.pendingReviews,
    };
  }, [dashboard.data, sessions.data, grading.data]);

  const burndownData = useMemo(() => {
    const raw = board?.burndown ?? [];
    if (raw.length < 2) return [];
    const start = raw[0];
    const n = raw.length;
    return raw.map((v, i) => ({
      day: `N${i + 1}`,
      diem: v,
      lyTuong: Math.round((start * (n - 1 - i)) / (n - 1)),
    }));
  }, [board]);

  const ss02DaysLeft = useMemo(() => {
    const ss2 = sessionList.find((s) => s.code === "SS-2026-02");
    if (!ss2) return 8;
    const diff = new Date(ss2.endDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86_400_000));
  }, [sessionList]);

  const activities: { icon: VIconComponent; label: string; at: string }[] = useMemo(() => {
    const now = Date.now();
    const ago = (h: number) => new Date(now - h * 3_600_000).toISOString();
    return [
      { icon: VGitPullRequest, label: "PR #142 của Nguyễn Minh — API-201 vào cột Chờ duyệt", at: ago(2) },
      { icon: VCheckCheck, label: "Đã duyệt PR #138 của Đỗ Kha — FE-109 · 8.5", at: ago(26) },
      { icon: VX, label: "Trả lại FE-099 của Lê Hoàng — tỉ lệ mascot lệch ở 390px", at: ago(49) },
      { icon: VUsers, label: "SS-2026-02 vượt mốc tiến độ 76% — cao nhất kỳ này", at: ago(6) },
    ];
  }, []);

  if (error) {
    return (
      <div className="space-y-5">
        <PageHeading eyebrow="Sổ tay hành trình · Giảng viên" title="Tổng quan giảng dạy" />
        <ErrorState
          message={error}
          onRetry={() => {
            dashboard.reload();
            sessions.reload();
            grading.reload();
            reloadBoard();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ===== Dải meta + "tuần này" ===== */}
      <div className="space-y-4">
        <PageHeading eyebrow="Sổ tay hành trình · Giảng viên" title="Tổng quan giảng dạy" />
        <MetaStrip
          items={[
            "Giảng viên",
            user?.name ?? "TS. Phạm Thu Lan",
            "SS-2026-01 Sprint 3",
            `cập nhật ${updatedAt}`,
          ]}
        />
        {/* ===== Dải "tuần này": việc sắp tới mắt ===== */}
        <FadeIn delay={0.03}>
          <SketchCard hover={false} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5">
            <span className="font-geist-mono text-[0.64rem] font-bold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
              Tuần này
            </span>
            <span className="flex items-center gap-1.5 text-[0.76rem] font-semibold">
              <VCalendarCheck size={14} className="text-[var(--royal)]" />
              Buổi hướng dẫn <b>Thứ 4 · 14:00</b> — nhóm SS-2026-01
            </span>
            <span className="flex items-center gap-1.5 text-[0.76rem] font-semibold">
              <VStopwatch size={14} className="text-[var(--warning)]" />
              Hạn chấm <b>48h</b> · {pendingItems.length} bài chờ
            </span>
            {board && (
              <span className="flex items-center gap-1.5 text-[0.76rem] font-semibold">
                <VHourglass size={14} className="text-[var(--success)]" />
                Sprint còn <b className="tabular">{board.daysLeft}</b> ngày
              </span>
            )}
          </SketchCard>
        </FadeIn>
      </div>

      {/* ===== 5 ô số liệu ===== */}
      <div className="nb-stagger grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-5">
        {loading && !stats ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonBlock key={i} className="h-[7.25rem]" />)
        ) : stats ? (
          <>
            <MetricTile
              icon={VKanban}
              label="Phiên đang diễn ra"
              value={`${stats.sessions}/${sessionList.length}`}
              countUp={{ to: stats.sessions, suffix: `/${sessionList.length}` }}
              sub="tổng đã mở"
              tone="royal"
              onClick={() => navigate("sessions")}
            />
            <MetricTile
              icon={VUsers}
              label="Sinh viên đang hướng dẫn"
              value={stats.interns}
              countUp={{ to: stats.interns }}
              sub="2 phiên đang mở"
              tone="green"
              onClick={() => navigate("sessions")}
            />
            <MetricTile
              icon={VChartColumn}
              label="Hoàn thành sprint"
              value={`${stats.sprintCompletion}%`}
              countUp={{ to: stats.sprintCompletion, suffix: "%" }}
              bar={stats.sprintCompletion}
              tone="royal"
              onClick={() => navigate("sprints")}
            />
            <MetricTile
              icon={VSparkles}
              label="Điểm AI trung bình"
              value={`${stats.avgAiScore.toFixed(1)}/10`}
              countUp={{ to: stats.avgAiScore, decimals: 1, suffix: "/10" }}
              sub="bản nháp tham khảo"
              tone="neutral"
              onClick={() => navigate("grading")}
            />
            <MetricTile
              icon={VClipboardCheck}
              label="Bài chờ duyệt"
              value={stats.pendingReviews}
              countUp={{ to: stats.pendingReviews }}
              note="xử lý trong 48h"
              tone="amber"
              onClick={() => navigate("grading")}
            />
          </>
        ) : null}
      </div>

      {/* ===== 2 cột: phiên + hàng chờ | tiến độ sprint ===== */}
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* Cột trái */}
        <div className="space-y-5">
          <FadeIn>
            <SketchCard as="section" className="overflow-hidden">
              <header className="flex items-center justify-between gap-3 border-b-2 border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)] px-4 py-3 sm:px-5">
                <h2 className="text-[1.02rem] font-bold">Phiên đang diễn ra</h2>
                <span className="font-geist-mono text-[0.68rem] uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                  {activeSessions.length} phiên
                </span>
              </header>
              <ul className="divide-y-2 divide-dashed divide-[color-mix(in_srgb,var(--ink)_15%,transparent)]">
                {loading && !sessions.data ? (
                  <li className="px-4 py-5 sm:px-5">
                    <SkeletonBlock className="h-20" />
                  </li>
                ) : (
                  activeSessions.map((s) => (
                    <li key={s.id} className="sticker-pop">
                      <button
                        type="button"
                        onClick={() => navigate("sessions")}
                        className="focus-ink group flex w-full flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 text-left transition-colors hover:bg-[var(--blue-mist)] sm:px-5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <CodeChip className="!text-[0.7rem]">{s.code}</CodeChip>
                            <InkBadge tone="green" dot>
                              {s.sprint}
                            </InkBadge>
                          </div>
                          <p className="mt-1.5 truncate text-[0.92rem] font-semibold">{s.project}</p>
                          <p className="mt-0.5 text-[0.7rem] text-[var(--ink-soft)] tabular">
                            {formatDateVN(s.startDate)} → {formatDateVN(s.endDate)} · {s.members} sinh viên
                          </p>
                        </div>
                        <AvatarStack names={s.memberNames} max={4} />
                        <div className="w-full sm:w-36">
                          <div className="mb-1 flex items-center justify-between text-[0.7rem] font-bold">
                            <span className="text-[var(--ink-soft)]">Tiến độ</span>
                            <span className="tabular">{s.progress}%</span>
                          </div>
                          <MiniBar value={s.progress} label={`Tiến độ ${s.code}`} />
                        </div>
                        <VChevronRight
                          size={18}
                          className="shrink-0 text-[var(--ink-soft)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--royal)]"
                        />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </SketchCard>
          </FadeIn>

          <FadeIn delay={0.08}>
            <SketchCard
              as="section"
              className={`overflow-hidden ${pendingItems.length >= 4 ? "ants-border [--ants-color:var(--warning)]" : ""}`}
            >
              <header className="flex items-center justify-between gap-3 border-b-2 border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)] px-4 py-3 sm:px-5">
                <h2 className="text-[1.02rem] font-bold">Hàng chờ duyệt</h2>
                <InkBadge tone="amber" dot>
                  {pendingItems.length} bài
                </InkBadge>
              </header>
              <ul className="divide-y-2 divide-dashed divide-[color-mix(in_srgb,var(--ink)_15%,transparent)]">
                {pendingItems.slice(0, 3).map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => navigate("grading")}
                      className="focus-ink group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--blue-mist)] sm:px-5"
                    >
                      <CodeChip>{g.taskCode}</CodeChip>
                      <span className="min-w-0 flex-1 truncate text-[0.84rem] font-semibold">
                        {g.student}
                        <span className="ml-2 hidden font-normal text-[var(--ink-soft)] sm:inline">{g.taskTitle}</span>
                      </span>
                      <InkBadge
                        tone={g.aiScore >= 8 ? "green" : g.aiScore >= 6.5 ? "amber" : "red"}
                        className="!px-2 !text-[0.68rem] tabular"
                      >
                        AI {g.aiScore.toFixed(1)}
                      </InkBadge>
                      <VArrowRight
                        size={16}
                        className="shrink-0 text-[var(--ink-soft)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--royal)]"
                      />
                    </button>
                  </li>
                ))}
                {pendingItems.length === 0 && (
                  <li className="px-5 py-4 text-[0.82rem] text-[var(--ink-soft)]">
                    <span className="font-hand text-lg">Hàng chờ trống trơn — tuyệt vời ✎</span>
                  </li>
                )}
              </ul>
              <footer className="border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_15%,transparent)] px-4 py-2.5 sm:px-5">
                <button
                  type="button"
                  onClick={() => navigate("grading")}
                  className="focus-ink text-[0.78rem] font-bold text-[var(--royal)] underline decoration-dotted underline-offset-4 hover:text-[var(--ink)]"
                >
                  xem tất cả bài nộp
                </button>
              </footer>
            </SketchCard>
          </FadeIn>
        </div>

        {/* Cột phải */}
        <div className="space-y-5">
          <FadeIn delay={0.05}>
            <SketchCard as="section" className="p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-[1.02rem] font-bold">Tiến độ sprint</h2>
                  <p className="mt-0.5 font-geist-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                    {board?.name ?? "—"}
                  </p>
                </div>
                {board && (
                  <InkBadge tone="amber">
                    <VHourglass size={13} /> còn {board.daysLeft} ngày
                  </InkBadge>
                )}
              </div>
              {board && (
                <>
                  <blockquote className="mt-3 border-l-4 border-[color-mix(in_srgb,var(--royal)_55%,transparent)] pl-3 font-hand text-[1.02rem] leading-snug text-[var(--ink)]">
                    “{board.goal}”
                  </blockquote>
                  <div className="chart-ink mt-3 h-[140px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={burndownData} margin={{ top: 8, right: 4, bottom: 0, left: -14 }}>
                        <defs>
                          <linearGradient id="ovBurndownFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--royal)" stopOpacity={0.45} />
                            <stop offset="100%" stopColor="var(--royal)" stopOpacity={0.06} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="var(--line)" strokeDasharray="4 4" vertical={false} />
                        <XAxis
                          dataKey="day"
                          tick={{ fill: "var(--ink-soft)", fontSize: 10 }}
                          axisLine={{ stroke: "var(--ink-soft)" }}
                          tickLine={false}
                          interval={2}
                        />
                        <YAxis
                          tick={{ fill: "var(--ink-soft)", fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          width={38}
                        />
                        <Area
                          type="monotone"
                          dataKey="lyTuong"
                          name="Nhịp lý tưởng"
                          stroke="var(--success)"
                          strokeWidth={1.8}
                          strokeDasharray="5 5"
                          fill="none"
                          dot={false}
                          isAnimationActive={!reduced}
                        />
                        <Area
                          type="monotone"
                          dataKey="diem"
                          name="Còn lại"
                          stroke="var(--royal)"
                          strokeWidth={2.5}
                          fill="url(#ovBurndownFill)"
                          dot={false}
                          isAnimationActive={!reduced}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <MarginNote className="mt-2">nét đứt xanh lá là nhịp lý tưởng — đường royal tụt nhanh là tín hiệu tốt</MarginNote>
                </>
              )}
              {loading && !board && <SkeletonBlock className="mt-3 h-[180px]" />}
            </SketchCard>
          </FadeIn>

          <FadeIn delay={0.12}>
            <NoteCard title="Sắp chốt sprint" tone="mint" tapeVariant="mint" rotate={-1.2}>
              <span className="flex items-center gap-3">
                <VStopwatch size={26} className="shrink-0 text-[var(--success)]" />
                <span className="leading-snug">
                  <b>SS-2026-02</b> còn <b className="text-2xl font-extrabold tabular">{ss02DaysLeft}</b> ngày — nhắc nhóm
                  dọn cột Chờ duyệt sớm.
                </span>
              </span>
            </NoteCard>
          </FadeIn>
        </div>
      </div>

      {/* ===== Hoạt động gần đây ===== */}
      <FadeIn>
        <SketchCard as="section" className="overflow-hidden">
          <header className="border-b-2 border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)] px-4 py-3 sm:px-5">
            <h2 className="text-[1.02rem] font-bold">Hoạt động gần đây</h2>
          </header>
          <ol className="px-4 py-2 sm:px-5">
            {activities.map((a, i) => {
              const Icon = a.icon;
              return (
                <li key={i} className="relative flex items-start gap-3.5 py-3">
                  {i < activities.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="absolute top-[2.6rem] left-[1.05rem] h-[calc(100%-1.4rem)] border-l-2 border-dashed border-[color-mix(in_srgb,var(--ink)_28%,transparent)]"
                    />
                  )}
                  <span className="z-[1] grid h-[2.1rem] w-[2.1rem] shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--royal)]">
                    <Icon size={15} />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-[0.86rem] font-semibold leading-snug">{a.label}</p>
                    <p className="mt-0.5 font-geist-mono text-[0.66rem] uppercase tracking-[0.12em] text-[var(--ink-soft)] tabular">
                      {relativeTimeVN(a.at)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </SketchCard>
      </FadeIn>
    </div>
  );
}
