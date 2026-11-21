"use client";
/* =====================================================================
 * CERTIFICATES ADAPTER (admin) — nhóm certificates (6 ops) + helper users.
 * Contract khớp BE thật (docs/api-specs/certificates.md):
 *  · GET  /certificates                → {items, total}
 *    ⚠ BE 500 nếu thiếu page HOẶC pageSize → luôn gửi đủ cả hai.
 *  · POST /certificates/issue          {userId} (đủ điều kiện do BE kiểm tra)
 *  · GET  /certificates/verify/{code}  (public)
 *  · GET  /certificates/{id}           → chi tiết đủ field
 *  · GET  /certificates/{id}/pdf       → blob PDF (chỉ chứng chỉ đã cấp)
 *  · POST /certificates/{id}/revoke    {reason}
 * Helper: GET /users?page&pageSize → chọn người nhận khi cấp.
 * ===================================================================== */
import { request } from "./client";
import { array, nullable, number, record, string } from "./parse";

export interface CertificateRecord {
  id: string;
  certificateNumber: string;
  verificationCode: string | null;
  userId: string | null;
  projectId: string | null;
  sessionId: string | null;
  assignmentId: string | null;
  evaluationId: string | null;
  kpiResultId: string | null;
  policyCode: string;
  policyVersion: number | null;
  status: string;
  issuedAt: string | null;
  completedAt: string | null;
  holderNameSnapshot: string | null;
  roleLabelSnapshot: string | null;
  projectNameSnapshot: string | null;
  sessionNameSnapshot: string | null;
  issuedById: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
}

function parseCertificate(value: unknown): CertificateRecord {
  const v = record(value);
  return {
    id: string(v.id),
    certificateNumber: nullable(v.certificateNumber, string) ?? "",
    verificationCode: nullable(v.verificationCode, string),
    userId: nullable(v.userId, string),
    projectId: nullable(v.projectId, string),
    sessionId: nullable(v.sessionId, string),
    assignmentId: nullable(v.assignmentId, string),
    evaluationId: nullable(v.evaluationId, string),
    kpiResultId: nullable(v.kpiResultId, string),
    policyCode: nullable(v.policyCode, string) ?? "",
    policyVersion: nullable(v.policyVersion, number),
    status: nullable(v.status, string) ?? "issued",
    issuedAt: nullable(v.issuedAt, string),
    completedAt: nullable(v.completedAt, string),
    holderNameSnapshot: nullable(v.holderNameSnapshot, string),
    roleLabelSnapshot: nullable(v.roleLabelSnapshot, string),
    projectNameSnapshot: nullable(v.projectNameSnapshot, string),
    sessionNameSnapshot: nullable(v.sessionNameSnapshot, string),
    issuedById: nullable(v.issuedById, string),
    revokedAt: nullable(v.revokedAt, string),
    revokedReason: nullable(v.revokedReason, string),
  };
}

/** Luôn gửi đủ page + pageSize — BE lỗi 500 khi thiếu một trong hai. */
export async function listCertificates(
  page = 1,
  pageSize = 20,
): Promise<{ items: CertificateRecord[]; total: number }> {
  return request(`/certificates?page=${page}&pageSize=${pageSize}`, (value) => {
    const v = record(value);
    return {
      items: array(v.items ?? [], parseCertificate),
      total: nullable(v.total, number) ?? 0,
    };
  });
}

export async function getCertificate(id: string): Promise<CertificateRecord> {
  return request(`/certificates/${encodeURIComponent(id)}`, parseCertificate);
}

export async function issueCertificate(input: {
  userId: string;
}): Promise<CertificateRecord | null> {
  return request(
    "/certificates/issue",
    (value) => (value === null ? null : parseCertificate(value)),
    { method: "POST", body: input },
  );
}

export async function revokeCertificate(
  id: string,
  reason: string,
): Promise<CertificateRecord | null> {
  return request(
    `/certificates/${encodeURIComponent(id)}/revoke`,
    (value) => (value === null ? null : parseCertificate(value)),
    { method: "POST", body: { reason } },
  );
}

/** Tra cứu công khai — không cần token, không lộ nội bộ. */
export async function verifyCertificate(
  code: string,
): Promise<Record<string, unknown>> {
  return request(
    `/certificates/verify/${encodeURIComponent(code)}`,
    (value) => record(value),
  );
}

/** Tải PDF máy chủ — blob → objectURL ở màn hình. */
export async function downloadCertificatePdf(id: string): Promise<Blob> {
  const value = await request(
    `/certificates/${encodeURIComponent(id)}/pdf`,
    (v) => v,
    { responseType: "blob" },
  );
  if (!(value instanceof Blob)) {
    throw new Error("PDF trả về không hợp lệ.");
  }
  return value;
}

/* ------------------------------ users helper ----------------------------- */

export interface IssueCandidate {
  id: string;
  displayName: string;
  email: string;
  status: string;
}

/** Chọn người nhận cấp chứng chỉ — GET /users (envelope {data, meta}). */
export async function listIssueCandidates(): Promise<IssueCandidate[]> {
  return request("/users?page=1&pageSize=100", (value) => {
    const v = record(value);
    return array(v.data ?? [], (raw) => {
      const u = record(raw);
      return {
        id: string(u.id),
        displayName: nullable(u.displayName, string) ?? nullable(u.username, string) ?? "",
        email: nullable(u.email, string) ?? "",
        status: nullable(u.status, string) ?? "",
      };
    });
  });
}
