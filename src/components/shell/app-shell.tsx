"use client";

import { AnimatePresence, motion } from "framer-motion";
import { VX } from "@/components/icons/v-icons";
import { useEffect, useState } from "react";
import { Stagger, StaggerItem } from "@/components/notebook/reveal";
import { InkBadge } from "@/components/notebook/ui";
import {
  VAward,
  VBell,
  VBot,
  VBook,
  VChartColumn,
  VClipboardCheck,
  VColumns,
  VFileText,
  VGithub,
  VHome,
  VKanban,
  VListTodo,
  VLogo,
  VLogoMark,
  VLogout,
  VMenu,
  VNotebookPen,
  VPanelLeft,
  VPencil,
  VSearch,
  VSettings,
  VShapes,
  VShield,
  VSparkles,
  VStampTool,
  VTarget,
  VTrend,
  VHistory,
  VUser,
  VUsers,
} from "@/components/icons/v-icons";
import {
  ShellNotifContext,
  useShellNotif,
  useShellNotifications,
} from "@/components/shared/bell-utils";
import { NotificationBell } from "@/components/shared/notification-bell";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NAV_CONFIG, routeLabel, useApp } from "@/lib/store";
import type { InternState, Role, SessionUser } from "@/lib/types";
import type { VIconComponent } from "@/components/icons/v-icons";

import StudentOverview from "@/components/student/student-overview";
import StudentWork from "@/components/student/student-work";
import StudentSprint from "@/components/student/student-sprint";
import StudentMentor from "@/components/student/student-mentor";
import StudentGithub from "@/components/student-ext/student-github";
import StudentRecruitment from "@/components/student-ext/student-recruitment";
import StudentPerformance from "@/components/student-ext/student-performance";
import StudentEvaluations from "@/components/student/student-evaluations";
import StudentKpi from "@/components/student/student-kpi";
import StudentCertificates from "@/components/student/student-certificates";
import StudentNotifications from "@/components/student/student-notifications";
import StudentProfile from "@/components/student/student-profile";
import InstructorOverview from "@/components/staff/instructor-overview";
import InstructorSessions from "@/components/staff/instructor-sessions";
import InstructorSprints from "@/components/staff/instructor-sprints";
import InstructorGrading from "@/components/staff/instructor-grading";
import InstructorReports from "@/components/staff/instructor-reports";
import InstructorOperations from "@/components/staff-ext/instructor-operations";
import StaffGithub from "@/components/staff-ext/staff-github";
import InstructorEvaluation from "@/components/staff-ext/instructor-evaluation";
import InstructorPerformance from "@/components/staff-ext/instructor-performance";
import InstructorAiPlan from "@/components/staff-ext/instructor-ai-plan";
import ProjectsLibrary from "@/components/staff-ext/projects-library";
import AdminOverview from "@/components/staff/admin-overview";
import AdminUsers from "@/components/staff/admin-users";
import AdminQuestions from "@/components/staff/admin-questions";
import AdminTemplates from "@/components/staff/admin-templates";
import AdminRecruitment from "@/components/staff-ext/admin-recruitment";
import AdminEvaluation from "@/components/staff-ext/admin-evaluation";
import AdminKpi from "@/components/staff-ext/admin-kpi";
import AdminGroups from "@/components/staff-ext/admin-groups";
import AdminKnowledge from "@/components/staff-ext/admin-knowledge";
import AdminCatalogs from "@/components/staff-ext/admin-catalogs";
import AdminCertificates from "@/components/staff-ext/admin-certificates";
import AdminSystem from "@/components/staff-ext/admin-system";
import AdminAudit from "@/components/staff-ext/admin-audit";
import StaffNotifications from "@/components/staff/staff-notifications";
import StaffProfile from "@/components/staff/staff-profile";

/* Icon theo route key — dùng bộ V-Icons riêng của hệ thống. */
const ROUTE_ICONS: Record<string, VIconComponent> = {
  overview: VHome,
  work: VListTodo,
  sprint: VKanban,
  mentor: VBot,
  github: VGithub,
  recruitment: VSparkles,
  evaluations: VClipboardCheck,
  kpi: VChartColumn,
  certificates: VAward,
  performance: VTrend,
  notifications: VBell,
  profile: VUser,
  sessions: VUsers,
  operations: VTarget,
  sprints: VColumns,
  projects: VShapes,
  grading: VPencil,
  reports: VFileText,
  "ai-plan": VBot,
  users: VUsers,
  groups: VUsers,
  audit: VHistory,
  questions: VBook,
  templates: VShapes,
  cycles: VClipboardCheck,
  knowledge: VBook,
  catalogs: VStampTool,
  system: VSettings,
};

const ROLE_LABEL: Record<Role, string> = {
  intern: "Sinh viên",
  instructor: "Giảng viên",
  admin: "Quản trị viên",
};

const ROLE_ICON: Record<Role, VIconComponent> = {
  intern: VNotebookPen,
  instructor: VClipboardCheck,
  admin: VShield,
};

/* Badge trạng thái sinh viên cho thẻ người dùng sidebar. */
const INTERN_STATE_META: Record<InternState, { label: string; tone: string }> = {
  active: { label: "Đang thực tập", tone: "blue" },
  waiting: { label: "Chờ phân công", tone: "amber" },
  finished: { label: "Hoàn thành", tone: "green" },
};

/* Các route khóa với sinh viên "chờ phân công". */
const WAITING_BLOCKED_KEYS = ["work", "sprint", "mentor", "evaluations", "kpi", "certificates"];

function isRouteAvailable(user: SessionUser, key: string): boolean {
  return !(user.role === "intern" && user.internState === "waiting" && WAITING_BLOCKED_KEYS.includes(key));
}

/* =====================================================================
 * SIDEBAR — dùng chung desktop & drawer mobile.
 * ===================================================================== */
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const user = useApp((s) => s.user)!;
  const route = useApp((s) => s.route);
  const navigate = useApp((s) => s.navigate);
  const { unreadCount } = useShellNotif();
  const groups = NAV_CONFIG[user.role].groups;
  const RoleIcon = ROLE_ICON[user.role];
  const stateMeta =
    user.role === "intern" && user.internState ? INTERN_STATE_META[user.internState] : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Logo + nhãn vai trò */}
      <div className="border-b-2 border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)] px-4 pb-4 pt-5">
        <button
          type="button"
          onClick={() => navigate("overview")}
          className="focus-ink block text-left transition-transform hover:-rotate-1"
          aria-label="V-Intern — về Tổng quan"
        >
          <VLogo size={26} className="text-[var(--ink)]" />
        </button>
        <div className="mt-3 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md border-2 border-[var(--ink)] bg-[var(--blue-mist)] text-[var(--royal)]">
            <RoleIcon size={15} />
          </span>
          <div className="leading-tight">
            <p className="text-[0.8rem] font-bold">{ROLE_LABEL[user.role]}</p>
            <p className="text-[0.68rem] text-[var(--ink-soft)]">
              {user.role === "intern" && user.internState === "waiting"
                ? "Đang chờ phân công"
                : user.role === "intern" && user.internState === "finished"
                  ? "Kỳ thực tập đã hoàn thành"
                  : user.title.split("·")[1]?.trim() ?? "Không gian làm việc"}
            </p>
          </div>
        </div>
      </div>

      {/* Điều hướng nhóm — stagger entrance (tôn trọng reduced-motion) */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Điều hướng chính">
        <Stagger>
          {groups.map((group) => (
            <StaggerItem key={group.label} className="mb-4">
              <p className="eyebrow mb-1.5 px-2 !text-[0.62rem]">{group.label}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = ROUTE_ICONS[item.key] ?? VListTodo;
                  const active = route === item.key;
                  const available = isRouteAvailable(user, item.key);
                  return (
                    <li key={item.key}>
                      <button
                        type="button"
                        disabled={!available}
                        onClick={() => {
                          navigate(item.key);
                          onNavigate?.();
                        }}
                        aria-current={active ? "page" : undefined}
                        title={available ? item.label : "Chưa khả dụng — cần dự án được phân công"}
                        className={`focus-ink flex min-h-11 w-full items-center gap-2.5 rounded-[9px_11px_9px_11px] px-3 text-left text-[0.85rem] font-semibold transition-all ${
                          active
                            ? "nav-marker glow-ring border-2 border-[var(--ink)]"
                            : available
                              ? "hover:-translate-y-px hover:bg-[var(--blue-mist)]"
                              : "cursor-not-allowed opacity-35"
                        }`}
                      >
                        <Icon size={17} className="shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <InkBadge tone="neutral" className="shrink-0 px-1.5 py-0 text-[0.58rem]">
                            {item.badge}
                          </InkBadge>
                        )}
                        {item.key === "notifications" && unreadCount > 0 && (
                          <InkBadge
                            key={unreadCount}
                            tone="blue"
                            dot
                            className="animate-pop-in shrink-0 px-1.5 py-0 tabular text-[0.58rem]"
                          >
                            {unreadCount > 99 ? "99+" : String(unreadCount)}
                          </InkBadge>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </StaggerItem>
          ))}
        </Stagger>
      </nav>

      {/* Ghi chú chờ phân công + thẻ người dùng */}
      <div className="border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)] p-3">
        {user.role === "intern" && user.internState === "waiting" && (
          <div className="ants-border mb-2.5 rounded-[10px] bg-[var(--paper-raised)] px-3 py-2.5">
            <p className="font-hand text-[0.82rem] leading-snug text-[var(--ink-soft)]">
              Đang chờ phân công dự án — Công việc, Sprint, Đánh giá, KPI & Chứng nhận sẽ mở ngay
              khi bạn được gán vào nhóm ✎
            </p>
          </div>
        )}
        <div className="sticker-pop flex items-center gap-2.5 rounded-[10px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] p-2.5 shadow-ink-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--royal)] text-xs font-extrabold text-white dark:text-[#101018]">
            {user.initials}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[0.8rem] font-bold">{user.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <InkBadge tone="neutral" className="px-1.5 py-0 text-[0.56rem]">
                {ROLE_LABEL[user.role]}
              </InkBadge>
              {stateMeta && (
                <InkBadge tone={stateMeta.tone} dot className="px-1.5 py-0 text-[0.56rem]">
                  {stateMeta.label}
                </InkBadge>
              )}
            </div>
            <p className="mt-1 truncate text-[0.66rem] text-[var(--ink-soft)]">{user.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
 * TOPBAR — breadcrumb + chip hệ thống + bảng lệnh + chuông + theme.
 * ===================================================================== */
function Topbar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const user = useApp((s) => s.user)!;
  const route = useApp((s) => s.route);
  const logout = useApp((s) => s.logout);
  const setSidebarOpen = useApp((s) => s.setSidebarOpen);

  return (
    <header className="no-print sticky top-0 z-40 flex h-16 items-center gap-2 border-b-2 border-[var(--ink)] bg-[var(--paper)] px-3 sm:px-4">
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        aria-label="Mở menu"
        className="focus-ink grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-2 lg:hidden"
      >
        <VMenu size={18} />
      </button>

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex items-center gap-1.5 text-[0.78rem] text-[var(--ink-soft)]">
          <li className="hidden shrink-0 sm:flex" aria-hidden="true">
            <VLogoMark size={15} className="text-[var(--ink)]" />
          </li>
          <li className="hidden sm:inline">V-Intern</li>
          <li aria-hidden="true" className="hidden sm:inline">/</li>
          <li>{ROLE_LABEL[user.role]}</li>
          <li aria-hidden="true">/</li>
          <li className="truncate font-bold text-[var(--ink)]">{routeLabel(user.role, route)}</li>
        </ol>
      </nav>

      {/* Trạng thái hệ thống (desktop) */}
      <span
        title="Uptime 99.7%"
        aria-label="Hệ thống hoạt động — uptime 99,7%"
        className="hidden shrink-0 items-center gap-2 rounded-full border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_35%,transparent)] px-3 py-1.5 text-[0.72rem] font-semibold text-[var(--ink-soft)] lg:inline-flex"
      >
        <span className="ws-dot-live" aria-hidden="true" />
        Hệ thống hoạt động
      </span>

      <div className="flex shrink-0 items-center gap-2">
        {/* Bảng lệnh ⌘K */}
        <button
          type="button"
          onClick={onOpenPalette}
          aria-label="Mở bảng lệnh nhanh"
          aria-keyshortcuts="Control+K"
          title="Bảng lệnh nhanh — ⌘K hoặc /"
          className="focus-ink inline-flex h-10 items-center gap-2 rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] px-3.5 text-[var(--ink)] shadow-ink-2 transition-all hover:-translate-y-0.5 hover:bg-[var(--blue-mist)]"
        >
          <VSearch size={16} />
          <kbd className="hidden rounded-md border-2 border-[color-mix(in_srgb,var(--ink)_45%,transparent)] px-1.5 py-px font-geist-mono text-[0.62rem] font-bold text-[var(--ink-soft)] sm:inline-block">
            ⌘K
          </kbd>
        </button>

        <ThemeToggle />
        <NotificationBell />
        <button
          type="button"
          onClick={logout}
          aria-label="Đăng xuất"
          title="Đăng xuất"
          className="focus-ink inline-flex h-10 items-center gap-2 rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] px-3 text-[0.78rem] font-bold text-[var(--ink)] shadow-ink-2 transition-all hover:-translate-y-0.5 hover:bg-[var(--note-pink)] hover:text-[var(--note-pink-ink)]"
        >
          <VLogout size={16} />
          <span className="hidden md:inline">Đăng xuất</span>
        </button>
      </div>
    </header>
  );
}

/* =====================================================================
 * COMMAND PALETTE — ⌘K / Ctrl+K / "/" (cmdk trong Dialog notebook).
 * ===================================================================== */
const SEARCH_TARGET_TAGS = ["INPUT", "TEXTAREA", "SELECT"];

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (SEARCH_TARGET_TAGS.includes(target.tagName) || target.isContentEditable)
  );
}

/* Style dùng chung cho các nhóm & item trong palette (merge đè base shadcn). */
const PALETTE_GROUP_CLS =
  "[&_[cmdk-group-heading]]:font-hand [&_[cmdk-group-heading]]:text-[0.72rem] [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-[var(--ink-soft)]";
const PALETTE_ITEM_CLS =
  "gap-2.5 rounded-[9px_11px_9px_11px] px-3 py-2.5 text-[0.85rem] font-semibold data-[selected=true]:bg-[var(--blue-mist)] data-[selected=true]:text-[var(--ink)]";

function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const user = useApp((s) => s.user)!;
  const route = useApp((s) => s.route);
  const navigate = useApp((s) => s.navigate);
  const logout = useApp((s) => s.logout);
  const goLanding = useApp((s) => s.goLanding);
  const { unreadCount } = useShellNotif();
  const groups = NAV_CONFIG[user.role].groups;
  const unreadLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  /* ⌘K / Ctrl+K bật–tắt · "/" mở khi con trỏ không đang ở ô nhập */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
        return;
      }
      if (e.key === "/" && !isTypingTarget(e.target)) {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const close = () => onOpenChange(false);
  const go = (key: string) => {
    navigate(key);
    close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[12%] translate-y-0 gap-0 overflow-hidden rounded-[14px_18px_14px_18px] border-2 border-[var(--ink)] bg-[var(--paper)] p-0 shadow-ink-6 sm:max-w-[34rem]"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Bảng lệnh nhanh</DialogTitle>
          <DialogDescription>
            Tìm trang theo vai trò {ROLE_LABEL[user.role]} và các thao tác nhanh của V-Intern.
          </DialogDescription>
        </DialogHeader>

        <Command
          className="bg-transparent text-[var(--ink)] rounded-none
            [&_[data-slot=command-input-wrapper]]:h-12 [&_[data-slot=command-input-wrapper]]:gap-2.5
            [&_[data-slot=command-input-wrapper]]:border-b-2 [&_[data-slot=command-input-wrapper]]:border-[var(--ink)]
            [&_[data-slot=command-input-wrapper]]:bg-[var(--paper-raised)] [&_[data-slot=command-input-wrapper]]:px-4
            [&_[data-slot=command-input]]:text-[0.92rem]"
        >
          <CommandInput placeholder="Tìm trang hoặc thao tác… (phím / cũng mở được)" />
          <CommandList className="max-h-[min(22rem,60vh)] p-1.5">
            <CommandEmpty className="py-8 font-hand text-[0.95rem] text-[var(--ink-soft)]">
              Không tìm thấy trang nào — thử gõ từ khóa khác nhé ✎
            </CommandEmpty>

            {/* Điều hướng — toàn bộ route của vai trò hiện tại */}
            {groups.map((group) => (
              <CommandGroup key={group.label} heading={`Điều hướng · ${group.label}`} className={PALETTE_GROUP_CLS}>
                {group.items.map((item) => {
                  const Icon = ROUTE_ICONS[item.key] ?? VListTodo;
                  const available = isRouteAvailable(user, item.key);
                  return (
                    <CommandItem
                      key={item.key}
                      value={`${item.key} ${item.label}`}
                      disabled={!available}
                      onSelect={() => available && go(item.key)}
                      className={PALETTE_ITEM_CLS}
                    >
                      <Icon size={17} />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {route === item.key && (
                        <span className="ml-auto shrink-0 font-hand text-[0.65rem] text-[var(--royal)]">
                          đang xem
                        </span>
                      )}
                      {item.key === "notifications" && unreadCount > 0 && (
                        <span className="ml-auto grid min-w-[18px] shrink-0 place-items-center rounded-full border border-[var(--ink)] bg-[var(--royal)] px-1 text-[0.6rem] font-bold tabular text-white dark:text-[#101018]">
                          {unreadLabel}
                        </span>
                      )}
                      {!available && (
                        <span className="ml-auto shrink-0 text-[0.62rem] text-[var(--ink-faint)]">
                          chờ phân công
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}

            {/* Tài khoản */}
            <CommandGroup heading="Tài khoản" className={PALETTE_GROUP_CLS}>
              <CommandItem value="hồ sơ profile cá nhân" onSelect={() => go("profile")} className={PALETTE_ITEM_CLS}>
                <VUser size={17} />
                <span className="min-w-0 flex-1 truncate">Hồ sơ cá nhân</span>
              </CommandItem>
              <CommandItem value="thông báo notifications hộp thư" onSelect={() => go("notifications")} className={PALETTE_ITEM_CLS}>
                <VBell size={17} />
                <span className="min-w-0 flex-1 truncate">Hộp thư thông báo</span>
                {unreadCount > 0 && (
                  <span className="ml-auto grid min-w-[18px] shrink-0 place-items-center rounded-full border border-[var(--ink)] bg-[var(--royal)] px-1 text-[0.6rem] font-bold tabular text-white dark:text-[#101018]">
                    {unreadLabel}
                  </span>
                )}
              </CommandItem>
              <CommandItem
                value="đăng xuất logout"
                onSelect={() => {
                  close();
                  logout();
                }}
                className={PALETTE_ITEM_CLS}
              >
                <VLogout size={17} />
                <span className="min-w-0 flex-1 truncate">Đăng xuất</span>
              </CommandItem>
            </CommandGroup>

            {/* Trang chủ công khai */}
            <CommandGroup heading="Trang chủ công khai" className={PALETTE_GROUP_CLS}>
              <CommandItem
                value="trang chủ công khai landing v-intern"
                onSelect={() => {
                  close();
                  goLanding();
                }}
                className={PALETTE_ITEM_CLS}
              >
                <VLogoMark size={17} />
                <span className="min-w-0 flex-1 truncate">Về trang chủ công khai</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>

          <p className="flex items-center justify-center gap-2 border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_25%,transparent)] px-4 py-2 text-[0.65rem] text-[var(--ink-soft)]">
            <kbd className="rounded border border-[var(--ink-soft)] px-1 font-geist-mono text-[0.58rem]">esc</kbd>
            đóng
            <span aria-hidden="true">·</span>
            <kbd className="rounded border border-[var(--ink-soft)] px-1 font-geist-mono text-[0.58rem]">↵</kbd>
            mở trang
          </p>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function PageFor(role: Role, route: string) {
  if (role === "intern") {
    switch (route) {
      case "work": return <StudentWork />;
      case "sprint": return <StudentSprint />;
      case "mentor": return <StudentMentor />;
      case "github": return <StudentGithub />;
      case "recruitment": return <StudentRecruitment />;
      case "evaluations": return <StudentEvaluations />;
      case "kpi": return <StudentKpi />;
      case "certificates": return <StudentCertificates />;
      case "performance": return <StudentPerformance />;
      case "notifications": return <StudentNotifications />;
      case "profile": return <StudentProfile />;
      default: return <StudentOverview />;
    }
  }
  if (role === "instructor") {
    switch (route) {
      case "sessions": return <InstructorSessions />;
      case "operations": return <InstructorOperations />;
      case "sprints": return <InstructorSprints />;
      case "projects": return <ProjectsLibrary />;
      case "grading": return <InstructorGrading />;
      case "evaluations": return <InstructorEvaluation />;
      case "performance": return <InstructorPerformance />;
      case "ai-plan": return <InstructorAiPlan />;
      case "reports": return <InstructorReports />;
      case "notifications": return <StaffNotifications />;
      case "github": return <StaffGithub />;
      case "profile": return <StaffProfile />;
      default: return <InstructorOverview />;
    }
  }
  switch (route) {
    case "users": return <AdminUsers />;
    case "groups": return <AdminGroups />;
    case "recruitment": return <AdminRecruitment />;
    case "audit": return <AdminAudit />;
    case "questions": return <AdminQuestions />;
    case "templates": return <AdminTemplates />;
    case "projects": return <ProjectsLibrary />;
    case "cycles": return <AdminEvaluation />;
    case "kpi": return <AdminKpi />;
    case "knowledge": return <AdminKnowledge />;
    case "catalogs": return <AdminCatalogs />;
    case "certificates": return <AdminCertificates />;
    case "system": return <AdminSystem />;
    case "notifications": return <StaffNotifications />;
    case "profile": return <StaffProfile />;
    default: return <AdminOverview />;
  }
}

export default function AppShell() {
  const user = useApp((s) => s.user);
  const route = useApp((s) => s.route);
  const sidebarOpen = useApp((s) => s.sidebarOpen);
  const setSidebarOpen = useApp((s) => s.setSidebarOpen);
  const [paletteOpen, setPaletteOpen] = useState(false);

  /* Nguồn dữ liệu thông báo duy nhất của shell — chuông & badge sidebar
     cùng đọc từ context này (poll 45s + server-persisted read state). */
  const notif = useShellNotifications(user);

  /* Khi đăng xuất, AnimatePresence giữ shell cũ trong lúc mờ dần —
     user khi đó là null, trả về null thay vì crash đọc user.role. */
  if (!user) return null;

  return (
    <ShellNotifContext.Provider value={notif}>
      <div
        className="workspace-ui flex min-h-screen bg-[var(--paper)] text-[var(--ink)]"
        data-role={user.role}
      >
        {/* Sidebar desktop — gáy lò xo chỉ cho sinh viên */}
        <aside
          className={`no-print fixed inset-y-0 left-0 z-40 hidden w-60 border-r-2 border-[var(--ink)] bg-[var(--sidebar)] lg:block ${
            user.role === "intern" ? "spiral-edge" : ""
          }`}
        >
          <div className="h-full pt-0 pl-2">
            <SidebarContent />
          </div>
        </aside>

        {/* Drawer mobile — header có bảng lệnh + chuông; nav stagger */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.button
                type="button"
                aria-label="Đóng menu"
                className="fixed inset-0 z-40 bg-[rgba(23,23,28,0.45)] backdrop-blur-[2px] lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
              />
              <motion.aside
                className="no-print fixed inset-y-0 left-0 z-50 flex w-[17.5rem] flex-col border-r-2 border-[var(--ink)] bg-[var(--sidebar)] shadow-ink-6 lg:hidden"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 32 }}
                aria-label="Menu điều hướng"
              >
                <div className="flex shrink-0 items-center gap-2 border-b-2 border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)] px-3 pb-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSidebarOpen(false);
                      setPaletteOpen(true);
                    }}
                    aria-label="Mở bảng lệnh nhanh"
                    title="Bảng lệnh nhanh — / hoặc ⌘K"
                    className="focus-ink inline-flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_35%,transparent)] px-3 text-[0.75rem] font-semibold text-[var(--ink-soft)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
                  >
                    <VSearch size={14} />
                    <span className="truncate">Tìm nhanh…</span>
                    <kbd className="ml-auto shrink-0 rounded border border-[var(--ink-soft)] px-1 font-geist-mono text-[0.58rem]">
                      /
                    </kbd>
                  </button>
                  <NotificationBell />
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Đóng menu"
                    className="focus-ink grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)]"
                  >
                    <VX size={16} />
                  </button>
                </div>
                <div className="min-h-0 flex-1">
                  <SidebarContent onNavigate={() => setSidebarOpen(false)} />
                </div>
                <p className="flex shrink-0 items-center justify-center gap-1.5 border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)] py-2.5 text-center font-hand text-[0.72rem] text-[var(--ink-soft)]">
                  <VPanelLeft size={14} aria-hidden="true" />
                  Vuốt từ mép trái để quay lại
                </p>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Vùng nội dung */}
        <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
          <Topbar onOpenPalette={() => setPaletteOpen(true)} />
          <main id="workspace-content" className="mx-auto w-full max-w-[76rem] flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${user.role}-${route}`}
                initial={{ opacity: 0, y: 16, rotate: 0.2 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.26, ease: [0.21, 0.47, 0.32, 0.98] }}
              >
                {/* Lật trang: class re-key theo route, không đụng transform
                    của motion.div cha (chuyển trang vẫn fade mượt). */}
                <div className="page-curl-enter">{PageFor(user.role, route)}</div>
              </motion.div>
            </AnimatePresence>
          </main>
          <footer className="no-print mt-auto border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)] px-6 py-3 text-center text-[0.7rem] text-[var(--ink-soft)]">
            V-Intern · Sổ tay hành trình — bản demo với dữ liệu mẫu · <span className="font-hand">mọi con dấu đều đóng bằng cả trái tim ✎</span>
          </footer>
        </div>

        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      </div>
    </ShellNotifContext.Provider>
  );
}
