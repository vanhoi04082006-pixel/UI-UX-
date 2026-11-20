# Task 4-d — Sync codex fixes nhỏ: ThemeToggle a11y + shell mobile + grading/templates/mentor

Files được phép: theme-toggle.tsx, app-shell.tsx, instructor-grading.tsx, admin-templates.tsx, student-mentor.tsx.
Thực tế chỉ **theme-toggle.tsx** cần sửa; 4 file còn lại đã được kiểm tra hiện trạng và giữ nguyên (lý do từng mục bên dưới).

## A) theme-toggle.tsx — bàn phím cho radiogroup (fix a11y codex) — ĐÃ LÀM
- **Hiện trạng thực tế khác mô tả nhiệm vụ**: file vốn là **1 nút bấm đơn** (aria-pressed, toggle light/dark qua resolvedTheme), KHÔNG phải radiogroup 3 lựa chọn như mô tả (đã đối chiếu git history — file chưa từng có radiogroup).
- **Vì sao 2 lựa chọn thay vì 3 (sáng/tối/hệ thống)**: `src/app/layout.tsx` (ngoài danh sách file được phép) cấu hình `ThemeProvider enableSystem={false}`, `defaultTheme="light"`, `storageKey="v-intern-theme"` + bootstrap script chỉ hiểu giá trị `"dark"`/rỗng. Một radio "Hệ thống" sẽ không persist / không theo OS sau reload (bootstrap sẽ ép light) → chọn implementation radiogroup với đúng 2 preference thật (khớp luôn nhãn "Giao diện sáng / tối" sẵn có ở staff-profile).
- Đã dựng lại component thành **radiogroup 2 radio** (Sáng — theme giấy kem / Tối — theme bảng đen), giữ nguyên ngôn ngữ thẩm mỹ cũ (focus-ink, sticker-pop, border-2 ink, paper-raised, shadow-ink-2, rounded-full, hover translate, royal khi checked, dark:text-[#101018]) + pattern `mounted` useSyncExternalStore chống lệch hydrat (trước mount: placeholder span, không radio nào checked → markup 2 bên giống hệt).
- **Đầy đủ điều hướng phím theo spec codex**: ArrowRight/ArrowDown → `(index+1) % length`; ArrowLeft/ArrowUp → `(index-1+length) % length`; Home → 0; End → length-1; mọi phím xử lý đều `e.preventDefault()`; sau khi đổi preference → `buttons.current[next]?.focus()` (mảng ref `useRef<(HTMLButtonElement|null)[]>`, ref callback block-body trả void — chuẩn React 19).
- Roving tabindex chuẩn radiogroup (checked → 0, còn lại -1; trước mount mục đầu tabbable được), click cũng focus lại (Safari không focus nút khi bấm). aria-label tiếng Việt: group "Chọn giao diện: sáng hoặc tối", từng nút "Sáng — theme giấy kem"/"Tối — theme bảng đen". Signature `({ className })` giữ nguyên — 5 nơi dùng (app-shell topbar, auth-screen, navbar×2, staff-profile) không phải sửa, footprint 76×40px nên không phá layout.

## B) app-shell.tsx — theme toggle trên mobile — GIỮ NGUYÊN (bỏ qua theo đúng điều kiện nhiệm vụ)
- ThemeToggle nằm trong Topbar (`<div className="flex shrink-0 items-center gap-2">`, cạnh palette/bell/logout) **không có class ẩn nào** (không `hidden md:block`, không nằm trong vùng collapse) → hiển thị ở **mọi breakpoint**, kể cả mobile (header luôn render; nút menu `lg:hidden` chỉ thêm chứ không thay thế). Điều kiện "nếu nó đã luôn hiện ở mọi breakpoint thì bỏ mục này" thỏa → không cần thêm khối "Giao diện" vào drawer mobile.

## C) instructor-grading.tsx — hai fix codex — GIỮ NGUYÊN (không có cấu trúc đích)
1. **reloadCriteria (xóa lỗi cũ trước khi reload sau hành động)**: luồng chấm của màn này là **ghi đè cục bộ** (`overrides`, comment gốc: "Ghi đè cục bộ sau khi chấm — không đụng vào dữ liệu gốc từ API") — approve/cần sửa KHÔNG gọi POST, KHÔNG gọi `reload()`; mock API không có endpoint POST nào cho grading (route.ts chỉ có GET instructor/grading), và file route API nằm ngoài danh sách được phép sửa nên không thể bổ sung endpoint. Không tồn tại "callback reload sau hành động" nào để áp pattern. Ý nghĩa cốt lõi của fix (không còn lỗi cũ quanh luồng chấm) **đã có sẵn**: `approve()` → `setFormError(null)` trước khi đóng dấu; `requestChanges()`/`confirmRequestChanges()` → `setReasonError(null)` trước khi gửi; `openGrading()`/`closeDialog()` reset mọi error state.
2. **AI gợi ý version bump**: dialog hiển thị gợi ý AI **tĩnh từ dữ liệu bài nộp** (`active.aiScore`/`active.notes`) — không có nút "chạy lại gợi ý AI", không state gợi ý động → ghi chú bỏ qua đúng theo điều kiện nhiệm vụ.

## D) admin-templates.tsx — reload sau khi khởi tạo phiên từ mẫu — GIỮ NGUYÊN (ghi chú bỏ qua)
- Dialog chi tiết template chỉ có 1 nút "Chuyển sang Nội bộ/Công khai" (toggle trạng thái **mô phỏng** client-side qua `overrides` + toast "(mô phỏng)"); **không có luồng "Bắt đúng phiên/Bắt đầu phiên/mở phiên"** nào, mock API cũng không có endpoint tạo phiên từ template → rơi đúng nhánh "Nếu dữ liệu chỉ client-side không có tạo phiên thật thì ghi chú bỏ qua".

## E) Tiêu đề trạng thái lỗi (codex data-state) — KHÔNG CÓ NƠI ĐỔI (đã audit)
- Grep toàn bộ 4 file được phép: **không có chuỗi "Không thể tải dữ liệu"** (hay biến thể tiêu đề dạng đó) nào trong file. Các tiêu đề lỗi generic nằm ở shared kit **ngoài danh sách được phép**: instructor-shared `ErrorState` ("Hổng tải được dữ liệu rồi..."), staff-kit `SectionError` ("Không tải được dữ liệu") — đều là lỗi GET thuần (E cho phép giữ nguyên), và không được phép sửa theo giới hạn file.
- Lỗi POST duy nhất trong file được phép là toast của student-mentor ("AI Mentor đang bận — câu hỏi đã giữ lại, gửi lại giúp mình nhé!") — copy cụ thể + kèm hành động khắc phục, không thuộc dạng "Không thể tải dữ liệu" nên giữ nguyên (đúng tinh thần ưu tiên thông tin actionable).
- Các fallback trong file được phép đều là GET thuần: admin-templates "Chưa tải được danh sách mẫu dự án." → giữ theo quy tắc E.

## Kiểm chứng
- `bunx tsc --noEmit | rg "^src/"` → **0 lỗi cho các file của task 4-d** (theme-toggle lint + type sạch). Thời điểm chụp còn 2 lỗi TS1005 tạm thời ở `student-kpi.tsx` — file **đang được agent song song (task khác) sửa dở** (git status xuất hiện `M student-kpi.tsx`, `M student-work.tsx` trong lúc làm; ngoài danh sách file được phép của 4-d, không đụng vào). Nếu log này vẫn còn lỗi student-kpi khi đọc: chờ agent song song hoàn tất.
- `bunx eslint src/components/shared/theme-toggle.tsx` → sạch.
- dev.log: các lần "✓ Compiled" sau khi sửa không có lỗi liên quan theme-toggle; các dòng GET/POST mock API đều 200. (HTTP 500 thoáng qua trên `/` do student-kpi.tsx của agent song song — import trace xác nhận, không phải file của 4-d.)
- Không phá localStorage session (session store là useApp/lib/store — không đụng); storageKey theme "v-intern-theme" giữ nguyên cơ chế.

## Ghi chú cho agent sau
- ThemeToggle giờ là radiogroup 2 radio (không còn aria-pressed đơn). Nếu sau này muốn thêm "Hệ thống": phải bật `enableSystem` + sửa bootstrap script trong layout.tsx trước.
- app-shell không cần khối "Giao diện" ở drawer mobile vì toggle đã luôn hiện ở topbar mọi breakpoint.
