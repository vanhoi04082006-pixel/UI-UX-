"use client";

/* =====================================================================
 * ADMIN — DANH MỤC & VAI TRÒ NGHỀ NGHIỆP (route: admin/catalogs)
 * Endpoints cover (nhóm catalogs 5 ops + career-roles 6 ops admin):
 *  · GET   /catalogs/types            — bảng loại danh mục
 *  · POST  /catalogs/types            — dialog tạo loại
 *  · GET   /catalogs/items?typeCode=  — bảng giá trị + lọc theo loại
 *  · POST  /catalogs/items            — dialog tạo giá trị
 *  · PATCH /catalogs/items/{id}       — dialog sửa giá trị
 *  · GET   /admin/career-roles        — bảng vai trò nghề nghiệp
 *  · POST  /admin/career-roles        — dialog tạo vai trò
 *  · GET   /admin/career-roles/{code} — panel chi tiết bên phải
 *  · PUT   /admin/career-roles/{code} — dialog sửa (đủ field theo validation)
 *  · POST  /admin/career-roles/{code}/archive — lưu trữ (confirm)
 *  · GET   /admin/career-roles/{code}/revisions — lịch sử phiên bản
 * (GET /career-roles và /career-roles/reference là endpoint public —
 *  adapter có sẵn, màn hình không dùng.)
 * ===================================================================== */

import { useState } from "react";
import { toast } from "sonner";
import {
  VArchive,
  VCheck,
  VClock,
  VEdit,
  VInbox,
  VPlus,
  VStampTool,
  VTarget,
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
  archiveCareerRole,
  createCareerRole,
  createCatalogItem,
  createCatalogType,
  getCareerRole,
  listCareerRoleRevisions,
  listCareerRoles,
  listCatalogItems,
  listCatalogTypes,
  updateCareerRole,
  updateCatalogItem,
  type CareerRole,
  type CatalogItem,
} from "@/lib/api/catalogs";
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

const ROLE_STATUS_META: Record<string, { label: string; tone: string }> = {
  draft: { label: "Bản nháp", tone: "amber" },
  published: { label: "Đã công bố", tone: "green" },
  archived: { label: "Đã lưu trữ", tone: "neutral" },
};

const LEVEL_META: Record<string, { label: string; tone: string }> = {
  intern: { label: "Thực tập sinh", tone: "blue" },
  junior: { label: "Junior", tone: "mint" },
};

const LANG_LABEL: Record<string, string> = { vi: "Tiếng Việt", en: "English" };

const ITEM_STATUS_META: Record<string, { label: string; tone: string }> = {
  active: { label: "Đang dùng", tone: "green" },
  inactive: { label: "Ngưng dùng", tone: "neutral" },
};

const TYPE_CODE_PATTERN = /^[a-z0-9][a-z0-9._-]{2,63}$/;
const ITEM_CODE_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const ROLE_CODE_PATTERN = /^[a-z][a-z0-9_]{1,31}$/;

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

export default function AdminCatalogs() {
  const [tab, setTab] = useState<"catalogs" | "roles">("catalogs");

  /* ============================ TAB 1: DANH MỤC =========================== */

  const [typesVersion, setTypesVersion] = useState(0);
  const typesQ = useApi(() => listCatalogTypes(1, 100), [typesVersion]);
  const types = typesQ.data?.items ?? [];

  const [itemTypeFilter, setItemTypeFilter] = useState<string>("all");
  const [itemsVersion, setItemsVersion] = useState(0);
  const itemsQ = useApi(
    () =>
      listCatalogItems({
        page: 1,
        pageSize: 100,
        typeCode: itemTypeFilter === "all" ? undefined : itemTypeFilter,
      }),
    [itemTypeFilter, itemsVersion],
  );
  const items = itemsQ.data?.items ?? [];

  /* Dialog tạo loại danh mục */
  const [typeFormOpen, setTypeFormOpen] = useState(false);
  const [typeForm, setTypeForm] = useState({ code: "", name: "", description: "" });
  const [typeBusy, setTypeBusy] = useState(false);

  /* Dialog tạo giá trị */
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [itemForm, setItemForm] = useState({
    typeCode: "",
    code: "",
    name: "",
    description: "",
  });
  const [itemBusy, setItemBusy] = useState(false);

  /* Dialog sửa giá trị */
  const [editItem, setEditItem] = useState<CatalogItem | null>(null);
  const [editItemForm, setEditItemForm] = useState({ code: "", name: "", description: "" });
  const [editItemBusy, setEditItemBusy] = useState(false);

  const submitType = async () => {
    if (!TYPE_CODE_PATTERN.test(typeForm.code.trim())) {
      return toast.error("Mã loại: 3-64 ký tự a-z 0-9 . _ - (bắt đầu không dấu chấm/gạch).");
    }
    if (!typeForm.name.trim()) return toast.error("Chưa nhập tên loại danh mục.");
    setTypeBusy(true);
    try {
      const created = await createCatalogType({
        code: typeForm.code.trim(),
        name: typeForm.name.trim(),
        ...(typeForm.description.trim() ? { description: typeForm.description.trim() } : {}),
      });
      toast.success(`Đã tạo loại danh mục "${created.name}".`);
      setTypeFormOpen(false);
      setTypeForm({ code: "", name: "", description: "" });
      setTypesVersion((v) => v + 1);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setTypeBusy(false);
    }
  };

  const submitItem = async () => {
    if (!itemForm.typeCode) return toast.error("Chọn loại danh mục cho giá trị.");
    if (!ITEM_CODE_PATTERN.test(itemForm.code.trim())) {
      return toast.error("Mã giá trị: 1-64 ký tự a-z 0-9 . _ -.");
    }
    if (!itemForm.name.trim()) return toast.error("Chưa nhập tên giá trị.");
    setItemBusy(true);
    try {
      const created = await createCatalogItem({
        typeCode: itemForm.typeCode,
        code: itemForm.code.trim(),
        name: itemForm.name.trim(),
        ...(itemForm.description.trim() ? { description: itemForm.description.trim() } : {}),
      });
      toast.success(`Đã thêm giá trị "${created.name}" vào ${itemForm.typeCode}.`);
      setItemFormOpen(false);
      setItemForm({ typeCode: itemTypeFilter !== "all" ? itemTypeFilter : "", code: "", name: "", description: "" });
      setItemsVersion((v) => v + 1);
      setTypesVersion((v) => v + 1);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setItemBusy(false);
    }
  };

  const submitEditItem = async () => {
    if (!editItem) return;
    if (!ITEM_CODE_PATTERN.test(editItemForm.code.trim())) {
      return toast.error("Mã giá trị: 1-64 ký tự a-z 0-9 . _ -.");
    }
    if (!editItemForm.name.trim()) return toast.error("Chưa nhập tên giá trị.");
    setEditItemBusy(true);
    try {
      await updateCatalogItem(editItem.id, {
        code: editItemForm.code.trim(),
        name: editItemForm.name.trim(),
        ...(editItemForm.description.trim()
          ? { description: editItemForm.description.trim() }
          : {}),
      });
      toast.success(`Đã cập nhật giá trị "${editItemForm.name}".`);
      setEditItem(null);
      setItemsVersion((v) => v + 1);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setEditItemBusy(false);
    }
  };

  /* ======================= TAB 2: VAI TRÒ NGHỀ NGHIỆP ===================== */

  const [rolesVersion, setRolesVersion] = useState(0);
  const rolesQ = useApi(() => listCareerRoles(1, 50), [rolesVersion]);
  const roles = rolesQ.data?.items ?? [];

  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [detailVersion, setDetailVersion] = useState(0);
  const detailQ = useApi(
    () => (selectedCode ? getCareerRole(selectedCode) : Promise.resolve(null)),
    [selectedCode, detailVersion],
  );
  const detail = detailQ.data ?? null;

  /* Dialog tạo vai trò */
  const [roleFormOpen, setRoleFormOpen] = useState(false);
  const [roleForm, setRoleForm] = useState({
    code: "",
    name: "",
    description: "",
    level: "intern",
    language: "vi",
    requiredSkills: "",
    optionalSkills: "",
  });
  const [roleBusy, setRoleBusy] = useState(false);

  /* Dialog sửa vai trò (PUT đòi đủ field) */
  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [editRole, setEditRole] = useState({
    name: "",
    description: "",
    level: "intern",
    language: "vi",
    status: "draft",
    acceptingApplications: false,
    requiredSkills: "",
    optionalSkills: "",
  });
  const [editRoleBusy, setEditRoleBusy] = useState(false);

  /* Dialog lịch sử + lưu trữ */
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [archiveRoleOpen, setArchiveRoleOpen] = useState(false);
  const [roleActionBusy, setRoleActionBusy] = useState<string | null>(null);
  const revisionsQ = useApi(
    () =>
      selectedCode && (revisionsOpen || archiveRoleOpen)
        ? listCareerRoleRevisions(selectedCode, 1, 50)
        : Promise.resolve(null),
    [selectedCode, revisionsOpen, archiveRoleOpen],
  );
  const revisions = revisionsQ.data?.items ?? [];

  const submitRole = async () => {
    if (!ROLE_CODE_PATTERN.test(roleForm.code.trim())) {
      return toast.error("Mã vai trò: bắt đầu bằng chữ thường a-z, theo sau là a-z 0-9 _, dài 2-32 ký tự.");
    }
    if (roleForm.name.trim().length < 2) return toast.error("Tên vai trò tối thiểu 2 ký tự.");
    setRoleBusy(true);
    try {
      const created = await createCareerRole({
        code: roleForm.code.trim(),
        name: roleForm.name.trim(),
        ...(roleForm.description.trim() ? { description: roleForm.description.trim() } : {}),
        level: roleForm.level,
        language: roleForm.language,
        requiredSkills: csvToArray(roleForm.requiredSkills),
        optionalSkills: csvToArray(roleForm.optionalSkills),
      });
      toast.success(`Đã tạo vai trò "${created.name}" (bản nháp).`);
      setRoleFormOpen(false);
      setRoleForm({
        code: "",
        name: "",
        description: "",
        level: "intern",
        language: "vi",
        requiredSkills: "",
        optionalSkills: "",
      });
      setRolesVersion((v) => v + 1);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setRoleBusy(false);
    }
  };

  const openEditRole = (role: CareerRole) => {
    setEditRole({
      name: role.name,
      description: role.description,
      level: role.level,
      language: role.language,
      status: role.status,
      acceptingApplications: role.acceptingApplications,
      requiredSkills: role.requiredSkills.join(", "),
      optionalSkills: role.optionalSkills.join(", "),
    });
    setEditRoleOpen(true);
  };

  const submitEditRole = async () => {
    if (!selectedCode || !detail) return;
    if (editRole.name.trim().length < 2) return toast.error("Tên vai trò tối thiểu 2 ký tự.");
    setEditRoleBusy(true);
    try {
      await updateCareerRole(selectedCode, {
        version: detail.version,
        status: editRole.status,
        acceptingApplications: editRole.acceptingApplications,
        name: editRole.name.trim(),
        description: editRole.description.trim(),
        level: editRole.level,
        language: editRole.language,
        requiredSkills: csvToArray(editRole.requiredSkills),
        optionalSkills: csvToArray(editRole.optionalSkills),
        competencyWeights: detail.competencyWeights ?? {},
      });
      toast.success(`Đã lưu phiên bản mới cho vai trò "${selectedCode}".`);
      setEditRoleOpen(false);
      setRolesVersion((v) => v + 1);
      setDetailVersion((v) => v + 1);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setEditRoleBusy(false);
    }
  };

  const doArchiveRole = async () => {
    if (!selectedCode || !detail) return;
    setRoleActionBusy("archive");
    try {
      await archiveCareerRole(selectedCode, detail.version);
      toast.success(`Đã lưu trữ vai trò "${selectedCode}".`);
      setArchiveRoleOpen(false);
      setRolesVersion((v) => v + 1);
      setDetailVersion((v) => v + 1);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setRoleActionBusy(null);
    }
  };

  /* ------------------------------ render --------------------------------- */

  return (
    <div>
      <StaffPageHeader
        eyebrow="Quản trị · danh mục"
        title="Danh mục & Vai trò nghề nghiệp"
        sub="Bộ giá trị dùng chung của hệ thống và danh mục vai trò cho tuyển dụng."
        icon={VStampTool}
        note="danh mục giống ngăn kéo — thứ gì cũng phải có chỗ để đúng"
        actions={
          tab === "catalogs" ? (
            <>
              <InkButton
                variant="outline"
                size="sm"
                onClick={() => {
                  setItemForm({
                    typeCode: itemTypeFilter !== "all" ? itemTypeFilter : types[0]?.code ?? "",
                    code: "",
                    name: "",
                    description: "",
                  });
                  setItemFormOpen(true);
                }}
              >
                <VPlus size={14} /> Thêm giá trị
              </InkButton>
              <InkButton
                variant="royal"
                size="sm"
                onClick={() => {
                  setTypeForm({ code: "", name: "", description: "" });
                  setTypeFormOpen(true);
                }}
              >
                <VPlus size={15} /> Tạo loại danh mục
              </InkButton>
            </>
          ) : (
            <InkButton
              variant="royal"
              size="sm"
              onClick={() => {
                setRoleForm({
                  code: "",
                  name: "",
                  description: "",
                  level: "intern",
                  language: "vi",
                  requiredSkills: "",
                  optionalSkills: "",
                });
                setRoleFormOpen(true);
              }}
            >
              <VPlus size={15} /> Tạo vai trò
            </InkButton>
          )
        }
      />

      {/* Tab switch */}
      <SketchCard hover={false} className="mb-4 p-4">
        <ChipGroup
          ariaLabel="Chọn phân mục danh mục"
          options={[
            { value: "catalogs", label: "Danh mục" },
            { value: "roles", label: "Vai trò nghề nghiệp" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </SketchCard>

      {/* ============================ TAB 1: DANH MỤC ======================== */}
      {tab === "catalogs" && (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {/* Loại danh mục */}
          <SketchCard hover={false} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[var(--ink)] px-4 py-3">
              <p className="text-sm font-extrabold text-[var(--ink)]">Loại danh mục</p>
              <InkBadge tone="neutral" className="tabular !text-[0.65rem]">
                {types.length} loại
              </InkBadge>
            </div>
            {typesQ.loading && !typesQ.data ? (
              <div className="p-5">
                <PencilLines rows={3} />
              </div>
            ) : typesQ.error ? (
              <div className="p-5">
                <SectionError message={typesQ.error} onRetry={typesQ.reload} />
              </div>
            ) : types.length === 0 ? (
              <EmptyState
                icon={VInbox}
                title="Chưa có loại danh mục nào ✎"
                note="Tạo loại trước rồi thêm giá trị vào."
              />
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="ink-table">
                  <thead>
                    <tr>
                      <th>Mã</th>
                      <th>Tên</th>
                      <th>Mô tả</th>
                    </tr>
                  </thead>
                  <tbody>
                    {types.map((t) => (
                      <tr key={t.id} className="sticker-pop">
                        <td className="font-mono text-[0.7rem] font-bold text-[var(--ink)]">
                          {t.code}
                        </td>
                        <td className="text-sm font-semibold text-[var(--ink)]">{t.name}</td>
                        <td className="max-w-[220px]">
                          <p
                            className="truncate text-xs text-[var(--ink-soft)]"
                            title={t.description ?? ""}
                          >
                            {t.description ?? "—"}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SketchCard>

          {/* Giá trị danh mục */}
          <SketchCard hover={false} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[var(--ink)] px-4 py-3">
              <p className="text-sm font-extrabold text-[var(--ink)]">Giá trị danh mục</p>
              <div className="flex items-center gap-2">
                <SketchSelect
                  aria-label="Lọc giá trị theo loại danh mục"
                  value={itemTypeFilter}
                  onChange={(e) => setItemTypeFilter(e.target.value)}
                  className="!w-auto max-w-52 !py-1.5 text-xs"
                >
                  <option value="all">Tất cả loại</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.code}>
                      {t.name}
                    </option>
                  ))}
                </SketchSelect>
                <InkBadge tone="neutral" className="tabular !text-[0.65rem]">
                  {itemsQ.data?.total ?? items.length} giá trị
                </InkBadge>
              </div>
            </div>
            {itemsQ.loading && !itemsQ.data ? (
              <div className="p-5">
                <PencilLines rows={3} />
              </div>
            ) : itemsQ.error ? (
              <div className="p-5">
                <SectionError message={itemsQ.error} onRetry={itemsQ.reload} />
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                icon={VInbox}
                title="Chưa có giá trị nào ✎"
                note="Thêm giá trị để dùng trong biểu mẫu lọc."
              />
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="ink-table">
                  <thead>
                    <tr>
                      <th>Loại</th>
                      <th>Mã</th>
                      <th>Tên</th>
                      <th>Trạng thái</th>
                      <th className="text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="sticker-pop">
                        <td className="font-mono text-[0.68rem] text-[var(--ink-soft)]">
                          {item.typeCode}
                        </td>
                        <td className="font-mono text-[0.7rem] font-bold text-[var(--ink)]">
                          {item.code}
                        </td>
                        <td className="text-sm font-semibold text-[var(--ink)]">{item.name}</td>
                        <td>
                          <MetaBadge map={ITEM_STATUS_META} value={item.status} />
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setEditItem(item);
                              setEditItemForm({
                                code: item.code,
                                name: item.name,
                                description: item.description ?? "",
                              });
                            }}
                            aria-label={`Sửa giá trị ${item.name}`}
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

      {/* ======================= TAB 2: VAI TRÒ NGHỀ NGHIỆP ================== */}
      {tab === "roles" && (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
          <SketchCard hover={false} className="overflow-hidden">
            {rolesQ.loading && !rolesQ.data ? (
              <div className="p-5">
                <PencilLines rows={5} />
              </div>
            ) : rolesQ.error ? (
              <div className="p-5">
                <SectionError message={rolesQ.error} onRetry={rolesQ.reload} />
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="ink-table min-w-[880px]">
                    <thead>
                      <tr>
                        <th>Mã</th>
                        <th>Tên vai trò</th>
                        <th>Cấp</th>
                        <th>Ngôn ngữ</th>
                        <th>Trạng thái</th>
                        <th>Nhận hồ sơ</th>
                        <th>Bản</th>
                        <th>Kỹ năng bắt buộc</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roles.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-0">
                            <EmptyState
                              icon={VInbox}
                              title="Chưa có vai trò nghề nghiệp nào ✎"
                              note="Tạo vai trò để ứng viên chọn khi đăng ký tuyển dụng."
                            />
                          </td>
                        </tr>
                      ) : (
                        roles.map((role) => (
                          <tr
                            key={role.code}
                            onClick={() => setSelectedCode(role.code)}
                            className={cn(
                              "sticker-pop cursor-pointer",
                              role.code === selectedCode && "bg-[var(--blue-mist)]",
                            )}
                            aria-selected={role.code === selectedCode}
                          >
                            <td>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCode(role.code);
                                }}
                                className="focus-ink rounded-[6px] border border-[color-mix(in_srgb,var(--ink)_30%,transparent)] bg-[var(--paper)] px-1.5 py-0.5 font-mono text-[0.7rem] font-bold text-[var(--ink)] transition-colors hover:bg-[var(--blue-mist)]"
                                aria-label={`Xem chi tiết vai trò ${role.code}`}
                              >
                                {role.code}
                              </button>
                            </td>
                            <td className="text-sm font-semibold text-[var(--ink)]">{role.name}</td>
                            <td>
                              <MetaBadge map={LEVEL_META} value={role.level} />
                            </td>
                            <td className="text-xs text-[var(--ink-soft)]">
                              {LANG_LABEL[role.language] ?? role.language}
                            </td>
                            <td>
                              <MetaBadge map={ROLE_STATUS_META} value={role.status} />
                            </td>
                            <td>
                              {role.acceptingApplications ? (
                                <InkBadge tone="green" dot className="!text-[0.62rem]">
                                  Đang nhận
                                </InkBadge>
                              ) : (
                                <span className="text-xs text-[var(--ink-soft)]">Đóng</span>
                              )}
                            </td>
                            <td className="tabular text-sm font-bold">v{role.version}</td>
                            <td className="max-w-[200px]">
                              {role.requiredSkills.length === 0 ? (
                                <span className="text-xs text-[var(--ink-soft)]">—</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {role.requiredSkills.slice(0, 3).map((s) => (
                                    <InkBadge key={s} tone="blue" className="!px-1.5 !text-[0.58rem]">
                                      {s}
                                    </InkBadge>
                                  ))}
                                  {role.requiredSkills.length > 3 && (
                                    <InkBadge tone="neutral" className="!px-1.5 !text-[0.58rem]">
                                      +{role.requiredSkills.length - 3}
                                    </InkBadge>
                                  )}
                                </div>
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
                  {roles.length === 0 ? (
                    <EmptyState
                      icon={VInbox}
                      title="Chưa có vai trò nghề nghiệp nào ✎"
                      note="Tạo vai trò để ứng viên chọn khi đăng ký tuyển dụng."
                    />
                  ) : (
                    roles.map((role) => (
                      <button
                        key={role.code}
                        type="button"
                        onClick={() => setSelectedCode(role.code)}
                        className={cn(
                          "sticker-pop block w-full p-4 text-left transition-colors",
                          role.code === selectedCode && "bg-[var(--blue-mist)]",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[var(--ink)]">{role.name}</p>
                            <p className="mt-0.5 font-mono text-[0.68rem] text-[var(--ink-soft)]">
                              {role.code} · v{role.version}
                            </p>
                          </div>
                          <MetaBadge map={ROLE_STATUS_META} value={role.status} />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <MetaBadge map={LEVEL_META} value={role.level} />
                          {role.acceptingApplications && (
                            <InkBadge tone="green" dot className="!text-[0.62rem]">
                              Đang nhận
                            </InkBadge>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_20%,transparent)] px-4 py-3">
                  <p className="tabular text-xs text-[var(--ink-soft)]">
                    {rolesQ.data?.total ?? roles.length} vai trò · bấm một dòng để xem chi tiết
                  </p>
                </div>
              </>
            )}
          </SketchCard>

          {/* Panel chi tiết vai trò */}
          <div className="space-y-4">
            {!selectedCode ? (
              <SketchCard hover={false} className="p-5">
                <EmptyState
                  icon={VTarget}
                  title="Chọn một vai trò"
                  note="Panel này hiện kỹ năng, trạng thái nhận hồ sơ và vòng đời phiên bản."
                />
              </SketchCard>
            ) : detailQ.loading && !detail ? (
              <SketchCard hover={false} className="p-5">
                <PencilLines rows={5} />
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
                    <p className="eyebrow !text-[0.6rem]">Chi tiết vai trò</p>
                    <h2 className="mt-1 text-lg font-extrabold leading-tight text-[var(--ink)]">
                      {detail.name}
                    </h2>
                    <p className="mt-0.5 font-mono text-[0.7rem] text-[var(--ink-soft)]">
                      {detail.code} · v{detail.version}
                    </p>
                  </div>
                  <MetaBadge map={ROLE_STATUS_META} value={detail.status} className="shrink-0" />
                </div>

                {detail.description && (
                  <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">
                    {detail.description}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <MetaBadge map={LEVEL_META} value={detail.level} />
                  <InkBadge tone="neutral" className="!text-[0.65rem]">
                    {LANG_LABEL[detail.language] ?? detail.language}
                  </InkBadge>
                  {detail.acceptingApplications ? (
                    <InkBadge tone="green" dot className="!text-[0.65rem]">
                      Đang nhận hồ sơ
                    </InkBadge>
                  ) : (
                    <InkBadge tone="neutral" className="!text-[0.65rem]">
                      Ngưng nhận hồ sơ
                    </InkBadge>
                  )}
                </div>

                {detail.requiredSkills.length > 0 && (
                  <div className="mt-3">
                    <p className="eyebrow !text-[0.6rem]">Kỹ năng bắt buộc</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {detail.requiredSkills.map((s) => (
                        <InkBadge key={s} tone="blue" className="!text-[0.62rem]">
                          {s}
                        </InkBadge>
                      ))}
                    </div>
                  </div>
                )}

                {detail.optionalSkills.length > 0 && (
                  <div className="mt-3">
                    <p className="eyebrow !text-[0.6rem]">Kỹ năng thêm</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {detail.optionalSkills.map((s) => (
                        <InkBadge key={s} tone="neutral" className="!text-[0.62rem]">
                          {s}
                        </InkBadge>
                      ))}
                    </div>
                  </div>
                )}

                {Object.keys(detail.competencyWeights).length > 0 && (
                  <div className="mt-3">
                    <p className="eyebrow !text-[0.6rem]">Trọng số năng lực</p>
                    <pre className="mt-1.5 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-[10px] border-2 border-[var(--ink)] bg-[var(--paper)] p-2.5 font-mono text-[0.68rem] text-[var(--ink)]">
                      {JSON.stringify(detail.competencyWeights, null, 2)}
                    </pre>
                  </div>
                )}

                <dl className="mt-3 divide-y-2 divide-dashed divide-[color-mix(in_srgb,var(--ink)_15%,transparent)] rounded-[12px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3.5">
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <dt className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                      Cập nhật
                    </dt>
                    <dd className="tabular text-sm font-semibold text-[var(--ink)]">
                      {detail.updatedAt ? formatDateTimeVN(detail.updatedAt) : "—"}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <InkButton variant="royal" size="sm" onClick={() => openEditRole(detail)}>
                    <VEdit size={14} /> Sửa
                  </InkButton>
                  <InkButton variant="outline" size="sm" onClick={() => setRevisionsOpen(true)}>
                    <VClock size={14} /> Lịch sử
                  </InkButton>
                  <InkButton variant="outline" size="sm" onClick={() => setArchiveRoleOpen(true)}>
                    <VArchive size={14} /> Lưu trữ
                  </InkButton>
                </div>
              </SketchCard>
            ) : null}
          </div>
        </div>
      )}

      {/* ================= DIALOG: tạo loại danh mục ========================= */}
      <Dialog open={typeFormOpen} onOpenChange={setTypeFormOpen}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[var(--ink)]">Tạo loại danh mục</DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Loại là "ngăn kéo"; giá trị nằm trong ngăn kéo đó.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <FieldLabel htmlFor="ctype-code">Mã loại</FieldLabel>
              <SketchInput
                id="ctype-code"
                value={typeForm.code}
                onChange={(e) => setTypeForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="vd: tech_stack_2026"
                className="font-mono"
              />
              <p className="mt-1 text-[0.68rem] text-[var(--ink-soft)]">
                3-64 ký tự: a-z, 0-9, dấu chấm, gạch dưới, gạch ngang.
              </p>
            </div>
            <div>
              <FieldLabel htmlFor="ctype-name">Tên loại</FieldLabel>
              <SketchInput
                id="ctype-name"
                value={typeForm.name}
                onChange={(e) => setTypeForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="vd: Công nghệ sử dụng"
              />
            </div>
            <div>
              <FieldLabel htmlFor="ctype-desc">Mô tả (tùy chọn)</FieldLabel>
              <SketchTextarea
                id="ctype-desc"
                rows={2}
                value={typeForm.description}
                onChange={(e) => setTypeForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setTypeFormOpen(false)}>
              Hủy
            </InkButton>
            <InkButton variant="royal" size="sm" disabled={typeBusy} onClick={submitType}>
              <VCheck size={14} /> {typeBusy ? "Đang tạo…" : "Tạo loại"}
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= DIALOG: thêm giá trị danh mục ===================== */}
      <Dialog open={itemFormOpen} onOpenChange={setItemFormOpen}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[var(--ink)]">
              Thêm giá trị danh mục
            </DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Giá trị thuộc một loại — mã riêng biệt trong từng loại.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <FieldLabel htmlFor="citem-type">Thuộc loại</FieldLabel>
              <SketchSelect
                id="citem-type"
                value={itemForm.typeCode}
                onChange={(e) => setItemForm((f) => ({ ...f, typeCode: e.target.value }))}
              >
                <option value="">— Chọn loại danh mục —</option>
                {types.map((t) => (
                  <option key={t.id} value={t.code}>
                    {t.name} ({t.code})
                  </option>
                ))}
              </SketchSelect>
            </div>
            <div>
              <FieldLabel htmlFor="citem-code">Mã giá trị</FieldLabel>
              <SketchInput
                id="citem-code"
                value={itemForm.code}
                onChange={(e) => setItemForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="vd: nodejs"
                className="font-mono"
              />
              <p className="mt-1 text-[0.68rem] text-[var(--ink-soft)]">
                1-64 ký tự: a-z, 0-9, dấu chấm, gạch dưới, gạch ngang.
              </p>
            </div>
            <div>
              <FieldLabel htmlFor="citem-name">Tên hiển thị</FieldLabel>
              <SketchInput
                id="citem-name"
                value={itemForm.name}
                onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="vd: Node.js"
              />
            </div>
            <div>
              <FieldLabel htmlFor="citem-desc">Mô tả (tùy chọn)</FieldLabel>
              <SketchTextarea
                id="citem-desc"
                rows={2}
                value={itemForm.description}
                onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setItemFormOpen(false)}>
              Hủy
            </InkButton>
            <InkButton variant="royal" size="sm" disabled={itemBusy} onClick={submitItem}>
              <VCheck size={14} /> {itemBusy ? "Đang thêm…" : "Thêm giá trị"}
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= DIALOG: sửa giá trị danh mục ====================== */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          {editItem && (
            <>
              <DialogHeader>
                <DialogTitle className="font-extrabold text-[var(--ink)]">
                  Sửa giá trị {editItem.name}
                </DialogTitle>
                <DialogDescription className="text-[var(--ink-soft)]">
                  Loại <span className="font-mono">{editItem.typeCode}</span> giữ nguyên.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <FieldLabel htmlFor="eitem-code">Mã giá trị</FieldLabel>
                  <SketchInput
                    id="eitem-code"
                    value={editItemForm.code}
                    onChange={(e) => setEditItemForm((f) => ({ ...f, code: e.target.value }))}
                    className="font-mono"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="eitem-name">Tên hiển thị</FieldLabel>
                  <SketchInput
                    id="eitem-name"
                    value={editItemForm.name}
                    onChange={(e) => setEditItemForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="eitem-desc">Mô tả (tùy chọn)</FieldLabel>
                  <SketchTextarea
                    id="eitem-desc"
                    rows={2}
                    value={editItemForm.description}
                    onChange={(e) =>
                      setEditItemForm((f) => ({ ...f, description: e.target.value }))
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <InkButton variant="ghost" size="sm" onClick={() => setEditItem(null)}>
                  Hủy
                </InkButton>
                <InkButton
                  variant="royal"
                  size="sm"
                  disabled={editItemBusy}
                  onClick={submitEditItem}
                >
                  <VCheck size={14} /> {editItemBusy ? "Đang lưu…" : "Lưu"}
                </InkButton>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ================= DIALOG: tạo vai trò nghề nghiệp =================== */}
      <Dialog open={roleFormOpen} onOpenChange={setRoleFormOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[var(--ink)]">
              Tạo vai trò nghề nghiệp
            </DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Vai trò mới ở trạng thái nháp, chưa nhận hồ sơ cho đến khi công bố.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <FieldLabel htmlFor="role-code">Mã vai trò</FieldLabel>
              <SketchInput
                id="role-code"
                value={roleForm.code}
                onChange={(e) => setRoleForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="vd: data_analyst"
                className="font-mono"
              />
              <p className="mt-1 text-[0.68rem] text-[var(--ink-soft)]">
                Bắt đầu bằng chữ thường, a-z 0-9 _, dài 2-32 ký tự.
              </p>
            </div>
            <div>
              <FieldLabel htmlFor="role-name">Tên vai trò</FieldLabel>
              <SketchInput
                id="role-name"
                value={roleForm.name}
                onChange={(e) => setRoleForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="vd: Data Analyst"
              />
            </div>
            <div>
              <FieldLabel htmlFor="role-desc">Mô tả (tùy chọn, tối đa 2000 ký tự)</FieldLabel>
              <SketchTextarea
                id="role-desc"
                rows={3}
                value={roleForm.description}
                onChange={(e) => setRoleForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <fieldset>
              <legend className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                Cấp bậc
              </legend>
              <ChipGroup
                ariaLabel="Chọn cấp bậc vai trò"
                options={[
                  { value: "intern", label: "Thực tập sinh" },
                  { value: "junior", label: "Junior" },
                ]}
                value={roleForm.level}
                onChange={(v) => setRoleForm((f) => ({ ...f, level: v }))}
              />
            </fieldset>
            <fieldset>
              <legend className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                Ngôn ngữ
              </legend>
              <ChipGroup
                ariaLabel="Chọn ngôn ngữ vai trò"
                options={[
                  { value: "vi", label: "Tiếng Việt" },
                  { value: "en", label: "English" },
                ]}
                value={roleForm.language}
                onChange={(v) => setRoleForm((f) => ({ ...f, language: v }))}
              />
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="role-req">Kỹ năng bắt buộc (phẩy)</FieldLabel>
                <SketchTextarea
                  id="role-req"
                  rows={2}
                  value={roleForm.requiredSkills}
                  onChange={(e) => setRoleForm((f) => ({ ...f, requiredSkills: e.target.value }))}
                  placeholder="SQL, Python"
                  className="font-mono text-[0.78rem]"
                />
              </div>
              <div>
                <FieldLabel htmlFor="role-opt">Kỹ năng thêm (phẩy)</FieldLabel>
                <SketchTextarea
                  id="role-opt"
                  rows={2}
                  value={roleForm.optionalSkills}
                  onChange={(e) => setRoleForm((f) => ({ ...f, optionalSkills: e.target.value }))}
                  placeholder="Docker, Airflow"
                  className="font-mono text-[0.78rem]"
                />
              </div>
            </div>
            <p className="text-[0.68rem] text-[var(--ink-soft)]">
              Tối đa 30 kỹ năng mỗi loại, mỗi kỹ năng 1-80 ký tự.
            </p>
          </div>
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setRoleFormOpen(false)}>
              Hủy
            </InkButton>
            <InkButton variant="royal" size="sm" disabled={roleBusy} onClick={submitRole}>
              <VCheck size={14} /> {roleBusy ? "Đang tạo…" : "Tạo vai trò"}
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= DIALOG: sửa vai trò (PUT đủ field) ================ */}
      <Dialog open={editRoleOpen} onOpenChange={setEditRoleOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[var(--ink)]">
              Sửa vai trò {selectedCode}
            </DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Lưu sẽ tạo phiên bản mới (v{detail ? detail.version + 1 : "?"}) — trọng số năng lực
              giữ nguyên.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <FieldLabel htmlFor="erole-name">Tên vai trò</FieldLabel>
              <SketchInput
                id="erole-name"
                value={editRole.name}
                onChange={(e) => setEditRole((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <FieldLabel htmlFor="erole-desc">Mô tả</FieldLabel>
              <SketchTextarea
                id="erole-desc"
                rows={3}
                value={editRole.description}
                onChange={(e) => setEditRole((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <fieldset>
                <legend className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                  Cấp bậc
                </legend>
                <ChipGroup
                  ariaLabel="Đổi cấp bậc vai trò"
                  options={[
                    { value: "intern", label: "Thực tập" },
                    { value: "junior", label: "Junior" },
                  ]}
                  value={editRole.level}
                  onChange={(v) => setEditRole((f) => ({ ...f, level: v }))}
                />
              </fieldset>
              <fieldset>
                <legend className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                  Ngôn ngữ
                </legend>
                <ChipGroup
                  ariaLabel="Đổi ngôn ngữ vai trò"
                  options={[
                    { value: "vi", label: "Tiếng Việt" },
                    { value: "en", label: "English" },
                  ]}
                  value={editRole.language}
                  onChange={(v) => setEditRole((f) => ({ ...f, language: v }))}
                />
              </fieldset>
            </div>
            <fieldset>
              <legend className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                Trạng thái
              </legend>
              <ChipGroup
                ariaLabel="Đổi trạng thái vai trò"
                options={[
                  { value: "draft", label: "Nháp" },
                  { value: "published", label: "Công bố" },
                  { value: "archived", label: "Lưu trữ" },
                ]}
                value={editRole.status}
                onChange={(v) => setEditRole((f) => ({ ...f, status: v }))}
              />
            </fieldset>
            <button
              type="button"
              onClick={() =>
                setEditRole((f) => ({ ...f, acceptingApplications: !f.acceptingApplications }))
              }
              aria-pressed={editRole.acceptingApplications}
              className={cn(
                "focus-ink flex w-full items-center justify-between gap-3 rounded-[10px] border-2 px-3.5 py-3 text-left transition-all",
                editRole.acceptingApplications
                  ? "border-[var(--success)] bg-[color-mix(in_srgb,var(--success)_10%,transparent)]"
                  : "border-[color-mix(in_srgb,var(--ink)_30%,transparent)] bg-[var(--paper)]",
              )}
            >
              <span>
                <span className="block text-sm font-bold text-[var(--ink)]">Đang nhận hồ sơ</span>
                <span className="block text-[0.7rem] text-[var(--ink-soft)]">
                  Bật để ứng viên chọn vai trò này khi đăng ký.
                </span>
              </span>
              <span
                className={cn(
                  "grid h-6 w-11 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] text-[0.62rem] font-extrabold",
                  editRole.acceptingApplications
                    ? "bg-[var(--success)] text-white"
                    : "bg-[var(--paper-raised)] text-[var(--ink-soft)]",
                )}
                aria-hidden="true"
              >
                {editRole.acceptingApplications ? "BẬT" : "TẮT"}
              </span>
            </button>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="erole-req">Kỹ năng bắt buộc (phẩy)</FieldLabel>
                <SketchTextarea
                  id="erole-req"
                  rows={2}
                  value={editRole.requiredSkills}
                  onChange={(e) => setEditRole((f) => ({ ...f, requiredSkills: e.target.value }))}
                  className="font-mono text-[0.78rem]"
                />
              </div>
              <div>
                <FieldLabel htmlFor="erole-opt">Kỹ năng thêm (phẩy)</FieldLabel>
                <SketchTextarea
                  id="erole-opt"
                  rows={2}
                  value={editRole.optionalSkills}
                  onChange={(e) => setEditRole((f) => ({ ...f, optionalSkills: e.target.value }))}
                  className="font-mono text-[0.78rem]"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setEditRoleOpen(false)}>
              Hủy
            </InkButton>
            <InkButton variant="royal" size="sm" disabled={editRoleBusy} onClick={submitEditRole}>
              <VCheck size={14} /> {editRoleBusy ? "Đang lưu…" : "Lưu phiên bản mới"}
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= DIALOG: lịch sử phiên bản vai trò ================= */}
      <Dialog open={revisionsOpen} onOpenChange={setRevisionsOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[var(--ink)]">
              Lịch sử phiên bản — {selectedCode}
            </DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Mỗi lần lưu tạo một bản chụp vai trò không đổi.
            </DialogDescription>
          </DialogHeader>
          {revisionsQ.loading && !revisionsQ.data ? (
            <PencilLines rows={3} />
          ) : revisionsQ.error ? (
            <SectionError message={revisionsQ.error} onRetry={revisionsQ.reload} />
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
                      {rev.snapshot?.status && (
                        <MetaBadge
                          map={ROLE_STATUS_META}
                          value={rev.snapshot.status}
                          className="ml-2 align-middle"
                        />
                      )}
                    </p>
                    <span className="text-[0.7rem] tabular text-[var(--ink-soft)]">
                      {rev.createdAt ? formatDateTimeVN(rev.createdAt) : "—"}
                    </span>
                  </div>
                  {rev.snapshot && (
                    <p className="mt-1 text-[0.75rem] text-[var(--ink-soft)]">
                      {rev.snapshot.name} · {rev.snapshot.requiredSkills.length} kỹ năng bắt buộc
                    </p>
                  )}
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

      {/* ================= DIALOG: lưu trữ vai trò ========================== */}
      <Dialog open={archiveRoleOpen} onOpenChange={setArchiveRoleOpen}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[var(--ink)]">
              Lưu trữ vai trò {selectedCode}?
            </DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Phiên bản {detail?.version} sẽ ngừng hiển thị với ứng viên. Vai trò đã lưu trữ vẫn xem
              lại được qua lịch sử phiên bản.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setArchiveRoleOpen(false)}>
              Hủy
            </InkButton>
            <InkButton
              variant="outline"
              size="sm"
              disabled={roleActionBusy === "archive"}
              onClick={doArchiveRole}
            >
              <VArchive size={14} /> {roleActionBusy === "archive" ? "Đang lưu trữ…" : "Lưu trữ"}
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
