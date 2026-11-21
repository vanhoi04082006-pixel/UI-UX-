"use client";
/* =====================================================================
 * SYSTEM ADAPTER (admin) — AdminSystem (4) + AiRuntime (2) + Communications
 * (3) + settings (2) + health (1) + audit (2). Contract khớp BE thật:
 *  · GET  /admin/system/status        → object phẳng (live-shapes)
 *  · GET  /admin/system/repositories  → {items, total, page, pageSize}
 *  · GET  /admin/system/contracts     → {checkedAt, valid, contracts[]}
 *  · POST /admin/system/contracts/validate {data: string}
 *  · GET  /admin/ai-configuration     → {policy, provider, ...}
 *  · PUT  /admin/ai-configuration     {policy: {model, timeoutMs, maxRetries, version}}
 *  · GET  /settings                   → {settings: [{key, value, ...}]}
 *  · PATCH /settings                  {key, value}
 *  · GET  /health                     (public — chip "sống")
 *  · GET  /admin/communications       ⚠ TỪ CHỐI pageSize — chỉ ?page= (hoặc trống)
 *  · GET  /admin/communications/{id}/preview
 *  · POST /admin/communications/{id}/resend
 *  · GET  /audit-logs                 → {data, meta} (page/pageSize/actorId/action/from/to)
 *  · GET  /activity-events            → {data, meta} (page/pageSize/actorId/module)
 * ===================================================================== */
import { request } from "./client";
import { array, boolean, nullable, number, parsePage, record, string } from "./parse";

/* ------------------------------ system status --------------------------- */

export interface AiUsageStat {
  feature: string;
  status: string;
  count: number;
  averageLatencyMs: number | null;
}

export interface SystemStatus {
  checkedAt: string | null;
  database: { status: string; latencyMs: number | null };
  counts: {
    users: number;
    activeSessions: number;
    activeQuestions: number;
    activeTemplates: number;
    migrations: number;
    runningReviews: number;
  };
  aiLast24Hours: AiUsageStat[];
  learningAlerts: {
    enabled: boolean;
    intervalSeconds: number | null;
    running: boolean;
    lastScanAt: string | null;
    lastResult: {
      created: number;
      muted: number;
      processed: number;
      busy: boolean;
    } | null;
    lastErrorCode: string | null;
  };
  integrations: {
    github: { configured: boolean; missing: string[] };
    webhook: { configured: boolean };
    runner: {
      configured: boolean;
      missing: string[];
      sealedSuites: number | null;
      suiteConfigValid: boolean;
      connectivity: string | null;
    };
  };
}

function parseMissingList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string");
}

export function getSystemStatus(): Promise<SystemStatus> {
  return request("/admin/system/status", (value) => {
    const v = record(value);
    const database = v.database === undefined || v.database === null ? {} : record(v.database);
    const counts = v.counts === undefined || v.counts === null ? {} : record(v.counts);
    const alerts =
      v.learningAlerts === undefined || v.learningAlerts === null
        ? null
        : record(v.learningAlerts);
    const lastResult =
      alerts && alerts.lastResult !== undefined && alerts.lastResult !== null
        ? record(alerts.lastResult)
        : null;
    const integrations =
      v.integrations === undefined || v.integrations === null
        ? null
        : record(v.integrations);
    const github =
      integrations && integrations.github !== undefined && integrations.github !== null
        ? record(integrations.github)
        : {};
    const webhook =
      integrations && integrations.webhook !== undefined && integrations.webhook !== null
        ? record(integrations.webhook)
        : {};
    const runner =
      integrations && integrations.runner !== undefined && integrations.runner !== null
        ? record(integrations.runner)
        : {};
    return {
      checkedAt: nullable(v.checkedAt, string),
      database: {
        status: nullable(database.status, string) ?? "unknown",
        latencyMs: nullable(database.latencyMs, number),
      },
      counts: {
        users: nullable(counts.users, number) ?? 0,
        activeSessions: nullable(counts.activeSessions, number) ?? 0,
        activeQuestions: nullable(counts.activeQuestions, number) ?? 0,
        activeTemplates: nullable(counts.activeTemplates, number) ?? 0,
        migrations: nullable(counts.migrations, number) ?? 0,
        runningReviews: nullable(counts.runningReviews, number) ?? 0,
      },
      aiLast24Hours: array(v.aiLast24Hours ?? [], (raw) => {
        const s = record(raw);
        return {
          feature: nullable(s.feature, string) ?? "",
          status: nullable(s.status, string) ?? "",
          count: nullable(s.count, number) ?? 0,
          averageLatencyMs: nullable(s.averageLatencyMs, number),
        };
      }),
      learningAlerts: {
        enabled: alerts?.enabled === true,
        intervalSeconds: alerts ? nullable(alerts.intervalSeconds, number) : null,
        running: alerts?.running === true,
        lastScanAt: alerts ? nullable(alerts.lastScanAt, string) : null,
        lastResult: lastResult
          ? {
              created: nullable(lastResult.created, number) ?? 0,
              muted: nullable(lastResult.muted, number) ?? 0,
              processed: nullable(lastResult.processed, number) ?? 0,
              busy: lastResult.busy === true,
            }
          : null,
        lastErrorCode: alerts ? nullable(alerts.lastErrorCode, string) : null,
      },
      integrations: {
        github: {
          configured: github.configured === true,
          missing: parseMissingList(github.missing),
        },
        webhook: { configured: webhook.configured === true },
        runner: {
          configured: runner.configured === true,
          missing: parseMissingList(runner.missing),
          sealedSuites: nullable(runner.sealedSuites, number),
          suiteConfigValid: runner.suiteConfigValid === true,
          connectivity: nullable(runner.connectivity, string),
        },
      },
    };
  });
}

/* --------------------------------- health -------------------------------- */

export interface HealthStatus {
  status: string;
  database: string | null;
  dbLatencyMs: number | null;
  ai: string | null;
  aiProvider: string | null;
  aiModel: string | null;
  uptimeSeconds: number | null;
  timestamp: string | null;
}

export function getHealth(): Promise<HealthStatus> {
  return request("/health", (value) => {
    const v = record(value);
    const checks =
      v.checks === undefined || v.checks === null ? {} : record(v.checks);
    return {
      status: nullable(v.status, string) ?? "unknown",
      database: nullable(checks.database, string),
      dbLatencyMs: nullable(checks.dbLatencyMs, number),
      ai: nullable(checks.ai, string),
      aiProvider: nullable(checks.aiProvider, string),
      aiModel: nullable(checks.aiModel, string),
      uptimeSeconds: nullable(v.uptimeSeconds, number),
      timestamp: nullable(v.timestamp, string),
    };
  });
}

/* ------------------------------ repositories ----------------------------- */

export interface SystemRepository {
  sessionId: string | null;
  sessionName: string;
  sessionCode: string | null;
  instructorName: string | null;
  ownerLogin: string;
  repoName: string;
  status: string;
  webhookStatus: string;
  webhookErrorCode: string | null;
  lastEventAt: string | null;
}

function parseRepository(value: unknown): SystemRepository {
  const v = record(value);
  return {
    sessionId: nullable(v.sessionId, string),
    sessionName: nullable(v.sessionName, string) ?? "",
    sessionCode: nullable(v.sessionCode, string),
    instructorName: nullable(v.instructorName, string),
    ownerLogin: nullable(v.ownerLogin, string) ?? "",
    repoName: nullable(v.repoName, string) ?? "",
    status: nullable(v.status, string) ?? "",
    webhookStatus: nullable(v.webhookStatus, string) ?? "",
    webhookErrorCode: nullable(v.webhookErrorCode, string),
    lastEventAt: nullable(v.lastEventAt, string),
  };
}

export async function listSystemRepositories(
  page = 1,
  pageSize = 25,
): Promise<{ items: SystemRepository[]; total: number }> {
  return request(
    `/admin/system/repositories?page=${page}&pageSize=${pageSize}`,
    (value) => {
      const v = record(value);
      return {
        items: array(v.items ?? [], parseRepository),
        total: nullable(v.total, number) ?? 0,
      };
    },
  );
}

/* -------------------------------- contracts ------------------------------ */

export interface GradingContractEntry {
  key: string;
  suiteId: string;
  digest: string;
  status: string;
  issues: string[];
  operator: {
    version: string | null;
    reviewer: string | null;
    sealedAt: string | null;
    runtimeImage: string | null;
    testerImage: string | null;
    complete: boolean | null;
  };
}

export interface GradingContracts {
  checkedAt: string | null;
  source: string;
  valid: boolean;
  error: string | null;
  contracts: GradingContractEntry[];
}

function parseContractEntry(value: unknown): GradingContractEntry {
  const v = record(value);
  const op =
    v.operator === undefined || v.operator === null ? {} : record(v.operator);
  const images =
    op.images === undefined || op.images === null ? {} : record(op.images);
  return {
    key: nullable(v.key, string) ?? "",
    suiteId: nullable(v.suiteId, string) ?? "",
    digest: nullable(v.digest, string) ?? "",
    status: nullable(v.status, string) ?? "",
    issues: parseMissingList(v.issues),
    operator: {
      version: nullable(op.version, string),
      reviewer: nullable(op.reviewer, string),
      sealedAt: nullable(op.sealedAt, string),
      runtimeImage: nullable(images.runtime, string),
      testerImage: nullable(images.tester, string),
      complete: nullable(op.complete, boolean),
    },
  };
}

export function getGradingContracts(): Promise<GradingContracts> {
  return request("/admin/system/contracts", (value) => {
    const v = record(value);
    return {
      checkedAt: nullable(v.checkedAt, string),
      source: nullable(v.source, string) ?? "",
      valid: v.valid === true,
      error: nullable(v.error, string),
      contracts: array(v.contracts ?? [], parseContractEntry),
    };
  });
}

/** Kết quả validate hợp đồng — BE trả object tùy trường hợp, giữ cả raw. */
export interface ContractValidation {
  valid: boolean | null;
  issues: string[];
  raw: Record<string, unknown>;
}

export function validateContractDraft(data: string): Promise<ContractValidation> {
  return request("/admin/system/contracts/validate", (value) => {
    const v = record(value);
    return {
      valid: nullable(v.valid, boolean),
      issues: parseMissingList(v.issues),
      raw: v,
    };
  }, { method: "POST", body: { data } });
}

/* ------------------------------ ai configuration ------------------------- */

export interface AiPolicy {
  model: string;
  timeoutMs: number;
  maxRetries: number;
  version: number;
}

export interface AiConfiguration {
  policy: AiPolicy;
  source: string | null;
  provider: string | null;
  credentialsConfigured: boolean;
  appliesTo: string[];
}

export function getAiConfiguration(): Promise<AiConfiguration> {
  return request("/admin/ai-configuration", (value) => {
    const v = record(value);
    const policy =
      v.policy === undefined || v.policy === null ? {} : record(v.policy);
    return {
      policy: {
        model: nullable(policy.model, string) ?? "",
        timeoutMs: nullable(policy.timeoutMs, number) ?? 120000,
        maxRetries: nullable(policy.maxRetries, number) ?? 1,
        version: nullable(policy.version, number) ?? 1,
      },
      source: nullable(v.source, string),
      provider: nullable(v.provider, string),
      credentialsConfigured: v.credentialsConfigured === true,
      appliesTo: parseMissingList(v.appliesTo),
    };
  });
}

export function updateAiConfiguration(
  policy: AiPolicy,
): Promise<AiConfiguration> {
  return request("/admin/ai-configuration", (value) => {
    const v = record(value);
    const p =
      v.policy === undefined || v.policy === null ? {} : record(v.policy);
    return {
      policy: {
        model: nullable(p.model, string) ?? policy.model,
        timeoutMs: nullable(p.timeoutMs, number) ?? policy.timeoutMs,
        maxRetries: nullable(p.maxRetries, number) ?? policy.maxRetries,
        version: nullable(p.version, number) ?? policy.version,
      },
      source: nullable(v.source, string),
      provider: nullable(v.provider, string),
      credentialsConfigured: v.credentialsConfigured === true,
      appliesTo: parseMissingList(v.appliesTo),
    };
  }, { method: "PUT", body: { policy } });
}

/* --------------------------------- settings ------------------------------- */

export interface SystemSetting {
  key: string;
  value: string;
  description: string | null;
  updatedAt: string | null;
}

function parseSetting(value: unknown): SystemSetting {
  const v = record(value);
  return {
    key: string(v.key),
    value: nullable(v.value, string) ?? "",
    description: nullable(v.description, string),
    updatedAt: nullable(v.updatedAt, string),
  };
}

export async function listSettings(): Promise<SystemSetting[]> {
  return request("/settings", (value) => {
    const v = record(value);
    return array(v.settings ?? [], parseSetting);
  });
}

export function updateSetting(input: {
  key: string;
  value: string;
}): Promise<SystemSetting> {
  return request("/settings", parseSetting, {
    method: "PATCH",
    body: input,
  });
}

/* ------------------------------- communications --------------------------- */

export interface CommunicationRecord {
  id: string;
  kind: string | null;
  recipientHint: string | null;
  status: string;
  attempts: number;
  availableAt: string | null;
  expiresAt: string | null;
  lastCode: string | null;
  createdAt: string | null;
}

export interface CommunicationsOverview {
  items: CommunicationRecord[];
  total: number;
  page: number;
  pageSize: number;
  transportConfigured: boolean;
  deliveryMode: string | null;
}

function parseCommunication(value: unknown): CommunicationRecord {
  const v = record(value);
  return {
    id: string(v.id),
    kind: nullable(v.kind, string),
    recipientHint: nullable(v.recipientHint, string),
    status: nullable(v.status, string) ?? "",
    attempts: nullable(v.attempts, number) ?? 0,
    availableAt: nullable(v.availableAt, string),
    expiresAt: nullable(v.expiresAt, string),
    lastCode: nullable(v.lastCode, string),
    createdAt: nullable(v.createdAt, string),
  };
}

/** ⚠ KHÔNG gửi pageSize — BE từ chối ("property pageSize should not exist"). */
export function listCommunications(page = 1): Promise<CommunicationsOverview> {
  const suffix = page > 1 ? `?page=${page}` : "";
  return request(`/admin/communications${suffix}`, (value) => {
    const v = record(value);
    return {
      items: array(v.items ?? [], parseCommunication),
      total: nullable(v.total, number) ?? 0,
      page: nullable(v.page, number) ?? 1,
      pageSize: nullable(v.pageSize, number) ?? 25,
      transportConfigured: v.transportConfigured === true,
      deliveryMode: nullable(v.deliveryMode, string),
    };
  });
}

export interface CommunicationPreview {
  redacted: boolean;
  message: string | null;
  subject: string | null;
  body: string | null;
  raw: Record<string, unknown>;
}

export function previewCommunication(id: string): Promise<CommunicationPreview> {
  return request(
    `/admin/communications/${encodeURIComponent(id)}/preview`,
    (value) => {
      const v = record(value);
      return {
        redacted: v.redacted === true,
        message: nullable(v.message, string),
        subject: nullable(v.subject, string),
        body: nullable(v.body, string) ?? nullable(v.html, string) ?? nullable(v.text, string),
        raw: v,
      };
    },
  );
}

export function resendCommunication(
  id: string,
): Promise<Record<string, unknown> | null> {
  return request(
    `/admin/communications/${encodeURIComponent(id)}/resend`,
    (value) => (value === null ? null : record(value)),
    { method: "POST", body: {} },
  );
}

/* ---------------------------------- audit --------------------------------- */

export interface AuditLogEntry {
  id: string;
  actorId: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  detail: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string | null;
}

export interface ActivityEventEntry {
  id: string;
  actorId: string;
  module: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  summary: string | null;
  displayName: string | null;
  createdAt: string | null;
}

export interface AuditPage {
  items: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ActivityPage {
  items: ActivityEventEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuditFilters {
  page?: number;
  pageSize?: number;
  actorId?: string;
  action?: string;
  from?: string;
  to?: string;
}

export function listAuditLogs(filters: AuditFilters = {}): Promise<AuditPage> {
  const params = new URLSearchParams();
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 20));
  if (filters.actorId) params.set("actorId", filters.actorId);
  if (filters.action) params.set("action", filters.action);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  return request(`/audit-logs?${params.toString()}`, (value) => {
    const body = parsePage(value, (raw) => {
      const v = record(raw);
      return {
        id: string(v.id),
        actorId: nullable(v.actorId, string) ?? "",
        action: nullable(v.action, string) ?? "",
        targetType: nullable(v.targetType, string),
        targetId: nullable(v.targetId, string),
        detail: nullable(v.detail, string),
        ip: nullable(v.ip, string),
        userAgent: nullable(v.userAgent, string),
        createdAt: nullable(v.createdAt, string),
      };
    });
    return body;
  });
}

export function listActivityEvents(
  opts: { page?: number; pageSize?: number; actorId?: string; module?: string } = {},
): Promise<ActivityPage> {
  const params = new URLSearchParams();
  params.set("page", String(opts.page ?? 1));
  params.set("pageSize", String(opts.pageSize ?? 20));
  if (opts.actorId) params.set("actorId", opts.actorId);
  if (opts.module) params.set("module", opts.module);
  return request(`/activity-events?${params.toString()}`, (value) => {
    return parsePage(value, (raw) => {
      const v = record(raw);
      return {
        id: string(v.id),
        actorId: nullable(v.actorId, string) ?? "",
        module: nullable(v.module, string) ?? "",
        action: nullable(v.action, string) ?? "",
        targetType: nullable(v.targetType, string),
        targetId: nullable(v.targetId, string),
        summary: nullable(v.summary, string),
        displayName: nullable(v.displayName, string),
        createdAt: nullable(v.createdAt, string),
      };
    });
  });
}
