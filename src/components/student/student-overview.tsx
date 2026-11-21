"use client";

/* =====================================================================
 * STUDENT OVERVIEW — "Tổng quan" (Sổ tay hành trình).
 * Ba trạng thái hiển thị: active / waiting / finished.
 * ===================================================================== */

import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { getInternOverview } from "@/lib/api/work";
import { useApi } from "@/lib/use-api";
import type { InternOverview, Task } from "@/lib/mock/types";
import { cn } from "@/lib/utils";
import {
  Eyebrow,
  InkBadge,
  MarginNote,
  NoteCard,
  PRIORITY_META,
  SketchCard,
  StampMoc,
  TASK_STATUS_META,
  Tape,
  formatDateVN,
  formatDateTimeVN,
  formatMoneyVND,
} from "@/components/notebook/ui";
import { InkButton } from "@/components/notebook/reveal";
import {
  CheckDoodle,
  CircleDoodle,
  RibbonBookmark,
  SquiggleUnderline,
} from "@/components/notebook/doodles";
import {
  VAward,
  VBot,
  VChartColumn,
  VCheckCheck,
  VChevronRight,
  VCircleDot,
  VClock,
  VCertificate,
  VHourglass,
  VInbox,
  VKanban,
  VStar,
  VTerminal,
  VTimer,
  VTrophy,
  VWallet,
} from "@/components/icons/v-icons";
import {
  DUE_TONE_TEXT,
  ErrorNote,
  LoadingBlocks,
  MiniBar,
  PointsChip,
  activityMeta,
  CodeChip,
  dueInfo,
  timeGreetingVN,
  CountUpNumber,
} from "./student-shared";

/** Lời chào theo giờ + tên riêng của sinh viên. */
function greetingName(userName: string): string {
  return userName.trim().split(" ").slice(-1)[0] ?? userName;
}

/** Dòng ngày tiếng Việt đầy đủ kèm giờ, VD "Thứ Sáu, 6 tháng 3 · 10:24". */
function dateLineVN(now: Date): string {
  const date = now.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const time = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
}

export default function StudentOverview() {
  const user = useApp((s) => s.user);
  const userName = user?.name ?? "";
  const { data, loading, error, reload } = useApi<InternOverview>(
    () => getInternOverview(userName),
    [userName],
  );
  /* Trạng thái thực tập (active/waiting/finished) xưa do máy chủ tự tính từ
   * tài khoản; hợp đồng mới không mang theo — đối chiếu từ phiên đăng nhập
   * (cùng kiểu đối chiếu như userName phía trên). */
  const overview = data
    ? { ...data, internState: user?.internState ?? data.internState }
    : undefined;

  if (loading || (!overview && !error)) return <LoadingBlocks label="Đang lật trang tổng quan…" />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!overview) return null;

  if (overview.internState === "waiting") return <WaitingView data={overview} />;
  if (overview.internState === "finished") return <FinishedView data={overview} />;
  return <ActiveView data={overview} />;
}

/* ============================ ACTIVE ============================ */

function ActiveView({ data }: { data: InternOverview }) {
  const summary = data.taskSummary;
  const allDone = summary.total > 0 && summary.done === summary.total;
  const firstName = greetingName(data.userName);

  return (
    <div className="space-y-5">
      <header className="nb-rise flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <Eyebrow>TRANG TỔNG QUAN · {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" })}</Eyebrow>
          <h1 className="mt-1.5 text-2xl font-extrabold leading-tight text-[var(--ink)]">
            {timeGreetingVN()}, {firstName}!
          </h1>
          <p className="tabular mt-0.5 text-[0.78rem] font-semibold text-[var(--ink-soft)]">{dateLineVN(new Date())}</p>
          <p className="mt-1 font-hand text-[1.05rem] leading-snug text-[var(--pencil)]">{data.greeting}</p>
          <SquiggleUnderline className="mt-1 h-2.5 w-44 text-[var(--royal)]" />
        </div>
        <div className="flex flex-wrap items-center gap-4 pb-1">
          <MarginNote className="max-w-56">mỗi task ticked là một trang sổ được viết</MarginNote>
          {allDone && (
            <StampMoc tone="blue" rotate={-8} className="shrink-0">
              Đã hoàn tất
            </StampMoc>
          )}
        </div>
      </header>

      {data.placement && (
        <div className="nb-rise">
          <PlacementCard placement={data.placement} />
        </div>
      )}

      <MetricTiles summary={summary} />

      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <NextTaskQueue tasks={data.nextTasks} />
        {data.focusedTask ? (
          <FocusedTaskCard key={data.focusedTask.id} task={data.focusedTask} />
        ) : (
          <NoteCard title="Chưa có task đang dở" tone="pink" rotate={-1}>
            Khi bạn bấm "Chuyển sang Đang làm" ở một nhiệm vụ nào đó, nó sẽ hiện ngay tại đây để bạn
            đọc lại và viết tiếp.
          </NoteCard>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_330px]">
        <section aria-labelledby="activity-title" className="sketch-card p-5">
          <h2 id="activity-title" className="text-lg font-bold">
            Hoạt động gần đây
          </h2>
          <p className="mb-3 text-[0.78rem] text-[var(--ink-soft)]">
            Nhật ký hệ thống ghi lại từng nét mực bạn để lại trong sổ.
          </p>
          <ActivityList items={data.recentActivity} />
        </section>
        <div className="space-y-4">
          <NoteCard title="Nhắc nhỏ" tone="yellow" tapeVariant="candy" rotate={1}>
            Nộp sớm một bài đúng hạn vẫn hơn ba bài trễ hạn. <b>AI chấm nháp chỉ để tham khảo</b> —
            giảng viên mới là người chốt điểm chính thức!
          </NoteCard>
          {allDone && (
            <SketchCard hover={false} className="p-4 text-center">
              <CheckDoodle className="mx-auto h-8 w-8 text-[var(--success)]" />
              <p className="mt-2 font-hand text-lg leading-snug">
                Ngọn cờ sprint đã cắm xong — nghỉ tay một chút rồi sang Sprint Board chốt sổ nhé!
              </p>
            </SketchCard>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----- a) Thẻ dự án đang gắn + tiến độ phiên ----- */

function PlacementCard({ placement }: { placement: NonNullable<InternOverview["placement"]> }) {
  const sprintTone = placement.sprintStatus.includes("diễn ra")
    ? "blue"
    : placement.sprintStatus.includes("kết thúc")
      ? "neutral"
      : "green";
  const live = placement.sprintStatus.includes("diễn ra");
  return (
    <section aria-label="Dự án đang thực tập" className="sketch-card relative p-5 pt-6">
      <Tape variant="blue" rotate={2} className="tape-gold -top-3 right-8 !h-5 !w-24" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Eyebrow>DỰ ÁN ĐANG GẮN</Eyebrow>
          <h2 className="mt-1 text-xl font-extrabold leading-snug text-[var(--ink)]">{placement.project}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CodeChip code={placement.projectCode} />
            <InkBadge tone="neutral">{placement.session}</InkBadge>
            {live ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] px-2.5 py-0.5 text-[0.68rem] font-bold text-[var(--ink)]">
                <span className="ws-dot-live" aria-hidden="true" />
                {placement.sprint} · Đang diễn ra
              </span>
            ) : (
              <InkBadge tone={sprintTone} dot>
                {placement.sprint} · {placement.sprintStatus}
              </InkBadge>
            )}
          </div>
        </div>
        <MarginNote className="hidden max-w-52 lg:block">đồng hồ sprint đang chạy đều tay</MarginNote>
      </div>
      <div className="mt-5">
        <div className="flex items-center justify-between gap-3 text-[0.72rem] font-bold uppercase tracking-wide">
          <span className="text-[var(--ink-soft)]">Tiến độ phiên thực tập</span>
          <span className="tabular text-[var(--royal)]">
            <CountUpNumber value={placement.progressPct} suffix="%" /> · {placement.weekLabel}
          </span>
        </div>
        <div
          className="mt-1.5 h-3.5 overflow-hidden rounded-full border-2 border-[var(--ink)] bg-[var(--paper)]"
          role="progressbar"
          aria-valuenow={placement.progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Tiến độ phiên thực tập"
        >
          <div
            className="bar-grow h-full rounded-full bg-[var(--royal)]"
            style={{ width: `${Math.min(100, placement.progressPct)}%` }}
          />
        </div>
      </div>
    </section>
  );
}

/* ----- b) 5 ô số liệu ----- */

function MetricTiles({ summary }: { summary: InternOverview["taskSummary"] }) {
  const tiles = [
    { key: "total", label: "Tất cả", icon: VInbox, value: summary.total, accent: false },
    { key: "todo", label: "Cần bắt đầu", icon: VCircleDot, value: summary.todo, accent: false },
    { key: "doing", label: "Đang thực hiện", icon: VTimer, value: summary.doing, accent: false },
    { key: "review", label: "Chờ phản hồi", icon: VHourglass, value: summary.review, accent: false },
    { key: "done", label: "Đã hoàn thành", icon: VCheckCheck, value: summary.done, accent: true },
  ] as const;
  const total = Math.max(1, summary.total);

  return (
    <div className="nb-stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" role="list" aria-label="Số liệu nhiệm vụ">
      {tiles.map((t) => {
        const Icon = t.icon;
        const share = Math.round((t.value / total) * 100);
        return (
          <div
            key={t.key}
            role="listitem"
            className={cn("sketch-card sketch-card-hover p-4", t.accent && summary.done > 0 && "border-[var(--success)]")}
          >
            <span
              className={cn(
                "grid h-9 w-9 place-items-center rounded-[8px_10px_8px_10px] border-2 border-[var(--ink)]",
                t.accent ? "bg-[var(--note-mint)] text-[var(--note-mint-ink)]" : "bg-[var(--blue-mist)] text-[var(--royal)]",
              )}
            >
              <Icon size={17} />
            </span>
            <p
              className={cn(
                "mt-2.5 text-2xl font-extrabold leading-none",
                t.accent && summary.done > 0 && "text-[var(--success)]",
              )}
            >
              <CountUpNumber value={t.value} />
            </p>
            <p className="mt-1 text-[0.7rem] font-semibold text-[var(--ink-soft)]">{t.label}</p>
            <div
              className="mt-2.5 h-1.5 overflow-hidden rounded-full border border-[color-mix(in_srgb,var(--ink)_45%,transparent)] bg-[var(--paper)]"
              aria-hidden="true"
            >
              <div
                className={cn("bar-grow h-full rounded-full", t.accent ? "bg-[var(--success)]" : "bg-[var(--royal)]")}
                style={{ width: `${share}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ----- c) Hàng chờ việc tiếp theo ----- */

function NextTaskQueue({ tasks }: { tasks: Task[] }) {
  const navigate = useApp((s) => s.navigate);

  return (
    <section aria-labelledby="next-tasks-title" className="nb-rise">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="next-tasks-title" className="text-lg font-bold">
          Việc nên xử lý tiếp theo
        </h2>
        <MarginNote className="hidden text-[0.85rem] md:block">bấm một dòng để mở chi tiết</MarginNote>
      </div>
      {tasks.length === 0 ? (
        <SketchCard hover={false} className="p-6 text-center">
          <CheckDoodle className="mx-auto h-9 w-9 text-[var(--success)]" />
          <p className="mt-2 font-hand text-lg leading-snug">Hàng chờ trống trơn — mọi nhiệm vụ đã xử lý xong rồi!</p>
        </SketchCard>
      ) : (
        <ul className="grid gap-3">
          {tasks.map((t) => {
            const due = dueInfo(t.dueDate);
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => navigate("work")}
                  className="sketch-card sketch-card-hover focus-ink flex w-full flex-col gap-2 p-3.5 text-left"
                  aria-label={`Mở danh sách công việc — ${t.code}: ${t.title}`}
                >
                  <span className="flex items-center gap-3">
                    <CodeChip code={t.code} />
                    <span className="min-w-0 flex-1 text-[0.88rem] font-semibold leading-snug text-[var(--ink)] line-clamp-2">{t.title}</span>
                    <VChevronRight size={15} className="shrink-0 text-[var(--ink-soft)]" aria-hidden="true" />
                  </span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <InkBadge tone={PRIORITY_META[t.priority].tone}>{PRIORITY_META[t.priority].label}</InkBadge>
                    <span
                      className={cn(
                        "tabular inline-flex shrink-0 items-center gap-1 text-[0.72rem] font-semibold",
                        DUE_TONE_TEXT[due.tone],
                      )}
                    >
                      <VClock size={13} /> {due.text}
                    </span>
                    <MiniBar value={t.progress} className="w-24 sm:w-28" label={`Tiến độ ${t.code}`} barGrow />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ----- d) Task đang dở — "Tiếp tục từ đây" ----- */

function FocusedTaskCard({ task }: { task: Task }) {
  const navigate = useApp((s) => s.navigate);
  const [pct, setPct] = useState(task.progress);
  const due = dueInfo(task.dueDate);

  const bump = (delta: number) => {
    const next = Math.max(0, Math.min(100, pct + delta));
    if (next === pct) return;
    setPct(next);
    toast.success(`Tiến độ ${task.code} cập nhật: ${next}%`);
  };

  const metaRows: { label: string; node: React.ReactNode }[] = [
    { label: "Sprint", node: <span className="font-semibold">{task.sprint}</span> },
    { label: "Điểm", node: <PointsChip points={task.points} /> },
    {
      label: "Hạn nộp",
      node: (
        <span className={cn("tabular inline-flex items-center gap-1 text-[0.8rem] font-semibold", DUE_TONE_TEXT[due.tone])}>
          <VClock size={13} /> {formatDateVN(task.dueDate)} · {due.text}
        </span>
      ),
    },
    { label: "Ưu tiên", node: <InkBadge tone={PRIORITY_META[task.priority].tone}>{PRIORITY_META[task.priority].label}</InkBadge> },
  ];

  return (
    <section aria-label="Tiếp tục từ đây" className="sketch-card sketch-card-hover glow-ring relative p-5">
      <Tape variant="blue" rotate={-3} className="-top-2.5 left-6 !h-5 !w-20" />
      <div className="flex items-center justify-between gap-3">
        <Eyebrow>TIẾP TỤC TỪ ĐÂY</Eyebrow>
        <RibbonBookmark className="h-9 w-5 shrink-0 text-[var(--royal)]" />
      </div>

      <div className="mt-3 grid gap-5 lg:grid-cols-2 lg:gap-6">
        {/* Cột trái: thông tin task */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CodeChip code={task.code} />
            <InkBadge tone={TASK_STATUS_META[task.status].tone} dot>
              {TASK_STATUS_META[task.status].label}
            </InkBadge>
            <button
              type="button"
              className="link-chip focus-ink"
              onClick={() => navigate("work")}
              title="Mở trang Công việc để nộp pull request"
            >
              <VTerminal size={12} aria-hidden="true" /> PR-{task.code}
            </button>
          </div>
          <h3 className="mt-2 text-lg font-bold leading-snug text-[var(--ink)]">{task.title}</h3>
          <p className="mt-1.5 line-clamp-3 text-[0.85rem] leading-relaxed text-[var(--ink-soft)]">{task.description}</p>

          <div className="mt-4 rounded-[10px_12px_11px_12px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_30%,transparent)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
              <p className="whitespace-nowrap text-[0.7rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]">Tiến độ của bạn</p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => bump(-25)}
                  className="focus-ink tabular rounded-[7px_9px_7px_9px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] px-2.5 py-0.5 text-[0.72rem] font-bold text-[var(--ink)] transition-colors hover:bg-[var(--blue-mist)]"
                  aria-label="Giảm tiến độ 25 phần trăm"
                >
                  −25%
                </button>
                <button
                  type="button"
                  onClick={() => bump(25)}
                  className="focus-ink tabular rounded-[7px_9px_7px_9px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] px-2.5 py-0.5 text-[0.72rem] font-bold text-[var(--ink)] transition-colors hover:bg-[var(--blue-mist)]"
                  aria-label="Tăng tiến độ 25 phần trăm"
                >
                  +25%
                </button>
              </div>
            </div>
            <MiniBar value={pct} className="mt-2" label={`Tiến độ ${task.code}`} />
          </div>
        </div>

        {/* Cột phải: meta + thao tác */}
        <div className="flex min-w-0 flex-col">
          <dl className="flex-1">
            {metaRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3 border-b border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)] py-2.5 first:pt-0"
              >
                <dt className="text-[0.72rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]">{row.label}</dt>
                <dd>{row.node}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <InkButton variant="royal" size="sm" onClick={() => navigate("mentor")}>
              <VBot size={16} /> Hỏi Mentor về task này
            </InkButton>
            <InkButton variant="outline" size="sm" onClick={() => navigate("sprint")}>
              <VKanban size={16} /> Mở Sprint Board
            </InkButton>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----- e) Hoạt động gần đây ----- */

function ActivityList({ items }: { items: InternOverview["recentActivity"] }) {
  return (
    <ul className="max-h-80 space-y-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
      {items.map((a, i) => {
        const meta = activityMeta(a.kind);
        const Icon = meta.icon;
        return (
          <li
            key={`${a.at}-${i}`}
            className="flex items-start gap-3 rounded-[10px] p-2 transition-colors hover:bg-[var(--blue-mist)]"
          >
            <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 bg-[var(--paper-raised)]", meta.tone)}>
              <Icon size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.82rem] font-semibold leading-snug text-[var(--ink)]">{a.label}</p>
              <p className="tabular text-[0.68rem] text-[var(--ink-soft)]">
                {formatDateTimeVN(a.at)} · {a.kind}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ============================ WAITING ============================ */

function WaitingView({ data }: { data: InternOverview }) {
  const navigate = useApp((s) => s.navigate);
  const firstName = greetingName(data.userName);

  const steps = [
    {
      title: "Hệ thống ghép bạn với phiên thực tập phù hợp",
      note: "Theo điểm phỏng vấn và hướng kỹ năng bạn đã chọn.",
    },
    {
      title: "Giảng viên mở phiên và mời bạn vào GitHub repo",
      note: "Theo dõi email mời — nhớ kiểm tra cả mục Spam nhé.",
    },
    {
      title: "Bạn nhận task đầu tiên và bắt đầu Sprint 1",
      note: "Đọc kỹ tiêu chí nghiệm thu trước khi viết dòng code đầu tiên.",
    },
  ];

  return (
    <div className="space-y-5">
      <header className="nb-rise">
        <Eyebrow>TRANG TỔNG QUAN · CHỜ PHÂN CÔNG DỰ ÁN</Eyebrow>
        <h1 className="mt-1.5 text-2xl font-extrabold leading-tight text-[var(--ink)]">
          {timeGreetingVN()}, {firstName}!
        </h1>
        <p className="tabular mt-0.5 text-[0.78rem] font-semibold text-[var(--ink-soft)]">{dateLineVN(new Date())}</p>
        <p className="mt-1 font-hand text-[1.05rem] leading-snug text-[var(--pencil)]">{data.greeting}</p>
        <SquiggleUnderline className="mt-1 h-2.5 w-44 text-[var(--royal)]" />
      </header>

      <div className="nb-rise">
        <SketchCard className="relative p-5 md:p-7">
          <Tape variant="candy" rotate={-4} className="-top-3 left-10 !h-5 !w-24" />
          <div className="grid items-center gap-6 md:grid-cols-[210px_1fr]">
            <img
              src="/images/student-mascot-v2.png"
              alt="Linh vật sinh viên V-Intern vẫy tay chào"
              className="mx-auto w-40 max-w-full animate-bob select-none md:w-full"
              style={{ animationDuration: "6s" }}
              draggable={false}
            />
            <div className="min-w-0">
              <h2 className="text-xl font-extrabold leading-snug text-[var(--ink)]">
                Bạn đã đậu phỏng vấn — chỉ còn chờ phân công dự án!
              </h2>
              <dl className="mt-4 inline-flex flex-col gap-2 rounded-[10px_13px_11px_12px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_30%,transparent)] px-4 py-3 text-[0.85rem]">
                <div className="flex gap-2">
                  <dt className="w-32 shrink-0 font-bold text-[var(--ink-soft)]">Vai trò</dt>
                  <dd className="font-semibold">Frontend Intern</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-32 shrink-0 font-bold text-[var(--ink-soft)]">Trạng thái</dt>
                  <dd>
                    <InkBadge tone="amber" dot>
                      Chờ phân công
                    </InkBadge>
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-32 shrink-0 font-bold text-[var(--ink-soft)]">Đợt tuyển dụng</dt>
                  <dd className="tabular font-semibold">2026-02</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="divider-torn my-6" aria-hidden="true" />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-bold">Ba bước tiếp theo</h3>
            <MarginNote className="max-w-64 text-[0.9rem]">ba bước này tự chạy — bạn chỉ cần giữ email sạch</MarginNote>
          </div>
          <ol className="mt-3 grid gap-3 md:grid-cols-3">
            {steps.map((s, i) => (
              <li
                key={s.title}
                className="sketch-border-thin sticker-pop flex items-start gap-3 rounded-[10px_13px_11px_12px] bg-[var(--paper-raised)] p-3.5"
              >
                <CircleDoodle className="h-9 w-9 shrink-0 text-[var(--royal)]">
                  <span className="text-sm font-extrabold">{i + 1}</span>
                </CircleDoodle>
                <div className="min-w-0">
                  <p className="text-[0.85rem] font-bold leading-snug text-[var(--ink)]">{s.title}</p>
                  <p className="mt-1 text-[0.72rem] leading-relaxed text-[var(--ink-soft)]">{s.note}</p>
                </div>
              </li>
            ))}
          </ol>
        </SketchCard>
      </div>

      <section aria-labelledby="waiting-activity" className="sketch-card p-5">
        <h2 id="waiting-activity" className="mb-3 text-lg font-bold">
          Hoạt động gần đây của bạn
        </h2>
        <ActivityList items={data.recentActivity} />
      </section>

      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
        <NoteCard title="Trong lúc chờ đợi" tone="mint" tapeVariant="blue" rotate={-1}>
          Thường mất <b>3–5 ngày làm việc</b> để có phiên phân công. Trong lúc chờ, thử hỏi AI Mentor
          về quy trình sprint nhé!
        </NoteCard>
        <InkButton variant="outline" size="md" onClick={() => navigate("mentor")} className="justify-center">
          <VBot size={17} /> Trò chuyện với AI Mentor
        </InkButton>
      </div>
    </div>
  );
}

/* ============================ FINISHED ============================ */

function FinishedView({ data }: { data: InternOverview }) {
  const navigate = useApp((s) => s.navigate);
  const firstName = greetingName(data.userName);

  const resultTiles = [
    {
      label: "Điểm KPI cuối kỳ",
      valueNode: (
        <CountUpNumber
          value={84}
          className="text-xl font-extrabold leading-tight text-[var(--success)]"
          suffix="/100"
        />
      ),
      note: "Đạt — hạng Khá",
      icon: VChartColumn,
      cls: "border-[var(--success)] text-[var(--success)]",
      chip: "bg-[var(--note-mint)] text-[var(--note-mint-ink)]",
    },
    {
      label: "Chứng nhận đạt được",
      valueNode: (
        <CountUpNumber
          value={2}
          className="text-xl font-extrabold leading-tight text-[var(--note-mint-ink)]"
          suffix=""
        />
      ),
      note: "Kỳ thực tập + micro-credential",
      icon: VCertificate,
      cls: "border-[var(--success)] text-[var(--note-mint-ink)]",
      chip: "bg-[var(--note-mint)] text-[var(--note-mint-ink)]",
    },
    {
      label: "Lương ảo tích lũy",
      valueNode: (
        <CountUpNumber
          value={12_380_000}
          duration={1100}
          className="text-xl font-extrabold leading-tight text-[var(--royal)]"
          format={formatMoneyVND}
        />
      ),
      note: "Đã quy đổi đủ 4 sprint",
      icon: VWallet,
      cls: "border-[var(--ink)] text-[var(--royal)]",
      chip: "bg-[var(--blue-mist)] text-[var(--royal)]",
    },
  ] as const;

  return (
    <div className="space-y-5">
      <header className="nb-rise flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <Eyebrow>TỔNG QUAN · KỲ THỰC TẬP ĐÃ KHÉP LẠI</Eyebrow>
          <h1 className="mt-1.5 text-2xl font-extrabold leading-tight text-[var(--ink)]">
            {timeGreetingVN()}, {firstName}!
          </h1>
          <p className="tabular mt-0.5 text-[0.78rem] font-semibold text-[var(--ink-soft)]">{dateLineVN(new Date())}</p>
          <p className="mt-1 font-hand text-[1.05rem] leading-snug text-[var(--pencil)]">{data.greeting}</p>
          <SquiggleUnderline className="mt-1 h-2.5 w-44 text-[var(--success)]" />
        </div>
        <span className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-[10px_12px_10px_12px] border-2 border-[var(--ink)] bg-[var(--note-mint)] text-[var(--note-mint-ink)] badge-glow" style={{ ["--glow-tone" as string]: "var(--success)" }}>
            <VTrophy size={20} />
          </span>
          <StampMoc rotate={-8} className="shrink-0">
            Đã hoàn tất
          </StampMoc>
        </span>
      </header>

      {data.placement && (
        <div className="nb-rise">
          <PlacementCard placement={data.placement} />
        </div>
      )}

      <div className="nb-stagger grid gap-4 sm:grid-cols-3">
        {resultTiles.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.label} className={cn("sketch-card sketch-card-hover p-5", t.cls.split(" ")[0])}>
              <span className={cn("grid h-10 w-10 place-items-center rounded-[9px_11px_9px_11px] border-2 border-[var(--ink)]", t.chip)}>
                <Icon size={19} />
              </span>
              <p className="mt-3 text-xl font-extrabold leading-tight">{t.valueNode}</p>
              <p className="mt-1 text-[0.75rem] font-bold text-[var(--ink)]">{t.label}</p>
              <p className="text-[0.7rem] text-[var(--ink-soft)]">{t.note}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_330px]">
        <section aria-labelledby="finished-activity" className="sketch-card p-5">
          <h2 id="finished-activity" className="mb-3 text-lg font-bold">
            Dấu mốc gần nhất
          </h2>
          <ActivityList items={data.recentActivity} />
        </section>
        <div className="space-y-4">
          <NoteCard title="Kết sổ đẹp đẽ" tone="pink" tapeVariant="warm" rotate={1}>
            Kỳ thực tập khép lại rất đáng nhớ — giữ nếp commit hằng ngày và hỏi sớm khi kẹt, bạn sẽ
            đi xa ở dự án thật đấy!
          </NoteCard>
          <div className="grid gap-2">
            <InkButton variant="royal" size="md" onClick={() => navigate("kpi")} className="justify-center">
              <VChartColumn size={17} /> Xem KPI &amp; Lương ảo
            </InkButton>
            <InkButton variant="outline" size="md" onClick={() => navigate("certificates")} className="justify-center">
              <VAward size={17} /> Xem chứng nhận
            </InkButton>
          </div>
        </div>
      </div>
    </div>
  );
}
