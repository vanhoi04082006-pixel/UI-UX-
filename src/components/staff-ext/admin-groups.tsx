"use client";
/* =====================================================================
 * ADMIN GROUPS — Nhóm & Phân quyền (route admin "groups").
 *
 * Endpoint BE cover:
 *  GROUPS (8 ops):
 *   GET    /groups (q, page, pageSize)          — bảng nhóm ({data, meta})
 *   POST   /groups                              — dialog tạo nhóm
 *   PATCH  /groups/{id}                         — dialog sửa nhóm
 *   GET    /groups/{id}/members                 — panel thành viên
 *   POST   /groups/{id}/members                 — thêm thành viên (multi-select)
 *   DELETE /groups/{id}/members/{userId}        — gỡ thành viên
 *   GET    /groups/{id}/roles                   — vai trò hiện tại của nhóm
 *   PUT    /groups/{id}/roles                   — thay tập vai trò (checkbox)
 *  RBAC (3 ops):
 *   GET /roles                                  — bảng vai trò + badge "Hệ thống"
 *   GET /permissions                            — lưới quyền (phân trang 20/trang)
 *   GET /roles/{id}/permissions                 — dialog quyền của 1 vai trò
 * Trợ giúp: GET /users (picker thành viên).
 * ===================================================================== */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  VBadgeCheck,
  VCheck,
  VChevronLeft,
  VChevronRight,
  VEdit,
  VInbox,
  VLock,
  VPlus,
  VSearch,
  VShield,
  VTrash,
  VUserSearch,
  VUsers,
} from "@/components/icons/v-icons";
import { InkButton } from "@/components/notebook/reveal";
import {
  InkBadge,
  MarginNote,
  NoteCard,
  SketchCard,
  formatDateTimeVN,
  formatDateVN,
} from "@/components/notebook/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type GroupRow,
  type PermissionRow,
  type RoleRow,
  addGroupMembers,
  createGroup,
  listGroupMembers,
  listGroupRoles,
  listGroups,
  listPermissions,
  listRolePermissions,
  listRoles,
  listUserOptions,
  removeGroupMember,
  setGroupRoles,
  updateGroup,
} from "@/lib/api/groups";
import { errorMessage } from "@/lib/api/api-client";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  PencilLines,
  SectionError,
  SketchInput,
  SketchTextarea,
  StaffPageHeader,
  initialsOf,
} from "@/components/staff/staff-kit";

/* ------------------------------ tiện ích nhỏ ----------------------------- */

const GROUP_CODE_REGEX = /^[a-z0-9._-]{3,64}$/;
const PERM_PAGE_SIZE = 20;

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

/* ================================== SCREEN ================================ */

export default function AdminGroups() {
  const [busy, setBusy] = useState(false);

  /* ------------------------------ dữ liệu chính --------------------------- */
  const groupsApi = useApi(() => listGroups({ pageSize: 100 }), []);
  const groups = groupsApi.data?.items ?? [];
  const rolesApi = useApi(() => listRoles(), []);
  const roles = rolesApi.data?.items ?? [];
  const usersApi = useApi(() => listUserOptions(), []);
  const users = usersApi.data ?? [];

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => groups.find((g) => g.id === selectedId) ?? null,
    [groups, selectedId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.code.toLowerCase().includes(q) ||
        (g.description ?? "").toLowerCase().includes(q),
    );
  }, [groups, query]);

  /* Thành viên + vai trò của nhóm đang chọn */
  const [membersVersion, setMembersVersion] = useState(0);
  const [groupRolesVersion, setGroupRolesVersion] = useState(0);
  const membersApi = useApi(
    () => (selectedId ? listGroupMembers(selectedId) : Promise.resolve([])),
    [selectedId, membersVersion],
  );
  const groupRolesApi = useApi(
    () => (selectedId ? listGroupRoles(selectedId) : Promise.resolve([] as string[])),
    [selectedId, groupRolesVersion],
  );
  const members = membersApi.data ?? [];
  const memberIds = useMemo(() => new Set(members.map((m) => m.userId)), [members]);
  const groupRoleCodes = groupRolesApi.data ?? [];

  /* Dialog tạo / sửa nhóm */
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ code: "", name: "", description: "" });
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "" });

  /* Dialog thêm thành viên */
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [pickedUserIds, setPickedUserIds] = useState<string[]>([]);

  /* Trạng thái checkbox vai trò (bản nháp trước khi lưu) */
  const [draftRoleCodes, setDraftRoleCodes] = useState<string[] | null>(null);
  const activeRoleCodes = draftRoleCodes ?? groupRoleCodes;

  /* Dialog quyền của 1 vai trò */
  const [rolePerms, setRolePerms] = useState<{ role: RoleRow; items: PermissionRow[]; total: number } | null>(null);
  const [rolePermsLoading, setRolePermsLoading] = useState(false);

  /* Lưới quyền hệ thống — phân trang phía server */
  const [permPage, setPermPage] = useState(1);
  const permsApi = useApi(() => listPermissions(permPage, PERM_PAGE_SIZE), [permPage]);
  const permTotalPages = Math.max(1, permsApi.data?.totalPages ?? 1);

  /* ------------------------------- handlers ------------------------------- */

  const refreshMembers = () => {
    membersApi.reload();
    setMembersVersion((v) => v + 1);
  };

  const submitCreate = async () => {
    if (!GROUP_CODE_REGEX.test(createForm.code.trim()))
      return toast.error("Mã nhóm 3-64 ký tự: a-z, 0-9, dấu chấm, gạch dưới, gạch ngang.");
    if (!createForm.name.trim()) return toast.error("Chưa nhập tên nhóm.");
    if (createForm.name.trim().length > 128)
      return toast.error("Tên nhóm tối đa 128 ký tự.");
    setBusy(true);
    try {
      const created = await createGroup({
        code: createForm.code.trim(),
        name: createForm.name.trim(),
        ...(createForm.description.trim() ? { description: createForm.description.trim() } : {}),
      });
      toast.success(`Đã tạo nhóm "${created.name}".`);
      setCreateOpen(false);
      groupsApi.reload();
      setSelectedId(created.id);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submitEdit = async () => {
    if (!selected) return;
    if (!editForm.name.trim()) return toast.error("Chưa nhập tên nhóm.");
    setBusy(true);
    try {
      await updateGroup(selected.id, {
        name: editForm.name.trim(),
        ...(editForm.description.trim() ? { description: editForm.description.trim() } : {}),
      });
      toast.success("Đã cập nhật nhóm.");
      setEditOpen(false);
      groupsApi.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submitAddMembers = async () => {
    if (!selected || pickedUserIds.length === 0)
      return toast.error("Chọn ít nhất một người dùng để thêm.");
    setBusy(true);
    try {
      const res = await addGroupMembers(selected.id, pickedUserIds);
      toast.success(
        `Đã thêm ${res.added} thành viên${res.skipped > 0 ? `, bỏ qua ${res.skipped} (đã có)` : ""}.`,
      );
      setMemberDialogOpen(false);
      setPickedUserIds([]);
      setMemberSearch("");
      refreshMembers();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submitRemoveMember = async (userId: string) => {
    if (!selected) return;
    setBusy(true);
    try {
      await removeGroupMember(selected.id, userId);
      toast.success("Đã gỡ thành viên khỏi nhóm.");
      refreshMembers();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleDraftRole = (code: string) => {
    setDraftRoleCodes((prev) => {
      const base = prev ?? groupRoleCodes;
      return base.includes(code) ? base.filter((c) => c !== code) : [...base, code];
    });
  };

  const submitRoles = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await setGroupRoles(selected.id, activeRoleCodes);
      toast.success(
        activeRoleCodes.length > 0
          ? `Nhóm "${selected.name}" giờ mang ${res.length} vai trò.`
          : `Đã gỡ toàn bộ vai trò của nhóm "${selected.name}".`,
      );
      setDraftRoleCodes(null);
      setGroupRolesVersion((v) => v + 1);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const openRolePerms = async (role: RoleRow) => {
    setRolePermsLoading(true);
    setRolePerms(null);
    try {
      const res = await listRolePermissions(role.id);
      setRolePerms({ role, items: res.items, total: res.total });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setRolePermsLoading(false);
    }
  };

  /* ------------------------------ trạng thái chờ -------------------------- */
  if (groupsApi.loading && !groupsApi.data) {
    return (
      <div>
        <StaffPageHeader eyebrow="Quản trị · truy cập" title="Nhóm & Phân quyền" icon={VUsers} />
        <SketchCard hover={false} className="p-5">
          <PencilLines rows={8} />
        </SketchCard>
      </div>
    );
  }
  if (groupsApi.error || !groupsApi.data) {
    return (
      <SectionError
        message={groupsApi.error ?? "Chưa tải được danh sách nhóm."}
        onRetry={groupsApi.reload}
      />
    );
  }

  const userName = (userId: string) =>
    users.find((u) => u.id === userId)?.displayName ?? `${userId.slice(0, 8)}…`;

  return (
    <div>
      <StaffPageHeader
        eyebrow="Quản trị · truy cập"
        title="Nhóm & Phân quyền"
        sub="Gom người dùng thành nhóm, gán vai trò cho cả nhóm và soi ma trận quyền hệ thống."
        icon={VUsers}
        note="Gán vai trò theo nhóm khi nhiều người cùng cần một bộ quyền."
        actions={
          <>
            <InkBadge tone="neutral" className="tabular">
              {groupsApi.data.total} nhóm
            </InkBadge>
            <InkButton
              variant="royal"
              size="sm"
              onClick={() => {
                setCreateForm({ code: "", name: "", description: "" });
                setCreateOpen(true);
              }}
            >
              <VPlus size={15} /> Tạo nhóm
            </InkButton>
          </>
        }
      />

      {/* Thanh tìm kiếm nhóm */}
      <SketchCard hover={false} className="mb-4 p-4">
        <div className="relative w-full sm:max-w-xs">
          <VSearch
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm nhóm theo mã, tên, mô tả..."
            aria-label="Tìm nhóm"
            className="focus-ink w-full rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] py-2 pl-9 pr-3 text-sm text-[var(--ink)] outline-none transition-colors"
          />
        </div>
      </SketchCard>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* ----------------------------- BẢNG NHÓM ----------------------------- */}
        <SketchCard hover={false} className="overflow-hidden">
          <div className="hidden overflow-x-auto md:block">
            <table className="ink-table min-w-[680px]">
              <thead>
                <tr>
                  <th>Nhóm</th>
                  <th>Mô tả</th>
                  <th>Cập nhật</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-0">
                      <EmptyState
                        icon={VInbox}
                        title="Không tìm thấy nhóm nào ✎"
                        note="Đổi từ khóa tìm kiếm hoặc tạo nhóm mới."
                      />
                    </td>
                  </tr>
                ) : (
                  filtered.map((g) => (
                    <tr
                      key={g.id}
                      onClick={() => setSelectedId(g.id)}
                      className={cn(
                        "sticker-pop cursor-pointer",
                        g.id === selectedId && "bg-[var(--blue-mist)]",
                      )}
                      aria-selected={g.id === selectedId}
                    >
                      <td>
                        <p className="flex items-center gap-1.5 text-sm font-bold leading-tight text-[var(--ink)]">
                          <VUsers size={14} className="shrink-0 text-[var(--royal)]" aria-hidden="true" />
                          {g.name}
                        </p>
                        <p className="mt-0.5 font-mono text-[0.68rem] text-[var(--ink-soft)]">
                          {g.code}
                        </p>
                      </td>
                      <td className="max-w-[280px]">
                        <p className="truncate text-xs text-[var(--ink-soft)]" title={g.description ?? ""}>
                          {g.description ?? "—"}
                        </p>
                      </td>
                      <td className="whitespace-nowrap text-[0.78rem] tabular text-[var(--ink-soft)]">
                        {formatDateTimeVN(g.updatedAt)}
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(g.id);
                          }}
                          className="focus-ink sketch-border-thin bg-[var(--paper-raised)] px-2.5 py-1.5 text-xs font-bold text-[var(--ink)] transition-all hover:bg-[var(--blue-mist)]"
                          aria-label={`Xem chi tiết nhóm ${g.name}`}
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Bản card mobile */}
          <div className="divide-y-2 divide-dashed divide-[color-mix(in_srgb,var(--ink)_15%,transparent)] md:hidden">
            {filtered.length === 0 ? (
              <EmptyState
                icon={VInbox}
                title="Không tìm thấy nhóm nào ✎"
                note="Đổi từ khóa tìm kiếm hoặc tạo nhóm mới."
              />
            ) : (
              filtered.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedId(g.id)}
                  className={cn(
                    "sticker-pop block w-full p-4 text-left transition-colors",
                    g.id === selectedId && "bg-[var(--blue-mist)]",
                  )}
                >
                  <p className="text-sm font-bold text-[var(--ink)]">{g.name}</p>
                  <p className="mt-0.5 font-mono text-[0.68rem] text-[var(--ink-soft)]">{g.code}</p>
                  {g.description && (
                    <p className="mt-1.5 line-clamp-2 text-xs text-[var(--ink-soft)]">
                      {g.description}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>

          <div className="border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_20%,transparent)] px-4 py-3">
            <p className="tabular text-xs text-[var(--ink-soft)]">
              {filtered.length} nhóm hiển thị · bấm một dòng để quản thành viên & vai trò
            </p>
          </div>
        </SketchCard>

        {/* -------------------------- PANEL CHI TIẾT NHÓM -------------------------- */}
        <div className="space-y-4">
          {!selected ? (
            <SketchCard hover={false} className="p-5">
              <EmptyState
                icon={VUsers}
                title="Chọn một nhóm"
                note="Panel này quản thành viên và gán vai trò cho nhóm đang chọn."
              />
            </SketchCard>
          ) : (
            <>
              {/* Thông tin nhóm */}
              <SketchCard hover={false} className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="eyebrow !text-[0.6rem]">Chi tiết nhóm</p>
                    <h2 className="mt-1 text-lg font-extrabold leading-tight text-[var(--ink)]">
                      {selected.name}
                    </h2>
                    <p className="mt-0.5 font-mono text-[0.7rem] text-[var(--ink-soft)]">
                      {selected.code}
                    </p>
                  </div>
                  <InkButton
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditForm({
                        name: selected.name,
                        description: selected.description ?? "",
                      });
                      setEditOpen(true);
                    }}
                  >
                    <VEdit size={14} /> Sửa
                  </InkButton>
                </div>
                {selected.description && (
                  <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">
                    {selected.description}
                  </p>
                )}
                <p className="mt-3 font-mono text-[0.66rem] text-[var(--ink-soft)]">
                  Tạo {formatDateTimeVN(selected.createdAt)} · Cập nhật{" "}
                  {formatDateTimeVN(selected.updatedAt)}
                </p>
              </SketchCard>

              {/* Thành viên */}
              <SketchCard hover={false} className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="eyebrow !text-[0.6rem]">Thành viên</p>
                    <h3 className="mt-1 text-base font-extrabold text-[var(--ink)]">
                      {members.length} người trong nhóm
                    </h3>
                  </div>
                  <InkButton
                    variant="royal"
                    size="sm"
                    onClick={() => {
                      setPickedUserIds([]);
                      setMemberSearch("");
                      setMemberDialogOpen(true);
                    }}
                  >
                    <VPlus size={14} /> Thêm
                  </InkButton>
                </div>

                {membersApi.loading ? (
                  <div className="mt-4">
                    <PencilLines rows={3} />
                  </div>
                ) : membersApi.error ? (
                  <div className="mt-4">
                    <SectionError message={membersApi.error} onRetry={membersApi.reload} />
                  </div>
                ) : members.length === 0 ? (
                  <div className="mt-4">
                    <EmptyState
                      icon={VUserSearch}
                      title="Nhóm chưa có thành viên"
                      note="Thêm người dùng vào nhóm rồi gán vai trò dùng chung."
                    />
                  </div>
                ) : (
                  <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                    {members.map((m) => (
                      <li
                        key={m.userId}
                        className="sticker-pop flex items-center gap-3 rounded-[10px_12px_10px_12px] border-2 border-[color-mix(in_srgb,var(--ink)_30%,transparent)] bg-[var(--paper)] p-3"
                      >
                        <span
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--blue-mist)] text-[0.68rem] font-extrabold text-[var(--royal)]"
                          aria-hidden="true"
                        >
                          {initialsOf(userName(m.userId))}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-[var(--ink)]">
                            {userName(m.userId)}
                          </p>
                          <p className="mt-0.5 text-[0.66rem] text-[var(--ink-soft)]">
                            Vào nhóm {formatDateVN(m.joinedAt)}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => submitRemoveMember(m.userId)}
                          className="focus-ink inline-flex shrink-0 items-center gap-1 rounded-full border-2 border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-2.5 py-1 text-xs font-bold text-[var(--danger)] transition-all hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-40"
                          aria-label={`Gỡ ${userName(m.userId)} khỏi nhóm`}
                        >
                          <VTrash size={12} /> Gỡ
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </SketchCard>

              {/* Vai trò của nhóm */}
              <SketchCard hover={false} className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="eyebrow !text-[0.6rem]">Vai trò của nhóm</p>
                    <h3 className="mt-1 text-base font-extrabold text-[var(--ink)]">
                      Gán vai trò dùng chung
                    </h3>
                  </div>
                  <InkBadge tone="blue" className="tabular !text-[0.68rem]">
                    {activeRoleCodes.length} vai trò
                  </InkBadge>
                </div>

                {groupRolesApi.loading ? (
                  <div className="mt-4">
                    <PencilLines rows={2} />
                  </div>
                ) : groupRolesApi.error ? (
                  <div className="mt-4">
                    <SectionError
                      message={groupRolesApi.error}
                      onRetry={groupRolesApi.reload}
                    />
                  </div>
                ) : (
                  <>
                    <fieldset className="mt-4 space-y-2">
                      <legend className="sr-only">Chọn vai trò cho nhóm</legend>
                      {roles.map((r) => {
                        const checked = activeRoleCodes.includes(r.code);
                        return (
                          <label
                            key={r.id}
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-[10px_12px_10px_12px] border-2 px-3 py-2.5 transition-all",
                              checked
                                ? "border-[var(--ink)] bg-[var(--blue-mist)]"
                                : "border-[color-mix(in_srgb,var(--ink)_25%,transparent)] bg-[var(--paper)] hover:border-[var(--ink)]",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleDraftRole(r.code)}
                              className="h-4 w-4 shrink-0 accent-[var(--royal)]"
                              aria-label={`Gán vai trò ${r.name} cho nhóm`}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1.5 text-sm font-bold text-[var(--ink)]">
                                {r.name}
                                {r.isSystem && (
                                  <InkBadge tone="red" className="!text-[0.56rem]">
                                    <VLock size={10} aria-hidden="true" /> Hệ thống
                                  </InkBadge>
                                )}
                              </span>
                              <span className="block font-mono text-[0.64rem] text-[var(--ink-soft)]">
                                {r.code}
                              </span>
                            </span>
                            {checked && (
                              <VCheck size={16} className="shrink-0 text-[var(--royal)]" aria-hidden="true" />
                            )}
                          </label>
                        );
                      })}
                    </fieldset>
                    <div className="mt-4 flex items-center gap-2">
                      <InkButton
                        variant="royal"
                        size="sm"
                        disabled={busy || draftRoleCodes === null}
                        onClick={submitRoles}
                      >
                        <VCheck size={14} /> Lưu vai trò
                      </InkButton>
                      {draftRoleCodes !== null && (
                        <button
                          type="button"
                          onClick={() => setDraftRoleCodes(null)}
                          className="focus-ink text-xs font-bold text-[var(--ink-soft)] underline decoration-dashed underline-offset-4 hover:text-[var(--ink)]"
                        >
                          Hoàn tác
                        </button>
                      )}
                    </div>
                    <MarginNote className="mt-3">
                      PUT thay toàn bộ tập vai trò — bỏ chọn hết nghĩa là gỡ sạch vai trò nhóm.
                    </MarginNote>
                  </>
                )}
              </SketchCard>
            </>
          )}

          <div className="max-w-md">
            <NoteCard tone="mint" title="Nhóm là bộ quyền dùng chung">
              Người dùng thuộc nhóm sẽ kế thừa toàn bộ quyền của các vai trò gán cho nhóm —
              tiện cho khoá học hay phòng ban.
            </NoteCard>
          </div>
        </div>
      </div>

      {/* ============================ RBAC: VAI TRÒ & QUYỀN ============================ */}
      <section className="mt-8" aria-label="Vai trò và quyền hệ thống">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="eyebrow">RBAC</p>
            <h2 className="mt-1 text-xl font-extrabold text-[var(--ink)]">Vai trò & Ma trận quyền</h2>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              Vai trò là đơn vị gán quyền; permission là quyền hạt mảnh hệ thống phát hành sẵn.
            </p>
          </div>
          <InkBadge tone="neutral" className="tabular">
            {rolesApi.data?.total ?? 0} vai trò · {permsApi.data?.total ?? 0} quyền
          </InkBadge>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          {/* Bảng vai trò */}
          <SketchCard hover={false} className="overflow-hidden">
            <div className="border-b-2 border-dashed border-[color-mix(in_srgb,var(--ink)_20%,transparent)] px-4 py-3">
              <p className="text-sm font-extrabold text-[var(--ink)]">Vai trò hệ thống</p>
            </div>
            {rolesApi.loading ? (
              <div className="p-5">
                <PencilLines rows={3} />
              </div>
            ) : rolesApi.error ? (
              <div className="p-5">
                <SectionError message={rolesApi.error} onRetry={rolesApi.reload} />
              </div>
            ) : roles.length === 0 ? (
              <EmptyState icon={VShield} title="Không tải được vai trò" />
            ) : (
              <ul className="divide-y-2 divide-dashed divide-[color-mix(in_srgb,var(--ink)_15%,transparent)]">
                {roles.map((r) => (
                  <li
                    key={r.id}
                    className="sticker-pop flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--blue-mist)]"
                  >
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--royal)]"
                      aria-hidden="true"
                    >
                      <VShield size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-[var(--ink)]">
                        {r.name}
                        {r.isSystem && (
                          <InkBadge tone="red" className="!text-[0.56rem]">
                            <VLock size={10} aria-hidden="true" /> Hệ thống
                          </InkBadge>
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[var(--ink-soft)]">
                        <span className="font-mono">{r.code}</span>
                        {r.description ? ` — ${r.description}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openRolePerms(r)}
                      className="focus-ink sketch-border-thin shrink-0 bg-[var(--paper-raised)] px-2.5 py-1.5 text-xs font-bold text-[var(--ink)] transition-all hover:bg-[var(--blue-mist)]"
                      aria-label={`Xem quyền của vai trò ${r.name}`}
                    >
                      <VBadgeCheck size={13} /> Quyền
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SketchCard>

          {/* Lưới quyền hệ thống — phân trang server */}
          <SketchCard hover={false} className="overflow-hidden">
            <div className="border-b-2 border-dashed border-[color-mix(in_srgb,var(--ink)_20%,transparent)] px-4 py-3">
              <p className="text-sm font-extrabold text-[var(--ink)]">Quyền hệ thống</p>
            </div>
            {permsApi.loading ? (
              <div className="p-5">
                <PencilLines rows={5} />
              </div>
            ) : permsApi.error ? (
              <div className="p-5">
                <SectionError message={permsApi.error} onRetry={permsApi.reload} />
              </div>
            ) : (permsApi.data?.items ?? []).length === 0 ? (
              <EmptyState icon={VShield} title="Không có quyền nào" />
            ) : (
              <>
                <ul className="grid gap-3 p-4 sm:grid-cols-2">
                  {(permsApi.data?.items ?? []).map((p) => (
                    <li
                      key={p.id}
                      className="sticker-pop rounded-[10px_12px_10px_12px] border-2 border-[color-mix(in_srgb,var(--ink)_28%,transparent)] bg-[var(--paper)] p-3 transition-colors hover:border-[var(--ink)]"
                    >
                      <p className="font-mono text-[0.72rem] font-bold text-[var(--royal)]">
                        {p.code}
                      </p>
                      <p className="mt-1 text-sm font-bold leading-tight text-[var(--ink)]">
                        {p.name}
                      </p>
                      {p.description && (
                        <p className="mt-1 text-[0.72rem] leading-snug text-[var(--ink-soft)]">
                          {p.description}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_20%,transparent)] px-4 py-3">
                  <p className="tabular text-xs text-[var(--ink-soft)]">
                    {permsApi.data?.total ?? 0} quyền · Trang {permPage}/{permTotalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={permPage <= 1}
                      onClick={() => setPermPage((p) => Math.max(1, p - 1))}
                      aria-label="Trang quyền trước"
                      className="focus-ink sketch-border-thin inline-flex items-center gap-1 bg-[var(--paper-raised)] px-2.5 py-1.5 text-xs font-bold text-[var(--ink)] transition-all hover:bg-[var(--blue-mist)] disabled:pointer-events-none disabled:opacity-35"
                    >
                      <VChevronLeft size={14} /> Trước
                    </button>
                    <button
                      type="button"
                      disabled={permPage >= permTotalPages}
                      onClick={() => setPermPage((p) => p + 1)}
                      aria-label="Trang quyền sau"
                      className="focus-ink sketch-border-thin inline-flex items-center gap-1 bg-[var(--paper-raised)] px-2.5 py-1.5 text-xs font-bold text-[var(--ink)] transition-all hover:bg-[var(--blue-mist)] disabled:pointer-events-none disabled:opacity-35"
                    >
                      Sau <VChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </SketchCard>
        </div>
      </section>

      {/* ---------------------- DIALOG: TẠO NHÓM ---------------------- */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[var(--ink)]">Tạo nhóm mới</DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Mã nhóm dùng lần đầu rồi giữ nguyên — đặt theo chuẩn dễ nhớ.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <FieldLabel htmlFor="group-code">Mã nhóm (code)</FieldLabel>
              <SketchInput
                id="group-code"
                value={createForm.code}
                onChange={(e) => setCreateForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="VD: backend-2026"
              />
              <p className="mt-1 text-[0.68rem] text-[var(--ink-soft)]">
                3-64 ký tự: a-z, 0-9, dấu chấm, gạch dưới, gạch ngang.
              </p>
            </div>
            <div>
              <FieldLabel htmlFor="group-name">Tên nhóm</FieldLabel>
              <SketchInput
                id="group-name"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="VD: Sa sinh Backend 2026"
              />
            </div>
            <div>
              <FieldLabel htmlFor="group-desc">Mô tả (tùy chọn)</FieldLabel>
              <SketchTextarea
                id="group-desc"
                rows={3}
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Nhóm này dành cho ai, dùng làm gì..."
              />
            </div>
          </div>
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
              Hủy
            </InkButton>
            <InkButton variant="royal" size="sm" disabled={busy} onClick={submitCreate}>
              <VPlus size={14} /> Tạo nhóm
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------------- DIALOG: SỬA NHÓM ---------------------- */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-extrabold text-[var(--ink)]">Sửa nhóm</DialogTitle>
                <DialogDescription className="text-[var(--ink-soft)]">
                  Mã nhóm <span className="font-mono">{selected.code}</span> không đổi được.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <FieldLabel htmlFor="edit-group-name">Tên nhóm</FieldLabel>
                  <SketchInput
                    id="edit-group-name"
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="edit-group-desc">Mô tả</FieldLabel>
                  <SketchTextarea
                    id="edit-group-desc"
                    rows={3}
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <InkButton variant="ghost" size="sm" onClick={() => setEditOpen(false)}>
                  Hủy
                </InkButton>
                <InkButton variant="royal" size="sm" disabled={busy} onClick={submitEdit}>
                  <VCheck size={14} /> Lưu thay đổi
                </InkButton>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ------------------ DIALOG: THÊM THÀNH VIÊN (MULTI-SELECT) ------------------ */}
      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-extrabold text-[var(--ink)]">
                  Thêm thành viên vào "{selected.name}"
                </DialogTitle>
                <DialogDescription className="text-[var(--ink-soft)]">
                  Chọn nhiều người cùng lúc — thao tác idempotent, người đã ở nhóm sẽ được bỏ qua.
                </DialogDescription>
              </DialogHeader>

              <div className="relative">
                <VSearch
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Tìm theo tên hoặc email..."
                  aria-label="Tìm người dùng để thêm vào nhóm"
                  className="focus-ink w-full rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] py-2 pl-9 pr-3 text-sm text-[var(--ink)] outline-none transition-colors"
                />
              </div>

              <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1" role="group" aria-label="Danh sách người dùng">
                {users
                  .filter((u) => {
                    const q = memberSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
                    );
                  })
                  .map((u) => {
                    const picked = pickedUserIds.includes(u.id);
                    const already = memberIds.has(u.id);
                    return (
                      <label
                        key={u.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-[10px] border-2 px-3 py-2.5 transition-all",
                          already
                            ? "cursor-not-allowed border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-[var(--paper)] opacity-50"
                            : picked
                              ? "border-[var(--ink)] bg-[var(--blue-mist)]"
                              : "border-[color-mix(in_srgb,var(--ink)_25%,transparent)] bg-[var(--paper)] hover:border-[var(--ink)]",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={picked}
                          disabled={already}
                          onChange={() =>
                            setPickedUserIds((prev) =>
                              picked ? prev.filter((id) => id !== u.id) : [...prev, u.id],
                            )
                          }
                          className="h-4 w-4 shrink-0 accent-[var(--royal)]"
                          aria-label={`Chọn ${u.displayName}`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-[var(--ink)]">
                            {u.displayName}
                          </span>
                          <span className="block truncate font-mono text-[0.64rem] text-[var(--ink-soft)]">
                            {u.email}
                          </span>
                        </span>
                        {already && (
                          <InkBadge tone="neutral" className="shrink-0 !text-[0.56rem]">
                            Đã trong nhóm
                          </InkBadge>
                        )}
                      </label>
                    );
                  })}
              </div>

              <DialogFooter>
                <InkButton variant="ghost" size="sm" onClick={() => setMemberDialogOpen(false)}>
                  Hủy
                </InkButton>
                <InkButton
                  variant="royal"
                  size="sm"
                  disabled={busy || pickedUserIds.length === 0}
                  onClick={submitAddMembers}
                >
                  <VPlus size={14} /> Thêm {pickedUserIds.length > 0 ? `(${pickedUserIds.length})` : ""}
                </InkButton>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ---------------- DIALOG: QUYỀN CỦA MỘT VAI TRÒ ---------------- */}
      <Dialog
        open={!!rolePerms || rolePermsLoading}
        onOpenChange={(open) => {
          if (!open) {
            setRolePerms(null);
            setRolePermsLoading(false);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-extrabold text-[var(--ink)]">
              <VShield size={18} className="text-[var(--royal)]" aria-hidden="true" />
              Quyền của vai trò{" "}
              "{rolePerms ? rolePerms.role.name : "đang tải"}"
            </DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              {rolePerms
                ? `Ma trận quyền read-only — ${rolePerms.total} quyền đang cấp cho vai trò ${rolePerms.role.code}.`
                : "Đang tải danh sách quyền của vai trò..."}
            </DialogDescription>
          </DialogHeader>
          {rolePermsLoading && (
            <div className="py-4">
              <PencilLines rows={5} />
            </div>
          )}
          {rolePerms && (
            <>
              {rolePerms.items.length === 0 ? (
                <EmptyState
                  icon={VShield}
                  title="Vai trò chưa được cấp quyền nào"
                  note="Kiểm tra lại gán quyền phía máy chủ."
                />
              ) : (
                <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
                  {rolePerms.items.map((p) => (
                    <li
                      key={p.id}
                      className="rounded-[9px] border-2 border-[color-mix(in_srgb,var(--ink)_25%,transparent)] bg-[var(--paper)] px-3 py-2"
                    >
                      <p className="font-mono text-[0.7rem] font-bold text-[var(--royal)]">
                        {p.code}
                      </p>
                      <p className="text-sm font-bold text-[var(--ink)]">{p.name}</p>
                      {p.description && (
                        <p className="mt-0.5 text-[0.7rem] leading-snug text-[var(--ink-soft)]">
                          {p.description}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
