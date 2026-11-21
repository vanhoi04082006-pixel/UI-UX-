import { NextRequest, NextResponse } from "next/server";
import type {
  SessionStatus,
  SprintStatus,
  TaskStatus,
  Priority,
} from "@/lib/mock/types";
import {
  ACCOUNTS,
  ADMIN_ACTIVITY,
  ADMIN_QUESTIONS,
  ADMIN_STATS,
  ADMIN_TEMPLATES,
  ADMIN_USERS,
  INSTRUCTOR_GRADING,
  INSTRUCTOR_REPORTS,
  INSTRUCTOR_SESSIONS,
  INSTRUCTOR_SPRINTS,
  INSTRUCTOR_SPRINT_BOARD,
  certificatesForIntern,
  completeAssignment,
  createBoardTask,
  createSprint,
  evaluationsForIntern,
  kpiForIntern,
  markNotificationsRead,
  markNotificationsUnread,
  mentorForIntern,
  notificationsFor,
  overviewForIntern,
  pushNotification,
  salaryForIntern,
  sessionTransitions,
  sprintTransitions,
  tasksForIntern,
  transitionSession,
  transitionSprint,
  updateSprint,
} from "@/lib/mock/data";

/* =====================================================================
 * MOCK REST SERVER — giả lập contract BE NestJS thật của V-Intern
 * (envelope phân trang {data, meta}, lỗi {message, code}, Bearer token,
 * guard theo role). SWAP: xóa thư mục src/app/api/v1 + đặt
 * NEXT_PUBLIC_API_BASE_URL là BE thật — app chạy thật, không sửa màn hình.
 * ===================================================================== */

export const dynamic = "force-dynamic";

/* ------------------------------- envelope ------------------------------ */

function page<T>(data: T[], pageArg: number, pageSizeArg: number) {
  const page_ = Math.max(1, pageArg);
  const pageSize = Math.min(100, Math.max(1, pageSizeArg));
  const start = (page_ - 1) * pageSize;
  const items = data.slice(start, start + pageSize);
  return NextResponse.json({
    data: items,
    meta: {
      total: data.length,
      page: page_,
      pageSize,
      totalPages: Math.max(1, Math.ceil(data.length / pageSize)),
    },
  });
}
function fail(status: number, code: string, message: string) {
  return NextResponse.json({ message, code }, { status });
}
function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/* ------------------------------ token store ---------------------------- */

/** token → email; mô phỏng phiên Bearer của BE (không hết hạn trong preview). */
const tokenEmails = new Map<string, string>();

function accountByEmail(email: string) {
  return ACCOUNTS.find((a) => a.email.toLowerCase() === email.toLowerCase());
}
function sessionUserFrom(account: (typeof ACCOUNTS)[number]) {
  return {
    id: account.id,
    email: account.email,
    fullName: account.name,
    role: account.role,
    title: account.title,
    internState: account.internState ?? null,
    mustChangePassword: account.mustChangePassword === true,
  };
}
/** Principal phẳng theo contract BE thật: {id, email, displayName, status, roles[], permissions[]}. */
function principalFrom(account: (typeof ACCOUNTS)[number]) {
  return {
    id: account.id,
    email: account.email,
    displayName: account.name,
    status: account.status === "locked" ? "locked" : "active",
    roles: [account.role],
    permissions: PERMISSIONS_BY_ROLE[account.role] ?? [],
  };
}
function roleOf(account: { role: string }) {
  return account.role;
}
function requireAuth(req: NextRequest) {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token || !tokenEmails.has(token))
    return { account: null as null | undefined, error: fail(401, "UNAUTHORIZED", "Phiên đăng nhập không hợp lệ.") };
  const email = tokenEmails.get(token)!;
  const account = accountByEmail(email);
  if (!account)
    return { account: null as null | undefined, error: fail(401, "UNAUTHORIZED", "Phiên đăng nhập không hợp lệ.") };
  return { account, error: null };
}
function requireRole(req: NextRequest, roles: string[]) {
  const { account, error } = requireAuth(req);
  if (error) return { account: null, error };
  if (!roles.includes(roleOf(account!)))
    return {
      account: null,
      error: fail(403, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này."),
    };
  return { account, error: null };
}

const PERMISSIONS_BY_ROLE: Record<string, string[]> = {
  intern: ["intern.workspace.view", "kpi.view.own", "certificates.view.own", "evaluations.view.own", "ai.mentor.use"],
  instructor: [
    "sessions.view", "sessions.manage", "projects.view", "tasks.view", "sprints.view", "sprints.manage",
    "evaluations.manage", "assignments.manage", "reports.read",
  ],
  admin: [
    "users.read", "users.manage", "roles.read", "groups.read", "groups.manage", "catalogs.read",
    "recruitment.manage", "knowledge.read", "audit.read", "settings.read", "evaluations.manage",
    "certificates.manage", "communications.manage", "sprints.manage",
  ],
};

/* ------------------------------ route table ---------------------------- */

type Handler = (
  req: NextRequest,
  segments: string[],
) => Promise<NextResponse> | NextResponse;

const ROUTES: Record<string, Handler> = {
  /* ============ AUTH (public) ============ */
  "POST /auth/login": async (req) => {
    const body = await readBody(req);
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password)
      return fail(400, "VALIDATION_FAILED", "Vui lòng nhập email và mật khẩu.");
    const account = accountByEmail(email);
    if (!account || account.password !== password)
      return fail(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.");
    if (account.status === "locked")
      return fail(403, "ACCOUNT_LOCKED", "Tài khoản đã bị khóa vì vi phạm quy định nộp bài.");
    const token = `mock-token-${account.id}-${Date.now()}`;
    tokenEmails.set(token, account.email);
    /* Mirror contract BE thật: login trả kèm principal đầy đủ. */
    return ok({ accessToken: token, expiresIn: 3600, user: principalFrom(account) });
  },
  "POST /auth/register": async (req) => {
    const body = await readBody(req);
    /* Mirror BE thật: RegisterDto {fullName, email, password, acceptedTerms}. */
    const name = typeof body.fullName === "string" ? body.fullName.trim() : typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const acceptedTerms = body.acceptedTerms === true;
    if (!name || !email || password.length < 8 || !acceptedTerms)
      return fail(400, "VALIDATION_FAILED", "Vui lòng điền đủ họ tên, email, mật khẩu tối thiểu 8 ký tự và đồng ý điều khoản.");
    if (!/^\S+@\S+\.\S+$/.test(email))
      return fail(400, "VALIDATION_FAILED", "Email chưa hợp lệ.");
    if (accountByEmail(email))
      return fail(409, "EMAIL_TAKEN", "Email này đã có tài khoản — thử đăng nhập nhé.");
    return ok(
      {
        message: `Chào ${name.split(" ").at(-1)}! Tài khoản sinh viên đã được tạo. Đăng nhập để bắt đầu hành trình.`,
      },
      201,
    );
  },
  "GET /auth/me": (req) => {
    const { account, error } = requireAuth(req);
    if (error) return error;
    /* Mirror contract BE thật: principal phẳng (displayName + roles[]). */
    return ok(principalFrom(account!));
  },
  "POST /auth/logout": () => new NextResponse(null, { status: 204 }),
  "POST /auth/change-password": async (req) => {
    const body = await readBody(req);
    const { account, error } = requireAuth(req);
    if (error) return error;
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    if (account!.password !== currentPassword)
      return fail(401, "INVALID_CREDENTIALS", "Mật khẩu hiện tại không đúng.");
    if (newPassword.length < 12)
      return fail(400, "VALIDATION_FAILED", "Mật khẩu mới cần tối thiểu 12 ký tự.");
    account!.password = newPassword;
    account!.mustChangePassword = false;
    return ok({ user: sessionUserFrom(account!) });
  },
  /* Preview-only: landing demo cards — không tồn tại ở BE thật. */
  "GET /auth/demo-accounts": () =>
    ok(
      ACCOUNTS.map(({ password, ...rest }) => ({
        ...rest,
        mustChangePassword: rest.mustChangePassword === true,
      })),
    ),

  /* ============ INTERN ============ */
  "GET /intern/me/project": (req) => {
    const { account, error } = requireRole(req, ["intern"]);
    if (error) return error;
    const overview = overviewForIntern(account!.email);
    if (!overview.placement)
      return fail(404, "NO_PLACEMENT", "Bạn chưa được phân vào phiên thực tập nào.");
    return ok({
      id: "preview-project",
      code: overview.placement.projectCode,
      name: overview.placement.project,
      status: "active",
      session: overview.placement.session,
      sprint: overview.placement.sprint,
      sprintStatus: overview.placement.sprintStatus,
      progressPct: overview.placement.progressPct,
      weekLabel: overview.placement.weekLabel,
    });
  },
  "GET /tasks": (req) => {
    const { account, error } = requireAuth(req);
    if (error) return error;
    const url = new URL(req.url);
    const scope = url.searchParams.get("scope");
    const items: unknown[] = [];
    if (scope === "mine" || account!.role === "intern") {
      for (const t of tasksForIntern(account!.email)) {
        items.push({
          ...t,
          storyPoints: t.points,
          projectId: "preview-project",
          sprintId: t.sprint,
          version: 1 + t.history.length,
          assigneeId: account!.id,
        });
      }
    } else {
      for (const column of INSTRUCTOR_SPRINT_BOARD.columns) {
        for (const t of column.tasks) {
          items.push({
            ...t,
            description: null,
            acceptance: [],
            history: [],
            storyPoints: t.points,
            projectId: "preview-project",
            sprintId: INSTRUCTOR_SPRINT_BOARD.name,
            version: 1,
          });
        }
      }
    }
    return page(items, numberParam(req, "page"), numberParam(req, "pageSize", 50));
  },
  "PATCH /tasks/*/my": async (req, segments) => {
    const { account, error } = requireRole(req, ["intern"]);
    if (error) return error;
    const id = segments[1];
    const body = await readBody(req);
    const tasks = tasksForIntern(account!.email);
    const task = tasks.find((t) => t.id === id);
    if (!task) return fail(404, "NOT_FOUND", "Không tìm thấy nhiệm vụ.");
    if (task.status !== "todo" && task.status !== "doing")
      return fail(
        409,
        "TASK_STATUS_INVALID",
        "Nhiệm vụ chỉ đi theo luồng Chờ làm → Đang làm → Chờ duyệt.",
      );
    const status = (typeof body.status === "string" ? body.status : "doing") as TaskStatus;
    if (status !== "doing" && status !== "review")
      return fail(409, "TASK_STATUS_INVALID", "Nhiệm vụ chỉ đi theo luồng Chờ làm → Đang làm → Chờ duyệt.");
    const progress = typeof body.progress === "number" ? body.progress : task.progress;
    task.status = status;
    task.progress = Math.max(0, Math.min(100, progress));
    task.history.push({ at: new Date().toISOString(), label: `Chuyển sang ${status === "doing" ? "Đang làm" : "Chờ duyệt"}` });
    return ok({ ...task, storyPoints: task.points, projectId: "preview-project", sprintId: task.sprint, version: 1 + task.history.length, assigneeId: account!.id });
  },
  "GET /intern/me/evaluations": (req) => {
    const { account, error } = requireRole(req, ["intern"]);
    if (error) return error;
    return page(evaluationsForIntern(account!.email), numberParam(req, "page"), numberParam(req, "pageSize", 20));
  },
  "GET /intern/me/kpi": (req) => {
    const { account, error } = requireRole(req, ["intern"]);
    if (error) return error;
    return page(kpiForIntern(account!.email), numberParam(req, "page"), numberParam(req, "pageSize", 12));
  },
  "GET /intern/me/virtual-salary": (req) => {
    const { account, error } = requireRole(req, ["intern"]);
    if (error) return error;
    const entries = salaryForIntern(account!.email);
    const balance = entries.reduce((sum, e) => sum + e.amount, 0);
    return ok({ balance, currency: "VXC", entryCount: entries.length });
  },
  "GET /intern/me/virtual-salary/ledger": (req) => {
    const { account, error } = requireRole(req, ["intern"]);
    if (error) return error;
    return page(salaryForIntern(account!.email), numberParam(req, "page"), numberParam(req, "pageSize", 20));
  },
  "GET /intern/me/certificates": (req) => {
    const { account, error } = requireRole(req, ["intern"]);
    if (error) return error;
    return page(certificatesForIntern(account!.email), numberParam(req, "page"), numberParam(req, "pageSize", 20));
  },

  /* ============ NOTIFICATIONS (mọi role) ============ */
  "GET /notifications": (req) => {
    const { account, error } = requireAuth(req);
    if (error) return error;
    const unread = new URL(req.url).searchParams.get("unread") === "true";
    const items = notificationsFor(account!.role).filter((n) => (unread ? !n.read : true));
    return page(items, numberParam(req, "page"), numberParam(req, "pageSize", 20));
  },
  "POST /notifications/read": async (req) => {
    const { account, error } = requireAuth(req);
    if (error) return error;
    const body = await readBody(req);
    const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === "string") : undefined;
    const updated = markNotificationsRead(account!.role, ids, body.all === true);
    return ok({ updated });
  },
  "POST /notifications/unread": async (req) => {
    const { account, error } = requireAuth(req);
    if (error) return error;
    const body = await readBody(req);
    const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === "string") : [];
    if (ids.length === 0)
      return fail(400, "VALIDATION_FAILED", "Cần truyền danh sách ids thông báo cần bỏ đọc.");
    const updated = markNotificationsUnread(account!.role, ids);
    return ok({ updated });
  },

  /* ============ AI MENTOR (intern) ============ */
  "GET /intern/me/ai-mentor/conversations": (req) => {
    const { account, error } = requireRole(req, ["intern"]);
    if (error) return error;
    const conversations = mentorForIntern(account!.email);
    /* Mirror BE thật: envelope {items, total, page, pageSize} + status field. */
    const items = conversations.map((c) => ({
      id: c.id,
      title: c.title,
      status: c.archived ? "archived" : "active",
      createdAt: c.messages[0]?.at ?? new Date().toISOString(),
      updatedAt: c.messages.at(-1)?.at ?? new Date().toISOString(),
      lastMessageAt: c.messages.at(-1)?.at ?? null,
    }));
    const page_ = numberParam(req, "page");
    const pageSize = numberParam(req, "pageSize", 20);
    const start = (page_ - 1) * pageSize;
    return ok({
      items: items.slice(start, start + pageSize),
      total: items.length,
      page: page_,
      pageSize,
    });
  },
  "GET /intern/me/ai-mentor/conversations/*": (req, segments) => {
    const { account, error } = requireRole(req, ["intern"]);
    if (error) return error;
    const conversation = mentorForIntern(account!.email).find((c) => c.id === segments[4]);
    if (!conversation) return fail(404, "NOT_FOUND", "Không tìm thấy hội thoại.");
    /* Mirror BE thật: {conversation, messages[] (role/content)}. */
    return ok({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        status: conversation.archived ? "archived" : "active",
        createdAt: conversation.messages[0]?.at ?? new Date().toISOString(),
        updatedAt: conversation.messages.at(-1)?.at ?? new Date().toISOString(),
        lastMessageAt: conversation.messages.at(-1)?.at ?? null,
      },
      messages: conversation.messages.map((m) => ({
        id: m.id,
        role: m.from === "me" ? "user" : "assistant",
        content: m.text,
        aiRunId: m.from === "ai" ? `run-${m.id}` : null,
        createdAt: m.at,
      })),
    });
  },
  "POST /intern/me/ai-mentor/conversations/*/messages": async (req, segments) => {
    const { account, error } = requireRole(req, ["intern"]);
    if (error) return error;
    const conversation = mentorForIntern(account!.email).find((c) => c.id === segments[4]);
    if (!conversation) return fail(404, "NOT_FOUND", "Không tìm thấy hội thoại.");
    const body = await readBody(req);
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) return fail(400, "VALIDATION_FAILED", "Nhập câu hỏi cho AI Mentor.");
    const now = new Date().toISOString();
    conversation.messages.push({ id: `m-${now}`, from: "me", text: content, at: now });
    const reply = mentorReply(content, conversation.title);
    const aiAt = new Date(Date.now() + 600).toISOString();
    conversation.messages.push({ id: `m-${now}-ai`, from: "ai", text: reply, at: aiAt });
    /* Mirror BE thật: {conversation, userMessage, assistantMessage, summary, followUps}. */
    return ok({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        status: conversation.archived ? "archived" : "active",
        createdAt: conversation.messages[0]?.at ?? now,
        updatedAt: aiAt,
        lastMessageAt: aiAt,
      },
      userMessage: { id: `m-${now}`, role: "user", content, aiRunId: null, createdAt: now },
      assistantMessage: { id: `m-${now}-ai`, role: "assistant", content: reply, aiRunId: `run-${now}`, createdAt: aiAt },
      summary: reply.slice(0, 120),
      followUps: [],
    });
  },
  "POST /intern/me/ai-mentor/conversations/*/archive": (req, segments) => {
    const { account, error } = requireRole(req, ["intern"]);
    if (error) return error;
    const conversation = mentorForIntern(account!.email).find((c) => c.id === segments[4]);
    if (!conversation) return fail(404, "NOT_FOUND", "Không tìm thấy hội thoại.");
    conversation.archived = true;
    return ok({ archived: true, id: conversation.id });
  },
  "POST /intern/me/ai-mentor/conversations": async (req) => {
    const { account, error } = requireRole(req, ["intern"]);
    if (error) return error;
    const body = await readBody(req);
    const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "Hội thoại mới";
    const conversations = mentorForIntern(account!.email);
    const now = new Date().toISOString();
    const conversation = {
      id: `c-${Date.now()}`,
      title,
      archived: false,
      messages: [
        {
          id: "m0",
          from: "ai" as const,
          text: `Chào bạn! Mình là AI Mentor của phiên "${title}". Bạn muốn ôn phần nào hôm nay?`,
          at: now,
        },
      ],
    };
    conversations.push(conversation);
    /* Mirror BE thật: trả về conversation object phẳng {id, title, status, ...}. */
    return ok(
      {
        id: conversation.id,
        title,
        status: "active",
        createdAt: now,
        updatedAt: now,
        lastMessageAt: now,
      },
      201,
    );
  },

  /* ============ INSTRUCTOR ============ */
  "GET /dashboard/instructor": (req) => {
    const { account, error } = requireRole(req, ["instructor"]);
    if (error) return error;
    const active = INSTRUCTOR_SESSIONS.filter((s) => s.status === "active");
    const pending = INSTRUCTOR_GRADING.filter((g) => g.status === "pending");
    const avg = INSTRUCTOR_GRADING.filter((g) => g.finalScore != null);
    return ok({
      metrics: {
        activeSessions: active.length,
        pendingReviews: pending.length,
        students: INSTRUCTOR_SESSIONS.reduce((sum, s) => sum + s.members, 0),
        avgFinalScore:
          avg.length === 0 ? null : Math.round((avg.reduce((sum, g) => sum + (g.finalScore ?? 0), 0) / avg.length) * 10) / 10,
      },
      activeSessions: active.slice(0, 4),
      pendingQueue: pending.slice(0, 5),
    });
  },
  "GET /sessions": (req) => {
    const { error } = requireRole(req, ["instructor", "admin"]);
    if (error) return error;
    return page(INSTRUCTOR_SESSIONS, numberParam(req, "page"), numberParam(req, "pageSize", 20));
  },
  "GET /sessions/*": (req, segments) => {
    const { error } = requireRole(req, ["instructor", "admin"]);
    if (error) return error;
    const session = INSTRUCTOR_SESSIONS.find((s) => s.id === segments[1]);
    if (!session) return fail(404, "NOT_FOUND", "Không tìm thấy phiên.");
    return ok(session);
  },
  "POST /sessions/*/status": async (req, segments) => {
    const { account, error } = requireRole(req, ["instructor"]);
    if (error) return error;
    const body = await readBody(req);
    const status = typeof body.status === "string" ? (body.status as SessionStatus) : undefined;
    if (!status) return fail(400, "VALIDATION_FAILED", "Thiếu trạng thái đích.");
    try {
      const { session } = transitionSession(segments[1], status);
      pushNotification("admin", {
        category: "Phiên thực tập",
        title: `Phiên ${session.code} chuyển trạng thái`,
        body: `Giảng viên ${account!.name} vừa chuyển phiên ${session.code} sang ${status}.`,
      });
      return ok(session);
    } catch (message) {
      return fail(409, "SESSION_STATUS_INVALID", (message as Error).message);
    }
  },
  "GET /sprints": (req) => {
    const { error } = requireRole(req, ["instructor", "admin"]);
    if (error) return error;
    const sessionId = new URL(req.url).searchParams.get("sessionId");
    const items = sessionId ? INSTRUCTOR_SPRINTS.filter((s) => s.sessionId === sessionId) : INSTRUCTOR_SPRINTS;
    return page(items, numberParam(req, "page"), numberParam(req, "pageSize", 50));
  },
  "POST /sprints": async (req) => {
    const { account, error } = requireRole(req, ["instructor"]);
    if (error) return error;
    const body = await readBody(req);
    if (typeof body.sessionId !== "string" || typeof body.name !== "string")
      return fail(400, "VALIDATION_FAILED", "Thiếu phiên hoặc tên sprint.");
    try {
      const { sprint } = createSprint({
        sessionId: body.sessionId,
        name: body.name,
        goal: typeof body.goal === "string" ? body.goal : "",
        startsAt: typeof body.startDate === "string" ? body.startDate : "",
        endsAt: typeof body.endDate === "string" ? body.endDate : "",
      });
      pushNotification("admin", {
        category: "Phiên thực tập",
        title: `Sprint "${sprint.name}" được tạo`,
        body: `Giảng viên ${account!.name} tạo sprint mới cho phiên ${sprint.sessionId}.`,
      });
      return ok(sprint, 201);
    } catch (message) {
      return fail(409, "SPRINT_ACTIVE_EXISTS", (message as Error).message);
    }
  },
  "PATCH /sprints/*": async (req, segments) => {
    const { error } = requireRole(req, ["instructor"]);
    if (error) return error;
    const body = await readBody(req);
    try {
      return ok(
        updateSprint(segments[1], {
          name: typeof body.name === "string" ? body.name : undefined,
          goal: typeof body.goal === "string" ? body.goal : undefined,
          startsAt: typeof body.startDate === "string" ? body.startDate : undefined,
          endsAt: typeof body.endDate === "string" ? body.endDate : undefined,
        }).sprint,
      );
    } catch (message) {
      return fail(409, "SPRINT_NOT_EDITABLE", (message as Error).message);
    }
  },
  "POST /sprints/*/status": async (req, segments) => {
    const { account, error } = requireRole(req, ["instructor"]);
    if (error) return error;
    const body = await readBody(req);
    const status = typeof body.status === "string" ? (body.status as SprintStatus) : undefined;
    if (!status) return fail(400, "VALIDATION_FAILED", "Thiếu trạng thái đích.");
    try {
      const { sprint } = transitionSprint(segments[1], status);
      pushNotification("intern", {
        category: "Nhiệm vụ",
        title: `Sprint "${sprint.name}" ${status}`,
        body: `Giảng viên ${account!.name} chuyển sprint "${sprint.name}" sang trạng thái mới.`,
      });
      return ok(sprint);
    } catch (message) {
      return fail(409, "SPRINT_HAS_OPEN_TASKS", (message as Error).message);
    }
  },
  "GET /sprints/*/board": (req, segments) => {
    const { error } = requireRole(req, ["instructor", "admin", "intern"]);
    if (error) return error;
    /* Alias "preview-sprint" — sprint hiện tại của preview (adapter mặc định). */
    if (segments[1] === "preview-sprint" || segments[1] === INSTRUCTOR_SPRINT_BOARD.id)
      return ok(INSTRUCTOR_SPRINT_BOARD);
    const sprint = INSTRUCTOR_SPRINTS.find((s) => s.id === segments[1]);
    if (!sprint) return fail(404, "NOT_FOUND", "Không tìm thấy sprint.");
    return ok({ ...INSTRUCTOR_SPRINT_BOARD, id: sprint.id, name: sprint.name, goal: sprint.goal, status: sprint.status });
  },
  "POST /tasks": async (req) => {
    const { account, error } = requireRole(req, ["instructor"]);
    if (error) return error;
    const body = await readBody(req);
    if (typeof body.title !== "string" || !body.title.trim())
      return fail(400, "VALIDATION_FAILED", "Nhiệm vụ cần tiêu đề.");
    try {
      const { task } = createBoardTask({
        sprintId:
          typeof body.sprintId === "string" && body.sprintId
            ? body.sprintId
            : INSTRUCTOR_SPRINT_BOARD.id,
        title: body.title,
        assignee: typeof body.assignee === "string" ? body.assignee : "",
        priority: (typeof body.priority === "string" ? body.priority : "medium") as Priority,
        points: typeof body.points === "number" ? body.points : 3,
      });
      pushNotification("intern", {
        category: "Nhiệm vụ",
        title: `Nhiệm vụ mới: ${task.title}`,
        body: `Giảng viên ${account!.name} giao nhiệm vụ ${task.code} cho bạn.`,
      });
      return ok(task, 201);
    } catch (message) {
      return fail(409, "SPRINT_NOT_EDITABLE", (message as Error).message);
    }
  },
  "GET /submissions": (req) => {
    const { error } = requireRole(req, ["instructor"]);
    if (error) return error;
    const status = new URL(req.url).searchParams.get("status");
    const items = status ? INSTRUCTOR_GRADING.filter((g) => g.status === status) : INSTRUCTOR_GRADING;
    return page(items, numberParam(req, "page"), numberParam(req, "pageSize", 20));
  },
  "POST /submissions/*/review": async (req, segments) => {
    const { account, error } = requireRole(req, ["instructor"]);
    if (error) return error;
    const item = INSTRUCTOR_GRADING.find((g) => g.id === segments[1]);
    if (!item) return fail(404, "NOT_FOUND", "Không tìm thấy bài nộp.");
    if (item.status !== "pending")
      return fail(409, "SUBMISSION_PENDING_REVIEW", "Bài nộp đã được duyệt trước đó.");
    const body = await readBody(req);
    const decision = body.decision === "changes" ? "changes" : "approved";
    const finalScore = typeof body.finalScore === "number" ? body.finalScore : item.aiScore;
    const notes = typeof body.notes === "string" ? body.notes : item.notes;
    item.status = decision;
    item.finalScore = finalScore;
    item.notes = notes;
    pushNotification("intern", {
      category: "Đánh giá",
      title: decision === "approved" ? `Bài ${item.taskCode} được duyệt` : `Bài ${item.taskCode} cần chỉnh sửa`,
      body:
        decision === "approved"
          ? `Giảng viên ${account!.name} duyệt bài với điểm ${finalScore}.`
          : `Giảng viên ${account!.name} yêu cầu chỉnh sửa: ${notes}`,
    });
    return ok(item);
  },
  "POST /assignments/*/complete": async (req, segments) => {
    const { account, error } = requireRole(req, ["instructor"]);
    if (error) return error;
    const body = await readBody(req);
    /* id đường dẫn = sessionId (adapter preview); memberEmail từ body hoặc
     * thành viên active đầu tiên của phiên. */
    const sessionId = segments[1];
    const memberEmail =
      typeof body.memberEmail === "string" && body.memberEmail
        ? body.memberEmail
        : INSTRUCTOR_SESSIONS.find((s) => s.id === sessionId)?.memberDetails.find(
            (m) => m.assignmentStatus === "active",
          )?.email;
    if (!memberEmail)
      return fail(409, "NOT_FOUND", "Không tìm thấy thành viên đang hoạt động trong phiên.");
    try {
      const { member } = completeAssignment(sessionId, memberEmail);
      pushNotification("admin", {
        category: "Phiên thực tập",
        title: "Sinh viên hoàn thành phân công",
        body: `Giảng viên ${account!.name} xác nhận ${member.name} hoàn thành phân công trong phiên.`,
      });
      return ok({ id: sessionId, member });
    } catch (message) {
      return fail(409, "NOT_FOUND", (message as Error).message);
    }
  },
  "GET /reports": (req) => {
    const { error } = requireRole(req, ["instructor", "admin"]);
    if (error) return error;
    return page(INSTRUCTOR_REPORTS, numberParam(req, "page"), numberParam(req, "pageSize", 20));
  },
  "POST /reports": async (req) => {
    const { account, error } = requireRole(req, ["instructor"]);
    if (error) return error;
    const body = await readBody(req);
    const period = typeof body.period === "string" && body.period.trim() ? body.period.trim() : "Kỳ hiện tại";
    const report = {
      id: `r-${Date.now()}`,
      period,
      scope: typeof body.scope === "string" && body.scope ? body.scope : "Tất cả phiên đang hoạt động",
      avgScore:
        Math.round(
          (INSTRUCTOR_GRADING.filter((g) => g.finalScore != null).reduce((s, g) => s + (g.finalScore ?? 0), 0) /
            Math.max(1, INSTRUCTOR_GRADING.filter((g) => g.finalScore != null).length)) *
            10,
        ) / 10,
      completion: 92,
      kpiAvg: 88,
      students: INSTRUCTOR_SESSIONS.reduce((sum, s) => sum + s.members, 0),
    };
    INSTRUCTOR_REPORTS.push(report);
    pushNotification("admin", {
      category: "Đánh giá",
      title: `Báo cáo mới: ${report.period}`,
      body: `Giảng viên ${account!.name} tạo báo cáo ${report.period}.`,
    });
    return ok(report, 201);
  },

  /* ============ ADMIN ============ */
  "GET /dashboard/admin": (req) => {
    const { error } = requireRole(req, ["admin"]);
    if (error) return error;
    return ok(ADMIN_STATS);
  },
  "GET /users": (req) => {
    const { error } = requireRole(req, ["admin"]);
    if (error) return error;
    return page(ADMIN_USERS, numberParam(req, "page"), numberParam(req, "pageSize", 20));
  },
  "PATCH /users/*/status": async (req, segments) => {
    const { account, error } = requireRole(req, ["admin"]);
    if (error) return error;
    const row = ADMIN_USERS.find((u) => u.id === segments[1]);
    if (!row) return fail(404, "NOT_FOUND", "Không tìm thấy người dùng.");
    const body = await readBody(req);
    const status = typeof body.status === "string" ? body.status : "";
    if (status !== "active" && status !== "locked" && status !== "pending")
      return fail(400, "VALIDATION_FAILED", "Trạng thái không hợp lệ.");
    row.status = status;
    pushNotification("instructor", {
      category: "Người dùng",
      title: `Tài khoản ${row.name} ${status === "locked" ? "bị khóa" : "được mở khóa"}`,
      body: `Quản trị viên ${account!.name} cập nhật trạng thái tài khoản ${row.email}.`,
    });
    return ok(row);
  },
  "GET /admin/question-bank": (req) => {
    const { error } = requireRole(req, ["admin"]);
    if (error) return error;
    return page(ADMIN_QUESTIONS, numberParam(req, "page"), numberParam(req, "pageSize", 20));
  },
  "POST /admin/question-bank": async (req) => {
    const { error } = requireRole(req, ["admin"]);
    if (error) return error;
    const body = await readBody(req);
    if (typeof body.content !== "string" || !body.content.trim())
      return fail(400, "VALIDATION_FAILED", "Câu hỏi cần nội dung.");
    const row = {
      id: `q-${Date.now()}`,
      code: `Q${String(ADMIN_QUESTIONS.length + 1).padStart(3, "0")}`,
      role: typeof body.role === "string" ? body.role : "backend",
      content: body.content.trim(),
      difficulty: (body.difficulty === "Dễ" || body.difficulty === "Khó" ? body.difficulty : "Vừa") as "Dễ" | "Vừa" | "Khó",
      type: typeof body.type === "string" ? body.type : "Chuyên môn",
      status: "Bản nháp" as const,
    };
    ADMIN_QUESTIONS.unshift(row);
    return ok(row, 201);
  },
  "PATCH /admin/question-bank/*": async (req, segments) => {
    const { error } = requireRole(req, ["admin"]);
    if (error) return error;
    const row = ADMIN_QUESTIONS.find((q) => q.id === segments[2]);
    if (!row) return fail(404, "NOT_FOUND", "Không tìm thấy câu hỏi.");
    const body = await readBody(req);
    if (typeof body.status === "string") row.status = body.status as typeof row.status;
    if (typeof body.content === "string" && body.content.trim()) row.content = body.content.trim();
    return ok(row);
  },
  "GET /project-templates": (req) => {
    const { error } = requireRole(req, ["admin"]);
    if (error) return error;
    return page(ADMIN_TEMPLATES, numberParam(req, "page"), numberParam(req, "pageSize", 20));
  },
  "GET /activity-events": (req) => {
    const { error } = requireRole(req, ["admin"]);
    if (error) return error;
    return page(ADMIN_ACTIVITY, numberParam(req, "page"), numberParam(req, "pageSize", 20));
  },
  "GET /audit-logs": (req) => {
    const { error } = requireRole(req, ["admin"]);
    if (error) return error;
    return page(
      ADMIN_ACTIVITY.map((a) => ({ ...a, actor: "hệ thống", action: a.module })),
      numberParam(req, "page"),
      numberParam(req, "pageSize", 20),
    );
  },
};

/* ------------------------------ matching ------------------------------- */

async function readBody(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const json = await req.json();
    return typeof json === "object" && json !== null ? (json as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
function numberParam(req: NextRequest, key: string, fallback = 1): number {
  const raw = new URL(req.url).searchParams.get(key);
  const value = raw === null ? NaN : Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
/** Khớp route: segment `*` trong pattern khớp bất kỳ segment nào; các
 *  segment còn lại phải bằng nhau. Tìm theo đúng method + độ dài path. */
function findHandler(method: string, segments: string[]) {
  const exact = ROUTES[`${method} /${segments.join("/")}`];
  if (exact) return { handler: exact, wildcard: false };
  for (const key of Object.keys(ROUTES)) {
    const [routeMethod, routePath] = key.split(" ");
    if (routeMethod !== method || !routePath) continue;
    const routeSegments = routePath.slice(1).split("/");
    if (routeSegments.length !== segments.length) continue;
    let matched = true;
    for (let i = 0; i < routeSegments.length; i++) {
      if (routeSegments[i] === "*") continue;
      if (routeSegments[i] !== segments[i]) {
        matched = false;
        break;
      }
    }
    if (matched) return { handler: ROUTES[key]!, wildcard: true };
  }
  return null;
}

async function dispatch(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
): Promise<NextResponse> {
  const { path } = await ctx.params;
  const segments = path ?? [];
  if (segments.length === 0) return fail(404, "NOT_FOUND", "Không tìm thấy tài nguyên.");
  const method = req.method.toUpperCase();
  const found = findHandler(method, segments);
  if (!found)
    return fail(404, "NOT_FOUND", `Không tìm thấy tài nguyên: ${method} /api/v1/${segments.join("/")}`);
  return found.handler(req, segments);
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return dispatch(req, ctx);
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return dispatch(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return dispatch(req, ctx);
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return dispatch(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  return dispatch(req, ctx);
}

/* ------------------------- AI mentor reply (mock) ---------------------- */

function mentorReply(question: string, title: string): string {
  const q = question.toLowerCase();
  if (q.includes("kpi") || q.includes("lương"))
    return `Với đề mục "${title}": KPI tuần này của bạn nên ưu tiên tỷ lệ hoàn thành task đúng hạn — lương ảo tính trực tiếp từ đó. Mình gợi ý kéo 2 task "doing" về "done" trước thứ 6 nhé!`;
  if (q.includes("sprint") || q.includes("bảng"))
    return `Sprint hiện tại đang ổn: cột "Chờ duyệt" còn nhẹ. Nếu bạn hỏi mình, cứ chốt task lớn trước rồi dọn task nhỏ — biến động điểm story sẽ thấp hơn.`;
  if (q.includes("điểm") || q.includes("đánh giá"))
    return `Điểm đánh giá lấy từ tiêu chí đã chốt, AI chỉ tham khảo. Hai tiêu chí bạn hay mất điểm là "Kiểm thử" và "Tiêu chí hoàn thành" — xem lại checklist trước khi nộp nhé.`;
  return `Câu hỏi hay! Dựa trên tiến độ hiện tại trong "${title}", mình khuyên bạn giữ nhịp 1 task/lifecycle mỗi ngày và cập nhật tiến độ thật để KPI phản ánh đúng. Bạn muốn mình phân tích sâu phần nào tiếp theo?`;
}
