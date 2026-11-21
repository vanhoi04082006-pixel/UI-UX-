"use client";
/* =====================================================================
 * KPI-ADMIN ADAPTER (admin) — kỳ KPI + kết quả KPI + lương ảo.
 * Envelope list: { items: T[], total } (live-shapes 2026-11).
 * Ops cover:
 *  KPI PERIODS (8):
 *   GET   /kpi-periods (filter status)
 *   POST  /kpi-periods
 *   GET   /kpi-periods/{id}
 *   PATCH /kpi-periods/{id}
 *   POST  /kpi-periods/{id}/calculate
 *   POST  /kpi-periods/{id}/finalize
 *   GET   /kpi-periods/{id}/results
 *   POST  /kpi-periods/{id}/status
 *  KPI RESULTS (1):
 *   GET   /kpi-results/{id}  → { result, metrics[] }
 *  VIRTUAL SALARY (4):
 *   GET   /virtual-salary (userId, type, kpiPeriodId)
 *   POST  /virtual-salary/adjustments
 *   POST  /virtual-salary/generate/{kpiPeriodId}
 *   GET   /virtual-salary/users/{userId}/balance
 * ===================================================================== */
import { request } from "./client";
import { array, nullable, number, record, string } from "./parse";

export type KpiPeriodStatus = "draft" | "open" | "calculating" | "finalized" | "closed";
export type AdjustmentType = "bonus" | "penalty" | "adjustment" | "reversal";

export interface KpiPeriod {
  id: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: KpiPeriodStatus;
  ruleVersion: string;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KpiResultRow {
  id: string;
  periodId: string;
  userId: string;
  ruleVersion: string;
  status: string;
  finalScore: number | null;
  calculatedAt: string | null;
  calculatedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KpiMetric {
  id: string;
  kpiResultId: string;
  metricCode: string;
  configuredWeight: number;
  effectiveWeight: number;
  sourceValue: number;
  weightedContribution: number;
  sourceJson: string | null;
  createdAt: string;
}

export interface KpiResultDetail {
  result: KpiResultRow;
  metrics: KpiMetric[];
}

export interface SalaryLedgerEntry {
  id: string;
  userId: string;
  kpiPeriodId: string | null;
  type: string;
  amount: number;
  unit: string;
  sourceType: string | null;
  sourceId: string | null;
  description: string | null;
  createdById: string | null;
  createdAt: string;
}

export interface SalaryBalance {
  userId: string;
  balance: number;
  unit: string;
  virtual: boolean;
  earnedThisPeriod: number | null;
  latestEntries: SalaryLedgerEntry[];
}

function parseKpiPeriod(value: unknown): KpiPeriod {
  const v = record(value);
  return {
    id: string(v.id),
    code: string(v.code),
    name: string(v.name),
    startDate: string(v.startDate),
    endDate: string(v.endDate),
    status: string(v.status) as KpiPeriodStatus,
    ruleVersion: string(v.ruleVersion),
    createdById: nullable(v.createdById, string),
    createdAt: string(v.createdAt),
    updatedAt: string(v.updatedAt),
  };
}

function parseKpiResult(value: unknown): KpiResultRow {
  const v = record(value);
  return {
    id: string(v.id),
    periodId: string(v.periodId),
    userId: string(v.userId),
    ruleVersion: string(v.ruleVersion),
    status: string(v.status),
    finalScore: nullable(v.finalScore, number),
    calculatedAt: nullable(v.calculatedAt, string),
    calculatedById: nullable(v.calculatedById, string),
    createdAt: string(v.createdAt),
    updatedAt: string(v.updatedAt),
  };
}

function parseKpiMetric(value: unknown): KpiMetric {
  const v = record(value);
  return {
    id: string(v.id),
    kpiResultId: string(v.kpiResultId),
    metricCode: string(v.metricCode),
    configuredWeight: number(v.configuredWeight),
    effectiveWeight: number(v.effectiveWeight),
    sourceValue: number(v.sourceValue),
    weightedContribution: number(v.weightedContribution),
    sourceJson: nullable(v.sourceJson, string),
    createdAt: string(v.createdAt),
  };
}

function parseLedgerEntry(value: unknown): SalaryLedgerEntry {
  const v = record(value);
  return {
    id: string(v.id),
    userId: string(v.userId),
    kpiPeriodId: nullable(v.kpiPeriodId, string),
    type: string(v.type),
    amount: number(v.amount),
    unit: string(v.unit),
    sourceType: nullable(v.sourceType, string),
    sourceId: nullable(v.sourceId, string),
    description: nullable(v.description, string),
    createdById: nullable(v.createdById, string),
    createdAt: string(v.createdAt),
  };
}

/* ------------------------------ kpi-periods ----------------------------- */

export interface KpiPeriodListFilter {
  page?: number;
  pageSize?: number;
  status?: KpiPeriodStatus;
}

/** GET /kpi-periods — envelope { items, total }. */
export async function listKpiPeriods(
  filter: KpiPeriodListFilter = {},
): Promise<{ items: KpiPeriod[]; total: number }> {
  const params = new URLSearchParams();
  params.set("page", String(filter.page ?? 1));
  params.set("pageSize", String(filter.pageSize ?? 100));
  if (filter.status) params.set("status", filter.status);
  return request(`/kpi-periods?${params.toString()}`, (value) => {
    const r = record(value);
    return { items: array(r.items, parseKpiPeriod), total: number(r.total) };
  });
}

export interface CreateKpiPeriodInput {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
}

/** POST /kpi-periods — ruleVersion ghim kpi-v1. */
export async function createKpiPeriod(input: CreateKpiPeriodInput): Promise<KpiPeriod> {
  return request("/kpi-periods", parseKpiPeriod, { method: "POST", body: input });
}

/** GET /kpi-periods/{id} — object phẳng. */
export async function getKpiPeriod(id: string): Promise<KpiPeriod> {
  return request(`/kpi-periods/${encodeURIComponent(id)}`, parseKpiPeriod);
}

export interface UpdateKpiPeriodInput {
  code?: string;
  name?: string;
  startDate?: string;
  endDate?: string;
}

/** PATCH /kpi-periods/{id} — chỉ sửa kỳ draft/open; code + ruleVersion immutable. */
export async function updateKpiPeriod(
  id: string,
  input: UpdateKpiPeriodInput,
): Promise<KpiPeriod> {
  return request(`/kpi-periods/${encodeURIComponent(id)}`, parseKpiPeriod, {
    method: "PATCH",
    body: input,
  });
}

/** POST /kpi-periods/{id}/calculate — batch kpi-v1 (open→calculating→open). */
export async function calculateKpiPeriod(id: string): Promise<unknown> {
  return request(`/kpi-periods/${encodeURIComponent(id)}/calculate`, (v) => v, {
    method: "POST",
  });
}

/** POST /kpi-periods/{id}/finalize — chốt kỳ sau khi tính thành công. */
export async function finalizeKpiPeriod(id: string): Promise<unknown> {
  return request(`/kpi-periods/${encodeURIComponent(id)}/finalize`, (v) => v, {
    method: "POST",
  });
}

/** GET /kpi-periods/{id}/results — kết quả đã lưu, best-first. */
export async function listKpiPeriodResults(
  id: string,
  page = 1,
  pageSize = 100,
): Promise<{ items: KpiResultRow[]; total: number }> {
  return request(
    `/kpi-periods/${encodeURIComponent(id)}/results?page=${page}&pageSize=${pageSize}`,
    (value) => {
      const r = record(value);
      return { items: array(r.items, parseKpiResult), total: number(r.total) };
    },
  );
}

/** POST /kpi-periods/{id}/status — chuyển trạng thái thủ công. */
export async function changeKpiPeriodStatus(
  id: string,
  status: KpiPeriodStatus,
): Promise<unknown> {
  return request(`/kpi-periods/${encodeURIComponent(id)}/status`, (v) => v, {
    method: "POST",
    body: { status },
  });
}

/* ------------------------------- kpi-results ----------------------------- */

/** GET /kpi-results/{id} — { result, metrics[] } đầy đủ provenance. */
export async function getKpiResult(id: string): Promise<KpiResultDetail> {
  return request(`/kpi-results/${encodeURIComponent(id)}`, (value) => {
    const r = record(value);
    return {
      result: parseKpiResult(r.result),
      metrics: array(r.metrics, parseKpiMetric),
    };
  });
}

/* ------------------------------ virtual-salary --------------------------- */

export interface SalaryListFilter {
  page?: number;
  pageSize?: number;
  userId?: string;
  type?: string;
  kpiPeriodId?: string;
}

/** GET /virtual-salary — sổ lương ảo toàn hệ thống, envelope { items, total }. */
export async function listVirtualSalary(
  filter: SalaryListFilter = {},
): Promise<{ items: SalaryLedgerEntry[]; total: number }> {
  const params = new URLSearchParams();
  params.set("page", String(filter.page ?? 1));
  params.set("pageSize", String(filter.pageSize ?? 100));
  if (filter.userId) params.set("userId", filter.userId);
  if (filter.type) params.set("type", filter.type);
  if (filter.kpiPeriodId) params.set("kpiPeriodId", filter.kpiPeriodId);
  return request(`/virtual-salary?${params.toString()}`, (value) => {
    const r = record(value);
    return { items: array(r.items, parseLedgerEntry), total: number(r.total) };
  });
}

export interface SalaryAdjustmentInput {
  userId: string;
  type: AdjustmentType;
  reason: string;
  amount?: number;
  sourceId?: string;
}

/** POST /virtual-salary/adjustments — bonus (+), penalty (−), adjustment có dấu, reversal. */
export async function createSalaryAdjustment(input: SalaryAdjustmentInput): Promise<unknown> {
  return request("/virtual-salary/adjustments", (v) => v, { method: "POST", body: input });
}

/** POST /virtual-salary/generate/{kpiPeriodId} — sinh lương từ kỳ KPI đã chốt. */
export async function generateVirtualSalary(kpiPeriodId: string): Promise<unknown> {
  return request(`/virtual-salary/generate/${encodeURIComponent(kpiPeriodId)}`, (v) => v, {
    method: "POST",
  });
}

/** GET /virtual-salary/users/{userId}/balance — số dư suy ra từ sổ (toàn cục). */
export async function getUserSalaryBalance(
  userId: string,
  kpiPeriodId?: string,
): Promise<SalaryBalance> {
  const query = kpiPeriodId ? `?kpiPeriodId=${encodeURIComponent(kpiPeriodId)}` : "";
  return request(
    `/virtual-salary/users/${encodeURIComponent(userId)}/balance${query}`,
    (value) => {
      const v = record(value);
      return {
        userId,
        balance: number(v.balance),
        unit: string(v.unit),
        virtual: v.virtual === true,
        earnedThisPeriod: nullable(v.earnedThisPeriod, number),
        latestEntries: array(v.latestEntries, parseLedgerEntry),
      };
    },
  );
}
