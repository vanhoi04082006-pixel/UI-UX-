"use client";

/* =====================================================================
 * ADMIN — VẬN HÀNH & CẤU HÌNH (route: admin/system)
 * Endpoints cover (AdminSystem 4 + AiRuntime 2 + Communications 3 +
 * settings 2 + health 1 = 12 ops):
 *  · GET  /admin/system/status   — console trạng thái (DB, counts, AI 24h,
 *    learning alerts, integrations) + nút reload + checkedAt
 *  · GET  /health                — chip "sống" (DB latency, AI, uptime)
 *  · GET  /admin/system/repositories — bảng repo phiên thực tập
 *  · GET  /admin/system/contracts    — hợp đồng chấm (valid, contracts[])
 *  · POST /admin/system/contracts/validate — dán JSON hợp đồng → kết quả
 *  · GET  /admin/ai-configuration    — form cấu hình AI (policy + provider)
 *  · PUT  /admin/ai-configuration    — lưu policy (model Gemini, timeout
 *    10000-180000, retries 0-3, version >= hiện tại)
 *  · GET  /settings              — bảng key/value/description/updatedAt
 *  · PATCH /settings             — sửa 1 setting (value là JSON string)
 *  · GET  /admin/communications  — ⚠ KHÔNG pageSize (BE từ chối) — chỉ ?page=
 *  · GET  /admin/communications/{id}/preview — xem nội dung (có thể redacted)
 *  · POST /admin/communications/{id}/resend  — gửi lại
 * ===================================================================== */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  VBot,
  VCheck,
  VDatabase,
  VEdit,
  VEye,
  VGithub,
  VHistory,
  VInbox,
  VInfo,
  VMail,
  VPlug,
  VRefresh,
  VSend,
  VServer,
  VSettings,
  VShield,
  VStampTool,
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
import { useApp } from "@/lib/store";
import { ApiError, errorMessage } from "@/lib/api/api-client";
import {
  getAiConfiguration,
  getGradingContracts,
  getHealth,
  getSystemStatus,
  listCommunications,
  listSettings,
  listSystemRepositories,
  previewCommunication,
  resendCommunication,
  updateAiConfiguration,
  updateSetting,
  validateContractDraft,
  type SystemSetting,
} from "@/lib/api/system";
import { cn } from "@/lib/utils";
import {
  ChipGroup,
  EmptyState,
  PencilLines,
  SectionError,
  SketchInput,
  SketchTextarea,
  StaffPageHeader,
} from "../staff/staff-kit";

/* ------------------------------ meta maps ------------------------------- */

const OK_TONE = "green";
const BAD_TONE = "red";

const AI_STAT_TONE: Record<string, string> = {
  succeeded: "green",
  success: "green",
  failed: "red",
  timeout: "red",
  running: "blue",
  queued: "neutral",
};

const MAIL_STATUS_META: Record<string, { label: string; tone: string }> = {
  accepted: { label: "Đã nhận", tone: "green" },
  sent: { label: "Đã gửi", tone: "green" },
  delivered: { label: "Đã tới", tone: "green" },
  rejected: { label: "Bị từ chối", tone: "red" },
  failed: { label: "Lỗi", tone: "red" },
  bounced: { label: "Nảy về", tone: "red" },
  pending: { label: "Đang chờ", tone: "amber" },
  queued: { label: "Trong hàng", tone: "amber" },
};

const CONTRACT_STATUS_META: Record<string, { label: string; tone: string }> = {
  active: { label: "Đang dùng", tone: "green" },
  deprecated: { label: "Đã thay", tone: "amber" },
  retired: { label: "Đã nghỉ", tone: "neutral" },
};

const REPO_STATUS_META: Record<string, { label: string; tone: string }> = {
  ready: { label: "Sẵn sàng", tone: "green" },
  provisioned: { label: "Đã dựng", tone: "blue" },
  error: { label: "Lỗi", tone: "red" },
  archived: { label: "Lưu trữ", tone: "neutral" },
};

/* ------------------------------ tiện ích nhỏ ----------------------------- */

function detailErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.message) return err.message;
  return errorMessage(err);
}

function shortHex(value: string | null, len = 12): string {
  if (!value) return "—";
  return value.length > len ? `${value.slice(0, len)}…` : value;
}

function ConfiguredBadge({ configured, label }: { configured: boolean; label?: string }) {
  return (
    <InkBadge tone={configured ? OK_TONE : BAD_TONE} dot className="!text-[0.65rem]">
      {configured ? label ?? "Đã cấu hình" : "Chưa cấu hình"}
    </InkBadge>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string | null }) {
  return (
    <div className="rounded-[10px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)] bg-[var(--paper)] px-3 py-2.5">
      <p className="text-[0.64rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
        {label}
      </p>
      <p className="tabular mt-0.5 text-xl font-extrabold text-[var(--ink)]">
        {typeof value === "number" ? value.toLocaleString("vi-VN") : (value ?? "—")}
      </p>
    </div>
  );
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

/* ================================= SCREEN ================================ */

export default function AdminSystem() {
  const [sysTab, setSysTab] = useState<"status" | "infra" | "config" | "mail">("status");
  const githubCallback = useApp((s) => s.githubCallback);
  const clearGithubCallback = useApp((s) => s.clearGithubCallback);

  /* ============================ TAB: TRẠNG THÁI =========================== */

  const [statusVersion, setStatusVersion] = useState(0);
  const statusQ = useApi(
    () => (sysTab === "status" ? getSystemStatus() : Promise.resolve(null)),
    [sysTab, statusVersion],
  );
  const status = statusQ.data ?? null;

  /* BE redirect sau OAuth GitHub về /admin/settings?github=connected →
   * hydrate đưa về route "system" — toast rồi tải lại trạng thái tích hợp. */
  useEffect(() => {
    if (!githubCallback) return;
    if (githubCallback === "connected") {
      toast.success("Đã kết nối GitHub — trạng thái tích hợp được tải lại.");
    } else {
      toast.error("Liên kết GitHub chưa thành công — kiểm tra cấu hình OAuth.");
    }
    setStatusVersion((v) => v + 1);
    setSysTab("status");
    clearGithubCallback();
  }, [githubCallback, clearGithubCallback]);

  const healthQ = useApi(
    () => (sysTab === "status" ? getHealth() : Promise.resolve(null)),
    [sysTab, statusVersion],
  );
  const health = healthQ.data ?? null;

  /* ========================= TAB: KHO MÃ & HỢP ĐỒNG ====================== */

  const reposQ = useApi(
    () => (sysTab === "infra" ? listSystemRepositories(1, 50) : Promise.resolve(null)),
    [sysTab],
  );
  const repos = reposQ.data?.items ?? [];

  const contractsQ = useApi(
    () => (sysTab === "infra" ? getGradingContracts() : Promise.resolve(null)),
    [sysTab],
  );
  const contracts = contractsQ.data ?? null;

  /* Validate hợp đồng */
  const [validateText, setValidateText] = useState("");
  const [validateBusy, setValidateBusy] = useState(false);
  const [validateResult, setValidateResult] = useState<{
    valid: boolean | null;
    issues: string[];
    raw: Record<string, unknown>;
  } | null>(null);

  const submitValidate = async () => {
    if (!validateText.trim()) return toast.error("Dán nội dung hợp đồng (chuỗi JSON) trước.");
    setValidateBusy(true);
    try {
      const result = await validateContractDraft(validateText);
      setValidateResult(result);
      toast.success("Đã kiểm tra hợp đồng.");
    } catch (err) {
      toast.error(detailErrorMessage(err));
    } finally {
      setValidateBusy(false);
    }
  };

  /* ============================= TAB: CẤU HÌNH ============================ */

  const [aiVersion, setAiVersion] = useState(0);
  const aiQ = useApi(
    () => (sysTab === "config" ? getAiConfiguration() : Promise.resolve(null)),
    [sysTab, aiVersion],
  );
  const ai = aiQ.data ?? null;

  const [aiForm, setAiForm] = useState({ model: "", timeoutMs: "", maxRetries: "", version: "" });
  const [aiBusy, setAiBusy] = useState(false);

  /* Sync form khi tải xong cấu hình */
  useEffect(() => {
    if (ai) {
      setAiForm({
        model: ai.policy.model,
        timeoutMs: String(ai.policy.timeoutMs),
        maxRetries: String(ai.policy.maxRetries),
        version: String(ai.policy.version),
      });
    }
  }, [ai]);

  const [settingsVersion, setSettingsVersion] = useState(0);
  const settingsQ = useApi(
    () => (sysTab === "config" ? listSettings() : Promise.resolve(null)),
    [sysTab, settingsVersion],
  );
  const settings = settingsQ.data ?? [];

  /* Dialog sửa setting */
  const [editSetting, setEditSetting] = useState<SystemSetting | null>(null);
  const [editSettingValue, setEditSettingValue] = useState("");
  const [settingBusy, setSettingBusy] = useState(false);

  const submitAi = async () => {
    const model = aiForm.model.trim();
    const timeoutMs = Number(aiForm.timeoutMs);
    const maxRetries = Number(aiForm.maxRetries);
    const version = Number(aiForm.version);
    if (!/^gemini/i.test(model)) {
      return toast.error("Model phải là ID Gemini (vd: gemini-3.1-flash-lite).");
    }
    if (!Number.isInteger(timeoutMs) || timeoutMs < 10000 || timeoutMs > 180000) {
      return toast.error("Timeout phải trong khoảng 10.000-180.000 ms.");
    }
    if (!Number.isInteger(maxRetries) || maxRetries < 0 || maxRetries > 3) {
      return toast.error("Số lần retry phải từ 0 đến 3.");
    }
    if (!Number.isInteger(version) || version < 1) {
      return toast.error("Version policy phải là số nguyên dương.");
    }
    if (ai && version < ai.policy.version) {
      return toast.error(`Version mới phải ≥ version hiện tại (${ai.policy.version}).`);
    }
    setAiBusy(true);
    try {
      await updateAiConfiguration({ model, timeoutMs, maxRetries, version });
      toast.success(`Đã lưu cấu hình AI (policy v${version}).`);
      setAiVersion((v) => v + 1);
    } catch (err) {
      toast.error(detailErrorMessage(err));
    } finally {
      setAiBusy(false);
    }
  };

  const submitSetting = async () => {
    if (!editSetting) return;
    if (!editSettingValue.trim()) return toast.error("Value không được để trống.");
    setSettingBusy(true);
    try {
      await updateSetting({ key: editSetting.key, value: editSettingValue });
      toast.success(`Đã cập nhật cấu hình "${editSetting.key}".`);
      setEditSetting(null);
      setSettingsVersion((v) => v + 1);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSettingBusy(false);
    }
  };

  /* ============================= TAB: THƯ ĐIỆN ============================ */

  const [mailVersion, setMailVersion] = useState(0);
  const mailQ = useApi(
    () => (sysTab === "mail" ? listCommunications(1) : Promise.resolve(null)),
    [sysTab, mailVersion],
  );
  const mail = mailQ.data ?? null;
  const mails = mail?.items ?? [];

  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewQ = useApi(
    () => (previewId ? previewCommunication(previewId) : Promise.resolve(null)),
    [previewId],
  );

  const [resendBusyId, setResendBusyId] = useState<string | null>(null);

  const doResend = async (id: string) => {
    setResendBusyId(id);
    try {
      await resendCommunication(id);
      toast.success("Đã gửi lại email — chờ kết quả từ máy chủ SMTP.");
      setMailVersion((v) => v + 1);
    } catch (err) {
      toast.error(detailErrorMessage(err));
    } finally {
      setResendBusyId(null);
    }
  };

  /* ------------------------------ render --------------------------------- */

  return (
    <div>
      <StaffPageHeader
        eyebrow="Quản trị · vận hành"
        title="Vận hành & Cấu hình"
        sub="Console sức khỏe hệ thống, kho mã, hợp đồng chấm, cấu hình AI và thư đi."
        icon={VSettings}
        note="hệ thống khỏe là hệ thống báo lỗi sớm — đừng chờ người dùng la"
        actions={
          sysTab === "status" ? (
            <InkButton
              variant="outline"
              size="sm"
              onClick={() => setStatusVersion((v) => v + 1)}
            >
              <VRefresh size={14} /> Tải lại trạng thái
            </InkButton>
          ) : undefined
        }
      />

      {/* Tab switch */}
      <SketchCard hover={false} className="mb-4 p-4">
        <ChipGroup
          ariaLabel="Chọn phân mục vận hành"
          options={[
            { value: "status", label: "Trạng thái" },
            { value: "infra", label: "Kho mã & Hợp đồng" },
            { value: "config", label: "Cấu hình" },
            { value: "mail", label: "Thư điện" },
          ]}
          value={sysTab}
          onChange={setSysTab}
        />
      </SketchCard>

      {/* ============================ TAB: TRẠNG THÁI ======================== */}
      {sysTab === "status" && (
        <div className="space-y-4">
          {/* Health chip + thời điểm kiểm tra */}
          <SketchCard hover={false} className="flex flex-wrap items-center gap-3 p-4">
            {healthQ.loading && !health ? (
              <PencilLines rows={1} />
            ) : health ? (
              <>
                <InkBadge tone={health.status === "ok" ? OK_TONE : BAD_TONE} dot>
                  Hệ thống {health.status === "ok" ? "đang sống" : health.status}
                </InkBadge>
                <InkBadge tone="neutral" className="!text-[0.65rem]">
                  <VDatabase size={12} /> DB {health.database ?? "?"} ·{" "}
                  {health.dbLatencyMs != null ? `${health.dbLatencyMs} ms` : "—"}
                </InkBadge>
                <InkBadge tone="neutral" className="!text-[0.65rem]">
                  <VBot size={12} /> AI {health.ai ?? "?"}
                  {health.aiModel ? ` · ${health.aiModel}` : ""}
                </InkBadge>
                {health.uptimeSeconds != null && (
                  <span className="tabular text-xs text-[var(--ink-soft)]">
                    Uptime {Math.floor(health.uptimeSeconds / 3600)}h{" "}
                    {Math.floor((health.uptimeSeconds % 3600) / 60)}m
                  </span>
                )}
                <span className="ml-auto text-xs tabular text-[var(--ink-soft)]">
                  Kiểm tra: {status?.checkedAt ? formatDateTimeVN(status.checkedAt) : "—"}
                </span>
              </>
            ) : (
              <SectionError message={healthQ.error ?? "Không kiểm tra được sức khỏe."} onRetry={healthQ.reload} />
            )}
          </SketchCard>

          {statusQ.loading && !status ? (
            <SketchCard hover={false} className="p-5">
              <PencilLines rows={8} />
            </SketchCard>
          ) : statusQ.error ? (
            <SectionError message={statusQ.error} onRetry={() => setStatusVersion((v) => v + 1)} />
          ) : status ? (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Cơ sở dữ liệu */}
                <SketchCard hover={false} className="p-5">
                  <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-[10px] border-2 border-[var(--ink)] bg-[var(--blue-mist)] text-[var(--royal)]">
                      <VDatabase size={16} />
                    </span>
                    <p className="text-sm font-extrabold text-[var(--ink)]">Cơ sở dữ liệu</p>
                    <InkBadge
                      tone={status.database.status === "reachable" ? OK_TONE : BAD_TONE}
                      dot
                      className="ml-auto !text-[0.65rem]"
                    >
                      {status.database.status === "reachable" ? "Kết nối được" : status.database.status}
                    </InkBadge>
                  </div>
                  <p className="mt-4 text-[0.68rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                    Độ trễ truy vấn
                  </p>
                  <p className="tabular text-4xl font-extrabold text-[var(--ink)]">
                    {status.database.latencyMs != null ? status.database.latencyMs : "—"}
                    <span className="ml-1 text-base font-bold text-[var(--ink-soft)]">ms</span>
                  </p>
                </SketchCard>

                {/* Cảnh báo học tập */}
                <SketchCard hover={false} className="p-5">
                  <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-[10px] border-2 border-[var(--ink)] bg-[var(--blue-mist)] text-[var(--royal)]">
                      <VHistory size={16} />
                    </span>
                    <p className="text-sm font-extrabold text-[var(--ink)]">Cảnh báo học tập</p>
                    <div className="ml-auto flex items-center gap-1.5">
                      <InkBadge tone={status.learningAlerts.enabled ? OK_TONE : "neutral"} className="!text-[0.62rem]">
                        {status.learningAlerts.enabled ? "Bật" : "Tắt"}
                      </InkBadge>
                      {status.learningAlerts.running && (
                        <InkBadge tone="blue" dot className="!text-[0.62rem]">
                          Đang quét
                        </InkBadge>
                      )}
                    </div>
                  </div>
                  <dl className="mt-3 divide-y-2 divide-dashed divide-[color-mix(in_srgb,var(--ink)_15%,transparent)] rounded-[12px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3.5">
                    <div className="flex items-center justify-between gap-3 py-2">
                      <dt className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">Chu kỳ quét</dt>
                      <dd className="tabular text-sm font-semibold">
                        {status.learningAlerts.intervalSeconds != null
                          ? `${status.learningAlerts.intervalSeconds.toLocaleString("vi-VN")} giây`
                          : "—"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 py-2">
                      <dt className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">Quét gần nhất</dt>
                      <dd className="tabular text-sm font-semibold">
                        {status.learningAlerts.lastScanAt
                          ? formatDateTimeVN(status.learningAlerts.lastScanAt)
                          : "—"}
                      </dd>
                    </div>
                    {status.learningAlerts.lastResult && (
                      <div className="flex items-center justify-between gap-3 py-2">
                        <dt className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                          Kết quả quét
                        </dt>
                        <dd className="tabular text-sm font-semibold">
                          {status.learningAlerts.lastResult.processed} xử lý ·{" "}
                          {status.learningAlerts.lastResult.created} mới ·{" "}
                          {status.learningAlerts.lastResult.muted} im
                        </dd>
                      </div>
                    )}
                    {status.learningAlerts.lastErrorCode && (
                      <div className="flex items-center justify-between gap-3 py-2">
                        <dt className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">Lỗi gần nhất</dt>
                        <dd className="font-mono text-[0.7rem] font-bold text-[var(--danger)]">
                          {status.learningAlerts.lastErrorCode}
                        </dd>
                      </div>
                    )}
                  </dl>
                </SketchCard>
              </div>

              {/* Số liệu hệ thống */}
              <SketchCard hover={false} className="p-5">
                <p className="text-sm font-extrabold text-[var(--ink)]">Số liệu hiện tại</p>
                <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
                  <MiniStat label="Người dùng" value={status.counts.users} />
                  <MiniStat label="Phiên đang chạy" value={status.counts.activeSessions} />
                  <MiniStat label="Câu hỏi hoạt động" value={status.counts.activeQuestions} />
                  <MiniStat label="Mẫu dự án" value={status.counts.activeTemplates} />
                  <MiniStat label="Migration" value={status.counts.migrations} />
                  <MiniStat label="Review đang chạy" value={status.counts.runningReviews} />
                </div>
              </SketchCard>

              {/* Tích hợp */}
              <SketchCard hover={false} className="p-5">
                <p className="text-sm font-extrabold text-[var(--ink)]">Tích hợp bên ngoài</p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="rounded-[12px] border-2 border-[var(--ink)] bg-[var(--paper)] p-3.5">
                    <div className="flex items-center gap-2">
                      <VGithub size={15} className="text-[var(--ink)]" />
                      <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--ink)]">
                        GitHub
                      </p>
                      <span className="ml-auto">
                        <ConfiguredBadge configured={status.integrations.github.configured} />
                      </span>
                    </div>
                    {status.integrations.github.missing.length > 0 ? (
                      <p className="mt-2 text-[0.72rem] text-[var(--danger)]">
                        Thiếu: {status.integrations.github.missing.join(", ")}
                      </p>
                    ) : (
                      <p className="mt-2 text-[0.72rem] text-[var(--ink-soft)]">
                        Đủ biến môi trường cần thiết.
                      </p>
                    )}
                  </div>
                  <div className="rounded-[12px] border-2 border-[var(--ink)] bg-[var(--paper)] p-3.5">
                    <div className="flex items-center gap-2">
                      <VPlug size={15} className="text-[var(--ink)]" />
                      <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--ink)]">
                        Webhook
                      </p>
                      <span className="ml-auto">
                        <ConfiguredBadge configured={status.integrations.webhook.configured} />
                      </span>
                    </div>
                    <p className="mt-2 text-[0.72rem] text-[var(--ink-soft)]">
                      {status.integrations.webhook.configured
                        ? "Nhận sự kiện đẩy từ GitHub."
                        : "Chưa nhận được sự kiện đẩy."}
                    </p>
                  </div>
                  <div className="rounded-[12px] border-2 border-[var(--ink)] bg-[var(--paper)] p-3.5">
                    <div className="flex items-center gap-2">
                      <VServer size={15} className="text-[var(--ink)]" />
                      <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--ink)]">
                        Runner chấm bài
                      </p>
                      <span className="ml-auto">
                        <ConfiguredBadge configured={status.integrations.runner.configured} />
                      </span>
                    </div>
                    <p className="mt-2 text-[0.72rem] tabular text-[var(--ink-soft)]">
                      {status.integrations.runner.sealedSuites != null
                        ? `${status.integrations.runner.sealedSuites} suite niêm phong`
                        : "—"}{" "}
                      · Cấu hình {status.integrations.runner.suiteConfigValid ? "hợp lệ" : "lỗi"} ·
                      Kết nối {status.integrations.runner.connectivity ?? "—"}
                    </p>
                    {status.integrations.runner.missing.length > 0 && (
                      <p className="mt-1 text-[0.72rem] text-[var(--danger)]">
                        Thiếu: {status.integrations.runner.missing.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              </SketchCard>

              {/* AI 24 giờ qua */}
              <SketchCard hover={false} className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[var(--ink)] px-4 py-3">
                  <p className="text-sm font-extrabold text-[var(--ink)]">AI 24 giờ qua</p>
                  <InkBadge tone="neutral" className="tabular !text-[0.65rem]">
                    {status.aiLast24Hours.length} nhóm tính năng
                  </InkBadge>
                </div>
                {status.aiLast24Hours.length === 0 ? (
                  <EmptyState
                    icon={VBot}
                    title="Chưa có lượt gọi AI nào trong 24 giờ ✎"
                    note="Thống kê cập nhật liên tục theo từng tính năng."
                  />
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    <table className="ink-table min-w-[560px]">
                      <thead>
                        <tr>
                          <th>Tính năng</th>
                          <th>Trạng thái</th>
                          <th>Số lượt</th>
                          <th>Trễ trung bình</th>
                        </tr>
                      </thead>
                      <tbody>
                        {status.aiLast24Hours.map((row, idx) => (
                          <tr key={`${row.feature}-${row.status}-${idx}`} className="sticker-pop">
                            <td className="font-mono text-[0.72rem] font-bold text-[var(--ink)]">
                              {row.feature}
                            </td>
                            <td>
                              <InkBadge
                                tone={AI_STAT_TONE[row.status] ?? "neutral"}
                                dot
                                className="!text-[0.62rem]"
                              >
                                {row.status}
                              </InkBadge>
                            </td>
                            <td className="tabular text-sm font-bold">
                              {row.count.toLocaleString("vi-VN")}
                            </td>
                            <td className="tabular text-sm text-[var(--ink-soft)]">
                              {row.averageLatencyMs != null
                                ? `${row.averageLatencyMs.toLocaleString("vi-VN")} ms`
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SketchCard>
            </>
          ) : null}
        </div>
      )}

      {/* ======================= TAB: KHO MÃ & HỢP ĐỒNG ===================== */}
      {sysTab === "infra" && (
        <div className="space-y-4">
          {/* Repositories */}
          <SketchCard hover={false} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[var(--ink)] px-4 py-3">
              <p className="text-sm font-extrabold text-[var(--ink)]">
                Kho mã phiên thực tập (repositories)
              </p>
              <InkBadge tone="neutral" className="tabular !text-[0.65rem]">
                {reposQ.data?.total ?? repos.length} repo
              </InkBadge>
            </div>
            {reposQ.loading && !reposQ.data ? (
              <div className="p-5">
                <PencilLines rows={3} />
              </div>
            ) : reposQ.error ? (
              <div className="p-5">
                <SectionError message={reposQ.error} onRetry={reposQ.reload} />
              </div>
            ) : repos.length === 0 ? (
              <EmptyState
                icon={VGithub}
                title="Chưa có kho mã nào ✎"
                note="Repo sinh tự động khi phiên có bài nộp GitHub."
              />
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="ink-table min-w-[880px]">
                  <thead>
                    <tr>
                      <th>Phiên</th>
                      <th>Mã phiên</th>
                      <th>Chủ repo</th>
                      <th>Tên repo</th>
                      <th>Trạng thái</th>
                      <th>Webhook</th>
                      <th>Sự kiện cuối</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repos.map((repo) => (
                      <tr key={`${repo.sessionId ?? repo.repoName}`} className="sticker-pop">
                        <td className="text-sm font-semibold text-[var(--ink)]">
                          {repo.sessionName}
                        </td>
                        <td className="font-mono text-[0.7rem] text-[var(--ink-soft)]">
                          {repo.sessionCode ?? "—"}
                        </td>
                        <td className="font-mono text-[0.7rem] text-[var(--ink-soft)]">
                          {repo.ownerLogin}
                        </td>
                        <td className="font-mono text-[0.7rem] font-bold text-[var(--ink)]">
                          {repo.repoName}
                        </td>
                        <td>
                          <InkBadge
                            tone={(REPO_STATUS_META[repo.status] ?? { tone: "neutral" }).tone}
                            className="!text-[0.62rem]"
                          >
                            {(REPO_STATUS_META[repo.status] ?? { label: repo.status }).label}
                          </InkBadge>
                        </td>
                        <td>
                          <InkBadge
                            tone={
                              repo.webhookStatus === "configured"
                                ? OK_TONE
                                : "neutral"
                            }
                            className="!text-[0.62rem]"
                          >
                            {repo.webhookStatus === "configured"
                              ? "Đ nối"
                              : repo.webhookStatus}
                          </InkBadge>
                        </td>
                        <td className="whitespace-nowrap text-xs tabular text-[var(--ink-soft)]">
                          {repo.lastEventAt ? formatDateTimeVN(repo.lastEventAt) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SketchCard>

          {/* Hợp đồng chấm */}
          <SketchCard hover={false} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[var(--ink)] px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-extrabold text-[var(--ink)]">Hợp đồng chấm điểm</p>
                {contracts && (
                  <InkBadge tone={contracts.valid ? OK_TONE : BAD_TONE} dot className="!text-[0.65rem]">
                    {contracts.valid ? "Hợp lệ" : "Không hợp lệ"}
                  </InkBadge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <InkButton variant="outline" size="sm" onClick={contractsQ.reload}>
                  <VRefresh size={13} /> Tải lại
                </InkButton>
              </div>
            </div>
            {contractsQ.loading && !contractsQ.data ? (
              <div className="p-5">
                <PencilLines rows={4} />
              </div>
            ) : contractsQ.error ? (
              <div className="p-5">
                <SectionError message={contractsQ.error} onRetry={contractsQ.reload} />
              </div>
            ) : contracts ? (
              <>
                <p className="px-4 pt-3 text-[0.74rem] leading-snug text-[var(--ink-soft)]">
                  Nguồn: {contracts.source}
                  {contracts.checkedAt ? ` · kiểm tra ${formatDateTimeVN(contracts.checkedAt)}` : ""}
                </p>
                {contracts.error && (
                  <p className="px-4 pt-1.5 font-mono text-[0.72rem] font-bold text-[var(--danger)]">
                    {contracts.error}
                  </p>
                )}
                <div className="max-h-96 overflow-y-auto">
                  <table className="ink-table min-w-[920px]">
                    <thead>
                      <tr>
                        <th>Key</th>
                        <th>Suite</th>
                        <th>Digest</th>
                        <th>Trạng thái</th>
                        <th>Vấn đề</th>
                        <th>Operator niêm phong</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contracts.contracts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-0">
                            <EmptyState icon={VStampTool} title="Chưa có hợp đồng nào" />
                          </td>
                        </tr>
                      ) : (
                        contracts.contracts.map((c) => (
                          <tr key={c.key} className="sticker-pop">
                            <td className="max-w-[260px]">
                              <p
                                className="truncate font-mono text-[0.7rem] font-bold text-[var(--ink)]"
                                title={c.key}
                              >
                                {c.key}
                              </p>
                            </td>
                            <td className="font-mono text-[0.68rem] text-[var(--ink-soft)]">
                              {c.suiteId}
                            </td>
                            <td className="font-mono text-[0.68rem] text-[var(--ink-soft)]">
                              {shortHex(c.digest)}
                            </td>
                            <td>
                              <InkBadge
                                tone={(CONTRACT_STATUS_META[c.status] ?? { tone: "neutral" }).tone}
                                className="!text-[0.62rem]"
                              >
                                {(CONTRACT_STATUS_META[c.status] ?? { label: c.status }).label}
                              </InkBadge>
                            </td>
                            <td className="max-w-[180px]">
                              {c.issues.length === 0 ? (
                                <span className="text-xs text-[var(--ink-soft)]">—</span>
                              ) : (
                                <p className="truncate text-[0.72rem] text-[var(--danger)]" title={c.issues.join("; ")}>
                                  {c.issues.join("; ")}
                                </p>
                              )}
                            </td>
                            <td>
                              <p className="text-[0.72rem] font-semibold text-[var(--ink)]">
                                {c.operator.version ?? "—"}
                                {c.operator.sealedAt
                                  ? ` · ${formatDateTimeVN(c.operator.sealedAt)}`
                                  : ""}
                              </p>
                              <p className="font-mono text-[0.62rem] text-[var(--ink-soft)]">
                                rt {shortHex(c.operator.runtimeImage, 10)} · tst{" "}
                                {shortHex(c.operator.testerImage, 10)}
                              </p>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </SketchCard>

          {/* Kiểm tra hợp đồng đơn lẻ */}
          <SketchCard hover={false} className="p-5">
            <p className="text-sm font-extrabold text-[var(--ink)]">Kiểm tra hợp lệ hợp đồng</p>
            <p className="mt-1 text-[0.78rem] text-[var(--ink-soft)]">
              Dán nội dung hợp đồng (chuỗi JSON, tối đa 400.000 ký tự) để đối chiếu với suite đã niêm
              phong — không ghi gì cả.
            </p>
            <div className="mt-3 space-y-3">
              <SketchTextarea
                aria-label="Nội dung hợp đồng cần kiểm tra"
                rows={5}
                value={validateText}
                onChange={(e) => setValidateText(e.target.value)}
                placeholder='{"key":"LEARN-NOTES-V1:...","digest":"a558..."}'
                className="font-mono text-[0.75rem]"
              />
              <InkButton variant="royal" size="sm" disabled={validateBusy} onClick={submitValidate}>
                <VShield size={14} /> {validateBusy ? "Đang kiểm tra…" : "Kiểm tra hợp lệ"}
              </InkButton>
              {validateResult && (
                <div
                  className={cn(
                    "rounded-[12px] border-2 p-3.5",
                    validateResult.valid === true
                      ? "border-[var(--success)] bg-[color-mix(in_srgb,var(--success)_8%,transparent)]"
                      : validateResult.valid === false
                        ? "border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)]"
                        : "border-[var(--ink)] bg-[var(--paper)]",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-extrabold text-[var(--ink)]">Kết quả kiểm tra</p>
                    <InkBadge
                      tone={
                        validateResult.valid === true
                          ? OK_TONE
                          : validateResult.valid === false
                            ? BAD_TONE
                            : "neutral"
                      }
                      className="!text-[0.65rem]"
                    >
                      {validateResult.valid === true
                        ? "Hợp lệ"
                        : validateResult.valid === false
                          ? "Không hợp lệ"
                          : "Xem chi tiết"}
                    </InkBadge>
                  </div>
                  {validateResult.issues.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {validateResult.issues.map((issue, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-1.5 text-[0.8rem] leading-snug text-[var(--ink)]"
                        >
                          <VInfo size={13} className="mt-0.5 shrink-0 text-[var(--danger)]" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  )}
                  <pre className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-[10px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_25%,transparent)] bg-[var(--paper)] p-2.5 font-mono text-[0.68rem] leading-relaxed text-[var(--ink)]">
                    {JSON.stringify(validateResult.raw, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </SketchCard>
        </div>
      )}

      {/* ============================= TAB: CẤU HÌNH ========================= */}
      {sysTab === "config" && (
        <div className="space-y-4">
          {/* Cấu hình AI */}
          <SketchCard hover={false} className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-extrabold text-[var(--ink)]">Cấu hình AI runtime</p>
              {ai && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <ConfiguredBadge
                    configured={ai.credentialsConfigured}
                    label="Có credentials"
                  />
                  {ai.provider && (
                    <InkBadge tone="blue" className="!text-[0.62rem]">
                      provider: {ai.provider}
                    </InkBadge>
                  )}
                  {ai.source && (
                    <InkBadge tone="neutral" className="!text-[0.62rem]">
                      nguồn: {ai.source}
                    </InkBadge>
                  )}
                </div>
              )}
            </div>
            {aiQ.loading && !ai ? (
              <div className="mt-4">
                <PencilLines rows={4} />
              </div>
            ) : aiQ.error ? (
              <div className="mt-4">
                <SectionError message={aiQ.error} onRetry={aiQ.reload} />
              </div>
            ) : ai ? (
              <>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <FieldLabel htmlFor="ai-model">Model (ID Gemini)</FieldLabel>
                    <SketchInput
                      id="ai-model"
                      value={aiForm.model}
                      onChange={(e) => setAiForm((f) => ({ ...f, model: e.target.value }))}
                      placeholder="gemini-3.1-flash-lite"
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="ai-timeout">Timeout (ms, 10.000-180.000)</FieldLabel>
                    <SketchInput
                      id="ai-timeout"
                      type="number"
                      min={10000}
                      max={180000}
                      step={1000}
                      value={aiForm.timeoutMs}
                      onChange={(e) => setAiForm((f) => ({ ...f, timeoutMs: e.target.value }))}
                      className="tabular"
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="ai-retries">Số lần retry (0-3)</FieldLabel>
                    <SketchInput
                      id="ai-retries"
                      type="number"
                      min={0}
                      max={3}
                      value={aiForm.maxRetries}
                      onChange={(e) => setAiForm((f) => ({ ...f, maxRetries: e.target.value }))}
                      className="tabular"
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="ai-version">Version policy (≥ hiện tại {ai.policy.version})</FieldLabel>
                    <SketchInput
                      id="ai-version"
                      type="number"
                      min={ai.policy.version}
                      value={aiForm.version}
                      onChange={(e) => setAiForm((f) => ({ ...f, version: e.target.value }))}
                      className="tabular"
                    />
                  </div>
                </div>
                {ai.appliesTo.length > 0 && (
                  <div className="mt-3">
                    <p className="eyebrow !text-[0.6rem]">Áp dụng cho</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {ai.appliesTo.map((a) => (
                        <InkBadge key={a} tone="neutral" className="!text-[0.62rem]">
                          {a}
                        </InkBadge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <InkButton variant="royal" size="sm" disabled={aiBusy} onClick={submitAi}>
                    <VCheck size={14} /> {aiBusy ? "Đang lưu…" : "Lưu cấu hình"}
                  </InkButton>
                  <p className="text-[0.7rem] text-[var(--ink-soft)]">
                    Ràng buộc BE: model Gemini · timeout 10.000-180.000 ms · retries 0-3 · version ≥{" "}
                    {ai.policy.version}.
                  </p>
                </div>
              </>
            ) : null}
          </SketchCard>

          {/* Settings */}
          <SketchCard hover={false} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[var(--ink)] px-4 py-3">
              <p className="text-sm font-extrabold text-[var(--ink)]">Cấu hình hệ thống (settings)</p>
              <InkBadge tone="neutral" className="tabular !text-[0.65rem]">
                {settings.length} khóa
              </InkBadge>
            </div>
            {settingsQ.loading && !settingsQ.data ? (
              <div className="p-5">
                <PencilLines rows={3} />
              </div>
            ) : settingsQ.error ? (
              <div className="p-5">
                <SectionError message={settingsQ.error} onRetry={settingsQ.reload} />
              </div>
            ) : settings.length === 0 ? (
              <EmptyState icon={VSettings} title="Chưa có cấu hình nào" />
            ) : (
              <div className="overflow-x-auto">
                <table className="ink-table min-w-[820px]">
                  <thead>
                    <tr>
                      <th>Khóa</th>
                      <th>Giá trị</th>
                      <th>Mô tả</th>
                      <th>Cập nhật</th>
                      <th className="text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.map((s) => (
                      <tr key={s.key} className="sticker-pop">
                        <td className="font-mono text-[0.72rem] font-bold text-[var(--ink)]">
                          {s.key}
                        </td>
                        <td className="max-w-[280px]">
                          <p
                            className="truncate font-mono text-[0.7rem] text-[var(--ink-soft)]"
                            title={s.value}
                          >
                            {s.value}
                          </p>
                        </td>
                        <td className="max-w-[260px]">
                          <p className="truncate text-xs text-[var(--ink-soft)]" title={s.description ?? ""}>
                            {s.description ?? "—"}
                          </p>
                        </td>
                        <td className="whitespace-nowrap text-xs tabular text-[var(--ink-soft)]">
                          {s.updatedAt ? formatDateTimeVN(s.updatedAt) : "—"}
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setEditSetting(s);
                              setEditSettingValue(s.value);
                            }}
                            aria-label={`Sửa cấu hình ${s.key}`}
                            title="Sửa giá trị"
                            className="focus-ink grid h-8 w-8 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--ink-soft)] transition-all hover:-translate-y-0.5 hover:bg-[var(--blue-mist)] hover:text-[var(--ink)]"
                          >
                            <VEdit size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SketchCard>
        </div>
      )}

      {/* ============================= TAB: THƯ ĐIỆN ========================= */}
      {sysTab === "mail" && (
        <SketchCard hover={false} className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[var(--ink)] px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-extrabold text-[var(--ink)]">Thư đi 24 giờ qua</p>
              {mail && (
                <>
                  <ConfiguredBadge configured={mail.transportConfigured} label="Đã cấu hình SMTP" />
                  {mail.deliveryMode && (
                    <InkBadge tone="neutral" className="!text-[0.62rem]">
                      mode: {mail.deliveryMode}
                    </InkBadge>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <InkBadge tone="neutral" className="tabular !text-[0.65rem]">
                {mail?.total ?? 0} thư
              </InkBadge>
              <InkButton variant="outline" size="sm" onClick={mailQ.reload}>
                <VRefresh size={13} /> Tải lại
              </InkButton>
            </div>
          </div>
          {mailQ.loading && !mailQ.data ? (
            <div className="p-5">
              <PencilLines rows={4} />
            </div>
          ) : mailQ.error ? (
            <div className="p-5">
              <SectionError message={mailQ.error} onRetry={mailQ.reload} />
            </div>
          ) : mails.length === 0 ? (
            <EmptyState
              icon={VMail}
              title="Chưa có thư nào ✎"
              note="Thư xác thực và thông báo hệ thống sẽ hiện ở đây."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="ink-table min-w-[900px]">
                <thead>
                  <tr>
                    <th>Loại</th>
                    <th>Người nhận</th>
                    <th>Trạng thái</th>
                    <th>Lần thử</th>
                    <th>Mã gần nhất</th>
                    <th>Tạo lúc</th>
                    <th className="text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {mails.map((m) => {
                    const meta = MAIL_STATUS_META[m.status] ?? { label: m.status, tone: "neutral" };
                    return (
                      <tr key={m.id} className="sticker-pop">
                        <td>
                          <InkBadge tone="blue" className="!text-[0.62rem]">
                            {m.kind ?? "—"}
                          </InkBadge>
                        </td>
                        <td className="font-mono text-[0.72rem] text-[var(--ink)]">
                          {m.recipientHint ?? "—"}
                        </td>
                        <td>
                          <InkBadge tone={meta.tone} dot className="!text-[0.62rem]">
                            {meta.label}
                          </InkBadge>
                        </td>
                        <td className="tabular text-sm">{m.attempts}</td>
                        <td className="font-mono text-[0.68rem] text-[var(--ink-soft)]">
                          {m.lastCode ?? "—"}
                        </td>
                        <td className="whitespace-nowrap text-xs tabular text-[var(--ink-soft)]">
                          {m.createdAt ? formatDateTimeVN(m.createdAt) : "—"}
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPreviewId(m.id)}
                              aria-label="Xem nội dung thư"
                              title="Xem nội dung (có thể được làm mờ)"
                              className="focus-ink grid h-8 w-8 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--ink-soft)] transition-all hover:-translate-y-0.5 hover:bg-[var(--blue-mist)] hover:text-[var(--ink)]"
                            >
                              <VEye size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={resendBusyId === m.id}
                              onClick={() => doResend(m.id)}
                              aria-label="Gửi lại thư"
                              title="Gửi lại"
                              className="focus-ink grid h-8 w-8 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--ink-soft)] transition-all hover:-translate-y-0.5 hover:bg-[var(--blue-mist)] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <VSend size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_20%,transparent)] px-4 py-3">
            <p className="text-xs text-[var(--ink-soft)]">
              Danh sách tự phân trang theo máy chủ (endpoint không nhận pageSize).
            </p>
          </div>
        </SketchCard>
      )}

      {/* ================= DIALOG: sửa setting =============================== */}
      <Dialog open={!!editSetting} onOpenChange={(open) => !open && setEditSetting(null)}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-lg">
          {editSetting && (
            <>
              <DialogHeader>
                <DialogTitle className="break-all font-extrabold text-[var(--ink)]">
                  Sửa cấu hình
                </DialogTitle>
                <DialogDescription className="break-all font-mono text-[0.72rem] text-[var(--ink-soft)]">
                  {editSetting.key}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <FieldLabel htmlFor="setting-value">Giá trị (chuỗi JSON)</FieldLabel>
                  <SketchTextarea
                    id="setting-value"
                    rows={7}
                    value={editSettingValue}
                    onChange={(e) => setEditSettingValue(e.target.value)}
                    className="font-mono text-[0.75rem]"
                  />
                </div>
                {editSetting.description && (
                  <p className="text-[0.75rem] leading-snug text-[var(--ink-soft)]">
                    {editSetting.description}
                  </p>
                )}
                <p className="text-[0.7rem] text-[var(--ink-soft)]">
                  Thao tác có audit — giá trị tối đa 100.000 ký tự.
                </p>
              </div>
              <DialogFooter>
                <InkButton variant="ghost" size="sm" onClick={() => setEditSetting(null)}>
                  Hủy
                </InkButton>
                <InkButton variant="royal" size="sm" disabled={settingBusy} onClick={submitSetting}>
                  <VCheck size={14} /> {settingBusy ? "Đang lưu…" : "Lưu"}
                </InkButton>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ================= DIALOG: xem nội dung thư ========================== */}
      <Dialog
        open={!!previewId}
        onOpenChange={(open) => {
          if (!open) setPreviewId(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[var(--ink)]">Nội dung thư</DialogTitle>
            <DialogDescription className="font-mono text-[0.7rem] text-[var(--ink-soft)]">
              {previewId}
            </DialogDescription>
          </DialogHeader>
          {previewQ.loading && !previewQ.data ? (
            <PencilLines rows={3} />
          ) : previewQ.error ? (
            <SectionError message={previewQ.error} onRetry={previewQ.reload} />
          ) : previewQ.data ? (
            <>
              {previewQ.data.redacted ? (
                <div className="rounded-[12px] border-2 border-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] p-4">
                  <p className="flex items-center gap-1.5 text-sm font-extrabold text-[var(--ink)]">
                    <VShield size={15} /> Nội dung được bảo vệ
                  </p>
                  <p className="mt-1.5 text-[0.8rem] leading-relaxed text-[var(--ink)]">
                    {previewQ.data.message ?? "Thư chứa liên kết riêng/mã bảo mật nên không hiển thị."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {previewQ.data.subject && (
                    <div>
                      <p className="eyebrow !text-[0.6rem]">Tiêu đề</p>
                      <p className="text-sm font-bold text-[var(--ink)]">{previewQ.data.subject}</p>
                    </div>
                  )}
                  {previewQ.data.body && (
                    <div>
                      <p className="eyebrow !text-[0.6rem]">Nội dung</p>
                      <pre className="mt-1.5 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-[10px] border-2 border-[var(--ink)] bg-[var(--paper)] p-3 font-mono text-[0.72rem] leading-relaxed text-[var(--ink)]">
                        {previewQ.data.body}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setPreviewId(null)}>
              Đóng
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
