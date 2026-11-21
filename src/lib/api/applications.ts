"use client";
/* =====================================================================
 * APPLICATIONS ADAPTER (public/candidate) — 8 ops, KHÔNG cần tài khoản.
 * Contract khớp BE thật (probe QA tunnel 2026-11-21 — xem agent-ctx/2-a):
 *  GET  /applications/rounds            → {items:[{id,name,opensAt,closesAt}]}
 *        (public rounds CHỈ 4 trường — không có status; FE tự suy luận cửa
 *         mở theo opensAt/closesAt, BE vẫn chặn thật bằng APPLICATIONS_CLOSED)
 *  POST /applications                   → multipart/form-data:
 *        roundId(UUID) · email · fullName(≥2) · consentVersion("cv-consent-v1")
 *        · cv(file PDF/DOCX ≤ 5MB, BẮT BUỘC — thiếu file → 400 "Cần đính kèm CV")
 *        → 201 {accepted:true}; rate limit 3/phút.
 *        KHÔNG nhận field roleCode (probe: "property roleCode should not exist").
 *  POST /applications/verify            → body {token} — token ≥ 40 ký tự
 *        lấy từ email (KHÔNG phải {email,code} như draft ban đầu).
 *        BE set cookie candidate → các lệnh /me phía dưới dựa cookie đó.
 *  POST /applications/request-access    → {roundId, email} → {accepted:true}
 *        (gửi lại thư truy cập/xác thực cho hồ sơ).
 *  GET  /applications/me                → hồ sơ candidate (401 khi cookie hết).
 *  GET  /applications/me/cv             → blob octet-stream (responseType "cv").
 *  POST /applications/me/cv             → multipart bổ sung/thay CV mới.
 *  POST /applications/leave             → {} → {cleared:true} (rút hồ sơ, xoá cookie).
 * =====================================================================
 */
import { apiFetch } from "./api-client";
import { array, boolean, nullable, number, record, string } from "./parse";

export const CV_CONSENT_VERSION = "cv-consent-v1";
export const CV_MAX_BYTES = 5 * 1024 * 1024;
export const CV_ACCEPTED_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

/* ------------------------------- helpers ------------------------------- */

/** Cờ xác nhận từ mutation ({accepted|verified|cleared|queued:true}) — chấp nhận
 * absence/khác kiểu, chỉ cần request OK là coi như thành công. */
function ackFlag(v: Record<string, unknown>, key: string): boolean {
  const raw = v[key];
  return typeof raw === "boolean" ? raw : true;
}

/* ------------------------------- rounds -------------------------------- */

export interface PublicRound {
  id: string;
  name: string;
  opensAt: string;
  closesAt: string;
}

/** GET /applications/rounds — các đợt tuyển công khai (4 trường). */
export async function listPublicRounds(): Promise<PublicRound[]> {
  const body = await apiFetch("/applications/rounds");
  const v = record(body);
  return array(v.items, (raw) => {
    const r = record(raw);
    return {
      id: string(r.id),
      name: string(r.name),
      opensAt: nullable(r.opensAt, string) ?? "",
      closesAt: nullable(r.closesAt, string) ?? "",
    };
  });
}

/* -------------------------------- apply -------------------------------- */

export interface ApplyInput {
  roundId: string;
  email: string;
  fullName: string;
  cv: File;
}

/** POST /applications (multipart) → {accepted:true}. */
export async function submitApplication(input: ApplyInput): Promise<boolean> {
  const form = new FormData();
  form.append("roundId", input.roundId);
  form.append("email", input.email);
  form.append("fullName", input.fullName);
  form.append("consentVersion", CV_CONSENT_VERSION);
  form.append("cv", input.cv);
  const body = await apiFetch("/applications", { method: "POST", formData: form });
  if (body === null || body === undefined) return true;
  return ackFlag(record(body), "accepted");
}

/* -------------------------------- verify ------------------------------- */

/**
 * POST /applications/verify {token} — token ≥ 40 ký tự từ email.
 * Chấp nhận người dùng dán cả liên kết: rút token ra nếu trông giống URL.
 */
export function extractVerificationToken(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const fromQuery = url.searchParams.get("token") ?? url.searchParams.get("code");
      if (fromQuery) return fromQuery.trim();
      const segments = url.pathname.split("/").filter(Boolean);
      const last = segments[segments.length - 1];
      if (last) return decodeURIComponent(last);
    } catch {
      /* URL lệch — rơi về dùng nguyên chuỗi */
    }
  }
  return trimmed;
}

/** POST /applications/verify — BE set cookie candidate khi hợp lệ. */
export async function verifyApplication(token: string): Promise<boolean> {
  const body = await apiFetch("/applications/verify", {
    method: "POST",
    body: { token },
  });
  if (body === null || body === undefined) return true;
  return ackFlag(record(body), "verified");
}

/** POST /applications/request-access {roundId, email} → {accepted:true}. */
export async function requestApplicationAccess(roundId: string, email: string): Promise<boolean> {
  const body = await apiFetch("/applications/request-access", {
    method: "POST",
    body: { roundId, email },
  });
  if (body === null || body === undefined) return true;
  return ackFlag(record(body), "accepted");
}

/* ------------------------------ hồ sơ của tôi -------------------------- */

export interface CandidateTimelineEntry {
  kind: string;
  message: string;
  createdAt: string;
}

export interface CandidateBooking {
  slotId: string | null;
  roleCode: string | null;
  startsAt: string | null;
  endsAt: string | null;
  timezone: string | null;
}

export interface CandidateApplication {
  id: string | null;
  fullName: string | null;
  email: string | null;
  status: string;
  matchedRole: string | null;
  revision: number | null;
  hasCv: boolean;
  roundId: string | null;
  roundName: string | null;
  timeline: CandidateTimelineEntry[];
  booking: CandidateBooking | null;
}

/**
 * GET /applications/me — hồ sơ candidate theo cookie.
 * Shape chưa có trong live-shapes (cần cookie verify thật) → parser cực kỳ
 * phòng thủ: mọi trường nullable, chỉ crashes khi response không phải object.
 */
export async function getMyApplication(): Promise<CandidateApplication> {
  const body = await apiFetch("/applications/me");
  const v = record(body);
  const round = v.round !== null && v.round !== undefined ? record(v.round) : null;
  const booking =
    v.booking === null || v.booking === undefined
      ? null
      : (() => {
          const b = record(v.booking);
          return {
            slotId: nullable(b.slotId, string),
            roleCode: nullable(b.roleCode, string),
            startsAt: nullable(b.startsAt, string),
            endsAt: nullable(b.endsAt, string),
            timezone: nullable(b.timezone, string),
          };
        })();
  return {
    id: nullable(v.id, string),
    fullName: nullable(v.fullName, string),
    email: nullable(v.email, string),
    status: nullable(v.status, string) ?? "unknown",
    matchedRole: nullable(v.matchedRole, string) ?? nullable(v.role, string),
    revision: nullable(v.revision, number),
    hasCv: v.hasCv === undefined ? false : boolean(v.hasCv),
    roundId: nullable(v.roundId, string) ?? (round ? nullable(round.id, string) : null),
    roundName: round ? nullable(round.name, string) : nullable(v.roundName, string),
    timeline: v.timeline === null || v.timeline === undefined
      ? []
      : array(v.timeline, (raw) => {
          const t = record(raw);
          return {
            kind: nullable(t.kind, string) ?? "",
            message: nullable(t.message, string) ?? "",
            createdAt: nullable(t.createdAt, string) ?? "",
          };
        }),
    booking,
  };
}

/** GET /applications/me/cv — tải CV về (blob octet-stream). */
export async function downloadMyCv(): Promise<Blob> {
  const blob = await apiFetch("/applications/me/cv", { responseType: "cv" });
  if (!(blob instanceof Blob)) throw new Error("INVALID_RESPONSE");
  return blob;
}

/** POST /applications/me/cv (multipart) — bổ sung/thay CV. */
export async function supplementMyCv(file: File): Promise<void> {
  const form = new FormData();
  form.append("cv", file);
  await apiFetch("/applications/me/cv", { method: "POST", formData: form });
}

/** POST /applications/leave → {cleared:true} — rút hồ sơ, xoá cookie candidate. */
export async function leaveApplication(): Promise<boolean> {
  const body = await apiFetch("/applications/leave", { method: "POST", body: {} });
  if (body === null || body === undefined) return true;
  return ackFlag(record(body), "cleared");
}

/* --------------------------- helper kiểm tra CV ------------------------ */

/** Kiểm tra file CV phía FE trước khi gửi (BE chặn PDF/DOCX ≤ 5MB). */
export function validateCvFile(file: File): string | null {
  const name = file.name.toLowerCase();
  const extOk = name.endsWith(".pdf") || name.endsWith(".docx");
  const typeOk = CV_ACCEPTED_TYPES.includes(file.type);
  if (!extOk && !typeOk) return "CV cần là tệp PDF hoặc DOCX.";
  if (file.size > CV_MAX_BYTES) return "CV tối đa 5 MB.";
  if (file.size === 0) return "Tệp CV trống — hãy kiểm tra lại.";
  return null;
}

/** Đoán đuôi file CV từ magic bytes (%PDF hoặc ZIP/DOCX) — dùng đặt tên khi tải về. */
export async function cvExtension(blob: Blob): Promise<string> {
  try {
    const head = await blob.slice(0, 4).text();
    if (head.startsWith("%PDF")) return "pdf";
    if (head.startsWith("PK")) return "docx";
  } catch {
    /* bỏ qua */
  }
  return "pdf";
}
