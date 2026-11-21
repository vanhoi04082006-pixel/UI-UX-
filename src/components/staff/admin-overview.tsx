"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  VAward,
  VArrowRight,
  VAlert,
  VApi,
  VBot,
  VBell,
  VBook,
  VCertificate,
  VChartColumn,
  VCheckCheck,
  VCode,
  VFolderKanban,
  VGithub,
  VGraduation,
  VInfo,
  VNotebookPen,
  VShapes,
  VUsers,
  VX,
  type VIconComponent,
} from "@/components/icons/v-icons";
import { relativeTimeVN } from "@/components/shared/bell-utils";
import { InkButton } from "@/components/notebook/reveal";
import {
  InkBadge,
  MarginNote,
  NoteCard,
  SketchCard,
} from "@/components/notebook/ui";
import { useApp } from "@/lib/store";
import { useApi } from "@/lib/use-api";
import { getAdminDashboard, listActivity, listUsers } from "@/lib/api/admin";
import type { ActivityItem, AdminUserRow } from "@/lib/mock/types";
import { cn } from "@/lib/utils";
import {
  CountUpNumber,
  PencilLines,
  ROLE_META,
  SectionError,
  StaffPageHeader,
  initialsOf,
  relativeVN,
} from "./staff-kit";

/* =====================================================================
 * TRANG QUẢN TRỊ — bảng điều khiển vận hành hệ thống V-Intern.
 * Ít trang trí, nhiều số liệu, mọi hành động rõ ràng.
 * ===================================================================== */

interface AdminStats {
  users: number;
  interns: number;
  instructors: number;
  admins: number;
  pendingAccounts: number;
  lockedAccounts: number;
  activeSessions: number;
  certificatesIssued: number;
  questions: number;
  templates: number;
  aiCallsToday: number;
  uptime: number;
}

interface OverviewPayload {
  stats: AdminStats;
  activity: ActivityItem[];
  recentUsers: AdminUserRow[];
}

type CounterKey =
  | "users"
  | "interns"
  | "activeSessions"
  | "certificatesIssued"
  | "questions"
  | "aiCallsToday";

const COUNTERS: { key: CounterKey; label: string; icon: VIconComponent; hint: string }[] = [
  { key: "users", label: "Người dùng", icon: VUsers, hint: "tổng tài khoản" },
  { key: "interns", label: "Sinh viên", icon: VGraduation, hint: "đang theo học" },
  { key: "activeSessions", label: "Phiên đang chạy", icon: VFolderKanban, hint: "phiên thực tập" },
  { key: "certificatesIssued", label: "Chứng nhận đã cấp", icon: VAward, hint: "toàn hệ thống" },
  { key: "questions", label: "Ngân hàng câu hỏi", icon: VNotebookPen, hint: "câu phỏng vấn" },
  { key: "aiCallsToday", label: "Lượt gọi AI hôm nay", icon: VBot, hint: "trong hạn mức" },
];

/* ---- Chuỗi 14 ngày mô phỏng (ổn định trong phiên, chỉ khai báo 1 lần) ---- */
const USAGE_LOGINS = [52, 61, 58, 47, 40, 44, 55, 63, 71, 66, 78, 84, 89, 82];
const USAGE_AI = [31, 38, 35, 42, 40, 48, 52, 46, 55, 61, 58, 64, 70, 67];

/** Icon theo dòng hoạt động — khớp bằng chuỗi con cho an toàn dữ liệu mới. */
const ACTIVITY_MODULE_ICON: Record<string, VIconComponent> = {
  "Người dùng": VUsers,
  "Ngân hàng câu hỏi": VBook,
  "Mẫu dự án": VShapes,
  "Phiên thực tập": VFolderKanban,
  KPI: VChartColumn,
  "Chứng nhận": VCertificate,
  "Cấu hình AI": VBot,
  AI: VBot,
  GitHub: VGithub,
};

function moduleIconFor(module: string): VIconComponent {
  const lower = module.toLowerCase();
  const key = Object.keys(ACTIVITY_MODULE_ICON).find((k) => lower.includes(k.toLowerCase()));
  return key ? ACTIVITY_MODULE_ICON[key] : VInfo;
}

/** Trạng thái dịch vụ mô phỏng — GitHub runner "chập chờn" khớp dòng ac-8. */
const SERVICE_ROWS: { name: string; detail: string; ok: boolean; icon: VIconComponent }[] = [
  { name: "API chính", detail: "api.v-intern.vn", ok: true, icon: VApi },
  { name: "AI Mentor", detail: "model glm-4.6", ok: true, icon: VBot },
  { name: "GitHub runner", detail: "sync-01 · chờ token mới", ok: false, icon: VGithub },
];

/** Chip chú giải màu cho biểu đồ. */
function ChartLegend({
  items,
}: {
  items: { label: string; color: string }[];
}) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink-soft)]">
          <span
            className="h-2.5 w-2.5 rounded-[3px] border border-[color-mix(in_srgb,var(--ink)_40%,transparent)]"
            style={{ background: item.color }}
            aria-hidden="true"
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/** Trạng thái thu gọn cho bảng "Người dùng mới nhất". */
function UserStatusMini({ status }: { status: AdminUserRow["status"] }) {
  if (status === "locked") return <InkBadge tone="red">Bị khóa</InkBadge>;
  if (status === "pending") return <InkBadge tone="amber">Chờ duyệt</InkBadge>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--success)]">
      <span
        className="ws-dot"
        style={{ background: "var(--success)", borderColor: "transparent" }}
        aria-hidden="true"
      />
      Hoạt động
    </span>
  );
}

export default function AdminOverview() {
  const user = useApp((s) => s.user);
  const navigate = useApp((s) => s.navigate);
  const reduced = useReducedMotion();
  const statsApi = useApi<AdminStats>(getAdminDashboard);
  const activityApi = useApi<ActivityItem[]>(listActivity);
  const usersApi = useApi<AdminUserRow[]>(listUsers);
  /* Payload tổng quan — gộp 3 endpoint contract (stats + activity + users). */
  const data = useMemo<OverviewPayload | null>(() => {
    if (!statsApi.data || !activityApi.data || !usersApi.data) return null;
    return {
      stats: statsApi.data,
      activity: activityApi.data,
      recentUsers: usersApi.data.slice(0, 5),
    };
  }, [statsApi.data, activityApi.data, usersApi.data]);
  const loading = statsApi.loading || activityApi.loading || usersApi.loading;
  const error = statsApi.error ?? activityApi.error ?? usersApi.error;
  const reload = () => {
    statsApi.reload();
    activityApi.reload();
    usersApi.reload();
  };
  const [nowLabel] = useState(() =>
    new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
  );

  /* ---- Chuỗi hoạt động 14 ngày (mô phỏng cục bộ) ---- */
  const usageSeries = useMemo(
    () =>
      USAGE_LOGINS.map((logins, i) => ({
        day: new Date(Date.now() - (USAGE_LOGINS.length - 1 - i) * 86_400_000).toLocaleDateString(
          "vi-VN",
          { day: "2-digit", month: "2-digit" },
        ),
        logins,
        ai: USAGE_AI[i],
      })),
    [],
  );

  /* ---- Trạng thái chờ ---- */
  if (loading && !data) {
    return (
      <div>
        <StaffPageHeader eyebrow="Vận hành hệ thống" title="Trang quản trị" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-pencil h-[86px] rounded-[10px]" />
          ))}
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <div className="skeleton-pencil h-[260px] rounded-[10px]" />
          <div className="skeleton-pencil h-[260px] rounded-[10px]" />
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <SketchCard hover={false} className="p-5">
            <PencilLines rows={6} />
          </SketchCard>
          <SketchCard hover={false} className="p-5">
            <PencilLines rows={5} />
          </SketchCard>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <SectionError message={error ?? "Chưa có dữ liệu tổng quan."} onRetry={reload} />;
  }

  const { stats, activity, recentUsers } = data;

  /* ---- Vòng tròn cơ cấu vai trò ---- */
  const roleSlices = [
    { key: "interns", label: "Sinh viên", value: stats.interns, color: "var(--royal)" },
    { key: "instructors", label: "Giảng viên", value: stats.instructors, color: "var(--gold)" },
    { key: "admins", label: "Quản trị", value: stats.admins, color: "var(--danger)" },
  ];
  const roleTotal = stats.interns + stats.instructors + stats.admins;

  const quickLinks: { route: string; label: string; icon: VIconComponent; hint: string }[] = [
    { route: "users", label: "Người dùng", icon: VUsers, hint: `${stats.users} tài khoản` },
    {
      route: "questions",
      label: "Ngân hàng câu hỏi",
      icon: VNotebookPen,
      hint: `${stats.questions} câu hỏi`,
    },
    { route: "templates", label: "Mẫu dự án", icon: VCode, hint: `${stats.templates} mẫu` },
    { route: "notifications", label: "Thông báo", icon: VBell, hint: "Hộp thư hệ thống" },
  ];

  return (
    <div>
      {/* Tiêu đề + dải meta đơn sắc */}
      <StaffPageHeader
        eyebrow="Vận hành hệ thống"
        title="Trang quản trị"
        icon={VChartColumn}
        meta={`Quản trị viên · ${user?.name ?? "—"} · cập nhật ${nowLabel}`}
      />

      {/* Hàng số liệu đếm chạy — ô AI mang hào quang vàng */}
      <div
        className="nb-stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
        style={{ "--glow-tone": "var(--gold)" } as CSSProperties}
      >
        {COUNTERS.map(({ key, label, icon: Icon, hint }) => (
          <SketchCard
            key={key}
            hover={false}
            className={cn(
              "p-4",
              key === "aiCallsToday" && "badge-glow",
            )}
          >
            <div className="flex items-center gap-2 text-[var(--ink-soft)]">
              <Icon size={16} className="shrink-0 text-[var(--royal)]" />
              <span className="truncate text-[0.68rem] font-bold uppercase tracking-wide">
                {label}
              </span>
            </div>
            <CountUpNumber
              value={stats[key]}
              className="mt-2 block text-[1.65rem] font-extrabold leading-none text-[var(--ink)]"
            />
            <p className="mt-1.5 text-[0.68rem] text-[var(--ink-soft)]">{hint}</p>
          </SketchCard>
        ))}
      </div>

      {/* Hàng biểu đồ: hoạt động 14 ngày | cơ cấu vai trò */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* Hoạt động nền tảng · 14 ngày */}
        <SketchCard hover={false} className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
            <h2 className="text-base font-extrabold">Hoạt động nền tảng · 14 ngày</h2>
            <InkBadge tone="neutral" className="tabular !text-[0.62rem]">
              chuỗi mô phỏng
            </InkBadge>
          </div>
          <div className="chart-ink mt-3 h-[196px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={usageSeries} margin={{ top: 8, right: 6, bottom: 0, left: -14 }}>
                <defs>
                  <linearGradient id="ovUsageLogins" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--royal)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--royal)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="ovUsageAi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--gold)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={{ stroke: "var(--ink-soft)" }}
                  interval={1}
                  tick={{ fill: "var(--ink-soft)", fontSize: 10 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  tick={{ fill: "var(--ink-soft)", fontSize: 10 }}
                />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="logins"
                  name="Đăng nhập"
                  stroke="var(--royal)"
                  strokeWidth={2.5}
                  fill="url(#ovUsageLogins)"
                  dot={false}
                  isAnimationActive={!reduced}
                />
                <Area
                  type="monotone"
                  dataKey="ai"
                  name="Lượt gọi AI"
                  stroke="var(--gold)"
                  strokeWidth={2.5}
                  fill="url(#ovUsageAi)"
                  dot={false}
                  isAnimationActive={!reduced}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <ChartLegend
            items={[
              { label: "Đăng nhập / ngày", color: "var(--royal)" },
              { label: "Lượt gọi AI / ngày", color: "var(--gold)" },
            ]}
          />
          <MarginNote className="mt-2.5 !text-[0.85rem]">
            cuối tuần thưa thớt là bình thường — đồi giữa tuần mới đáng mừng
          </MarginNote>
        </SketchCard>

        {/* Cơ cấu vai trò — donut */}
        <SketchCard hover={false} className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
            <h2 className="text-base font-extrabold">Cơ cấu người dùng</h2>
            <InkBadge tone="blue" className="tabular !text-[0.62rem]">
              {stats.pendingAccounts} chờ duyệt
            </InkBadge>
          </div>
          <div
            className="relative mt-3 h-[196px]"
            role="img"
            aria-label={`Biểu đồ cơ cấu người dùng: ${stats.interns} sinh viên, ${stats.instructors} giảng viên, ${stats.admins} quản trị viên`}
          >
            <div className="chart-ink h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Pie
                    data={roleSlices}
                    dataKey="value"
                    nameKey="label"
                    innerRadius="62%"
                    outerRadius="88%"
                    paddingAngle={2}
                    startAngle={90}
                    endAngle={-270}
                    stroke="var(--paper-raised)"
                    strokeWidth={2}
                    isAnimationActive={!reduced}
                  >
                    {roleSlices.map((slice) => (
                      <Cell key={slice.key} fill={slice.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <CountUpNumber
                  value={roleTotal}
                  className="block text-[1.7rem] font-extrabold leading-none text-[var(--ink)]"
                />
                <span className="mt-1 block text-[0.62rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                  người dùng
                </span>
              </div>
            </div>
          </div>
          <ChartLegend items={roleSlices.map((s) => ({ label: s.label, color: s.color }))} />
        </SketchCard>
      </div>

      {/* Hai cột: hoạt động + thao tác | ghi chú vận hành */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0 space-y-5">
          {/* Hoạt động gần đây — dòng thời gian cuộn được */}
          <SketchCard hover={false} className="flex flex-col p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-extrabold">Hoạt động gần đây</h2>
              <InkBadge tone="neutral" className="tabular !text-[0.65rem]">
                {activity.length} ghi chú
              </InkBadge>
            </div>
            <ul
              className="max-h-96 list-none space-y-0 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:var(--ink-soft)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[color-mix(in_srgb,var(--ink)_30%,transparent)]"
              aria-label="Dòng thời gian hoạt động hệ thống"
            >
              {activity.map((item) => {
                const ModuleIcon = moduleIconFor(item.module);
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "relative flex gap-3 pb-4 last:pb-0",
                      !item.ok &&
                        "rounded-[10px] bg-[color-mix(in_srgb,var(--danger)_7%,transparent)]",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-[13px] top-8 border-l-2 border-dashed border-[color-mix(in_srgb,var(--ink)_25%,transparent)]"
                    />
                    <span
                      className="relative z-10 mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)]"
                    >
                      <ModuleIcon
                        size={14}
                        className={cn(item.ok ? "text-[var(--royal)]" : "text-[var(--danger)]")}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <InkBadge tone="neutral" className="!px-2 !text-[0.62rem]">
                          {item.module}
                        </InkBadge>
                        {!item.ok && (
                          <VAlert size={13} className="text-[var(--danger)]" aria-label="Có lỗi" />
                        )}
                        <span className="tabular text-[0.68rem] text-[var(--ink-soft)]">
                          {relativeTimeVN(item.at)}
                        </span>
                        <span
                          className="ml-auto inline-flex shrink-0 items-center"
                          aria-label={item.ok ? "Thành công" : "Thất bại"}
                        >
                          {item.ok ? (
                            <VCheckCheck size={13} className="text-[var(--success)]" />
                          ) : (
                            <VX size={13} className="text-[var(--danger)]" />
                          )}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium leading-snug text-[var(--ink)]">
                        {item.label}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </SketchCard>

          {/* Thao tác quản trị — lối tắt */}
          <SketchCard hover={false} className="p-5">
            <h2 className="mb-3 text-base font-extrabold">Thao tác quản trị</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {quickLinks.map(({ route, label, icon: Icon, hint }) => (
                <button
                  key={route}
                  type="button"
                  onClick={() => navigate(route)}
                  className="focus-ink sketch-border-thin group flex items-center gap-3 bg-[var(--paper-raised)] px-3.5 py-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-ink-2"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] border-2 border-[var(--ink)] bg-[var(--blue-mist)] text-[var(--royal)]">
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-[var(--ink)]">
                      {label}
                    </span>
                    <span className="block truncate text-[0.68rem] text-[var(--ink-soft)]">
                      {hint}
                    </span>
                  </span>
                  <VArrowRight
                    size={16}
                    className="shrink-0 text-[var(--ink-soft)] transition-transform group-hover:translate-x-0.5"
                  />
                </button>
              ))}
            </div>
          </SketchCard>
        </div>

        {/* Cột phải — ghi chú vận hành */}
        <div className="space-y-5">
          <NoteCard tone="mint" title="Vận hành an toàn" tapeVariant="mint">
            Mọi thao tác nhạy cảm đều ghi <b>audit log</b>. Tài khoản bị khóa hiện mộc đỏ trên
            danh sách người dùng.
          </NoteCard>

          {/* Tài khoản chờ duyệt — viền kiến đang đi vòng */}
          <button
            type="button"
            onClick={() => navigate("users")}
            className="ants-border focus-ink flex w-full items-center gap-3.5 bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] px-4 py-3.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-ink-2"
            style={{ "--ants-color": "var(--warning)" } as CSSProperties}
          >
            <span className="tabular grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-[var(--warning)] text-lg font-extrabold text-[var(--warning)]">
              {stats.pendingAccounts}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold text-[var(--ink)]">
                Tài khoản chờ duyệt
              </span>
              <span className="block text-xs text-[var(--ink-soft)]">
                Xem trong trang Người dùng
              </span>
            </span>
            <VArrowRight size={17} className="shrink-0 text-[var(--warning)]" />
          </button>

          {/* Trạng thái dịch vụ */}
          <SketchCard hover={false} className="p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-base font-extrabold">Trạng thái dịch vụ</h2>
              <span className="tabular inline-flex items-center gap-1.5 text-xs font-bold text-[var(--success)]">
                <span className="ws-dot-live" aria-hidden="true" />
                {stats.uptime}% uptime
              </span>
            </div>
            <div
              className="mt-3 h-2.5 overflow-hidden rounded-full border-2 border-[var(--ink)] bg-[var(--paper)]"
              role="progressbar"
              aria-label="Tỷ lệ hoạt động ổn định 30 ngày qua"
              aria-valuenow={stats.uptime}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="bar-grow h-full rounded-full bg-[var(--success)]"
                style={{ width: `${stats.uptime}%` }}
              />
            </div>
            <ul className="mt-3 space-y-2.5">
              {SERVICE_ROWS.map(({ name, detail, ok, icon: Icon }) => (
                <li key={name} className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] border-2 border-[color-mix(in_srgb,var(--ink)_35%,transparent)] text-[var(--ink-soft)]">
                      <Icon size={14} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-bold text-[var(--ink)]">
                        {name}
                      </span>
                      <span className="block truncate font-mono text-[0.62rem] text-[var(--ink-soft)]">
                        {detail}
                      </span>
                    </span>
                  </span>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 text-[0.7rem] font-bold",
                      ok ? "text-[var(--success)]" : "text-[var(--warning)]",
                    )}
                  >
                    {ok ? (
                      <span className="ws-dot-live" aria-hidden="true" />
                    ) : (
                      <span
                        className="ws-dot"
                        style={{ background: "var(--warning)", borderColor: "transparent" }}
                        aria-hidden="true"
                      />
                    )}
                    {ok ? "Hoạt động" : "Chập chờn"}
                  </span>
                </li>
              ))}
            </ul>
            <MarginNote className="mt-2.5 !text-[0.85rem]">
              đỏ mới là chuyện, xanh là mặc định
            </MarginNote>
          </SketchCard>
        </div>
      </div>

      {/* Người dùng mới nhất */}
      <SketchCard hover={false} className="mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[var(--ink)] px-5 py-4">
          <h2 className="text-base font-extrabold">Người dùng mới nhất</h2>
          <InkButton variant="ghost" size="sm" onClick={() => navigate("users")}>
            Xem tất cả <VArrowRight size={14} />
          </InkButton>
        </div>
        <div className="overflow-x-auto">
          <table className="ink-table min-w-[720px]">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Hoạt động cuối</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((row) => (
                <tr key={row.id} className="sticker-pop">
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--blue-mist)] text-[0.65rem] font-extrabold text-[var(--royal)]">
                        {initialsOf(row.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold leading-tight text-[var(--ink)]">
                          {row.name}
                        </p>
                        <p className="truncate font-mono text-[0.68rem] text-[var(--ink-soft)]">
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
                    <UserStatusMini status={row.status} />
                  </td>
                  <td
                    className={cn(
                      "whitespace-nowrap text-[0.8rem] tabular text-[var(--ink-soft)]",
                    )}
                  >
                    {relativeVN(row.lastActive)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SketchCard>
    </div>
  );
}
