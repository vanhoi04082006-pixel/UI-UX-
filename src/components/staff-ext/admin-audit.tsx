"use client";

/* =====================================================================
 * ADMIN — NHẬT KÝ HỆ THỐNG (route: admin/audit)
 * Endpoints cover (nhóm audit 2 ops):
 *  · GET /audit-logs      — {data, meta} phân trang thật (page/pageSize;
 *    BE hỗ trợ actorId/action/from/to) + tìm kiếm action phía client
 *  · GET /activity-events — {data, meta} phân trang (BE hỗ trợ actorId/module)
 * ===================================================================== */

import { useState } from "react";
import {
  VHistory,
  VInbox,
  VRefresh,
  VSearch,
  VWave,
} from "@/components/icons/v-icons";
import { InkButton } from "@/components/notebook/reveal";
import { InkBadge, SketchCard, formatDateTimeVN } from "@/components/notebook/ui";
import { useApi } from "@/lib/use-api";
import { listActivityEvents, listAuditLogs } from "@/lib/api/system";
import { cn } from "@/lib/utils";
import {
  ChipGroup,
  EmptyState,
  PencilLines,
  SectionError,
  SketchInput,
  StaffPageHeader,
} from "../staff/staff-kit";

/* ------------------------------ meta maps ------------------------------- */

/** Màu badge theo nhóm action (tiền tố trước dấu chấm). */
const ACTION_GROUP_TONE: Record<string, string> = {
  auth: "blue",
  user: "green",
  group: "amber",
  catalog: "mint",
  career: "mint",
  certificate: "pink",
  knowledge: "neutral",
  settings: "amber",
  system: "red",
  session: "blue",
  ai: "pink",
};

const MODULE_TONE: Record<string, string> = {
  certificate: "pink",
  groups: "amber",
  recruitment: "blue",
  session: "blue",
  evaluation: "mint",
  kpi: "mint",
  task: "neutral",
  user: "green",
  system: "red",
};

const PAGE_SIZE = 20;

/* ------------------------------ tiện ích nhỏ ----------------------------- */

function shortId(id: string | null, len = 8): string {
  if (!id) return "—";
  return id.length > len ? `${id.slice(0, len)}…` : id;
}

function groupTone(action: string): string {
  const prefix = action.split(".")[0] ?? "";
  return ACTION_GROUP_TONE[prefix] ?? "neutral";
}

function Pager({
  page,
  total,
  onPage,
  label,
}: {
  page: number;
  total: number;
  onPage: (p: number) => void;
  label: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_20%,transparent)] px-4 py-3">
      <p className="tabular text-xs text-[var(--ink-soft)]">
        {total.toLocaleString("vi-VN")} {label} · trang {page}/{totalPages}
      </p>
      <div className="flex items-center gap-1.5">
        <InkButton variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Trước
        </InkButton>
        <InkButton
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Sau
        </InkButton>
      </div>
    </div>
  );
}

/* ================================= SCREEN ================================ */

export default function AdminAudit() {
  const [tab, setTab] = useState<"logs" | "activity">("logs");

  /* ============================= TAB 1: AUDIT LOG ========================= */

  const [auditPage, setAuditPage] = useState(1);
  const [auditVersion, setAuditVersion] = useState(0);
  const auditQ = useApi(
    () => listAuditLogs({ page: auditPage, pageSize: PAGE_SIZE }),
    [auditPage, auditVersion],
  );
  const auditRows = auditQ.data?.items ?? [];
  const auditTotal = auditQ.data?.total ?? 0;

  /* Tìm kiếm action phía client — lọc trên trang đang mở. */
  const [auditSearch, setAuditSearch] = useState("");
  const keyword = auditSearch.trim().toLowerCase();
  const filteredAudit = keyword
    ? auditRows.filter(
        (r) =>
          r.action.toLowerCase().includes(keyword) ||
          r.actorId.toLowerCase().includes(keyword) ||
          (r.targetId ?? "").toLowerCase().includes(keyword),
      )
    : auditRows;

  /* ========================== TAB 2: SỰ KIỆN HOẠT ĐỘNG ==================== */

  const [actPage, setActPage] = useState(1);
  const [actVersion, setActVersion] = useState(0);
  const activityQ = useApi(
    () => listActivityEvents({ page: actPage, pageSize: PAGE_SIZE }),
    [actPage, actVersion],
  );
  const actRows = activityQ.data?.items ?? [];
  const actTotal = activityQ.data?.total ?? 0;

  const [actSearch, setActSearch] = useState("");
  const actKeyword = actSearch.trim().toLowerCase();
  const filteredAct = actKeyword
    ? actRows.filter(
        (r) =>
          r.summary?.toLowerCase().includes(actKeyword) ||
          r.action.toLowerCase().includes(actKeyword) ||
          r.module.toLowerCase().includes(actKeyword),
      )
    : actRows;

  /* ------------------------------ render --------------------------------- */

  return (
    <div>
      <StaffPageHeader
        eyebrow="Quản trị · nhật ký"
        title="Nhật ký hệ thống"
        sub="Audit trail đầy đủ thao tác và feed hoạt động cho dashboard."
        icon={VHistory}
        note="nhật ký là trí nhớ của hệ thống — mất nó là mất quá khứ"
        actions={
          <InkButton
            variant="outline"
            size="sm"
            onClick={() => {
              setAuditVersion((v) => v + 1);
              setActVersion((v) => v + 1);
            }}
          >
            <VRefresh size={14} /> Tải lại
          </InkButton>
        }
      />

      {/* Tab switch */}
      <SketchCard hover={false} className="mb-4 p-4">
        <ChipGroup
          ariaLabel="Chọn phân mục nhật ký"
          options={[
            { value: "logs", label: "Audit log" },
            { value: "activity", label: "Sự kiện hoạt động" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </SketchCard>

      {/* ============================= TAB 1: AUDIT LOG ====================== */}
      {tab === "logs" && (
        <SketchCard hover={false} className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[var(--ink)] px-4 py-3">
            <p className="text-sm font-extrabold text-[var(--ink)]">Audit trail</p>
            <div className="flex min-w-56 items-center gap-2">
              <VSearch size={15} className="shrink-0 text-[var(--ink-soft)]" aria-hidden="true" />
              <SketchInput
                aria-label="Tìm hành động trong trang hiện tại"
                placeholder="Lọc nhanh action / actor / target…"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="!py-1.5 text-xs"
              />
            </div>
          </div>
          {auditQ.loading && !auditQ.data ? (
            <div className="p-5">
              <PencilLines rows={6} />
            </div>
          ) : auditQ.error ? (
            <div className="p-5">
              <SectionError message={auditQ.error} onRetry={auditQ.reload} />
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="ink-table min-w-[1040px]">
                  <thead>
                    <tr>
                      <th>Thời điểm</th>
                      <th>Người thực hiện</th>
                      <th>Hành động</th>
                      <th>Đối tượng</th>
                      <th>IP</th>
                      <th>User agent</th>
                      <th>Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAudit.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-0">
                          <EmptyState
                            icon={VInbox}
                            title="Không có bản ghi nào khớp ✎"
                            note="Thử đổi trang hoặc bỏ lọc nhanh."
                          />
                        </td>
                      </tr>
                    ) : (
                      filteredAudit.map((row) => (
                        <tr key={row.id} className="sticker-pop">
                          <td className="whitespace-nowrap text-xs tabular text-[var(--ink-soft)]">
                            {row.createdAt ? formatDateTimeVN(row.createdAt) : "—"}
                          </td>
                          <td>
                            <span
                              className="font-mono text-[0.7rem] font-bold text-[var(--ink)]"
                              title={row.actorId}
                            >
                              {shortId(row.actorId)}
                            </span>
                          </td>
                          <td>
                            <InkBadge tone={groupTone(row.action)} className="!text-[0.62rem]">
                              {row.action}
                            </InkBadge>
                          </td>
                          <td>
                            <p className="text-xs font-semibold text-[var(--ink)]">
                              {row.targetType ?? "—"}
                            </p>
                            <p
                              className="font-mono text-[0.64rem] text-[var(--ink-soft)]"
                              title={row.targetId ?? ""}
                            >
                              {shortId(row.targetId)}
                            </p>
                          </td>
                          <td className="font-mono text-[0.68rem] text-[var(--ink-soft)]">
                            {row.ip ?? "—"}
                          </td>
                          <td className="max-w-[160px]">
                            <p
                              className="truncate text-[0.7rem] text-[var(--ink-soft)]"
                              title={row.userAgent ?? ""}
                            >
                              {row.userAgent ?? "—"}
                            </p>
                          </td>
                          <td className="max-w-[220px]">
                            {row.detail ? (
                              <p
                                className="truncate font-mono text-[0.66rem] text-[var(--ink)]"
                                title={row.detail}
                              >
                                {row.detail}
                              </p>
                            ) : (
                              <span className="text-xs text-[var(--ink-soft)]">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bản card mobile */}
              <div className="divide-y-2 divide-dashed divide-[color-mix(in_srgb,var(--ink)_15%,transparent)] md:hidden">
                {filteredAudit.length === 0 ? (
                  <EmptyState
                    icon={VInbox}
                    title="Không có bản ghi nào khớp ✎"
                    note="Thử đổi trang hoặc bỏ lọc nhanh."
                  />
                ) : (
                  filteredAudit.map((row) => (
                    <div key={row.id} className="sticker-pop space-y-1.5 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <InkBadge tone={groupTone(row.action)} className="!text-[0.62rem]">
                          {row.action}
                        </InkBadge>
                        <span className="shrink-0 text-[0.68rem] tabular text-[var(--ink-soft)]">
                          {row.createdAt ? formatDateTimeVN(row.createdAt) : "—"}
                        </span>
                      </div>
                      <p className="font-mono text-[0.66rem] text-[var(--ink-soft)]">
                        actor {shortId(row.actorId)} → {row.targetType ?? "?"}{" "}
                        {shortId(row.targetId)}
                      </p>
                      <p className="font-mono text-[0.66rem] text-[var(--ink-soft)]">
                        {row.ip ?? "—"} · {row.userAgent ?? "—"}
                      </p>
                      {row.detail && (
                        <p className="break-words font-mono text-[0.66rem] text-[var(--ink)]">
                          {row.detail}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>

              <Pager
                page={auditQ.data?.page ?? auditPage}
                total={auditTotal}
                onPage={setAuditPage}
                label="bản ghi audit"
              />
            </>
          )}
        </SketchCard>
      )}

      {/* ======================== TAB 2: SỰ KIỆN HOẠT ĐỘNG =================== */}
      {tab === "activity" && (
        <SketchCard hover={false} className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[var(--ink)] px-4 py-3">
            <p className="text-sm font-extrabold text-[var(--ink)]">Sự kiện hoạt động</p>
            <div className="flex min-w-56 items-center gap-2">
              <VSearch size={15} className="shrink-0 text-[var(--ink-soft)]" aria-hidden="true" />
              <SketchInput
                aria-label="Tìm sự kiện trong trang hiện tại"
                placeholder="Lọc nhanh module / hành động…"
                value={actSearch}
                onChange={(e) => setActSearch(e.target.value)}
                className="!py-1.5 text-xs"
              />
            </div>
          </div>
          {activityQ.loading && !activityQ.data ? (
            <div className="p-5">
              <PencilLines rows={6} />
            </div>
          ) : activityQ.error ? (
            <div className="p-5">
              <SectionError message={activityQ.error} onRetry={activityQ.reload} />
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="ink-table min-w-[900px]">
                  <thead>
                    <tr>
                      <th>Thời điểm</th>
                      <th>Module</th>
                      <th>Hành động</th>
                      <th>Tóm tắt</th>
                      <th>Đối tượng</th>
                      <th>Người thực hiện</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAct.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-0">
                          <EmptyState
                            icon={VWave}
                            title="Không có sự kiện nào khớp ✎"
                            note="Thử đổi trang hoặc bỏ lọc nhanh."
                          />
                        </td>
                      </tr>
                    ) : (
                      filteredAct.map((row) => (
                        <tr key={row.id} className="sticker-pop">
                          <td className="whitespace-nowrap text-xs tabular text-[var(--ink-soft)]">
                            {row.createdAt ? formatDateTimeVN(row.createdAt) : "—"}
                          </td>
                          <td>
                            <InkBadge
                              tone={cn(MODULE_TONE[row.module] ?? "neutral")}
                              className="!text-[0.62rem]"
                            >
                              {row.module}
                            </InkBadge>
                          </td>
                          <td className="font-mono text-[0.7rem] font-bold text-[var(--ink)]">
                            {row.action}
                          </td>
                          <td className="max-w-[320px]">
                            <p className="truncate text-sm text-[var(--ink)]" title={row.summary ?? ""}>
                              {row.summary ?? "—"}
                            </p>
                          </td>
                          <td>
                            <p className="text-xs font-semibold text-[var(--ink)]">
                              {row.targetType ?? "—"}
                            </p>
                            <p
                              className="font-mono text-[0.64rem] text-[var(--ink-soft)]"
                              title={row.targetId ?? ""}
                            >
                              {shortId(row.targetId)}
                            </p>
                          </td>
                          <td>
                            {row.displayName ? (
                              <span className="text-sm font-semibold text-[var(--ink)]">
                                {row.displayName}
                              </span>
                            ) : (
                              <span
                                className="font-mono text-[0.7rem] text-[var(--ink-soft)]"
                                title={row.actorId}
                              >
                                {shortId(row.actorId)}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bản card mobile */}
              <div className="divide-y-2 divide-dashed divide-[color-mix(in_srgb,var(--ink)_15%,transparent)] md:hidden">
                {filteredAct.length === 0 ? (
                  <EmptyState
                    icon={VWave}
                    title="Không có sự kiện nào khớp ✎"
                    note="Thử đổi trang hoặc bỏ lọc nhanh."
                  />
                ) : (
                  filteredAct.map((row) => (
                    <div key={row.id} className="sticker-pop space-y-1.5 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <InkBadge
                          tone={MODULE_TONE[row.module] ?? "neutral"}
                          className="!text-[0.62rem]"
                        >
                          {row.module}
                        </InkBadge>
                        <span className="shrink-0 text-[0.68rem] tabular text-[var(--ink-soft)]">
                          {row.createdAt ? formatDateTimeVN(row.createdAt) : "—"}
                        </span>
                      </div>
                      <p className="text-sm font-semibold leading-snug text-[var(--ink)]">
                        {row.summary ?? row.action}
                      </p>
                      <p className="font-mono text-[0.66rem] text-[var(--ink-soft)]">
                        {row.action} · {row.displayName ?? shortId(row.actorId)} ·{" "}
                        {row.targetType ?? "?"}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <Pager
                page={activityQ.data?.page ?? actPage}
                total={actTotal}
                onPage={setActPage}
                label="sự kiện"
              />
            </>
          )}
        </SketchCard>
      )}
    </div>
  );
}
