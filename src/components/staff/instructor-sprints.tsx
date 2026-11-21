"use client";

import { useMemo, useState, type ButtonHTMLAttributes } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  VBan,
  VCheckCheck,
  VCircleDot,
  VClock,
  VColumns,
  VEdit,
  VHourglass,
  VKanban,
  VPlay,
  VPlus,
  VRefresh,
  VSend,
  VStar,
} from "@/components/icons/v-icons";
import { CheckDoodle, PushPin, RibbonBookmark } from "@/components/notebook/doodles";
import { FadeIn, InkButton } from "@/components/notebook/reveal";
import {
  CodeChip,
  EmptyState,
  ErrorState,
  MetricTile,
  MiniBar,
  PageHeading,
  PRIORITY_DOT,
  PRIORITY_LABEL,
  SkeletonBlock,
  initialsOf,
} from "@/components/staff/instructor-shared";
import { InkBadge, MarginNote, NoteCard, SketchCard, StampMoc, Tape } from "@/components/notebook/ui";
import { useApi } from "@/lib/use-api";
import {
  createBoardTask,
  createSprint,
  listSessions,
  listSprints,
  transitionSprintStatus,
  updateSprint,
} from "@/lib/api/instructor";
import { fetchPreviewBoard, staffApiErrorMessage } from "@/components/staff/staff-api";
import type {
  InstructorSession,
  Priority,
  Sprint,
  SprintBoard,
  SprintBoardTask,
  SprintStatus,
} from "@/lib/mock/types";

/* =====================================================================
 * SPRINT & TASK — vòng đời sprint theo phiên + bảng kanban chỉ xem của
 * giảng viên + burndown. Hành động: kích hoạt / hoàn thành / hủy / sửa,
 * tạo sprint, giao nhiệm vụ (codex: sprint lifecycle actions).
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

/* ------------------------- Vòng đời sprint ------------------------- */

/** Codex sprintTransitions: planned → active; active → completed/cancelled
 *  (suy ra client-side — rule giống hệt dữ liệu gốc). */
function sprintTransitionsOf(status: SprintStatus): SprintStatus[] {
  switch (status) {
    case "planned":
      return ["active", "cancelled"];
    case "active":
      return ["completed", "cancelled"];
    default:
      return [];
  }
}

const SPRINT_STATUS_META: Record<SprintStatus, { label: string; tone: string }> = {
  planned: { label: "Đã lập kế hoạch", tone: "neutral" },
  active: { label: "Đang diễn ra", tone: "blue" },
  completed: { label: "Đã hoàn thành", tone: "green" },
  cancelled: { label: "Đã hủy", tone: "red" },
};

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "low", label: PRIORITY_LABEL.low },
  { value: "medium", label: PRIORITY_LABEL.medium },
  { value: "high", label: PRIORITY_LABEL.high },
  { value: "urgent", label: PRIORITY_LABEL.urgent },
];

/** dd/MM — mốc gọn cho dòng sprint. */
function fmtMD(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

/** Tên ngắn của bảng ("Sprint 3 · SS-2026-01" → "Sprint 3"). */
function boardShortName(board: SprintBoard | null) {
  return (board?.name ?? "").split("·")[0]?.trim() || "Sprint hiện tại";
}

function SprintStatusBadge({ status }: { status: SprintStatus }) {
  const meta = SPRINT_STATUS_META[status];
  return (
    <InkBadge tone={meta.tone} className={status === "planned" ? "border-dashed" : ""}>
      {status === "active" && <span aria-hidden="true" className="ws-dot-live" />}
      {meta.label}
    </InkBadge>
  );
}

/** Nút mực đỏ cho hành động hủy (InkButton không có variant danger). */
function DangerInkButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="inline-flex items-center justify-center gap-2 rounded-[10px_13px_11px_12px] border-2 border-[var(--ink)] bg-[var(--danger)] px-3.5 py-2 text-[0.82rem] font-semibold text-white shadow-ink-3 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-ink-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)] disabled:pointer-events-none disabled:opacity-40"
      {...props}
    >
      {children}
    </button>
  );
}

function TaskStatusIcon({ status }: { status: SprintBoardTask["status"] }) {
  if (status === "done") return <CheckDoodle className="h-4 w-4 text-[var(--success)]" />;
  if (status === "review") return <VClock size={14} className="text-[var(--warning)]" />;
  if (status === "doing") return <VPlay size={14} className="text-[var(--royal)]" />;
  return <VCircleDot size={14} className="text-[var(--ink-soft)]" />;
}

export default function InstructorSprints() {
  const { data: board, loading, error, reload: reloadBoard } = useApi<SprintBoard | null>(fetchPreviewBoard);
  const {
    data: sprintList,
    loading: sprintsLoading,
    error: sprintsError,
    reload: reloadSprints,
  } = useApi<Sprint[]>(listSprints);
  const {
    data: sessions,
    loading: sessionsLoading,
    error: sessionsError,
    reload: reloadSessions,
  } = useApi<InstructorSession[]>(listSessions);
  const reduced = useReducedMotion();

  /* ---------- trạng thái hành động vòng đời ---------- */
  const [pending, setPending] = useState<{ sprint: Sprint; kind: "completed" | "cancelled" } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const [busySprintId, setBusySprintId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  /* ---------- dialog sửa sprint ---------- */
  const [editTarget, setEditTarget] = useState<Sprint | null>(null);
  const [editForm, setEditForm] = useState({ name: "", goal: "", startsAt: "", endsAt: "" });
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  /* ---------- dialog tạo sprint ---------- */
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ sessionId: "", name: "", goal: "", startsAt: "", endsAt: "" });
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdNotice, setCreatedNotice] = useState<string | null>(null);

  /* ---------- dialog tạo nhiệm vụ ---------- */
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    sprintId: "",
    title: "",
    assignee: "",
    priority: "medium" as Priority,
    points: "3",
  });
  const [taskBusy, setTaskBusy] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [taskNotice, setTaskNotice] = useState<string | null>(null);

  /* ---------- dữ liệu suy ra ---------- */

  const sprints = sprintList ?? [];
  const transitions = useMemo(
    () => Object.fromEntries(sprints.map((s) => [s.id, sprintTransitionsOf(s.status)])),
    [sprints],
  );
  const openSprints = sprints.filter((s) => s.status === "planned" || s.status === "active");
  const boardTerminal = board?.status === "completed" || board?.status === "cancelled";

  const groups = useMemo(() => {
    const sessionsList = sessions ?? [];
    const bySession = new Map<string, Sprint[]>();
    for (const sp of sprints) {
      const bucket = bySession.get(sp.sessionId);
      if (bucket) bucket.push(sp);
      else bySession.set(sp.sessionId, [sp]);
    }
    const result: { key: string; code: string; project: string; sprints: Sprint[] }[] = [];
    for (const s of sessionsList) {
      result.push({ key: s.id, code: s.code, project: s.project, sprints: bySession.get(s.id) ?? [] });
      bySession.delete(s.id);
    }
    for (const [sid, list] of bySession) {
      result.push({ key: sid, code: sid, project: "Phiên chưa xếp", sprints: list });
    }
    return result;
  }, [sprints, sessions]);

  const assigneeOptions = useMemo(() => {
    const names = new Set<string>();
    for (const s of sessions ?? []) for (const n of s.memberNames) names.add(n);
    return [...names];
  }, [sessions]);

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

  function reloadAll() {
    reloadBoard();
    reloadSprints();
    reloadSessions();
  }

  /* ---------- hành động vòng đời sprint ---------- */

  function validateDates(startsAt: string, endsAt: string): string | null {
    if (!startsAt || !endsAt) return "Chọn đủ ngày bắt đầu và ngày kết thúc.";
    if (endsAt <= startsAt) return "Ngày kết thúc phải sau ngày bắt đầu.";
    return null;
  }

  async function activateSprint(sprint: Sprint) {
    setBusySprintId(sprint.id);
    setRowError(null);
    try {
      await transitionSprintStatus(sprint.id, "active");
      toast.success(`Đã kích hoạt ${sprint.name}.`);
      reloadAll();
    } catch (err) {
      setRowError({ id: sprint.id, message: staffApiErrorMessage(err, "Không đổi được trạng thái Sprint.") });
    } finally {
      setBusySprintId(null);
    }
  }

  function openConfirm(sprint: Sprint, kind: "completed" | "cancelled") {
    setConfirmError(null);
    setPending({ sprint, kind });
  }

  async function submitConfirm() {
    if (!pending) return;
    setConfirmBusy(true);
    setConfirmError(null);
    try {
      await transitionSprintStatus(pending.sprint.id, pending.kind);
      toast.success(
        pending.kind === "completed"
          ? `Đã hoàn thành ${pending.sprint.name}.`
          : `Đã hủy ${pending.sprint.name}.`,
      );
      setPending(null);
      reloadAll();
    } catch (err) {
      // Giữ modal mở và nêu rõ lỗi (VD còn nhiệm vụ mở).
      setConfirmError(staffApiErrorMessage(err, "Không đổi được trạng thái Sprint."));
    } finally {
      setConfirmBusy(false);
    }
  }

  function openEdit(sprint: Sprint) {
    setEditTarget(sprint);
    setEditForm({ name: sprint.name, goal: sprint.goal, startsAt: sprint.startsAt, endsAt: sprint.endsAt });
    setEditError(null);
  }

  async function submitEdit() {
    if (!editTarget) return;
    const name = editForm.name.trim();
    if (!name) {
      setEditError("Sprint cần có tên.");
      return;
    }
    const dateErr = validateDates(editForm.startsAt, editForm.endsAt);
    if (dateErr) {
      setEditError(dateErr);
      return;
    }
    setEditBusy(true);
    setEditError(null);
    try {
      await updateSprint(editTarget.id, {
        name,
        goal: editForm.goal.trim(),
        startDate: editForm.startsAt,
        endDate: editForm.endsAt,
      });
      toast.success("Đã lưu thay đổi Sprint.");
      setEditTarget(null);
      reloadAll();
    } catch (err) {
      setEditError(staffApiErrorMessage(err, "Không lưu được thay đổi Sprint."));
    } finally {
      setEditBusy(false);
    }
  }

  function openCreate() {
    const first = (sessions ?? []).find((s) => s.status !== "cancelled");
    setCreateForm({ sessionId: first?.id ?? "", name: "", goal: "", startsAt: "", endsAt: "" });
    setCreateError(null);
    setCreateOpen(true);
  }

  async function submitCreate() {
    const name = createForm.name.trim();
    if (!createForm.sessionId) {
      setCreateError("Chọn phiên thực tập cho Sprint mới.");
      return;
    }
    if (!name) {
      setCreateError("Sprint cần có tên (VD: Sprint 6).");
      return;
    }
    const dateErr = validateDates(createForm.startsAt, createForm.endsAt);
    if (dateErr) {
      setCreateError(dateErr);
      return;
    }
    setCreateBusy(true);
    setCreateError(null);
    try {
      await createSprint({
        sessionId: createForm.sessionId,
        name,
        goal: createForm.goal.trim(),
        startDate: createForm.startsAt,
        endDate: createForm.endsAt,
      });
      toast.success("Đã tạo Sprint.");
      setCreatedNotice("Đã tạo Sprint.");
      setCreateOpen(false);
      reloadAll();
    } catch (err) {
      setCreateError(staffApiErrorMessage(err, "Không tạo được Sprint."));
    } finally {
      setCreateBusy(false);
    }
  }

  function openTask(sprint?: Sprint) {
    setTaskNotice(null);
    setTaskForm({
      sprintId: sprint?.id ?? openSprints[0]?.id ?? "",
      title: "",
      assignee: "",
      priority: "medium",
      points: "3",
    });
    setTaskError(null);
    setTaskOpen(true);
  }

  async function submitTask() {
    const title = taskForm.title.trim();
    const assignee = taskForm.assignee.trim();
    if (!taskForm.sprintId) {
      setTaskError("Chọn Sprint nhận nhiệm vụ.");
      return;
    }
    if (!title) {
      setTaskError("Nhiệm vụ cần có tiêu đề.");
      return;
    }
    if (!assignee) {
      setTaskError("Điền người nhận nhiệm vụ.");
      return;
    }
    const pts = Math.round(Number(taskForm.points));
    if (!Number.isFinite(pts) || pts < 1 || pts > 13) {
      setTaskError("Story points chọn trong khoảng 1–13.");
      return;
    }
    setTaskBusy(true);
    setTaskError(null);
    const targetSprint = sprints.find((s) => s.id === taskForm.sprintId);
    try {
      await createBoardTask({
        title,
        assignee,
        priority: taskForm.priority,
        points: pts,
        description: "",
      });
      toast.success("Đã giao nhiệm vụ.");
      if (board && taskForm.sprintId !== board.id) {
        setTaskNotice(
          `Nhiệm vụ mới hiện diện ở bảng Kanban của ${boardShortName(board)} — nhiệm vụ giao trong ${
            targetSprint?.name ?? "Sprint khác"
          } được ghi nhận ở danh sách Sprint.`,
        );
      } else {
        reloadBoard();
      }
      setTaskOpen(false);
      reloadSprints();
    } catch (err) {
      setTaskError(staffApiErrorMessage(err, "Không tạo được nhiệm vụ."));
    } finally {
      setTaskBusy(false);
    }
  }

  /* ---------- khối danh sách sprint theo phiên ---------- */

  const sprintSection = (
    <section aria-labelledby="sp-session-heading" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="eyebrow">Vòng đời sprint</p>
          <h2 id="sp-session-heading" className="mt-1.5 text-xl font-extrabold tracking-tight">
            Sprint của phiên
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <InkButton
            variant="outline"
            size="sm"
            onClick={() => openTask()}
            disabled={openSprints.length === 0}
            aria-label="Tạo nhiệm vụ vào Sprint đang mở"
          >
            <VSend size={15} /> Tạo nhiệm vụ
          </InkButton>
          <InkButton variant="royal" size="sm" onClick={openCreate} aria-label="Tạo Sprint mới cho phiên">
            <VPlus size={15} /> Tạo Sprint
          </InkButton>
        </div>
      </div>

      {(createdNotice || taskNotice) && (
        <p role="status" className="font-hand text-[0.95rem] leading-snug text-[var(--ink-soft)]">
          {createdNotice ?? taskNotice}
        </p>
      )}

      {sprintsError ? (
        <SketchCard hover={false} className="flex flex-wrap items-center gap-3 border-[var(--danger)] p-4">
          <VHourglass size={18} className="text-[var(--danger)]" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-[0.8rem] font-semibold text-[var(--danger)]">
            Không tải được danh sách sprint: {sprintsError}
          </p>
          <InkButton variant="outline" size="sm" onClick={reloadSprints}>
            <VRefresh size={14} /> Thử lại
          </InkButton>
        </SketchCard>
      ) : sprintsLoading || (sessionsLoading && !sessions) ? (
        <SkeletonBlock className="h-72" />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={VKanban}
          title="Chưa có sprint nào"
          hint="Bấm “Tạo Sprint” để mở kế hoạch đầu tiên cho một phiên thực tập."
        />
      ) : (
        <SketchCard hover={false} as="article" className="relative p-4">
          <Tape variant="blue" rotate={-5} style={{ top: -12, left: 16, width: 58, height: 17 }} />
          {sessionsError && (
            <p className="mb-2 text-[0.72rem] font-semibold text-[var(--warning)]">
              Không tải được tên phiên ({sessionsError}) — hiển thị theo mã phiên.
            </p>
          )}
          <div className="max-h-[26rem] space-y-4 overflow-y-auto pr-1.5">
            {groups.map((g) => (
              <div key={g.key}>
                <div className="flex flex-wrap items-center gap-2">
                  <CodeChip className="!text-[0.7rem]">{g.code}</CodeChip>
                  <span className="min-w-0 truncate text-[0.82rem] font-bold">{g.project}</span>
                </div>
                {g.sprints.length === 0 ? (
                  <p className="mt-2 font-hand text-[0.95rem] text-[var(--ink-soft)]">
                    phiên chưa có sprint — bấm “Tạo Sprint” để khởi động ✎
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2.5">
                    {g.sprints.map((sp) => {
                      const allowed = transitions[sp.id] ?? [];
                      const editable = sp.status === "planned" || sp.status === "active";
                      const rowBusy = busySprintId === sp.id;
                      const done = sp.totalTasks - sp.openTasks;
                      const pct = sp.totalTasks > 0 ? Math.round((done / sp.totalTasks) * 100) : 0;
                      return (
                        <li
                          key={sp.id}
                          className={`sketch-border-thin bg-[var(--paper-raised)] p-3.5 ${
                            sp.status === "cancelled" ? "opacity-75" : ""
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-[0.88rem] font-bold leading-tight">{sp.name}</p>
                                <SprintStatusBadge status={sp.status} />
                                {board && sp.id === board.id && (
                                  <CodeChip className="!px-2 !py-0.5 !text-[0.6rem]">bảng dưới</CodeChip>
                                )}
                              </div>
                              <p className="mt-1 line-clamp-1 text-[0.78rem] italic text-[var(--ink-soft)]">
                                {sp.goal}
                              </p>
                              <p className="mt-1.5 inline-flex items-center gap-1.5 font-geist-mono text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-[var(--ink-soft)]">
                                <VColumns size={13} aria-hidden="true" />
                                {fmtMD(sp.startsAt)} → {fmtMD(sp.endsAt)}
                              </p>
                            </div>
                            <div className="w-full sm:w-44">
                              <div className="mb-1 flex items-center justify-between text-[0.68rem] font-bold">
                                <span className="text-[var(--ink-soft)]">nhiệm vụ</span>
                                <span className="tabular">
                                  {done}/{sp.totalTasks}
                                </span>
                              </div>
                              <MiniBar
                                value={pct}
                                tone={sp.status === "completed" ? "success" : "royal"}
                                label={`Tiến độ ${sp.name}`}
                                animate={false}
                              />
                              <p className="mt-0.5 text-[0.66rem] font-semibold text-[var(--ink-soft)] tabular">
                                còn {sp.openTasks} nhiệm vụ mở
                              </p>
                            </div>
                          </div>

                          {editable ? (
                            <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-dashed border-[color-mix(in_srgb,var(--ink)_20%,transparent)] pt-2.5">
                              {allowed.includes("active") && (
                                <InkButton
                                  variant="royal"
                                  size="sm"
                                  onClick={() => activateSprint(sp)}
                                  disabled={rowBusy}
                                  aria-label={`Kích hoạt ${sp.name}`}
                                >
                                  <VPlay size={14} /> {rowBusy ? "Đang xử lý…" : "Kích hoạt Sprint"}
                                </InkButton>
                              )}
                              {allowed.includes("completed") && (
                                <InkButton
                                  variant="royal"
                                  size="sm"
                                  onClick={() => openConfirm(sp, "completed")}
                                  disabled={rowBusy}
                                  aria-label={`Hoàn thành ${sp.name}`}
                                >
                                  <VCheckCheck size={14} /> Hoàn thành Sprint
                                </InkButton>
                              )}
                              {allowed.includes("cancelled") && (
                                <InkButton
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openConfirm(sp, "cancelled")}
                                  disabled={rowBusy}
                                  aria-label={`Hủy ${sp.name}`}
                                >
                                  <VBan size={14} /> Hủy Sprint
                                </InkButton>
                              )}
                              <InkButton
                                variant="outline"
                                size="sm"
                                onClick={() => openEdit(sp)}
                                disabled={rowBusy}
                                aria-label={`Sửa ${sp.name}`}
                              >
                                <VEdit size={14} /> Sửa Sprint
                              </InkButton>
                              <InkButton
                                variant="ghost"
                                size="sm"
                                onClick={() => openTask(sp)}
                                disabled={rowBusy}
                                aria-label={`Giao nhiệm vụ trong ${sp.name}`}
                              >
                                <VSend size={14} /> Giao việc
                              </InkButton>
                            </div>
                          ) : (
                            <p className="mt-2 border-t border-dashed border-[color-mix(in_srgb,var(--ink)_18%,transparent)] pt-2 font-hand text-[0.85rem] text-[var(--ink-soft)]">
                              sprint đã đóng — lịch sử được giữ lại
                            </p>
                          )}

                          {rowError?.id === sp.id && (
                            <p
                              key={rowError.message}
                              role="alert"
                              className="mt-2 animate-shake-ink text-[0.72rem] font-semibold text-[var(--danger)]"
                            >
                              {rowError.message}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </SketchCard>
      )}
      <MarginNote>
        hoàn thành / hủy là một chiều — sprint đóng rồi không kích hoạt lại được đâu
      </MarginNote>
    </section>
  );

  /* ---------- render ---------- */

  return (
    <div className="space-y-6">
      {/* ===== Tiêu đề ===== */}
      <PageHeading eyebrow="Sổ tay hành trình · Giảng viên" title="Sprint & Task">
        <InkButton variant="outline" size="sm" onClick={reloadAll}>
          <VRefresh size={15} /> Làm mới
        </InkButton>
      </PageHeading>

      {/* ===== Danh sách sprint theo phiên (vòng đời) ===== */}
      <FadeIn>{sprintSection}</FadeIn>

      {error ? (
        <ErrorState message={error} onRetry={reloadAll} />
      ) : loading && !board ? (
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
                variant={boardTerminal ? "slate" : board.daysLeft > 7 ? "blue" : "warm"}
                className={board.daysLeft <= 3 && !boardTerminal ? "tape-gold" : ""}
                rotate={-5}
                style={{ top: -13, left: 2, width: 62, height: 18 }}
              />
              <CodeChip className="!px-2.5 !py-1 !text-[0.74rem]">{board.name}</CodeChip>
              <InkBadge tone="neutral">{board.week}</InkBadge>
              {boardTerminal ? (
                <StampMoc
                  tone={board.status === "completed" ? "blue" : "red"}
                  rotate={-4}
                  className="ml-1 text-[0.9rem]"
                >
                  {board.status === "completed" ? "Sprint đã hoàn thành" : "Sprint đã hủy"}
                </StampMoc>
              ) : (
                <InkBadge tone="amber">
                  <VHourglass size={13} /> còn {board.daysLeft} ngày
                </InkBadge>
              )}
              <span className="ml-auto hidden font-geist-mono text-[0.66rem] uppercase tracking-[0.16em] text-[var(--ink-soft)] sm:block">
                chỉ xem · giảng viên
              </span>
            </div>
          </FadeIn>

          {boardTerminal && (
            <MarginNote className="px-1">bảng chỉ xem — lịch sử được giữ lại</MarginNote>
          )}

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

      {/* ===== Dialog xác nhận hoàn thành / hủy Sprint ===== */}
      <Dialog
        open={!!pending}
        onOpenChange={(open) => {
          if (!open && !confirmBusy) setPending(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{pending?.kind === "completed" ? "Hoàn thành Sprint?" : "Hủy Sprint?"}</DialogTitle>
            <DialogDescription>
              {pending?.kind === "completed"
                ? "Sau khi hoàn thành, Sprint không kích hoạt lại được. Kiểm tra nhiệm vụ còn mở trước khi xác nhận."
                : "Sau khi hủy, Sprint không thể kích hoạt lại. Hãy kiểm tra tiến độ trước khi xác nhận."}
            </DialogDescription>
          </DialogHeader>
          {pending && (
            <div className="sketch-border-thin bg-[var(--paper)] p-3 text-[0.8rem]">
              <p className="flex flex-wrap items-center gap-2 font-bold">
                {pending.sprint.name}
                <SprintStatusBadge status={pending.sprint.status} />
              </p>
              <p className="mt-1 text-[var(--ink-soft)] tabular">
                {fmtMD(pending.sprint.startsAt)} → {fmtMD(pending.sprint.endsAt)} · còn{" "}
                {pending.sprint.openTasks}/{pending.sprint.totalTasks} nhiệm vụ mở
              </p>
            </div>
          )}
          {confirmError && (
            <p
              key={confirmError}
              role="alert"
              className="animate-shake-ink text-[0.8rem] font-semibold text-[var(--danger)]"
            >
              {confirmError}
            </p>
          )}
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setPending(null)} disabled={confirmBusy}>
              {pending?.kind === "cancelled" ? "Giữ Sprint" : "Để sau"}
            </InkButton>
            {pending?.kind === "cancelled" ? (
              <DangerInkButton onClick={submitConfirm} disabled={confirmBusy} aria-label="Xác nhận hủy Sprint">
                <VBan size={15} /> {confirmBusy ? "Đang hủy…" : "Xác nhận hủy Sprint"}
              </DangerInkButton>
            ) : (
              <InkButton
                variant="royal"
                size="sm"
                onClick={submitConfirm}
                disabled={confirmBusy}
                aria-label="Xác nhận hoàn thành Sprint"
              >
                <VCheckCheck size={15} /> {confirmBusy ? "Đang xử lý…" : "Xác nhận hoàn thành"}
              </InkButton>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog sửa Sprint ===== */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open && !editBusy) {
            setEditTarget(null);
            setEditError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sửa Sprint</DialogTitle>
            <DialogDescription>
              Chỉnh tên, mục tiêu và hai mốc thời gian — áp dụng cho Sprint đang lập kế hoạch hoặc đang diễn
              ra.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sp-edit-name">Tên Sprint</Label>
              <Input
                id="sp-edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="VD: Sprint 3"
                className="focus-ink"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-edit-goal">Mục tiêu</Label>
              <Textarea
                id="sp-edit-goal"
                rows={3}
                value={editForm.goal}
                onChange={(e) => setEditForm((f) => ({ ...f, goal: e.target.value }))}
                placeholder="Mục tiêu Sprint cần đạt được..."
                className="focus-ink resize-none"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sp-edit-start">Ngày bắt đầu</Label>
                <Input
                  id="sp-edit-start"
                  type="date"
                  value={editForm.startsAt}
                  onChange={(e) => setEditForm((f) => ({ ...f, startsAt: e.target.value }))}
                  className="focus-ink"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sp-edit-end">Ngày kết thúc</Label>
                <Input
                  id="sp-edit-end"
                  type="date"
                  value={editForm.endsAt}
                  onChange={(e) => setEditForm((f) => ({ ...f, endsAt: e.target.value }))}
                  className="focus-ink"
                />
              </div>
            </div>
            {editError && (
              <p key={editError} role="alert" className="animate-shake-ink text-[0.8rem] font-semibold text-[var(--danger)]">
                {editError}
              </p>
            )}
            <DialogFooter>
              <InkButton
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditTarget(null);
                  setEditError(null);
                }}
                disabled={editBusy}
              >
                Đóng
              </InkButton>
              <InkButton variant="royal" size="sm" onClick={submitEdit} disabled={editBusy}>
                <VEdit size={15} /> {editBusy ? "Đang xử lý…" : "Lưu thay đổi"}
              </InkButton>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog tạo Sprint ===== */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open && !createBusy) setCreateOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tạo Sprint mới</DialogTitle>
            <DialogDescription>
              Sprint mới vào trạng thái đã lập kế hoạch — kích hoạt khi đội hình sẵn sàng.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sp-create-session">Phiên thực tập</Label>
              <Select
                value={createForm.sessionId}
                onValueChange={(v) => setCreateForm((f) => ({ ...f, sessionId: v }))}
              >
                <SelectTrigger id="sp-create-session" className="focus-ink w-full" aria-label="Chọn phiên thực tập">
                  <SelectValue placeholder="Chọn phiên" />
                </SelectTrigger>
                <SelectContent>
                  {(sessions ?? [])
                    .filter((s) => s.status !== "cancelled")
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.code} · {s.project}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-create-name">Tên Sprint</Label>
              <Input
                id="sp-create-name"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="VD: Sprint 6"
                className="focus-ink"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-create-goal">Mục tiêu</Label>
              <Textarea
                id="sp-create-goal"
                rows={3}
                value={createForm.goal}
                onChange={(e) => setCreateForm((f) => ({ ...f, goal: e.target.value }))}
                placeholder="Mục tiêu Sprint cần đạt được..."
                className="focus-ink resize-none"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sp-create-start">Ngày bắt đầu</Label>
                <Input
                  id="sp-create-start"
                  type="date"
                  value={createForm.startsAt}
                  onChange={(e) => setCreateForm((f) => ({ ...f, startsAt: e.target.value }))}
                  className="focus-ink"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sp-create-end">Ngày kết thúc</Label>
                <Input
                  id="sp-create-end"
                  type="date"
                  value={createForm.endsAt}
                  onChange={(e) => setCreateForm((f) => ({ ...f, endsAt: e.target.value }))}
                  className="focus-ink"
                />
              </div>
            </div>
            {createError && (
              <p key={createError} role="alert" className="animate-shake-ink text-[0.8rem] font-semibold text-[var(--danger)]">
                {createError}
              </p>
            )}
            <DialogFooter>
              <InkButton variant="ghost" size="sm" onClick={() => setCreateOpen(false)} disabled={createBusy}>
                Huỷ
              </InkButton>
              <InkButton variant="royal" size="sm" onClick={submitCreate} disabled={createBusy}>
                <VPlus size={15} /> {createBusy ? "Đang xử lý…" : "Tạo Sprint"}
              </InkButton>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog tạo nhiệm vụ ===== */}
      <Dialog
        open={taskOpen}
        onOpenChange={(open) => {
          if (!open && !taskBusy) setTaskOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tạo nhiệm vụ</DialogTitle>
            <DialogDescription>
              Nhiệm vụ mới rơi vào cột Cần làm của Sprint được chọn — sinh viên tự kéo thẻ trên kanban cá nhân.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sp-task-sprint">Sprint nhận nhiệm vụ</Label>
              <Select
                value={taskForm.sprintId}
                onValueChange={(v) => setTaskForm((f) => ({ ...f, sprintId: v }))}
              >
                <SelectTrigger id="sp-task-sprint" className="focus-ink w-full" aria-label="Chọn Sprint nhận nhiệm vụ">
                  <SelectValue placeholder={openSprints.length === 0 ? "Không có Sprint đang mở" : "Chọn Sprint"} />
                </SelectTrigger>
                <SelectContent>
                  {openSprints.map((sp) => (
                    <SelectItem key={sp.id} value={sp.id}>
                      {sp.name} · {SPRINT_STATUS_META[sp.status].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-task-title">Tiêu đề nhiệm vụ</Label>
              <Input
                id="sp-task-title"
                value={taskForm.title}
                onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="VD: Hoàn thiện bộ lọc danh sách nhiệm vụ"
                className="focus-ink"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-task-assignee">Người nhận</Label>
              <Input
                id="sp-task-assignee"
                list="sp-task-assignee-options"
                value={taskForm.assignee}
                onChange={(e) => setTaskForm((f) => ({ ...f, assignee: e.target.value }))}
                placeholder="VD: Nguyễn Minh"
                className="focus-ink"
              />
              <datalist id="sp-task-assignee-options">
                {assigneeOptions.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sp-task-priority">Ưu tiên</Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(v) => setTaskForm((f) => ({ ...f, priority: v as Priority }))}
                >
                  <SelectTrigger id="sp-task-priority" className="focus-ink w-full" aria-label="Chọn mức ưu tiên">
                    <SelectValue placeholder="Chọn mức ưu tiên" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sp-task-points">Story points (1–13)</Label>
                <Input
                  id="sp-task-points"
                  type="number"
                  min={1}
                  max={13}
                  step={1}
                  value={taskForm.points}
                  onChange={(e) => setTaskForm((f) => ({ ...f, points: e.target.value }))}
                  className="focus-ink"
                />
              </div>
            </div>
            {board && (
              <p className="font-hand text-[0.9rem] leading-snug text-[var(--ink-soft)]">
                nhiệm vụ vào {boardShortName(board)} sẽ hiện ngay ở bảng Kanban bên dưới ✎
              </p>
            )}
            {taskError && (
              <p key={taskError} role="alert" className="animate-shake-ink text-[0.8rem] font-semibold text-[var(--danger)]">
                {taskError}
              </p>
            )}
            <DialogFooter>
              <InkButton variant="ghost" size="sm" onClick={() => setTaskOpen(false)} disabled={taskBusy}>
                Đóng
              </InkButton>
              <InkButton
                variant="royal"
                size="sm"
                onClick={submitTask}
                disabled={taskBusy || openSprints.length === 0}
                aria-label="Giao nhiệm vụ"
              >
                <VSend size={15} /> {taskBusy ? "Đang xử lý…" : "Giao nhiệm vụ"}
              </InkButton>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
