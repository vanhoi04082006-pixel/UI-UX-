"use client";

/* =====================================================================
 * STUDENT SPRINT — "Sprint Board": kanban cá nhân 4 cột kéo–thả bằng
 * @dnd-kit/core, có nút mũi tên thay thế cho bàn phím + bảng tóm tắt.
 * ===================================================================== */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { motion } from "framer-motion";
import { useApp } from "@/lib/store";
import { useMock } from "@/lib/use-mock";
import type { Task, TaskStatus } from "@/lib/mock/types";
import { cn } from "@/lib/utils";
import {
  Eyebrow,
  InkBadge,
  MarginNote,
  NoteCard,
  PRIORITY_META,
  SketchCard,
  Tape,
} from "@/components/notebook/ui";
import { SquiggleUnderline } from "@/components/notebook/doodles";
import {
  VAlert,
  VBot,
  VChevronLeft,
  VChevronRight,
  VColumns,
  VHourglass,
  VKanban,
  VTarget,
} from "@/components/icons/v-icons";
import {
  CountUpNumber,
  ErrorNote,
  LoadingBlocks,
  MiniBar,
  PRIORITY_SPINE,
  PointsChip,
  STATUS_ORDER,
  CodeChip,
  daysUntil,
} from "./student-shared";

const COLUMNS: { key: TaskStatus; label: string; tape: "slate" | "blue" | "warm" | "mint" }[] = [
  { key: "todo", label: "Cần làm", tape: "slate" },
  { key: "doing", label: "Đang làm", tape: "blue" },
  { key: "review", label: "Chờ duyệt", tape: "warm" },
  { key: "done", label: "Hoàn thành", tape: "mint" },
];

export default function StudentSprint() {
  const user = useApp((s) => s.user);
  const email = user?.email ?? "";
  const { data, loading, error, reload } = useMock<Task[]>(
    email ? `intern/tasks?email=${encodeURIComponent(email)}` : null,
  );

  const [overrides, setOverrides] = useState<Record<string, Partial<Task>>>({});
  const tasks = useMemo<Task[]>(
    () => (data ?? []).map((t) => (overrides[t.id] ? { ...t, ...overrides[t.id] } : t)),
    [data, overrides],
  );

  const [activeTask, setActiveTask] = useState<Task | null>(null);

  /* Ba cảm biến: chuột (kéo 6px), cảm ứng (nhấn giữ 180ms), bàn phím. */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /* Tên sprint hiện hành: sprint xuất hiện nhiều nhất (ưu tiên task chưa xong). */
  const sprintName = useMemo(() => {
    if (tasks.length === 0) return "";
    const pool = tasks.filter((t) => t.status !== "done");
    const source = pool.length > 0 ? pool : tasks;
    const counter = new Map<string, number>();
    for (const t of source) counter.set(t.sprint, (counter.get(t.sprint) ?? 0) + 1);
    return [...counter.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }, [tasks]);

  /* Số ngày còn lại của sprint = hạn muộn nhất trong các task. */
  const daysLeft = useMemo(() => {
    if (tasks.length === 0) return null;
    return Math.max(...tasks.map((t) => daysUntil(t.dueDate)));
  }, [tasks]);

  const byStatus = useMemo(() => {
    const map = new Map<TaskStatus, Task[]>([
      ["todo", []],
      ["doing", []],
      ["review", []],
      ["done", []],
    ]);
    for (const t of tasks) map.get(t.status)?.push(t);
    return map;
  }, [tasks]);

  const moveTask = (task: Task, status: TaskStatus) => {
    if (task.status === status) return;
    /* Nhiệm vụ đã hoàn thành không kéo lùi lại được — cần giảng viên mở lại. */
    if (task.status === "done") {
      toast.custom(
        () => (
          <div
            role="alert"
            className="animate-shake-ink flex max-w-sm items-center gap-3 rounded-[12px_14px_12px_14px] border-2 border-[var(--danger)] bg-[var(--paper-raised)] p-3.5 shadow-ink-3"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]">
              <VAlert size={17} />
            </span>
            <div className="min-w-0">
              <p className="text-[0.82rem] font-extrabold text-[var(--ink)]">Không kéo lùi được</p>
              <p className="mt-0.5 text-[0.75rem] leading-snug text-[var(--ink-soft)]">
                “{task.title}” đã hoàn thành — muốn mở lại, nhờ giảng viên điều phối nhé.
              </p>
            </div>
          </div>
        ),
        { duration: 4200 },
      );
      return;
    }
    const columnLabel = COLUMNS.find((c) => c.key === status)?.label ?? status;
    setOverrides((prev) => ({
      ...prev,
      [task.id]: {
        ...(prev[task.id] ?? {}),
        status,
        progress: status === "review" ? 90 : status === "done" ? 100 : task.progress,
      },
    }));
    toast.success(`"${task.title}" → ${columnLabel}`);
    if (status === "review") toast.info("Bài sẽ chờ giảng viên duyệt");
  };

  const onDragStart = (e: DragStartEvent) => {
    setActiveTask(tasks.find((t) => t.id === e.active.id) ?? null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;
    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;
    moveTask(task, over.id as TaskStatus);
  };

  if (loading || (!data && !error)) return <LoadingBlocks label="Đang dựng bàn sprint…" />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;

  const total = tasks.length;
  const done = byStatus.get("done")?.length ?? 0;

  return (
    <div className="space-y-5">
      <header className="nb-rise flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <Eyebrow>SPRINT BOARD · BÀN CÁ NHÂN 4 CỘT</Eyebrow>
          <h1 className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-2xl font-extrabold leading-tight text-[var(--ink)]">
            Sprint Board
            {sprintName && (
              <span className="font-geist-mono rounded-[6px_8px_6px_8px] border border-[color-mix(in_srgb,var(--ink)_45%,transparent)] bg-[var(--blue-mist)] px-2 py-0.5 text-sm font-semibold text-[var(--royal-deep)]">
                {sprintName}
              </span>
            )}
            {daysLeft !== null && (
              <InkBadge tone={daysLeft < 0 ? "red" : daysLeft <= 2 ? "amber" : "neutral"}>
                <VHourglass size={13} />
                {daysLeft < 0 ? "Sprint đã quá hạn" : daysLeft === 0 ? "Sprint hết hạn hôm nay" : `Sprint còn ~${daysLeft} ngày`}
              </InkBadge>
            )}
          </h1>
          <SquiggleUnderline className="mt-1 h-2.5 w-40 text-[var(--royal)]" />
        </div>
        <MarginNote className="max-w-60">kéo thẻ giữa các cột — thả vào Chờ duyệt để nộp bài</MarginNote>
      </header>

      {total === 0 ? (
        <EmptyBoard />
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragCancel={() => setActiveTask(null)}
          >
            <div className="grid gap-4 lg:grid-cols-4">
              {COLUMNS.map((col) => (
                <BoardColumn
                  key={col.key}
                  columnKey={col.key}
                  label={col.label}
                  tape={col.tape}
                  tasks={byStatus.get(col.key) ?? []}
                  onMove={(task, dir) => {
                    const idx = STATUS_ORDER.indexOf(task.status);
                    const next = STATUS_ORDER[Math.max(0, Math.min(STATUS_ORDER.length - 1, idx + dir))];
                    moveTask(task, next);
                  }}
                />
              ))}
            </div>

            <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 1, 0.8, 1)" }}>
              {activeTask && (
                <motion.div
                  initial={{ scale: 0.92, rotate: 0 }}
                  animate={{ scale: 1.05, rotate: 3 }}
                  className="glow-ring w-64 rotate-3"
                >
                  <BoardCardBody task={activeTask} shadow />
                </motion.div>
              )}
            </DragOverlay>
          </DndContext>

          <SummaryPanel tasks={tasks} done={done} total={total} sprintName={sprintName} />
        </>
      )}
    </div>
  );
}

/* ------------------------------ Cột kanban ------------------------------ */

function BoardColumn({
  columnKey,
  label,
  tape,
  tasks,
  onMove,
}: {
  columnKey: TaskStatus;
  label: string;
  tape: "slate" | "blue" | "warm" | "mint";
  tasks: Task[];
  onMove: (task: Task, dir: -1 | 1) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnKey });

  return (
    <section
      ref={setNodeRef}
      aria-label={`Cột ${label}`}
      className={cn(
        "sketch-card relative flex min-h-56 flex-col p-3 pt-7 transition-colors",
        isOver && "bg-[color-mix(in_srgb,var(--blue-mist)_40%,transparent)]",
      )}
    >
      <Tape variant={tape} rotate={-3} className="-top-2.5 left-1/2 !h-5 !w-24 opacity-75" />
      <header className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-[0.85rem] font-extrabold uppercase tracking-wide text-[var(--ink)]">
          <VColumns size={14} className="text-[var(--ink-soft)]" aria-hidden="true" />
          {label}
        </h2>
        <span className="tabular grid h-6 min-w-6 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] px-1.5 text-[0.68rem] font-bold">
          {tasks.length}
        </span>
      </header>

      <div className="paper-lined mt-3 min-h-24 flex-1 space-y-2.5 rounded-[8px_10px_9px_10px] p-2">
        {tasks.length === 0 && (
          <p className="pt-6 text-center font-hand text-[0.95rem] text-[var(--ink-faint)]">trống — thả thẻ vào đây</p>
        )}
        {tasks.map((t) => (
          <BoardCard key={t.id} task={t} onMove={onMove} />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------ Thẻ nhiệm vụ ------------------------------ */

function BoardCard({ task, onMove }: { task: Task; onMove: (task: Task, dir: -1 | 1) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "sketch-border-thin group relative cursor-grab bg-[var(--paper-raised)] p-3 shadow-ink-2 transition-all hover:-translate-y-0.5 hover:shadow-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)] active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
      style={{ borderLeft: `4px solid ${PRIORITY_SPINE[task.priority]}` }}
      aria-label={`Thẻ nhiệm vụ ${task.code}: ${task.title}. Dùng các nút mũi tên để chuyển cột.`}
    >
      <div className="flex items-center gap-2">
        <CodeChip code={task.code} />
        <InkBadge tone={PRIORITY_META[task.priority].tone} className="!px-1.5 !py-0 !text-[0.62rem]">
          {PRIORITY_META[task.priority].label}
        </InkBadge>
        <span className="tabular ml-auto shrink-0 whitespace-nowrap text-[0.68rem] font-semibold text-[var(--ink-soft)]">{task.sprint.replace("Sprint ", "SP")}</span>
      </div>
      <p
        className={cn(
          "mt-1.5 line-clamp-2 text-[0.8rem] font-semibold leading-snug text-[var(--ink)]",
          task.status === "done" && "strikethrough-ink",
        )}
      >
        {task.title}
      </p>
      <div className="mt-2.5 flex items-center gap-2">
        <PointsChip points={task.points} />
        <MiniBar
          value={task.progress}
          tone={task.status === "done" ? "green" : "royal"}
          className="min-w-0 flex-1"
          label={`Tiến độ ${task.code}`}
        />
      </div>

      {/* Nút mũi tên thay thế kéo–thả: hiện khi thẻ nhận tiêu điểm bàn phím */}
      <div className="absolute -top-2.5 right-1.5 hidden gap-1 group-focus-within:flex">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onMove(task, -1)}
          aria-label="Chuyển sang cột trái"
          className="focus-ink grid h-6 w-6 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--ink)] shadow-ink-2 transition-transform hover:-translate-y-0.5"
        >
          <VChevronLeft size={13} />
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onMove(task, 1)}
          aria-label="Chuyển sang cột phải"
          className="focus-ink grid h-6 w-6 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--ink)] shadow-ink-2 transition-transform hover:-translate-y-0.5"
        >
          <VChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

/** Thân thẻ dùng lại cho lớp phủ khi kéo (không gắn listeners). */
function BoardCardBody({ task, shadow }: { task: Task; shadow?: boolean }) {
  return (
    <div
      className={cn("sketch-border-thin bg-[var(--paper-raised)] p-3", shadow ? "shadow-ink-6" : "shadow-ink-2")}
      style={{ borderLeft: `4px solid ${PRIORITY_SPINE[task.priority]}` }}
    >
      <div className="flex items-center gap-2">
        <CodeChip code={task.code} />
        <InkBadge tone={PRIORITY_META[task.priority].tone} className="!px-1.5 !py-0 !text-[0.62rem]">
          {PRIORITY_META[task.priority].label}
        </InkBadge>
        <span className="tabular ml-auto shrink-0 whitespace-nowrap text-[0.68rem] font-semibold text-[var(--ink-soft)]">{task.sprint.replace("Sprint ", "SP")}</span>
      </div>
      <p
        className={cn(
          "mt-1.5 line-clamp-2 text-[0.8rem] font-semibold leading-snug text-[var(--ink)]",
          task.status === "done" && "strikethrough-ink",
        )}
      >
        {task.title}
      </p>
      <div className="mt-2.5 flex items-center gap-2">
        <PointsChip points={task.points} />
        <MiniBar value={task.progress} tone={task.status === "done" ? "green" : "royal"} className="min-w-0 flex-1" label={`Tiến độ ${task.code}`} />
      </div>
    </div>
  );
}

/* ------------------------------ Bảng tóm tắt ------------------------------ */

function SummaryPanel({ tasks, done, total, sprintName }: { tasks: Task[]; done: number; total: number; sprintName: string }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const distribution = COLUMNS.map((c) => ({
    ...c,
    count: tasks.filter((t) => t.status === c.key).length,
  }));
  const storyPoints = tasks.reduce((s, t) => s + t.points, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section aria-label="Tình hình sprint" className="sketch-card p-5">
        <div className="flex items-center gap-2">
          <VTarget size={17} className="text-[var(--royal)]" />
          <h2 className="text-lg font-bold">Tình hình {sprintName || "sprint"}</h2>
        </div>
        <p className="mt-1 text-[0.78rem] leading-relaxed text-[var(--ink-soft)]">
          Giao đúng nhịp, nộp sớm một ngày — cuối sprint đỡ phải thức trắng đêm chốt bài.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <span className="tabular text-3xl font-extrabold leading-none text-[var(--success)]">
            <CountUpNumber value={pct} suffix="%" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.7rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]">Tiến độ</p>
            <MiniBar value={pct} tone="green" className="mt-1" label="Tiến độ tổng sprint" barGrow />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[0.8rem]">
          <p>
            <span className="tabular text-base font-extrabold">
              <CountUpNumber value={total} />
            </span>{" "}
            <span className="text-[var(--ink-soft)]">nhiệm vụ</span>
          </p>
          <p>
            <span className="tabular text-base font-extrabold">
              <CountUpNumber value={done} />
            </span>{" "}
            <span className="text-[var(--ink-soft)]">đã xong</span>
          </p>
          <p>
            <span className="tabular text-base font-extrabold">
              <CountUpNumber value={storyPoints} />
            </span>{" "}
            <span className="text-[var(--ink-soft)]">điểm story</span>
          </p>
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-[0.7rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]">Phân bố</p>
          {distribution.map((d) => (
            <div key={d.key} className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-[0.72rem] font-semibold text-[var(--ink-soft)]">{d.label}</span>
              <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full border-2 border-[var(--ink)] bg-[var(--paper)]">
                <div
                  className="bar-grow h-full rounded-full bg-[var(--royal)]"
                  style={{ width: `${total > 0 ? (d.count / total) * 100 : 0}%` }}
                />
              </div>
              <span className="tabular w-5 text-right text-[0.72rem] font-bold">{d.count}</span>
            </div>
          ))}
        </div>
      </section>

      <section
        aria-label="Mẹo từ AI Mentor"
        className="sketch-card flex items-start gap-3 border-[var(--royal)] p-5"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[9px_11px_9px_11px] border-2 border-[var(--ink)] bg-[var(--royal)] text-white dark:text-[#101018]">
          <VBot size={19} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[0.95rem] font-bold">Mẹo từ Mentor</h2>
          <p className="mt-1.5 text-[0.82rem] leading-relaxed text-[var(--ink-soft)]">
            Kéo hết cột <b>Cần làm</b> sang <b>Đang làm</b> trước thứ Tư để kịp chờ duyệt cuối sprint ✎
          </p>
        </div>
      </section>

      <NoteCard title="Sổ riêng của bạn" tone="yellow" tapeVariant="slate" rotate={-1}>
        Sprint board này là <b>bảng cá nhân — chỉ bạn nhìn thấy</b>. Bảng chung của cả nhóm do giảng
        viên quản lý. Kéo thả thoải mái, không ai soi giờ giấc hết!
      </NoteCard>
    </div>
  );
}

/* ------------------------------ Trạng thái rỗng ------------------------------ */

function EmptyBoard() {
  return (
    <SketchCard hover={false} className="relative p-8 text-center">
      <Tape variant="slate" rotate={-4} className="-top-3 left-10 !h-5 !w-24" />
      <img
        src="/images/empty-states/open-notebook.png"
        alt="Trang sổ tay mở trống chờ sprint đầu tiên"
        className="mx-auto w-52 max-w-full select-none"
        draggable={false}
      />
      <h3 className="mt-4 font-hand text-2xl leading-tight text-[var(--ink)]">Chưa có sprint nào — sổ vẫn còn trắng</h3>
      <p className="mx-auto mt-2 max-w-sm text-[0.85rem] leading-relaxed text-[var(--ink-soft)]">
        Khi được phân công dự án, bốn cột <b>Cần làm → Đang làm → Chờ duyệt → Hoàn thành</b> sẽ mở
        ngay tại đây.
      </p>
      <p className="mt-3 inline-flex items-center gap-1.5 font-hand text-[1rem] text-[var(--ink-soft)]">
        <VKanban size={16} /> hẹn gặp lại ở Sprint 1
      </p>
    </SketchCard>
  );
}
