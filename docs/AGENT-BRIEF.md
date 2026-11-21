# AGENT BRIEF — Xây dựng màn hình V-Intern theo contract BE thật

Tài liệu này là BẮT BUỘC đọc trước khi viết bất kỳ màn hình nào. Mục tiêu: **FE khớp BE 100%** (đúng path, đúng method, đúng body, đúng envelope response).

## 1. Ngữ cảnh dự án

- Next.js 16 App Router + TypeScript + Tailwind CSS 4, mọi màn là client component (`"use client"`).
- SPA một route `/` — điều hướng bằng zustand store (`src/lib/store.ts`), hash `#/{role}/{route}`.
- BE thật đang chạy: `https://trance-bull-changelog-observe.trycloudflare.com/api/v1` (đã set trong `.env.local` qua `NEXT_PUBLIC_API_BASE_URL`). CORS + cookie đã bật cho origin preview.
- Tài khoản test (mật khẩu chung `Vq7!mK2pR9#tLx4H`): `qa.admin@vintern.test` (admin), `qa.instructor@vintern.test` (instructor), `qa.intern@vintern.test` (intern).
- Tài liệu API: `docs/api-specs/*.md` (đặc tả theo tag), `docs/api-specs/live-shapes.md` (shape THẬT đã probe), `docs/api-specs/dto-fields.md` (trường DTO phát hiện qua validation), `docs/api-specs/SCHEMAS.md` (schema chi tiết).
- OpenAPI gốc: `docs/api-specs/openapi-qa.json (bản gốc từ BE team)` (248 paths / 302 ops).

## 2. Pattern tích hợp API (BẮT BUỘC theo đúng)

### 2.1. Adapter layer — mỗi domain một file trong `src/lib/api/`

Đọc ví dụ chuẩn: `src/lib/api/outcomes.ts` (parser chặt), `src/lib/api/parse.ts` (bộ parser), `src/lib/api/client.ts` (request + refresh 401), `src/lib/api/api-client.ts` (fetch nền + ApiError + errorMessage).

```ts
"use client";
import { request } from "./client";
import { array, number, parsePage, record, string, nullable, boolean } from "./parse";

// GET list phân trang {data, meta} → parsePage
export async function listX(): Promise<X[]> {
  const body = await request("/x?page=1&pageSize=20", (v) => parsePage(v, parseX));
  return body.items;
}
// GET list {items, total} (BE dùng 2 envelope!) → parse thủ công:
export async function listY(): Promise<Y[]> {
  const body = await request("/y?page=1&pageSize=20", (v) => {
    const r = record(v);
    return array(r.items, parseY);
  });
  return body;
}
// POST/PATCH mutation:
export async function createX(input: CreateXInput): Promise<X> {
  return request("/x", parseX, { method: "POST", body: input });
}
```

**QUY TẮC THẮNG:**
- Path bắt đầu bằng `/` (KHÔNG có `/api/v1` — client tự ghép).
- Dùng parser chặt từ `./parse` — KHÔNG `as any`, KHÔNG cast kiểu trực tiếp.
- Với field có thể vắng mặt → `nullable(v.field, string) ?? fallback`. Ưu tiên defensive parse vì một số response BE không khai báo schema trong OpenAPI.
- Mutation dùng `errorMessage(err)` từ `api-client.ts` khi toast lỗi.
- Endpoint trả 204 → request trả null.
- Download PDF/XLSX/CV: dùng `apiFetch` với `responseType: "blob" | "xlsx" | "cv"` + token — xem `src/lib/api/api-client.ts`.
- **Envelope khác nhau theo endpoint** — đối chiếu `live-shapes.md`: nhóm `{data, meta}` (users, sessions, tasks, sprints, projects, project-templates, groups, roles, permissions, catalogs, notifications, audit-logs, activity-events, assignments, submissions) vs nhóm `{items, total}` (recruitment-rounds, admin/knowledge, admin/career-roles, evaluation-cycles, kpi-periods, virtual-salary, certificates, evaluations, performance/interns, imported-reviews, recruitment/me/interviews, intern/me/kpi, intern/me/certificates, participation/me) vs object phẳng (github/me, recruitment/me, intern/me/performance, admin/system/*, admin/ai-configuration, settings, dashboard/*).

### 2.2. Screen layer — dùng hook useApi

Đọc `src/lib/use-api.ts`. Pattern trong màn hình:

```tsx
const { data, loading, error, reload } = useApi(fetcher, [deps]);
if (loading) return <PencilLines rows={3} />;
if (error) return <SectionError message={error} onRetry={reload} />;
if (!data || data.length === 0) return <EmptyState icon={VInbox} title="..." note="..." />;
```

Mutation: `const [busy, setBusy] = useState(false>` + try/catch + `toast.success(...)` / `toast.error(errorMessage(err))` + `reload()`.

## 3. Design system (BẮT BUỘC giữ phong cách "sổ tay vẽ tay")

**Đọc các file sau TRƯỚC khi viết UI:**
- `src/components/staff/staff-kit.tsx` — StaffPageHeader, ChipGroup, SectionError, PencilLines, EmptyState, SketchInput, SketchTextarea, CountUpNumber, ROLE_META, initialsOf, relativeVN.
- `src/components/notebook/ui.tsx` — SketchCard, InkBadge, Eyebrow, MarginNote, NoteCard, Tape, StampMoc, formatDateVN, formatDateTimeVN, formatMoneyVND, TASK_STATUS_META, PRIORITY_META...
- `src/components/notebook/reveal.tsx` — InkButton, Stagger, StaggerItem.
- `src/components/icons/v-icons.tsx` — bộ icon V* (dùng icon này, KHÔNG dùng lucide trực tiếp trong màn staff).
- Màn hình mẫu đẹp: `src/components/staff/admin-users.tsx`, `src/components/staff/instructor-sessions.tsx` (bảng + filter + dialog), `src/components/staff/admin-questions.tsx` (CRUD form).

**Nguyên tắc style:**
- Màu: dùng CSS var `var(--ink)`, `var(--ink-soft)`, `var(--paper)`, `var(--paper-raised)`, `var(--royal)`, `var(--blue-mist)`, `var(--danger)`, `var(--mint)`. KHÔNG dùng màu indigo/blue Tailwind.
- Viền nét vẽ tay: `sketch-border-thin`, `border-2 border-[var(--ink)]`, bo góc lệch `rounded-[9px_11px_10px_12px]`.
- Badge: `<InkBadge tone="neutral|blue|amber|green|mint|pink|red" dot>` — tự thêm tone map cho status mới nếu cần (xem CATEGORY_TONE trong bell-utils làm mẫu).
- Nút: `<InkButton variant="solid|outline" size="sm|md">`.
- Card: `<SketchCard hover>` — padding `p-4`/`p-5`, gap `gap-4`.
- Bảng dài: wrapper `max-h-96 overflow-y-auto` (list ngang) hoặc phân trang bằng nút.
- Header trang: `<StaffPageHeader eyebrow="..." title="..." sub="..." icon={VX} actions={...} />`.
- Tiêu đề tiếng Việt, số liệu `toLocaleString("vi-VN")`, ngày `formatDateVN`/`formatDateTimeVN`.
- Responsive: mobile-first, table → card stack trên mobile (`hidden md:table-row-group` + bản card `md:hidden`), min 44px touch target.
- Skeleton khi loading, EmptyState khi rỗng, SectionError khi lỗi — KHÔNG bao giờ màn trắng.
- Chỉ dùng shadcn/ui có sẵn trong `src/components/ui/` (Dialog, Select, Tabs...) khi cần; ưu tiên kit của dự án.
- Toast: `import { toast } from "sonner"`.

## 4. Quy ước domain

- Role hiện tại: `useApp((s) => s.user)` → `user.role`. Màn admin/instructor không cần check role (sidebar đã lọc), nhưng render theo permission khi hợp lý.
- Thời gian ISO 8601 UTC — hiển thị qua formatDateVN/formatDateTimeVN.
- ID là UUID — luôn `encodeURIComponent(id)` khi đặt vào path.
- Lỗi 429 → errorMessage đã dịch "thao tác quá nhanh". AI endpoints throttle thấp (5-15/phút) — throttle-guard bằng disabled nút khi busy.
- 403 → "Bạn không có quyền thực hiện thao tác này."
- Pagination: `page` & `pageSize` (max 100). Response có `total`/`meta.total`.

## 5. Quy tắc làm việc khi viết file

- CHỈ tạo/sửa các file được giao trong task. KHÔNG sửa: `store.ts`, `app-shell.tsx`, `page.tsx`, `api-client.ts`, `client.ts`, `parse.ts`, `auth.ts`, mock files, các màn của task khác.
- File màn hình đặt đúng path được giao, export default component.
- Sau khi viết xong: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -v "examples/\|skills/"` phải sạch lỗi cho file của mình.
- KHÔNG viết test. KHÔNG đổi package.json.
- Comment đầu file: mô tả màn hình + danh sách endpoint BE mà màn đó cover (kiểm tra tính "đủ 100%").
