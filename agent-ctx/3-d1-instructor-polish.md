# Task 3-d1 — Port Journey Notebook v3 polish vào V-Intern FE (màn giảng viên)

Repo sửa (duy nhất): `/home/z/workspace/V-Intern-FE` — không commit, để lại trong working tree.
Nguồn tham khảo (read-only): `/home/z/my-project` (staff/instructor-*.tsx, instructor-shared.tsx) + `agent-ctx/4-a-instructor-sessions.md`.
Không dùng mock — toàn bộ dữ liệu từ API thật.

## Files changed (5 — đúng scope)

1. `src/components/workspace/workspace-ui.tsx` — `WorkspacePageHeader` nhận thêm props opt-in `eyebrow`, `stamp`, `stampTone` ("red"|"blue", default "red"): eyebrow là `<p className="eyebrow mb-1.5">` đặt NGOÀI `.workspace-page-header-row` (né rule `p` margin/muted của hàng tiêu đề), stamp là `<StampMoc>` (workspace/notebook) trong `relative shrink-0 pl-2 pt-1` giữa khối tiêu đề và action. `animate-marker-sweep` trên H1 giữ nguyên. Các consumer cũ không truyền props mới → không đổi hình.
2. `src/components/instructor/instructor-page-title.tsx` — nhánh `/instructor` gọi thẳng `WorkspacePageHeader` với `eyebrow ?? "Sổ tay hành trình · Giảng viên"` (nhãn default như sandbox StaffPageHeader) + `stamp`/`stampTone` truyền từ caller. 7 call site hiện có (project-library, recruitment-rounds, delivery-overview, session-list, reports-workspace, evaluation-management, member-performance) đều đã truyền eyebrow+stamp → giờ hiển thị lại trên /instructor. Nhánh product (admin/intern) dùng `PageTitle` như cũ.
3. `src/components/instructor/instructor-session-row.tsx` — xem Gap 2.
4. `src/components/product/evaluation-management.tsx` — xem Gap 3.
5. `src/components/product/primitives.tsx` — CHỈ AvatarStack (Gap 4), phần khác file giữ nguyên.

## Gap 1 — INSTRUCTOR PAGE HEADINGS: DONE
Eyebrow + mộc nghiêng hiển thị lại trên mọi trang /instructor (callers truyền sẵn; default eyebrow khi thiếu). Marker sweep giữ. Không đụng instructor-ui.tsx (ngoài scope) — nhánh InstructorPageTitle ghim trực tiếp WorkspacePageHeader (InstructorHeading không nhận back từ đây nên thay tương đương 100%).

## Gap 2 — SESSION ROW FLOURISHES: DONE (1/6 sub-item skipped vì dữ liệu)
- upcoming: `Tape variant="warm" rotate={-4}` (notebook/ui — `.nb-tape-warm` journey.css) `-top-3 left-7`, 64×20 inline + `relative` trên article.
- ending: `Tape` warm + `tape-gold` (journey.css định nghĩa SAU `.nb-tape-warm` trong cùng layer nên gold thắng; lưu ý: dùng notebook/ui Tape chứ KHÔNG dùng workspace Tape vì `.tape` trong globals.css đứng sau `.tape-gold` sẽ đè màu) + dòng font-hand `còn {daysToEnd} ngày là khép lại` (tính từ `row.endDate` thật, `Math.ceil((t-now)/86400000)`, clamp ≥0); upcoming thêm `bắt đầu sau X ngày` (đúng sandbox 342-353).
- cancelled: tem xám nghiêng 9° "Đã hủy" aria-hidden pointer-events-none chính giữa thẻ (tránh đè cột link), `opacity-75` trên article, badge đổi `StatusDot tone="red"` (label "Đã hủy" giữ nguyên; type prop mở rộng thêm "red" — widen tương thích ngược).
- active: badge tự dựng mirror 100% markup `StatusDot` (`product-status nb3-chip ... gap-2`) nhưng dot là `ws-dot-live` (journey.css, ping-soft, tôn trọng reduced-motion).
- SKIPPED: member initials pills — `SessionOverviewRow` chỉ có `memberCount`; API list `/sessions/overview` không trả tên thành viên (tên chỉ có trong `/sessions/{id}` detail) và `src/lib/**` bị cấm sửa. Không thể render initials thật không phải mock → bỏ, ghi rõ ở đây.

## Gap 3 — GRADING MICRO-INTERACTIONS: DONE (có 2 điều chỉnh mapping trung thực)
- Stepper ±0,25 điểm mỗi tiêu chí: 2 nút tròn viền mực 44px (IconX/IconPlus), `type="button"`, clamp 0…`c.maxScore` (real), disabled theo `action.busy`, chỉ render khi `!locked` (view finalized giữ nguyên như cũ). Điều chỉnh state `scores` thật — input/min/max/required giữ nguyên byte-for-byte.
- Quick chips: "theo AI" (điền `suggestedScore` thật từ gợi ý mới nhất, chỉ render khi có) + "tối đa" (điền `c.maxScore` thật). Chip "8.0"/"8.5" cố định của sandbox KHÔNG port vì thang điểm production theo tiêu chí (maxScore biến thiên) — thay bằng "tối đa" cùng ý nghĩa quick-fill.
- Spark-bar: `AiScoreSparkBar` (`.spark-bar` + `data-tone` success/warning/danger theo tỉ lệ ≥0.8/≥0.65) dưới mỗi dòng "AI đề xuất {n}" trong panel gợi ý + chi tiết lịch sử gợi ý — vẽ tỉ lệ suggestedScore/maxScore thật. Hàng chờ (list evaluations) KHÔNG có điểm AI trong API (chỉ overallScore chính thức) → không vẽ bar ở đó.
- Chốt đánh giá thành công → `fireSeal(reload)`: mộc đỏ `ĐÃ DUYỆT` (StampMoc red, rotate -8, thump) bay trên nút + `ConfettiBurst` (6 hạt inline style dùng keyframe `confetti-burst` + `--confetti-N` sẵn có trong journey.css vì tiện ích `.confetti-pop` chưa được port — đúng luật "missing → inline, never shared CSS"); reload hoãn ~750ms cho kịp nhịp đóng dấu (đúng sandbox stamping 700ms; ai cho 750). Reduced-motion (matchMedia) → bỏ nhịp, reload ngay như trước. Nút disable thêm `|| sealing` chống double-finalize. API call + điều kiện + copy giữ nguyên.
- Lỗi inline: ErrorState trong ScoreEditor bọc `<span key={String(action.error)} className="animate-shake-ink block">` — lỗi mới phát lại nhịp rung mực (pattern key={error} như sandbox formError). Các ErrorState khác trong file (Cycle/Criterion forms) giữ nguyên — ngoài phạm vi grading của gap.

## Gap 4 — AVATARSTACK REAL INITIALS: DONE (additive, không ai truyền names hôm nay → không đổi hình ai)
`AvatarStack({ count, names? })`: có `names` (họ thật, lọc rỗng) → hạt initials thật (2 chữ cuối) 4 tông giấy note xoay vòng (`--blue-mist/royal`, `--note-yellow`, `--note-pink`, `--note-mint` + ink) viền mực 1.5px, `role="img"` + aria-label liệt kê tên, `title` từng hạt, pill `+N` khi dư; thiếu names → render y nguyên nhánh generic "SV" cũ (byte-identical). Consumer hiện tại (instructor-dashboard, academic) chỉ truyền `count` → không đổi hình.

## Kiểm chứng
- `bunx tsc --noEmit` — 0 lỗi toàn repo tại thời điểm cuối (giữa chừng có lỗi thoáng qua ở file anh em đang sửa song song: admin-management/outcomes/templates-manager/auth/intern — KHÔNG thuộc scope tôi, cuối chạy lại sạch).
- `bunx eslint` trên 5 file sửa — sạch.
- Vitest (theo grep test files import组件 bị đụng): sessions/overview (18), sessions/instructor-home (3), instructor/evaluation-cycle-feedback (1), instructor/instructor-evaluation-draft (4), instructor/instructor-session-summary (2), product/primitives-pager (2), product/nested-modal (1), product/performance (1), projects/library, sessions/reports-workspace, sessions/delivery, sessions/session-setup, sessions/sprint-workspace, sessions/plan-editor, applications/recruitment-tabs — TẤT CẢ PASS. Tổng hai đợt chạy: 13 + 118 = 131 tests / 26 files green (có file chồng nhau giữa các đợt).
- Không sửa test nào. Không sửa CSS. Không đụng file cấm.

## Ghi chú cho agent sau
- `.tape-gold` chỉ thắng khi đi với `.nb-tape` (notebook/ui Tape); đi với `.tape` (workspace Tape/doodles) thì bị globals.css đè màu — nhớ dùng đúng cặp.
- AvatarStack giờ sẵn sàng nhận `names` — khi nào có endpoint trả tên ở list (hiện chỉ `/sessions/{id}` detail có) chỉ cần truyền vào, không cần sửa primitives nữa.
- fireSeal/reduced-motion: trong vitest, matchMedia polyfill giả lập reduce → test vẫn thấy reload tức thì (deterministic).
