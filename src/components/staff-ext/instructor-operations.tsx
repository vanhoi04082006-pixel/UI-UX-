"use client";
/* =====================================================================
 * INSTRUCTOR OPERATIONS — "Điều phối phiên" (route: instructor → operations).
 * Endpoint BE cover:
 *   · GET /sessions (selector) · POST /sessions · PATCH /sessions/{id}
 *   · GET /sessions/overview · GET /sessions/instructor-options · GET /sessions/member-options
 *   · GET /sessions/{id} · GET /sessions/{id}/timeline · GET /sessions/{id}/work
 *   · GET/POST /sessions/{id}/members · DELETE /sessions/{id}/members/{userId}
 *   · GET/POST /sessions/{id}/instructors · DELETE /sessions/{id}/instructors/{userId}
 *   · GET/POST /sessions/{id}/milestones · PATCH/DELETE /sessions/{id}/milestones/{mid}
 *   · GET /sessions/{id}/participation · POST .../participation/policy
 *   · POST .../participation/refresh · POST .../participation/tasks/{taskId}/extend
 *   · POST .../participation/incidents/{iid}/resolve · POST .../incidents/{iid}/replacement-advice
 *   · POST .../incidents/{iid}/replacement-preview · GET .../replacements/{commandId}
 *   · POST .../replacements/{commandId}/approve
 *   · GET .../participation/repository-access-jobs · POST .../repository-access-jobs/{jobId}/retry
 *   · GET /sessions/{id}/github · POST .../github/provision|invite|reconcile|webhook
 *   · POST .../github/members/{userId}/invite · GET .../github/activity
 * ===================================================================== */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  VCheck,
  VGithub,
  VInbox,
  VKanban,
  VPlus,
  VRefresh,
  VTarget,
  VTrash,
  VUser,
  VUsers,
} from "@/components/icons/v-icons";
import { InkButton } from "@/components/notebook/reveal";
import { InkBadge, MarginNote, SketchCard, formatDateTimeVN } from "@/components/notebook/ui";
import {
  ChipGroup,
  EmptyState,
  PencilLines,
  SectionError,
  SketchInput,
  SketchTextarea,
  StaffPageHeader,
} from "@/components/staff/staff-kit";
import { useApi } from "@/lib/use-api";
import { errorMessage } from "@/lib/api/api-client";
import {
  addSessionInstructors,
  addSessionMembers,
  approveReplacement,
  configureSessionGithubWebhook,
  createMilestone,
  createSession,
  deleteMilestone,
  extendParticipationTask,
  getSessionDetail,
  getSessionGithub,
  getSessionInstructorOptions,
  getSessionMemberOptions,
  getSessionParticipation,
  inviteAllSessionGithub,
  inviteMemberSessionGithub,
  listOpSessions,
  listRepositoryAccessJobs,
  listSessionGithubActivity,
  listSessionInstructors,
  listSessionMembers,
  listSessionMilestones,
  listSessionTimeline,
  listSessionWork,
  previewReplacement,
  provisionSessionGithub,
  reconcileSessionGithub,
  refreshParticipation,
  removeSessionInstructor,
  removeSessionMember,
  requestReplacementAdvice,
  resolveIncident,
  retryRepositoryAccessJob,
  saveParticipationPolicy,
  updateMilestone,
  updateSession,
  type OptionUser,
  type ParticipationEntry,
  type ParticipationReport,
  type SessionDetail,
  type SessionListItem,
} from "@/lib/api/operations";
import { cn } from "@/lib/utils";

/* ------------------------------ hiển thị ------------------------------- */

const SESSION_STATUS_META: Record<string, { label: string; tone: string }> = {
  upcoming: { label: "Sắp diễn ra", tone: "amber" },
  active: { label: "Đang chạy", tone: "blue" },
  ending: { label: "Sắp kết thúc", tone: "amber" },
  completed: { label: "Hoàn thành", tone: "green" },
  cancelled: { label: "Đã hủy", tone: "red" },
};

function statusMeta(status: string) {
  return SESSION_STATUS_META[status] ?? { label: status, tone: "neutral" };
}

function shortId(id: string | null): string {
  if (!id) return "—";
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

/** Đọc giá trị hiển thị an toàn từ raw record (dữ liệu chưa công bố schema). */
function rawText(raw: Record<string, unknown>, keys: string[], fallback = "—"): string {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.length > 0) return value;
    if (typeof value === "number") return String(value);
  }
  return fallback;
}

type TabKey = "overview" | "members" | "milestones" | "participation" | "github" | "repo";

export default function InstructorOperations() {
  /* ------------------------------ phiên chọn ----------------------------- */
  const sessions = useApi(listOpSessions, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>("overview");

  const items = sessions.data?.items ?? [];
  const selected = useMemo(
    () => items.find((s) => s.id === selectedId) ?? null,
    [items, selectedId],
  );

  function pickSession(id: string) {
    setSelectedId(id);
    setTab("overview");
  }

  /* ------------------------------ render gốc ----------------------------- */

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-8 sm:px-6">
      <StaffPageHeader
        eyebrow="Sổ tay hành trình · Giảng viên"
        title="Điều phối phiên"
        sub="Quản trị sâu một phiên: thành viên, mốc, tham gia, thay người, GitHub và quyền truy cập repo."
        note="Chọn một phiên ở bảng trên — mọi tab bên dưới thao tác trên phiên đó."
        icon={VTarget}
        actions={
          <InkButton variant="royal" size="sm" onClick={() => setCreateOpen(true)}>
            <VPlus size={14} /> Phiên mới
          </InkButton>
        }
      />

      {/* Bảng chọn phiên */}
      {sessions.loading ? (
        <PencilLines rows={3} />
      ) : sessions.error ? (
        <SectionError message={sessions.error} onRetry={sessions.reload} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={VInbox}
          title="Chưa có phiên thực tập nào"
          note="Tạo phiên mới để bắt đầu điều phối — chọn mã dự án, đặt tên và khung thời gian."
        />
      ) : (
        <SketchCard hover={false} className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b-2 border-dashed border-[color-mix(in_srgb,var(--ink)_25%,transparent)] text-[0.7rem] uppercase tracking-wider text-[var(--ink-soft)]">
                <th className="px-4 py-3 font-bold">Mã</th>
                <th className="px-4 py-3 font-bold">Tên phiên</th>
                <th className="px-4 py-3 font-bold">Trạng thái</th>
                <th className="px-4 py-3 font-bold">Khung thời gian</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((s) => {
                const meta = statusMeta(s.status);
                const active = s.id === selectedId;
                return (
                  <tr
                    key={s.id}
                    className={cn(
                      "border-b border-dashed border-[color-mix(in_srgb,var(--ink)_15%,transparent)] transition-colors",
                      active ? "bg-[var(--blue-mist)]" : "hover:bg-[var(--blue-mist)]/50",
                    )}
                  >
                    <td className="px-4 py-3 font-mono text-xs">{s.code}</td>
                    <td className="px-4 py-3 font-semibold">{s.name}</td>
                    <td className="px-4 py-3">
                      <InkBadge tone={meta.tone} dot className="px-2 py-0.5 text-[0.66rem]">
                        {meta.label}
                      </InkBadge>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--ink-soft)]">
                      {s.startDate ? formatDateTimeVN(s.startDate) : "—"} →{" "}
                      {s.endDate ? formatDateTimeVN(s.endDate) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <InkButton
                        variant={active ? "royal" : "outline"}
                        size="sm"
                        onClick={() => pickSession(s.id)}
                      >
                        {active ? "Đang mở" : "Điều phối"}
                      </InkButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </SketchCard>
      )}

      {/* Nội dung phiên được chọn */}
      {selected ? (
        <div className="space-y-4">
          <ChipGroup
            ariaLabel="Chọn khu vực điều phối"
            value={tab}
            onChange={setTab}
            options={[
              { value: "overview", label: "Tổng quan" },
              { value: "members", label: "Thành viên" },
              { value: "milestones", label: "Mốc" },
              { value: "participation", label: "Tham gia & Thay người" },
              { value: "github", label: "GitHub" },
              { value: "repo", label: "Quyền repo" },
            ]}
          />
          {tab === "overview" && <OverviewTab session={selected} />}
          {tab === "members" && <MembersTab sessionId={selected.id} />}
          {tab === "milestones" && <MilestonesTab sessionId={selected.id} />}
          {tab === "participation" && <ParticipationTab sessionId={selected.id} />}
          {tab === "github" && <GithubTab sessionId={selected.id} />}
          {tab === "repo" && <RepoTab sessionId={selected.id} />}
        </div>
      ) : (
        items.length > 0 && (
          <MarginNote>Chọn một phiên trong bảng để mở các công cụ điều phối.</MarginNote>
        )
      )}

      <CreateSessionDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          sessions.reload();
          pickSession(id);
        }}
      />
    </main>
  );
}

/* =====================================================================
 * TAB TỔNG QUAN — chi tiết + timeline + công việc
 * ===================================================================== */

function OverviewTab({ session }: { session: SessionListItem }) {
  const detail = useApi(() => getSessionDetail(session.id), [session.id]);
  const timeline = useApi(() => listSessionTimeline(session.id), [session.id]);
  const work = useApi(() => listSessionWork(session.id), [session.id]);
  const [editOpen, setEditOpen] = useState(false);

  if (detail.loading) return <PencilLines rows={4} />;
  if (detail.error) return <SectionError message={detail.error} onRetry={detail.reload} />;
  const d: SessionDetail | undefined = detail.data;
  if (!d) return null;

  const overview = d.overview;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <SketchCard className="p-4">
          <p className="eyebrow text-[0.62rem]">Dự án</p>
          <p className="mt-1.5 font-extrabold">{overview?.projectName ?? "—"}</p>
          <p className="mt-1 font-mono text-xs text-[var(--ink-soft)]">
            {overview?.projectCode ?? "—"}
            {overview?.templateVersion ? ` · template v${overview.templateVersion}` : ""}
          </p>
        </SketchCard>
        <SketchCard className="p-4">
          <p className="eyebrow text-[0.62rem]">Tiến độ task</p>
          <p className="mt-1.5 text-2xl font-extrabold tabular">
            {overview ? `${overview.taskDone}/${overview.taskTotal}` : "—"}
          </p>
          <p className="mt-1 text-xs text-[var(--ink-soft)]">
            {overview?.taskPercent !== undefined && overview.taskPercent !== null
              ? `${overview.taskPercent}% hoàn thành`
              : "Chưa có dữ liệu"}
            {overview && overview.overdueTasks > 0 ? ` · ${overview.overdueTasks} quá hạn` : ""}
          </p>
        </SketchCard>
        <SketchCard className="p-4">
          <p className="eyebrow text-[0.62rem]">Quy mô</p>
          <p className="mt-1.5 text-2xl font-extrabold tabular">{overview?.memberCount ?? 0}</p>
          <p className="mt-1 text-xs text-[var(--ink-soft)]">
            thành viên · {overview?.sprintCount ?? 0} sprint
          </p>
        </SketchCard>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-[var(--ink-soft)]">
          Dòng thời gian phiên
        </h2>
        <InkButton variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          Sửa thông tin phiên
        </InkButton>
      </div>

      {timeline.loading ? (
        <PencilLines rows={3} />
      ) : timeline.error ? (
        <SectionError message={timeline.error} onRetry={timeline.reload} />
      ) : (timeline.data?.length ?? 0) === 0 ? (
        <EmptyState icon={VInbox} title="Chưa có sự kiện nào" note="Timeline sẽ ghi lại mỗi thao tác trên phiên." />
      ) : (
        <SketchCard hover={false} className="max-h-96 space-y-3 overflow-y-auto p-4">
          {(timeline.data ?? []).map((item) => (
            <div key={item.id} className="flex gap-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full border border-[var(--ink)] bg-[var(--royal)]" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{item.summary}</p>
                <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
                  {item.action}
                  {item.actorName ? ` · ${item.actorName}` : ""}
                  {item.createdAt ? ` · ${formatDateTimeVN(item.createdAt)}` : ""}
                </p>
              </div>
            </div>
          ))}
        </SketchCard>
      )}

      <h2 className="text-sm font-extrabold uppercase tracking-wider text-[var(--ink-soft)]">
        Công việc trong phiên
      </h2>
      {work.loading ? (
        <PencilLines rows={3} />
      ) : work.error ? (
        <SectionError message={work.error} onRetry={work.reload} />
      ) : (work.data?.length ?? 0) === 0 ? (
        <EmptyState icon={VKanban} title="Chưa có task nào" note="Task được sinh từ sprint kế hoạch của phiên." />
      ) : (
        <SketchCard hover={false} className="overflow-x-auto p-0">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b-2 border-dashed border-[color-mix(in_srgb,var(--ink)_25%,transparent)] text-[0.7rem] uppercase tracking-wider text-[var(--ink-soft)]">
                <th className="px-4 py-2.5 font-bold">Mã</th>
                <th className="px-4 py-2.5 font-bold">Task</th>
                <th className="px-4 py-2.5 font-bold">Trạng thái</th>
                <th className="px-4 py-2.5 font-bold">Deadline</th>
                <th className="px-4 py-2.5 font-bold">Điểm</th>
              </tr>
            </thead>
            <tbody>
              {(work.data ?? []).map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-dashed border-[color-mix(in_srgb,var(--ink)_15%,transparent)]"
                >
                  <td className="px-4 py-2.5 font-mono text-xs">{t.code}</td>
                  <td className="px-4 py-2.5 font-semibold">
                    {t.title}
                    {t.blocked ? (
                      <InkBadge tone="red" className="ml-2 px-1.5 py-0 text-[0.58rem]">
                        Bị chặn
                      </InkBadge>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-xs">{t.status ?? "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-[var(--ink-soft)]">
                    {t.dueDate ? formatDateTimeVN(t.dueDate) : "—"}
                  </td>
                  <td className="px-4 py-2.5 tabular text-xs">
                    {t.instructorScore !== null ? t.instructorScore : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SketchCard>
      )}

      <EditSessionDialog
        session={session}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          detail.reload();
          timeline.reload();
        }}
      />
    </div>
  );
}

/* =====================================================================
 * TAB THÀNH VIÊN — members + instructors
 * ===================================================================== */

function MembersTab({ sessionId }: { sessionId: string }) {
  const members = useApi(() => listSessionMembers(sessionId), [sessionId]);
  const instructors = useApi(() => listSessionInstructors(sessionId), [sessionId]);
  const memberOptions = useApi(getSessionMemberOptions, []);
  const instructorOptions = useApi(getSessionInstructorOptions, []);
  const [addOpen, setAddOpen] = useState<"member" | "instructor" | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove(kind: "member" | "instructor", userId: string, name: string) {
    setBusy(true);
    try {
      if (kind === "member") await removeSessionMember(sessionId, userId);
      else await removeSessionInstructor(sessionId, userId);
      toast.success(`Đã xóa ${kind === "member" ? "thành viên" : "giảng viên"} ${name}`);
      members.reload();
      instructors.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-[var(--ink-soft)]">
            Sinh viên ({members.data?.length ?? 0})
          </h2>
          <InkButton variant="outline" size="sm" onClick={() => setAddOpen("member")}>
            <VPlus size={13} /> Thêm
          </InkButton>
        </div>
        {members.loading ? (
          <PencilLines rows={3} />
        ) : members.error ? (
          <SectionError message={members.error} onRetry={members.reload} />
        ) : (members.data?.length ?? 0) === 0 ? (
          <EmptyState icon={VUsers} title="Chưa có sinh viên" note="Thêm thành viên để phân công task." />
        ) : (
          <SketchCard hover={false} className="max-h-96 space-y-2 overflow-y-auto p-4">
            {(members.data ?? []).map((m) => (
              <div key={m.userId} className="flex items-center gap-3 border-b border-dashed border-[color-mix(in_srgb,var(--ink)_12%,transparent)] pb-2 last:border-0">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--blue-mist)] text-xs font-extrabold">
                  {(m.displayName || "?").slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{m.displayName}</p>
                  <p className="truncate text-xs text-[var(--ink-soft)]">
                    {m.email ?? "—"}
                    {m.assignmentStatus ? ` · ${m.assignmentStatus}` : ""}
                  </p>
                </div>
                <InkButton
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => remove("member", m.userId, m.displayName)}
                  aria-label={`Xóa ${m.displayName}`}
                >
                  <VTrash size={13} />
                </InkButton>
              </div>
            ))}
          </SketchCard>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-[var(--ink-soft)]">
            Giảng viên ({instructors.data?.length ?? 0})
          </h2>
          <InkButton variant="outline" size="sm" onClick={() => setAddOpen("instructor")}>
            <VPlus size={13} /> Thêm
          </InkButton>
        </div>
        {instructors.loading ? (
          <PencilLines rows={2} />
        ) : instructors.error ? (
          <SectionError message={instructors.error} onRetry={instructors.reload} />
        ) : (instructors.data?.length ?? 0) === 0 ? (
          <EmptyState icon={VUser} title="Chưa có giảng viên phụ" note="Phiên cần ít nhất một giảng viên chính." />
        ) : (
          <SketchCard hover={false} className="max-h-96 space-y-2 overflow-y-auto p-4">
            {(instructors.data ?? []).map((i) => (
              <div key={i.instructorId} className="flex items-center gap-3 border-b border-dashed border-[color-mix(in_srgb,var(--ink)_12%,transparent)] pb-2 last:border-0">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-xs font-extrabold">
                  {(i.displayName || "?").slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{i.displayName}</p>
                  <p className="truncate text-xs text-[var(--ink-soft)]">
                    {i.email ?? "—"}
                    {i.assignedAt ? ` · từ ${formatDateTimeVN(i.assignedAt)}` : ""}
                  </p>
                </div>
                <InkButton
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => remove("instructor", i.instructorId, i.displayName)}
                  aria-label={`Xóa ${i.displayName}`}
                >
                  <VTrash size={13} />
                </InkButton>
              </div>
            ))}
          </SketchCard>
        )}
      </div>

      <AddUsersDialog
        open={addOpen === "member"}
        title="Thêm sinh viên vào phiên"
        options={memberOptions.data ?? []}
        excludeIds={new Set((members.data ?? []).map((m) => m.userId))}
        onClose={() => setAddOpen(null)}
        busy={busy}
        onSubmit={async (userIds) => {
          setBusy(true);
          try {
            await addSessionMembers(sessionId, userIds);
            toast.success(`Đã thêm ${userIds.length} sinh viên`);
            setAddOpen(null);
            members.reload();
          } catch (err) {
            toast.error(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      />
      <AddUsersDialog
        open={addOpen === "instructor"}
        title="Thêm giảng viên vào phiên"
        options={instructorOptions.data ?? []}
        excludeIds={new Set((instructors.data ?? []).map((i) => i.instructorId))}
        onClose={() => setAddOpen(null)}
        busy={busy}
        onSubmit={async (userIds) => {
          setBusy(true);
          try {
            await addSessionInstructors(sessionId, userIds);
            toast.success(`Đã thêm ${userIds.length} giảng viên`);
            setAddOpen(null);
            instructors.reload();
          } catch (err) {
            toast.error(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

/** Dialog chọn nhiều user từ options (checkbox list). */
function AddUsersDialog({
  open,
  title,
  options,
  excludeIds,
  onClose,
  onSubmit,
  busy,
}: {
  open: boolean;
  title: string;
  options: OptionUser[];
  excludeIds: Set<string>;
  onClose: () => void;
  onSubmit: (userIds: string[]) => Promise<void>;
  busy: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const available = options.filter((o) => !excludeIds.has(o.userId));

  function toggle(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Chọn một hoặc nhiều người rồi bấm Thêm.</DialogDescription>
        </DialogHeader>
        {available.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--ink-soft)]">
            Không còn người nào khả dụng.
          </p>
        ) : (
          <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {available.map((o) => (
              <label
                key={o.userId}
                className="flex cursor-pointer items-center gap-3 rounded-[9px] border-2 border-[color-mix(in_srgb,var(--ink)_22%,transparent)] px-3 py-2 transition-colors hover:border-[var(--ink)]"
              >
                <input
                  type="checkbox"
                  checked={selected.has(o.userId)}
                  onChange={() => toggle(o.userId)}
                  className="h-4 w-4 accent-[var(--royal)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{o.displayName}</span>
                  <span className="block truncate text-xs text-[var(--ink-soft)]">{o.email ?? "—"}</span>
                </span>
              </label>
            ))}
          </div>
        )}
        <div className="mt-3 flex justify-end gap-2">
          <InkButton variant="outline" size="sm" onClick={onClose}>
            Hủy
          </InkButton>
          <InkButton
            variant="royal"
            size="sm"
            disabled={busy || selected.size === 0}
            onClick={() => onSubmit(Array.from(selected))}
          >
            {busy ? "Đang thêm…" : `Thêm ${selected.size > 0 ? `(${selected.size})` : ""}`}
          </InkButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* =====================================================================
 * TAB MỐC — milestones CRUD
 * ===================================================================== */

function MilestonesTab({ sessionId }: { sessionId: string }) {
  const milestones = useApi(() => listSessionMilestones(sessionId), [sessionId]);
  const [editing, setEditing] = useState<{ id?: string; title: string; description: string; dueDate: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!editing) return;
    setBusy(true);
    try {
      const dueDate = editing.dueDate ? new Date(editing.dueDate).toISOString() : undefined;
      if (editing.id) {
        await updateMilestone(sessionId, editing.id, {
          title: editing.title,
          description: editing.description || undefined,
          dueDate,
        });
        toast.success("Đã cập nhật mốc");
      } else {
        await createMilestone(sessionId, {
          title: editing.title,
          description: editing.description || undefined,
          dueDate,
        });
        toast.success("Đã tạo mốc mới");
      }
      setEditing(null);
      milestones.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(milestoneId: string) {
    setBusy(true);
    try {
      await deleteMilestone(sessionId, milestoneId);
      toast.success("Đã xóa mốc");
      milestones.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-[var(--ink-soft)]">
          Mốc phiên ({milestones.data?.length ?? 0})
        </h2>
        <InkButton
          variant="royal"
          size="sm"
          onClick={() => setEditing({ title: "", description: "", dueDate: "" })}
        >
          <VPlus size={14} /> Mốc mới
        </InkButton>
      </div>

      {milestones.loading ? (
        <PencilLines rows={3} />
      ) : milestones.error ? (
        <SectionError message={milestones.error} onRetry={milestones.reload} />
      ) : (milestones.data?.length ?? 0) === 0 ? (
        <EmptyState icon={VTarget} title="Chưa có mốc nào" note="Mốc giúp phiên bám sát kế hoạch — ví dụ 'Hoàn thành Sprint 1'." />
      ) : (
        <div className="space-y-2">
          {(milestones.data ?? []).map((m) => (
            <SketchCard key={m.id} className="flex flex-wrap items-center gap-3 p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--blue-mist)] font-mono text-xs font-extrabold">
                {m.sortOrder}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{m.title}</p>
                {m.description ? (
                  <p className="mt-0.5 text-sm text-[var(--ink-soft)]">{m.description}</p>
                ) : null}
                <p className="mt-1 text-xs text-[var(--ink-soft)]">
                  {m.dueDate ? `Hạn: ${formatDateTimeVN(m.dueDate)}` : "Chưa đặt hạn"} · {m.status}
                </p>
              </div>
              <div className="flex gap-2">
                <InkButton
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditing({
                      id: m.id,
                      title: m.title,
                      description: m.description ?? "",
                      dueDate: m.dueDate ? m.dueDate.slice(0, 10) : "",
                    })
                  }
                >
                  Sửa
                </InkButton>
                <InkButton variant="outline" size="sm" disabled={busy} onClick={() => remove(m.id)}>
                  <VTrash size={13} />
                </InkButton>
              </div>
            </SketchCard>
          ))}
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(next) => !next && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Sửa mốc" : "Mốc mới"}</DialogTitle>
            <DialogDescription>Mốc là điểm kiểm tra tiến độ quan trọng của phiên.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                  Tiêu đề *
                </span>
                <SketchInput
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="Ví dụ: Nghiệm thu Sprint 1"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                  Mô tả
                </span>
                <SketchTextarea
                  rows={3}
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="Kết quả mong đợi ở mốc này…"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                  Hạn chót
                </span>
                <SketchInput
                  type="date"
                  value={editing.dueDate}
                  onChange={(e) => setEditing({ ...editing, dueDate: e.target.value })}
                />
              </label>
            </div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <InkButton variant="outline" size="sm" onClick={() => setEditing(null)}>
              Hủy
            </InkButton>
            <InkButton variant="royal" size="sm" disabled={busy || !editing?.title.trim()} onClick={save}>
              {busy ? "Đang lưu…" : "Lưu mốc"}
            </InkButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* =====================================================================
 * TAB THAM GIA — participation + policy + incidents + replacement
 * ===================================================================== */

function ParticipationTab({ sessionId }: { sessionId: string }) {
  const report = useApi(() => getSessionParticipation(sessionId), [sessionId]);
  const [busy, setBusy] = useState(false);
  const [advice, setAdvice] = useState<Record<string, unknown> | null>(null);
  const [extension, setExtension] = useState<{ taskId: string; until: string; reason: string; expectedVersion: number } | null>(null);

  async function refresh() {
    setBusy(true);
    try {
      const res = await refreshParticipation(sessionId);
      toast.success(`Đã quét ${res.processed} bản ghi tham gia`);
      report.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function resolveIncidentAction(entry: ParticipationEntry, incidentId: string, action: "excused" | "reversed") {
    setBusy(true);
    try {
      await resolveIncident(sessionId, incidentId, {
        action,
        expectedDeadlineVersion: 1,
        reason: action === "excused" ? "Xin phép có lý do" : "Đảo ngược phạt",
      });
      toast.success(action === "excused" ? "Đã miễn trừ sự cố" : "Đã đảo ngược phạt");
      report.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function askAdvice(incidentId: string) {
    setBusy(true);
    setAdvice(null);
    try {
      const res = await requestReplacementAdvice(sessionId, incidentId);
      setAdvice(res);
      toast.success("AI đã trả lời lời khuyên thay người");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveExtension() {
    if (!extension) return;
    setBusy(true);
    try {
      await extendParticipationTask(sessionId, extension.taskId, {
        expectedVersion: extension.expectedVersion,
        until: new Date(extension.until).toISOString(),
        reason: extension.reason,
      });
      toast.success("Đã gia hạn task");
      setExtension(null);
      report.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const data: ParticipationReport | undefined = report.data;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <SketchCard className="p-4">
          <p className="eyebrow text-[0.62rem]">Tổng tham gia</p>
          <p className="mt-1 text-2xl font-extrabold tabular">{data?.total ?? "—"}</p>
        </SketchCard>
        <SketchCard className="p-4">
          <p className="eyebrow text-[0.62rem]">Đang hoạt động</p>
          <p className="mt-1 text-2xl font-extrabold tabular text-[var(--royal)]">{data?.active ?? "—"}</p>
        </SketchCard>
        <SketchCard className="p-4">
          <p className="eyebrow text-[0.62rem]">Đang bị phạt</p>
          <p className="mt-1 text-2xl font-extrabold tabular text-[var(--danger)]">
            {data?.registeredPenalty ?? "—"}
          </p>
        </SketchCard>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-[var(--ink-soft)]">
          Bảng tham gia & sự cố
        </h2>
        <div className="flex gap-2">
          <InkButton variant="outline" size="sm" disabled={busy} onClick={refresh}>
            <VRefresh size={13} /> Quét lại
          </InkButton>
          {data?.policy?.configured ? (
            <MarginNote>
              Chính sách v{data.policy.version}: cảnh báo từ {data.policy.warningFrom ?? "—"} ngày vắng ·
              phạt {data.policy.penaltyPoints ?? "—"} điểm (tối đa {data.policy.penaltyCap ?? "—"})
            </MarginNote>
          ) : (
            <MarginNote>Chưa cấu hình chính sách tham gia cho phiên.</MarginNote>
          )}
        </div>
      </div>

      {report.loading ? (
        <PencilLines rows={3} />
      ) : report.error ? (
        <SectionError message={report.error} onRetry={report.reload} />
      ) : (data?.items.length ?? 0) === 0 ? (
        <EmptyState
          icon={VUsers}
          title="Chưa có dữ liệu tham gia"
          note="Bấm 'Quét lại' để hệ thống tổng hợp điểm danh từ hoạt động của thành viên."
        />
      ) : (
        <div className="space-y-3">
          {(data?.items ?? []).map((entry, idx) => (
            <SketchCard key={entry.userId ?? idx} className="space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--blue-mist)] text-xs font-extrabold">
                  {(entry.displayName ?? "?").slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{entry.displayName ?? shortId(entry.userId)}</p>
                  <p className="text-xs text-[var(--ink-soft)]">Trạng thái: {entry.status ?? "—"}</p>
                </div>
                {entry.incidents.length > 0 && (
                  <InkBadge tone="amber" dot className="px-2 py-0.5 text-[0.66rem]">
                    {entry.incidents.length} sự cố
                  </InkBadge>
                )}
              </div>
              {entry.incidents.length > 0 && (
                <div className="space-y-2 border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_15%,transparent)] pt-3">
                  {entry.incidents.map((incident, iIdx) => (
                    <div
                      key={incident.id ?? iIdx}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-[9px] bg-[var(--paper-raised)] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          {incident.kind ?? "Sự cố"} · {incident.status ?? "mở"}
                        </p>
                        <p className="truncate text-xs text-[var(--ink-soft)]">
                          {rawText(incident.raw, ["description", "detail", "reason", "summary"], "")}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <InkButton
                          variant="outline"
                          size="sm"
                          disabled={busy || !incident.id}
                          onClick={() => incident.id && resolveIncidentAction(entry, incident.id, "excused")}
                        >
                          Miễn trừ
                        </InkButton>
                        <InkButton
                          variant="outline"
                          size="sm"
                          disabled={busy || !incident.id}
                          onClick={() => incident.id && resolveIncidentAction(entry, incident.id, "reversed")}
                        >
                          Đảo phạt
                        </InkButton>
                        <InkButton
                          variant="outline"
                          size="sm"
                          disabled={busy || !incident.id}
                          onClick={() => incident.id && askAdvice(incident.id)}
                        >
                          Hỏi AI
                        </InkButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end">
                <InkButton
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setExtension({
                      taskId: rawText(entry.raw, ["taskId", "currentTaskId"], ""),
                      until: "",
                      reason: "",
                      expectedVersion: 1,
                    })
                  }
                >
                  Gia hạn task
                </InkButton>
              </div>
            </SketchCard>
          ))}
        </div>
      )}

      {/* Lời khuyên AI */}
      <Dialog open={advice !== null} onOpenChange={(next) => !next && setAdvice(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lời khuyên thay người (AI)</DialogTitle>
            <DialogDescription>
              Gợi ý từ AI dựa trên dữ liệu phiên — quyết định cuối cùng thuộc giảng viên.
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-[9px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_25%,transparent)] bg-[var(--paper-raised)] p-3 text-xs leading-relaxed">
            {advice ? JSON.stringify(advice, null, 2) : ""}
          </pre>
        </DialogContent>
      </Dialog>

      {/* Gia hạn task */}
      <Dialog open={extension !== null} onOpenChange={(next) => !next && setExtension(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gia hạn task</DialogTitle>
            <DialogDescription>Kéo dài deadline cho một task của thành viên này.</DialogDescription>
          </DialogHeader>
          {extension && (
            <div className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                  ID task
                </span>
                <SketchInput
                  value={extension.taskId}
                  onChange={(e) => setExtension({ ...extension, taskId: e.target.value })}
                  placeholder="UUID của task"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                  Gia hạn đến *
                </span>
                <SketchInput
                  type="date"
                  value={extension.until}
                  onChange={(e) => setExtension({ ...extension, until: e.target.value })}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                  Lý do *
                </span>
                <SketchTextarea
                  rows={2}
                  value={extension.reason}
                  onChange={(e) => setExtension({ ...extension, reason: e.target.value })}
                  placeholder="Ví dụ: ốm bệnh có đơn xin phép"
                />
              </label>
            </div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <InkButton variant="outline" size="sm" onClick={() => setExtension(null)}>
              Hủy
            </InkButton>
            <InkButton
              variant="royal"
              size="sm"
              disabled={busy || !extension?.until || !extension.reason.trim() || !extension.taskId.trim()}
              onClick={saveExtension}
            >
              {busy ? "Đang lưu…" : "Gia hạn"}
            </InkButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* =====================================================================
 * TAB GITHUB — provision/invite/reconcile/webhook + activity
 * ===================================================================== */

function GithubTab({ sessionId }: { sessionId: string }) {
  const status = useApi(() => getSessionGithub(sessionId), [sessionId]);
  const activity = useApi(() => listSessionGithubActivity(sessionId), [sessionId]);
  const [busy, setBusy] = useState<string | null>(null);

  async function run(action: string, fn: () => Promise<Record<string, unknown>>, doneMsg: string) {
    setBusy(action);
    try {
      await fn();
      toast.success(doneMsg);
      status.reload();
      activity.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  const repo = status.data?.repository;

  return (
    <div className="space-y-4">
      <SketchCard className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <VGithub size={22} className="text-[var(--ink)]" />
          <div className="min-w-0 flex-1">
            {repo ? (
              <>
                <p className="font-extrabold">
                  {repo.owner}/{repo.name}
                </p>
                <p className="text-xs text-[var(--ink-soft)]">
                  Trạng thái: {repo.status}
                  {repo.webhookStatus ? ` · webhook: ${repo.webhookStatus}` : ""}
                  {repo.updatedAt ? ` · cập nhật ${formatDateTimeVN(repo.updatedAt)}` : ""}
                </p>
              </>
            ) : (
              <p className="font-bold">Chưa khởi tạo repository cho phiên</p>
            )}
          </div>
          {repo?.url && (
            <a
              href={repo.url}
              target="_blank"
              rel="noreferrer"
              className="focus-ink sketch-border-thin px-3 py-1.5 text-xs font-bold hover:bg-[var(--blue-mist)]"
            >
              Mở repo ↗
            </a>
          )}
        </div>
        <div className="flex flex-wrap gap-2 border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_15%,transparent)] pt-3">
          <InkButton
            variant="royal"
            size="sm"
            disabled={busy !== null}
            onClick={() => run("provision", () => provisionSessionGithub(sessionId), "Đã khởi tạo repo")}
          >
            {busy === "provision" ? "Đang tạo…" : "Khởi tạo repo"}
          </InkButton>
          <InkButton
            variant="outline"
            size="sm"
            disabled={busy !== null}
            onClick={() => run("invite", () => inviteAllSessionGithub(sessionId), "Đã gửi lời mời")}
          >
            {busy === "invite" ? "Đang mời…" : "Mời tất cả thành viên"}
          </InkButton>
          <InkButton
            variant="outline"
            size="sm"
            disabled={busy !== null}
            onClick={() => run("reconcile", () => reconcileSessionGithub(sessionId), "Đã đồng bộ quyền")}
          >
            {busy === "reconcile" ? "Đang đồng bộ…" : "Đồng bộ quyền"}
          </InkButton>
          <InkButton
            variant="outline"
            size="sm"
            disabled={busy !== null}
            onClick={() => run("webhook", () => configureSessionGithubWebhook(sessionId), "Đã cài webhook")}
          >
            {busy === "webhook" ? "Đang cài…" : "Cài webhook"}
          </InkButton>
        </div>
        {(status.data?.members.length ?? 0) > 0 && (
          <div className="border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_15%,transparent)] pt-3">
            <p className="eyebrow text-[0.62rem]">Thành viên GitHub ({status.data?.members.length ?? 0})</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(status.data?.members ?? []).map((m, idx) => {
                const login = rawText(m, ["login", "githubLogin", "username"], "chưa liên kết");
                const userId = rawText(m, ["userId", "id"], String(idx));
                const connected = rawText(m, ["connected", "status"], "") !== "false";
                return (
                  <span key={userId + idx} className="inline-flex items-center gap-1.5">
                    <InkBadge tone={connected ? "green" : "neutral"} className="px-2 py-0.5 text-[0.66rem]">
                      @{login}
                    </InkBadge>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() =>
                        run(`invite-${userId}`, () => inviteMemberSessionGithub(sessionId, userId), `Đã mời @${login}`)
                      }
                      className="focus-ink text-[0.66rem] font-bold text-[var(--royal)] underline underline-offset-2 disabled:opacity-50"
                    >
                      mời lại
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </SketchCard>

      <h2 className="text-sm font-extrabold uppercase tracking-wider text-[var(--ink-soft)]">
        Hoạt động GitHub
      </h2>
      {activity.loading ? (
        <PencilLines rows={3} />
      ) : activity.error ? (
        <SectionError message={activity.error} onRetry={activity.reload} />
      ) : (activity.data?.items.length ?? 0) === 0 ? (
        <EmptyState icon={VGithub} title="Chưa có hoạt động" note="Push, pull request và commit sẽ hiện ở đây." />
      ) : (
        <SketchCard hover={false} className="max-h-96 space-y-2 overflow-y-auto p-4">
          {(activity.data?.items ?? []).map((row, idx) => (
            <div key={idx} className="flex items-start gap-2.5 border-b border-dashed border-[color-mix(in_srgb,var(--ink)_12%,transparent)] pb-2 last:border-0">
              <VCheck size={15} className="mt-0.5 shrink-0 text-[var(--royal)]" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {rawText(row.raw, ["summary", "description", "action"], "Sự kiện GitHub")}
                </p>
                <p className="text-xs text-[var(--ink-soft)]">
                  {rawText(row.raw, ["actor", "login", "sender"], "—")}
                  {row.raw.createdAt ? ` · ${formatDateTimeVN(String(row.raw.createdAt))}` : ""}
                </p>
              </div>
            </div>
          ))}
        </SketchCard>
      )}
    </div>
  );
}

/* =====================================================================
 * TAB QUYỀN REPO — repository access jobs
 * ===================================================================== */

function RepoTab({ sessionId }: { sessionId: string }) {
  const jobs = useApi(() => listRepositoryAccessJobs(sessionId), [sessionId]);
  const [busy, setBusy] = useState(false);

  async function retry(jobId: string) {
    setBusy(true);
    try {
      await retryRepositoryAccessJob(sessionId, jobId, {
        expectedRevision: "1",
        reason: "Thử lại sau khi đã kết nối lại GitHub",
      });
      toast.success("Đã đưa job vào hàng chờ thử lại");
      jobs.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-extrabold uppercase tracking-wider text-[var(--ink-soft)]">
        Job cấp quyền repository ({jobs.data?.items.length ?? 0}/{jobs.data?.limit ?? 0} giới hạn)
      </h2>
      {jobs.loading ? (
        <PencilLines rows={3} />
      ) : jobs.error ? (
        <SectionError message={jobs.error} onRetry={jobs.reload} />
      ) : (jobs.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          icon={VGithub}
          title="Chưa có job nào"
          note="Job được sinh khi hệ thống mời thành viên vào repo — nếu lỗi, bấm thử lại."
        />
      ) : (
        <SketchCard hover={false} className="overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b-2 border-dashed border-[color-mix(in_srgb,var(--ink)_25%,transparent)] text-[0.7rem] uppercase tracking-wider text-[var(--ink-soft)]">
                <th className="px-4 py-2.5 font-bold">Người dùng</th>
                <th className="px-4 py-2.5 font-bold">Trạng thái</th>
                <th className="px-4 py-2.5 font-bold">Cập nhật</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {(jobs.data?.items ?? []).map((job, idx) => (
                <tr key={idx} className="border-b border-dashed border-[color-mix(in_srgb,var(--ink)_15%,transparent)]">
                  <td className="px-4 py-2.5 font-semibold">
                    {rawText(job.raw, ["displayName", "userLogin", "userName"], shortId(rawText(job.raw, ["userId"], "")))}
                  </td>
                  <td className="px-4 py-2.5">
                    <InkBadge
                      tone={rawText(job.raw, ["status"], "") === "failed" ? "red" : "blue"}
                      dot
                      className="px-2 py-0.5 text-[0.66rem]"
                    >
                      {rawText(job.raw, ["status"], "—")}
                    </InkBadge>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[var(--ink-soft)]">
                    {job.raw.updatedAt ? formatDateTimeVN(String(job.raw.updatedAt)) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <InkButton
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        const id = rawText(job.raw, ["id", "jobId"], "");
                        if (id) retry(id);
                      }}
                    >
                      Thử lại
                    </InkButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SketchCard>
      )}
    </div>
  );
}

/* =====================================================================
 * DIALOGS — tạo / sửa phiên
 * ===================================================================== */

function CreateSessionDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const created = await createSession({
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        startDate: new Date(startDate || Date.now()).toISOString(),
        endDate: new Date(endDate || Date.now() + 7 * 86_400_000).toISOString(),
      });
      toast.success(`Đã tạo phiên ${created.code}`);
      setCode("");
      setName("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      onClose();
      onCreated(created.id);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const valid = code.trim().length > 0 && name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo phiên thực tập mới</DialogTitle>
          <DialogDescription>
            Mã phiên theo dạng REGEX [A-Za-z0-9][A-Za-z0-9._-]* — ví dụ MINI-NOTES-V1-S3.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">Mã phiên *</span>
            <SketchInput value={code} onChange={(e) => setCode(e.target.value)} placeholder="MINI-NOTES-V1-S3" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">Tên phiên *</span>
            <SketchInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Phiên thực tập Spring 2027" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">Mô tả</span>
            <SketchTextarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">Bắt đầu</span>
              <SketchInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">Kết thúc</span>
              <SketchInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <InkButton variant="outline" size="sm" onClick={onClose}>
            Hủy
          </InkButton>
          <InkButton variant="royal" size="sm" disabled={busy || !valid} onClick={submit}>
            {busy ? "Đang tạo…" : "Tạo phiên"}
          </InkButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditSessionDialog({
  session,
  open,
  onClose,
  onSaved,
}: {
  session: SessionListItem;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(session.name);
  const [description, setDescription] = useState(session.description ?? "");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await updateSession(session.id, {
        name: name.trim() || undefined,
        description: description.trim() || undefined,
      });
      toast.success("Đã lưu thông tin phiên");
      onClose();
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sửa phiên {session.code}</DialogTitle>
          <DialogDescription>Cập nhật tên và mô tả của phiên.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">Tên phiên</span>
            <SketchInput value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">Mô tả</span>
            <SketchTextarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <InkButton variant="outline" size="sm" onClick={onClose}>
            Hủy
          </InkButton>
          <InkButton variant="royal" size="sm" disabled={busy} onClick={submit}>
            {busy ? "Đang lưu…" : "Lưu"}
          </InkButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
