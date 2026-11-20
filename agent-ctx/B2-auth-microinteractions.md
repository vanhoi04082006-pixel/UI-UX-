# Task B2 — Port auth micro-interactions (strength meter / CapsLock / shake-ink) vào repo thật

Repo thật: /home/z/workspace/V-Intern-FE-real (branch codex/product-acceptance-20261116).
Nguồn tham chiếu sandbox: /home/z/my-project/src/components/auth/auth-screen.tsx
(PasswordStrength ~407, CapsLock ~199-256, shake-ink ~374/914/1029/1186/1382).

Tổng quan: 1 file mới + 4 file sửa (toàn bộ additive, thuần UI). KHÔNG đụng
API/validation/redirect/lib. Toàn test suite repo (135 files / 787 tests) PASS sau thay đổi.

## 1. Files tạo / sửa

### Tạo: `src/components/auth/password-strength.tsx` (MỚI)
- Port y hệt sandbox `PasswordStrength` (logic + label + markup, chỉ thêm JSDoc tiếng Việt + export named):
  - `scorePassword`: <8 ký tự → tối đa "Yếu" (score 1); ≥8 → +1 nếu có cả lower+upper, +1 nếu có digit, +1 nếu ký tự đặc biệt hoặc length ≥14; cap 4.
  - `STRENGTH_LEVELS`: Yếu=var(--danger) / Trung bình=var(--warning) / Khá=var(--success) / Mạnh=var(--success).
  - Markup verbatim: `role="meter"` + aria-valuenow/min/max + aria-label "Độ mạnh mật khẩu: {label}", 4 vạch `h-[7px] rounded-[4px_5px_4px_5px] border-2` (đặc khi được, dashed mờ 35% khi chưa), label uppercase cỡ 0.7rem màu theo mức.
- KHÔNG cần thêm CSS nào vào journey.css: mọi phụ thuộc đã có sẵn —
  `--danger` (journey.css của Agent A, light #c0272d / dark #ff627a), `--warning`/`--success`/`--ink` (tokens.css), các utility Tailwind (`rounded-[4px_5px_4px_5px]`, `border-[color-mix(in_srgb,var(--ink)_35%,transparent)]`…) sinh bình thường dưới TW4 — đã kiểm chứng bằng cách build globals.css qua @tailwindcss/postcss rồi grep CSS output (xác nhận `.animate-shake-ink`, `.font-hand`, `.text-[var(--warning)]`, `.border-[color-mix(...)]`, keyframes `shake-ink` đều có mặt).
- Component UI thuần: không state, không hook, không "use client" (giống AuthField/AuthAlert — chỉ được import từ client components).

### Sửa: `src/components/auth/password-field.tsx` (additive)
- Thêm state `capsOn` + hàm helper `readCapsLock` (guard `typeof getModifierState === "function"` cho môi trường thiếu API).
- Trên `<input>`: gắn `onKeyDown`/`onKeyUp` → `setCapsOn(e.getModifierState("CapsLock"))`, `onBlur` → `setCapsOn(false)`. Các handler của consumer (nếu truyền qua props) được gọi lại sau handler nội bộ (`onKeyDown?.(event)`) — hiện chưa consumer nào truyền, nhưng hành vi preserve 100%.
- Render hint khi capsOn: `<p role="status" className="auth-caps-note mt-1.5 font-hand text-[0.84rem] font-medium text-[var(--warning)]">Caps Lock đang bật</p>` — đúng sandbox (font viết tay + màu warning), đặt giữa input và hint/error note.
- Giữ nguyên: prop signature `PasswordFieldProps`, show/hide toggle, aria-label/aria-pressed tiếng Việt, aria-describedby wiring, error/hint rendering, class input. (Lưu ý nhỏ: destructured onKeyDown/onKeyUp/onBlur ra khỏi `...inputProps` spread rồi gắn lại handler compose — không thay đổi DOM/behavior với các usage hiện tại.)

### Sửa: `src/components/auth/login-form.tsx` (additive)
- AuthAlert lỗi nhận thêm class `animate-shake-ink` khi `status === "auth-error" || status === "system-error"` (giữ `"mt-4"`).
- KHÔNG shake cho `not-connected` (variant info / role="status" — tương đương loginNotice kiểu info ở sandbox cũng không shake) và `success`.
- Không cần key/nonce replay như sandbox: alert unmount khi status → "submitting" nên mỗi lần lỗi mới alert mount lại → animation tự chạy lại. Không đụng gì tới submit handler.

### Sửa: `src/components/auth/register-form.tsx` (additive)
- Import `PasswordStrength`; ô register-password được wrap trong `<div>` (giữ grid `sm:grid-cols-2` nguyên vẹn — wrapper trở thành grid item thay cho PasswordField) và render `{password.length > 0 ? <PasswordStrength password={password} /> : null}` ngay dưới PasswordField (mirror sandbox line 1353).

### Sửa: `src/components/auth/change-password.tsx` (additive)
- Import `PasswordStrength`; thêm state mirror `newPasswordValue` + `onChange` trên PasswordField "Mật khẩu mới" (input VẪN uncontrolled — submit đọc FormData như cũ; onChange chỉ để vẽ meter).
- Wrap field + `{newPasswordValue.length > 0 && <PasswordStrength .../>}` trong `<div>` để meter dính sát ô của nó trong form `space-y-4` (mirror sandbox line 1006 pattern).

### Bỏ qua đúng chỉ thị: `forgot-password-form.tsx`
- Đã đọc kỹ: chỉ có AuthField email (validateEmail / requestPasswordReset) — KHÔNG có password input → skip đúng task 7. Không sửa file này.

## 2. Gắn vào state thật nào

- **CapsLock**: state nội bộ `capsOn` của PasswordField — kích hoạt từ keydown/keyup vật lý trên chính ô mật khẩu (login-password, register-password, register-confirm, current/new/confirm-password ở change-password — mọi nơi dùng PasswordField đều có miễn phí).
- **Strength meter register**: state `password` đã có của RegisterForm (controlled) — không thêm nguồn dữ liệu nào.
- **Strength meter change-password**: state mirror `newPasswordValue` — form vẫn uncontrolled, FormData submit giữ nguyên.
- **Shake-ink login**: state `status` đã có ("auth-error"/"system-error") — class CSS thuần, không đụng state machine.

## 3. Xác nhận KHÔNG đổi API / validation / redirect

Các call site giữ nguyên 100% (đã đối chiếu diff):
- login-form.tsx: `login({identifier, password, remember})`, `resolveLoginLanding(result.user)` + `router.replace(...)`, `validateLogin`, `errorMessage`, `pendingLogin` ref guard, focusField, `clearBoxAlerts`, googleNotice.
- register-form.tsx: `validateRegister`, `register({fullName, email, password, acceptedTerms})`, focusFirstInvalid, success UI, redirect link /login.
- change-password.tsx: `fetchCurrentUser` guard + `router.replace("/login")`, `new FormData(event.currentTarget)`, `request("/auth/change-password", ...)` với body `{currentPassword, newPassword}`, `clearSession()`, `notifyOtherTabs("session-changed")`, `router.replace("/login?password=changed")`, useAction.
- password-field.tsx: giữ nguyên prop signature + mọi aria/hint/error behavior (6 usage sites: login×1, register×2, change-password×3 — không phải sửa chỗ nào dùng nó).
- KHÔNG import/crear demo-account panel, mock data, fake API. Không sửa lib/. Không sửa auth-service/api-client/validation/landing/session.

## 4. Kiểm chứng

- `bunx tsc --noEmit` → 0 lỗi.
- `bunx eslint` (5 file auth của mình) → sạch.
- `bunx vitest run src/components/auth` → 6 files / 38 tests PASS (auth-shell, auth-tabs, can, login-form, register-form, workspace-guard).
- `bunx vitest run` (FULL suite) → **135 files / 787 tests PASS**.
- Build CSS qua @tailwindcss/postcss + grep output: `.animate-shake-ink`, `@keyframes shake-ink`, `.font-hand`, `.text-[var(--warning)]`, `.border-[color-mix(in_srgb,var(--ink)_35%,transparent)]`, radius 4px 5px 4px 5px, `--danger` light/dark — tất cả đều sinh ra đúng.
- dev.log (sandbox /home/z/my-project): lành — không có lỗi liên quan (ta không sửa gì sandbox).

Ghi chú môi trường: node_modules của repo thật rỗng khi bắt đầu (bun install gốc lúc 11:04 chết dở, log /tmp/bun-install-fe.log chỉ 81 bytes không có dòng hoàn tất, không còn process). Mình đã chạy lại `bun install` trong repo (482 packages, 2.71s) để chạy được test. Side-effect: tạo file `bun.lock` (untracked — bun migrate từ package-lock.json); team có thể commit hoặc bỏ tùy policy.
Lưu ý: `src/components/v-intern/how-it-works.tsx` đang modified trong git status — KHÔNG phải của B2 (agent song song đang sửa landing; không đụng).

## 5. Vấn đề chưa giải quyết

- Không có issue chức năng nào còn mở.
- Nhược điểm thiết kế nhỏ (chấp nhận được): CapsLock detection chỉ chạy khi có sự kiện bàn phím thật (đúng sandbox); với jsdom/userEvent `getModifierState("CapsLock")` = false nên hint không xuất hiện trong test → không ảnh hưởng các test đang có (`findByRole("status")` vẫn unique).
- `auth-caps-note` là class hook inert (chưa có rule CSS nào dùng nó — mirrors quy ước `auth-field-note`; có thể dùng sau này nếu muốn style riêng hint Caps Lock).
