"use client";

/* =====================================================================
 * ADMIN — THƯ VIỆN KIẾN THỨC (route: admin/knowledge)
 * Endpoints cover (nhóm knowledge 10 ops + agents 5 ops):
 *  · GET  /admin/knowledge                       — bảng + lọc + phân trang
 *  · POST /admin/knowledge                       — dialog tạo (code + draft)
 *  · GET  /admin/knowledge/{code}                — panel chi tiết bên phải
 *  · PUT  /admin/knowledge/{code}                — sửa draft (tăng version)
 *  · GET  /admin/knowledge/{code}/revisions      — dialog lịch sử phiên bản
 *  · GET  /admin/knowledge/{code}/publication-check — kiểm tra trước xuất bản
 *  · POST /admin/knowledge/{code}/publish        — xuất bản (confirm)
 *  · POST /admin/knowledge/{code}/archive        — lưu trữ (confirm)
 *  · POST /admin/knowledge/{code}/restore        — khôi phục từ phiên bản cũ
 *  · POST /admin/knowledge/import/dry-run        — thử nhập JSON entries
 *  · POST /admin/agents/knowledge-runs           — khởi chạy agent kiến thức
 *  · GET  /admin/agents/knowledge-runs/{id}      — dialog theo dõi run
 *  · POST /admin/agents/knowledge-runs/{id}/cancel
 *  · POST /admin/agents/knowledge-runs/{id}/resume
 *  · GET  /admin/agents/business-runs            — bảng run nghiệp vụ + filter
 * ===================================================================== */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  VArchive,
  VBot,
  VBook,
  VCheck,
  VClock,
  VEdit,
  VHistory,
  VInbox,
  VInfo,
  VPlay,
  VPlus,
  VRefresh,
  VRocket,
  VSearch,
  VShield,
  VStop,
  VTrash,
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
import { errorMessage } from "@/lib/api/api-client";
import {
  archiveKnowledge,
  cancelKnowledgeRun,
  checkKnowledgePublication,
  createKnowledge,
  createKnowledgeRun,
  dryRunKnowledgeImport,
  getKnowledge,
  getKnowledgeRun,
  listBusinessRuns,
  listKnowledge,
  listKnowledgeRevisions,
  publishKnowledge,
  restoreKnowledge,
  resumeKnowledgeRun,
  updateKnowledge,
  type KnowledgeDetail,
  type KnowledgeDraftInput,
  type PublicationCheck,
} from "@/lib/api/knowledge";
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

const KIND_META: Record<string, { label: string; tone: string }> = {
  qa: { label: "Hỏi đáp", tone: "blue" },
  guide: { label: "Hướng dẫn", tone: "mint" },
  exercise: { label: "Bài tập", tone: "amber" },
  solution: { label: "Đáp án", tone: "pink" },
  rubric: { label: "Thang điểm", tone: "neutral" },
  plan_template: { label: "Mẫu kế hoạch", tone: "blue" },
  communication: { label: "Truyền thông", tone: "amber" },
};

const KSTATUS_META: Record<string, { label: string; tone: string }> = {
  draft: { label: "Bản nháp", tone: "amber" },
  published: { label: "Đã xuất bản", tone: "green" },
  archived: { label: "Đã lưu trữ", tone: "neutral" },
};

const LANG_META: Record<string, string> = { vi: "Tiếng Việt", en: "English" };

const DIFF_META: Record<string, { label: string; tone: string }> = {
  easy: { label: "Dễ", tone: "green" },
  medium: { label: "Vừa", tone: "amber" },
  hard: { label: "Khó", tone: "red" },
};

const AUDIENCE_META: Record<string, { label: string; tone: string }> = {
  student_safe: { label: "Sinh viên", tone: "green" },
  staff_only: { label: "Nhân sự", tone: "amber" },
  grading_only: { label: "Chỉ chấm điểm", tone: "red" },
};

const RUN_STATUS_META: Record<string, { label: string; tone: string }> = {
  queued: { label: "Đang chờ", tone: "neutral" },
  running: { label: "Đang chạy", tone: "blue" },
  paused: { label: "Tạm dừng", tone: "amber" },
  succeeded: { label: "Thành công", tone: "green" },
  failed: { label: "Lỗi", tone: "red" },
  cancelled: { label: "Đã hủy", tone: "neutral" },
};

const AGENT_IDS = [
  "cv-analyst",
  "role-matcher",
  "interview-coordinator",
  "interview-conversation",
  "interview-evaluator",
  "project-planner",
  "code-reviewer",
  "learning-mentor",
  "performance-advisor",
  "replacement-advisor",
  "instructor-assistant",
] as const;

const PAGE_SIZE = 10;
const CODE_PATTERN = /^[a-z][a-z0-9_-]{1,79}$/;

/* ------------------------------ tiện ích nhỏ ----------------------------- */

function csvToArray(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function metaOf(
  map: Record<string, { label: string; tone: string }>,
  key: string | null | undefined,
): { label: string; tone: string } {
  return (key && map[key]) || { label: key ?? "—", tone: "neutral" };
}

function MetaBadge({
  map,
  value,
  className,
}: {
  map: Record<string, { label: string; tone: string }>;
  value: string | null | undefined;
  className?: string;
}) {
  const meta = metaOf(map, value);
  return (
    <InkBadge tone={meta.tone} className={cn("!text-[0.65rem]", className)}>
      {meta.label}
    </InkBadge>
  );
}

function formatRaw(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function newRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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

function Pager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_20%,transparent)] px-4 py-3">
      <p className="tabular text-xs text-[var(--ink-soft)]">
        {total.toLocaleString("vi-VN")} bản ghi · trang {page}/{totalPages}
      </p>
      <div className="flex items-center gap-1.5">
        <InkButton
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <VHistory size={14} className="rotate-180" /> Trước
        </InkButton>
        <InkButton
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Sau <VRocket size={14} className="-rotate-45" />
        </InkButton>
      </div>
    </div>
  );
}

/** Danh sách khóa-giá trị từ response thô (dialog theo dõi agent run). */
function RawKvList({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return <p className="text-sm text-[var(--ink-soft)]">Không có dữ liệu.</p>;
  }
  return (
    <dl className="space-y-1.5">
      {entries.map(([k, v]) => (
        <div
          key={k}
          className="flex flex-wrap items-start gap-x-3 gap-y-0.5 rounded-[9px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_20%,transparent)] bg-[var(--paper)] px-3 py-1.5"
        >
          <dt className="w-40 shrink-0 font-mono text-[0.66rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
            {k}
          </dt>
          <dd className="min-w-0 flex-1 break-words text-[0.8rem] font-medium text-[var(--ink)]">
            {formatRaw(v)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------ draft form state ------------------------- */

interface SourceRow {
  title: string;
  url: string;
  reference: string;
}

interface DraftFormState {
  code: string;
  kind: string;
  title: string;
  summary: string;
  language: string;
  difficulty: string;
  audience: string;
  purposes: string;
  roleCodes: string;
  tags: string;
  sources: SourceRow[];
  markdown: string;
}

function emptyForm(): DraftFormState {
  return {
    code: "",
    kind: "guide",
    title: "",
    summary: "",
    language: "vi",
    difficulty: "medium",
    audience: "student_safe",
    purposes: "",
    roleCodes: "",
    tags: "",
    sources: [],
    markdown: "",
  };
}

function formFromDetail(detail: KnowledgeDetail): DraftFormState {
  const s = detail.snapshot;
  return {
    code: detail.code,
    kind: s?.kind || "guide",
    title: s?.title || "",
    summary: s?.summary || "",
    language: s?.language || "vi",
    difficulty: s?.difficulty || "medium",
    audience: s?.audience || "student_safe",
    purposes: (s?.purposes ?? []).join(", "),
    roleCodes: (s?.roleCodes ?? []).join(", "),
    tags: (s?.tags ?? []).join(", "),
    sources: (s?.sources ?? []).map((src) => ({
      title: src.title,
      url: src.url ?? "",
      reference: src.reference ?? "",
    })),
    markdown: typeof s?.body?.markdown === "string" ? s.body.markdown : "",
  };
}

function buildDraft(form: DraftFormState): KnowledgeDraftInput {
  return {
    kind: form.kind,
    title: form.title.trim(),
    summary: form.summary.trim(),
    language: form.language,
    difficulty: form.difficulty,
    audience: form.audience,
    purposes: csvToArray(form.purposes),
    roleCodes: csvToArray(form.roleCodes),
    tags: csvToArray(form.tags),
    sources: form.sources
      .filter((s) => s.title.trim())
      .map((s) => ({
        title: s.title.trim(),
        ...(s.url.trim() ? { url: s.url.trim() } : {}),
        ...(s.reference.trim() ? { reference: s.reference.trim() } : {}),
      })),
    body: { markdown: form.markdown },
  };
}

/* ================================= SCREEN ================================ */

export default function AdminKnowledge() {
  const [tab, setTab] = useState<"docs" | "runs">("docs");

  /* ============================ TAB 1: TÀI LIỆU =========================== */

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  /* Debounce ô tìm kiếm → reset về trang 1. */
  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const listQ = useApi(
    () =>
      listKnowledge({
        page,
        pageSize: PAGE_SIZE,
        status: statusFilter === "all" ? undefined : statusFilter,
        kind: kindFilter === "all" ? undefined : kindFilter,
        search: search || undefined,
      }),
    [page, statusFilter, kindFilter, search],
  );
  const docs = listQ.data?.items ?? [];
  const totalDocs = listQ.data?.total ?? 0;

  /* Chi tiết tài liệu đang chọn */
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [detailVersion, setDetailVersion] = useState(0);
  const detailQ = useApi(
    () => (selectedCode ? getKnowledge(selectedCode) : Promise.resolve(null)),
    [selectedCode, detailVersion],
  );
  const detail = detailQ.data ?? null;
  const reloadDetail = () => setDetailVersion((v) => v + 1);

  /* Kiểm tra xuất bản */
  const [checkBusy, setCheckBusy] = useState(false);
  const [checkResult, setCheckResult] = useState<PublicationCheck | null>(null);
  useEffect(() => setCheckResult(null), [selectedCode, detailVersion]);

  /* Dialog tạo/sửa */
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<DraftFormState>(emptyForm());
  const [formBusy, setFormBusy] = useState(false);

  /* Dialog lịch sử phiên bản + khôi phục */
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [revisionsToken, setRevisionsToken] = useState(0);
  const revisionsQ = useApi(
    () =>
      selectedCode && (revisionsOpen || restoreOpen)
        ? listKnowledgeRevisions(selectedCode, 1, 50)
        : Promise.resolve(null),
    [selectedCode, revisionsOpen, restoreOpen, revisionsToken],
  );
  const revisions = revisionsQ.data?.items ?? [];

  const [restoreSource, setRestoreSource] = useState<number>(1);
  const [restoreVersion, setRestoreVersion] = useState<string>("");

  /* Dialog confirm xuất bản / lưu trữ */
  const [publishOpen, setPublishOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  /* Nhập thử dry-run */
  const [dryOpen, setDryOpen] = useState(false);
  const [dryText, setDryText] = useState("");
  const [dryBusy, setDryBusy] = useState(false);
  const [dryResult, setDryResult] = useState<Record<string, unknown> | null>(null);

  /* ----------------------------- mutations ------------------------------- */

  const submitForm = async () => {
    if (!form.title.trim()) return toast.error("Chưa nhập tiêu đề tài liệu.");
    if (!form.summary.trim()) return toast.error("Chưa nhập tóm tắt nội dung.");
    if (!editing && !CODE_PATTERN.test(form.code.trim())) {
      return toast.error(
        "Mã tài liệu: bắt đầu bằng chữ thường, chỉ a-z 0-9 _ - , dài 2-80 ký tự.",
      );
    }
    setFormBusy(true);
    try {
      const draft = buildDraft(form);
      if (editing && selectedCode) {
        await updateKnowledge(selectedCode, {
          version: detail?.version ?? 1,
          draft,
        });
        toast.success(`Đã lưu phiên bản mới cho "${selectedCode}".`);
      } else {
        await createKnowledge({ code: form.code.trim(), draft });
        toast.success(`Đã tạo tài liệu "${form.code.trim()}" ở trạng thái nháp.`);
      }
      setFormOpen(false);
      listQ.reload();
      reloadDetail();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setFormBusy(false);
    }
  };

  const runCheck = async () => {
    if (!selectedCode) return;
    setCheckBusy(true);
    try {
      setCheckResult(await checkKnowledgePublication(selectedCode));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setCheckBusy(false);
    }
  };

  const doPublish = async () => {
    if (!selectedCode || !detail) return;
    setActionBusy("publish");
    try {
      await publishKnowledge(selectedCode, detail.version);
      toast.success(`Đã xuất bản "${selectedCode}" (phiên bản ${detail.version}).`);
      setPublishOpen(false);
      setCheckResult(null);
      listQ.reload();
      reloadDetail();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setActionBusy(null);
    }
  };

  const doArchive = async () => {
    if (!selectedCode || !detail) return;
    setActionBusy("archive");
    try {
      await archiveKnowledge(selectedCode, detail.version);
      toast.success(`Đã lưu trữ "${selectedCode}".`);
      setArchiveOpen(false);
      listQ.reload();
      reloadDetail();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setActionBusy(null);
    }
  };

  const openRestore = () => {
    if (!detail) return;
    setRestoreSource(detail.version);
    setRestoreVersion(String(detail.version + 1));
    setRevisionsToken((v) => v + 1);
    setRestoreOpen(true);
  };

  const doRestore = async () => {
    if (!selectedCode || !detail) return;
    const newVersion = Number(restoreVersion);
    if (!Number.isInteger(newVersion) || newVersion < 1) {
      return toast.error("Số phiên bản mới phải là số nguyên dương.");
    }
    setActionBusy("restore");
    try {
      await restoreKnowledge(selectedCode, {
        version: newVersion,
        sourceVersion: restoreSource,
      });
      toast.success(
        `Đã khôi phục "${selectedCode}" từ phiên bản ${restoreSource} thành phiên bản ${newVersion} (nháp).`,
      );
      setRestoreOpen(false);
      listQ.reload();
      reloadDetail();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setActionBusy(null);
    }
  };

  const submitDryRun = async () => {
    let entries: unknown;
    try {
      entries = JSON.parse(dryText);
    } catch {
      return toast.error("JSON không hợp lệ — dán một mảng entries.");
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      return toast.error("Cần một mảng JSON có ít nhất 1 entry.");
    }
    if (entries.length > 50) {
      return toast.error("Tối đa 50 entries mỗi lần thử.");
    }
    setDryBusy(true);
    try {
      const result = await dryRunKnowledgeImport(entries as Record<string, unknown>[]);
      setDryResult(result);
      toast.success("Dry-run hoàn tất — xem kết quả preview bên dưới.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDryBusy(false);
    }
  };

  /* ============================ TAB 2: AGENT RUNS ========================= */

  const [runPage, setRunPage] = useState(1);
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [runStatusFilter, setRunStatusFilter] = useState<string>("all");
  const runsQ = useApi(
    () =>
      listBusinessRuns({
        page: runPage,
        pageSize: PAGE_SIZE,
        agentId: agentFilter === "all" ? undefined : agentFilter,
        status: runStatusFilter === "all" ? undefined : runStatusFilter,
      }),
    [runPage, agentFilter, runStatusFilter],
  );
  const runs = runsQ.data?.items ?? [];
  const definitions = runsQ.data?.definitions ?? [];
  const [defsOpen, setDefsOpen] = useState(false);

  /* Khởi chạy knowledge run */
  const [launchOpen, setLaunchOpen] = useState(false);
  const [launchQuestion, setLaunchQuestion] = useState("");
  const [launchRole, setLaunchRole] = useState("");
  const [launchBusy, setLaunchBusy] = useState(false);

  /* Theo dõi run */
  const [trackId, setTrackId] = useState<string | null>(null);
  const [trackToken, setTrackToken] = useState(0);
  const [runActionBusy, setRunActionBusy] = useState<string | null>(null);
  const trackQ = useApi(
    () => (trackId ? getKnowledgeRun(trackId) : Promise.resolve(null)),
    [trackId, trackToken],
  );

  const submitLaunch = async () => {
    const question = launchQuestion.trim();
    if (question.length < 3 || question.length > 1000) {
      return toast.error("Câu hỏi cho agent: 3-1000 ký tự.");
    }
    setLaunchBusy(true);
    try {
      const run = await createKnowledgeRun({
        requestId: newRequestId(),
        question,
        ...(launchRole.trim() ? { roleCode: launchRole.trim() } : {}),
      });
      toast.success("Đã đưa agent kiến thức vào hàng chờ (202 Accepted).");
      setLaunchOpen(false);
      setLaunchQuestion("");
      setLaunchRole("");
      if (run?.id) {
        setTrackId(run.id);
        setTrackToken((v) => v + 1);
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLaunchBusy(false);
    }
  };

  const doRunAction = async (kind: "cancel" | "resume") => {
    if (!trackId) return;
    setRunActionBusy(kind);
    try {
      if (kind === "cancel") await cancelKnowledgeRun(trackId);
      else await resumeKnowledgeRun(trackId);
      toast.success(kind === "cancel" ? "Đã gửi yêu cầu hủy run." : "Đã gửi yêu cầu tiếp tục run.");
      setTrackToken((v) => v + 1);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setRunActionBusy(null);
    }
  };

  /* ------------------------------ render --------------------------------- */

  const kindOptions = useMemo(
    () => [
      { value: "all", label: "Tất cả" },
      ...Object.entries(KIND_META).map(([value, m]) => ({ value, label: m.label })),
    ],
    [],
  );

  return (
    <div>
      <StaffPageHeader
        eyebrow="Quản trị · kiến thức"
        title="Thư viện kiến thức"
        sub="Tài liệu nuôi agent: tạo nháp, kiểm tra, xuất bản và theo dõi phiên bản."
        icon={VBook}
        note="một tài liệu tốt là tài liệu agent đọc xong biết mình nên làm gì"
        actions={
          <>
            {tab === "docs" ? (
              <>
                <InkButton variant="outline" size="sm" onClick={() => setDryOpen(true)}>
                  <VInfo size={14} /> Nhập thử
                </InkButton>
                <InkButton
                  variant="royal"
                  size="sm"
                  onClick={() => {
                    setForm(emptyForm());
                    setEditing(false);
                    setFormOpen(true);
                  }}
                >
                  <VPlus size={15} /> Tạo tài liệu
                </InkButton>
              </>
            ) : (
              <InkButton
                variant="royal"
                size="sm"
                onClick={() => {
                  setLaunchQuestion("");
                  setLaunchRole("");
                  setLaunchOpen(true);
                }}
              >
                <VPlay size={14} /> Khởi chạy agent kiến thức
              </InkButton>
            )}
          </>
        }
      />

      {/* Tab switch */}
      <SketchCard hover={false} className="mb-4 p-4">
        <ChipGroup
          ariaLabel="Chọn phân mục thư viện kiến thức"
          options={[
            { value: "docs", label: "Tài liệu" },
            { value: "runs", label: "Agent runs" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </SketchCard>

      {/* ============================ TAB 1: TÀI LIỆU ========================= */}
      {tab === "docs" && (
        <>
          {/* Bộ lọc */}
          <SketchCard hover={false} className="mb-4 p-4">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="eyebrow !text-[0.6rem]">Trạng thái</span>
                <ChipGroup
                  ariaLabel="Lọc tài liệu theo trạng thái"
                  options={[
                    { value: "all", label: "Tất cả" },
                    { value: "draft", label: "Nháp" },
                    { value: "published", label: "Đã xuất bản" },
                    { value: "archived", label: "Lưu trữ" },
                  ]}
                  value={statusFilter}
                  onChange={(v) => {
                    setStatusFilter(v);
                    setPage(1);
                  }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="eyebrow !text-[0.6rem]">Loại</span>
                <ChipGroup
                  ariaLabel="Lọc tài liệu theo loại"
                  options={kindOptions}
                  value={kindFilter}
                  onChange={(v) => {
                    setKindFilter(v);
                    setPage(1);
                  }}
                />
              </div>
              <div className="flex min-w-56 flex-1 items-center gap-2">
                <VSearch size={15} className="shrink-0 text-[var(--ink-soft)]" aria-hidden="true" />
                <SketchInput
                  aria-label="Tìm tài liệu"
                  placeholder="Tìm theo mã / tiêu đề…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
            </div>
          </SketchCard>

          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
            {/* Bảng tài liệu */}
            <SketchCard hover={false} className="overflow-hidden">
              {listQ.loading && !listQ.data ? (
                <div className="p-5">
                  <PencilLines rows={6} />
                </div>
              ) : listQ.error ? (
                <div className="p-5">
                  <SectionError message={listQ.error} onRetry={listQ.reload} />
                </div>
              ) : (
                <>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="ink-table min-w-[880px]">
                      <thead>
                        <tr>
                          <th>Mã</th>
                          <th>Tiêu đề</th>
                          <th>Loại</th>
                          <th>Trạng thái</th>
                          <th>Bản</th>
                          <th>Ngôn ngữ</th>
                          <th>Đối tượng</th>
                          <th>Cập nhật</th>
                        </tr>
                      </thead>
                      <tbody>
                        {docs.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-0">
                              <EmptyState
                                icon={VInbox}
                                title="Không có tài liệu nào khớp bộ lọc ✎"
                                note="Thử bỏ lọc hoặc tạo tài liệu mới."
                              />
                            </td>
                          </tr>
                        ) : (
                          docs.map((doc) => (
                            <tr
                              key={doc.id}
                              onClick={() => setSelectedCode(doc.code)}
                              className={cn(
                                "sticker-pop cursor-pointer",
                                doc.code === selectedCode && "bg-[var(--blue-mist)]",
                              )}
                              aria-selected={doc.code === selectedCode}
                            >
                              <td>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCode(doc.code);
                                  }}
                                  className="focus-ink rounded-[6px] border border-[color-mix(in_srgb,var(--ink)_30%,transparent)] bg-[var(--paper)] px-1.5 py-0.5 font-mono text-[0.7rem] font-bold text-[var(--ink)] transition-colors hover:bg-[var(--blue-mist)]"
                                  aria-label={`Xem chi tiết tài liệu ${doc.code}`}
                                >
                                  {doc.code}
                                </button>
                              </td>
                              <td className="max-w-[220px]">
                                <p
                                  className="truncate text-sm font-semibold text-[var(--ink)]"
                                  title={doc.title}
                                >
                                  {doc.title}
                                </p>
                              </td>
                              <td>
                                <MetaBadge map={KIND_META} value={doc.kind} />
                              </td>
                              <td>
                                <MetaBadge map={KSTATUS_META} value={doc.status} />
                              </td>
                              <td className="tabular text-sm font-bold text-[var(--ink)]">
                                v{doc.version}
                              </td>
                              <td className="text-xs text-[var(--ink-soft)]">
                                {LANG_META[doc.language] ?? doc.language}
                              </td>
                              <td>
                                <MetaBadge map={AUDIENCE_META} value={doc.audience} />
                              </td>
                              <td className="whitespace-nowrap text-xs tabular text-[var(--ink-soft)]">
                                {doc.updatedAt ? formatDateTimeVN(doc.updatedAt) : "—"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Bản card mobile */}
                  <div className="divide-y-2 divide-dashed divide-[color-mix(in_srgb,var(--ink)_15%,transparent)] md:hidden">
                    {docs.length === 0 ? (
                      <EmptyState
                        icon={VInbox}
                        title="Không có tài liệu nào khớp bộ lọc ✎"
                        note="Thử bỏ lọc hoặc tạo tài liệu mới."
                      />
                    ) : (
                      docs.map((doc) => (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => setSelectedCode(doc.code)}
                          className={cn(
                            "sticker-pop block w-full p-4 text-left transition-colors",
                            doc.code === selectedCode && "bg-[var(--blue-mist)]",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="min-w-0 break-words font-mono text-[0.7rem] font-bold text-[var(--ink)]">
                              {doc.code}
                            </p>
                            <MetaBadge map={KSTATUS_META} value={doc.status} />
                          </div>
                          <p className="mt-1.5 text-sm font-bold leading-snug text-[var(--ink)]">
                            {doc.title}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <MetaBadge map={KIND_META} value={doc.kind} />
                            <InkBadge tone="neutral" className="!text-[0.62rem]">
                              v{doc.version}
                            </InkBadge>
                            <MetaBadge map={AUDIENCE_META} value={doc.audience} />
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  <Pager
                    page={listQ.data?.page ?? page}
                    pageSize={PAGE_SIZE}
                    total={totalDocs}
                    onPage={setPage}
                  />
                </>
              )}
            </SketchCard>

            {/* Panel chi tiết */}
            <div className="space-y-4">
              {!selectedCode ? (
                <SketchCard hover={false} className="p-5">
                  <EmptyState
                    icon={VBook}
                    title="Chọn một tài liệu"
                    note="Panel này hiện bản nháp hiện hành, nguồn tham khảo và vòng đời phiên bản."
                  />
                </SketchCard>
              ) : detailQ.loading && !detail ? (
                <SketchCard hover={false} className="p-5">
                  <PencilLines rows={6} />
                </SketchCard>
              ) : detailQ.error ? (
                <SketchCard hover={false} className="p-5">
                  <SectionError
                    message={detailQ.error}
                    onRetry={() => setDetailVersion((v) => v + 1)}
                  />
                </SketchCard>
              ) : detail ? (
                <SketchCard hover={false} className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="eyebrow !text-[0.6rem]">Chi tiết tài liệu</p>
                      <h2 className="mt-1 break-words text-lg font-extrabold leading-tight text-[var(--ink)]">
                        {detail.snapshot?.title || detail.code}
                      </h2>
                      <p className="mt-0.5 break-words font-mono text-[0.7rem] text-[var(--ink-soft)]">
                        {detail.code} · v{detail.version}
                      </p>
                    </div>
                    <MetaBadge map={KSTATUS_META} value={detail.status} className="shrink-0" />
                  </div>

                  {detail.snapshot?.summary && (
                    <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">
                      {detail.snapshot.summary}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <MetaBadge map={KIND_META} value={detail.snapshot?.kind} />
                    <InkBadge tone="neutral" className="!text-[0.65rem]">
                      {LANG_META[detail.snapshot?.language ?? ""] ?? detail.snapshot?.language}
                    </InkBadge>
                    {detail.snapshot?.difficulty && (
                      <MetaBadge map={DIFF_META} value={detail.snapshot.difficulty} />
                    )}
                    <MetaBadge map={AUDIENCE_META} value={detail.snapshot?.audience} />
                  </div>

                  {(detail.snapshot?.purposes?.length ?? 0) > 0 && (
                    <div className="mt-3">
                      <p className="eyebrow !text-[0.6rem]">Mục đích sử dụng</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {detail.snapshot?.purposes.map((p) => (
                          <InkBadge key={p} tone="blue" className="!text-[0.62rem]">
                            {p}
                          </InkBadge>
                        ))}
                      </div>
                    </div>
                  )}

                  {((detail.snapshot?.tags?.length ?? 0) > 0 ||
                    (detail.snapshot?.roleCodes?.length ?? 0) > 0) && (
                    <div className="mt-3">
                      <p className="eyebrow !text-[0.6rem]">Nhãn & vai trò</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {detail.snapshot?.roleCodes.map((r) => (
                          <InkBadge key={r} tone="amber" className="!text-[0.62rem]">
                            {r}
                          </InkBadge>
                        ))}
                        {detail.snapshot?.tags.map((t) => (
                          <InkBadge key={t} tone="neutral" className="!text-[0.62rem]">
                            #{t}
                          </InkBadge>
                        ))}
                      </div>
                    </div>
                  )}

                  {(detail.snapshot?.sources?.length ?? 0) > 0 && (
                    <div className="mt-3">
                      <p className="eyebrow !text-[0.6rem]">Nguồn tham khảo</p>
                      <ul className="mt-1.5 space-y-1.5">
                        {detail.snapshot?.sources.map((src, i) => (
                          <li
                            key={`${src.title}-${i}`}
                            className="rounded-[9px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_20%,transparent)] bg-[var(--paper)] px-3 py-1.5 text-[0.78rem] leading-snug text-[var(--ink)]"
                          >
                            <b>{src.title}</b>
                            {src.url && (
                              <span className="block break-all font-mono text-[0.66rem] text-[var(--royal)]">
                                {src.url}
                              </span>
                            )}
                            {src.reference && (
                              <span className="block text-[var(--ink-soft)]">{src.reference}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Nội dung body */}
                  <div className="mt-3">
                    <p className="eyebrow !text-[0.6rem]">Nội dung (body.markdown)</p>
                    <pre className="mt-1.5 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-[10px] border-2 border-[var(--ink)] bg-[var(--paper)] p-3 font-mono text-[0.72rem] leading-relaxed text-[var(--ink)]">
                      {typeof detail.snapshot?.body?.markdown === "string"
                        ? detail.snapshot.body.markdown
                        : JSON.stringify(detail.snapshot?.body ?? {}, null, 2)}
                    </pre>
                  </div>

                  <dl className="mt-3 divide-y-2 divide-dashed divide-[color-mix(in_srgb,var(--ink)_15%,transparent)] rounded-[12px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3.5">
                    <div className="flex items-center justify-between gap-3 py-2.5">
                      <dt className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                        Tạo lúc
                      </dt>
                      <dd className="tabular text-sm font-semibold text-[var(--ink)]">
                        {detail.createdAt ? formatDateTimeVN(detail.createdAt) : "—"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 py-2.5">
                      <dt className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                        Cập nhật
                      </dt>
                      <dd className="tabular text-sm font-semibold text-[var(--ink)]">
                        {detail.updatedAt ? formatDateTimeVN(detail.updatedAt) : "—"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 py-2.5">
                      <dt className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                        SHA-256
                      </dt>
                      <dd className="truncate font-mono text-[0.68rem] text-[var(--ink-soft)]">
                        {detail.sha256 ? detail.sha256.slice(0, 16) + "…" : "—"}
                      </dd>
                    </div>
                  </dl>

                  {/* Hành động vòng đời */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <InkButton
                      variant="royal"
                      size="sm"
                      onClick={() => {
                        setForm(formFromDetail(detail));
                        setEditing(true);
                        setFormOpen(true);
                      }}
                    >
                      <VEdit size={14} /> Sửa
                    </InkButton>
                    <InkButton variant="outline" size="sm" disabled={checkBusy} onClick={runCheck}>
                      <VShield size={14} /> {checkBusy ? "Đang kiểm tra…" : "Kiểm tra xuất bản"}
                    </InkButton>
                    <InkButton
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRevisionsToken((v) => v + 1);
                        setRevisionsOpen(true);
                      }}
                    >
                      <VClock size={14} /> Lịch sử
                    </InkButton>
                    <InkButton variant="outline" size="sm" onClick={openRestore}>
                      <VHistory size={14} /> Khôi phục
                    </InkButton>
                    <InkButton variant="outline" size="sm" onClick={() => setArchiveOpen(true)}>
                      <VArchive size={14} /> Lưu trữ
                    </InkButton>
                    <InkButton variant="royal" size="sm" onClick={() => setPublishOpen(true)}>
                      <VRocket size={14} /> Xuất bản
                    </InkButton>
                  </div>

                  {/* Kết quả publication-check */}
                  {checkResult && (
                    <div
                      className={cn(
                        "mt-4 rounded-[12px] border-2 p-3.5",
                        checkResult.publishable
                          ? "border-[var(--success)] bg-[color-mix(in_srgb,var(--success)_8%,transparent)]"
                          : "border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)]",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-extrabold text-[var(--ink)]">
                          Kiểm tra phiên bản {checkResult.currentVersion}
                        </p>
                        <InkBadge
                          tone={checkResult.publishable ? "green" : "red"}
                          className="!text-[0.65rem]"
                        >
                          {checkResult.publishable ? "Sẵn sàng xuất bản" : "Chưa xuất bản được"}
                        </InkBadge>
                      </div>
                      {checkResult.issues.length > 0 ? (
                        <ul className="mt-2 space-y-1">
                          {checkResult.issues.map((issue, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-1.5 text-[0.8rem] leading-snug text-[var(--ink)]"
                            >
                              <VInfo size={13} className="mt-0.5 shrink-0 text-[var(--danger)]" />
                              {issue}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1.5 text-[0.8rem] text-[var(--ink-soft)]">
                          Không có vấn đề chặn xuất bản.
                        </p>
                      )}
                    </div>
                  )}
                </SketchCard>
              ) : null}
            </div>
          </div>
        </>
      )}

      {/* ============================ TAB 2: AGENT RUNS ======================= */}
      {tab === "runs" && (
        <>
          <SketchCard hover={false} className="mb-4 p-4">
            <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
              <div className="w-full sm:w-60">
                <FieldLabel htmlFor="run-agent-filter">Agent</FieldLabel>
                <SketchSelect
                  id="run-agent-filter"
                  value={agentFilter}
                  onChange={(e) => {
                    setAgentFilter(e.target.value);
                    setRunPage(1);
                  }}
                >
                  <option value="all">Tất cả agent</option>
                  {AGENT_IDS.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </SketchSelect>
              </div>
              <div className="w-full sm:w-48">
                <FieldLabel htmlFor="run-status-filter">Trạng thái</FieldLabel>
                <SketchSelect
                  id="run-status-filter"
                  value={runStatusFilter}
                  onChange={(e) => {
                    setRunStatusFilter(e.target.value);
                    setRunPage(1);
                  }}
                >
                  <option value="all">Tất cả</option>
                  {Object.entries(RUN_STATUS_META).map(([value, m]) => (
                    <option key={value} value={value}>
                      {m.label}
                    </option>
                  ))}
                </SketchSelect>
              </div>
              <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
                <InkBadge tone="neutral" className="tabular">
                  {definitions.length} agent định nghĩa
                </InkBadge>
                <InkButton variant="outline" size="sm" onClick={() => setDefsOpen((v) => !v)}>
                  {defsOpen ? "Ẩn định nghĩa" : "Xem định nghĩa"}
                </InkButton>
                <InkButton variant="outline" size="sm" onClick={runsQ.reload}>
                  <VRefresh size={14} /> Tải lại
                </InkButton>
              </div>
            </div>

            {defsOpen && (
              <div className="mt-4 grid gap-2.5 md:grid-cols-2">
                {definitions.map((def) => (
                  <div
                    key={def.id}
                    className="rounded-[10px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)] bg-[var(--paper)] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-[0.74rem] font-bold text-[var(--ink)]">{def.id}</p>
                      <InkBadge tone="blue" className="!text-[0.6rem]">
                        v{def.version ?? "?"}
                      </InkBadge>
                    </div>
                    <p className="mt-1 font-mono text-[0.64rem] text-[var(--ink-soft)]">
                      {def.promptVersion ?? "—"}
                    </p>
                    <p className="mt-1.5 text-[0.68rem] tabular text-[var(--ink-soft)]">
                      {def.budget.maxSteps ?? "?"} bước · {def.budget.maxToolCalls ?? "?"} tool ·{" "}
                      {def.budget.maxDurationMs
                        ? `${Math.round(def.budget.maxDurationMs / 1000)}s`
                        : "?"}{" "}
                      · {def.budget.maxTokens?.toLocaleString("vi-VN") ?? "?"} token
                    </p>
                    {def.tools.length > 0 && (
                      <p className="mt-1.5 break-words font-mono text-[0.62rem] text-[var(--royal)]">
                        {def.tools.join(" · ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SketchCard>

          <SketchCard hover={false} className="overflow-hidden">
            {runsQ.loading && !runsQ.data ? (
              <div className="p-5">
                <PencilLines rows={6} />
              </div>
            ) : runsQ.error ? (
              <div className="p-5">
                <SectionError message={runsQ.error} onRetry={runsQ.reload} />
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="ink-table min-w-[920px]">
                    <thead>
                      <tr>
                        <th>Agent</th>
                        <th>Trạng thái</th>
                        <th>Bước</th>
                        <th>Lần thử</th>
                        <th>Lỗi</th>
                        <th>Model</th>
                        <th>Tool calls</th>
                        <th>Tạo lúc</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runs.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-0">
                            <EmptyState
                              icon={VBot}
                              title="Chưa có run nào khớp bộ lọc ✎"
                              note="Thử bỏ lọc agent/trạng thái hoặc tải lại."
                            />
                          </td>
                        </tr>
                      ) : (
                        runs.map((run) => (
                          <tr key={run.id} className="sticker-pop">
                            <td className="font-mono text-[0.72rem] font-bold text-[var(--ink)]">
                              {run.agentId}
                            </td>
                            <td>
                              <MetaBadge map={RUN_STATUS_META} value={run.status} />
                            </td>
                            <td className="tabular text-sm">{run.stepCount}</td>
                            <td className="tabular text-sm">{run.attempts}</td>
                            <td className="max-w-[180px]">
                              {run.errorCode ? (
                                <span
                                  className="font-mono text-[0.68rem] font-bold text-[var(--danger)]"
                                  title={run.errorCode}
                                >
                                  {run.errorCode}
                                </span>
                              ) : (
                                <span className="text-xs text-[var(--ink-soft)]">—</span>
                              )}
                            </td>
                            <td className="font-mono text-[0.68rem] text-[var(--ink-soft)]">
                              {run.model ?? "—"}
                            </td>
                            <td className="tabular text-sm">{run.toolCalls}</td>
                            <td className="whitespace-nowrap text-xs tabular text-[var(--ink-soft)]">
                              {run.createdAt ? formatDateTimeVN(run.createdAt) : "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Bản card mobile */}
                <div className="divide-y-2 divide-dashed divide-[color-mix(in_srgb,var(--ink)_15%,transparent)] md:hidden">
                  {runs.length === 0 ? (
                    <EmptyState
                      icon={VBot}
                      title="Chưa có run nào khớp bộ lọc ✎"
                      note="Thử bỏ lọc agent/trạng thái hoặc tải lại."
                    />
                  ) : (
                    runs.map((run) => (
                      <div key={run.id} className="sticker-pop p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 break-words font-mono text-[0.72rem] font-bold text-[var(--ink)]">
                            {run.agentId}
                          </p>
                          <MetaBadge map={RUN_STATUS_META} value={run.status} />
                        </div>
                        <p className="mt-2 text-[0.72rem] tabular text-[var(--ink-soft)]">
                          {run.stepCount} bước · {run.attempts} lần thử · {run.toolCalls} tool call
                        </p>
                        {run.errorCode && (
                          <p className="mt-1 font-mono text-[0.66rem] font-bold text-[var(--danger)]">
                            {run.errorCode}
                          </p>
                        )}
                        <p className="mt-1 text-[0.72rem] tabular text-[var(--ink-soft)]">
                          {run.createdAt ? formatDateTimeVN(run.createdAt) : "—"}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <Pager
                  page={runsQ.data?.page ?? runPage}
                  pageSize={PAGE_SIZE}
                  total={runsQ.data?.total ?? 0}
                  onPage={setRunPage}
                />
              </>
            )}
          </SketchCard>
        </>
      )}

      {/* ======================= DIALOG: tạo / sửa tài liệu ==================== */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[var(--ink)]">
              {editing ? `Sửa tài liệu ${form.code}` : "Tạo tài liệu kiến thức"}
            </DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              {editing
                ? "Lưu sẽ tạo phiên bản nháp mới (tăng version) — bản đã xuất bản không bị ghi đè."
                : "Tài liệu mới vào trạng thái nháp; kiểm tra rồi mới xuất bản cho agent dùng."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!editing && (
              <div>
                <FieldLabel htmlFor="kf-code">Mã tài liệu</FieldLabel>
                <SketchInput
                  id="kf-code"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="vd: guide-code-review-2026"
                  className="font-mono"
                />
                <p className="mt-1 text-[0.68rem] text-[var(--ink-soft)]">
                  Bắt đầu bằng chữ thường, chỉ a-z 0-9 _ - , dài 2-80 ký tự.
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="kf-kind">Loại tài liệu</FieldLabel>
                <SketchSelect
                  id="kf-kind"
                  value={form.kind}
                  onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
                >
                  {Object.entries(KIND_META).map(([value, m]) => (
                    <option key={value} value={value}>
                      {m.label} ({value})
                    </option>
                  ))}
                </SketchSelect>
              </div>
              <div>
                <FieldLabel>Ngôn ngữ</FieldLabel>
                <ChipGroup
                  ariaLabel="Chọn ngôn ngữ"
                  options={[
                    { value: "vi", label: "Tiếng Việt" },
                    { value: "en", label: "English" },
                  ]}
                  value={form.language}
                  onChange={(v) => setForm((f) => ({ ...f, language: v }))}
                />
              </div>
            </div>

            <div>
              <FieldLabel htmlFor="kf-title">Tiêu đề</FieldLabel>
              <SketchInput
                id="kf-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Tên hiển thị của tài liệu"
              />
            </div>

            <div>
              <FieldLabel htmlFor="kf-summary">Tóm tắt</FieldLabel>
              <SketchTextarea
                id="kf-summary"
                rows={2}
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                placeholder="Một hai câu nói rõ tài liệu này dùng làm gì."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <fieldset>
                <legend className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                  Độ khó
                </legend>
                <ChipGroup
                  ariaLabel="Chọn độ khó"
                  options={[
                    { value: "easy", label: "Dễ" },
                    { value: "medium", label: "Vừa" },
                    { value: "hard", label: "Khó" },
                  ]}
                  value={form.difficulty}
                  onChange={(v) => setForm((f) => ({ ...f, difficulty: v }))}
                />
              </fieldset>
              <fieldset className="sm:col-span-2">
                <legend className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                  Đối tượng
                </legend>
                <ChipGroup
                  ariaLabel="Chọn đối tượng"
                  options={[
                    { value: "student_safe", label: "Sinh viên" },
                    { value: "staff_only", label: "Nhân sự" },
                    { value: "grading_only", label: "Chỉ chấm điểm" },
                  ]}
                  value={form.audience}
                  onChange={(v) => setForm((f) => ({ ...f, audience: v }))}
                />
              </fieldset>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <FieldLabel htmlFor="kf-purposes">Mục đích (phẩy)</FieldLabel>
                <SketchInput
                  id="kf-purposes"
                  value={form.purposes}
                  onChange={(e) => setForm((f) => ({ ...f, purposes: e.target.value }))}
                  placeholder="mentoring, planning"
                  className="font-mono text-[0.78rem]"
                />
              </div>
              <div>
                <FieldLabel htmlFor="kf-roles">Role codes (phẩy)</FieldLabel>
                <SketchInput
                  id="kf-roles"
                  value={form.roleCodes}
                  onChange={(e) => setForm((f) => ({ ...f, roleCodes: e.target.value }))}
                  placeholder="backend, frontend"
                  className="font-mono text-[0.78rem]"
                />
              </div>
              <div>
                <FieldLabel htmlFor="kf-tags">Nhãn (phẩy)</FieldLabel>
                <SketchInput
                  id="kf-tags"
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="mini-project, P02-v1"
                  className="font-mono text-[0.78rem]"
                />
              </div>
            </div>

            {/* Nguồn tham khảo động */}
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                  Nguồn tham khảo ({form.sources.length})
                </p>
                <InkButton
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      sources: [...f.sources, { title: "", url: "", reference: "" }],
                    }))
                  }
                >
                  <VPlus size={13} /> Thêm nguồn
                </InkButton>
              </div>
              {form.sources.length === 0 ? (
                <p className="mt-1.5 text-[0.72rem] text-[var(--ink-soft)]">
                  Chưa có nguồn — thêm dòng để ghi rõ tài liệu này dựa trên đâu.
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  {form.sources.map((src, idx) => (
                    <div
                      key={idx}
                      className="grid gap-2 rounded-[10px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)] bg-[var(--paper)] p-2.5 sm:grid-cols-[1fr_1fr_1fr_auto]"
                    >
                      <SketchInput
                        aria-label={`Nguồn ${idx + 1} - tiêu đề`}
                        placeholder="Tiêu đề nguồn"
                        value={src.title}
                        onChange={(e) =>
                          setForm((f) => {
                            const sources = [...f.sources];
                            sources[idx] = { ...sources[idx], title: e.target.value };
                            return { ...f, sources };
                          })
                        }
                      />
                      <SketchInput
                        aria-label={`Nguồn ${idx + 1} - URL`}
                        placeholder="URL (tùy chọn)"
                        value={src.url}
                        onChange={(e) =>
                          setForm((f) => {
                            const sources = [...f.sources];
                            sources[idx] = { ...sources[idx], url: e.target.value };
                            return { ...f, sources };
                          })
                        }
                      />
                      <SketchInput
                        aria-label={`Nguồn ${idx + 1} - tham chiếu`}
                        placeholder="Tham chiếu (tùy chọn)"
                        value={src.reference}
                        onChange={(e) =>
                          setForm((f) => {
                            const sources = [...f.sources];
                            sources[idx] = { ...sources[idx], reference: e.target.value };
                            return { ...f, sources };
                          })
                        }
                      />
                      <button
                        type="button"
                        aria-label={`Xóa nguồn ${idx + 1}`}
                        title="Xóa dòng nguồn này"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            sources: f.sources.filter((_, i) => i !== idx),
                          }))
                        }
                        className="focus-ink grid h-10 w-10 place-items-center self-center rounded-full border-2 border-[var(--danger)] text-[var(--danger)] transition-all hover:-translate-y-0.5 hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]"
                      >
                        <VTrash size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="kf-markdown">Nội dung Markdown (body)</FieldLabel>
              <SketchTextarea
                id="kf-markdown"
                rows={8}
                value={form.markdown}
                onChange={(e) => setForm((f) => ({ ...f, markdown: e.target.value }))}
                placeholder="# Tiêu đề lớn&#10;&#10;Nội dung hướng dẫn từng bước…"
                className="font-mono text-[0.78rem]"
              />
            </div>
          </div>

          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setFormOpen(false)}>
              Hủy
            </InkButton>
            <InkButton variant="royal" size="sm" disabled={formBusy} onClick={submitForm}>
              <VCheck size={14} /> {formBusy ? "Đang lưu…" : editing ? "Lưu phiên bản mới" : "Tạo nháp"}
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== DIALOG: lịch sử phiên bản ====================== */}
      <Dialog open={revisionsOpen} onOpenChange={setRevisionsOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[var(--ink)]">
              Lịch sử phiên bản — {selectedCode}
            </DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Mỗi lần lưu tạo một bản chụp (snapshot) không đổi; SHA-256 dùng đối chiếu nội dung.
            </DialogDescription>
          </DialogHeader>
          {revisionsQ.loading && !revisionsQ.data ? (
            <PencilLines rows={4} />
          ) : revisionsQ.error ? (
            <SectionError message={revisionsQ.error} onRetry={() => setRevisionsToken((v) => v + 1)} />
          ) : revisions.length === 0 ? (
            <EmptyState icon={VClock} title="Chưa có phiên bản nào" />
          ) : (
            <ol className="space-y-2">
              {revisions.map((rev) => (
                <li
                  key={rev.version}
                  className="rounded-[10px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)] bg-[var(--paper)] p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-extrabold text-[var(--ink)]">
                      Phiên bản {rev.version}
                      {detail && rev.version === detail.version && (
                        <InkBadge tone="blue" className="ml-2 !text-[0.6rem]">
                          Hiện hành
                        </InkBadge>
                      )}
                    </p>
                    <span className="text-[0.7rem] tabular text-[var(--ink-soft)]">
                      {rev.createdAt ? formatDateTimeVN(rev.createdAt) : "—"}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[0.64rem] text-[var(--ink-soft)]">
                    {rev.sha256 ? rev.sha256.slice(0, 24) + "…" : "—"}
                    {rev.snapshot ? ` · ${rev.snapshot.status}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          )}
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setRevisionsOpen(false)}>
              Đóng
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================= DIALOG: khôi phục phiên bản ================== */}
      <Dialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[var(--ink)]">
              Khôi phục tài liệu {selectedCode}
            </DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Chép snapshot của một phiên bản cũ thành phiên bản nháp mới.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <FieldLabel htmlFor="restore-source">Khôi phục từ phiên bản</FieldLabel>
              <SketchSelect
                id="restore-source"
                value={restoreSource}
                onChange={(e) => setRestoreSource(Number(e.target.value))}
              >
                {revisions.map((rev) => (
                  <option key={rev.version} value={rev.version}>
                    Phiên bản {rev.version}
                    {rev.snapshot ? ` — ${rev.snapshot.title}` : ""}
                  </option>
                ))}
              </SketchSelect>
            </div>
            <div>
              <FieldLabel htmlFor="restore-version">Số phiên bản mới</FieldLabel>
              <SketchInput
                id="restore-version"
                type="number"
                min={1}
                value={restoreVersion}
                onChange={(e) => setRestoreVersion(e.target.value)}
                className="tabular"
              />
              <p className="mt-1 text-[0.68rem] text-[var(--ink-soft)]">
                Mặc định = phiên bản hiện tại + 1.
              </p>
            </div>
          </div>
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setRestoreOpen(false)}>
              Hủy
            </InkButton>
            <InkButton
              variant="royal"
              size="sm"
              disabled={actionBusy === "restore"}
              onClick={doRestore}
            >
              <VHistory size={14} /> {actionBusy === "restore" ? "Đang khôi phục…" : "Khôi phục"}
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== DIALOG: xác nhận xuất bản / lưu trữ ============= */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[var(--ink)]">
              Xuất bản {selectedCode}?
            </DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Phiên bản {detail?.version} sẽ được phát hành cho các agent theo mục đích đã gắn.
              Nên chạy "Kiểm tra xuất bản" trước khi bấm.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setPublishOpen(false)}>
              Hủy
            </InkButton>
            <InkButton variant="royal" size="sm" disabled={actionBusy === "publish"} onClick={doPublish}>
              <VRocket size={14} /> {actionBusy === "publish" ? "Đang xuất bản…" : "Xuất bản"}
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[var(--ink)]">
              Lưu trữ {selectedCode}?
            </DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Tài liệu phiên bản {detail?.version} sẽ ngừng phát hành; có thể khôi phục về nháp từ
              lịch sử phiên bản.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setArchiveOpen(false)}>
              Hủy
            </InkButton>
            <InkButton
              variant="outline"
              size="sm"
              disabled={actionBusy === "archive"}
              onClick={doArchive}
            >
              <VArchive size={14} /> {actionBusy === "archive" ? "Đang lưu trữ…" : "Lưu trữ"}
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================= DIALOG: nhập thử (dry-run) =================== */}
      <Dialog open={dryOpen} onOpenChange={setDryOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[var(--ink)]">
              Nhập thử tài liệu (dry-run)
            </DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Dán mảng JSON entries (1-50 mục). Hệ thống kiểm tra mà không ghi gì vào thư viện.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <SketchTextarea
              aria-label="JSON entries cần thử nhập"
              rows={8}
              value={dryText}
              onChange={(e) => setDryText(e.target.value)}
              placeholder={'[\n  { "code": "guide-sample", "draft": { ... } }\n]'}
              className="font-mono text-[0.75rem]"
            />
            <InkButton variant="royal" size="sm" disabled={dryBusy} onClick={submitDryRun}>
              <VPlay size={14} /> {dryBusy ? "Đang chạy thử…" : "Chạy thử"}
            </InkButton>
            {dryResult && (
              <div>
                <p className="eyebrow !text-[0.6rem]">Kết quả preview</p>
                <pre className="mt-1.5 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-[10px] border-2 border-[var(--ink)] bg-[var(--paper)] p-3 font-mono text-[0.7rem] leading-relaxed text-[var(--ink)]">
                  {JSON.stringify(dryResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setDryOpen(false)}>
              Đóng
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== DIALOG: khởi chạy knowledge run ================ */}
      <Dialog open={launchOpen} onOpenChange={setLaunchOpen}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[var(--ink)]">
              Khởi chạy agent kiến thức
            </DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Agent chạy nền (202 Accepted) — theo dõi qua mã run sau khi tạo. Mỗi request sinh một
              requestId riêng.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <FieldLabel htmlFor="launch-question">Câu hỏi cho agent (3-1000 ký tự)</FieldLabel>
              <SketchTextarea
                id="launch-question"
                rows={4}
                value={launchQuestion}
                onChange={(e) => setLaunchQuestion(e.target.value)}
                placeholder="vd: Tổng hợp hướng dẫn chấm bài Sprint 1 cho vai trò backend."
              />
              <p className="mt-1 text-right text-[0.68rem] tabular text-[var(--ink-soft)]">
                {launchQuestion.length}/1000
              </p>
            </div>
            <div>
              <FieldLabel htmlFor="launch-role">Role code (tùy chọn)</FieldLabel>
              <SketchInput
                id="launch-role"
                value={launchRole}
                onChange={(e) => setLaunchRole(e.target.value)}
                placeholder="vd: backend — để trống nếu là câu hỏi chung"
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setLaunchOpen(false)}>
              Hủy
            </InkButton>
            <InkButton variant="royal" size="sm" disabled={launchBusy} onClick={submitLaunch}>
              <VPlay size={14} /> {launchBusy ? "Đang gửi…" : "Khởi chạy"}
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================= DIALOG: theo dõi run ========================= */}
      <Dialog
        open={!!trackId}
        onOpenChange={(open) => {
          if (!open) setTrackId(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2 font-extrabold text-[var(--ink)]">
              <VBot size={18} /> Theo dõi knowledge run
            </DialogTitle>
            <DialogDescription className="break-all font-mono text-[0.7rem] text-[var(--ink-soft)]">
              {trackId}
            </DialogDescription>
          </DialogHeader>
          {trackQ.loading && !trackQ.data ? (
            <PencilLines rows={4} />
          ) : trackQ.error ? (
            <SectionError message={trackQ.error} onRetry={() => setTrackToken((v) => v + 1)} />
          ) : trackQ.data ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <MetaBadge map={RUN_STATUS_META} value={trackQ.data.status} />
                <InkButton
                  variant="outline"
                  size="sm"
                  onClick={() => setTrackToken((v) => v + 1)}
                >
                  <VRefresh size={13} /> Tải lại
                </InkButton>
                <InkButton
                  variant="outline"
                  size="sm"
                  disabled={runActionBusy === "cancel"}
                  onClick={() => doRunAction("cancel")}
                >
                  <VStop size={13} /> {runActionBusy === "cancel" ? "Đang hủy…" : "Hủy run"}
                </InkButton>
                <InkButton
                  variant="royal"
                  size="sm"
                  disabled={runActionBusy === "resume"}
                  onClick={() => doRunAction("resume")}
                >
                  <VPlay size={13} /> {runActionBusy === "resume" ? "Đang tiếp tục…" : "Tiếp tục"}
                </InkButton>
              </div>
              <RawKvList data={trackQ.data.raw} />
            </>
          ) : null}
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setTrackId(null)}>
              Đóng
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
