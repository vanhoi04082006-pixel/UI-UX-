"use client";

/* =====================================================================
 * ADMIN — CHỨNG NHẬN (route: admin/certificates)
 * Endpoints cover (nhóm certificates 6 ops):
 *  · GET  /certificates            — bảng chứng chỉ (luôn gửi page + pageSize,
 *    BE lỗi 500 nếu thiếu một trong hai) + phân trang server-side
 *  · POST /certificates/issue      — dialog cấp (chọn user từ GET /users)
 *  · GET  /certificates/{id}       — dialog chi tiết đủ field
 *  · GET  /certificates/{id}/pdf   — tải PDF (blob → objectURL)
 *  · POST /certificates/{id}/revoke — thu hồi (confirm + lý do)
 *  · GET  /certificates/verify/{code} — public; màn chỉ hint text link tra cứu
 * Helper: GET /users (adapter riêng listIssueCandidates).
 * ===================================================================== */

import { useState } from "react";
import { toast } from "sonner";
import {
  VBan,
  VCertificate,
  VCheck,
  VCopy,
  VDownload,
  VExternal,
  VInbox,
  VInfo,
  VPlus,
} from "@/components/icons/v-icons";
import { InkButton } from "@/components/notebook/reveal";
import { InkBadge, SketchCard, formatDateTimeVN } from "@/components/notebook/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApi } from "@/lib/use-api";
import { ApiError, errorMessage } from "@/lib/api/api-client";
import {
  downloadCertificatePdf,
  getCertificate,
  issueCertificate,
  listCertificates,
  listIssueCandidates,
  revokeCertificate,
  type CertificateRecord,
} from "@/lib/api/certificates-admin";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  PencilLines,
  SectionError,
  SketchTextarea,
  StaffPageHeader,
} from "../staff/staff-kit";

/* ------------------------------ meta maps ------------------------------- */

const CERT_STATUS_META: Record<string, { label: string; tone: string }> = {
  issued: { label: "Đã cấp", tone: "green" },
  revoked: { label: "Đã thu hồi", tone: "red" },
};

const PAGE_SIZE = 10;

/* ------------------------------ tiện ích nhỏ ----------------------------- */

function shortId(id: string | null, len = 8): string {
  if (!id) return "—";
  return id.length > len ? `${id.slice(0, len)}…` : id;
}

function certIssueErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const details = Array.isArray(err.details)
      ? err.details.filter((x): x is string => typeof x === "string")
      : [];
    if (details.length > 0) return `${err.message} — ${details.join("; ")}`;
    return err.message;
  }
  return errorMessage(err);
}

function SketchSelect({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "focus-ink w-full appearance-none rounded-[9px_11px_10px_12px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] outline-none transition-colors",
        className,
      )}
    />
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]"
    >
      {children}
    </label>
  );
}

/** Hàng khóa-giá trị cho dialog chi tiết. */
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 py-2">
      <dt className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
        {label}
      </dt>
      <dd className="min-w-0 break-all text-right text-[0.82rem] font-semibold text-[var(--ink)]">
        {children}
      </dd>
    </div>
  );
}

/* ================================= SCREEN ================================ */

export default function AdminCertificates() {
  /* Danh sách — luôn gửi đủ page + pageSize (BE 500 khi thiếu). */
  const [page, setPage] = useState(1);
  const [certsVersion, setCertsVersion] = useState(0);
  const certsQ = useApi(() => listCertificates(page, PAGE_SIZE), [page, certsVersion]);
  const certs = certsQ.data?.items ?? [];
  const total = certsQ.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /* Dialog cấp chứng chỉ */
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueUserId, setIssueUserId] = useState("");
  const [issueBusy, setIssueBusy] = useState(false);
  const candidatesQ = useApi(() => (issueOpen ? listIssueCandidates() : Promise.resolve(null)), [
    issueOpen,
  ]);
  const candidates = candidatesQ.data ?? [];

  /* Dialog chi tiết */
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailVersion, setDetailVersion] = useState(0);
  const detailQ = useApi(
    () => (detailId ? getCertificate(detailId) : Promise.resolve(null)),
    [detailId, detailVersion],
  );
  const detail = detailQ.data ?? null;

  /* Dialog thu hồi */
  const [revokeTarget, setRevokeTarget] = useState<CertificateRecord | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [revokeBusy, setRevokeBusy] = useState(false);

  /* Dialog hint tra cứu công khai */
  const [verifyHintOpen, setVerifyHintOpen] = useState(false);

  /* Tải PDF */
  const [pdfBusyId, setPdfBusyId] = useState<string | null>(null);

  /* ----------------------------- actions --------------------------------- */

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Đã sao chép ${label}.`);
    } catch {
      toast.error("Không sao chép được — trình duyệt đang chặn clipboard.");
    }
  };

  const submitIssue = async () => {
    if (!issueUserId) return toast.error("Chọn người cần cấp chứng chỉ.");
    setIssueBusy(true);
    try {
      const created = await issueCertificate({ userId: issueUserId });
      toast.success(
        created?.certificateNumber
          ? `Đã cấp chứng chỉ ${created.certificateNumber}.`
          : "Đã cấp chứng chỉ thành công.",
      );
      setIssueOpen(false);
      setIssueUserId("");
      setCertsVersion((v) => v + 1);
    } catch (err) {
      toast.error(certIssueErrorMessage(err));
    } finally {
      setIssueBusy(false);
    }
  };

  const submitRevoke = async () => {
    if (!revokeTarget) return;
    if (!revokeReason.trim()) return toast.error("Cần nhập lý do thu hồi — hệ thống lưu kèm hồ sơ.");
    setRevokeBusy(true);
    try {
      await revokeCertificate(revokeTarget.id, revokeReason.trim());
      toast.success(
        `Đã thu hồi ${revokeTarget.certificateNumber} — sinh viên được thông báo, audit đã ghi.`,
      );
      setRevokeTarget(null);
      setRevokeReason("");
      setCertsVersion((v) => v + 1);
      setDetailVersion((v) => v + 1);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setRevokeBusy(false);
    }
  };

  const downloadPdf = async (cert: CertificateRecord) => {
    setPdfBusyId(cert.id);
    try {
      const blob = await downloadCertificatePdf(cert.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${cert.certificateNumber || "chung-nhan"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast.success(`Đang tải PDF ${cert.certificateNumber}.`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPdfBusyId(null);
    }
  };

  /* ------------------------------ render --------------------------------- */

  return (
    <div>
      <StaffPageHeader
        eyebrow="Quản trị · chứng nhận"
        title="Chứng nhận"
        sub="Chứng chỉ hoàn thành V-INTERN-COMPLETE — cấp theo đúng điều kiện, thu hồi có lý do."
        icon={VCertificate}
        note="chứng chỉ là lời hứa — chỉ cấp khi mọi bằng chứng đã chốt"
        actions={
          <>
            <InkButton variant="outline" size="sm" onClick={() => setVerifyHintOpen(true)}>
              <VExternal size={14} /> Tra cứu công khai
            </InkButton>
            <InkButton
              variant="royal"
              size="sm"
              onClick={() => {
                setIssueUserId("");
                setIssueOpen(true);
              }}
            >
              <VPlus size={15} /> Cấp chứng chỉ
            </InkButton>
          </>
        }
      />

      <SketchCard hover={false} className="overflow-hidden">
        {certsQ.loading && !certsQ.data ? (
          <div className="p-5">
            <PencilLines rows={5} />
          </div>
        ) : certsQ.error ? (
          <div className="p-5">
            <SectionError message={certsQ.error} onRetry={certsQ.reload} />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="ink-table min-w-[1040px]">
                <thead>
                  <tr>
                    <th>Số chứng chỉ</th>
                    <th>Người nhận</th>
                    <th>Dự án</th>
                    <th>Vai trò</th>
                    <th>Chính sách</th>
                    <th>Trạng thái</th>
                    <th>Ngày cấp</th>
                    <th>Mã xác minh</th>
                    <th className="text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {certs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-0">
                        <EmptyState
                          icon={VInbox}
                          title="Chưa có chứng chỉ nào ✎"
                          note="Cấp chứng chỉ cho sinh viên đủ điều kiện hoàn thành."
                        />
                      </td>
                    </tr>
                  ) : (
                    certs.map((cert) => {
                      const meta = CERT_STATUS_META[cert.status] ?? {
                        label: cert.status,
                        tone: "neutral",
                      };
                      return (
                        <tr key={cert.id} className="sticker-pop">
                          <td>
                            <button
                              type="button"
                              onClick={() => {
                                setDetailId(cert.id);
                                setDetailVersion((v) => v + 1);
                              }}
                              className="focus-ink rounded-[6px] border border-[color-mix(in_srgb,var(--ink)_30%,transparent)] bg-[var(--paper)] px-1.5 py-0.5 font-mono text-[0.7rem] font-bold text-[var(--ink)] transition-colors hover:bg-[var(--blue-mist)]"
                              aria-label={`Xem chi tiết chứng chỉ ${cert.certificateNumber}`}
                            >
                              {cert.certificateNumber}
                            </button>
                          </td>
                          <td className="text-sm font-semibold text-[var(--ink)]">
                            {cert.holderNameSnapshot ?? "—"}
                          </td>
                          <td className="max-w-[180px]">
                            <p className="truncate text-sm" title={cert.projectNameSnapshot ?? ""}>
                              {cert.projectNameSnapshot ?? "—"}
                            </p>
                          </td>
                          <td className="text-sm text-[var(--ink-soft)]">
                            {cert.roleLabelSnapshot ?? "—"}
                          </td>
                          <td>
                            <InkBadge tone="blue" className="!text-[0.62rem]">
                              {cert.policyCode}
                              {cert.policyVersion != null ? ` v${cert.policyVersion}` : ""}
                            </InkBadge>
                          </td>
                          <td>
                            <InkBadge tone={meta.tone} dot className="!text-[0.65rem]">
                              {meta.label}
                            </InkBadge>
                          </td>
                          <td className="whitespace-nowrap text-xs tabular text-[var(--ink-soft)]">
                            {cert.issuedAt ? formatDateTimeVN(cert.issuedAt) : "—"}
                          </td>
                          <td>
                            {cert.verificationCode ? (
                              <button
                                type="button"
                                onClick={() =>
                                  copyText(cert.verificationCode ?? "", "mã xác minh")
                                }
                                title={cert.verificationCode}
                                aria-label="Sao chép mã xác minh"
                                className="focus-ink inline-flex max-w-[120px] items-center gap-1 truncate rounded-[6px] border-2 border-[color-mix(in_srgb,var(--ink)_30%,transparent)] bg-[var(--paper-raised)] px-1.5 py-0.5 font-mono text-[0.66rem] font-bold text-[var(--ink)] transition-all hover:bg-[var(--blue-mist)]"
                              >
                                <VCopy size={11} />
                                <span className="truncate">{cert.verificationCode}</span>
                              </button>
                            ) : (
                              <span className="text-xs text-[var(--ink-soft)]">—</span>
                            )}
                          </td>
                          <td>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                disabled={cert.status !== "issued" || pdfBusyId === cert.id}
                                onClick={() => downloadPdf(cert)}
                                aria-label={`Tải PDF ${cert.certificateNumber}`}
                                title={cert.status === "issued" ? "Tải PDF" : "Chỉ chứng chỉ đã cấp mới có PDF"}
                                className="focus-ink grid h-8 w-8 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--ink-soft)] transition-all hover:-translate-y-0.5 hover:bg-[var(--blue-mist)] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-35"
                              >
                                <VDownload size={14} />
                              </button>
                              {cert.status === "issued" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRevokeTarget(cert);
                                    setRevokeReason("");
                                  }}
                                  aria-label={`Thu hồi ${cert.certificateNumber}`}
                                  title="Thu hồi chứng chỉ"
                                  className="focus-ink grid h-8 w-8 place-items-center rounded-full border-2 border-[var(--danger)] bg-[var(--paper-raised)] text-[var(--danger)] transition-all hover:-translate-y-0.5 hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]"
                                >
                                  <VBan size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bản card mobile */}
            <div className="divide-y-2 divide-dashed divide-[color-mix(in_srgb,var(--ink)_15%,transparent)] md:hidden">
              {certs.length === 0 ? (
                <EmptyState
                  icon={VInbox}
                  title="Chưa có chứng chỉ nào ✎"
                  note="Cấp chứng chỉ cho sinh viên đủ điều kiện hoàn thành."
                />
              ) : (
                certs.map((cert) => {
                  const meta = CERT_STATUS_META[cert.status] ?? {
                    label: cert.status,
                    tone: "neutral",
                  };
                  return (
                    <div key={cert.id} className="sticker-pop space-y-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 break-all font-mono text-[0.72rem] font-bold text-[var(--ink)]">
                          {cert.certificateNumber}
                        </p>
                        <InkBadge tone={meta.tone} dot className="!text-[0.62rem]">
                          {meta.label}
                        </InkBadge>
                      </div>
                      <p className="text-sm font-bold text-[var(--ink)]">
                        {cert.holderNameSnapshot ?? "—"}
                      </p>
                      <p className="text-[0.72rem] text-[var(--ink-soft)]">
                        {cert.projectNameSnapshot ?? "—"} · {cert.roleLabelSnapshot ?? "—"}
                      </p>
                      <p className="text-[0.72rem] tabular text-[var(--ink-soft)]">
                        Cấp: {cert.issuedAt ? formatDateTimeVN(cert.issuedAt) : "—"}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <InkButton
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDetailId(cert.id);
                            setDetailVersion((v) => v + 1);
                          }}
                        >
                          <VExternal size={13} /> Chi tiết
                        </InkButton>
                        {cert.verificationCode && (
                          <InkButton
                            variant="outline"
                            size="sm"
                            onClick={() => copyText(cert.verificationCode ?? "", "mã xác minh")}
                          >
                            <VCopy size={13} /> Mã xác minh
                          </InkButton>
                        )}
                        {cert.status === "issued" && (
                          <>
                            <InkButton
                              variant="outline"
                              size="sm"
                              disabled={pdfBusyId === cert.id}
                              onClick={() => downloadPdf(cert)}
                            >
                              <VDownload size={13} /> PDF
                            </InkButton>
                            <InkButton
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setRevokeTarget(cert);
                                setRevokeReason("");
                              }}
                            >
                              <VBan size={13} /> Thu hồi
                            </InkButton>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Phân trang */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_20%,transparent)] px-4 py-3">
              <p className="tabular text-xs text-[var(--ink-soft)]">
                {total.toLocaleString("vi-VN")} chứng chỉ · trang {page}/{totalPages}
              </p>
              <div className="flex items-center gap-1.5">
                <InkButton
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Trước
                </InkButton>
                <InkButton
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sau
                </InkButton>
              </div>
            </div>
          </>
        )}
      </SketchCard>

      {/* ======================= DIALOG: cấp chứng chỉ ======================== */}
      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[var(--ink)]">Cấp chứng chỉ</DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Chính sách V-INTERN-COMPLETE v1 — hệ thống tự kiểm tra điều kiện trước khi cấp.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <FieldLabel htmlFor="issue-user">Người nhận</FieldLabel>
              {candidatesQ.loading && !candidatesQ.data ? (
                <PencilLines rows={2} />
              ) : candidatesQ.error ? (
                <SectionError message={candidatesQ.error} onRetry={candidatesQ.reload} />
              ) : (
                <SketchSelect
                  id="issue-user"
                  value={issueUserId}
                  onChange={(e) => setIssueUserId(e.target.value)}
                >
                  <option value="">— Chọn người dùng —</option>
                  {candidates.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName} ({u.email}){u.status !== "active" ? ` · ${u.status}` : ""}
                    </option>
                  ))}
                </SketchSelect>
              )}
            </div>
            <div className="rounded-[10px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_25%,transparent)] bg-[var(--paper)] p-3">
              <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-[var(--ink-soft)]">
                <VInfo size={13} /> Điều kiện đủ (BE kiểm tra)
              </p>
              <ul className="mt-1.5 space-y-1 text-[0.78rem] leading-snug text-[var(--ink)]">
                <li>· Vòng tuyển dụng đã đỗ</li>
                <li>· Có bài nộp đã hoàn thành</li>
                <li>· Đánh giá cuối đã chốt, điểm ≥ 70</li>
                <li>· KPI kỳ cuối đã chốt, điểm ≥ 70</li>
              </ul>
              <p className="mt-1.5 text-[0.7rem] text-[var(--ink-soft)]">
                Chưa đủ điều kiện → 409 kèm lý do chi tiết; trùng → 409 CERTIFICATE_ALREADY_ISSUED.
              </p>
            </div>
          </div>
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setIssueOpen(false)}>
              Hủy
            </InkButton>
            <InkButton variant="royal" size="sm" disabled={issueBusy} onClick={submitIssue}>
              <VCheck size={14} /> {issueBusy ? "Đang cấp…" : "Cấp chứng chỉ"}
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================= DIALOG: chi tiết chứng chỉ =================== */}
      <Dialog
        open={!!detailId}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
      >
        <DialogContent className="max-h-[88vh] overflow-y-auto rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[var(--ink)]">
              Chi tiết chứng chỉ
            </DialogTitle>
            <DialogDescription className="break-all font-mono text-[0.72rem] text-[var(--ink-soft)]">
              {detail?.certificateNumber ?? detailId}
            </DialogDescription>
          </DialogHeader>
          {detailQ.loading && !detail ? (
            <PencilLines rows={5} />
          ) : detailQ.error ? (
            <SectionError message={detailQ.error} onRetry={() => setDetailVersion((v) => v + 1)} />
          ) : detail ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <InkBadge
                  tone={(CERT_STATUS_META[detail.status] ?? { tone: "neutral" }).tone}
                  dot
                >
                  {(CERT_STATUS_META[detail.status] ?? { label: detail.status }).label}
                </InkBadge>
                <InkBadge tone="blue" className="!text-[0.65rem]">
                  {detail.policyCode}
                  {detail.policyVersion != null ? ` v${detail.policyVersion}` : ""}
                </InkBadge>
              </div>
              <dl className="divide-y-2 divide-dashed divide-[color-mix(in_srgb,var(--ink)_15%,transparent)] rounded-[12px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3.5 py-1">
                <DetailRow label="Người nhận">{detail.holderNameSnapshot ?? "—"}</DetailRow>
                <DetailRow label="Vai trò">{detail.roleLabelSnapshot ?? "—"}</DetailRow>
                <DetailRow label="Dự án">{detail.projectNameSnapshot ?? "—"}</DetailRow>
                <DetailRow label="Phiên thực tập">{detail.sessionNameSnapshot ?? "—"}</DetailRow>
                <DetailRow label="User ID">
                  <span className="font-mono text-[0.7rem]">{detail.userId ?? "—"}</span>
                </DetailRow>
                <DetailRow label="Session ID">
                  <span className="font-mono text-[0.7rem]">{shortId(detail.sessionId, 18)}</span>
                </DetailRow>
                <DetailRow label="Assignment ID">
                  <span className="font-mono text-[0.7rem]">{shortId(detail.assignmentId, 18)}</span>
                </DetailRow>
                <DetailRow label="Evaluation ID">
                  <span className="font-mono text-[0.7rem]">{shortId(detail.evaluationId, 18)}</span>
                </DetailRow>
                <DetailRow label="KPI result ID">
                  <span className="font-mono text-[0.7rem]">{shortId(detail.kpiResultId, 18)}</span>
                </DetailRow>
                <DetailRow label="Người cấp">
                  <span className="font-mono text-[0.7rem]">{shortId(detail.issuedById, 18)}</span>
                </DetailRow>
                <DetailRow label="Hoàn thành lúc">
                  {detail.completedAt ? formatDateTimeVN(detail.completedAt) : "—"}
                </DetailRow>
                <DetailRow label="Cấp lúc">
                  {detail.issuedAt ? formatDateTimeVN(detail.issuedAt) : "—"}
                </DetailRow>
                {detail.revokedAt && (
                  <DetailRow label="Thu hồi lúc">
                    <span className="text-[var(--danger)]">
                      {formatDateTimeVN(detail.revokedAt)}
                    </span>
                  </DetailRow>
                )}
                {detail.revokedReason && (
                  <DetailRow label="Lý do thu hồi">
                    <span className="text-[var(--danger)]">{detail.revokedReason}</span>
                  </DetailRow>
                )}
                <DetailRow label="Mã xác minh">
                  {detail.verificationCode ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="font-mono text-[0.7rem]">
                        {detail.verificationCode.slice(0, 12)}…
                      </span>
                      <button
                        type="button"
                        onClick={() => copyText(detail.verificationCode ?? "", "mã xác minh")}
                        aria-label="Sao chép mã xác minh"
                        className="focus-ink grid h-7 w-7 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--ink-soft)] transition-all hover:bg-[var(--blue-mist)] hover:text-[var(--ink)]"
                      >
                        <VCopy size={12} />
                      </button>
                    </span>
                  ) : (
                    "—"
                  )}
                </DetailRow>
              </dl>
              <div className="flex flex-wrap items-center gap-2">
                <InkButton
                  variant="royal"
                  size="sm"
                  disabled={detail.status !== "issued" || pdfBusyId === detail.id}
                  onClick={() => downloadPdf(detail)}
                >
                  <VDownload size={14} />
                  {pdfBusyId === detail.id ? "Đang tải…" : "Tải PDF"}
                </InkButton>
                {detail.status === "issued" && (
                  <InkButton
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRevokeTarget(detail);
                      setRevokeReason("");
                    }}
                  >
                    <VBan size={14} /> Thu hồi
                  </InkButton>
                )}
              </div>
            </>
          ) : null}
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setDetailId(null)}>
              Đóng
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================= DIALOG: thu hồi (nghiêm túc) ================= */}
      <Dialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--danger)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          {revokeTarget && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-extrabold text-[var(--danger)]">
                  <VBan size={18} /> Thu hồi chứng chỉ?
                </DialogTitle>
                <DialogDescription className="text-[var(--ink-soft)]">
                  {revokeTarget.certificateNumber} — {revokeTarget.holderNameSnapshot}. Thao tác này
                  giữ lại hồ sơ kèm lý do, gửi thông báo tới sinh viên và ghi audit. Không hoàn tác
                  trực tiếp được.
                </DialogDescription>
              </DialogHeader>
              <div>
                <FieldLabel htmlFor="revoke-reason">Lý do thu hồi (bắt buộc)</FieldLabel>
                <SketchTextarea
                  id="revoke-reason"
                  rows={3}
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="vd: Phát hiện vi phạm tiêu chí hoàn thành trong kỳ thực tập."
                />
              </div>
              <DialogFooter>
                <InkButton variant="ghost" size="sm" onClick={() => setRevokeTarget(null)}>
                  Hủy
                </InkButton>
                <InkButton
                  variant="outline"
                  size="sm"
                  disabled={revokeBusy}
                  onClick={submitRevoke}
                  className="!border-[var(--danger)] !text-[var(--danger)] hover:!bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]"
                >
                  <VBan size={14} /> {revokeBusy ? "Đang thu hồi…" : "Xác nhận thu hồi"}
                </InkButton>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ================= DIALOG: hint tra cứu công khai ==================== */}
      <Dialog open={verifyHintOpen} onOpenChange={setVerifyHintOpen}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[var(--ink)]">
              Tra cứu công khai chứng chỉ
            </DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Trang tra cứu công khai dùng mã xác minh in trên chứng chỉ — không cần đăng nhập.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm leading-relaxed text-[var(--ink)]">
            <p>
              Đường dẫn tra cứu có dạng{" "}
              <span className="rounded-[6px] border border-[color-mix(in_srgb,var(--ink)_30%,transparent)] bg-[var(--paper)] px-1.5 py-0.5 font-mono text-[0.72rem]">
                /api/v1/certificates/verify/&#123;mã xác minh&#125;
              </span>{" "}
              — dán mã xác minh của từng chứng chỉ vào cuối đường dẫn.
            </p>
            <p className="text-[0.8rem] text-[var(--ink-soft)]">
              Trang công khai chỉ trả: số chứng chỉ, tên người nhận, vai trò, dự án, ngày cấp (hoặc
              trạng thái đã thu hồi). Không lộ email, user ID hay điểm số nội bộ.
            </p>
          </div>
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setVerifyHintOpen(false)}>
              Đã hiểu
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
