# HANDOVER — V-Intern FE: CI Fix Patch (full-stack gate 3 test fail)

File: `v-intern-fe-ci-fix-5247fac.patch` (git format-patch, áp dụng bằng `git am`)
SHA256: `ab328f370b14817a6958d137154f0f5f0ec779037fba331fabf47dff4cdecddb`
Ngày: 2026-11-21

## Thông tin commit

| | |
|---|---|
| **Commit gốc (base)** | `9e83345e20a299acb92dca4ac0420e4575d0eb01` = remote HEAD hiện tại của `codex/product-acceptance-20261116` |
| **Commit nguồn của patch** | `5247fac2273070791f05d3d89cb0bf8b1fb5949e` (local, đã chạy đầy đủ quality gates) |
| **Commit đích sau `git am`** | SHA mới (metadata khác) nhưng **tree hash `68d3f8c005594d16d8f72472889d4a342b8e320` bit-identical** với `5247fac` — đã kiểm chứng bằng `git am` trên checkout nguyên bản `9e83345` |
| **Files thay đổi** | 2 — `src/lib/preview/__tests__/preview-isolation.test.ts` (+36/−1, 11→12 tests) và `docs/FINAL_PRODUCTION_READINESS_AUDIT.md` (mới, 248 dòng) |
| **Production code** | KHÔNG đổi dòng nào — chỉ test file + tài liệu |

## Vấn đề được sửa

3 test fail của workflow `Project-first full-stack gate` (run 44822285512, job `sql2019`, bước `FE quality gates`):

- Job set `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1` (phục vụ Real-Backend E2E), chạy `npm test` TRƯỚC khi boot Nest.
- `preview-isolation.test.ts` mô tả hành vi "chưa cấu hình API" nhưng dựa vào ambient env trống → sai ở full-stack CI (đúng ở CI thường).
- Kết quả: `API_CONFIG_MISSING` mong đợi nhưng nhận `NETWORK_ERROR`; `isApiConfigured()` mong `false` nhưng nhận `true`.
- Fix: mọi test tự pin đầu vào qua `vi.stubEnv` (không skip, không xóa assertion) + 1 regression test mới chốt `NETWORK_ERROR` ≠ `API_CONFIG_MISSING`. 804 → 805 tests.

## Cách áp dụng (môi trường Git đã xác thực, có quyền push)

```bash
git clone https://github.com/vanhoi04082006-pixel/V-Intern-FE.git
cd V-Intern-FE
git checkout codex/product-acceptance-20261116
git fetch origin
git rev-parse HEAD        # kỳ vọng 9e83345e... (nếu đã tiến lên: xem mục "diverged" dưới)

git am v-intern-fe-ci-fix-5247fac.patch
# Kiểm chứng sau khi am:
git show --stat HEAD                       # 2 files: test + audit doc
git rev-parse HEAD^{tree}                   # kỳ vọng 68d3f8c005594d16d8f72472889d4a342b8e320

git push origin codex/product-acceptance-20261116    # KHÔNG force push
git ls-remote origin refs/heads/codex/product-acceptance-20261116   # xác minh HEAD mới
```

Nếu remote đã tiến lên khác `9e83345`: `git am -3 <patch>` (rebase 3-way) rồi giải conflict (nếu có) theo cùng nguyên tắc: chỉ đổi test isolation, không đổi production code.

## Verify sau khi áp dụng (bắt buộc trước khi push)

```bash
npm ci
# Test cả 2 cấu hình môi trường (điểm cốt lõi của fix):
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1 npx vitest run src/lib/preview/__tests__/preview-isolation.test.ts   # 12/12
npx vitest run src/lib/preview/__tests__/preview-isolation.test.ts                                                           # 12/12
npm run lint          # 0 errors (1 warning no-img-element có sẵn)
npm run typecheck     # PASS
npm test              # 805/805 (136 files)
npm run build         # PASS
npm run verify:preview-isolation   # PASS — 0 marker mock trong .next
npm run verify:journey            # PASS — gate v2, 80/80 routes
node --test scripts/__tests__/*.test.mjs   # 25 pass
npm audit --omit=dev --audit-level=high    # 0 vulnerabilities
```

## Trigger GitHub Actions sau khi push

- `CI` (ci.yml): chạy khi có **PR** vào `main` / `feat/ui-ux-overhaul` / `codex/**`. Nếu đã có PR mở từ nhánh này → push sẽ tự trigger lại cả hai workflow trên SHA mới.
- `Project-first full-stack gate` (phase7-fullstack.yml): PR tương tự, **hoặc** `workflow_dispatch` (Actions tab → chọn workflow → Run workflow → ref `codex/product-acceptance-20261116`).
- Cả hai phải **SUCCESS** trên commit mới trước khi tuyên bố production-ready.
- Nếu `FE quality gates` lại fail: đọc log job `sql2019`, đối chiếu `docs/FINAL_PRODUCTION_READINESS_AUDIT.md` mục 2 (đã tái lập chính xác env fail tại local → 805/805).

## Kết quả đã kiểm chứng trên cây mã nguồn này (local, sandbox)

| Gate | Kết quả |
|---|---|
| Full suite × config A (full-stack env, có base URL) | **805/805 PASS** — 3 runs liên tiếp |
| Full suite × config B (CI thường, không biến) | **805/805 PASS** |
| Lint / Typecheck / Build / Audit | 0 errors / PASS / PASS / 0 vulns |
| Contract tests | 25 pass / 0 fail |
| `verify:preview-isolation` | PASS — 0 marker mock |
| `verify:journey` (gate v2) | PASS — 80/80 routes |
| Live production-mode browser check | PASS — lỗi cấu hình API hiển thị đúng; preview không bật được qua URL param/localStorage; 0 page error |
| BE @ pinned SHA `cb2cf860` | npm ci / lint 0 err / build / **876 tests PASS** (113 suites) |

Chi tiết đầy đủ kèm bằng chứng: `docs/FINAL_PRODUCTION_READINESS_AUDIT.md` (nằm trong patch).

## Vì sao bàn giao bằng patch

Sandbox hiện tại không có credential push nào (đã sweep: không SSH key, không `.netrc`, không env token, không gh CLI, không credential helper, không secrets mount; remote URL không chứa token). Push thử đã fail: `fatal: could not read Username for 'https://github.com'`. Remote HEAD vẫn `9e83345` — không bị ghi đè. Commit local `5247fac` không mất (kèm patch + tree-hash proof ở trên).
