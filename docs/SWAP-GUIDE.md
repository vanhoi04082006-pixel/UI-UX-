# SWAP GUIDE — Kết nối BE thật & chế độ sandbox mock

> Nâng cấp 2026-11-21: toàn bộ 302 operations của BE (248 paths) đã có màn hình
> + adapter FE tương ứng. Xem `docs/api-specs/` để đối chiếu contract từng nhóm.

## 1. Kiến trúc

```
src/lib/api/                  ← LỚP DUY NHẤT màn hình gọi (giữ nguyên khi swap)
  api-client.ts               transport: ApiError, apiFetch (credentials include), errorMessage
  client.ts                   request() + Bearer + tự refresh khi 401 (mono-flight)
  session-token.ts            access token trong localStorage
  parse.ts                    parser contract ({data, meta}, {items}, phẳng)
  auth.ts                     login / register (fullName+acceptedTerms) / me / refresh / logout
  work.ts                     intern tasks (mine=true), sprint board, placement, workspace
  outcomes.ts                 evaluations, kpi, salary, certificates, notifications THẬT
  mentor.ts                   ai-mentor (items envelope, role/content messages, followUps)
  instructor.ts               dashboard, sessions, sprints, submissions, reports (màn cũ)
  admin.ts                    dashboard, users, question-bank, templates (màn cũ)
  recruitment.ts              RecruitmentRounds 16 ops (admin)
  applications.ts             Applications 8 ops (public + candidate)
  evaluation-cycles.ts        evaluation-cycles 9 ops + criteria CRUD
  kpi-admin.ts                kpi-periods 8 + kpi-results + virtual-salary 4
  groups.ts                   groups 8 + rbac 3 + user options
  knowledge.ts                knowledge 10 + agents 5
  catalogs.ts                 catalogs 5 + career-roles 8
  certificates-admin.ts       certificates 6 (issue/revoke/pdf)
  system.ts                   AdminSystem 4 + AiRuntime 2 + Communications 3 + settings 2 + health + audit 2
  projects.ts                 projects 10 + project-templates
  instructor-eval.ts          evaluations 7 + AI assistance 3 + code review 2 + imported-reviews 2
  performance.ts              performance 3 + ai-recommendations per user
  ai-plan.ts                  ai-generations 5
  operations.ts               sessions 19 + participation 7 + replacement 4 + repo access 3 + github session
  github.ts                   github cá nhân (me/connect/disconnect/repository-access)
  recruitment-interview.ts    recruitment 16 ops (phỏng vấn AI ứng viên)
  student-extra.ts            performance me + ai-recommendations + participation me
src/lib/use-api.ts            hook loading / error / reload
src/app/api/v1/[...path]/     ← MOCK REST SERVER — mirror contract BE (fallback sandbox)
src/lib/mock/                 ← seed dữ liệu mock
```

## 2. Hai chế độ chạy

**Chế độ BE thật (đang bật mặc định)** — `.env.local`:
```ini
NEXT_PUBLIC_API_BASE_URL=https://trance-bull-changelog-observe.trycloudflare.com/api/v1
```
- CORS + cookie refresh đã được BE bật cho origin preview (SameSite=None, allow-credentials).
- Access token TTL 15 phút — client tự `POST /auth/refresh` khi gặp 401 rồi retry request gốc.
- URL tunnel **đổi mỗi lần restart BE** → cập nhật biến này (xem `upload/FE-HANDOFF.md`).

**Chế độ sandbox mock** — xóa `NEXT_PUBLIC_API_BASE_URL` khỏi `.env.local`:
- Mọi request đi tới `/api/v1/**` nội bộ (mock mirror contract thật cho auth + mentor;
  các endpoint mới trả 404 → màn hình hiện empty/error state chuẩn).

## 3. Tài khoản QA (BE thật)

Mật khẩu chung: `Vq7!mK2pR9#tLx4H`
- `qa.admin@vintern.test` (admin, 59 quyền)
- `qa.instructor@vintern.test` (instructor, 22 quyền)
- `qa.intern@vintern.test` (intern, 14 quyền)

## 4. Màn hình mới theo BE group

| Nhóm BE | Màn hình | Route (hash) |
|---|---|---|
| Applications (public) | Cổng ứng tuyển 3 bước | `#/apply` |
| certificates/verify | Tra cứu chứng chỉ công khai | `#/verify` |
| RecruitmentRounds | Vòng tuyển dụng (đợt/slot/ứng viên/CV) | `#/admin/recruitment` |
| evaluation-cycles | Chu kỳ đánh giá + tiêu chí | `#/admin/cycles` |
| kpi-periods + virtual-salary | KPI & Lương ảo | `#/admin/kpi` |
| groups + rbac | Nhóm & Phân quyền | `#/admin/groups` |
| knowledge + agents | Thư viện kiến thức + Agent runs | `#/admin/knowledge` |
| catalogs + career-roles | Danh mục & Vai trò nghề nghiệp | `#/admin/catalogs` |
| certificates | Chứng nhận (cấp/thu hồi/PDF) | `#/admin/certificates` |
| AdminSystem + AiRuntime + Communications + settings + health | Vận hành & Cấu hình | `#/admin/system` |
| audit | Nhật ký hệ thống (audit + activity) | `#/admin/audit` |
| projects + project templates | Dự án & Mẫu | `#/instructor/projects` (admin dùng chung) |
| sessions + participation + replacement + repository-access + github(session) | Điều phối phiên | `#/instructor/operations` |
| evaluations + evaluation-ai-assistance + code review + imported-reviews | Chu kỳ đánh giá (GV) | `#/instructor/evaluations` |
| performance | Hiệu suất SV | `#/instructor/performance` |
| ai-generations | Lập kế hoạch AI | `#/instructor/ai-plan` |
| github (cá nhân) | Liên kết GitHub | `#/intern/github` |
| recruitment (16 ops) | Phỏng vấn AI | `#/intern/recruitment` |
| performance(me) + ai-recommendations + participation(me) | Năng lực & Khuyến nghị | `#/intern/performance` |

## 5. Contract notes quan trọng (probe từ BE QA 2026-11-21)

- **3 loại envelope**: `{data, meta}` (users/sessions/tasks/projects/notifications/audit…),
  `{items, total}` (recruitment-rounds/evaluation-cycles/kpi/certificates/evaluations…),
  object phẳng (github/me, recruitment/me, system status, settings…).
- `POST /auth/login` trả `{accessToken, user: {displayName, roles[], permissions[]}}`;
  `/auth/me` trả principal phẳng cùng shape.
- `POST /auth/register` cần `{fullName, email, password, acceptedTerms: true}`.
- Đổi mật khẩu: min 12 ký tự, BE xoá refresh cookie → phải đăng nhập lại.
- `POST /applications/verify` dùng `{token}` (≥40 ký tự, dán cả link email cũng được).
- Round status enum: `draft | open | closed`.
- Task priority BE: `low | medium | high | critical` (không có "urgent").
- AI endpoints throttle 5-15/phút — nút bấm disable khi busy.
- Mentor message response: `{conversation, userMessage, assistantMessage, summary, followUps[]}`.
- `GET /admin/communications` KHÔNG nhận pageSize (chỉ page).
- Chi tiết: `docs/api-specs/live-shapes.md`, `docs/api-specs/dto-fields.md`,
  đặc tả theo tag trong `docs/api-specs/*.md`.

## 6. Dữ liệu probe còn sót trong DB QA (minh bạch)

- Round "QA-probe-temp" (đã đóng) + 1 application bị cancel — do agent 2-a probe validation.
- 1 conversation "QA probe — đọc shape" + 2 tin nhắn AI thật của qa.intern.
- 1 interview session attempt 2 (expired) của qa.intern — còn 1 lượt thử.
