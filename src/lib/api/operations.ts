"use client";
/* =====================================================================
 * OPERATIONS ADAPTER — điều phối phiên (staff):
 *   · sessions CRUD + overview + member/instructor options + timeline + work
 *   · members / instructors / milestones
 *   · participation (report, policy, refresh, extend, resolve, advice)
 *   · replacement (preview, status, approve)
 *   · repository-access jobs (list, retry)
 *   · github session ops (status, provision, invite, invite member,
 *     reconcile, webhook, activity)
 * Envelope BE thật:
 *   · GET /sessions, /sessions/overview, /sessions/{id}/timeline,
 *     /sessions/{id}/work          → { data, meta }
 *   · GET /sessions/{id}           → object phẳng giàu (overview, members…)
 *   · GET /sessions/{id}/members   → { members }
 *   · GET /sessions/{id}/instructors → { instructors }
 *   · GET /sessions/{id}/milestones → { milestones }
 *   · GET /sessions/{id}/participation → { items, summary, page, pageSize, policy }
 * Body validation đã probe:
 *   · policy  { expectedVersion≥0, reason 10..1000, warningFrom?, penaltyFrom?,
 *              replacementFrom?, penaltyPoints?, penaltyCap? }
 *   · extend  { expectedVersion≥0, until ISO, reason 10..1000 }
 *   · resolve { action: excused|reversed, expectedDeadlineVersion≥1, reason 10..1000 }
 *   · replacement-preview { adviceId UUID, candidateId UUID }
 *   · replacements/{id}/approve { expectedPreviewHash 64-hex, reason 10..1000 }
 *   · repo-jobs/{id}/retry { expectedRevision 64-hex, reason 10..1000 }
 * ===================================================================== */
import { request } from "./client";
import { array, nullable, number, parsePage, record, string } from "./parse";

/* ------------------------------- shapes --------------------------------- */

export type SessionOpStatus = "upcoming" | "active" | "ending" | "completed" | "cancelled";

export interface SessionListItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: SessionOpStatus;
  leadInstructorId: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SessionOverviewRow {
  id: string;
  code: string;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  projectName: string | null;
  projectCode: string | null;
  templateVersion: number | null;
  memberCount: number;
  sprintCount: number;
  taskTotal: number;
  taskDone: number;
  taskPercent: number;
  overdueTasks: number;
  pendingReview: number;
  sessionOverdue: boolean;
}

export interface SessionMemberRow {
  userId: string;
  displayName: string;
  email: string | null;
  role: string | null;
  assignmentStatus: string | null;
  joinedAt: string | null;
}

export interface SessionInstructorRow {
  instructorId: string;
  displayName: string;
  email: string | null;
  assignedAt: string | null;
}

export interface SessionMilestone {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: string;
  sortOrder: number;
}

export interface SessionTimelineItem {
  id: string;
  action: string;
  summary: string;
  createdAt: string | null;
  targetType: string | null;
  actorName: string | null;
}

export interface SessionWorkTask {
  id: string;
  code: string;
  title: string;
  status: string | null;
  priority: string | null;
  storyPoints: number | null;
  progress: number | null;
  dueDate: string | null;
  assigneeId: string | null;
  sprintName: string | null;
  submissionStatus: string | null;
  submissionId: string | null;
  instructorScore: number | null;
  blocked: boolean;
}

export interface SessionDetail extends SessionListItem {
  overview: SessionOverviewRow | null;
  members: SessionMemberRow[];
  milestones: SessionMilestone[];
}

export interface OptionUser {
  userId: string;
  displayName: string;
  email: string | null;
}

/** Phần tử tham gia — shape BE chưa công bố (QA rỗng) → giữ raw + best-effort. */
export interface ParticipationIncident {
  id: string | null;
  kind: string | null;
  status: string | null;
  raw: Record<string, unknown>;
}

export interface ParticipationEntry {
  userId: string | null;
  displayName: string | null;
  status: string | null;
  incidents: ParticipationIncident[];
  raw: Record<string, unknown>;
}

export interface ParticipationPolicy {
  version: number | null;
  warningFrom: number | null;
  penaltyFrom: number | null;
  replacementFrom: number | null;
  penaltyPoints: number | null;
  penaltyCap: number | null;
  configured: boolean;
}

export interface ParticipationReport {
  items: ParticipationEntry[];
  total: number;
  active: number;
  registeredPenalty: number;
  policy: ParticipationPolicy | null;
}

export interface RepositoryAccessJob {
  raw: Record<string, unknown>;
}

export interface GithubRepository {
  owner: string | null;
  name: string | null;
  url: string | null;
  status: string;
  errorCode: string | null;
  updatedAt: string | null;
  webhookStatus: string | null;
}

export interface GithubSessionStatus {
  repository: GithubRepository | null;
  members: Record<string, unknown>[];
  canManage: boolean;
}

export interface GithubActivityRow {
  raw: Record<string, unknown>;
}

/* ------------------------------ parsers --------------------------------- */

function parseListItem(value: unknown): SessionListItem {
  const v = record(value);
  return {
    id: string(v.id),
    code: string(v.code),
    name: string(v.name),
    description: nullable(v.description, string),
    status: (nullable(v.status, string) ?? "upcoming") as SessionOpStatus,
    leadInstructorId: nullable(v.leadInstructorId, string),
    startDate: nullable(v.startDate, string),
    endDate: nullable(v.endDate, string),
    createdAt: nullable(v.createdAt, string),
    updatedAt: nullable(v.updatedAt, string),
  };
}

function parseOverviewRow(value: unknown): SessionOverviewRow {
  const v = record(value);
  const project = v.project === null || v.project === undefined ? {} : record(v.project);
  const alerts = v.alerts === null || v.alerts === undefined ? {} : record(v.alerts);
  return {
    id: string(v.id),
    code: string(v.code),
    name: string(v.name),
    status: nullable(v.status, string) ?? "",
    startDate: nullable(v.startDate, string),
    endDate: nullable(v.endDate, string),
    projectName: nullable(project.name, string),
    projectCode: nullable(project.code, string),
    templateVersion: nullable(project.templateVersion, number),
    memberCount: nullable(v.memberCount, number) ?? 0,
    sprintCount: nullable(v.sprintCount, number) ?? 0,
    taskTotal: nullable(v.taskTotal, number) ?? 0,
    taskDone: nullable(v.taskDone, number) ?? 0,
    taskPercent: nullable(v.taskPercent, number) ?? 0,
    overdueTasks: nullable(alerts.overdueTasks, number) ?? 0,
    pendingReview: nullable(alerts.pendingReview, number) ?? 0,
    sessionOverdue: alerts.sessionOverdue === true,
  };
}

function parseMemberRow(value: unknown): SessionMemberRow {
  const v = record(value);
  return {
    userId: string(v.userId),
    displayName: nullable(v.displayName, string) ?? "",
    email: nullable(v.email, string),
    role: nullable(v.role, string),
    assignmentStatus: nullable(v.assignmentStatus, string),
    joinedAt: nullable(v.joinedAt, string),
  };
}

function parseInstructorRow(value: unknown): SessionInstructorRow {
  const v = record(value);
  return {
    instructorId: string(v.instructorId),
    displayName: nullable(v.displayName, string) ?? "",
    email: nullable(v.email, string),
    assignedAt: nullable(v.assignedAt, string),
  };
}

function parseMilestone(value: unknown): SessionMilestone {
  const v = record(value);
  return {
    id: nullable(v.id, string) ?? "",
    title: nullable(v.title, string) ?? "",
    description: nullable(v.description, string),
    dueDate: nullable(v.dueDate, string),
    status: nullable(v.status, string) ?? "pending",
    sortOrder: nullable(v.sortOrder, number) ?? 0,
  };
}

function parseTimelineItem(value: unknown): SessionTimelineItem {
  const v = record(value);
  return {
    id: string(v.id),
    action: nullable(v.action, string) ?? "",
    summary: nullable(v.summary, string) ?? "",
    createdAt: nullable(v.createdAt, string),
    targetType: nullable(v.targetType, string),
    actorName: nullable(v.actorName, string),
  };
}

function parseWorkTask(value: unknown): SessionWorkTask {
  const v = record(value);
  const sprint = v.sprint === null || v.sprint === undefined ? {} : record(v.sprint);
  const delivery = v.delivery === null || v.delivery === undefined ? {} : record(v.delivery);
  const submission =
    delivery.submission === null || delivery.submission === undefined
      ? {}
      : record(delivery.submission);
  return {
    id: string(v.id),
    code: nullable(v.code, string) ?? "",
    title: nullable(v.title, string) ?? "",
    status: nullable(v.status, string),
    priority: nullable(v.priority, string),
    storyPoints: nullable(v.storyPoints, number),
    progress: nullable(v.progress, number),
    dueDate: nullable(v.dueDate, string),
    assigneeId: nullable(v.assigneeId, string),
    sprintName: nullable(sprint.name, string),
    submissionStatus: nullable(submission.status, string),
    submissionId: nullable(submission.id, string),
    instructorScore: nullable(submission.instructorScore, number),
    blocked: delivery.blocked === true,
  };
}

function parseOptionUser(value: unknown): OptionUser {
  const v = record(value);
  return {
    userId: string(v.userId ?? v.id),
    displayName: nullable(v.displayName, string) ?? "",
    email: nullable(v.email, string),
  };
}

function parseIncident(value: unknown): ParticipationIncident {
  const v = record(value);
  return {
    id: nullable(v.id, string) ?? nullable(v.incidentId, string),
    kind: nullable(v.kind, string) ?? nullable(v.type, string),
    status: nullable(v.status, string),
    raw: v,
  };
}

function parseParticipationEntry(value: unknown): ParticipationEntry {
  const v = record(value);
  return {
    userId: nullable(v.userId, string) ?? nullable(v.internId, string),
    displayName:
      nullable(v.displayName, string) ?? nullable(v.internName, string) ?? nullable(v.name, string),
    status: nullable(v.status, string) ?? nullable(v.participationStatus, string),
    incidents: array(v.incidents ?? [], parseIncident),
    raw: v,
  };
}

function parsePolicy(value: unknown): ParticipationPolicy | null {
  if (value === null || value === undefined) return null;
  const v = record(value);
  return {
    version: nullable(v.version, number),
    warningFrom: nullable(v.warningFrom, number),
    penaltyFrom: nullable(v.penaltyFrom, number),
    replacementFrom: nullable(v.replacementFrom, number),
    penaltyPoints: nullable(v.penaltyPoints, number),
    penaltyCap: nullable(v.penaltyCap, number),
    configured: v.configured === true,
  };
}

/* ------------------------- session list / options ----------------------- */

export interface ListSessionsParams {
  q?: string;
  status?: string;
  projectId?: string;
  leadInstructorId?: string;
  page?: number;
  pageSize?: number;
}

export async function listOpSessions(params: ListSessionsParams = {}): Promise<{
  items: SessionListItem[];
  total: number;
  totalPages: number;
}> {
  const search = new URLSearchParams();
  search.set("page", String(params.page ?? 1));
  search.set("pageSize", String(params.pageSize ?? 50));
  if (params.q) search.set("q", params.q);
  if (params.status) search.set("status", params.status);
  if (params.projectId) search.set("projectId", params.projectId);
  if (params.leadInstructorId) search.set("leadInstructorId", params.leadInstructorId);
  const body = await request(`/sessions?${search.toString()}`, (v) => parsePage(v, parseListItem));
  return { items: body.items, total: body.total, totalPages: body.totalPages };
}

export async function listSessionOverviews(): Promise<SessionOverviewRow[]> {
  const body = await request("/sessions/overview?page=1&pageSize=50", (v) =>
    parsePage(v, parseOverviewRow),
  );
  return body.items;
}

export async function getSessionInstructorOptions(): Promise<OptionUser[]> {
  const body = await request("/sessions/instructor-options?page=1&pageSize=50", (v) =>
    parsePage(v, parseOptionUser),
  );
  return body.items;
}

export async function getSessionMemberOptions(): Promise<OptionUser[]> {
  const body = await request("/sessions/member-options?page=1&pageSize=100", (v) =>
    parsePage(v, parseOptionUser),
  );
  return body.items;
}

/* ---------------------------- session CRUD ------------------------------ */

export interface CreateSessionInput {
  code: string;
  name: string;
  description?: string;
  status?: SessionOpStatus;
  leadInstructorId?: string;
  startDate: string;
  endDate: string;
}

export async function createSession(input: CreateSessionInput): Promise<SessionListItem> {
  return request("/sessions", parseListItem, { method: "POST", body: input });
}

export type UpdateSessionInput = Partial<Omit<CreateSessionInput, "code">>;

export async function updateSession(id: string, input: UpdateSessionInput): Promise<SessionListItem> {
  return request(`/sessions/${encodeURIComponent(id)}`, parseListItem, {
    method: "PATCH",
    body: input,
  });
}

export async function getSessionDetail(id: string): Promise<SessionDetail> {
  return request(`/sessions/${encodeURIComponent(id)}`, (v) => {
    const base = parseListItem(v);
    const r = record(v);
    return {
      ...base,
      overview: r.overview === null || r.overview === undefined ? null : parseOverviewRow(r.overview),
      members: array(r.members ?? [], parseMemberRow),
      milestones: array(r.milestones ?? [], parseMilestone),
    };
  });
}

export async function listSessionTimeline(id: string): Promise<SessionTimelineItem[]> {
  const body = await request(
    `/sessions/${encodeURIComponent(id)}/timeline?page=1&pageSize=30`,
    (v) => parsePage(v, parseTimelineItem),
  );
  return body.items;
}

export async function listSessionWork(id: string): Promise<SessionWorkTask[]> {
  const body = await request(
    `/sessions/${encodeURIComponent(id)}/work?page=1&pageSize=50`,
    (v) => parsePage(v, parseWorkTask),
  );
  return body.items;
}

/* --------------------------- members & instructors ---------------------- */

export async function listSessionMembers(id: string): Promise<SessionMemberRow[]> {
  return request(`/sessions/${encodeURIComponent(id)}/members`, (v) => {
    const r = record(v);
    return array(r.members, parseMemberRow);
  });
}

export async function addSessionMembers(id: string, userIds: string[]): Promise<SessionMemberRow[]> {
  return request(`/sessions/${encodeURIComponent(id)}/members`, (v) => {
    const r = record(v);
    return array(r.members, parseMemberRow);
  }, { method: "POST", body: { userIds } });
}

export async function removeSessionMember(id: string, userId: string): Promise<unknown> {
  return request(
    `/sessions/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`,
    (v) => v,
    { method: "DELETE" },
  );
}

export async function listSessionInstructors(id: string): Promise<SessionInstructorRow[]> {
  return request(`/sessions/${encodeURIComponent(id)}/instructors`, (v) => {
    const r = record(v);
    return array(r.instructors, parseInstructorRow);
  });
}

export async function addSessionInstructors(
  id: string,
  instructorIds: string[],
): Promise<SessionInstructorRow[]> {
  return request(`/sessions/${encodeURIComponent(id)}/instructors`, (v) => {
    const r = record(v);
    return array(r.instructors, parseInstructorRow);
  }, { method: "POST", body: { instructorIds } });
}

export async function removeSessionInstructor(id: string, userId: string): Promise<unknown> {
  return request(
    `/sessions/${encodeURIComponent(id)}/instructors/${encodeURIComponent(userId)}`,
    (v) => v,
    { method: "DELETE" },
  );
}

/* ------------------------------ milestones ------------------------------ */

export async function listSessionMilestones(id: string): Promise<SessionMilestone[]> {
  return request(`/sessions/${encodeURIComponent(id)}/milestones`, (v) => {
    const r = record(v);
    return array(r.milestones, parseMilestone);
  });
}

export interface MilestoneInput {
  title: string;
  description?: string;
  dueDate?: string;
  status?: string;
  sortOrder?: number;
}

export async function createMilestone(id: string, input: MilestoneInput): Promise<SessionMilestone> {
  return request(`/sessions/${encodeURIComponent(id)}/milestones`, parseMilestone, {
    method: "POST",
    body: input,
  });
}

export async function updateMilestone(
  id: string,
  milestoneId: string,
  input: Partial<MilestoneInput>,
): Promise<SessionMilestone> {
  return request(
    `/sessions/${encodeURIComponent(id)}/milestones/${encodeURIComponent(milestoneId)}`,
    parseMilestone,
    { method: "PATCH", body: input },
  );
}

export async function deleteMilestone(id: string, milestoneId: string): Promise<unknown> {
  return request(
    `/sessions/${encodeURIComponent(id)}/milestones/${encodeURIComponent(milestoneId)}`,
    (v) => v,
    { method: "DELETE" },
  );
}

/* ----------------------------- participation ---------------------------- */

export async function getSessionParticipation(
  id: string,
  page = 1,
  pageSize = 50,
): Promise<ParticipationReport> {
  return request(
    `/sessions/${encodeURIComponent(id)}/participation?page=${page}&pageSize=${pageSize}`,
    (v) => {
      const r = record(v);
      const summary = r.summary === null || r.summary === undefined ? {} : record(r.summary);
      return {
        items: array(r.items ?? [], parseParticipationEntry),
        total: nullable(summary.total, number) ?? 0,
        active: nullable(summary.active, number) ?? 0,
        registeredPenalty: nullable(summary.registeredPenalty, number) ?? 0,
        policy: parsePolicy(r.policy),
      };
    },
  );
}

export interface PolicyInput {
  expectedVersion: number;
  reason: string;
  warningFrom?: number;
  penaltyFrom?: number;
  replacementFrom?: number;
  penaltyPoints?: number;
  penaltyCap?: number;
}

export async function saveParticipationPolicy(
  id: string,
  input: PolicyInput,
): Promise<Record<string, unknown>> {
  return request(`/sessions/${encodeURIComponent(id)}/participation/policy`, (v) => record(v), {
    method: "POST",
    body: input,
  });
}

export async function refreshParticipation(
  id: string,
): Promise<{ processed: number; batchLimit: number }> {
  return request(`/sessions/${encodeURIComponent(id)}/participation/refresh`, (v) => {
    const r = record(v);
    return {
      processed: nullable(r.processed, number) ?? 0,
      batchLimit: nullable(r.batchLimit, number) ?? 0,
    };
  }, { method: "POST", body: {} });
}

export async function extendParticipationTask(
  id: string,
  taskId: string,
  input: { expectedVersion: number; until: string; reason: string },
): Promise<Record<string, unknown>> {
  return request(
    `/sessions/${encodeURIComponent(id)}/participation/tasks/${encodeURIComponent(taskId)}/extend`,
    (v) => record(v),
    { method: "POST", body: input },
  );
}

export async function resolveIncident(
  id: string,
  incidentId: string,
  input: { action: "excused" | "reversed"; expectedDeadlineVersion: number; reason: string },
): Promise<Record<string, unknown>> {
  return request(
    `/sessions/${encodeURIComponent(id)}/participation/incidents/${encodeURIComponent(incidentId)}/resolve`,
    (v) => record(v),
    { method: "POST", body: input },
  );
}

/** Xin lời khuyên "thay người" từ AI cho một sự cố (tốn quota AI). */
export async function requestReplacementAdvice(
  id: string,
  incidentId: string,
): Promise<Record<string, unknown>> {
  return request(
    `/sessions/${encodeURIComponent(id)}/participation/incidents/${encodeURIComponent(incidentId)}/replacement-advice`,
    (v) => record(v),
    { method: "POST", body: {} },
  );
}

/* ------------------------------ replacement ----------------------------- */

export async function previewReplacement(
  id: string,
  incidentId: string,
  input: { adviceId: string; candidateId: string },
): Promise<Record<string, unknown>> {
  return request(
    `/sessions/${encodeURIComponent(id)}/participation/incidents/${encodeURIComponent(incidentId)}/replacement-preview`,
    (v) => record(v),
    { method: "POST", body: input },
  );
}

export async function getReplacement(
  id: string,
  commandId: string,
): Promise<Record<string, unknown>> {
  return request(
    `/sessions/${encodeURIComponent(id)}/participation/replacements/${encodeURIComponent(commandId)}`,
    (v) => record(v),
  );
}

export async function approveReplacement(
  id: string,
  commandId: string,
  input: { expectedPreviewHash: string; reason: string },
): Promise<Record<string, unknown>> {
  return request(
    `/sessions/${encodeURIComponent(id)}/participation/replacements/${encodeURIComponent(commandId)}/approve`,
    (v) => record(v),
    { method: "POST", body: input },
  );
}

/* --------------------------- repository access -------------------------- */

export async function listRepositoryAccessJobs(
  id: string,
): Promise<{ items: RepositoryAccessJob[]; limit: number }> {
  return request(
    `/sessions/${encodeURIComponent(id)}/participation/repository-access-jobs`,
    (v) => {
      const r = record(v);
      return {
        items: array(r.items ?? [], (raw) => ({ raw: record(raw) })),
        limit: nullable(r.limit, number) ?? 0,
      };
    },
  );
}

export async function retryRepositoryAccessJob(
  id: string,
  jobId: string,
  input: { expectedRevision: string; reason: string },
): Promise<Record<string, unknown>> {
  return request(
    `/sessions/${encodeURIComponent(id)}/participation/repository-access-jobs/${encodeURIComponent(jobId)}/retry`,
    (v) => record(v),
    { method: "POST", body: input },
  );
}

/* ------------------------------ github ops ------------------------------ */

export async function getSessionGithub(id: string): Promise<GithubSessionStatus> {
  return request(`/sessions/${encodeURIComponent(id)}/github`, (v) => {
    const r = record(v);
    const repoRaw = r.repository === null || r.repository === undefined ? null : record(r.repository);
    return {
      repository: repoRaw
        ? {
            owner: nullable(repoRaw.owner, string),
            name: nullable(repoRaw.name, string),
            url: nullable(repoRaw.url, string),
            status: nullable(repoRaw.status, string) ?? "",
            errorCode: nullable(repoRaw.errorCode, string),
            updatedAt: nullable(repoRaw.updatedAt, string),
            webhookStatus: nullable(repoRaw.webhookStatus, string),
          }
        : null,
      members: array(r.members ?? [], (raw) => record(raw)),
      canManage: r.canManage === true,
    };
  });
}

export async function provisionSessionGithub(id: string): Promise<Record<string, unknown>> {
  return request(`/sessions/${encodeURIComponent(id)}/github/provision`, (v) => record(v), {
    method: "POST",
    body: {},
  });
}

export async function inviteAllSessionGithub(id: string): Promise<Record<string, unknown>> {
  return request(`/sessions/${encodeURIComponent(id)}/github/invite`, (v) => record(v), {
    method: "POST",
    body: {},
  });
}

export async function inviteMemberSessionGithub(
  id: string,
  userId: string,
): Promise<Record<string, unknown>> {
  return request(
    `/sessions/${encodeURIComponent(id)}/github/members/${encodeURIComponent(userId)}/invite`,
    (v) => record(v),
    { method: "POST", body: {} },
  );
}

export async function reconcileSessionGithub(id: string): Promise<Record<string, unknown>> {
  return request(`/sessions/${encodeURIComponent(id)}/github/reconcile`, (v) => record(v), {
    method: "POST",
    body: {},
  });
}

export async function configureSessionGithubWebhook(id: string): Promise<Record<string, unknown>> {
  return request(`/sessions/${encodeURIComponent(id)}/github/webhook`, (v) => record(v), {
    method: "POST",
    body: {},
  });
}

export async function listSessionGithubActivity(
  id: string,
): Promise<{ items: GithubActivityRow[]; total: number }> {
  return request(
    `/sessions/${encodeURIComponent(id)}/github/activity?page=1&pageSize=30`,
    (v) => {
      const r = record(v);
      return {
        items: array(r.items ?? [], (raw) => ({ raw: record(raw) })),
        total: nullable(r.total, number) ?? 0,
      };
    },
  );
}
