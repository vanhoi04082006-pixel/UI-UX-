"use client";
/* =====================================================================
 * OUTCOMES ADAPTER (intern) — evaluations, kpi, virtual-salary,
 * certificates, notifications. Contract path khớp BE thật.
 * ===================================================================== */
import { request } from "./client";
import { array, number, parsePage, record, string } from "./parse";
import type { Certificate, Evaluation, KpiRecord, NotificationItem, SalaryEntry, Role } from "@/lib/mock/types";

function parseEvaluation(value: unknown): Evaluation {
  const v = record(value);
  return {
    id: string(v.id),
    sprint: string(v.sprint),
    instructor: string(v.instructor),
    aiScore: number(v.aiScore),
    finalScore: number(v.finalScore),
    comment: string(v.comment),
    criteria: array(v.criteria, (raw) => {
      const c = record(raw);
      return { label: string(c.label), score: number(c.score), max: number(c.max), weight: c.weight === null || c.weight === undefined ? undefined : number(c.weight) };
    }),
    finalizedAt: string(v.finalizedAt),
  };
}

export async function listMyEvaluations(): Promise<Evaluation[]> {
  const body = await request("/intern/me/evaluations?page=1&pageSize=50", (value) =>
    parsePage(value, parseEvaluation),
  );
  return body.items;
}

function parseKpi(value: unknown): KpiRecord {
  const v = record(value);
  return {
    id: string(v.id),
    period: string(v.period),
    score: number(v.score),
    ruleVersion: string(v.ruleVersion),
    calculatedAt: string(v.calculatedAt),
    metrics: array(v.metrics, (raw) => {
      const m = record(raw);
      return { code: string(m.code), label: string(m.label), value: number(m.value), display: string(m.display), weight: number(m.weight), contribution: number(m.contribution) };
    }),
  };
}

export async function listMyKpi(): Promise<KpiRecord[]> {
  const body = await request("/intern/me/kpi?page=1&pageSize=20", (value) => parsePage(value, parseKpi));
  return body.items;
}

export async function getMySalaryBalance(): Promise<{ balance: number; currency: string; entryCount: number }> {
  return request("/intern/me/virtual-salary", (value) => {
    const v = record(value);
    return { balance: number(v.balance), currency: string(v.currency), entryCount: number(v.entryCount) };
  });
}

export async function listMySalaryLedger(): Promise<SalaryEntry[]> {
  const body = await request("/intern/me/virtual-salary/ledger?page=1&pageSize=50", (value) =>
    parsePage(value, (raw) => {
      const v = record(raw);
      return {
        id: string(v.id),
        at: string(v.at),
        type: v.type as SalaryEntry["type"],
        amount: number(v.amount),
        note: string(v.note),
        period: v.period === null || v.period === undefined ? undefined : string(v.period),
      };
    }),
  );
  return body.items;
}

export async function listMyCertificates(): Promise<Certificate[]> {
  const body = await request("/intern/me/certificates?page=1&pageSize=50", (value) =>
    parsePage(value, (raw) => {
      const v = record(raw);
      return {
        id: string(v.id),
        code: string(v.code),
        project: string(v.project),
        session: string(v.session),
        issuedAt: string(v.issuedAt),
        verifyCode: string(v.verifyCode),
        status: v.status as Certificate["status"],
      };
    }),
  );
  return body.items;
}

/* ----------------------------- notifications --------------------------- */

function parseNotification(value: unknown): NotificationItem {
  const v = record(value);
  return {
    id: string(v.id),
    role: v.role as Role,
    category: v.category as NotificationItem["category"],
    title: string(v.title),
    body: string(v.body),
    at: string(v.at),
    read: v.read === true,
  };
}

export async function listNotifications(unread = false): Promise<NotificationItem[]> {
  const body = await request(
    `/notifications?page=1&pageSize=50${unread ? "&unread=true" : ""}`,
    (value) => parsePage(value, parseNotification),
  );
  return body.items;
}

export async function markNotificationsRead(ids?: string[], all = false): Promise<number> {
  return request("/notifications/read", (value) => {
    const v = record(value);
    return number(v.updated);
  }, { method: "POST", body: { ids, all } });
}

export async function markNotificationsUnread(ids: string[]): Promise<number> {
  return request("/notifications/unread", (value) => {
    const v = record(value);
    return number(v.updated);
  }, { method: "POST", body: { ids } });
}
