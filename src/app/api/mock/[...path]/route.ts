import { NextRequest, NextResponse } from "next/server";
import type {
  MockAccount,
  Priority,
  SessionStatus,
  SessionUser,
  SprintStatus,
} from "@/lib/mock/types";
import {
  ACCOUNTS,
  ADMIN_ACTIVITY,
  ADMIN_QUESTIONS,
  ADMIN_STATS,
  ADMIN_TEMPLATES,
  ADMIN_USERS,
  certificatesForIntern,
  completeAssignment,
  createBoardTask,
  createSprint,
  evaluationsForIntern,
  INSTRUCTOR_GRADING,
  INSTRUCTOR_REPORTS,
  INSTRUCTOR_SESSIONS,
  INSTRUCTOR_SPRINTS,
  INSTRUCTOR_SPRINT_BOARD,
  kpiForIntern,
  markNotificationsRead,
  markNotificationsUnread,
  mentorForIntern,
  notificationsFor,
  overviewForIntern,
  salaryForIntern,
  sessionTransitions,
  sprintTransitions,
  tasksForIntern,
  transitionSession,
  transitionSprint,
  updateSprint,
} from "@/lib/mock/data";

export const dynamic = "force-dynamic";

function ok<T>(data: T) {
  return NextResponse.json({ ok: true, data });
}
function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

function accountByEmail(email: string) {
  return ACCOUNTS.find((a) => a.email.toLowerCase() === email.toLowerCase());
}

function resolveInternEmail(q: string | null, body?: { email?: string }) {
  return (q ?? body?.email ?? "minh.nguyen@student.edu.vn").toLowerCase();
}

/** Chuyển tài khoản mock → SessionUser (giống hệt luồng login trả về). */
function sessionUserFrom(account: MockAccount): SessionUser {
  const initials = account.name
    .split(" ")
    .filter((w) => /[a-zA-ZÀ-ỹ]/.test(w[0] ?? ""))
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    role: account.role,
    title: account.title,
    initials,
    internState: account.internState,
    ...(account.mustChangePassword ? { mustChangePassword: true } : {}),
  };
}

/* ----------------------------- GET ----------------------------- */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const route = path.join("/");
  const { searchParams } = request.nextUrl;

  try {
    switch (route) {
      case "demo-accounts": {
        return ok(
          ACCOUNTS.map((a) => ({
            id: a.id,
            email: a.email,
            password: a.password,
            name: a.name,
            role: a.role,
            status: a.status,
            title: a.title,
            internState: a.internState,
            mustChangePassword: a.mustChangePassword === true,
            note: a.note,
          })),
        );
      }
      case "intern/overview": {
        return ok(overviewForIntern(resolveInternEmail(searchParams.get("email"))));
      }
      case "intern/tasks": {
        return ok(tasksForIntern(resolveInternEmail(searchParams.get("email"))));
      }
      case "intern/evaluations": {
        return ok(evaluationsForIntern(resolveInternEmail(searchParams.get("email"))));
      }
      case "intern/kpi": {
        return ok(kpiForIntern(resolveInternEmail(searchParams.get("email"))));
      }
      case "intern/salary": {
        return ok(salaryForIntern(resolveInternEmail(searchParams.get("email"))));
      }
      case "intern/certificates": {
        return ok(certificatesForIntern(resolveInternEmail(searchParams.get("email"))));
      }
      case "intern/mentor": {
        return ok(mentorForIntern(resolveInternEmail(searchParams.get("email"))));
      }
      case "notifications": {
        const role = searchParams.get("role") ?? "intern";
        return ok(notificationsFor(role));
      }
      case "instructor/overview": {
        const active = INSTRUCTOR_SESSIONS.filter((s) => s.status === "active");
        const pending = INSTRUCTOR_GRADING.filter((g) => g.status === "pending");
        return ok({
          sessions: active.length,
          interns: active.reduce((sum, s) => sum + s.members, 0),
          sprintCompletion: Math.round(
            active.reduce((s, x) => s + x.progress, 0) / Math.max(active.length, 1),
          ),
          avgAiScore:
            Math.round((INSTRUCTOR_GRADING.reduce((s, g) => s + g.aiScore, 0) / INSTRUCTOR_GRADING.length) * 10) / 10,
          pendingReviews: pending.length,
        });
      }
      case "instructor/sessions":
        return ok(INSTRUCTOR_SESSIONS);
      case "instructor/sprints":
        return ok({
          sprints: INSTRUCTOR_SPRINTS,
          transitions: Object.fromEntries(
            INSTRUCTOR_SPRINTS.map((s) => [s.id, sprintTransitions(s.status)]),
          ),
        });
      case "instructor/board":
        return ok(INSTRUCTOR_SPRINT_BOARD);
      case "instructor/grading":
        return ok(INSTRUCTOR_GRADING);
      case "instructor/reports":
        return ok(INSTRUCTOR_REPORTS);
      case "admin/overview":
        return ok({
          stats: ADMIN_STATS,
          activity: ADMIN_ACTIVITY,
          recentUsers: ADMIN_USERS.slice(0, 5),
        });
      case "admin/users":
        return ok(ADMIN_USERS);
      case "admin/questions":
        return ok(ADMIN_QUESTIONS);
      case "admin/templates":
        return ok(ADMIN_TEMPLATES);
      default:
        return fail(`Không tìm thấy endpoint mock: ${route}`, 404);
    }
  } catch (error) {
    console.error("[mock-api]", error);
    return fail("Lỗi máy chủ mock — thử lại sau.", 500);
  }
}

/* ----------------------------- POST ----------------------------- */

const RULE_BASED_REPLIES: { test: RegExp; reply: string }[] = [
  {
    test: /kanban|kéo|thả|drag/i,
    reply:
      "Với Kanban kéo–thả, hãy dùng dnd-kit: bản thẻ gốc giữ chỗ bằng placeholder, DragOverlay cho thẻ bay theo con trỏ. Đừng quên fallback bàn phím — tab vào thẻ, Enter để nhặt, mũi tên để đổi cột. Giảng viên vẫn là người chốt cuối cùng nhé!",
  },
  {
    test: /test|kiểm thử/i,
    reply:
      "Gợi ý lộ trình 3 buổi: (1) test logic thuần, (2) component với Testing Library — theo nguyên tắc cứ query như người dùng nhìn, (3) lồng vào CI để chạy tự động. Đừng viết test chỉ để cho có — mỗi test nên gắn với một hành vi thật.",
  },
  {
    test: /component|render|tách/i,
    reply:
      "Khi tách component: một component lo một việc, props vào là dữ liệu tối thiểu. Danh sách dài nên memo từng item và dùng key ổn định (id, không phải index). Nếu trạng thái chỉ nằm trong một nhánh cây UI, đừng đẩy lên context toàn cục.",
  },
  {
    test: /api|fetch|endpoint/i,
    reply:
      "Với API: kiểm tra schema response trước khi render (adapter pattern của dự án đang làm đúng vậy), xử lý cả nhánh lỗi lẫn nhánh rỗng, và hủy request cũ khi người dùng lọc lại — chữ ký AbortController sẽ giúp bạn.",
  },
];

async function aiMentorReply(history: { role: "user" | "assistant"; content: string }[]) {
  try {
    const { default: ZAI } = await import("z-ai-web-dev-sdk");
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "Bạn là AI Mentor của nền tảng thực tập ảo V-Intern — người đồng hành thân thiện của sinh viên CNTT. Trả lời bằng tiếng Việt, ngắn gọn (dưới 120 từ), thực tế, kèm gợi ý hành động cụ thể. Thỉnh thoảng nhắc nhẹ: điểm AI chỉ là tham khảo, giảng viên mới chốt điểm chính thức. Không bịa dữ liệu không có.",
        },
        ...history,
      ],
      temperature: 0.6,
    });
    const text = completion?.choices?.[0]?.message?.content?.trim();
    if (text) return text;
  } catch {
    // rơi về phương án dự phòng bên dưới
  }
  const lastUser = history.filter((m) => m.role === "user").at(-1)?.content ?? "";
  const matched = RULE_BASED_REPLIES.find((r) => r.test.test(lastUser));
  return (
    matched?.reply ??
    "Câu hỏi hay đấy! Mình chưa có dữ liệu đủ để trả lời chắc chắn phần đó. Bạn thử nêu cụ thể hơn ngữ cảnh — task nào, stack gì, kịch bạn đang kẹt ở đâu — để mình gợi ý sát bài hơn nhé. Nhớ rằng: gợi ý của AI chỉ để tham khảo, giảng viên mới là người chốt phương án cuối cùng ✎"
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const route = path.join("/");

  try {
    const body = await request.json().catch(() => ({}));

    switch (route) {
      case "auth/login": {
        const { email, password } = body as { email?: string; password?: string };
        if (!email || !password) return fail("Vui lòng nhập email và mật khẩu.");
        const account = accountByEmail(email);
        if (!account || account.password !== password) {
          return fail("Email hoặc mật khẩu không đúng. Mẹo: màn đăng nhập có sẵn tài khoản demo.", 401);
        }
        if (account.status === "locked") {
          return fail(
            "Tài khoản đã bị khóa vì vi phạm quy định nộp bài. Liên hệ quản trị viên qua email quan.tri@vintern.edu.vn.",
            403,
          );
        }
        return ok({
          user: sessionUserFrom(account),
          token: `mock-${account.id}-${Date.now()}`,
        });
      }
      case "auth/register": {
        const { name, email } = body as { name?: string; email?: string };
        if (!name || !email) return fail("Vui lòng điền đủ họ tên và email.");
        if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Email chưa hợp lệ.");
        if (accountByEmail(email)) return fail("Email này đã có tài khoản — thử đăng nhập nhé.");
        return ok({
          message: `Chào ${name.split(" ").at(-1)}! Tài khoản sinh viên đã được tạo. Đăng nhập để bắt đầu hành trình.`,
        });
      }
      case "auth/change-password": {
        const { email, currentPassword, newPassword } = body as {
          email?: string;
          currentPassword?: string;
          newPassword?: string;
        };
        const account = email ? accountByEmail(email) : undefined;
        if (!account) return fail("Không tìm thấy tài khoản với email này.", 404);
        if (account.password !== currentPassword) {
          return fail("Mật khẩu hiện tại không đúng", 401);
        }
        if (typeof newPassword !== "string" || newPassword.length < 8) {
          return fail("Mật khẩu mới cần tối thiểu 8 ký tự", 400);
        }
        // Ghi đè trạng thái tài khoản trong bộ nhớ máy chủ mock.
        account.password = newPassword;
        account.mustChangePassword = false;
        return ok({ user: sessionUserFrom(account) });
      }
      case "notifications/read": {
        const { role, ids, all } = body as {
          role?: string;
          ids?: string[];
          all?: boolean;
        };
        if (!role) return fail("Thiếu vai trò (role).");
        const updated = markNotificationsRead(
          role,
          Array.isArray(ids) ? ids : undefined,
          all === true,
        );
        return ok({ updated });
      }
      case "notifications/unread": {
        const { role, ids } = body as { role?: string; ids?: string[] };
        if (!role) return fail("Thiếu vai trò (role).");
        if (!Array.isArray(ids) || ids.length === 0) {
          return fail("Cần truyền danh sách ids thông báo cần bỏ đọc.");
        }
        const updated = markNotificationsUnread(role, ids);
        return ok({ updated });
      }
      case "intern/mentor": {
        const { messages } = body as { messages?: { role: "user" | "assistant"; content: string }[] };
        const history = (messages ?? []).slice(-10).map((m) => ({
          role: m.role === "user" ? ("user" as const) : ("assistant" as const),
          content: String(m.content ?? ""),
        }));
        const reply = await aiMentorReply(history);
        return ok({ reply });
      }

      /* ---- Vòng đời phiên / sprint / phân công / nhiệm vụ (codex) ---- */
      case "instructor/session-transition": {
        const { sessionId, status } = body as { sessionId?: string; status?: string };
        if (!sessionId || !status) return fail("Thiếu mã phiên hoặc trạng thái đích.");
        try {
          return ok(transitionSession(sessionId, status as SessionStatus));
        } catch (error) {
          return fail((error as Error).message ?? "Không đổi được trạng thái phiên.", 409);
        }
      }
      case "instructor/session-transitions": {
        const { sessionId } = body as { sessionId?: string };
        const session = INSTRUCTOR_SESSIONS.find((s) => s.id === sessionId);
        if (!session) return fail("Không tìm thấy phiên thực tập này.", 404);
        return ok({ transitions: sessionTransitions(session.status) });
      }
      case "instructor/assignment-complete": {
        const { sessionId, memberEmail } = body as { sessionId?: string; memberEmail?: string };
        if (!sessionId || !memberEmail) return fail("Thiếu mã phiên hoặc email thành viên.");
        try {
          return ok(completeAssignment(sessionId, memberEmail));
        } catch (error) {
          return fail((error as Error).message ?? "Không hoàn tất được phân công.", 409);
        }
      }
      case "instructor/sprint-transition": {
        const { sprintId, status } = body as { sprintId?: string; status?: string };
        if (!sprintId || !status) return fail("Thiếu mã Sprint hoặc trạng thái đích.");
        try {
          return ok(transitionSprint(sprintId, status as SprintStatus));
        } catch (error) {
          return fail((error as Error).message ?? "Không đổi được trạng thái Sprint.", 409);
        }
      }
      case "instructor/sprint-update": {
        const { sprintId, name, goal, startsAt, endsAt } = body as {
          sprintId?: string;
          name?: string;
          goal?: string;
          startsAt?: string;
          endsAt?: string;
        };
        if (!sprintId) return fail("Thiếu mã Sprint.");
        if (startsAt && endsAt && endsAt <= startsAt) {
          return fail("Ngày kết thúc Sprint phải sau ngày bắt đầu. Hãy kiểm tra lại hai mốc thời gian.");
        }
        try {
          return ok(updateSprint(sprintId, { name, goal, startsAt, endsAt }));
        } catch (error) {
          return fail((error as Error).message ?? "Không lưu được thay đổi Sprint.", 409);
        }
      }
      case "instructor/sprint-create": {
        const { sessionId, name, goal, startsAt, endsAt } = body as {
          sessionId?: string;
          name?: string;
          goal?: string;
          startsAt?: string;
          endsAt?: string;
        };
        if (!sessionId || !name) return fail("Thiếu phiên hoặc tên Sprint.");
        if (!startsAt || !endsAt) return fail("Vui lòng chọn ngày bắt đầu và kết thúc.");
        if (endsAt <= startsAt) {
          return fail("Ngày kết thúc Sprint phải sau ngày bắt đầu. Hãy kiểm tra lại hai mốc thời gian.");
        }
        try {
          return ok(createSprint({ sessionId, name, goal, startsAt, endsAt }));
        } catch (error) {
          return fail((error as Error).message ?? "Không tạo được Sprint.", 409);
        }
      }
      case "instructor/task-create": {
        const { sprintId, title, assignee, priority, points } = body as {
          sprintId?: string;
          title?: string;
          assignee?: string;
          priority?: string;
          points?: number;
        };
        if (!sprintId || !title || !assignee) {
          return fail("Vui lòng điền tên nhiệm vụ và người nhận.");
        }
        try {
          return ok(
            createBoardTask({
              sprintId,
              title,
              assignee,
              priority: (priority as Priority | undefined) ?? "medium",
              points: typeof points === "number" ? points : 3,
            }),
          );
        } catch (error) {
          return fail((error as Error).message ?? "Không tạo được nhiệm vụ.", 409);
        }
      }
      default:
        return fail(`Không tìm thấy endpoint mock: ${route}`, 404);
    }
  } catch (error) {
    console.error("[mock-api]", error);
    return fail("Lỗi máy chủ mock — thử lại sau.", 500);
  }
}
