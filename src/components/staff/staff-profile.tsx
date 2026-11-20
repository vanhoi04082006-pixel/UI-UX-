"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  VAlert,
  VArrowRight,
  VCheck,
  VDashboard,
  VEdit,
  VEye,
  VEyeOff,
  VGraduation,
  VIdCard,
  VLock,
  VShield,
  VX,
} from "@/components/icons/v-icons";
import { InkButton } from "@/components/notebook/reveal";
import { InkBadge, MarginNote, NoteCard, SketchCard } from "@/components/notebook/ui";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ROLE_META, SketchInput, StaffPageHeader } from "./staff-kit";

/* =====================================================================
 * HỒ SƠ & CÀI ĐẶT — dùng chung cho Giảng viên & Quản trị viên.
 * ===================================================================== */

/** Chấm điểm độ mạnh mật khẩu — 0..4 vạch mực. */
function scorePassword(pwd: string): number {
  let score = 0;
  if (pwd.length >= 8) score += 1;
  if (pwd.length >= 12) score += 1;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1;
  if (/\d/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) score += 1;
  return Math.min(4, score);
}

const PWD_STRENGTH_LABEL = ["Quá ngắn", "Yếu", "Trung bình", "Khá", "Tốt"];

/** Thước mực 4 vạch báo độ mạnh mật khẩu mới. */
function PasswordStrength({ value }: { value: string }) {
  const score = scorePassword(value);
  const tone =
    score >= 4 ? "var(--success)" : score >= 3 ? "var(--warning)" : "var(--danger)";
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={4}
      aria-valuenow={score}
      aria-label="Độ mạnh mật khẩu mới"
      className="flex items-center gap-1.5"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <span
          key={i}
          className="h-1.5 flex-1 rounded-full border border-[color-mix(in_srgb,var(--ink)_35%,transparent)]"
          style={i < score ? { background: tone } : undefined}
          aria-hidden="true"
        />
      ))}
      <span
        className={cn(
          "ml-1 shrink-0 text-[0.68rem] font-bold",
          value && "tabular",
        )}
        style={{ color: value ? tone : "var(--ink-soft)" }}
      >
        {value ? PWD_STRENGTH_LABEL[score] : "chưa nhập"}
      </span>
    </div>
  );
}

/** Ô mật khẩu có nút hiện/ẩn + phát hiện Caps Lock. */
function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggle,
  onCaps,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  onCaps?: (on: boolean) => void;
  autoComplete: "current-password" | "new-password";
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]"
      >
        {label}
      </label>
      <div className="relative">
        <SketchInput
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => onCaps?.(e.getModifierState("CapsLock"))}
          onKeyUp={(e) => onCaps?.(e.getModifierState("CapsLock"))}
          autoComplete={autoComplete}
          className="pr-11"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? `Ẩn ${label.toLowerCase()}` : `Hiện ${label.toLowerCase()}`}
          aria-pressed={show}
          className="focus-ink absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-[var(--ink-soft)] transition-colors hover:bg-[var(--blue-mist)] hover:text-[var(--ink)]"
        >
          {show ? <VEyeOff size={15} /> : <VEye size={15} />}
        </button>
      </div>
    </div>
  );
}

export default function StaffProfile() {
  const user = useApp((s) => s.user);
  const navigate = useApp((s) => s.navigate);

  /* Thông tin cá nhân — sửa họ tên cục bộ */
  const [name, setName] = useState(user?.name ?? "");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  /* Đổi mật khẩu */
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [pwdShow, setPwdShow] = useState({ current: false, next: false, confirm: false });
  const [capsOn, setCapsOn] = useState(false);
  const [pwdBusy, setPwdBusy] = useState(false);

  /* Tùy chọn làm việc */
  const [emailRemind, setEmailRemind] = useState(true);
  const [newsletter, setNewsletter] = useState(false);

  if (!user) return null;

  const startEditName = () => {
    setNameDraft(name);
    setEditingName(true);
  };

  const saveName = () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      toast.error("Họ tên không được để trống.");
      return;
    }
    setName(trimmed);
    setEditingName(false);
    toast.success("Đã cập nhật họ tên (mô phỏng)");
  };

  const submitPassword = () => {
    const { current, next, confirm } = pwd;
    if (!current || !next || !confirm) {
      toast.error("Vui lòng điền đủ cả ba ô mật khẩu.");
      return;
    }
    if (next.length < 8) {
      toast.error("Mật khẩu mới cần tối thiểu 8 ký tự.");
      return;
    }
    if (next !== confirm) {
      toast.error("Xác nhận mật khẩu chưa khớp.");
      return;
    }
    if (next === current) {
      toast.error("Mật khẩu mới phải khác mật khẩu hiện tại.");
      return;
    }
    /* Mô phỏng thời gian ghi lên máy chủ ~0.85s */
    setPwdBusy(true);
    window.setTimeout(() => {
      setPwd({ current: "", next: "", confirm: "" });
      setPwdBusy(false);
      toast.success("Đã đổi mật khẩu (mô phỏng)");
    }, 850);
  };

  const infoRowClass =
    "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b-2 border-dashed border-[color-mix(in_srgb,var(--ink)_18%,transparent)] py-3 last:border-b-0";
  const infoLabelClass =
    "text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]";

  return (
    <div>
      <StaffPageHeader
        eyebrow="Tài khoản cá nhân"
        title="Hồ sơ & cài đặt"
        note="thông tin này hiển thị với sinh viên trong trang đánh giá"
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Cột chính */}
        <div className="min-w-0 space-y-5">
          {/* Thông tin cá nhân */}
          <SketchCard hover={false} className="p-5 sm:p-6" as="section" aria-label="Thông tin cá nhân">
            <div className="flex items-center gap-4">
              <span
                className="badge-glow grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--royal)] text-lg font-extrabold text-white dark:text-[#101018]"
                aria-hidden="true"
              >
                {user.initials}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-extrabold leading-tight text-[var(--ink)]">
                  {name}
                </h2>
                <p className="truncate text-sm text-[var(--ink-soft)]">{user.title}</p>
                <InkBadge tone={ROLE_META[user.role].tone} className="mt-1.5 !text-[0.65rem]">
                  {(() => {
                    const RoleBadgeIcon = user.role === "admin" ? VShield : VGraduation;
                    return <RoleBadgeIcon size={12} aria-hidden="true" />;
                  })()}
                  {user.role === "admin" ? "Quản trị viên" : ROLE_META[user.role].label}
                </InkBadge>
              </div>
              <span
                className="grid h-11 w-11 shrink-0 rotate-3 place-items-center rounded-[12px] border-2 border-dashed border-[color-mix(in_srgb,var(--royal)_50%,transparent)] text-[var(--royal)]"
                aria-hidden="true"
                title="Thẻ định danh"
              >
                <VIdCard size={20} />
              </span>
            </div>

            <dl className="mt-4">
              {/* Họ và tên — sửa tại chỗ */}
              <div className={infoRowClass}>
                <dt className={infoLabelClass}>Họ và tên</dt>
                <dd className="flex items-center gap-2">
                  {editingName ? (
                    <>
                      <SketchInput
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        aria-label="Họ và tên mới"
                        className="max-w-56"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveName();
                          if (e.key === "Escape") setEditingName(false);
                        }}
                      />
                      <button
                        type="button"
                        onClick={saveName}
                        aria-label="Lưu họ tên"
                        className="focus-ink grid h-8 w-8 place-items-center rounded-full border-2 border-[var(--success)] bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--success)] transition-all hover:-translate-y-0.5"
                      >
                        <VCheck size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingName(false)}
                        aria-label="Hủy sửa họ tên"
                        className="focus-ink grid h-8 w-8 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--ink-soft)] transition-all hover:-translate-y-0.5"
                      >
                        <VX size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-bold text-[var(--ink)]">{name}</span>
                      <button
                        type="button"
                        onClick={startEditName}
                        aria-label="Sửa họ và tên"
                        title="Sửa họ và tên"
                        className="focus-ink grid h-7 w-7 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--ink-soft)] transition-all hover:-translate-y-0.5 hover:text-[var(--ink)]"
                      >
                        <VEdit size={12} />
                      </button>
                    </>
                  )}
                </dd>
              </div>

              {/* Email — chỉ đọc */}
              <div className={infoRowClass}>
                <dt className={infoLabelClass}>Email</dt>
                <dd className="flex items-center gap-1.5">
                  <span className="font-mono text-sm font-semibold text-[var(--ink)]">
                    {user.email}
                  </span>
                  <VLock
                    size={13}
                    className="text-[var(--ink-soft)]"
                    aria-label="Email chỉ quản trị hệ thống đổi được"
                  />
                </dd>
              </div>

              {/* Vai trò */}
              <div className={infoRowClass}>
                <dt className={infoLabelClass}>Vai trò</dt>
                <dd>
                  <InkBadge tone={ROLE_META[user.role].tone} className="!text-[0.65rem]">
                    {user.role === "admin" ? "Quản trị viên" : ROLE_META[user.role].label}
                  </InkBadge>
                </dd>
              </div>

              {/* Không gian làm việc */}
              <div className={infoRowClass}>
                <dt className={infoLabelClass}>Không gian</dt>
                <dd className="text-sm font-bold text-[var(--ink)]">
                  {user.role === "instructor" ? "Giảng dạy" : "Vận hành hệ thống"}
                </dd>
              </div>
            </dl>
          </SketchCard>

          {/* Đổi mật khẩu */}
          <SketchCard hover={false} className="p-5 sm:p-6" as="section" aria-label="Đổi mật khẩu">
            <h2 className="text-base font-extrabold text-[var(--ink)]">Đổi mật khẩu</h2>
            <p className="mt-1 text-xs text-[var(--ink-soft)]">
              Mật khẩu mới tối thiểu 8 ký tự, khác mật khẩu hiện tại.
            </p>
            <form
              className="mt-4 grid gap-4 sm:grid-cols-3"
              onSubmit={(e) => {
                e.preventDefault();
                submitPassword();
              }}
            >
              <PasswordField
                id="pwd-current"
                label="Hiện tại"
                value={pwd.current}
                onChange={(v) => setPwd((p) => ({ ...p, current: v }))}
                show={pwdShow.current}
                onToggle={() => setPwdShow((p) => ({ ...p, current: !p.current }))}
                onCaps={setCapsOn}
                autoComplete="current-password"
              />
              <PasswordField
                id="pwd-next"
                label="Mới"
                value={pwd.next}
                onChange={(v) => setPwd((p) => ({ ...p, next: v }))}
                show={pwdShow.next}
                onToggle={() => setPwdShow((p) => ({ ...p, next: !p.next }))}
                onCaps={setCapsOn}
                autoComplete="new-password"
              />
              <PasswordField
                id="pwd-confirm"
                label="Xác nhận lại"
                value={pwd.confirm}
                onChange={(v) => setPwd((p) => ({ ...p, confirm: v }))}
                show={pwdShow.confirm}
                onToggle={() => setPwdShow((p) => ({ ...p, confirm: !p.confirm }))}
                onCaps={setCapsOn}
                autoComplete="new-password"
              />
              <div className="space-y-2.5 sm:col-span-3">
                {capsOn && (
                  <p
                    className="flex items-center gap-1.5 rounded-[8px] border-2 border-[color-mix(in_srgb,var(--warning)_45%,transparent)] bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] px-2.5 py-1.5 text-xs font-bold text-[var(--warning)]"
                    role="status"
                  >
                    <VAlert size={13} aria-hidden="true" />
                    Caps Lock đang bật — kiểm tra chữ hoa/thường trước khi nhập tiếp.
                  </p>
                )}
                <PasswordStrength value={pwd.next} />
                <div>
                  <InkButton type="submit" variant="royal" size="sm" disabled={pwdBusy}>
                    <VLock size={14} /> {pwdBusy ? "Đang lưu..." : "Đổi mật khẩu"}
                  </InkButton>
                </div>
              </div>
            </form>
          </SketchCard>

          {/* Tùy chọn làm việc */}
          <SketchCard hover={false} className="p-5 sm:p-6" as="section" aria-label="Tùy chọn làm việc">
            <h2 className="text-base font-extrabold text-[var(--ink)]">Tùy chọn làm việc</h2>
            <div className="mt-2 divide-y-2 divide-dashed divide-[color-mix(in_srgb,var(--ink)_18%,transparent)]">
              <div className="flex items-center justify-between gap-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--ink)]">Giao diện sáng / tối</p>
                  <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
                    Đổi ngay tại đây — tùy chọn lưu theo trình duyệt.
                  </p>
                </div>
                <ThemeToggle />
              </div>
              <div className="flex items-center justify-between gap-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--ink)]">
                    Nhắc email khi có bài chờ duyệt
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
                    Gửi email mỗi khi có bài nộp vào hàng chờ.
                  </p>
                </div>
                <Switch
                  checked={emailRemind}
                  onCheckedChange={(v) => {
                    setEmailRemind(v);
                    toast.success(`Đã ${v ? "bật" : "tắt"} nhắc email (mô phỏng)`);
                  }}
                  aria-label="Nhắc email khi có bài chờ duyệt"
                />
              </div>
              <div className="flex items-center justify-between gap-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--ink)]">Bản tin hệ thống</p>
                  <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
                    Tổng hợp vận hành hàng tuần, gọn như ghi chú.
                  </p>
                </div>
                <Switch
                  checked={newsletter}
                  onCheckedChange={(v) => {
                    setNewsletter(v);
                    toast.success(`Đã ${v ? "bật" : "tắt"} bản tin hệ thống (mô phỏng)`);
                  }}
                  aria-label="Bản tin hệ thống"
                />
              </div>
            </div>
          </SketchCard>
        </div>

        {/* Cột phụ */}
        <aside className="space-y-5" aria-label="Thông tin bổ trợ">
          <NoteCard tone="yellow" title="Tài khoản demo" tapeVariant="warm">
            Dữ liệu trong trang là mẫu — mọi thay đổi chỉ tồn tại trong phiên làm việc này, tải lại
            là sạch như tờ giấy mới.
          </NoteCard>

          <SketchCard hover={false} className="p-4" as="section" aria-label="Phím tắt">
            <p className="eyebrow !text-[0.62rem]">Phím tắt</p>
            <ul className="mt-2.5 space-y-2.5">
              {[
                { key: "/", label: "Tìm nhanh trang" },
                { key: "Esc", label: "Đóng hộp thoại / menu" },
                { key: "Enter", label: "Xác nhận trong biểu mẫu" },
              ].map((row) => (
                <li key={row.key} className="flex items-center justify-between gap-3">
                  <span className="text-[0.8rem] text-[var(--ink-soft)]">{row.label}</span>
                  <kbd className="rounded-[5px] border-2 border-[var(--ink)] bg-[var(--paper)] px-2 py-0.5 font-mono text-xs font-bold text-[var(--ink)] shadow-ink-2">
                    {row.key}
                  </kbd>
                </li>
              ))}
            </ul>
          </SketchCard>

          <InkButton
            variant="ghost"
            className="w-full justify-between"
            onClick={() => navigate("overview")}
          >
            <span className="inline-flex items-center gap-2">
              <VDashboard size={16} /> Xem bảng điều hướng chính
            </span>
            <VArrowRight size={16} aria-hidden="true" />
          </InkButton>

          <MarginNote>quay lại nơi bắt đầu cũng là một cách nghỉ tay</MarginNote>
        </aside>
      </div>
    </div>
  );
}
