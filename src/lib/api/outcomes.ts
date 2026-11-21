"use client";
/* =====================================================================
 * OUTCOMES ADAPTER (intern) — contract BE thật:
 *  · GET  /intern/me/evaluations            → {items} đánh giá đã chốt
 *  · GET  /intern/me/kpi                    → {items} kết quả KPI
 *  · GET  /intern/me/virtual-salary         → số dư lương ảo (object phẳng)
 *  · GET  /intern/me/virtual-salary/ledger  → {items} sổ giao dịch
 *  · GET  /intern/me/certificates           → {items} chứng nhận
 *  · GET  /intern/me/certificates/{id}/pdf  → tải PDF (blob)
 *  · GET  /notifications?page&pageSize&unread → {data, meta}
 *  · POST /notifications/{id}/read          → 204
 *  · POST /notifications/read-all
 *  · GET  /notifications/unread-count       → {count}
 *  · GET/PUT /notifications/preferences     → {preferences} / {category, enabled}
 * Lưu ý: BE KHÔNG có mark-unread từng mục — markNotificationsUnread là
 * no-op trả số lượng (giữ tên export cho bell-utils / màn thông báo).
 * ===================================================================== */
import { request } from "./client";
import { array, record } from "./parse";
import type {
  Certificate,
  Evaluation,
  KpiRecord,
  NotificationItem,
  Role,
  SalaryEntry,
} from "@/lib/mock/types";

/* --------------------- helpers parse defensive --------------------- */

/** Chuỗi khác rỗng đầu tiên trong các giá trị dự phòng. */
function pickStr(...values: unknown[]): string | null {
  for (const val of values) {
    if (typeof val === "string" && val.length > 0) return val;
    if (typeof val === "number" && Number.isFinite(val)) return String(val);
  }
  return null;
}
function pickNum(...values: unknown[]): number | null {
  for (const val of values) {
    if (typeof val === "number" && Number.isFinite(val)) return val;
  }
  return null;
}
function isRec(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
/** Envelope {items} của nhóm intern/* — parse thủ công, thiếu items → []. */
function parseItems<T>(value: unknown, item: (raw: unknown) => T): T[] {
  const v = record(value);
  return array(v.items ?? [], item);
}

/* ------------------------------ evaluations ------------------------------ */

function parseEvaluation(value: unknown): Evaluation {
  const v = record(value);
  const criteriaRaw = Array.isArray(v.criteria) ? v.criteria : Array.isArray(v.scores) ? v.scores : [];
  return {
    id: pickStr(v.id) ?? "",
    sprint: pickStr(v.cycleName, v.sprint, v.cycle, v.periodName) ?? "Kỳ đánh giá",
    instructor: pickStr(v.instructorName, v.instructor, v.evaluatorName) ?? "Giảng viên",
    aiScore: pickNum(v.aiScore, v.aiTotalScore, v.machineScore) ?? 0,
    finalScore: pickNum(v.finalScore, v.totalScore, v.score, v.overallScore) ?? 0,
    comment: pickStr(v.comment, v.notes, v.summary, v.feedback) ?? "",
    criteria: criteriaRaw.map((raw) => {
      const c = record(raw);
      return {
        label: pickStr(c.label, c.name, c.criterionName) ?? "Tiêu chí",
        score: pickNum(c.score, c.value) ?? 0,
        max: pickNum(c.max, c.maxScore) ?? 10,
        weight: pickNum(c.weight) ?? undefined,
      };
    }),
    finalizedAt: pickStr(v.finalizedAt, v.finalized_at, v.submittedAt, v.createdAt) ?? new Date().toISOString(),
  };
}

export async function listMyEvaluations(): Promise<Evaluation[]> {
  return request("/intern/me/evaluations", (value) => parseItems(value, parseEvaluation));
}

/* --------------------------------- KPI --------------------------------- */

function parseKpi(value: unknown): KpiRecord {
  const v = record(value);
  const period = isRec(v.period) ? v.period : {};
  const metricsRaw = Array.isArray(v.metrics) ? v.metrics : Array.isArray(v.metricResults) ? v.metricResults : [];
  return {
    id: pickStr(v.id) ?? "",
    period: pickStr(period.name, period.code, period.label, v.periodName) ?? "Kỳ KPI",
    score: pickNum(v.score, v.totalScore, v.finalScore) ?? 0,
    ruleVersion: pickStr(v.ruleVersion, v.rule_version) ?? "kpi-v1",
    calculatedAt: pickStr(v.calculatedAt, v.calculated_at, v.createdAt) ?? new Date().toISOString(),
    metrics: metricsRaw.map((raw) => {
      const m = record(raw);
      return {
        code: pickStr(m.code, m.metricCode) ?? "metric",
        label: pickStr(m.label, m.name, m.metricName) ?? "Chỉ số",
        value: pickNum(m.value, m.metricValue) ?? 0,
        display: pickStr(m.display, m.displayValue) ?? String(pickNum(m.value) ?? 0),
        weight: pickNum(m.weight) ?? 0,
        contribution: pickNum(m.contribution, m.points) ?? 0,
      };
    }),
  };
}

export async function listMyKpi(): Promise<KpiRecord[]> {
  return request("/intern/me/kpi", (value) => parseItems(value, parseKpi));
}

/* ------------------------------ virtual salary ------------------------------ */

export interface MySalaryBalance {
  balance: number;
  /** Đơn vị ảo từ BE ("VND_VIRTUAL") — giữ `currency` tương thích màn cũ. */
  unit: string;
  currency: string;
  virtual: boolean;
  earnedThisPeriod: number;
  entryCount: number;
}

export async function getMySalaryBalance(): Promise<MySalaryBalance> {
  return request("/intern/me/virtual-salary", (value) => {
    const v = record(value);
    const latest = Array.isArray(v.latestEntries) ? v.latestEntries.length : 0;
    return {
      balance: pickNum(v.balance, v.total) ?? 0,
      unit: pickStr(v.unit, v.currency) ?? "VND_VIRTUAL",
      currency: pickStr(v.unit, v.currency) ?? "VND_VIRTUAL",
      virtual: v.virtual === true,
      earnedThisPeriod: pickNum(v.earnedThisPeriod) ?? 0,
      entryCount: pickNum(v.entryCount) ?? latest,
    };
  });
}

/** type BE → nhãn hiển thị của màn KPI & Lương ảo. */
function salaryTypeLabel(raw: string | null): SalaryEntry["type"] {
  switch ((raw ?? "").toLowerCase()) {
    case "kpi":
    case "kpi_earned":
    case "kpi-earned":
      return "KPI";
    case "bonus":
    case "reward":
      return "Thưởng";
    default:
      return "Điều chỉnh";
  }
}

export async function listMySalaryLedger(): Promise<SalaryEntry[]> {
  return request("/intern/me/virtual-salary/ledger?page=1&pageSize=50", (value) =>
    parseItems(value, (raw) => {
      const v = record(raw);
      return {
        id: pickStr(v.id) ?? "",
        at: pickStr(v.createdAt, v.created_at, v.at, v.occurredAt) ?? new Date().toISOString(),
        type: salaryTypeLabel(pickStr(v.type, v.sourceType)),
        amount: pickNum(v.amount, v.value) ?? 0,
        note: pickStr(v.description, v.note, v.reason, v.title) ?? "",
        period: pickStr(v.periodName, v.period) ?? undefined,
      };
    }),
  );
}

/* ------------------------------ certificates ------------------------------ */

export async function listMyCertificates(): Promise<Certificate[]> {
  return request("/intern/me/certificates", (value) =>
    parseItems(value, (raw) => {
      const v = record(raw);
      const status = pickStr(v.status) ?? "issued";
      return {
        id: pickStr(v.id) ?? "",
        code: pickStr(v.certificateNumber, v.code, v.number) ?? "—",
        project: pickStr(v.projectNameSnapshot, v.projectName, v.project) ?? "Dự án thực tập",
        session: pickStr(v.sessionNameSnapshot, v.sessionName, v.session) ?? "Phiên thực tập",
        issuedAt: pickStr(v.issuedAt, v.issued_at, v.createdAt) ?? new Date().toISOString(),
        verifyCode: pickStr(v.verificationCode, v.verifyCode) ?? "—",
        status: status === "revoked" ? "revoked" : "valid",
      };
    }),
  );
}

/** GET /intern/me/certificates/{id}/pdf — tải PDF chứng nhận (blob). */
export async function downloadMyCertificatePdf(id: string): Promise<Blob> {
  return request(`/intern/me/certificates/${encodeURIComponent(id)}/pdf`, (value) => {
    if (value instanceof Blob) return value;
    throw new Error("Dữ liệu PDF trả về chưa hợp lệ.");
  }, { responseType: "blob" });
}

/* ----------------------------- notifications ----------------------------- */

/** Mã nhóm BE → nhãn tiếng Việt mà bell-utils dùng để tô màu. */
const CATEGORY_VN: Record<string, string> = {
  system: "Hệ thống",
  task: "Nhiệm vụ",
  session: "Phiên thực tập",
  evaluation: "Đánh giá",
  announcement: "Hệ thống",
  recruitment: "Tuyển dụng",
  kpi: "KPI",
  salary: "Lương ảo",
  certificate: "Chứng nhận",
  user: "Người dùng",
};

function mapCategory(raw: string | null): NotificationItem["category"] {
  if (!raw) return "Hệ thống";
  const key = raw.toLowerCase();
  const vn = CATEGORY_VN[key];
  if (vn) return vn as NotificationItem["category"];
  /* BE/mock có thể trả sẵn nhãn tiếng Việt — giữ nguyên. */
  return raw as NotificationItem["category"];
}

function parseNotification(value: unknown): NotificationItem {
  const v = record(value);
  return {
    id: pickStr(v.id) ?? "",
    role: (pickStr(v.role) ?? "intern") as Role,
    category: mapCategory(pickStr(v.category, v.type, v.kind)),
    title: pickStr(v.title, v.summary, v.subject) ?? "Thông báo",
    body: pickStr(v.body, v.message, v.content, v.description) ?? "",
    at: pickStr(v.at, v.createdAt, v.created_at, v.sentAt) ?? new Date().toISOString(),
    read: v.read === true || v.readAt != null,
  };
}

export async function listNotifications(unread = false): Promise<NotificationItem[]> {
  /* Envelope {data, meta} — parse thủ công, không phụ thuộc parsePage. */
  const body = await request(
    `/notifications?page=1&pageSize=50${unread ? "&unread=true" : ""}`,
    (value) => {
      const v = record(value);
      return array(v.data ?? [], parseNotification);
    },
  );
  return body;
}

/**
 * Đánh dấu đã đọc:
 *  · all=true (hoặc không có id) → POST /notifications/read-all
 *  · ngược lại → POST /notifications/{id}/read cho từng id (BE trả 204)
 */
export async function markNotificationsRead(ids?: string[], all = false): Promise<number> {
  if (all || !ids || ids.length === 0) {
    await request("/notifications/read-all", () => null, { method: "POST" });
    return ids?.length ?? 0;
  }
  let done = 0;
  for (const id of ids) {
    await request(`/notifications/${encodeURIComponent(id)}/read`, () => null, { method: "POST" });
    done += 1;
  }
  return done;
}

/**
 * BE KHÔNG có endpoint mark-unread từng mục — no-op trả số lượng để
 * bell-utils / màn thông báo vẫn hoạt động (optimistic ở phía FE).
 */
export async function markNotificationsUnread(ids: string[]): Promise<number> {
  return ids.length;
}

/** GET /notifications/unread-count → {count}. */
export async function getUnreadCount(): Promise<number> {
  return request("/notifications/unread-count", (value) => {
    const v = record(value);
    return pickNum(v.count) ?? 0;
  });
}

/* --------------------------- notification preferences --------------------------- */

export interface NotificationPreference {
  category: string;
  enabled: boolean;
}

export async function getNotificationPreferences(): Promise<NotificationPreference[]> {
  return request("/notifications/preferences", (value) => {
    const v = record(value);
    return array(v.preferences ?? [], (raw) => {
      const p = record(raw);
      return {
        category: pickStr(p.category, p.type) ?? "system",
        enabled: p.enabled === true,
      };
    });
  });
}

/** PUT /notifications/preferences — bật/tắt một nhóm thông báo. */
export async function setNotificationPreference(
  category: string,
  enabled: boolean,
): Promise<null> {
  return request("/notifications/preferences", () => null, {
    method: "PUT",
    body: { category, enabled },
  });
}
