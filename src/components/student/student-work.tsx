"use client";

/* =====================================================================
 * STUDENT WORK — "Công việc của tôi": danh sách nhiệm vụ, lọc, hộp
 * chi tiết (nghiệm thu, nộp PR, lịch sử, trao đổi với giảng viên).
 * ===================================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { useMock } from "@/lib/use-mock";
import type { Priority, Task, TaskStatus } from "@/lib/mock/types";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Eyebrow,
  InkBadge,
  MarginNote,
  PRIORITY_META,
  SketchCard,
  StampMoc,
  TASK_STATUS_META,
  formatDateTimeVN,
} from "@/components/notebook/ui";
import { InkButton } from "@/components/notebook/reveal";
import { CheckDoodle, SquiggleUnderline } from "@/components/notebook/doodles";
import {
  VCheck,
  VChevronRight,
  VCircleCheck,
  VClock,
  VFilter,
  VFlask,
  VGitCommit,
  VGitPullRequest,
  VInbox,
  VSearch,
  VSend,
  VStar,
  VTerminal,
  VTrophy,
  VUpload,
  VRocket,
} from "@/components/icons/v-icons";
import {
  DUE_TONE_TEXT,
  ErrorNote,
  LoadingBlocks,
  MiniBar,
  PRIORITY_SPINE,
  PointsChip,
  CodeChip,
  dueDisplay,
} from "./student-shared";

const STATUS_KEYS: (TaskStatus | "all")[] = ["all", "todo", "doing", "review", "done"];
const PRIORITY_KEYS: (Priority | "all")[] = ["all", "low", "medium", "high", "urgent"];

/** Icon cho từng bước lịch sử theo từ khoá trong nhãn. */
function historyIcon(label: string) {
  if (/nộp bài|pr/i.test(label)) return VGitPullRequest;
  if (/duyệt/i.test(label)) return VCircleCheck;
  if (/hoàn thành/i.test(label)) return VTrophy;
  if (/bắt đầu|mở|nhận/i.test(label)) return VRocket;
  return VGitCommit;
}

export default function StudentWork() {
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
  const patchTask = useCallback((id: string, patch: Partial<Task>) => {
    setOverrides((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...patch } }));
  }, []);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  /* Phím "/" né vào ô tìm kiếm — capture trước palette ⌘K toàn cục của
   * shell (⌘K vẫn mở bảng lệnh). Bỏ qua khi đang gõ ở ô nhập khác. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const t = e.target as HTMLElement | null;
      const typing =
        !!t &&
        (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (typing) return;
      e.preventDefault();
      e.stopPropagation();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, []);

  const counts = useMemo(() => {
    return {
      all: tasks.length,
      todo: tasks.filter((t) => t.status === "todo").length,
      doing: tasks.filter((t) => t.status === "doing").length,
      review: tasks.filter((t) => t.status === "review").length,
      done: tasks.filter((t) => t.status === "done").length,
    } as Record<TaskStatus | "all", number>;
  }, [tasks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((t) => {
      if (q && !`${t.code} ${t.title}`.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, query, statusFilter, priorityFilter]);

  const openTask = tasks.find((t) => t.id === openId) ?? null;

  if (loading || (!data && !error)) return <LoadingBlocks label="Đang lật danh sách nhiệm vụ…" />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;

  return (
    <div className="space-y-5">
      <header className="nb-rise flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <Eyebrow>CÔNG VIỆC · SỔ NHIỆM VỤ CÁ NHÂN</Eyebrow>
          <h1 className="mt-1.5 text-2xl font-extrabold leading-tight text-[var(--ink)]">Công việc của tôi</h1>
          <SquiggleUnderline className="mt-1 h-2.5 w-40 text-[var(--royal)]" />
        </div>
        <MarginNote className="max-w-56">bấm một dòng để mở phiếu nhiệm vụ</MarginNote>
      </header>

      {tasks.length === 0 ? (
        <EmptyTasks />
      ) : (
        <>
          <FilterBar
            query={query}
            onQuery={setQuery}
            statusFilter={statusFilter}
            onStatus={setStatusFilter}
            priorityFilter={priorityFilter}
            onPriority={setPriorityFilter}
            counts={counts}
            searchRef={searchRef}
          />

          {filtered.length === 0 ? (
            <SketchCard hover={false} className="p-6 text-center">
              <p className="font-hand text-lg">Không có nhiệm vụ nào khớp bộ lọc…</p>
              <InkButton
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("all");
                  setPriorityFilter("all");
                }}
              >
                Xóa bộ lọc
              </InkButton>
            </SketchCard>
          ) : (
            <ul className="grid gap-3">
              {filtered.map((t) => (
                <TaskRow key={t.id} task={t} onOpen={() => setOpenId(t.id)} />
              ))}
            </ul>
          )}
        </>
      )}

      {openTask && (
        <TaskDialog
          key={openTask.id}
          task={openTask}
          onClose={() => setOpenId(null)}
          onUpdate={(patch) => patchTask(openTask.id, patch)}
        />
      )}
    </div>
  );
}

/* ------------------------------ Thanh lọc ------------------------------ */

function FilterBar({
  query,
  onQuery,
  statusFilter,
  onStatus,
  priorityFilter,
  onPriority,
  counts,
  searchRef,
}: {
  query: string;
  onQuery: (v: string) => void;
  statusFilter: TaskStatus | "all";
  onStatus: (v: TaskStatus | "all") => void;
  priorityFilter: Priority | "all";
  onPriority: (v: Priority | "all") => void;
  counts: Record<TaskStatus | "all", number>;
  searchRef: React.RefObject<HTMLInputElement | null>;
}) {
  const chip = (active: boolean) =>
    cn(
      "focus-ink tabular inline-flex min-h-9 items-center gap-1.5 rounded-full border-2 px-3 py-1 text-[0.72rem] font-bold transition-all",
      active
        ? "border-[var(--ink)] bg-[var(--royal)] text-white shadow-ink-2 dark:text-[#101018]"
        : "border-[color-mix(in_srgb,var(--ink)_35%,transparent)] bg-[var(--paper-raised)] text-[var(--ink-soft)] hover:border-[var(--ink)] hover:text-[var(--ink)]",
    );

  return (
    <SketchCard hover={false} className="space-y-3 p-4" aria-label="Bộ lọc danh sách nhiệm vụ">
      <div className="relative">
        <VSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]" />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Tìm theo mã hoặc tên nhiệm vụ (VD: FE-102, kanban…)"
          aria-label="Tìm nhiệm vụ theo mã hoặc tên"
          className="focus-ink w-full rounded-[10px_12px_11px_12px] border-2 border-[var(--ink)] bg-[var(--paper)] py-2.5 pl-10 pr-16 text-[0.85rem] outline-none placeholder:text-[var(--ink-faint)]"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5" aria-hidden="true">
          <VFilter size={14} className="text-[var(--ink-faint)]" />
          <kbd className="font-geist-mono rounded-[5px_7px_5px_7px] border border-[color-mix(in_srgb,var(--ink)_45%,transparent)] bg-[var(--paper-raised)] px-1.5 py-0.5 text-[0.66rem] font-bold text-[var(--ink-soft)]">
            /
          </kbd>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 inline-flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
          <VFilter size={13} /> Trạng thái:
        </span>
        {STATUS_KEYS.map((key) => (
          <button key={key} type="button" onClick={() => onStatus(key)} className={chip(statusFilter === key)} aria-pressed={statusFilter === key}>
            {key === "all" ? "Tất cả" : TASK_STATUS_META[key].label}
            <span className="opacity-70">{counts[key]}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 inline-flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
          <VStar size={13} /> Ưu tiên:
        </span>
        {PRIORITY_KEYS.map((key) => (
          <button key={key} type="button" onClick={() => onPriority(key)} className={chip(priorityFilter === key)} aria-pressed={priorityFilter === key}>
            {key === "all" ? "Tất cả" : PRIORITY_META[key].label}
          </button>
        ))}
      </div>
    </SketchCard>
  );
}

/* ------------------------------ Dòng nhiệm vụ ------------------------------ */

function TaskRow({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const due = dueDisplay(task);
  const overdue = due.tone === "red";
  const dueSoon = due.tone === "amber";
  return (
    <li className="relative">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Mở chi tiết nhiệm vụ ${task.code}: ${task.title}`}
        className={cn(
          "sketch-card sketch-card-hover focus-ink relative flex w-full flex-wrap items-center gap-x-3 gap-y-2 p-3.5 pl-5 text-left",
          task.status === "done" && "opacity-80",
        )}
        style={{ borderLeft: `4px solid ${PRIORITY_SPINE[task.priority]}` }}
      >
        <CodeChip code={task.code} />
        <span
          className={cn(
            "min-w-0 flex-1 basis-52 truncate text-[0.88rem] font-semibold text-[var(--ink)]",
            task.status === "done" && "strikethrough-ink",
          )}
        >
          {task.title}
        </span>
        <InkBadge tone={TASK_STATUS_META[task.status].tone} dot>
          {TASK_STATUS_META[task.status].label}
        </InkBadge>
        <InkBadge tone={PRIORITY_META[task.priority].tone}>{PRIORITY_META[task.priority].label}</InkBadge>
        <span className="hidden text-[0.7rem] font-semibold text-[var(--ink-soft)] sm:inline">{task.sprint}</span>
        <PointsChip points={task.points} />
        <MiniBar
          value={task.progress}
          tone={task.status === "done" ? "green" : "royal"}
          className="w-28"
          label={`Tiến độ ${task.code}`}
        />
        {overdue ? (
          <span
            className="tabular inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.72rem] font-bold shimmer-warm"
            style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
          >
            <VClock size={13} /> {due.text}
          </span>
        ) : dueSoon ? (
          <span className="tabular inline-flex shrink-0 items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--warning)_55%,transparent)] bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] px-2 py-0.5 text-[0.72rem] font-bold text-[var(--warning)]">
            <VClock size={13} /> {due.text}
          </span>
        ) : (
          <span className={cn("tabular inline-flex shrink-0 items-center gap-1 text-[0.72rem] font-semibold", DUE_TONE_TEXT[due.tone])}>
            <VClock size={13} /> {due.text}
          </span>
        )}
        <VChevronRight size={15} className="shrink-0 text-[var(--ink-soft)]" />
        {task.status === "done" && (
          <span className="pointer-events-none absolute right-12 top-1.5 text-[var(--success)] opacity-70">
            <CheckDoodle className="h-6 w-6" />
          </span>
        )}
      </button>
    </li>
  );
}

/* ------------------------------ Trạng thái rỗng ------------------------------ */

function EmptyTasks() {
  return (
    <SketchCard hover={false} className="relative p-8 text-center">
      <img
        src="/images/empty-states/open-notebook.png"
        alt="Trang sổ tay mở trống đang chờ được viết"
        className="mx-auto w-52 max-w-full select-none"
        draggable={false}
      />
      <h3 className="mt-4 font-hand text-2xl leading-tight text-[var(--ink)]">Chưa có nhiệm vụ nào — sổ vẫn còn trắng</h3>
      <p className="mx-auto mt-2 max-w-sm text-[0.85rem] leading-relaxed text-[var(--ink-soft)]">
        Sau khi được phân công dự án, task đầu tiên sẽ xuất hiện ở đây. Hẹn gặp lại sớm nhé!
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3" aria-hidden="true">
        <span className="sketch-border-thin inline-flex items-center gap-2 bg-[var(--paper-raised)] px-3 py-1.5 text-[0.72rem] font-semibold text-[var(--ink-soft)]">
          <VInbox size={15} className="text-[var(--royal)]" /> hộp thư task còn trống
        </span>
        <span className="sketch-border-thin inline-flex items-center gap-2 bg-[var(--paper-raised)] px-3 py-1.5 text-[0.72rem] font-semibold text-[var(--ink-soft)]">
          <VFlask size={15} className="text-[var(--success)]" /> phòng thí nghiệm mở cửa sau
        </span>
      </div>
    </SketchCard>
  );
}

/* ------------------------------ Hộp thoại chi tiết ------------------------------ */

type ThreadMsg = { id: string; from: "me" | "instructor"; text: string; at: string };

function TaskDialog({
  task,
  onClose,
  onUpdate,
}: {
  task: Task;
  onClose: () => void;
  onUpdate: (patch: Partial<Task>) => void;
}) {
  const [progress, setProgress] = useState(task.progress);
  const [checked, setChecked] = useState<boolean[]>(() =>
    task.status === "done" ? task.acceptance.map(() => true) : task.acceptance.map(() => false),
  );
  const [prLink, setPrLink] = useState("");
  const [prNote, setPrNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [burst, setBurst] = useState(0);
  const [thread, setThread] = useState<ThreadMsg[]>([]);
  const [threadInput, setThreadInput] = useState("");
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDone = task.status === "done";

  useEffect(() => {
    return () => {
      if (replyTimer.current) clearTimeout(replyTimer.current);
    };
  }, []);

  const allChecked = checked.length > 0 && checked.every(Boolean);
  const submitted = task.status === "review" || task.status === "done";

  const toggleCriteria = (i: number) => {
    setChecked((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      if (next.every(Boolean)) toast.success("Đủ tiêu chí — sẵn sàng nộp!");
      return next;
    });
  };

  const bumpProgress = (delta: number) => {
    const next = Math.max(0, Math.min(100, progress + delta));
    if (next === progress) return;
    setProgress(next);
    onUpdate({ progress: next });
    toast.success(`Tiến độ ${task.code} cập nhật: ${next}%`);
  };

  const submit = () => {
    const link = prLink.trim();
    if (!/^(https?:\/\/)?[\w.-]*github\.com\//i.test(link) || !link.includes("github.com")) {
      toast.error("Link PR phải chứa github.com — kiểm tra lại giúp nhé!");
      return;
    }
    setSubmitting(true);
    // Giả lập thời gian gửi — mọi cập nhật đều ở trạng thái local của trang.
    setTimeout(() => {
      const now = new Date().toISOString();
      onUpdate({
        status: "review" as TaskStatus,
        progress: 90,
        history: [...task.history, { at: now, label: "Nộp bài — PR chờ giảng viên duyệt" }],
      });
      setProgress(90);
      setSubmitting(false);
      setBurst((b) => b + 1);
      toast.success("Đã nộp! PR vào hàng chờ duyệt — giảng viên sẽ xem trong 48 giờ");
    }, 700);
  };

  const sendThread = () => {
    const text = threadInput.trim();
    if (!text) return;
    setThread((prev) => [...prev, { id: `th-${Date.now()}`, from: "me", text, at: new Date().toISOString() }]);
    setThreadInput("");
    replyTimer.current = setTimeout(() => {
      setThread((prev) => [
        ...prev,
        {
          id: `th-${Date.now()}-r`,
          from: "instructor",
          text: "Đã nhận được câu hỏi — mình xem và phản hồi trong buổi chiều nhé!",
          at: new Date().toISOString(),
        },
      ]);
    }, 1500);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton
        aria-describedby={undefined}
        className="flex max-h-[88vh] flex-col gap-0 overflow-hidden rounded-[16px_20px_15px_18px] border-2 border-[var(--ink)] bg-[var(--paper)] p-0 shadow-ink-6 sm:max-w-2xl"
      >
        {/* Đầu phiếu */}
        <div className="relative shrink-0 border-b-2 border-dashed border-[color-mix(in_srgb,var(--ink)_25%,transparent)] p-5">
          <div className="flex flex-wrap items-center gap-2 pr-8">
            <CodeChip code={task.code} />
            <InkBadge tone={TASK_STATUS_META[task.status].tone} dot>
              {TASK_STATUS_META[task.status].label}
            </InkBadge>
            <InkBadge tone={PRIORITY_META[task.priority].tone}>{PRIORITY_META[task.priority].label}</InkBadge>
            <span className="text-[0.7rem] font-semibold text-[var(--ink-soft)]">{task.sprint}</span>
            <PointsChip points={task.points} />
          </div>
          <DialogTitle className="mt-2.5 text-left text-lg font-extrabold leading-snug text-[var(--ink)]">
            {task.title}
          </DialogTitle>
        </div>

        {/* Thân phiếu — cuộn riêng */}
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5 [scrollbar-width:thin]">
          <section aria-label="Mô tả công việc">
            <DialogSectionTitle>Mô tả công việc</DialogSectionTitle>
            <p className="mt-1.5 text-[0.85rem] leading-relaxed text-[var(--ink)]">{task.description}</p>
          </section>

          <section aria-label="Tiêu chí nghiệm thu">
            <DialogSectionTitle>Tiêu chí nghiệm thu</DialogSectionTitle>
            <ul className="mt-2 space-y-2">
              {task.acceptance.map((item, i) => {
                const on = isDone || checked[i];
                return (
                  <li key={item}>
                    <button
                      type="button"
                      onClick={() => toggleCriteria(i)}
                      aria-pressed={on}
                      className="focus-ink flex w-full items-start gap-3 rounded-[10px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)] p-2.5 text-left transition-colors hover:bg-[var(--blue-mist)]"
                    >
                      {isDone ? (
                        <VCircleCheck
                          size={20}
                          className="draw-check mt-0.5 shrink-0 text-[var(--success)]"
                          aria-hidden="true"
                        />
                      ) : (
                        <span
                          className={cn(
                            "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-[5px_7px_5px_7px] border-2 border-[var(--ink)] transition-colors",
                            on ? "bg-[var(--royal)] text-white dark:text-[#101018]" : "bg-[var(--paper-raised)]",
                          )}
                        >
                          {on && <VCheck size={12} strokeWidth={3} />}
                        </span>
                      )}
                      <span className={cn("text-[0.82rem] leading-relaxed", on && "text-[var(--ink-soft)] line-through")}>{item}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {allChecked && (
              <p className="mt-2 font-hand text-[0.95rem] text-[var(--success)]">Đủ tiêu chí rồi — chốt sổ và nộp thôi ✎</p>
            )}
          </section>

          <section aria-label="Cập nhật tiến độ">
            <DialogSectionTitle>Cập nhật tiến độ</DialogSectionTitle>
            <div className="mt-2 flex items-center gap-3">
              <MiniBar value={progress} label={`Tiến độ ${task.code}`} className="flex-1" />
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => bumpProgress(-25)}
                  className="focus-ink tabular rounded-[7px_9px_7px_9px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] px-2.5 py-1 text-[0.72rem] font-bold transition-colors hover:bg-[var(--blue-mist)]"
                  aria-label="Giảm tiến độ 25 phần trăm"
                >
                  −25%
                </button>
                <button
                  type="button"
                  onClick={() => bumpProgress(25)}
                  className="focus-ink tabular rounded-[7px_9px_7px_9px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] px-2.5 py-1 text-[0.72rem] font-bold transition-colors hover:bg-[var(--blue-mist)]"
                  aria-label="Tăng tiến độ 25 phần trăm"
                >
                  +25%
                </button>
              </div>
            </div>
          </section>

          {!submitted && (
            <section aria-label="Nộp bài" className="rounded-[12px_15px_13px_14px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] p-4 shadow-ink-2">
              <DialogSectionTitle>Nộp bài</DialogSectionTitle>
              <div className="mt-2.5 space-y-3">
                <div>
                  <label htmlFor={`pr-${task.id}`} className="text-[0.75rem] font-bold text-[var(--ink-soft)]">
                    Link pull request
                  </label>
                  <input
                    id={`pr-${task.id}`}
                    value={prLink}
                    onChange={(e) => setPrLink(e.target.value)}
                    placeholder="https://github.com/.../pull/..."
                    className="focus-ink font-geist-mono mt-1 w-full rounded-[9px_11px_10px_12px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 text-[0.8rem] outline-none placeholder:font-sans placeholder:text-[var(--ink-faint)]"
                  />
                </div>
                <div>
                  <label htmlFor={`note-${task.id}`} className="text-[0.75rem] font-bold text-[var(--ink-soft)]">
                    Ghi chú cho người chấm
                  </label>
                  <textarea
                    id={`note-${task.id}`}
                    value={prNote}
                    onChange={(e) => setPrNote(e.target.value)}
                    rows={2}
                    placeholder="Điểm cần để ý, phần còn băn khoăn…"
                    className="focus-ink mt-1 w-full resize-none rounded-[9px_11px_10px_12px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 text-[0.8rem] outline-none placeholder:text-[var(--ink-faint)]"
                  />
                </div>
                <InkButton variant="royal" size="sm" onClick={submit} disabled={submitting} className="w-full sm:w-auto">
                  {submitting ? <span className="spinner-ink" aria-hidden="true" /> : <VUpload size={15} />}
                  {submitting ? "Đang gửi…" : "Nộp bài chờ duyệt"}
                </InkButton>
              </div>
            </section>
          )}

          {submitted && task.status === "review" && (
            <section aria-label="Trạng thái nộp bài" className="relative flex flex-wrap items-center gap-4 rounded-[12px_15px_13px_14px] border-2 border-dashed border-[var(--success)] bg-[var(--note-mint)] p-4">
              {burst > 0 && (
                <span
                  key={burst}
                  className="confetti-pop play pointer-events-none absolute left-4 top-2"
                  aria-hidden="true"
                />
              )}
              <StampMoc tone="blue" rotate={-5} animate={false} className="!text-[0.62rem]">
                Đã nộp
              </StampMoc>
              <p className="min-w-0 flex-1 text-[0.8rem] font-semibold leading-relaxed text-[var(--note-mint-ink)]">
                PR của bạn đang ở hàng chờ duyệt — giảng viên sẽ xem trong 48 giờ. Hết giờ chờ, nhớ ghé
                lại phần Trao đổi bên dưới nhé.
              </p>
              <span
                className="link-chip shrink-0 font-geist-mono !text-[0.7rem]"
                title="Bản demo — link thật sẽ tới repo phiên thực tập"
              >
                <VTerminal size={12} aria-hidden="true" /> PR #{100 + burst}
              </span>
            </section>
          )}

          <section aria-label="Lịch sử trạng thái">
            <DialogSectionTitle>Lịch sử trạng thái</DialogSectionTitle>
            <ol className="mt-3 space-y-0">
              {task.history.map((h, i) => {
                const HistIcon = historyIcon(h.label);
                const isLast = i === task.history.length - 1;
                return (
                  <li key={`${h.at}-${i}`} className="relative flex gap-4 pb-5 last:pb-0">
                    {!isLast && (
                      <span aria-hidden="true" className="absolute left-[13px] top-8 h-[calc(100%-2rem)] border-l-2 border-dashed border-[color-mix(in_srgb,var(--ink)_30%,transparent)]" />
                    )}
                    <span
                      className={cn(
                        "relative z-10 mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)]",
                        isLast ? "bg-[var(--royal)] text-white dark:text-[#101018]" : "bg-[var(--paper-raised)] text-[var(--ink-soft)]",
                      )}
                    >
                      <HistIcon size={13} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[0.82rem] font-semibold leading-snug text-[var(--ink)]">{h.label}</p>
                      <p className="tabular text-[0.68rem] text-[var(--ink-soft)]">{formatDateTimeVN(h.at)}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <section aria-label="Trao đổi với giảng viên">
            <DialogSectionTitle>Trao đổi</DialogSectionTitle>
            <div className="mt-2 min-h-16 space-y-2.5">
              {thread.length === 0 && (
                <p className="rounded-[10px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)] p-3 text-[0.78rem] text-[var(--ink-soft)]">
                  Câu hỏi về task này sẽ tới thẳng giảng viên phụ trách — <b>TS. Phạm Thu Lan</b>.
                </p>
              )}
              {thread.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[85%] rounded-[12px_14px_12px_14px] border-2 border-[var(--ink)] p-2.5 text-[0.8rem] leading-relaxed",
                    m.from === "me"
                      ? "ml-auto bg-[var(--royal)] text-white dark:text-[#101018]"
                      : "bg-[var(--paper-raised)] text-[var(--ink)]",
                  )}
                >
                  {m.from === "instructor" && (
                    <p className="mb-0.5 text-[0.65rem] font-bold text-[var(--ink-soft)]">TS. Phạm Thu Lan</p>
                  )}
                  {m.text}
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={threadInput}
                onChange={(e) => setThreadInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendThread();
                }}
                placeholder="Nhập câu hỏi cho giảng viên…"
                aria-label="Nhập câu hỏi cho giảng viên"
                className="focus-ink min-w-0 flex-1 rounded-[9px_11px_10px_12px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 text-[0.8rem] outline-none placeholder:text-[var(--ink-faint)]"
              />
              <InkButton variant="royal" size="sm" onClick={sendThread} disabled={!threadInput.trim()} aria-label="Gửi câu hỏi">
                <VSend size={15} /> Gửi
              </InkButton>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DialogSectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="text-[0.72rem] font-extrabold uppercase tracking-[0.14em] text-[var(--ink-soft)]">{children}</h4>;
}
