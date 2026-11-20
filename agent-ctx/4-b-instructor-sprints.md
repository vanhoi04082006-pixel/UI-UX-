# Task 4-b — instructor-sprints.tsx: Sprint lifecycle actions (sync codex features)

## Scope
- ONLY file modified: `src/components/staff/instructor-sprints.tsx` (single route SPA, no new routes, no tests).
- Mock API + data (`src/app/api/mock/[...path]/route.ts`, `src/lib/mock/data.ts`) already existed — consumed only.

## Endpoints used
- GET `instructor/board` (useMock) — board now also read `board.status` for terminal stamp.
- GET `instructor/sprints` (useMock) — `{ sprints: Sprint[], transitions: Record<string, SprintStatus[]> }`.
- GET `instructor/sessions` (useMock) — for grouping + "Tạo Sprint" select + assignee datalist.
- POST `instructor/sprint-transition` `{sprintId, status}` — activate (no confirm), complete (confirm; server error "Sprint còn nhiệm vụ chưa hoàn thành..." kept open in modal), cancelled (confirm).
- POST `instructor/sprint-update` `{sprintId, name, goal, startsAt, endsAt}` — edit dialog, prefilled.
- POST `instructor/sprint-create` `{sessionId, name, goal, startsAt, endsAt}` — planned sprint.
- POST `instructor/task-create` `{sprintId, title, assignee, priority, points}` — task into Cần làm column.

## Changes (mục 1→5)
1. **Sprint của phiên** section above kanban: sprints grouped by session (SS-xxx + project); per sprint row: name, goal italic muted, `dd/MM → dd/MM`, status badge (planned dashed gray, active royal w/ live dot, completed green, cancelled red), progress MiniBar `done/totalTasks` + "còn N mở". Long list: `max-h-[26rem] overflow-y-auto` (global ink scrollbar).
2. **Lifecycle actions** driven by `transitions[s.id]`: planned → "Kích hoạt Sprint" (primary, no confirm); active → "Hoàn thành Sprint" (confirm modal, codex copy; server openTasks error shown inside modal, modal not closed); planned/active → "Hủy Sprint" (secondary + confirm modal w/ "Giữ Sprint" / "Xác nhận hủy Sprint", red DangerInkButton); "Sửa Sprint" (outline → prefilled dialog). Busy: disabled + "Đang xử lý…" / "Đang hủy…"; row errors inline `role="alert"` near buttons. All successes → toast + reloadAll (board+sprints+sessions).
3. **"Tạo Sprint"** button (codex DeliveryOverview): dialog w/ session select (non-cancelled), name, goal textarea, date inputs; client validation (name + dates + endsAt > startsAt); POST → toast "Đã tạo Sprint." + `role="status"` notice "Đã tạo Sprint.".
4. **"Tạo nhiệm vụ"** (codex TaskManagement allowCreate): dialog w/ sprint select (planned/active only), title, assignee text input (+datalist of session memberNames), priority select, story points 1–13; POST → toast "Đã giao nhiệm vụ."; board reloaded only when target sprint === board.id, else `role="status"` note "Nhiệm vụ mới hiện diện ở bảng Kanban của {boardShortName} — ...". Per-row "Giao việc" shortcut preselects that sprint.
5. **Kanban terminal state**: when `board.status` is completed/cancelled → StampMoc "Sprint đã hoàn thành"/"Sprint đã hủy" in header strip (replaces days-left badge, tape → slate) + MarginNote "bảng chỉ xem — lịch sử được giữ lại". Board itself stays read-only.

## Implementation notes
- Sub-components kept in same file: `SprintStatusBadge`, `DangerInkButton`, `TaskStatusIcon`; constants `SPRINT_STATUS_META`, `PRIORITY_OPTIONS`; helpers `fmtMD`, `boardShortName`, `validateDates`.
- Dialogs are shadcn `Dialog` + `Input/Textarea/Label/Select` + sonner `toast` — same patterns as instructor-sessions.tsx. Dialog close blocked while busy via `onOpenChange` guard.
- Page error branch restructured so sprint section renders even if board fetch fails; "Làm mới" reloads all three sources.

## Verification
- `bunx tsc --noEmit` → no errors under `src/` (filtered `rg "^src/"`, empty).
- `bunx eslint src/components/staff/instructor-sprints.tsx` → clean.
- Smoke tested all 4 POST endpoints via curl against running dev server; restored mutated in-memory mock data to natural demo state afterwards.
- `GET /` → 200; dev.log clean (no compile/runtime errors).
