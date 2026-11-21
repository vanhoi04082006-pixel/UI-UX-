"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  VArrowRight,
  VChevronDown,
  VKey,
  VLock,
  VRefresh,
  VUsers,
} from "@/components/icons/v-icons";
import { InkBadge, SketchCard, StampMoc } from "@/components/notebook/ui";
import { InkButton } from "@/components/notebook/reveal";
import { listDemoAccounts, type DemoAccount } from "@/lib/api/auth";
import { useApi } from "@/lib/use-api";
import type { Role } from "@/lib/mock/types";
import { cn } from "@/lib/utils";

/* =====================================================================
 * DEMO ACCOUNT PANEL — dải "Tài khoản demo" của màn đăng nhập.
 * 12 tài khoản nhóm theo vai trò (SV / GV / QTT), kèm chip trạng thái
 * nghiệp vụ: đang hoạt động, chờ phân công, hoàn thành, bị khóa (403)
 * và "cần đổi mật khẩu" (luồng đổi mật khẩu bắt buộc lần đầu).
 * Trên mobile dải này gấp lại thành accordion; desktop mở sẵn.
 * ===================================================================== */

type DemoFilter = "all" | "active" | "special";

const FILTERS: { key: DemoFilter; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "active", label: "Đang hoạt động" },
  { key: "special", label: "Trường hợp đặc biệt" },
];

const CHIP_CLS = "!gap-1 !px-2 !py-0 !text-[0.64rem] [&_svg]:h-3 [&_svg]:w-3";

/* Mật khẩu demo mặc định theo vai trò — endpoint mới (và BE thật) không trả
 * password về FE; bản preview gắn lại giá trị mặc định phía client để giữ
 * nguyên chip mật khẩu hiển thị sẵn + đăng nhập nhanh của dải demo. */
const DEMO_PASSWORD: Record<Role, string> = {
  intern: "Sv@2026",
  instructor: "Gv@2026",
  admin: "Adm@2026",
};

/** DemoAccount kèm mật khẩu mặc định — đúng hình dáng dữ liệu cũ của panel. */
export type DemoAccountRow = DemoAccount & { password: string };

function withDefaultPassword(account: DemoAccount): DemoAccountRow {
  return { ...account, password: DEMO_PASSWORD[account.role] };
}

/** Trường hợp đặc biệt: bị khóa HOẶC đang treo cờ phải đổi mật khẩu mặc định. */
function isSpecial(a: DemoAccountRow) {
  return a.status === "locked" || a.mustChangePassword === true;
}

const AVATAR_TONE: Record<"intern" | "instructor" | "admin" | "locked", string> = {
  intern: "bg-[var(--royal)] text-white dark:text-[#101018]",
  instructor: "bg-[var(--note-yellow)] text-[var(--note-yellow-ink)]",
  admin: "bg-[var(--note-mint)] text-[var(--note-mint-ink)]",
  locked: "bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] text-[var(--danger)]",
};

/** Lấy 2 chữ cái đầu của 2 từ cuối trong tên (khớp logic khởi tạo phía server). */
function initialsOf(name: string): string {
  const words = name
    .split(/\s+/)
    .filter((w) => /[a-zA-ZÀ-ỹ]/.test(w[0] ?? ""));
  return words
    .slice(-2)
    .map((w) => (w[0] ?? "").toUpperCase())
    .join("");
}

/** Chip trạng thái nghiệp vụ — tài khoản đặc biệt có thể mang 2 chip cùng lúc. */
function StateChips({ account }: { account: DemoAccountRow }) {
  const chips: ReactNode[] = [];
  if (account.status === "locked") {
    chips.push(
      <InkBadge key="locked" tone="red" className={CHIP_CLS}>
        <VLock size={12} />
        Bị khóa
      </InkBadge>,
    );
  } else {
    if (account.role === "intern" && account.internState === "waiting") {
      chips.push(
        <InkBadge key="state" tone="amber" className={CHIP_CLS}>
          Chờ phân công
        </InkBadge>,
      );
    } else if (account.role === "intern" && account.internState === "finished") {
      chips.push(
        <InkBadge key="state" tone="mint" className={CHIP_CLS}>
          Hoàn thành
        </InkBadge>,
      );
    } else if (account.role === "intern") {
      chips.push(
        <InkBadge key="state" tone="green" dot className={CHIP_CLS}>
          Đang thực tập
        </InkBadge>,
      );
    } else {
      chips.push(
        <InkBadge key="state" tone="green" dot className={CHIP_CLS}>
          Đang hoạt động
        </InkBadge>,
      );
    }
    if (account.mustChangePassword) {
      chips.push(
        <InkBadge
          key="must-change"
          tone="amber"
          className={cn(
            CHIP_CLS,
            "!border-[var(--gold)] !bg-[var(--gold-soft)] !text-[var(--gold)]",
          )}
        >
          <VKey size={12} />
          Cần đổi mật khẩu
        </InkBadge>,
      );
    }
  }
  return <>{chips}</>;
}

function AccountRow({
  account,
  busy,
  disabled,
  onPick,
}: {
  account: DemoAccountRow;
  busy: boolean;
  disabled: boolean;
  onPick: (account: DemoAccountRow) => void;
}) {
  const avatarTone = AVATAR_TONE[account.status === "locked" ? "locked" : account.role];
  /* Băng washi đổi màu theo loại tài khoản: đỏ cho khóa, vàng son cho cần đổi MK. */
  const washiTone = account.status === "locked"
    ? "bg-[color-mix(in_srgb,var(--danger)_22%,#fff_30%)]"
    : account.mustChangePassword
      ? "bg-[color-mix(in_srgb,var(--gold)_28%,#fff_30%)]"
      : "bg-[color-mix(in_srgb,var(--royal)_24%,#fff_30%)]";
  return (
    <button
      type="button"
      onClick={() => onPick(account)}
      disabled={disabled}
      aria-label={`Đăng nhập nhanh bằng tài khoản ${account.name} (${account.email})`}
      className="group relative flex w-full items-center gap-3 rounded-[10px_13px_11px_12px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] p-3 text-left shadow-ink-2 transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-ink-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)] disabled:cursor-wait disabled:opacity-60"
    >
      {/* Miếng washi nhỏ — bung nhẹ khi hover */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute -top-2 left-8 h-3.5 w-14 -rotate-3 rounded-[2px] opacity-70 shadow-[0_1px_2px_rgba(23,23,28,0.18)] transition-all duration-200 group-hover:-translate-y-1 group-hover:-rotate-6 group-hover:opacity-95",
          washiTone,
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-full border-2 border-[var(--ink)] text-[0.78rem] font-extrabold",
          avatarTone,
        )}
      >
        {initialsOf(account.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-[0.84rem] font-bold leading-tight text-[var(--ink)]">
            {account.name}
          </span>
          <StateChips account={account} />
        </span>
        <span className="mt-0.5 block truncate text-[0.72rem] font-medium text-[var(--ink-soft)]">
          {account.title}
        </span>
        <span className="mt-0.5 block truncate text-[0.7rem] text-[var(--ink-soft)] opacity-80">
          {account.note}
        </span>
      </span>
      {/* Chip mật khẩu — nét đứt, font mono */}
      <span className="shrink-0 rounded-md border border-dashed border-[var(--ink-soft)] px-1.5 py-1 font-mono2 text-[0.66rem] font-medium text-[var(--ink-soft)]">
        {account.password}
      </span>
      {busy ? (
        <span
          aria-hidden="true"
          className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[color-mix(in_srgb,var(--ink)_22%,transparent)] border-t-[var(--royal)]"
        />
      ) : (
        <VArrowRight
          size={16}
          className="hidden shrink-0 text-[var(--ink-faint)] transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-[var(--royal)] sm:block"
        />
      )}
    </button>
  );
}

export function DemoAccountPanel({
  onPick,
  pendingId,
}: {
  onPick: (account: DemoAccountRow) => void;
  pendingId: string | null;
}) {
  const { data, loading, error, reload } = useApi<DemoAccount[]>(listDemoAccounts, []);
  const [filter, setFilter] = useState<DemoFilter>("all");
  const [open, setOpen] = useState(false);

  /* Desktop (lg+) mở sẵn danh sách; mobile để người dùng bấm mở cho gọn. */
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const autoOpen = () => {
      if (mq.matches) setOpen(true);
    };
    autoOpen();
    mq.addEventListener("change", autoOpen);
    return () => mq.removeEventListener("change", autoOpen);
  }, []);

  const all = (data ?? []).map(withDefaultPassword);
  const countFor = (key: DemoFilter) =>
    key === "all"
      ? all.length
      : key === "active"
        ? all.filter((a) => !isSpecial(a)).length
        : all.filter(isSpecial).length;

  const visible = all.filter((a) =>
    filter === "all" ? true : filter === "active" ? !isSpecial(a) : isSpecial(a),
  );

  const groups = [
    { key: "sv", label: "Sinh viên", accounts: visible.filter((a) => a.role === "intern") },
    { key: "gv", label: "Giảng viên", accounts: visible.filter((a) => a.role === "instructor") },
    { key: "qt", label: "Quản trị viên", accounts: visible.filter((a) => a.role === "admin") },
  ].filter((g) => g.accounts.length > 0);

  return (
    <section aria-label="Tài khoản demo" className="mt-6">
      <SketchCard hover={false} className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px_12px_10px_12px] border-2 border-[var(--ink)] bg-[var(--blue-mist)] text-[var(--royal-deep)] shadow-ink-2"
          >
            <VUsers size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="text-[0.95rem] font-bold leading-tight text-[var(--ink)]">
                Tài khoản demo — bấm để đăng nhập ngay
              </h2>
              {!loading && !error ? (
                <InkBadge tone="blue" className="!px-2 !py-0 !text-[0.62rem] tabular">
                  {countFor("all")} tài khoản
                </InkBadge>
              ) : null}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--ink-soft)]">
              <span>
                {loading
                  ? "đang tải danh sách tài khoản mẫu…"
                  : `${countFor("all")} tài khoản mẫu — mọi trường hợp nghiệp vụ`}
              </span>
              {!loading && !error ? (
                <StampMoc tone="blue" rotate={-5} className="!gap-1 !px-1.5 !py-0 !text-[0.55rem]">
                  demo
                </StampMoc>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="demo-account-list"
            aria-label={
              open ? "Thu gọn danh sách tài khoản demo" : "Mở rộng danh sách tài khoản demo"
            }
            className="focus-ink ml-1 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px_10px_9px_10px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--ink-soft)] shadow-ink-2 transition-all duration-150 hover:-translate-y-0.5 hover:text-[var(--ink)] hover:shadow-ink-3"
          >
            <VChevronDown
              size={16}
              className={cn("transition-transform duration-200", open && "rotate-180")}
            />
          </button>
        </div>

        {open ? (
          <div id="demo-account-list" className="mt-4">
            <div
              aria-hidden="true"
              className="mb-4 border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)]"
            />

            {loading ? (
              <div
                className="space-y-2.5"
                aria-busy="true"
                aria-label="Đang tải danh sách tài khoản demo"
              >
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-[10px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_16%,transparent)] p-3"
                  >
                    <div className="skeleton-pencil-block h-10 w-10 shrink-0 !rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="skeleton-pencil-block h-3.5 w-2/5" />
                      <div className="skeleton-pencil-block h-3 w-3/5" />
                    </div>
                    <div className="skeleton-pencil-block h-6 w-16 shrink-0" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-3 py-5 text-center">
                <p className="text-sm text-[var(--ink-soft)]">
                  Không tải được danh sách tài khoản demo.
                </p>
                <InkButton type="button" variant="outline" size="sm" onClick={reload}>
                  <VRefresh size={15} />
                  Thử lại
                </InkButton>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Chip lọc nhanh — Tất cả / hoạt động / trường hợp đặc biệt */}
                <div
                  className="flex flex-wrap items-center gap-2"
                  role="group"
                  aria-label="Lọc tài khoản demo theo trạng thái"
                >
                  {FILTERS.map((f) => {
                    const active = filter === f.key;
                    return (
                      <button
                        key={f.key}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setFilter(f.key)}
                        className={cn(
                          "focus-ink tabular rounded-full border-2 px-3 py-1 text-[0.72rem] font-bold transition-all duration-150",
                          active
                            ? "border-[var(--ink)] bg-[var(--royal)] text-white shadow-ink-2 dark:text-[#101018]"
                            : "border-[color-mix(in_srgb,var(--ink)_30%,transparent)] text-[var(--ink-soft)] hover:border-[var(--ink)] hover:text-[var(--ink)]",
                        )}
                      >
                        {f.label}
                        <span className="ml-1 opacity-80">{countFor(f.key)}</span>
                      </button>
                    );
                  })}
                </div>

                {groups.length === 0 ? (
                  <p className="py-4 text-center font-hand text-[0.95rem] text-[var(--pencil)]">
                    không có tài khoản nào trong mục này ✎
                  </p>
                ) : (
                  groups.map((g) => (
                    <div key={g.key} aria-label={g.label} className="space-y-2.5">
                      <p className="eyebrow !text-[0.62rem]">{g.label}</p>
                      <div className="space-y-2.5">
                        {g.accounts.map((acc) => (
                          <AccountRow
                            key={acc.id}
                            account={acc}
                            busy={pendingId === acc.id}
                            disabled={pendingId !== null}
                            onPick={onPick}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}

                <p className="pt-1 text-center font-hand text-[0.92rem] text-[var(--pencil)]">
                  mật khẩu hiển thị sẵn vì đây là hệ thống demo ✎
                </p>
              </div>
            )}
          </div>
        ) : null}
      </SketchCard>
    </section>
  );
}
