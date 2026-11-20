"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  VCheck,
  VChevronLeft,
  VChevronRight,
  VCircleCheck,
  VClock,
  VGraduation,
  VHistory,
  VIdCard,
  VLock,
  VMore,
  VPlus,
  VSearch,
  VShield,
  VUserSearch,
  VUsers,
  type VIconComponent,
} from "@/components/icons/v-icons";
import { relativeTimeVN } from "@/components/shared/bell-utils";
import { InkButton } from "@/components/notebook/reveal";
import {
  InkBadge,
  NoteCard,
  SketchCard,
  StampMoc,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AdminUserRow, Role } from "@/lib/mock/types";
import { useMock } from "@/lib/use-mock";
import { cn } from "@/lib/utils";
import {
  ChipGroup,
  EmptyState,
  PencilLines,
  ROLE_META,
  SectionError,
  SketchInput,
  StaffPageHeader,
  initialsOf,
  relativeVN,
} from "./staff-kit";

/* =====================================================================
 * NGƯỜI DÙNG — danh sách tài khoản, duyệt / khóa / mở khóa / đặt lại mật khẩu.
 * Dữ liệu mock giữ nguyên làm nền, thao tác ghi đè cục bộ trong phiên.
 * ===================================================================== */

const PAGE_SIZE = 8;

const ROLE_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "intern", label: "Sinh viên" },
  { value: "instructor", label: "Giảng viên" },
  { value: "admin", label: "Quản trị" },
] as const;

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Đang hoạt động" },
  { value: "pending", label: "Chờ duyệt" },
  { value: "locked", label: "Bị khóa" },
] as const;

const ROLE_CREATE_OPTIONS = [
  { value: "intern", label: "Sinh viên" },
  { value: "instructor", label: "Giảng viên" },
  { value: "admin", label: "Quản trị" },
] as const;

/** Icon tile theo vai trò trong hộp thoại tạo người dùng. */
const ROLE_CREATE_ICON: Record<Role, VIconComponent> = {
  intern: VGraduation,
  instructor: VUsers,
  admin: VShield,
};

/** Hoạt động minh họa theo vai trò cho hộp thoại "Xem hồ sơ". */
const ACTIVITY_BY_ROLE: Record<Role, string[]> = {
  intern: ["Nộp bài tập API-201", "Xem đánh giá Sprint 2", "Cập nhật hồ sơ cá nhân"],
  instructor: ["Chấm bài BE-190", "Mở phiên thực tập SS-2026-02", "Duyệt nhiệm vụ FE-104"],
  admin: ["Nhập câu hỏi phỏng vấn mới", "Rà soát audit log hôm qua", "Cấp chứng nhận CRT-2026-0042"],
};

function fabricatedActivity(row: AdminUserRow) {
  const base = new Date(row.lastActive).getTime();
  return ACTIVITY_BY_ROLE[row.role].map((label, i) => ({
    label,
    at: new Date(base - (i + 1) * 26 * 3_600_000).toISOString(),
  }));
}

export default function AdminUsers() {
  const { data, loading, error, reload } = useMock<AdminUserRow[]>("admin/users");

  /* Ghi đè cục bộ (khóa / duyệt) + danh sách thêm mới trong phiên */
  const [overrides, setOverrides] = useState<Record<string, Partial<AdminUserRow>>>({});
  const [added, setAdded] = useState<AdminUserRow[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "pending" | "locked">("all");
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [flashApproved, setFlashApproved] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; email: string; role: Role }>({
    name: "",
    email: "",
    role: "intern",
  });
  const [profileId, setProfileId] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      [...added, ...(data ?? [])].map((r) => (overrides[r.id] ? { ...r, ...overrides[r.id] } : r)),
    [added, data, overrides],
  );

  const applyOverride = (id: string, patch: Partial<AdminUserRow>) =>
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  /* Bộ lọc + tìm kiếm */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (roleFilter !== "all" && r.role !== roleFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (q && !r.name.toLowerCase().includes(q) && !r.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, query, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageRows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const profileUser = profileId ? (rows.find((r) => r.id === profileId) ?? null) : null;

  /* Chip số trang: < 7 trang liệt kê hết, ngoài ra rút gọn bằng dấu … */
  const pageChips = useMemo<(number | "gap")[]>(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const wanted = new Set<number>([
      1,
      2,
      current - 1,
      current,
      current + 1,
      totalPages - 1,
      totalPages,
    ]);
    const chips: (number | "gap")[] = [];
    for (let p = 1; p <= totalPages; p++) {
      if (wanted.has(p)) chips.push(p);
      else if (chips[chips.length - 1] !== "gap") chips.push("gap");
    }
    return chips;
  }, [current, totalPages]);

  /* Hành động quản trị (mô phỏng — ghi đè cục bộ + toast) */
  const toggleLock = (row: AdminUserRow) => {
    const locking = row.status !== "locked";
    applyOverride(row.id, { status: locking ? "locked" : "active" });
    if (locking) toast.success(`Đã khóa tài khoản ${row.email} (mô phỏng)`);
    else toast.success(`Đã mở khóa tài khoản ${row.email} (mô phỏng)`);
  };

  const approveUser = (row: AdminUserRow) => {
    applyOverride(row.id, { status: "active" });
    setFlashApproved(row.id);
    window.setTimeout(() => setFlashApproved(null), 1800);
    toast.success(`Đã duyệt tài khoản ${row.email} (mô phỏng)`);
  };

  const submitCreate = () => {
    const name = form.name.trim();
    const email = form.email.trim();
    if (!name) {
      toast.error("Chưa nhập họ tên.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("Email chưa hợp lệ.");
      return;
    }
    if (rows.some((r) => r.email.toLowerCase() === email.toLowerCase())) {
      toast.error("Email này đã có trong hệ thống.");
      return;
    }
    const now = new Date().toISOString();
    setAdded((prev) => [
      { id: `u-new-${Date.now()}`, name, email, role: form.role, status: "active", createdAt: now, lastActive: now },
      ...prev,
    ]);
    setCreateOpen(false);
    setForm({ name: "", email: "", role: "intern" });
    setPage(1);
    setConfetti(true);
    window.setTimeout(() => setConfetti(false), 950);
    toast.success("Đã tạo người dùng (mô phỏng)");
  };

  /* Trạng thái chờ */
  if (loading && !data) {
    return (
      <div>
        <StaffPageHeader eyebrow="Quản trị · tài khoản" title="Người dùng" />
        <SketchCard hover={false} className="p-5">
          <PencilLines rows={8} />
        </SketchCard>
      </div>
    );
  }

  if (error || !data) {
    return <SectionError message={error ?? "Chưa tải được danh sách người dùng."} onRetry={reload} />;
  }

  return (
    <div>
      <StaffPageHeader
        eyebrow="Quản trị · tài khoản"
        title="Người dùng"
        actions={
          <>
            <InkBadge tone="neutral" className="tabular">
              {rows.length} tài khoản
            </InkBadge>
            <InkButton variant="royal" size="sm" onClick={() => setCreateOpen(true)}>
              <VPlus size={15} /> Thêm người dùng
            </InkButton>
          </>
        }
      />

      {/* Thanh công cụ: tìm kiếm + lọc vai trò + lọc trạng thái */}
      <SketchCard hover={false} className="mb-4 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <VSearch
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo tên hoặc email..."
              aria-label="Tìm người dùng theo tên hoặc email"
              className="focus-ink w-full rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] py-2 pl-9 pr-3 text-sm text-[var(--ink)] outline-none transition-colors"
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow !text-[0.6rem]">Vai trò</span>
              <ChipGroup
                ariaLabel="Lọc theo vai trò"
                options={ROLE_FILTER_OPTIONS}
                value={roleFilter}
                onChange={(v) => {
                  setRoleFilter(v);
                  setPage(1);
                }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow !text-[0.6rem]">Trạng thái</span>
              <ChipGroup
                ariaLabel="Lọc theo trạng thái tài khoản"
                options={STATUS_FILTER_OPTIONS}
                value={statusFilter}
                onChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </div>
      </SketchCard>

      {/* Bảng người dùng */}
      <SketchCard hover={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ink-table min-w-[920px]">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Hoạt động cuối</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <EmptyState
                      icon={VUserSearch}
                      title="Không tìm thấy người dùng nào khớp bộ lọc ✎"
                      note="Thử bỏ lọc vai trò / trạng thái, hoặc đổi từ khóa tìm kiếm."
                    />
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "sticker-pop",
                      row.status === "locked" &&
                        "bg-[color-mix(in_srgb,var(--danger)_5%,transparent)]",
                    )}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] text-[0.68rem] font-extrabold",
                            row.status === "locked"
                              ? "bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] text-[var(--danger)]"
                              : "bg-[var(--blue-mist)] text-[var(--royal)]",
                          )}
                          aria-hidden="true"
                        >
                          {initialsOf(row.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-sm font-bold leading-tight text-[var(--ink)]">
                            {row.status === "locked" && (
                              <VLock
                                size={13}
                                className="shrink-0 text-[var(--danger)]"
                                aria-label="Tài khoản bị khóa"
                              />
                            )}
                            <span className="truncate">{row.name}</span>
                          </p>
                          <p className="mt-0.5 truncate font-mono text-[0.68rem] text-[var(--ink-soft)]">
                            {row.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <InkBadge tone={ROLE_META[row.role].tone} className="!text-[0.65rem]">
                        {ROLE_META[row.role].label}
                      </InkBadge>
                    </td>
                    <td>
                      {row.status === "locked" ? (
                        <StampMoc tone="red" rotate={-8} className="!px-2 !py-0.5 !text-[0.56rem]">
                          Bị khóa
                        </StampMoc>
                      ) : row.status === "pending" ? (
                        <InkBadge tone="amber" className="!text-[0.65rem]">
                          <VClock size={12} aria-hidden="true" /> Chờ duyệt
                        </InkBadge>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--success)]">
                          {flashApproved === row.id && (
                            <span className="draw-check" aria-hidden="true">
                              <VCircleCheck size={16} className="text-[var(--success)]" />
                            </span>
                          )}
                          <span
                            className="ws-dot"
                            style={{ background: "var(--success)", borderColor: "transparent" }}
                            aria-hidden="true"
                          />
                          Hoạt động
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-[0.8rem] tabular text-[var(--ink-soft)]">
                      {formatDateVN(row.createdAt)}
                    </td>
                    <td className="whitespace-nowrap text-[0.8rem] tabular text-[var(--ink-soft)]">
                      {relativeVN(row.lastActive)}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        {row.status === "pending" && (
                          <button
                            type="button"
                            onClick={() => approveUser(row)}
                            className="focus-ink inline-flex items-center gap-1 rounded-full border-2 border-[var(--success)] bg-[color-mix(in_srgb,var(--success)_10%,transparent)] px-2.5 py-1 text-xs font-bold text-[var(--success)] transition-all hover:-translate-y-0.5"
                            aria-label={`Duyệt tài khoản ${row.name}`}
                          >
                            <VCheck size={13} /> Duyệt
                          </button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label={`Thao tác với tài khoản ${row.name}`}
                              className="focus-ink grid h-8 w-8 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--ink)] transition-colors hover:bg-[var(--blue-mist)]"
                            >
                              <VMore size={15} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="rounded-[10px_12px_10px_12px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] p-1.5 shadow-ink-3"
                          >
                            <DropdownMenuItem
                              onClick={() => toggleLock(row)}
                              variant={row.status === "locked" ? "default" : "destructive"}
                              className="cursor-pointer gap-2 rounded-[7px] px-2.5 py-2 text-[0.8rem] font-semibold focus:bg-[var(--blue-mist)] focus:text-[var(--ink)]"
                            >
                              {row.status === "locked" ? (
                                <VShield className="text-[var(--success)]" />
                              ) : (
                                <VLock />
                              )}
                              {row.status === "locked" ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                toast.info(
                                  `Đã gửi email đặt lại mật khẩu cho ${row.email} (mô phỏng)`,
                                )
                              }
                              className="cursor-pointer gap-2 rounded-[7px] px-2.5 py-2 text-[0.8rem] font-semibold focus:bg-[var(--blue-mist)] focus:text-[var(--ink)]"
                            >
                              <VShield /> Đặt lại mật khẩu
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1 border-t border-dashed border-[color-mix(in_srgb,var(--ink)_25%,transparent)]" />
                            <DropdownMenuItem
                              onClick={() => setProfileId(row.id)}
                              className="cursor-pointer gap-2 rounded-[7px] px-2.5 py-2 text-[0.8rem] font-semibold focus:bg-[var(--blue-mist)] focus:text-[var(--ink)]"
                            >
                              <VUserSearch /> Xem hồ sơ
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Chân trang: số bản ghi + chuyển trang */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_20%,transparent)] px-4 py-3">
          <p className="tabular text-xs text-[var(--ink-soft)]">
            {filtered.length} bản ghi · Trang {current}/{totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={current <= 1}
              onClick={() => setPage(Math.max(1, current - 1))}
              aria-label="Trang trước"
              className="focus-ink sketch-border-thin inline-flex items-center gap-1 bg-[var(--paper-raised)] px-2.5 py-1.5 text-xs font-bold text-[var(--ink)] transition-all hover:bg-[var(--blue-mist)] disabled:pointer-events-none disabled:opacity-35"
            >
              <VChevronLeft size={14} /> Trước
            </button>
            <nav className="flex items-center gap-1.5" aria-label="Chọn trang danh sách">
              {pageChips.map((chip, i) =>
                chip === "gap" ? (
                  <span key={`gap-${i}`} className="px-0.5 text-xs font-bold text-[var(--ink-soft)]" aria-hidden="true">
                    …
                  </span>
                ) : (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setPage(chip)}
                    aria-current={chip === current ? "page" : undefined}
                    aria-label={`Trang ${chip}`}
                    className={cn(
                      "focus-ink tabular grid h-7 w-7 place-items-center rounded-[8px] border-2 text-xs font-bold transition-all",
                      chip === current
                        ? "glow-ring border-[var(--royal)] bg-[var(--royal)] text-white dark:text-[#101018]"
                        : "border-[color-mix(in_srgb,var(--ink)_30%,transparent)] bg-[var(--paper-raised)] text-[var(--ink-soft)] hover:border-[var(--ink)] hover:text-[var(--ink)]",
                    )}
                  >
                    {chip}
                  </button>
                ),
              )}
            </nav>
            <button
              type="button"
              disabled={current >= totalPages}
              onClick={() => setPage(Math.min(totalPages, current + 1))}
              aria-label="Trang sau"
              className="focus-ink sketch-border-thin inline-flex items-center gap-1 bg-[var(--paper-raised)] px-2.5 py-1.5 text-xs font-bold text-[var(--ink)] transition-all hover:bg-[var(--blue-mist)] disabled:pointer-events-none disabled:opacity-35"
            >
              Sau <VChevronRight size={14} />
            </button>
          </div>
        </div>
      </SketchCard>

      {/* Ghi chú biện pháp cuối cùng */}
      <div className="mt-5 max-w-md">
        <NoteCard tone="pink" title="Trước khi khóa tài khoản">
          Khóa tài khoản là biện pháp cuối cùng — luôn ghi rõ lý do vào <b>audit log</b> để đối
          chiếu về sau.
        </NoteCard>
      </div>

      {/* Hộp thoại: thêm người dùng */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[var(--ink)]">Thêm người dùng</DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Tạo tài khoản mới — vai trò quyết định không gian làm việc của họ.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="new-user-name"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]"
              >
                Họ tên
              </label>
              <SketchInput
                id="new-user-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ví dụ: Lê Thị B"
              />
            </div>
            <div>
              <label
                htmlFor="new-user-email"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]"
              >
                Email
              </label>
              <SketchInput
                id="new-user-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="ten@edu.vn"
              />
            </div>
            <fieldset>
              <legend className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                Vai trò
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {ROLE_CREATE_OPTIONS.map((opt) => {
                  const RoleIcon = ROLE_CREATE_ICON[opt.value];
                  const active = form.role === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setForm((f) => ({ ...f, role: opt.value }))}
                      className={cn(
                        "focus-ink flex flex-col items-center gap-1.5 rounded-[10px] border-2 px-2 py-3 text-xs font-bold transition-all",
                        active
                          ? "border-[var(--ink)] bg-[var(--blue-mist)] text-[var(--ink)] shadow-ink-2"
                          : "border-[color-mix(in_srgb,var(--ink)_28%,transparent)] bg-[var(--paper)] text-[var(--ink-soft)] hover:border-[var(--ink)] hover:text-[var(--ink)]",
                      )}
                    >
                      <RoleIcon
                        size={20}
                        className={active ? "text-[var(--royal)]" : undefined}
                        aria-hidden="true"
                      />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
              Hủy
            </InkButton>
            <InkButton variant="royal" size="sm" onClick={submitCreate}>
              <VPlus size={14} /> Tạo tài khoản
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hộp thoại: xem hồ sơ */}
      <Dialog open={!!profileUser} onOpenChange={(open) => !open && setProfileId(null)}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          {profileUser && (
            <>
              <DialogHeader>
                <DialogTitle className="font-extrabold text-[var(--ink)]">
                  Hồ sơ người dùng
                </DialogTitle>
                <DialogDescription className="text-[var(--ink-soft)]">
                  Thông tin tài khoản và hoạt động gần đây (mô phỏng).
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-center gap-3.5 rounded-[12px] border-2 border-[var(--ink)] bg-[var(--paper)] p-3.5">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--blue-mist)] text-sm font-extrabold text-[var(--royal)]">
                  {initialsOf(profileUser.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold text-[var(--ink)]">{profileUser.name}</p>
                  <p className="truncate font-mono text-xs text-[var(--ink-soft)]">
                    {profileUser.email}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <InkBadge tone={ROLE_META[profileUser.role].tone} className="!text-[0.62rem]">
                      {ROLE_META[profileUser.role].label}
                    </InkBadge>
                    {profileUser.status === "locked" && (
                      <InkBadge tone="red" className="!text-[0.62rem]">
                        Bị khóa
                      </InkBadge>
                    )}
                    {profileUser.status === "pending" && (
                      <InkBadge tone="amber" className="!text-[0.62rem]">
                        Chờ duyệt
                      </InkBadge>
                    )}
                  </div>
                </div>
                <span
                  className="grid h-10 w-10 shrink-0 rotate-3 place-items-center rounded-[10px] border-2 border-dashed border-[color-mix(in_srgb,var(--royal)_50%,transparent)] text-[var(--royal)]"
                  aria-hidden="true"
                  title="Thẻ định danh"
                >
                  <VIdCard size={18} />
                </span>
              </div>

              <dl className="divide-y-2 divide-dashed divide-[color-mix(in_srgb,var(--ink)_18%,transparent)] rounded-[12px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3.5">
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                    Trạng thái
                  </dt>
                  <dd className="text-sm font-semibold text-[var(--ink)]">
                    {profileUser.status === "active"
                      ? "Đang hoạt động"
                      : profileUser.status === "pending"
                        ? "Chờ duyệt"
                        : "Bị khóa"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                    Ngày tạo
                  </dt>
                  <dd className="tabular text-sm font-semibold text-[var(--ink)]">
                    {formatDateVN(profileUser.createdAt)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                    Hoạt động cuối
                  </dt>
                  <dd className="tabular text-sm font-semibold text-[var(--ink)]">
                    {relativeTimeVN(profileUser.lastActive)}
                  </dd>
                </div>
              </dl>

              <div>
                <p className="eyebrow !text-[0.62rem]">Hoạt động gần đây của tài khoản</p>
                <ul className="mt-2 space-y-2">
                  {fabricatedActivity(profileUser).map((act) => (
                    <li
                      key={act.label}
                      className="flex items-center gap-2.5 text-sm text-[var(--ink)]"
                    >
                      <VHistory size={15} className="shrink-0 text-[var(--royal)]" />
                      <span className="min-w-0 flex-1 truncate">{act.label}</span>
                      <span className="tabular shrink-0 text-[0.68rem] text-[var(--ink-soft)]">
                        {relativeVN(act.at)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <DialogFooter>
                <InkButton
                  variant={profileUser.status === "locked" ? "outline" : "royal"}
                  size="sm"
                  onClick={() => toggleLock(profileUser)}
                >
                  {profileUser.status === "locked" ? (
                    <>
                      <VShield size={14} /> Mở khóa tài khoản
                    </>
                  ) : (
                    <>
                      <VLock size={14} /> Khóa tài khoản
                    </>
                  )}
                </InkButton>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confetti khi tạo tài khoản thành công */}
      {confetti && (
        <span
          aria-hidden="true"
          className="confetti-pop play pointer-events-none fixed left-1/2 top-28 z-[60] h-1 w-1"
        />
      )}
    </div>
  );
}
