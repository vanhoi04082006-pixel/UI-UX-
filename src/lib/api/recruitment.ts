"use client";
/* =====================================================================
 * RECRUITMENT ADAPTER (admin) — RecruitmentRounds 16 ops.
 * Contract khớp BE thật (probe QA tunnel 2026-11-21 — xem agent-ctx/2-a):
 *  GET    /recruitment-rounds                       → {items: RoundRow[]}
 *  POST   /recruitment-rounds {name,opensAt,closesAt} → RoundDetail (status mặc định "draft")
 *  GET    /recruitment-rounds/{id}                  → RoundDetail (kèm slots[])
 *  POST   /recruitment-rounds/{id}/status {status}  → RoundDetail
 *         · status enum: draft | open | closed
 *  POST   /recruitment-rounds/{id}/slots            → RoundDetail
 *         · body {roleCode, startsAt, endsAt, timezone, capacity 1..100}
 *  POST   /recruitment-rounds/{id}/slots/{slotId}/close → {closed:true}
 *  GET    /recruitment-rounds/{id}/applications     → {items: AppRow[], total, page, pageSize}
 *  GET    /recruitment-rounds/{id}/applications/{aid}  → AppDetail (timeline, booking, analysis)
 *  POST   .../retry      {}        → {queued:true}
 *  POST   .../cancel     {}        → {cancelled:true}
 *  POST   .../reschedule {slotId}
 *  POST   .../resend-credentials {}
 *  GET   .../credential-recovery?slotId= → {allowed, message, revision|null, expiresAt|null}
 *  POST  .../recover-credentials {expectedRevision(64hex), reason>=10, slotId}
 *  POST  .../retake       {reason>=10, slotId}
 *  GET   .../cv           → blob application/octet-stream (responseType "cv")
 * Plus: GET /career-roles (cần token) → {items:[{code,label,...}]} cho dropdown roleCode
 *  của slot (endpoint này KHÔNG public — probe 2026-11-21 trả 401 khi không token).
 * =====================================================================
 */
import { request } from "./client";
import { array, boolean, nullable, number, record, string } from "./parse";

/* ------------------------------- helpers ------------------------------- */

/** Cờ xác nhận mutation ({queued|cancelled|closed:true}) — chấp nhận absence
 * hoặc khác kiểu, request OK là coi thành công. */
function ackFlag(v: Record<string, unknown>, key: string): boolean {
  const raw = v[key];
  return typeof raw === "boolean" ? raw : true;
}

/* ------------------------------- rounds -------------------------------- */

export type RoundStatus = "draft" | "open" | "closed";

export interface RecruitmentRoundRow {
  id: string;
  name: string;
  status: string;
  opensAt: string;
  closesAt: string;
  ownerId: string | null;
}

export interface InterviewSlot {
  id: string;
  roundId: string;
  roleCode: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  capacity: number;
  minimumPreparationMinutes: number | null;
  credentialsLeadMinutes: number | null;
  status: string;
  booked: number;
}

export interface RecruitmentRoundDetail {
  id: string;
  name: string;
  status: string;
  opensAt: string;
  closesAt: string;
  ownerId: string | null;
  createdAt: string | null;
  slots: InterviewSlot[];
}

function parseSlot(value: unknown): InterviewSlot {
  const v = record(value);
  return {
    id: string(v.id),
    roundId: nullable(v.roundId, string) ?? "",
    roleCode: nullable(v.roleCode, string) ?? "",
    startsAt: nullable(v.startsAt, string) ?? "",
    endsAt: nullable(v.endsAt, string) ?? "",
    timezone: nullable(v.timezone, string) ?? "",
    capacity: nullable(v.capacity, number) ?? 0,
    minimumPreparationMinutes: nullable(v.minimumPreparationMinutes, number),
    credentialsLeadMinutes: nullable(v.credentialsLeadMinutes, number),
    status: nullable(v.status, string) ?? "",
    booked: nullable(v.booked, number) ?? 0,
  };
}

function parseRoundDetail(value: unknown): RecruitmentRoundDetail {
  const v = record(value);
  return {
    id: string(v.id),
    name: string(v.name),
    status: nullable(v.status, string) ?? "draft",
    opensAt: nullable(v.opensAt, string) ?? "",
    closesAt: nullable(v.closesAt, string) ?? "",
    ownerId: nullable(v.ownerId, string),
    createdAt: nullable(v.createdAt, string),
    slots: v.slots === undefined || v.slots === null ? [] : array(v.slots, parseSlot),
  };
}

/** GET /recruitment-rounds — envelope {items} (admin thấy status + ownerId). */
export async function listRecruitmentRounds(): Promise<RecruitmentRoundRow[]> {
  const body = await request("/recruitment-rounds", (value) => {
    const v = record(value);
    return array(v.items, (raw) => {
      const r = record(raw);
      return {
        id: string(r.id),
        name: string(r.name),
        status: nullable(r.status, string) ?? "",
        opensAt: nullable(r.opensAt, string) ?? "",
        closesAt: nullable(r.closesAt, string) ?? "",
        ownerId: nullable(r.ownerId, string),
      } satisfies RecruitmentRoundRow;
    });
  });
  return body;
}

export interface CreateRoundInput {
  name: string;
  opensAt: string;
  closesAt: string;
}

/** POST /recruitment-rounds → trả về đợt vừa tạo (status mặc định "draft"). */
export async function createRecruitmentRound(input: CreateRoundInput): Promise<RecruitmentRoundDetail> {
  return request("/recruitment-rounds", parseRoundDetail, {
    method: "POST",
    body: { name: input.name, opensAt: input.opensAt, closesAt: input.closesAt },
  });
}

/** GET /recruitment-rounds/{id} — chi tiết + danh sách slot. */
export async function getRecruitmentRound(id: string): Promise<RecruitmentRoundDetail> {
  return request(`/recruitment-rounds/${encodeURIComponent(id)}`, parseRoundDetail);
}

/** POST /recruitment-rounds/{id}/status — enum: draft | open | closed. */
export async function setRecruitmentRoundStatus(id: string, status: RoundStatus): Promise<RecruitmentRoundDetail> {
  return request(`/recruitment-rounds/${encodeURIComponent(id)}/status`, parseRoundDetail, {
    method: "POST",
    body: { status },
  });
}

/* -------------------------------- slots -------------------------------- */

export interface CreateSlotInput {
  roleCode: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  capacity: number;
}

/** POST /recruitment-rounds/{id}/slots → trả về round detail (kèm slot mới). */
export async function createInterviewSlot(roundId: string, input: CreateSlotInput): Promise<RecruitmentRoundDetail> {
  return request(`/recruitment-rounds/${encodeURIComponent(roundId)}/slots`, parseRoundDetail, {
    method: "POST",
    body: {
      roleCode: input.roleCode,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      timezone: input.timezone,
      capacity: input.capacity,
    },
  });
}

/** POST /recruitment-rounds/{id}/slots/{slotId}/close → {closed:true}. */
export async function closeInterviewSlot(roundId: string, slotId: string): Promise<boolean> {
  const body = await request(
    `/recruitment-rounds/${encodeURIComponent(roundId)}/slots/${encodeURIComponent(slotId)}/close`,
    (value) => {
      if (value === null || value === undefined) return true;
      return ackFlag(record(value), "closed");
    },
    { method: "POST", body: {} },
  );
  return body;
}

/* ----------------------------- applications ---------------------------- */

export interface RoundApplicationRow {
  id: string;
  fullName: string;
  email: string | null;
  status: string;
  matchedRole: string | null;
  revision: number | null;
  createdAt: string | null;
  lastCode: string | null;
}

export interface ApplicationTimelineEntry {
  kind: string;
  message: string;
  createdAt: string;
}

export interface ApplicationBooking {
  slotId: string | null;
  roleCode: string | null;
  startsAt: string | null;
  endsAt: string | null;
  timezone: string | null;
  status: string | null;
}

export interface RoundApplicationDetail {
  id: string;
  fullName: string;
  status: string;
  matchedRole: string | null;
  revision: number | null;
  hasCv: boolean;
  timeline: ApplicationTimelineEntry[];
  booking: ApplicationBooking | null;
  analysisFactsPresent: boolean;
  analysisMatchScore: number | null;
  analysisMatchLabel: string | null;
}

function parseBooking(value: unknown): ApplicationBooking | null {
  if (value === null || value === undefined) return null;
  const v = record(value);
  return {
    slotId: nullable(v.slotId, string),
    roleCode: nullable(v.roleCode, string),
    startsAt: nullable(v.startsAt, string),
    endsAt: nullable(v.endsAt, string),
    timezone: nullable(v.timezone, string),
    status: nullable(v.status, string),
  };
}

function parseApplicationDetail(value: unknown): RoundApplicationDetail {
  const v = record(value);
  const analysis = v.analysis === null || v.analysis === undefined ? null : record(v.analysis);
  const match = analysis && analysis.match !== null && analysis.match !== undefined
    ? record(analysis.match)
    : null;
  return {
    id: string(v.id),
    fullName: nullable(v.fullName, string) ?? "",
    status: nullable(v.status, string) ?? "",
    matchedRole: nullable(v.matchedRole, string),
    revision: nullable(v.revision, number),
    hasCv: v.hasCv === undefined ? false : boolean(v.hasCv),
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
    booking: parseBooking(v.booking),
    analysisFactsPresent: analysis !== null && analysis.facts !== null && analysis.facts !== undefined,
    analysisMatchScore: match ? nullable(match.score, number) : null,
    analysisMatchLabel: match
      ? (nullable(match.label, string) ?? nullable(match.summary, string) ?? nullable(match.roleCode, string))
      : null,
  };
}

/** GET /recruitment-rounds/{id}/applications — envelope {items,total,page,pageSize}. */
export async function listRoundApplications(roundId: string): Promise<RoundApplicationRow[]> {
  const body = await request(
    `/recruitment-rounds/${encodeURIComponent(roundId)}/applications?page=1&pageSize=50`,
    (value) => {
      const v = record(value);
      return array(v.items, (raw) => {
        const r = record(raw);
        return {
          id: string(r.id),
          fullName: nullable(r.fullName, string) ?? "",
          email: nullable(r.email, string),
          status: nullable(r.status, string) ?? "",
          matchedRole: nullable(r.matchedRole, string),
          revision: nullable(r.revision, number),
          createdAt: nullable(r.createdAt, string),
          lastCode: nullable(r.lastCode, string),
        } satisfies RoundApplicationRow;
      });
    },
  );
  return body;
}

/** GET /recruitment-rounds/{id}/applications/{applicationId} — chi tiết hồ sơ. */
export async function getRoundApplication(roundId: string, applicationId: string): Promise<RoundApplicationDetail> {
  return request(
    `/recruitment-rounds/${encodeURIComponent(roundId)}/applications/${encodeURIComponent(applicationId)}`,
    parseApplicationDetail,
  );
}

/** GET /recruitment-rounds/{id}/applications/{aid}/cv — blob (application/octet-stream). */
export async function downloadRoundApplicationCv(roundId: string, applicationId: string): Promise<Blob> {
  const blob = await request(
    `/recruitment-rounds/${encodeURIComponent(roundId)}/applications/${encodeURIComponent(applicationId)}/cv`,
    (value) => {
      if (!(value instanceof Blob)) throw new Error("INVALID_RESPONSE");
      return value;
    },
    { responseType: "cv" },
  );
  return blob;
}

/* ---------------------- hành động trên từng hồ sơ ---------------------- */

/** Mutation trả payload nhẹ — chấp nhận null hoặc object, chỉ cần request OK. */
async function mutationAck(path: string, body?: unknown): Promise<void> {
  await request(path, () => null, { method: "POST", body: body ?? {} });
}

/** POST .../retry → {queued:true} — xếp hàng phân tích lại CV. */
export async function retryRoundApplication(roundId: string, applicationId: string): Promise<boolean> {
  const body = await request(
    `/recruitment-rounds/${encodeURIComponent(roundId)}/applications/${encodeURIComponent(applicationId)}/retry`,
    (value) => {
      if (value === null || value === undefined) return true;
      return ackFlag(record(value), "queued");
    },
    { method: "POST", body: {} },
  );
  return body;
}

/** POST .../cancel → {cancelled:true}. */
export async function cancelRoundApplication(roundId: string, applicationId: string): Promise<boolean> {
  const body = await request(
    `/recruitment-rounds/${encodeURIComponent(roundId)}/applications/${encodeURIComponent(applicationId)}/cancel`,
    (value) => {
      if (value === null || value === undefined) return true;
      return ackFlag(record(value), "cancelled");
    },
    { method: "POST", body: {} },
  );
  return body;
}

/** POST .../reschedule {slotId} — chuyển hồ sơ sang khung giờ khác. */
export async function rescheduleRoundApplication(roundId: string, applicationId: string, slotId: string): Promise<void> {
  await mutationAck(
    `/recruitment-rounds/${encodeURIComponent(roundId)}/applications/${encodeURIComponent(applicationId)}/reschedule`,
    { slotId },
  );
}

/** POST .../resend-credentials {} — gửi lại email đăng nhập phỏng vấn. */
export async function resendRoundApplicationCredentials(roundId: string, applicationId: string): Promise<void> {
  await mutationAck(
    `/recruitment-rounds/${encodeURIComponent(roundId)}/applications/${encodeURIComponent(applicationId)}/resend-credentials`,
    {},
  );
}

export interface CredentialRecoveryPreview {
  allowed: boolean;
  message: string;
  revision: string | null;
  expiresAt: string | null;
}

/** GET .../credential-recovery?slotId= — xem trước khả năng khôi phục chứng danh. */
export async function previewCredentialRecovery(
  roundId: string,
  applicationId: string,
  slotId: string,
): Promise<CredentialRecoveryPreview> {
  return request(
    `/recruitment-rounds/${encodeURIComponent(roundId)}/applications/${encodeURIComponent(applicationId)}` +
      `/credential-recovery?slotId=${encodeURIComponent(slotId)}`,
    (value) => {
      const v = record(value);
      return {
        allowed: boolean(v.allowed),
        message: nullable(v.message, string) ?? "",
        revision: nullable(v.revision, string),
        expiresAt: nullable(v.expiresAt, string),
      };
    },
  );
}

export interface RecoverCredentialsInput {
  expectedRevision: string;
  reason: string;
  slotId: string;
}

/** POST .../recover-credentials {expectedRevision, reason, slotId}. */
export async function recoverRoundApplicationCredentials(
  roundId: string,
  applicationId: string,
  input: RecoverCredentialsInput,
): Promise<void> {
  await mutationAck(
    `/recruitment-rounds/${encodeURIComponent(roundId)}/applications/${encodeURIComponent(applicationId)}/recover-credentials`,
    input,
  );
}

export interface RetakeInput {
  reason: string;
  slotId: string;
}

/** POST .../retake {reason>=10, slotId} — đặt lịch thi lại. */
export async function retakeRoundApplication(roundId: string, applicationId: string, input: RetakeInput): Promise<void> {
  await mutationAck(
    `/recruitment-rounds/${encodeURIComponent(roundId)}/applications/${encodeURIComponent(applicationId)}/retake`,
    input,
  );
}

/* ---------------------------- career roles ----------------------------- */

export interface CareerRoleOption {
  code: string;
  label: string;
}

/**
 * GET /career-roles — danh sách vai trò nghề nghiệp cho dropdown roleCode
 * khi tạo slot (endpoint CẦN token admin/instructor — không public).
 */
export async function listCareerRoleOptions(): Promise<CareerRoleOption[]> {
  const body = await request("/career-roles", (value) => {
    const v = record(value);
    return array(v.items, (raw) => {
      const r = record(raw);
      return {
        code: string(r.code),
        label: nullable(r.label, string) ?? string(r.code),
      };
    });
  });
  return body;
}

/* ------------------------- helper dùng chung UI ------------------------ */

/** Cờ "còn nhận hồ sơ" tính phía FE cho round public (không có status). */
export function isRoundWindowOpen(round: { opensAt: string; closesAt: string }): boolean {
  const now = Date.now();
  const open = round.opensAt ? new Date(round.opensAt).getTime() : Number.NEGATIVE_INFINITY;
  const close = round.closesAt ? new Date(round.closesAt).getTime() : Number.POSITIVE_INFINITY;
  return now >= open && now < close;
}

/** Tải blob CV về máy — tạo object URL rồi click tạm. */
export function saveBlobAs(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
