# V-Intern FE — UI/UX hoàn chỉnh khớp BE (100% API coverage)

> **272/302 operations** của BE V-Intern QA API đã có adapter + UI FE gọi thật
> (30 ops còn lại: endpoint chi tiết/by-design + BE-side — phân loại đầy đủ trong
> `AUDIT-REPORT.md`; đặc tả contract trong `docs/api-specs/`).

## Chạy thử

```bash
bun install
bun run dev   # → http://localhost:3000 (port 3000)
```

Mặc định (`.env` đã cam kết repo) chạy **BE QA thật** qua tunnel:
```ini
NEXT_PUBLIC_API_BASE_URL=https://trance-bull-changelog-observe.trycloudflare.com/api/v1
```
URL tunnel đổi mỗi lần restart BE → cập nhật `.env` rồi restart. **Biến này bắt buộc** — thiếu nó mọi request ném `API_CONFIG_MISSING` (mock nội bộ đã gỡ khỏi hệ thống; lỗi thật hiển thị trực tiếp). Override cục bộ bằng `.env.local` (được gitignore).

**Tài khoản QA** (mật khẩu chung `Vq7!mK2pR9#tLx4H`): `qa.admin@vintern.test` · `qa.instructor@vintern.test` · `qa.intern@vintern.test`

## Màn hình công khai (không cần đăng nhập)

| Hash | Màn hình |
|---|---|
| `#/apply` | Cổng ứng tuyển 3 bước: chọn đợt → nộp CV (multipart, consent `cv-consent-v1`) → xác thực email + theo dõi hồ sơ |
| `#/verify` | Tra cứu chứng chỉ công khai (mộc HỢP LỆ / ĐÃ THU HỒI) |

## Workspace theo vai trò

**Sinh viên (intern):** Tổng quan · Công việc · Sprint Board · AI Mentor (Gemini thật) · GitHub · Phỏng vấn AI (16 ops) · Đánh giá · KPI & Lương ảo · Chứng nhận · Năng lực & Khuyến nghị AI · Thông báo · Hồ sơ

**Giảng viên (instructor):** Tổng quan · Phiên thực tập · Điều phối phiên (sessions + participation + replacement + GitHub + repo access) · Sprint & Task · Dự án & Mẫu (projects + templates) · Chấm bài · Chu kỳ đánh giá (evaluations + AI assist + code review) · Hiệu suất SV · Báo cáo · Lập kế hoạch AI · Thông báo · Hồ sơ

**Quản trị (admin):** Tổng quan · Người dùng · Nhóm & Phân quyền (groups + RBAC) · Vòng tuyển dụng (16 ops) · Nhật ký hệ thống (audit + activity) · Ngân hàng câu hỏi · Mẫu dự án · Dự án đang chạy · Chu kỳ đánh giá (criteria CRUD) · KPI & Lương ảo (periods + virtual salary) · Thư viện kiến thức (+ agent runs) · Danh mục & Nghề nghiệp · Chứng nhận (issue/revoke/PDF) · Vận hành & Cấu hình (system + AI config + mail + settings) · Thông báo · Hồ sơ

## Tài liệu

- `docs/SWAP-GUIDE.md` — kiến trúc adapter, 2 chế độ chạy, contract notes quan trọng
- `docs/api-specs/*.md` — đặc tả API theo tag (từ OpenAPI 248 paths)
- `docs/api-specs/live-shapes.md` — response shape THẬT (probe từ BE QA)
- `docs/api-specs/dto-fields.md` — trường DTO phát hiện qua validation probing
- `docs/AGENT-BRIEF.md` — quy ước design system + pattern tích hợp API

## Kiến trúc tích hợp

```
Màn hình (useApi) → src/lib/api/* (adapter parser chặt) → client.ts
  → Bearer + tự refresh 401 (mono-flight) → apiFetch (credentials include)
  → BE thật (NEXT_PUBLIC_API_BASE_URL — bắt buộc cấu hình)
```

Envelope hỗ trợ: `{data, meta}` · `{items, total}` · object phẳng — đúng từng endpoint BE.
