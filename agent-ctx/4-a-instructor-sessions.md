# Task 4-a — Đồng bộ codex vào màn "Phiên thực tập" (giảng viên)

File sửa (duy nhất): `src/components/staff/instructor-sessions.tsx`
Nhánh nguồn: codex/product-acceptance-20261116 (SessionLifecycleActions + AssignmentCompletion)

## 1. Trạng thái mới ending / cancelled
- Import `sessionStatusLabel` từ `@/lib/mock/data` làm nguồn nhãn duy nhất: active="Đang diễn ra", upcoming="Sắp khởi động", ending="Sắp kết thúc", closed="Đã hoàn thành", cancelled="Đã hủy".
- `STATUS_TONE` local (không sửa instructor-shared): active=green, upcoming=blue, ending=amber, closed=neutral, cancelled=red.
- Bộ lọc: thêm 2 chip mới "Sắp kết thúc" (ending) và "Đã hủy" (cancelled), đếm số như các chip cũ; `SessionFilter` = all | active | upcoming | ending | closed | cancelled.
- Thẻ phiên: ending có băng dính `tape-gold` + dòng tay "còn X ngày là khép lại" (VHourglass); cancelled mờ (opacity-75) + tem xám nghiêng "ĐÃ HỦY" (decorative, aria-hidden) + badge đỏ + MiniBar tone danger.

## 2. Hành động vòng đời phiên (dialog chi tiết, khối "Vòng đời phiên")
- active → "Chuyển sang Sắp kết thúc": POST `instructor/session-transition` {sessionId, status:"ending"} — không confirm, bấm chạy luôn.
- active/ending → "Hoàn thành phiên": modal xác nhận copy codex ("Kiểm tra nhiệm vụ, đánh giá và hoàn tất các phân công...lịch sử được giữ.") + "Giữ phiên" / "Xác nhận hoàn thành phiên" (royal).
- active/ending/upcoming → "Hủy phiên": modal xác nhận copy codex + "Giữ phiên" / "Xác nhận hủy phiên" (coal/đen).
- upcoming chỉ thấy "Hủy phiên"; KHÔNG có nút chuyển sang active (đúng tinh thần codex).
- Busy: state `busyAction`, mọi nút disable, nút đang chạy hiển thị "Đang xử lý…". Lỗi server hiện `role="alert"` gần nút (pattern animate-shake-ink như formError cũ, hiển thị cả trong modal xác nhận). Thành công: `reload()` + `toast.success` (3 thông điệp riêng cho ending/closed/cancelled).
- Modal xác nhận chặn đóng khi busy: guard `onOpenChange` + ẩn nút X (`showCloseButton={busyAction === null}`).

## 3. Thành viên + hoàn thành phân công
- `memberRowsOf` đổi sang `memberDetails` (tên + email + assignmentStatus), fallback `memberNames` khi thiếu (email rỗng → không có nút).
- Bảng trong dialog: cột Thành viên (tên + initials + email mono), Vai trò, Phân công (completed → badge green "Phân công đã hoàn thành"; active → badge blue "Đang thực hiện"), Thao tác.
- Nút "Hoàn thành phân công" cho thành viên active khi session active/ending/closed → modal xác nhận copy codex ("Xác nhận {tên} đã hoàn tất công việc được giao...được giữ lại.") + "Giữ phân công" / "Xác nhận hoàn thành phân công" → POST `instructor/assignment-complete` {sessionId, memberEmail} → `reload()` + toast.
- 3 ô tóm tắt đổi theo assignmentStatus: Hoàn thành (done) / Đang làm (active) / Thành viên (total); cập nhật MarginNote.

## Kiểm chứng
- `bunx tsc --noEmit` — 0 lỗi ở `src/` (chỉ còn lỗi examples/ + skills/ như spec cho phép bỏ qua).
- `bun run lint` — sạch; dev.log compile OK, `/` 200.
- Curl mock API: session-transition ss-2 → ending OK; assignment-complete (ss-1, minh) → completed OK; transition sai (ss-4 closed → ending) → 409 kèm message tiếng Việt hiển thị đúng qua pattern lỗi.
- Ghi chú: đã thử nghiệm trên server dev đang chạy nên state mock giữ lại: ss-2 đang "ending", phân công Nguyễn Minh (ss-1) đã completed — chính là dữ liệu demo cho tính năng mới.

Ghi chú cho agent sau: `SESSION_STATUS` trong instructor-shared.tsx chỉ có 3 trạng thái cũ — các file khác muốn ending/cancelled thì tự map như file này (tone local + sessionStatusLabel).
