"use client";
/* =====================================================================
 * PROJECTS LIBRARY — "Dự án & Mẫu" (route: instructor/admin → projects).
 * Endpoint BE cover:
 *   [Tab Dự án]
 *   · GET  /projects (lọc q/status/difficulty/domain/technology + phân trang)
 *   · GET  /projects/filter-options
 *   · POST /projects · GET/PATCH /projects/{id} · POST /projects/{id}/claim
 *   · GET  /projects/{id}/members · GET /projects/{id}/sessions
 *   · GET/PUT /projects/{id}/slots
 *   · GET  /projects/{id}/template-context · GET /projects/{id}/template-assessment
 *   · GET/POST /projects/{id}/changes · POST /project-changes/{id}/apply
 *   [Tab Mẫu dự án]
 *   · GET  /project-templates · POST /project-templates
 *   · GET  /project-templates/{id} · GET /{id}/assessment
 *   · GET  /project-templates/{id}/revisions · GET /{id}/revisions/{version}
 *   · GET  /project-templates/{id}/revisions/{version}/assessment
 *   · POST /project-templates/{id}/start
 *   · GET  /tasks/{id}/spec · GET /tasks/{id}/spec/source
 * ===================================================================== */
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  VArchive,
  VCheck,
  VCode,
  VEdit,
  VFileCode,
  VFolderOpen,
  VHistory,
  VInfo,
  VInbox,
  VLayers,
  VPlus,
  VRocket,
  VSearch,
  VShapes,
  VSparkles,
  VTarget,
  VTrash,
  VUser,
  VUsers,
} from "@/components/icons/v-icons";
import { InkButton } from "@/components/notebook/reveal";
import { InkBadge, MarginNote, SketchCard, Tape, formatDateVN } from "@/components/notebook/ui";
import {
  ChipGroup,
  EmptyState,
  PencilLines,
  SectionError,
  SketchInput,
  SketchTextarea,
  StaffPageHeader,
} from "@/components/staff/staff-kit";
import { useApp } from "@/lib/store";
import { useApi } from "@/lib/use-api";
import { errorMessage } from "@/lib/api/api-client";
import {
  applyProjectChange,
  claimProject,
  createProject,
  createTemplate,
  getProject,
  getProjectFilterOptions,
  getProjectSlots,
  getProjectTemplateAssessment,
  getProjectTemplateContext,
  getTaskSpec,
  getTaskSpecSource,
  getTemplate,
  getTemplateAssessment,
  getTemplateRevision,
  getTemplateRevisionAssessment,
  listProjectChanges,
  listProjectMembers,
  listProjectSessions,
  listProjects,
  listTemplateRevisions,
  listTemplates,
  proposeProjectChange,
  setProjectSlots,
  startTemplate,
  updateProject,
  type CreateProjectInput,
  type Project,
  type SlotInput,
} from "@/lib/api/projects";
import { cn } from "@/lib/utils";

/* ------------------------------ hiển thị ------------------------------- */

const DIFFICULTY_META: Record<string, { label: string; tone: string }> = {
  beginner: { label: "Cơ bản", tone: "green" },
  intermediate: { label: "Trung cấp", tone: "amber" },
  advanced: { label: "Nâng cao", tone: "red" },
};

const PROJECT_STATUS_META: Record<string, { label: string; tone: string }> = {
  draft: { label: "Bản nháp", tone: "neutral" },
  active: { label: "Đang chạy", tone: "green" },
  completed: { label: "Hoàn thành", tone: "blue" },
  archived: { label: "Lưu trữ", tone: "neutral" },
};

function MetaBadge({ map, value }: { map: Record<string, { label: string; tone: string }>; value: string | null | undefined }) {
  if (!value) return <InkBadge tone="neutral">—</InkBadge>;
  const meta = map[value] ?? { label: value, tone: "neutral" };
  return <InkBadge tone={meta.tone} dot>{meta.label}</InkBadge>;
}

function TechChips({ items, max = 4 }: { items: string[]; max?: number }) {
  if (items.length === 0) return <span className="text-[0.72rem] text-[var(--ink-soft)]">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {items.slice(0, max).map((t) => (
        <span
          key={t}
          className="rounded-full border-[1.5px] border-[color-mix(in_srgb,var(--ink)_26%,transparent)] bg-[var(--paper)] px-2 py-0.5 text-[0.66rem] font-semibold"
        >
          {t}
        </span>
      ))}
      {items.length > max && (
        <span className="text-[0.66rem] font-bold text-[var(--ink-soft)]">+{items.length - max}</span>
      )}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="font-geist-mono text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
        {label}
      </p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

/** Date input → ISO 8601 (BE yêu cầu ISO date-time). */
function toIso(date: string): string | undefined {
  if (!date) return undefined;
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/* =====================================================================
 * MÀN CHÍNH
 * ===================================================================== */

export default function ProjectsLibrary() {
  const user = useApp((s) => s.user);
  const eyebrow = user?.role === "admin" ? "Sổ tay hành trình · Quản trị" : "Sổ tay hành trình · Giảng viên";
  const [tab, setTab] = useState<"projects" | "templates">("projects");

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-8 sm:px-6">
      <StaffPageHeader
        eyebrow={eyebrow}
        title="Dự án & Mẫu dự án"
        sub="Kho dự án đang quản lý và thư viện mẫu dùng để mở phiên thực tập mới."
        note="Dự án thư viện chưa có mentor có thể nhận làm của mình — xem cột người hướng dẫn."
        icon={VShapes}
      />
      <ChipGroup
        ariaLabel="Chọn khu vực xem"
        value={tab}
        onChange={setTab}
        options={[
          { value: "projects", label: "Dự án đang chạy" },
          { value: "templates", label: "Mẫu dự án" },
        ]}
      />
      {tab === "projects" ? <ProjectsTab /> : <TemplatesTab />}
    </main>
  );
}

/* =====================================================================
 * TAB 1 — DỰ ÁN
 * ===================================================================== */

type StatusFilter = "all" | "draft" | "active" | "completed" | "archived";
type DifficultyFilter = "all" | "beginner" | "intermediate" | "advanced";

function ProjectsTab() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");
  const [domain, setDomain] = useState("all");
  const [technology, setTechnology] = useState("all");
  const [page, setPage] = useState(1);

  const filterKey = JSON.stringify({ q, status, difficulty, domain, technology, page });
  const { data, loading, error, reload } = useApi(
    () =>
      listProjects({
        q: q.trim() || undefined,
        status: status === "all" ? undefined : status,
        difficulty: difficulty === "all" ? undefined : difficulty,
        domainCategory: domain === "all" ? undefined : domain,
        technology: technology === "all" ? undefined : technology,
        page,
        pageSize: 10,
      }),
    [filterKey],
  );
  const options = useApi(getProjectFilterOptions, []);

  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      {/* Bộ lọc */}
      <SketchCard hover={false} className="space-y-3 p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <VSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]" />
            <SketchInput
              aria-label="Tìm dự án theo mã hoặc tên"
              placeholder="Tìm theo mã / tên dự án…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <InkButton variant="royal" size="sm" onClick={() => setCreating(true)}>
            <VPlus size={15} /> Dự án mới
          </InkButton>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Lọc theo trạng thái"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as StatusFilter);
              setPage(1);
            }}
            className="focus-ink rounded-[9px] border-2 border-[var(--ink)] bg-[var(--paper)] px-2.5 py-1.5 text-xs font-bold"
          >
            <option value="all">Mọi trạng thái</option>
            {Object.entries(PROJECT_STATUS_META).map(([key, meta]) => (
              <option key={key} value={key}>{meta.label}</option>
            ))}
          </select>
          <select
            aria-label="Lọc theo độ khó"
            value={difficulty}
            onChange={(e) => {
              setDifficulty(e.target.value as DifficultyFilter);
              setPage(1);
            }}
            className="focus-ink rounded-[9px] border-2 border-[var(--ink)] bg-[var(--paper)] px-2.5 py-1.5 text-xs font-bold"
          >
            <option value="all">Mọi độ khó</option>
            {Object.entries(DIFFICULTY_META).map(([key, meta]) => (
              <option key={key} value={key}>{meta.label}</option>
            ))}
          </select>
          <select
            aria-label="Lọc theo lĩnh vực"
            value={domain}
            onChange={(e) => {
              setDomain(e.target.value);
              setPage(1);
            }}
            className="focus-ink rounded-[9px] border-2 border-[var(--ink)] bg-[var(--paper)] px-2.5 py-1.5 text-xs font-bold"
          >
            <option value="all">Mọi lĩnh vực</option>
            {(options.data?.domains ?? []).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            aria-label="Lọc theo công nghệ"
            value={technology}
            onChange={(e) => {
              setTechnology(e.target.value);
              setPage(1);
            }}
            className="focus-ink rounded-[9px] border-2 border-[var(--ink)] bg-[var(--paper)] px-2.5 py-1.5 text-xs font-bold"
          >
            <option value="all">Mọi công nghệ</option>
            {(options.data?.technologies ?? []).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <span className="ml-auto font-geist-mono text-[0.64rem] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
            {data ? `${data.total.toLocaleString("vi-VN")} dự án` : "…"}
          </span>
        </div>
      </SketchCard>

      {/* Danh sách */}
      {error ? (
        <SectionError message={error} onRetry={reload} />
      ) : loading ? (
        <PencilLines rows={4} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={VFolderOpen}
          title="Chưa có dự án nào trong phạm vi của bạn"
          note="Bạn thấy dự án mình quản lý và dự án thư viện chưa có mentor. Tạo dự án mới hoặc nhận một dự án chưa có người hướng dẫn để bắt đầu."
        />
      ) : (
        <>
          {/* Bảng desktop */}
          <SketchCard hover={false} className="hidden overflow-hidden p-0 md:block">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-[var(--paper-raised)]">
                  <tr className="font-geist-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                    <th className="px-3 py-2.5">Dự án</th>
                    <th className="px-3 py-2.5">Lĩnh vực</th>
                    <th className="px-3 py-2.5">Độ khó</th>
                    <th className="px-3 py-2.5">Trạng thái</th>
                    <th className="px-3 py-2.5">Mentor</th>
                    <th className="px-3 py-2.5">Thời gian</th>
                    <th className="px-3 py-2.5" aria-label="Thao tác" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((p) => (
                    <tr
                      key={p.id}
                      className="cursor-pointer border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_14%,transparent)] transition-colors hover:bg-[var(--blue-mist)]"
                      onClick={() => setDetailId(p.id)}
                    >
                      <td className="px-3 py-2.5">
                        <p className="font-bold leading-tight">{p.name}</p>
                        <p className="font-geist-mono text-[0.66rem] text-[var(--ink-soft)]">{p.code}</p>
                      </td>
                      <td className="px-3 py-2.5 text-[0.8rem]">{p.domainCategory ?? "—"}</td>
                      <td className="px-3 py-2.5"><MetaBadge map={DIFFICULTY_META} value={p.difficulty} /></td>
                      <td className="px-3 py-2.5"><MetaBadge map={PROJECT_STATUS_META} value={p.status} /></td>
                      <td className="px-3 py-2.5 text-[0.8rem]">
                        {p.mentorId ? (
                          <span className="inline-flex items-center gap-1 text-[var(--ink-soft)]">
                            <VUser size={13} /> Đã có
                          </span>
                        ) : (
                          <InkBadge tone="amber">Chưa có</InkBadge>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[0.72rem] tabular text-[var(--ink-soft)]">
                        {p.startDate ? formatDateVN(p.startDate) : "?"} → {p.endDate ? formatDateVN(p.endDate) : "?"}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <InkButton variant="outline" size="sm" onClick={() => setDetailId(p.id)}>
                          Chi tiết
                        </InkButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SketchCard>

          {/* Thẻ mobile */}
          <div className="grid gap-3 md:hidden">
            {data.items.map((p) => (
              <SketchCard key={p.id} as="article" className="space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-geist-mono text-[0.66rem] font-bold text-[var(--royal)]">{p.code}</span>
                  <MetaBadge map={PROJECT_STATUS_META} value={p.status} />
                  <MetaBadge map={DIFFICULTY_META} value={p.difficulty} />
                </div>
                <p className="font-bold leading-snug">{p.name}</p>
                <TechChips items={p.technologies} />
                <p className="text-[0.72rem] text-[var(--ink-soft)]">
                  {p.startDate ? formatDateVN(p.startDate) : "?"} → {p.endDate ? formatDateVN(p.endDate) : "?"}
                </p>
                <InkButton variant="outline" size="sm" onClick={() => setDetailId(p.id)}>
                  Chi tiết
                </InkButton>
              </SketchCard>
            ))}
          </div>

          {/* Phân trang */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-[0.74rem] text-[var(--ink-soft)]">
              Trang {page}/{Math.max(1, totalPages)}
            </p>
            <div className="flex gap-2">
              <InkButton variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Trang trước
              </InkButton>
              <InkButton
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Trang sau
              </InkButton>
            </div>
          </div>
        </>
      )}

      <CreateProjectDialog open={creating} onClose={setCreating} onCreated={reload} />
      {detailId && <ProjectDetailDialog id={detailId} onClose={() => setDetailId(null)} onChanged={reload} />}
    </div>
  );
}

/* ------------------------- tạo dự án (POST /projects) ------------------- */

function CreateProjectDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    domainCategory: "",
    difficulty: "beginner" as "beginner" | "intermediate" | "advanced",
    capacity: "",
    startDate: "",
    endDate: "",
    technologies: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(form.code)) {
      setFormError("Mã dự án bắt đầu bằng chữ/số, chỉ gồm chữ, số, dấu chấm, gạch ngang, gạch dưới.");
      return;
    }
    if (!form.name.trim() || !form.description.trim()) {
      setFormError("Cần điền đủ tên và mô tả dự án.");
      return;
    }
    setFormError(null);
    setBusy(true);
    try {
      await createProject({
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        domainCategory: form.domainCategory.trim() || undefined,
        difficulty: form.difficulty,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        startDate: toIso(form.startDate),
        endDate: toIso(form.endDate),
        technologies: form.technologies
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      toast.success(`Đã tạo dự án ${form.code.trim()}`);
      onCreated();
      onClose(false);
      setForm({ code: "", name: "", description: "", domainCategory: "", difficulty: "beginner", capacity: "", startDate: "", endDate: "", technologies: "" });
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tạo dự án mới</DialogTitle>
          <DialogDescription>
            Dự án thuộc phạm vi bạn quản lý. Mã dự án dùng để sinh mã phiên và nhiệm vụ sau này.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="prj-code" className="text-xs font-bold">Mã dự án *</label>
              <SketchInput id="prj-code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="VD: PRJ-ECOM-001" />
            </div>
            <div className="space-y-1">
              <label htmlFor="prj-name" className="text-xs font-bold">Tên dự án *</label>
              <SketchInput id="prj-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="VD: Cổng thông tin thực tập" />
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="prj-desc" className="text-xs font-bold">Mô tả *</label>
            <SketchTextarea id="prj-desc" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Mục tiêu, phạm vi, sản phẩm đầu ra…" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="prj-domain" className="text-xs font-bold">Lĩnh vực</label>
              <SketchInput id="prj-domain" value={form.domainCategory} onChange={(e) => setForm((f) => ({ ...f, domainCategory: e.target.value }))} placeholder="VD: mini-projects" />
            </div>
            <div className="space-y-1">
              <label htmlFor="prj-diff" className="text-xs font-bold">Độ khó</label>
              <select
                id="prj-diff"
                value={form.difficulty}
                onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value as typeof f.difficulty }))}
                className="focus-ink w-full rounded-[9px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 text-sm font-semibold"
              >
                {Object.entries(DIFFICULTY_META).map(([key, meta]) => (
                  <option key={key} value={key}>{meta.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label htmlFor="prj-cap" className="text-xs font-bold">Sức chứa</label>
              <SketchInput id="prj-cap" type="number" min={1} value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} placeholder="VD: 5" />
            </div>
            <div className="space-y-1">
              <label htmlFor="prj-start" className="text-xs font-bold">Bắt đầu</label>
              <SketchInput id="prj-start" type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label htmlFor="prj-end" className="text-xs font-bold">Kết thúc</label>
              <SketchInput id="prj-end" type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="prj-tech" className="text-xs font-bold">Công nghệ (cách nhau bởi dấu phẩy)</label>
            <SketchInput id="prj-tech" value={form.technologies} onChange={(e) => setForm((f) => ({ ...f, technologies: e.target.value }))} placeholder="JavaScript, Node.js 22, node:test" />
          </div>
          {formError && (
            <p role="alert" className="text-[0.8rem] font-semibold text-[var(--danger)]">{formError}</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <InkButton variant="ghost" size="sm" disabled={busy} onClick={() => onClose(false)}>Hủy</InkButton>
            <InkButton variant="royal" size="sm" disabled={busy} onClick={submit}>
              <VPlus size={15} /> {busy ? "Đang tạo…" : "Tạo dự án"}
            </InkButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------- chi tiết dự án (dialog lớn) ---------------------- */

function ProjectDetailDialog({
  id,
  onClose,
  onChanged,
}: {
  id: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { data: project, loading, error, reload } = useApi(() => getProject(id), [id]);
  const members = useApi(() => listProjectMembers(id), [id]);
  const sessions = useApi(() => listProjectSessions(id), [id]);
  const slots = useApi(() => getProjectSlots(id), [id]);
  const context = useApi(() => getProjectTemplateContext(id), [id]);
  const changes = useApi(() => listProjectChanges(id), [id]);

  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmClaim, setConfirmClaim] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [applyTarget, setApplyTarget] = useState<string | null>(null);
  const [slotsDraft, setSlotsDraft] = useState<SlotInput[] | null>(null);

  async function runClaim() {
    setBusy("claim");
    try {
      await claimProject(id);
      toast.success("Đã nhận làm mentor dự án này.");
      setConfirmClaim(false);
      reload();
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function runApplyChange(changeId: string) {
    setBusy(`apply-${changeId}`);
    try {
      await applyProjectChange(changeId);
      toast.success("Đã áp dụng thay đổi từ mẫu vào dự án.");
      setApplyTarget(null);
      changes.reload();
      reload();
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function runSaveSlots() {
    if (!slotsDraft) return;
    setBusy("slots");
    try {
      await setProjectSlots(id, slotsDraft.filter((s) => s.roleCode.trim() && s.requiredCount >= 1));
      toast.success("Đã lưu sơ đồ slot vai trò.");
      setSlotsDraft(null);
      slots.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
        {error ? (
          <>
            <DialogHeader>
              <DialogTitle>Không tải được dự án</DialogTitle>
            </DialogHeader>
            <SectionError message={error} onRetry={reload} />
          </>
        ) : loading || !project ? (
          <>
            <DialogHeader>
              <DialogTitle>Đang tải dự án…</DialogTitle>
            </DialogHeader>
            <PencilLines rows={4} />
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-geist-mono text-[0.72rem] font-bold text-[var(--royal)]">{project.code}</span>
                <MetaBadge map={PROJECT_STATUS_META} value={project.status} />
                <MetaBadge map={DIFFICULTY_META} value={project.difficulty} />
              </div>
              <DialogTitle className="mt-1.5">{project.name}</DialogTitle>
              <DialogDescription>
                {project.startDate ? formatDateVN(project.startDate) : "?"} → {project.endDate ? formatDateVN(project.endDate) : "?"}
                {project.capacity ? ` · sức chứa ${project.capacity}` : ""} · {project.mentorId ? "đã có mentor" : "chưa có mentor"}
              </DialogDescription>
            </DialogHeader>

            {project.description && (
              <p className="rounded-[10px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_18%,transparent)] bg-[var(--paper)] p-3 text-sm leading-relaxed">
                {project.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <TechChips items={project.technologies} max={8} />
              <span className="ml-auto flex flex-wrap gap-2">
                {!project.mentorId && (
                  <InkButton variant="royal" size="sm" disabled={busy !== null} onClick={() => setConfirmClaim(true)}>
                    <VUser size={14} /> {busy === "claim" ? "Đang nhận…" : "Nhận làm mentor"}
                  </InkButton>
                )}
                <InkButton variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <VEdit size={14} /> Sửa
                </InkButton>
              </span>
            </div>

            {/* Thành viên */}
            <section aria-label="Thành viên dự án" className="sketch-border-thin space-y-2 bg-[var(--paper)] p-3">
              <p className="eyebrow">Thành viên ({members.data?.length ?? 0})</p>
              {members.loading ? (
                <PencilLines rows={2} />
              ) : members.error ? (
                <p className="text-xs text-[var(--danger)]">{members.error}</p>
              ) : !members.data || members.data.length === 0 ? (
                <p className="text-xs text-[var(--ink-soft)]">
                  Chưa có thành viên — thành viên dự án đến từ phân công trong các phiên.
                </p>
              ) : (
                <ul className="max-h-40 space-y-1 overflow-y-auto">
                  {members.data.map((m) => (
                    <li key={m.userId} className="flex flex-wrap items-center gap-2 text-[0.78rem]">
                      <span className="font-bold">{m.displayName ?? m.userId}</span>
                      {m.email && <span className="text-[var(--ink-soft)]">{m.email}</span>}
                      {m.role && <InkBadge tone="blue">{m.role}</InkBadge>}
                      {m.assignmentStatus && <InkBadge tone={m.assignmentStatus === "completed" ? "green" : "neutral"}>{m.assignmentStatus}</InkBadge>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Các phiên của dự án */}
            <section aria-label="Các phiên chạy trên dự án" className="sketch-border-thin space-y-2 bg-[var(--paper)] p-3">
              <p className="eyebrow">Các phiên ({sessions.data?.length ?? 0})</p>
              {sessions.loading ? (
                <PencilLines rows={2} />
              ) : sessions.error ? (
                <p className="text-xs text-[var(--danger)]">{sessions.error}</p>
              ) : !sessions.data || sessions.data.length === 0 ? (
                <p className="text-xs text-[var(--ink-soft)]">Dự án chưa có phiên nào chạy.</p>
              ) : (
                <ul className="max-h-40 space-y-1 overflow-y-auto">
                  {sessions.data.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center gap-2 text-[0.78rem]">
                      <span className="font-geist-mono text-[0.68rem] font-bold text-[var(--royal)]">{s.code}</span>
                      <span className="font-bold">{s.name}</span>
                      <InkBadge tone={s.status === "active" ? "green" : s.status === "cancelled" ? "red" : "neutral"} dot>{s.status}</InkBadge>
                      <span className="text-[var(--ink-soft)]">
                        {s.startDate ? formatDateVN(s.startDate) : "?"} → {s.endDate ? formatDateVN(s.endDate) : "?"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Slot vai trò */}
            <section aria-label="Slot vai trò" className="sketch-border-thin space-y-2 bg-[var(--paper)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="eyebrow">Slot vai trò</p>
                {slotsDraft ? (
                  <span className="flex gap-2">
                    <InkButton variant="ghost" size="sm" onClick={() => setSlotsDraft(null)}>Bỏ</InkButton>
                    <InkButton variant="royal" size="sm" disabled={busy !== null} onClick={runSaveSlots}>
                      <VCheck size={14} /> {busy === "slots" ? "Đang lưu…" : "Lưu slot"}
                    </InkButton>
                  </span>
                ) : (
                  <InkButton
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSlotsDraft(
                        (slots.data ?? []).map((s) => ({ roleCode: s.roleCode, requiredCount: s.requiredCount })),
                      )
                    }
                  >
                    <VEdit size={13} /> Sửa slot
                  </InkButton>
                )}
              </div>
              {slots.loading ? (
                <PencilLines rows={2} />
              ) : slots.error ? (
                <p className="text-xs text-[var(--danger)]">{slots.error}</p>
              ) : slotsDraft ? (
                <div className="space-y-2">
                  {slotsDraft.map((slot, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <SketchInput
                        aria-label={`Vai trò ${i + 1}`}
                        value={slot.roleCode}
                        onChange={(e) =>
                          setSlotsDraft((prev) => (prev ?? []).map((s, j) => (j === i ? { ...s, roleCode: e.target.value } : s)))
                        }
                        placeholder="roleCode (VD: backend)"
                        className="flex-1"
                      />
                      <SketchInput
                        aria-label={`Số lượng cho vai trò ${i + 1}`}
                        type="number"
                        min={1}
                        value={String(slot.requiredCount)}
                        onChange={(e) =>
                          setSlotsDraft((prev) =>
                            (prev ?? []).map((s, j) => (j === i ? { ...s, requiredCount: Number(e.target.value) } : s)),
                          )
                        }
                        className="w-24"
                      />
                      <button
                        type="button"
                        aria-label={`Xóa vai trò ${slot.roleCode}`}
                        onClick={() => setSlotsDraft((prev) => (prev ?? []).filter((_, j) => j !== i))}
                        className="focus-ink grid h-9 w-9 place-items-center rounded-full border-2 border-[var(--danger)] text-[var(--danger)]"
                      >
                        <VTrash size={14} />
                      </button>
                    </div>
                  ))}
                  <InkButton
                    variant="outline"
                    size="sm"
                    onClick={() => setSlotsDraft((prev) => [...(prev ?? []), { roleCode: "", requiredCount: 1 }])}
                  >
                    <VPlus size={13} /> Thêm vai trò
                  </InkButton>
                </div>
              ) : !slots.data || slots.data.length === 0 ? (
                <p className="text-xs text-[var(--ink-soft)]">Chưa có slot vai trò nào.</p>
              ) : (
                <ul className="space-y-1.5">
                  {slots.data.map((s) => (
                    <li key={s.roleCode} className="flex flex-wrap items-center gap-2 text-[0.78rem]">
                      <InkBadge tone="blue">{s.roleCode}</InkBadge>
                      <span className="tabular font-bold">{s.filledCount}/{s.requiredCount}</span>
                      <span className="text-[var(--ink-soft)]">đã phân công / yêu cầu</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Bối cảnh template */}
            {context.data?.definition && (
              <section aria-label="Bối cảnh mẫu dự án" className="sketch-border-thin space-y-2.5 bg-[var(--paper)] p-3">
                <p className="eyebrow">
                  Mẫu gốc · phiên bản {context.data.templateVersion ?? "?"}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Module phải hoàn thành">
                    {context.data.definition.modules.length > 0 ? (
                      <ul className="list-inside list-disc space-y-0.5 text-[0.78rem]">
                        {context.data.definition.modules.map((m) => <li key={m}>{m}</li>)}
                      </ul>
                    ) : "—"}
                  </Field>
                  <Field label="Trong phạm vi">
                    {context.data.definition.scopeIn.length > 0 ? (
                      <ul className="list-inside list-disc space-y-0.5 text-[0.78rem]">
                        {context.data.definition.scopeIn.map((m) => <li key={m}>{m}</li>)}
                      </ul>
                    ) : "—"}
                  </Field>
                </div>
                {context.data.definition.roleDetails.length > 0 && (
                  <div className="space-y-1.5">
                    {context.data.definition.roleDetails.map((r) => (
                      <div key={r.code} className="rounded-[9px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_22%,transparent)] p-2">
                        <p className="text-[0.78rem] font-bold">{r.title}</p>
                        <p className="text-[0.7rem] text-[var(--ink-soft)]">
                          {r.requiredSkills.join(", ") || "—"} · mức {r.level ?? "?"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Thay đổi từ template */}
            <section aria-label="Thay đổi từ template" className="sketch-border-thin space-y-2 bg-[var(--paper)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="eyebrow">Thay đổi từ template ({changes.data?.length ?? 0})</p>
                <InkButton variant="outline" size="sm" onClick={() => setProposing(true)}>
                  <VPlus size={13} /> Đề xuất thay đổi
                </InkButton>
              </div>
              {changes.loading ? (
                <PencilLines rows={2} />
              ) : changes.error ? (
                <p className="text-xs text-[var(--danger)]">{changes.error}</p>
              ) : !changes.data || changes.data.length === 0 ? (
                <p className="text-xs text-[var(--ink-soft)]">
                  Chưa có yêu cầu thay đổi nào — dự án vẫn khớp với mẫu gốc.
                </p>
              ) : (
                <ul className="max-h-48 space-y-2 overflow-y-auto">
                  {changes.data.map((c) => (
                    <li key={c.id} className="rounded-[9px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_22%,transparent)] p-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[0.8rem] font-bold">{c.title ?? "Thay đổi"}</p>
                        {c.status && <InkBadge tone={c.status === "applied" ? "green" : "amber"} dot>{c.status}</InkBadge>}
                        <span className="ml-auto">
                          <InkButton
                            variant="royal"
                            size="sm"
                            disabled={busy !== null}
                            onClick={() => setApplyTarget(c.id)}
                          >
                            Áp dụng
                          </InkButton>
                        </span>
                      </div>
                      {c.description && <p className="mt-1 text-[0.74rem] text-[var(--ink-soft)]">{c.description}</p>}
                    </li>
                  ))}
                </ul>
              )}
              <MarginNote>
                Áp dụng thay đổi sẽ cập nhật dự án theo bản mới nhất của mẫu — nên xem kỹ trước khi bấm.
              </MarginNote>
            </section>
          </>
        )}

        {/* Sửa dự án */}
        {project && (
          <EditProjectDialog open={editing} onClose={setEditing} project={project} onSaved={() => { reload(); onChanged(); }} />
        )}

        {/* Xác nhận nhận mentor */}
        <Dialog open={confirmClaim} onOpenChange={setConfirmClaim}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Nhận làm mentor dự án này?</DialogTitle>
              <DialogDescription>
                Dự án sẽ thuộc phạm vi quản lý của bạn. Người khác không nhận được nữa sau khi bạn nhận.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <InkButton variant="ghost" size="sm" onClick={() => setConfirmClaim(false)}>Hủy</InkButton>
              <InkButton variant="royal" size="sm" disabled={busy !== null} onClick={runClaim}>
                <VCheck size={14} /> Xác nhận nhận
              </InkButton>
            </div>
          </DialogContent>
        </Dialog>

        {/* Đề xuất thay đổi */}
        <ProposeChangeDialog open={proposing} onClose={setProposing} projectId={id} onCreated={changes.reload} />

        {/* Xác nhận áp dụng thay đổi */}
        <Dialog open={!!applyTarget} onOpenChange={(open) => !open && setApplyTarget(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Áp dụng thay đổi từ mẫu?</DialogTitle>
              <DialogDescription>
                Nội dung dự án sẽ được cập nhật theo yêu cầu thay đổi. Hành động này được ghi nhận vào nhật ký hệ thống.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <InkButton variant="ghost" size="sm" onClick={() => setApplyTarget(null)}>Hủy</InkButton>
              <InkButton variant="royal" size="sm" disabled={busy !== null} onClick={() => applyTarget && runApplyChange(applyTarget)}>
                <VCheck size={14} /> Áp dụng ngay
              </InkButton>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------- sửa dự án (PATCH) -------------------------- */

function EditProjectDialog({
  open,
  onClose,
  project,
  onSaved,
}: {
  open: boolean;
  onClose: (open: boolean) => void;
  project: Project;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: project.name,
    description: project.description,
    difficulty: (project.difficulty ?? "beginner") as string,
    status: project.status as string,
    capacity: project.capacity === null ? "" : String(project.capacity),
    startDate: project.startDate ? project.startDate.slice(0, 10) : "",
    endDate: project.endDate ? project.endDate.slice(0, 10) : "",
    technologies: project.technologies.join(", "),
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setFormError(null);
    setBusy(true);
    try {
      await updateProject(project.id, {
        name: form.name.trim(),
        description: form.description.trim(),
        difficulty: form.difficulty as CreateProjectInput["difficulty"],
        status: form.status as CreateProjectInput["status"],
        capacity: form.capacity ? Number(form.capacity) : undefined,
        startDate: toIso(form.startDate),
        endDate: toIso(form.endDate),
        technologies: form.technologies.split(",").map((t) => t.trim()).filter(Boolean),
      });
      toast.success("Đã lưu thay đổi dự án.");
      onSaved();
      onClose(false);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sửa dự án {project.code}</DialogTitle>
          <DialogDescription>Danh sách công nghệ sẽ được thay toàn bộ bằng danh sách mới.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-bold" htmlFor="prj-edit-name">Tên</label>
            <SketchInput id="prj-edit-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold" htmlFor="prj-edit-desc">Mô tả</label>
            <SketchTextarea id="prj-edit-desc" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-bold" htmlFor="prj-edit-diff">Độ khó</label>
              <select id="prj-edit-diff" value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))} className="focus-ink w-full rounded-[9px] border-2 border-[var(--ink)] bg-[var(--paper)] px-2.5 py-2 text-sm font-semibold">
                {Object.entries(DIFFICULTY_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold" htmlFor="prj-edit-status">Trạng thái</label>
              <select id="prj-edit-status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="focus-ink w-full rounded-[9px] border-2 border-[var(--ink)] bg-[var(--paper)] px-2.5 py-2 text-sm font-semibold">
                {Object.entries(PROJECT_STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold" htmlFor="prj-edit-cap">Sức chứa</label>
              <SketchInput id="prj-edit-cap" type="number" min={1} value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold" htmlFor="prj-edit-start">Bắt đầu</label>
              <SketchInput id="prj-edit-start" type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold" htmlFor="prj-edit-end">Kết thúc</label>
              <SketchInput id="prj-edit-end" type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold" htmlFor="prj-edit-tech">Công nghệ (dấu phẩy)</label>
            <SketchInput id="prj-edit-tech" value={form.technologies} onChange={(e) => setForm((f) => ({ ...f, technologies: e.target.value }))} />
          </div>
          {formError && <p role="alert" className="text-[0.8rem] font-semibold text-[var(--danger)]">{formError}</p>}
          <div className="flex justify-end gap-2">
            <InkButton variant="ghost" size="sm" disabled={busy} onClick={() => onClose(false)}>Hủy</InkButton>
            <InkButton variant="royal" size="sm" disabled={busy} onClick={submit}>
              <VCheck size={14} /> {busy ? "Đang lưu…" : "Lưu thay đổi"}
            </InkButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------- đề xuất thay đổi (POST changes) ------------------ */

function ProposeChangeDialog({
  open,
  onClose,
  projectId,
  onCreated,
}: {
  open: boolean;
  onClose: (open: boolean) => void;
  projectId: string;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({ title: "", description: "", reason: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (form.title.trim().length < 2 || form.description.trim().length < 10 || form.reason.trim().length < 10) {
      setFormError("Tiêu đề tối thiểu 2 ký tự; mô tả và lý do tối thiểu 10 ký tự.");
      return;
    }
    setFormError(null);
    setBusy(true);
    try {
      await proposeProjectChange(projectId, {
        title: form.title.trim(),
        description: form.description.trim(),
        reason: form.reason.trim(),
      });
      toast.success("Đã gửi yêu cầu thay đổi.");
      onCreated();
      onClose(false);
      setForm({ title: "", description: "", reason: "" });
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Đề xuất thay đổi từ template</DialogTitle>
          <DialogDescription>Mô tả nội dung muốn thay đổi so với mẫu gốc của dự án.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-bold" htmlFor="chg-title">Tiêu đề *</label>
            <SketchInput id="chg-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="VD: Nâng cấp module tìm kiếm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold" htmlFor="chg-desc">Mô tả *</label>
            <SketchTextarea id="chg-desc" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold" htmlFor="chg-reason">Lý do *</label>
            <SketchTextarea id="chg-reason" rows={2} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
          </div>
          {formError && <p role="alert" className="text-[0.8rem] font-semibold text-[var(--danger)]">{formError}</p>}
          <div className="flex justify-end gap-2">
            <InkButton variant="ghost" size="sm" disabled={busy} onClick={() => onClose(false)}>Hủy</InkButton>
            <InkButton variant="royal" size="sm" disabled={busy} onClick={submit}>
              <VCheck size={14} /> {busy ? "Đang gửi…" : "Gửi đề xuất"}
            </InkButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* =====================================================================
 * TAB 2 — MẪU DỰ ÁN
 * ===================================================================== */

function TemplatesTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data, loading, error, reload } = useApi(() => listTemplates(page, 12), [page]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [specTaskId, setSpecTaskId] = useState<string | null>(null);
  const [specOpen, setSpecOpen] = useState(false);
  const [specSource, setSpecSource] = useState(false);

  const items = useMemo(() => {
    const list = data?.items ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (t) => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q),
    );
  }, [data, search]);

  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <VSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]" />
          <SketchInput
            aria-label="Tìm mẫu dự án"
            placeholder="Tìm mẫu theo mã, tên, lĩnh vực…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <InkButton variant="outline" size="sm" onClick={() => setCreating(true)}>
          <VPlus size={15} /> Tạo mẫu (JSON)
        </InkButton>
      </div>

      {error ? (
        <SectionError message={error} onRetry={reload} />
      ) : loading ? (
        <PencilLines rows={4} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={VLayers}
          title="Không tìm thấy mẫu dự án"
          note="Thư viện mẫu trống hoặc bộ lọc chưa khớp. Mẫu dự án là nguồn để khởi tạo dự án + phiên mới."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((t) => (
            <SketchCard key={t.id} as="article" className="relative flex h-full flex-col gap-2.5 p-4 sm:p-5">
              {t.status === "active" && <Tape variant="mint" rotate={-4} className="-top-3 left-6 !w-14 !h-5" />}
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-geist-mono text-[0.68rem] font-bold text-[var(--royal)]">{t.code}</span>
                <MetaBadge map={DIFFICULTY_META} value={t.difficulty} />
                <InkBadge tone="neutral">v{t.version}</InkBadge>
                <span className="ml-auto text-[0.66rem] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                  {t.category ?? "—"}
                </span>
              </div>
              <h3 className="text-[1.02rem] font-bold leading-snug">{t.name}</h3>
              <TechChips items={t.techStack} max={5} />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.72rem] text-[var(--ink-soft)] tabular">
                {t.roles.length > 0 && (
                  <span className="inline-flex items-center gap-1"><VUsers size={13} /> {t.roles.join(", ")}</span>
                )}
                {t.teamSize !== null && <span className="inline-flex items-center gap-1"><VUser size={13} /> {t.teamSize} người</span>}
                {t.sprintCount !== null && <span className="inline-flex items-center gap-1"><VTarget size={13} /> {t.sprintCount} sprint</span>}
              </div>
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                <InkButton variant="outline" size="sm" onClick={() => setDetailId(t.id)}>
                  Chi tiết
                </InkButton>
              </div>
            </SketchCard>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.74rem] text-[var(--ink-soft)]">
          Trang {page}/{Math.max(1, totalPages)} · {data ? `${data.total.toLocaleString("vi-VN")} mẫu` : "…"}
        </p>
        <div className="flex gap-2">
          <InkButton variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Trang trước
          </InkButton>
          <InkButton variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Trang sau
          </InkButton>
        </div>
      </div>

      {/* Tra cứu spec nhiệm vụ */}
      <SketchCard hover={false} className="space-y-2.5 p-4">
        <p className="eyebrow">Tra cứu đặc tả nhiệm vụ</p>
        <p className="text-[0.78rem] text-[var(--ink-soft)]">
          Dán mã định danh (UUID) của một nhiệm vụ thuộc mẫu để xem đặc tả học liệu và bản gốc.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <SketchInput
            aria-label="Mã nhiệm vụ (UUID)"
            placeholder="UUID nhiệm vụ, VD: 3df91060-…"
            value={specTaskId ?? ""}
            onChange={(e) => setSpecTaskId(e.target.value.trim() || null)}
            className="flex-1"
          />
          <div className="flex gap-2">
            <InkButton
              variant="outline"
              size="sm"
              disabled={!specTaskId}
              onClick={() => {
                setSpecSource(false);
                setSpecOpen(true);
              }}
            >
              <VFileCode size={14} /> Spec
            </InkButton>
            <InkButton
              variant="outline"
              size="sm"
              disabled={!specTaskId}
              onClick={() => {
                setSpecSource(true);
                setSpecOpen(true);
              }}
            >
              <VCode size={14} /> Spec nguồn
            </InkButton>
          </div>
        </div>
      </SketchCard>

      {detailId && <TemplateDetailDialog id={detailId} onClose={() => setDetailId(null)} />}
      <CreateTemplateDialog open={creating} onClose={setCreating} onCreated={reload} />
      {specOpen && specTaskId && (
        <TaskSpecDialog taskId={specTaskId} source={specSource} onClose={() => setSpecOpen(false)} />
      )}
    </div>
  );
}

/* ------------------------ chi tiết mẫu dự án ---------------------------- */

function TemplateDetailDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: template, loading, error, reload } = useApi(() => getTemplate(id), [id]);
  const assessment = useApi(() => getTemplateAssessment(id), [id]);
  const revisions = useApi(() => listTemplateRevisions(id, 1, 20), [id]);
  const [revisionVersion, setRevisionVersion] = useState<number | null>(null);
  const [confirmStart, setConfirmStart] = useState(false);
  const [busy, setBusy] = useState(false);

  async function runStart() {
    setBusy(true);
    try {
      await startTemplate(id);
      toast.success("Đã khởi tạo dự án mới từ mẫu — xem ở tab Dự án đang chạy.");
      setConfirmStart(false);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
        {error ? (
          <>
            <DialogHeader><DialogTitle>Không tải được mẫu</DialogTitle></DialogHeader>
            <SectionError message={error} onRetry={reload} />
          </>
        ) : loading || !template ? (
          <>
            <DialogHeader><DialogTitle>Đang tải mẫu…</DialogTitle></DialogHeader>
            <PencilLines rows={4} />
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-geist-mono text-[0.7rem] font-bold text-[var(--royal)]">{template.code}</span>
                <MetaBadge map={DIFFICULTY_META} value={template.difficulty} />
                <InkBadge tone="neutral">v{template.version}</InkBadge>
                {template.status && <InkBadge tone={template.status === "active" ? "green" : "neutral"} dot>{template.status}</InkBadge>}
              </div>
              <DialogTitle className="mt-1.5">{template.name}</DialogTitle>
              <DialogDescription>
                {template.category ?? "—"} · {template.teamSize ?? "?"} người · {template.sprintCount ?? "?"} sprint
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap items-center gap-2">
              <TechChips items={template.techStack} max={10} />
              <span className="ml-auto">
                <InkButton variant="royal" size="sm" disabled={busy} onClick={() => setConfirmStart(true)}>
                  <VRocket size={14} /> {busy ? "Đang khởi tạo…" : "Khởi tạo dự án từ mẫu"}
                </InkButton>
              </span>
            </div>

            {template.definition && (
              <section aria-label="Nội dung mẫu" className="sketch-border-thin space-y-3 bg-[var(--paper)] p-3">
                <p className="eyebrow">Nội dung learning package</p>
                {template.definition.description && (
                  <p className="text-sm leading-relaxed">{template.definition.description}</p>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Module">
                    <ul className="list-inside list-disc text-[0.78rem]">
                      {template.definition.modules.map((m) => <li key={m}>{m}</li>)}
                    </ul>
                  </Field>
                  <Field label="Mục tiêu học tập">
                    <ul className="list-inside list-disc text-[0.78rem]">
                      {template.definition.learningObjectives.map((m) => <li key={m}>{m}</li>)}
                    </ul>
                  </Field>
                  <Field label="Trong phạm vi">
                    <ul className="list-inside list-disc text-[0.78rem]">
                      {template.definition.scopeIn.map((m) => <li key={m}>{m}</li>)}
                    </ul>
                  </Field>
                  <Field label="Ngoài phạm vi">
                    <ul className="list-inside list-disc text-[0.78rem]">
                      {template.definition.scopeOut.map((m) => <li key={m}>{m}</li>)}
                    </ul>
                  </Field>
                </div>
                {template.definition.roleDetails.length > 0 && (
                  <div className="space-y-1.5">
                    {template.definition.roleDetails.map((r) => (
                      <div key={r.code} className="rounded-[9px] border-[1.5px] border-[color-mix(in_srgb,var(--ink)_22%,transparent)] p-2">
                        <p className="text-[0.8rem] font-bold">{r.title}</p>
                        <p className="text-[0.72rem] text-[var(--ink-soft)]">
                          Cần {r.countMin ?? "?"}–{r.countMax ?? "?"} · kỹ năng: {r.requiredSkills.join(", ") || "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Assessment */}
            <section aria-label="Bộ nghiệm thu" className="sketch-border-thin space-y-2 bg-[var(--paper)] p-3">
              <p className="eyebrow">Bộ nghiệm thu (staff-only) · phiên bản {assessment.data?.version ?? "?"}</p>
              {assessment.loading ? (
                <PencilLines rows={2} />
              ) : assessment.error ? (
                <p className="text-xs text-[var(--danger)]">{assessment.error}</p>
              ) : !assessment.data?.assessment ? (
                <p className="text-xs text-[var(--ink-soft)]">Mẫu này chưa có bộ nghiệm thu.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-3 text-[0.74rem]">
                  <div>
                    <p className="font-bold">File lời giải</p>
                    <p className="text-[var(--ink-soft)]">{assessment.data.solutionFiles.length} file</p>
                  </div>
                  <div>
                    <p className="font-bold">Test ẩn</p>
                    <p className="text-[var(--ink-soft)]">{assessment.data.hiddenTestFiles.length} file</p>
                  </div>
                  <div>
                    <p className="font-bold">Test công khai</p>
                    <p className="text-[var(--ink-soft)]">{assessment.data.visibleTestFiles.length} file</p>
                  </div>
                </div>
              )}
            </section>

            {/* Lịch sử phiên bản */}
            <section aria-label="Lịch sử phiên bản" className="sketch-border-thin space-y-2 bg-[var(--paper)] p-3">
              <p className="eyebrow">Lịch sử phiên bản ({revisions.data?.total ?? 0})</p>
              {revisions.loading ? (
                <PencilLines rows={2} />
              ) : revisions.error ? (
                <p className="text-xs text-[var(--danger)]">{revisions.error}</p>
              ) : !revisions.data || revisions.data.items.length === 0 ? (
                <p className="text-xs text-[var(--ink-soft)]">Chưa có phiên bản nào.</p>
              ) : (
                <ul className="max-h-44 space-y-1 overflow-y-auto">
                  {revisions.data.items.map((r) => (
                    <li key={r.version}>
                      <button
                        type="button"
                        onClick={() => setRevisionVersion(r.version === revisionVersion ? null : r.version)}
                        aria-expanded={revisionVersion === r.version}
                        className={cn(
                          "focus-ink flex w-full flex-wrap items-center gap-2 rounded-[9px] border-[1.5px] px-2.5 py-1.5 text-left text-[0.76rem] transition-colors",
                          revisionVersion === r.version
                            ? "border-[var(--ink)] bg-[var(--blue-mist)]"
                            : "border-[color-mix(in_srgb,var(--ink)_20%,transparent)] hover:bg-[var(--blue-mist)]",
                        )}
                      >
                        <VHistory size={13} />
                        <span className="font-bold">v{r.version}</span>
                        <span className="text-[var(--ink-soft)]">{r.createdAt ? formatDateVN(r.createdAt) : "—"}</span>
                        <span className="ml-auto truncate font-geist-mono text-[0.62rem] text-[var(--ink-faint)]">
                          {(r.sha256 ?? "").slice(0, 10)}…
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {revisionVersion !== null && (
                <TemplateRevisionPanel templateId={id} version={revisionVersion} />
              )}
            </section>
          </>
        )}

        <Dialog open={confirmStart} onOpenChange={setConfirmStart}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Khởi tạo dự án từ mẫu này?</DialogTitle>
              <DialogDescription>
                Hệ thống sẽ tạo một dự án mới với nội dung của mẫu. Bạn có thể nhận làm mentor và mở phiên sau đó.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <InkButton variant="ghost" size="sm" onClick={() => setConfirmStart(false)}>Hủy</InkButton>
              <InkButton variant="royal" size="sm" disabled={busy} onClick={runStart}>
                <VCheck size={14} /> Khởi tạo
              </InkButton>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

function TemplateRevisionPanel({ templateId, version }: { templateId: string; version: number }) {
  const revision = useApi(() => getTemplateRevision(templateId, version), [templateId, version]);
  const assessment = useApi(() => getTemplateRevisionAssessment(templateId, version), [templateId, version]);
  return (
    <div className="mt-2 space-y-2 rounded-[10px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_20%,transparent)] p-2.5">
      {revision.loading ? (
        <PencilLines rows={2} />
      ) : revision.error ? (
        <p className="text-xs text-[var(--danger)]">{revision.error}</p>
      ) : revision.data?.definition ? (
        <div className="space-y-1.5 text-[0.76rem]">
          <p className="font-bold">{revision.data.definition.name ?? `Phiên bản ${version}`}</p>
          <p className="text-[var(--ink-soft)]">{revision.data.definition.description ?? "—"}</p>
          <p>
            Module: {revision.data.definition.modules.join(", ") || "—"}
          </p>
          <p className="text-[var(--ink-soft)]">
            Bộ nghiệm thu phiên bản này: {assessment.data?.assessment ? `có (${assessment.data.solutionFiles.length} file lời giải)` : "không có"}
          </p>
        </div>
      ) : (
        <p className="text-xs text-[var(--ink-soft)]">Không đọc được nội dung phiên bản này.</p>
      )}
    </div>
  );
}

/* ------------------- tạo mẫu nâng cao (POST, JSON) ---------------------- */

function CreateTemplateDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [learningPackage, setLearningPackage] = useState(
    JSON.stringify(
      {
        code: "MINI-DEMO-V1",
        slug: "mini-demo",
        name: "Tên mẫu dự án",
        description: "Mô tả tối thiểu 10 ký tự",
        category: "mini-projects",
        difficulty: "beginner",
        techStack: ["JavaScript"],
        roles: ["backend"],
        recommendedTeamSize: 1,
        estimatedDurationDays: 4,
        modules: [],
        roleDetails: [],
        objectives: { business: "", learning: [], product: [] },
        scopeIn: [],
        scopeOut: [],
        functionalRequirements: [],
        businessRules: [],
      },
      null,
      2,
    ),
  );
  const [assessmentJson, setAssessmentJson] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    let pkg: Record<string, unknown>;
    try {
      pkg = JSON.parse(learningPackage) as Record<string, unknown>;
    } catch {
      setFormError("Learning package chưa phải JSON hợp lệ.");
      return;
    }
    let assessment: Record<string, unknown> | undefined;
    if (assessmentJson.trim()) {
      try {
        assessment = JSON.parse(assessmentJson) as Record<string, unknown>;
      } catch {
        setFormError("Assessment chưa phải JSON hợp lệ.");
        return;
      }
    }
    setFormError(null);
    setBusy(true);
    try {
      await createTemplate({ learningPackage: pkg, assessment: assessment ?? null });
      toast.success("Đã tạo mẫu dự án mới.");
      onCreated();
      onClose(false);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Tạo mẫu dự án (nâng cao)</DialogTitle>
          <DialogDescription>
            Mẫu cần một learning package đúng schema miền (prerequisites/setup/run/starterFiles…). Dành cho quản trị — dán JSON đã soạn sẵn.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-bold" htmlFor="tpl-pkg">Learning package (JSON) *</label>
            <SketchTextarea id="tpl-pkg" rows={10} value={learningPackage} onChange={(e) => setLearningPackage(e.target.value)} className="font-geist-mono text-[0.72rem]" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold" htmlFor="tpl-assess">Assessment (JSON, tùy chọn)</label>
            <SketchTextarea id="tpl-assess" rows={4} value={assessmentJson} onChange={(e) => setAssessmentJson(e.target.value)} placeholder='{"schemaVersion":1, "solutionFiles": []}' className="font-geist-mono text-[0.72rem]" />
          </div>
          {formError && <p role="alert" className="text-[0.8rem] font-semibold text-[var(--danger)]">{formError}</p>}
          <div className="flex justify-end gap-2">
            <InkButton variant="ghost" size="sm" disabled={busy} onClick={() => onClose(false)}>Hủy</InkButton>
            <InkButton variant="royal" size="sm" disabled={busy} onClick={submit}>
              <VPlus size={14} /> {busy ? "Đang tạo…" : "Tạo mẫu"}
            </InkButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------- xem spec nhiệm vụ ------------------------------- */

function TaskSpecDialog({
  taskId,
  source,
  onClose,
}: {
  taskId: string;
  source: boolean;
  onClose: () => void;
}) {
  const { data, loading, error, reload } = useApi(
    () => (source ? getTaskSpecSource(taskId) : getTaskSpec(taskId)),
    [taskId, source],
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{source ? "Spec gốc của nhiệm vụ" : "Đặc tả nhiệm vụ"}</DialogTitle>
          <DialogDescription className="font-geist-mono text-[0.68rem]">{taskId}</DialogDescription>
        </DialogHeader>
        {error ? (
          <SectionError message={error} onRetry={reload} />
        ) : loading || !data ? (
          <PencilLines rows={4} />
        ) : (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <Field label="Vai trò">{data.role ?? "—"}</Field>
              <Field label="Phiên bản rubric">{data.rubricVersion ?? "—"}</Field>
              <Field label="Số tiêu chí DoD">{data.dod.length}</Field>
            </div>
            {data.requirements && (
              <div className="sketch-border-thin bg-[var(--paper)] p-3">
                <p className="eyebrow">Yêu cầu</p>
                <p className="mt-1 text-sm leading-relaxed">{data.requirements}</p>
              </div>
            )}
            {data.dod.length > 0 && (
              <div className="sketch-border-thin bg-[var(--paper)] p-3">
                <p className="eyebrow">Definition of Done</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm">
                  {data.dod.map((d) => <li key={d}>{d}</li>)}
                </ul>
              </div>
            )}
            {data.documentation && (
              <div className="sketch-border-thin bg-[var(--paper)] p-3">
                <p className="eyebrow">Tài liệu học liệu</p>
                <pre className="mt-1 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-[8px] bg-[var(--paper-raised)] p-2.5 font-geist-mono text-[0.7rem] leading-relaxed">
                  {data.documentation}
                </pre>
              </div>
            )}
            {!data.requirements && !data.documentation && data.dod.length === 0 && (
              <EmptyState icon={VInbox} title="Nhiệm vụ này chưa có đặc tả" note="Có thể nhiệm vụ không sinh từ mẫu dự án." />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
