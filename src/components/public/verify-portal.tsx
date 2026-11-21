"use client";
/* =====================================================================
 * VERIFY PORTAL — tra cứu chứng chỉ công khai (view #/verify, không cần đăng nhập).
 *
 * Endpoint BE cover:
 *  GET /certificates/verify/{code} (PUBLIC) — probe QA 2026-11-21:
 *    issued → { valid:true, status:"issued", certificateNumber, holderName,
 *               role, projectName, sessionName, completedAt, issuedAt }
 *    revoked → { valid:false, status:"revoked", revokedAt, … } · mã lạ → 404.
 *    KHÔNG tiết lộ email/userId/điểm số (spec 47/48).
 * =====================================================================
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  VBadgeCheck,
  VCertificate,
  VCircleX,
  VInfo,
  VSearch,
  VSparkles,
  VHome,
} from "@/components/icons/v-icons";
import { InkButton } from "@/components/notebook/reveal";
import {
  InkBadge,
  MarginNote,
  NoteCard,
  SketchCard,
  StampMoc,
  formatDateVN,
} from "@/components/notebook/ui";
import { PencilLines } from "@/components/staff/staff-kit";
import { ApiError, apiFetch, errorMessage, isRecord } from "@/lib/api/api-client";
import { useApp } from "@/lib/store";

/* ------------------------------- parser -------------------------------- */

interface VerifiedCertificate {
  valid: boolean;
  status: string;
  certificateNumber: string | null;
  holderName: string | null;
  role: string | null;
  projectName: string | null;
  sessionName: string | null;
  policyCode: string | null;
  issuedAt: string | null;
  completedAt: string | null;
  revokedAt: string | null;
}

function text(v: Record<string, unknown>, key: string): string | null {
  const raw = v[key];
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

function parseVerifiedCertificate(value: unknown): VerifiedCertificate {
  const v = isRecord(value) ? value : null;
  if (!v) throw new Error("INVALID_RESPONSE");
  const valid = v.valid === true;
  const status = typeof v.status === "string" ? v.status : valid ? "issued" : "unknown";
  return {
    valid,
    status,
    certificateNumber: text(v, "certificateNumber"),
    holderName: text(v, "holderName") ?? text(v, "holderNameSnapshot"),
    role: text(v, "role") ?? text(v, "roleLabelSnapshot"),
    projectName: text(v, "projectName") ?? text(v, "projectNameSnapshot"),
    sessionName: text(v, "sessionName") ?? text(v, "sessionNameSnapshot"),
    policyCode: text(v, "policyCode"),
    issuedAt: text(v, "issuedAt"),
    completedAt: text(v, "completedAt"),
    revokedAt: text(v, "revokedAt"),
  };
}

async function verifyCertificate(code: string): Promise<VerifiedCertificate> {
  const body = await apiFetch(`/certificates/verify/${encodeURIComponent(code)}`);
  return parseVerifiedCertificate(body);
}

/* ============================== component ============================== */

export default function VerifyPortal() {
  const user = useApp((s) => s.user);
  const goLanding = useApp((s) => s.goLanding);
  const enterAuth = useApp((s) => s.enterAuth);
  const goApply = useApp((s) => s.goApply);

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingCode, setLoadingCode] = useState<string | null>(null);
  const [result, setResult] = useState<VerifiedCertificate | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const runLookup = useCallback(async (rawCode: string) => {
    const trimmed = rawCode.trim();
    if (!trimmed) {
      toast.error("Hãy nhập mã xác thực in trên chứng chỉ.");
      return;
    }
    setBusy(true);
    setLookupError(null);
    setNotFound(null);
    setResult(null);
    setLoadingCode(trimmed);
    try {
      const cert = await verifyCertificate(trimmed);
      setResult(cert);
    } catch (error) {
      /* 404 / CERTIFICATE_VERIFICATION_NOT_FOUND → mã không tồn tại; còn lại là lỗi hệ thống. */
      if (
        error instanceof ApiError &&
        (error.statusCode === 404 || error.code === "CERTIFICATE_VERIFICATION_NOT_FOUND")
      ) {
        setNotFound(trimmed);
      } else {
        setLookupError(errorMessage(error));
      }
    } finally {
      setBusy(false);
      setLoadingCode(null);
    }
  }, []);

  /* Hỗ trợ dán link có sẵn ?code=… — tự điền và tra cứu luôn. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefill = params.get("code") ?? params.get("verificationCode");
    if (prefill) {
      setCode(prefill);
      runLookup(prefill);
    }
  }, [runLookup]);

  const reset = () => {
    setResult(null);
    setNotFound(null);
    setLookupError(null);
    setCode("");
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--paper)] text-[var(--ink)]">
      {/* ------------------------------ topbar ------------------------------ */}
      <header className="sticky top-0 z-40 border-b-2 border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-[var(--paper)]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px_12px_9px_11px] border-2 border-[var(--ink)] bg-[var(--note-mint)] text-[var(--success)]">
              <VCertificate size={18} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold leading-tight">Tra cứu chứng chỉ V-Intern</p>
              <p className="hidden truncate text-[0.68rem] text-[var(--ink-soft)] sm:block">
                Đối chiếu mã xác thực — kết quả do hệ thống ký điện tử
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {user ? (
              <InkBadge tone="mint" className="!text-[0.65rem]">
                Đã đăng nhập: {user.name}
              </InkBadge>
            ) : (
              <InkButton variant="outline" size="sm" onClick={enterAuth}>
                Đăng nhập
              </InkButton>
            )}
            <InkButton variant="ghost" size="sm" onClick={goLanding}>
              <VHome size={15} /> Về trang chủ
            </InkButton>
          </div>
        </div>
      </header>

      {/* ------------------------------ main ------------------------------ */}
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:py-12">
        <div className="min-w-0">
          <SketchCard hover={false} className="p-5 sm:p-6">
            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              Chứng chỉ này có thật không?
            </h1>
            <p className="mt-1.5 text-sm text-[var(--ink-soft)]">
              Nhập <b>mã xác thực</b> in trên chứng chỉ hoàn thành của V-Intern để đối chiếu với sổ
              đăng ký của hệ thống.
            </p>

            <form
              className="mt-5 flex flex-col gap-2.5 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                runLookup(code);
              }}
            >
              <div className="relative min-w-0 flex-1">
                <VSearch
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]"
                />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ví dụ: gIdL3VOo91KAHSazh0cXKD5--aUfssgE"
                  aria-label="Mã xác thực chứng chỉ"
                  spellCheck={false}
                  autoComplete="off"
                  className="focus-ink w-full rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] py-2.5 pl-9 pr-3 font-mono text-[0.8rem] text-[var(--ink)] outline-none transition-colors"
                />
              </div>
              <InkButton variant="royal" size="md" type="submit" disabled={busy}>
                {busy ? "Đang đối chiếu…" : "Tra cứu"}
              </InkButton>
            </form>

            {/* Kết quả */}
            <div className="mt-6">
              {busy && !result && <PencilLines rows={3} />}

              {!busy && !result && !notFound && !lookupError && (
                <div className="flex items-start gap-2.5 rounded-[10px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_25%,transparent)] bg-[var(--paper)] p-3.5 text-[0.8rem] text-[var(--ink-soft)]">
                  <VInfo size={16} className="mt-0.5 shrink-0" />
                  <p>
                    Mã xác thực là chuỗi ký tự in dưới chân chứng chỉ (hoặc đính kèm trong liên kết
                    tra cứu). Tra cứu không cần đăng nhập và không tiết lộ thông tin cá nhân của
                    chủ sở hữu ngoài tên đã công bố.
                  </p>
                </div>
              )}

              {notFound && (
                <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                  <span className="sticker-pop grid h-14 w-14 place-items-center rounded-full border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_35%,transparent)] text-[var(--ink-soft)]">
                    <VCircleX size={24} />
                  </span>
                  <p className="font-hand text-lg">Không tìm thấy chứng chỉ khớp mã này</p>
                  <p className="max-w-sm text-sm text-[var(--ink-soft)]">
                    Kiểm tra lại mã (dễ thừa/thiếu ký tự khi gõ tay). Mã vừa tra:{" "}
                    <span className="break-all font-mono text-[0.72rem]">{notFound}</span>
                  </p>
                </div>
              )}

              {lookupError && (
                <div className="flex items-start gap-2.5 rounded-[10px] border-2 border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] p-3.5 text-[0.8rem]">
                  <VCircleX size={16} className="mt-0.5 shrink-0 text-[var(--danger)]" />
                  <p>{lookupError}</p>
                </div>
              )}

              {result && (
                <article
                  aria-live="polite"
                  className="relative overflow-hidden rounded-[12px_16px_13px_15px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] p-5 shadow-ink-3 sm:p-6"
                >
                  {/* Mộc kết quả */}
                  <div className="pointer-events-none absolute right-4 top-4 sm:right-6 sm:top-6">
                    {result.valid ? (
                      <StampMoc tone="blue" rotate={-11} className="!text-[0.95rem]">
                        HỢP LỆ
                      </StampMoc>
                    ) : (
                      <StampMoc tone="red" rotate={9} className="!text-[0.85rem]">
                        ĐÃ THU HỒI
                      </StampMoc>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-[11px] border-2 border-[var(--ink)] ${
                        result.valid
                          ? "bg-[var(--note-mint)] text-[var(--success)]"
                          : "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]"
                      }`}
                    >
                      {result.valid ? <VBadgeCheck size={20} /> : <VCircleX size={20} />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                        Chứng chỉ hoàn thành V-Intern
                      </p>
                      <p className="truncate font-extrabold">
                        {result.certificateNumber ?? "—"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 max-w-md">
                    <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                      Chủ sở hữu
                    </p>
                    <p className="font-hand text-2xl leading-tight">
                      {result.holderName ?? "Không công bố"}
                    </p>
                  </div>

                  <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    {[
                      { label: "Vai trò", value: result.role },
                      { label: "Dự án", value: result.projectName },
                      { label: "Phiên thực tập", value: result.sessionName },
                      { label: "Chính sách cấp", value: result.policyCode },
                      { label: "Hoàn thành", value: result.completedAt ? formatDateVN(result.completedAt) : null },
                      { label: "Ngày cấp", value: result.issuedAt ? formatDateVN(result.issuedAt) : null },
                      ...(result.revokedAt
                        ? [{ label: "Thu hồi ngày", value: formatDateVN(result.revokedAt) }]
                        : []),
                    ]
                      .filter((row) => row.value)
                      .map((row) => (
                        <div key={row.label}>
                          <dt className="text-[0.62rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                            {row.label}
                          </dt>
                          <dd className="mt-0.5 text-[0.85rem] font-semibold leading-snug">{row.value}</dd>
                        </div>
                      ))}
                  </dl>

                  <p className="mt-5 border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_18%,transparent)] pt-3 text-[0.7rem] leading-relaxed text-[var(--ink-soft)]">
                    Kết quả trên được ghi trong sổ đăng ký chứng chỉ của hệ thống. Đây là chữ ký xác
                    thực điện tử của hệ thống V-Intern — mọi chỉnh sửa xuất hiện tại đây là giả mạo.
                  </p>

                  <div className="mt-4">
                    <InkButton variant="outline" size="sm" onClick={reset}>
                      Tra mã khác
                    </InkButton>
                  </div>
                </article>
              )}
            </div>
          </SketchCard>
        </div>

        {/* ------------------------- cột phải: giải thích ------------------------- */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <SketchCard hover={false} className="p-5">
            <img
              src="/images/landing/robot-mascot.png"
              alt="Linh vật robot của V-Intern giữ con dấu xác thực"
              className="mx-auto block h-36 w-auto select-none"
              draggable={false}
            />
            <p className="mt-3 text-center font-hand text-lg leading-snug">
              Mỗi chứng chỉ một mã — một con dấu ✎
            </p>
            <ul className="mt-3 space-y-2.5 text-[0.82rem] leading-relaxed">
              <li className="flex items-start gap-2.5">
                <VBadgeCheck size={16} className="mt-0.5 shrink-0 text-[var(--success)]" />
                <span>
                  Mộc <b>HỢP LỆ</b>: chứng chỉ đang hiệu lực, đối chiếu khớp sổ đăng ký.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <VCircleX size={16} className="mt-0.5 shrink-0 text-[var(--danger)]" />
                <span>
                  Mộc <b>ĐÃ THU HỒI</b>: chứng chỉ bị thu hồi (kèm ngày) — không còn giá trị chứng
                  minh.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <VSparkles size={16} className="mt-0.5 shrink-0 text-[var(--royal)]" />
                <span>Tra cứu công khai, không cần tài khoản, không lộ email hay điểm số.</span>
              </li>
            </ul>
          </SketchCard>

          <NoteCard tone="mint" title="Nhà tuyển dụng ơi" tapeVariant="mint">
            Chỉ cần mã trên chứng chỉ ứng viên trình — kết quả trả về ngay từ hệ thống, có ngày cấp
            và phiên bản chính sách kèm theo.
          </NoteCard>

          <NoteCard tone="pink" title="Muốn có chứng chỉ riêng?">
            Hoàn thành lộ trình thực tập V-Intern (đạt phỏng vấn + dự án + đánh giá) để được cấp
            chứng chỉ mang mã xác thực của riêng bạn —{" "}
            <button
              type="button"
              onClick={goApply}
              className="focus-ink font-bold text-[var(--royal)] underline decoration-wavy underline-offset-4"
            >
              ứng tuyển ngay
            </button>
            .
          </NoteCard>

          <MarginNote>
            Mã tra cứu có phân biệt hoa/thường — copy nguyên vẹn từ chứng chỉ hoặc liên kết đính kèm.
          </MarginNote>
        </aside>
      </main>

      {/* ------------------------------ footer ------------------------------ */}
      <footer className="mt-auto border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)] px-4 py-4 text-center text-[0.7rem] text-[var(--ink-soft)]">
        Đây là chữ ký xác thực điện tử của hệ thống V-Intern · Kết quả tra cứu chỉ mang tính đối
        chiếu công khai
        {loadingCode ? ` · đang đối chiếu mã ${loadingCode.slice(0, 6)}…` : ""}
      </footer>
    </div>
  );
}
