# SWAP GUIDE — Từ sandbox preview sang BE thật (3 bước, không sửa màn hình)

> Kiến trúc hiện tại của sandbox: **mọi màn hình chỉ gọi lớp `src/lib/api/*`**
> (adapter khớp contract BE thật — đường dẫn, envelope, mã lỗi). Mock không nằm
> trong màn hình; nó là **một REST server giả** tại `src/app/api/v1/[...path]`.

## 1. Cấu trúc

```
src/lib/api/            ← LỚP DUY NHẤT màn hình được phép gọi (giữ lại khi swap)
  api-client.ts         transport: ApiError, apiFetch, errorMessage
  client.ts             request() + Bearer token
  session-token.ts      token localStorage
  parse.ts              parser contract ({data, meta}, {message, code})
  auth.ts               login / register / me / change-password / logout
  work.ts               tasks, board, placement, intern overview (compose)
  outcomes.ts           evaluations, kpi, salary, certificates, notifications
  mentor.ts             ai-mentor conversations
  instructor.ts         dashboard, sessions, sprints, submissions, reports
  admin.ts              dashboard, users, question-bank, templates, activity, audit
src/lib/use-api.ts      hook loading/error/reload
src/app/api/v1/[...path]/route.ts   ← MOCK REST SERVER (xóa khi swap)
src/lib/mock/                      ← dữ liệu seed của mock (xóa khi swap)
```

## 2. Ba bước swap

1. **Xóa mock**:
   ```bash
   rm -rf src/app/api/v1 src/app/api/mock src/lib/mock src/lib/use-mock.ts
   ```
2. **Cắm BE thật** — tạo `.env.local`:
   ```ini
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1
   ```
3. **Chạy lại** — `bun run dev`. Không sửa màn hình.

## 3. Ghi chú trung thực (khác biệt sandbox ↔ BE thật)

| Mục | Sandbox | BE thật | Xử lý khi swap |
|---|---|---|---|
| Đường dẫn + envelope | khớp (`{data, meta}`, `{message, code}`, Bearer) | — | Không cần sửa |
| Token hết hạn | mock token không hết hạn (preview) | JWT 20s + refresh | Cài refresh ở `client.ts` (tham khảo `src/lib/auth/` repo production) |
| Preview-extension field | `Task.points`, `Task.sprint` (tên), `Evaluation.criteria[].label/max`, `placement.weekLabel`… | `storyPoints`, `sprintId`+`sprint.name`, `criterionId/score/comment` | Đổi tên field trong adapter/parse — tập trung 1 nơi |
| `GET /auth/demo-accounts` | có (thẻ demo landing) | **không tồn tại** | Ẩn demo panel theo `NEXT_PUBLIC_PREVIEW` hoặc xóa |
| Endpoint preview gộp | `GET /sprints/preview-sprint/board` | `GET /intern/me/sprints/:id/board` | Truyền id sprint thật từ `GET /intern/me/sprints` |
| RBAC | Guard theo role (đủ 401/403/404/409) | Đầy đủ 52 permission code | Guard đã đúng ngữ nghĩa, chỉ cần test lại |

## 4. Quy tắc để giữ tính swap-ready khi phát triển tiếp

1. Màn hình **chỉ import** từ `@/lib/api/*` + `useApi` — không fetch thẳng, không import `@/lib/mock/*`.
2. Endpoint mới phải đặt **đúng đường dẫn BE thật** (tra `docs/BE_CAPABILITY_INVENTORY.md` của repo production nếu cần).
3. Field mới của DTO: ưu tiên tên field thật; nếu cần extension preview thì ghi vào bảng §3.
4. Mutation phải đi qua adapter (POST/PATCH) — không post trực tiếp.
5. Không thêm state mock vào component — state thuộc về mock server.
