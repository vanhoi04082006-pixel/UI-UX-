# AUDIT REPORT — FE ↔ BE V-Intern (2026-11-21)

> Đối tượng: repo FE này vs BE QA (`NEXT_PUBLIC_API_BASE_URL` trong `.env`,
> OpenAPI: `<base>/api/docs-json` — 248 paths / 302 operations).
> Công cụ: `scripts/audit-fe-be.py` (audit tĩnh) + probe runtime bằng tài khoản QA.
> Mock đã gỡ hoàn toàn (commit "chore: xóa toàn bộ mock") — mọi số liệu dưới đây
> là FE gọi **BE thật**.

## Tổng quan

| Chỉ số | Kết quả |
|---|---|
| Lời gọi API trong `src/lib/api/*.ts` | 289 (287 literal + 2 dynamic-helper) |
| ✅ Path + method + query + body khớp BE | **273** |
| ⚠️ Partial (BE Swagger under-declare / query thừa nhưng BE chấp nhận) | 14 |
| ❌ Mismatch thật (FE gọi sai contract) | **0** (3 bug đã phát hiện & sửa — xem §5) |
| Ops BE có UI/adapter FE gọi | 267/302 (88.1%) — 5 ops nữa gọi qua helper (false negative) → **272 thực dùng** |
| Ops BE chưa dùng (đã phân loại, có lý do) | 35 — xem §6 |

## 1. Endpoint coverage (path) — ✅

Mọi path FE (kể cả template literal `/x/${id}`) khớp cấu trúc path BE
(`/x/{id}`). Endpoint không tồn tại đã bị loại:
- ❌→✅ `GET /submissions` (không có ở BE) → thay bằng aggregation
  `GET /tasks` + `GET /tasks/{id}/submissions` (sửa trong audit này).
- ❌→✅ `GET /auth/demo-accounts` (panel demo) → xóa cùng mock.

## 2. HTTP method — ✅

273 call khớp method. 0 call sai method (trước đây `POST /auth/me` là
false-positive của script — thực tế GET).

## 3. Request body fields — ✅ (12 ⚠️ partial do BE spec)

BE Swagger khai báo `properties: {}` **rỗng** cho 12 DTO (FE gửi field đúng —
đã xác minh qua runtime probing và `docs/api-specs/dto-fields.md`):

`RegisterDto` · `ChangePasswordDto` · `VerifyApplicationDto` ·
`RequestAccessDto` · `ArchiveCareerRoleDto` · `ReviewSubmissionDto` ·
`CreateReportDto` · `CreateRecruitmentRoundDto` · `UpdateRoundStatusDto` ·
`CreateSlotDto` · `ValidateContractDto` · `UpdateAiConfigurationDto`

**Action item (BE):** bổ sung `@ApiProperty` cho các DTO trên để Swagger đầy đủ.

## 4. Response field names — ✅ (runtime probe)

Đã probe runtime với tài khoản QA (log đầy đủ trong quá trình audit):
- `GET /auth/login|me` → `{accessToken, user{id,email,displayName,status,roles[],permissions[]}}` ✅ khớp `parsePrincipal`
- `GET /tasks` → envelope `{data, meta}` ✅ khớp `parsePage`
- `GET /tasks/{id}/submissions` → **mảng phẳng** (không envelope) — đã sửa parser (§5.1)
- `GET /reports` → `{items, total, counts}`; `GET /reports/{id}` → `{..., snapshot:{members[], details:{tasks[]}}}` — đã dựng UI mới trên snapshot thật
- `GET /reports/{id}/pdf` → `application/pdf` 31KB ✅ · `/xlsx` → OOXML 11KB ✅
- `GET /sprints` rows có `projectId` ✅ (đã map qua `parseSprint`)

## 5. Bug FE↔BE phát hiện & đã sửa trong audit này

| # | Bug | Sửa |
|---|---|---|
| 5.1 | `listTaskSubmissions` dùng `parsePage` nhưng BE trả **mảng phẳng** → màn bài nộp của SV luôn rỗng | Parse mảng trực tiếp + thêm field `feedback` vào mapping (work.ts) |
| 5.2 | `createSprint` gửi `projectId = sessionId` (sai) | Input thêm `projectId`; dialog tạo Sprint thêm chọn Dự án (GET /projects) |
| 5.3 | `createTask` thiếu `projectId` (BE required → 400) | Input thêm `projectId` + `sprintId`, resolve từ Sprint đang chọn |
| 5.4 | Màn Báo cáo: `parseReportRow` trả số 0 placeholder, dialog sinh điểm **giả** client-side (`studentRowsOf`), xuất CSV tự ghép | Dựng lại 100% trên BE: list thật, dialog dùng `GET /reports/{id}` snapshot.members, xuất PDF/XLSX thật (`GET /reports/{id}/pdf|xlsx`) |

## 6. 35 ops BE chưa có lời gọi FE — phân loại & lý do

**A. Gọi qua helper (script không đếm được — thực tế ĐÃ dùng) = 5**
- `POST /auth/refresh` — `client.ts` refreshAccessToken (mono-flight khi 401)
- `POST .../reschedule` · `resend-credentials` · `recover-credentials` · `retake` — qua `mutationAck()` (recruitment.ts)

**B. Không thuộc UI FE = 4**
- `GET /github/callback` — OAuth redirect xử lý bởi BE (browser navigate)
- `POST /github/webhook` — webhook GitHub → BE (server-to-server)
- `GET /reference-screens` + `/{key}` — tiện ích BE, chưa có nhu cầu sản phẩm

**C. Endpoint chi tiết — UI render từ dữ liệu list (by design) = 13**
- `GET /admin/question-bank/{id}` · `GET /sprints/{id}` · `GET /tasks/{id}`
- `GET /intern/me/{certificates|evaluations|kpi}/{id}`
- `GET /intern/me/projects/{id}/learning-package`
- `GET /tasks/{id}/history` · `GET /sprints/{id}/completion`
- `GET /assignments/{id}` · `GET /participation/me/replacements`
- `GET /dashboard/sprints/{id}/burndown` (FE vẽ burndown từ board data)
- `GET .../credential-recovery` (đã có POST recover-credentials tương ứng)

**D. Chưa có UI — action item cho sprint kế tiếp = 13**
- Module Assignments: `GET /assignments` · `POST /assignments` · `POST /assignments/{id}/cancel`
- Task comments: `GET` + `POST /tasks/{id}/comments`
- `PATCH /tasks/{id}` · `DELETE /tasks/{id}`
- `PATCH /users/{id}` · `PATCH /project-templates/{id}`
- Dashboard variants: `/dashboard/academic` · `/academic-overview` · `/catalogs` · `/user-roles`

## 7. Auth flow — ✅ (probe runtime 2026-11-21)

1. `POST /auth/login` → 200 `{accessToken, user}` + cookie `vintern_refresh` (HttpOnly)
2. `GET /auth/me` (Bearer) → principal phẳng `roles[] + permissions[]`
3. `POST /auth/refresh` (cookie) → accessToken mới (rotate)
4. `POST /auth/logout` → 204, revoke cookie
5. Refresh sau logout → 401 `REFRESH_REUSE` "Session family revoked"
   → FE (`client.ts`) bắt đúng: refresh fail ⇒ clear token + ép đăng nhập lại.
   `REFRESH_MISSING` / `REFRESH_EXPIRED` cùng nhánh xử lý (mono-flight, retry 1 lần request gốc).

## 8. Roles & permissions — ✅

- FE `Role = "intern" | "instructor" | "admin"` = BE roles ✅
- `/auth/me` trả `roles[]` (mảng) + `permissions[]` (vd intern: `ai.mentor.use`,
  `recruitment.view.own`…) — FE parse cả hai, workspace điều hướng theo role đầu tiên.

## 9. Error handling — ✅

`errorMessage()` (api-client.ts) map: `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`,
`PASSWORD_CHANGE_REQUIRED`, `TASK_*`, `SUBMISSION_PENDING_REVIEW`, `SPRINT_*`,
`SESSION_STATUS_INVALID`, `AI_PROVIDER_*`, `AI_RECOMMENDATION_NOT_AVAILABLE`,
`EVALUATION_*`, `KPI_CALCULATION_REQUIRED`, `VIRTUAL_SALARY_*`,
`REPLACEMENT_PENDING_REVIEW`, `GITHUB_IDENTITY_REQUIRED`, `CV_FILE_INVALID`,
`VERIFICATION_INVALID`, `APPLICATIONS_CLOSED`, `MAIL_NOT_CONFIGURED`,
`CATALOG_*` + HTTP 400/401/403/404/409/422/429/503/0 (mạng).
`API_CONFIG_MISSING` (mới): thiếu `NEXT_PUBLIC_API_BASE_URL` — báo rõ 1 dòng.

## 10. Pagination — ✅

- FE gửi `page`/`pageSize` (≤100) đúng các endpoint khai báo (GET /tasks, /sprints, /users…).
- 2 ⚠️ partial: `GET /projects/{id}/sessions` và `GET /recruitment-rounds/{id}/applications`
  gửi `page/pageSize` dù BE Swagger không khai báo — runtime xác nhận BE **chấp nhận**
  và trả envelope đúng (`{data,meta}` / `{items,total,page,pageSize}`).
- `GET /admin/communications` chỉ nhận `page` (đã xử lý: `suffix = page > 1 ? "?page=..." : ""`).

## 11. File upload — ✅

- CV ứng tuyển: `POST /applications` / `POST /applications/me/cv` — multipart,
  field **`cv`** (BE `FileInterceptor("cv")`), accept PDF/DOCX ≤ 5MB, consent
  `cv-consent-v1` — khớp BE (`CV_FILE_INVALID` được map).

## 12. CORS & cookie — ✅

- FE: `credentials: "include"` mọi request (api-client.ts), token Bearer +
  refresh cookie qua origin tunnel (khác origin app).
- BE: `SameSite=None; Secure` + CORS `allow-credentials` cho origin preview —
  xác minh bằng OPTIONS preflight 204 + login/refresh cookie hoạt động thật.

## Chạy lại audit

```bash
curl -s "$NEXT_PUBLIC_API_BASE_URL/docs-json" -o /tmp/openapi.json
python3 scripts/audit-fe-be.py /tmp/openapi.json
# Chi tiết: scripts/audit-result.json
```
