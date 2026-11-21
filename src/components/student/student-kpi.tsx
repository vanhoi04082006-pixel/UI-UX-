"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { listMyKpi, listMySalaryLedger } from "@/lib/api/outcomes";
import { useApi } from "@/lib/use-api";
import type { KpiMetric, KpiRecord, SalaryEntry } from "@/lib/mock/types";
import { cn } from "@/lib/utils";
import {
  InkBadge,
  MarginNote,
  NoteCard,
  SketchCard,
  StampMoc,
  formatDateTimeVN,
} from "@/components/notebook/ui";
import { SquiggleUnderline } from "@/components/notebook/doodles";
import { FadeIn, InkButton } from "@/components/notebook/reveal";
import {
  VChartColumn,
  VChevronDown,
  VCoins,
  VHistory,
  VInbox,
  VShield,
  VTarget,
  VThumbsUp,
  VWallet,
} from "@/components/icons/v-icons";
import {
  CountUpNumber,
  usePrefersReducedMotion,
} from "./student-shared";
import {
  EmptyFigure,
  ErrorPanel,
  LoadingPanel,
  PageHeading,
  fmtMoney,
} from "./nb-kit-5c2";

/* =====================================================================
 * KPI & LƯƠNG ẢO — bảng điểm tổng hợp theo kỳ + sổ giao dịch ảo.
 * Mọi con số đều truy được nguồn ghi nhận.
 * ====================================================================== */

type TabKey = "kpi" | "salary";

const SALARY_TYPE_TONE: Record<SalaryEntry["type"], string> = {
  KPI: "blue",
  Thưởng: "amber",
  "Điều chỉnh": "mint",
};

function TabButton({
  active,
  tabKey,
  icon: Icon,
  onClick,
  children,
}: {
  active: boolean;
  tabKey: TabKey;
  icon: typeof VChartColumn;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${tabKey}`}
      aria-selected={active}
      aria-controls={`panel-${tabKey}`}
      onClick={onClick}
      className={cn(
        "focus-ink relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all",
        active
          ? "border-2 border-[var(--ink)] bg-[var(--royal)] text-white shadow-ink-3 dark:text-[#101018]"
          : "border-2 border-transparent text-[var(--ink-soft)] hover:bg-[var(--blue-mist)] hover:text-[var(--ink)]",
      )}
    >
      <Icon size={16} />
      {children}
      {active && (
        <SquiggleUnderline className="absolute -bottom-1.5 left-3 right-3 h-2 text-[var(--royal)]" />
      )}
    </button>
  );
}

/* ----------------------------- TAB KPI ------------------------------ */

function MetricRow({
  m,
  maxWeight,
  open,
  onToggle,
}: {
  m: KpiMetric;
  maxWeight: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="border-b border-dashed border-[color-mix(in_srgb,var(--ink)_18%,transparent)] py-3 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="focus-ink flex w-full items-center gap-3 rounded-[10px] px-1 py-0.5 text-left"
      >
        <VChevronDown
          size={15}
          className={cn(
            "shrink-0 text-[var(--ink-soft)] transition-transform duration-200",
            open && "rotate-180",
          )}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.85rem] font-semibold">{m.label}</span>
          <span className="block text-[0.72rem] text-[var(--ink-soft)]">{m.display}</span>
        </span>
        <span className="hidden w-24 shrink-0 sm:block" aria-hidden="true">
          <span className="mb-0.5 block text-[0.62rem] font-bold text-[var(--ink-soft)]">
            Trọng số {m.weight}%
          </span>
          <span className="block overflow-hidden rounded-full border-2 border-[var(--ink)] bg-[var(--paper)]">
            <span
              className="block h-1.5"
              style={{
                width: `${Math.round((m.weight / maxWeight) * 100)}%`,
                background: "var(--royal)",
              }}
            />
          </span>
        </span>
        <span className="tabular shrink-0 rounded-full border-2 border-[var(--royal)] bg-[var(--blue-mist)] px-2 py-0.5 text-sm font-extrabold text-[var(--royal)]">
          +{m.contribution.toFixed(1)}
        </span>
      </button>

      {open && (
        <div className="nb-rise mt-2 ml-7 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[10px_12px_10px_12px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_25%,transparent)] bg-[var(--paper)] px-3 py-2">
          <span className="text-[0.64rem] font-bold uppercase tracking-wider text-[var(--ink-soft)]">
            Nguồn ghi nhận
          </span>
          <code className="rounded-md border-2 border-[var(--ink)] bg-[var(--paper-raised)] px-1.5 py-0.5 font-geist-mono text-[0.72rem] font-bold text-[var(--royal)]">
            {m.code}
          </code>
          <span className="text-[0.78rem]">
            Giá trị thô: <b className="tabular">{m.value}</b>
          </span>
          <span className="text-[0.78rem] text-[var(--ink-soft)]">
            · trọng số <b className="tabular">{m.weight}%</b> · quy đổi <b>{m.display}</b>
          </span>
        </div>
      )}
    </li>
  );
}

function KpiTab() {
  const reduced = usePrefersReducedMotion();
  const { data, loading, error, reload } = useApi<KpiRecord[]>(() => listMyKpi(), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openMetric, setOpenMetric] = useState<string | null>(null);

  if (loading) return <LoadingPanel rows={2} label="Đang mở bảng KPI..." />;
  if (error) return <ErrorPanel message={error} onRetry={reload} />;

  const records = data ?? [];
  if (records.length === 0) {
    return (
      <SketchCard hover={false} className="p-4">
        <EmptyFigure
          image="/images/student-mascot-v2.png"
          alt="Linh vật sinh viên V-Intern ôm sổ tay"
          title="Chưa có kỳ KPI nào được tổng hợp — trang sổ còn trắng"
        >
          <MarginNote className="mt-1 max-w-sm">
            bảng KPI đầu tiên được ghi lại sau khi sprint của bạn khép lại
          </MarginNote>
        </EmptyFigure>
      </SketchCard>
    );
  }

  const selected = records.find((r) => r.id === selectedId) ?? records[0];
  const passed = selected.score >= 70;
  const maxWeight = Math.max(...selected.metrics.map((m) => m.weight));
  const trend = [...records].reverse(); // cũ → mới
  const trendData = trend.map((r) => ({
    period: r.period.split(" · ")[0],
    score: r.score,
  }));

  return (
    <div className="space-y-5">
      {/* Bộ chọn kỳ */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Chọn kỳ KPI">
        {records.map((r) => {
          const active = r.id === selected.id;
          return (
            <button
              key={r.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setSelectedId(r.id);
                setOpenMetric(null);
              }}
              className={cn(
                "focus-ink rounded-full border-2 px-3.5 py-1.5 text-[0.78rem] font-bold transition-all",
                active
                  ? "border-[var(--ink)] bg-[var(--royal)] text-white shadow-ink-2 dark:text-[#101018]"
                  : "border-[color-mix(in_srgb,var(--ink)_35%,transparent)] bg-[var(--paper-raised)] text-[var(--ink-soft)] hover:border-[var(--ink)] hover:text-[var(--ink)]",
              )}
            >
              {r.period}
            </button>
          );
        })}
      </div>

      {/* Thẻ điểm hero */}
      <FadeIn>
        <SketchCard className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Điểm tổng hợp kỳ này</p>
              <p className="mt-1.5 flex items-end gap-2">
                <span
                  className="tabular text-5xl font-extrabold leading-none sm:text-6xl"
                  style={{ color: passed ? "var(--success)" : "var(--danger)" }}
                >
                  <CountUpNumber value={selected.score} duration={1000} />
                </span>
                <span className="pb-1 text-sm font-bold text-[var(--ink-soft)]">/ 100</span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <InkBadge tone={passed ? "green" : "red"} dot>
                {passed ? "Đạt" : "Chưa đạt"}
              </InkBadge>
              <span className="rotate-[-8deg]">
                <StampMoc key={selected.id} tone="blue" rotate={-8}>
                  Đã tổng hợp
                </StampMoc>
              </span>
            </div>
          </div>

          <div className="mt-5 grid gap-2.5 border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)] pt-4 text-[0.82rem] sm:grid-cols-2">
            <p className="flex flex-wrap items-center gap-2">
              <VShield size={15} className="text-[var(--ink-soft)]" />
              Phiên quy tắc áp dụng
              <code className="rounded-md border-2 border-[var(--ink)] bg-[var(--paper)] px-1.5 py-0.5 font-geist-mono text-xs font-bold">
                {selected.ruleVersion}
              </code>
            </p>
            <p className="flex flex-wrap items-center gap-2">
              <VHistory size={15} className="text-[var(--ink-soft)]" />
              Tổng hợp lúc <b className="tabular">{formatDateTimeVN(selected.calculatedAt)}</b>
            </p>
          </div>
          <MarginNote className="mt-3">
            công thức minh bạch — mỗi số đều truy được nguồn
          </MarginNote>
        </SketchCard>
      </FadeIn>

      {/* Nguồn điểm chi tiết */}
      <FadeIn>
        <SketchCard hover={false} className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-extrabold">Nguồn điểm chi tiết</h2>
            <p className="text-[0.72rem] text-[var(--ink-soft)]">
              Chạm từng dòng để mở nguồn ghi nhận
            </p>
          </div>
          <ul className="mt-2">
            {selected.metrics.map((m) => (
              <MetricRow
                key={m.code}
                m={m}
                maxWeight={maxWeight}
                open={openMetric === m.code}
                onToggle={() => setOpenMetric((o) => (o === m.code ? null : m.code))}
              />
            ))}
          </ul>
          <div className="mt-1 flex items-center justify-between border-t-2 border-[var(--ink)] pt-3.5">
            <p className="text-sm font-extrabold">Tổng điểm</p>
            <p className="tabular text-lg font-extrabold">
              {selected.score}
              <span className="text-xs font-bold text-[var(--ink-soft)]">/100</span>
            </p>
          </div>
        </SketchCard>
      </FadeIn>

      {/* Xu hướng qua các kỳ */}
      <FadeIn>
        <SketchCard hover={false} className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-extrabold">
              <VTarget size={16} className="text-[var(--royal)]" />
              Xu hướng qua các kỳ
            </h2>
            <p className="text-[0.72rem] text-[var(--ink-soft)]">
              Điểm tổng hợp xếp theo thời gian — đường đỏ là ngưỡng đạt 70
            </p>
          </div>
          <div className="chart-ink relative mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="kpiTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--royal)" stopOpacity={0.42} />
                    <stop offset="100%" stopColor="var(--royal)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--line)" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="period"
                  tick={{ fill: "var(--ink-soft)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--ink-soft)" }}
                  interval={0}
                  tickFormatter={(v: string) => v.split(" · ")[0]}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "var(--ink-soft)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <ReferenceLine
                  y={70}
                  stroke="var(--danger)"
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                  label={{
                    value: "Ngưỡng đạt",
                    position: "insideTopLeft",
                    fill: "var(--danger)",
                    fontSize: 10,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  name="Điểm KPI"
                  stroke="var(--royal)"
                  strokeWidth={2.5}
                  fill="url(#kpiTrendFill)"
                  dot={{ r: 3, fill: "var(--royal)", stroke: "var(--ink)", strokeWidth: 1.5 }}
                  activeDot={{ r: 5, stroke: "var(--ink)", strokeWidth: 2 }}
                  isAnimationActive={!reduced}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {trend.map((r) => (
              <p key={r.id} className="tabular text-[0.72rem] font-semibold text-[var(--ink-soft)]">
                {r.period}: <b style={{ color: r.score >= 70 ? "var(--success)" : "var(--danger)" }}>{r.score}</b>
              </p>
            ))}
          </div>
        </SketchCard>
      </FadeIn>
    </div>
  );
}

/* --------------------------- TAB LƯƠNG ẢO ---------------------------- */

/** Chip chọn kỳ lương — cùng kiểu chip chọn kỳ ở tab KPI. */
function periodChip(active: boolean) {
  return cn(
    "focus-ink rounded-full border-2 px-3.5 py-1.5 text-[0.78rem] font-bold transition-all",
    active
      ? "border-[var(--ink)] bg-[var(--royal)] text-white shadow-ink-2 dark:text-[#101018]"
      : "border-[color-mix(in_srgb,var(--ink)_35%,transparent)] bg-[var(--paper-raised)] text-[var(--ink-soft)] hover:border-[var(--ink)] hover:text-[var(--ink)]",
  );
}

function SalaryTab() {
  const { data, loading, error, reload } = useApi<SalaryEntry[]>(() => listMySalaryLedger(), []);
  const [showAll, setShowAll] = useState(false);
  /* Kỳ đang chọn — null nghĩa là "Mọi kỳ" (mặc định). */
  const [period, setPeriod] = useState<string | null>(null);

  if (loading) return <LoadingPanel rows={3} label="Đang mở sổ giao dịch..." />;
  if (error) return <ErrorPanel message={error} onRetry={reload} />;

  const entries = data ?? [];
  if (entries.length === 0) {
    return (
      <SketchCard hover={false} className="p-4">
        <EmptyFigure
          image="/images/robot-v2.png"
          alt="Robot kế toán của V-Intern"
          title="Chưa có giao dịch nào — sổ giao dịch còn trắng tinh"
        >
          <MarginNote className="mt-1 max-w-sm">
            khoản lương ảo đầu tiên vào sổ khi kỳ KPI tiếp theo được tổng hợp
          </MarginNote>
        </EmptyFigure>
      </SketchCard>
    );
  }

  /* Số dư toàn cục: tổng MỌI dòng sổ — kể cả điều chỉnh lẻ không gắn kỳ
   * (codex fix: tách bạch số dư toàn cục và thu nhập theo kỳ). */
  const total = entries.reduce((s, e) => s + e.amount, 0);

  /* Các kỳ duy nhất có trong sổ, giữ thứ tự xuất hiện (mới → cũ). */
  const periods: string[] = [];
  for (const e of entries) {
    if (e.period && !periods.includes(e.period)) periods.push(e.period);
  }
  /* Kỳ đang chọn vẫn hợp lệ nếu sổ vừa được tải lại. */
  const active = period && periods.includes(period) ? period : null;

  /* Thu nhập theo kỳ: chỉ tổng các dòng được gắn kỳ. */
  const scoped = active
    ? entries.filter((e) => e.period === active)
    : entries.filter((e) => e.period != null);
  const scopedTotal = scoped.reduce((s, e) => s + e.amount, 0);
  const scopedReward = scoped.filter((e) => e.type === "Thưởng").reduce((s, e) => s + e.amount, 0);
  const scopedAdjust = scoped.filter((e) => e.type === "Điều chỉnh").reduce((s, e) => s + e.amount, 0);
  const visible = showAll ? entries : entries.slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Bộ chọn kỳ — tách bạch thu nhập từng kỳ khỏi số dư toàn cục. */}
      {periods.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Chọn kỳ lương">
          <button
            type="button"
            aria-pressed={!active}
            onClick={() => setPeriod(null)}
            className={periodChip(!active)}
          >
            Mọi kỳ
          </button>
          {periods.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={active === p}
              onClick={() => setPeriod(p)}
              className={periodChip(active === p)}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Hai thẻ: số dư toàn cục vs thu nhập theo kỳ đang chọn */}
      <div className="grid gap-5 sm:grid-cols-2">
        <FadeIn>
          <SketchCard className="h-full p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-[12px_14px_12px_14px] border-2 border-[var(--ink)] bg-[var(--blue-mist)] text-[var(--royal)]">
                <VWallet size={22} />
              </span>
              <p className="eyebrow">Số dư từ sổ giao dịch</p>
            </div>
            <p className="mt-4 flex items-baseline gap-2">
              <span className="tabular text-4xl font-extrabold leading-none sm:text-[2.6rem]">
                <CountUpNumber value={total} duration={1100} format={fmtMoney} />
              </span>
              <span className="font-hand text-lg text-[var(--ink-soft)]">đ ảo</span>
            </p>
            <p className="mt-2 text-[0.75rem] text-[var(--ink-soft)]">
              tính từ toàn bộ sổ giao dịch — tổng sau {entries.length} giao dịch đã đối chiếu
            </p>
          </SketchCard>
        </FadeIn>

        <FadeIn delay={0.08}>
          <SketchCard className="h-full p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-[12px_14px_12px_14px] border-2 border-[var(--ink)] bg-[var(--note-yellow)] text-[var(--note-yellow-ink)]">
                <VCoins size={22} />
              </span>
              <p className="eyebrow">{active ? "Thu nhập kỳ đang chọn" : "Thu nhập KPI (mọi kỳ)"}</p>
            </div>
            <p className="mt-4 flex items-baseline gap-2">
              <span className="tabular text-4xl font-extrabold leading-none sm:text-[2.6rem]">
                <CountUpNumber key={active ?? "moi-ky"} value={scopedTotal} duration={1100} format={fmtMoney} />
              </span>
              <span className="font-hand text-lg text-[var(--ink-soft)]">đ ảo</span>
            </p>
            <p className="mt-2 text-[0.75rem] text-[var(--ink-soft)]">
              {scoped.length > 0 ? (active ?? "Thu nhập theo kỳ (mọi kỳ)") : "chưa có giao dịch nào gắn kỳ"}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {scopedReward > 0 && (
                <InkBadge tone="amber">
                  <VThumbsUp size={12} className="mr-1" aria-hidden="true" /> Thưởng +{fmtMoney(scopedReward)}
                </InkBadge>
              )}
              {scopedAdjust > 0 && (
                <InkBadge tone="mint">
                  <VCoins size={12} className="mr-1" aria-hidden="true" /> Điều chỉnh +{fmtMoney(scopedAdjust)}
                </InkBadge>
              )}
            </div>
          </SketchCard>
        </FadeIn>
      </div>

      <NoteCard tone="mint" tapeVariant="mint" title="Lương ảo là gì?">
        Lương ảo là <b>giá trị trong chương trình</b> — không phải bảng lương thực tế. Nó đo độ
        hoàn thành nhiệm vụ để bạn làm quen với văn hóa làm việc theo kết quả.
      </NoteCard>

      {/* Sổ giao dịch */}
      <FadeIn>
        <SketchCard hover={false} className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <VHistory size={17} className="text-[var(--ink-soft)]" />
            <h2 className="text-base font-extrabold">Sổ giao dịch</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="ink-table min-w-[40rem]">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Loại</th>
                  <th>Kỳ</th>
                  <th className="text-right">Số tiền</th>
                  <th>Nội dung</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((e) => (
                  <tr
                    key={e.id}
                    className={cn(
                      active && e.period === active && "bg-[color-mix(in_srgb,var(--blue-mist)_38%,transparent)]",
                    )}
                  >
                    <td className="tabular whitespace-nowrap text-[0.8rem]">
                      {formatDateTimeVN(e.at)}
                    </td>
                    <td>
                      <InkBadge tone={SALARY_TYPE_TONE[e.type]}>{e.type}</InkBadge>
                    </td>
                    <td className="whitespace-nowrap text-[0.75rem] font-semibold text-[var(--ink-soft)]">
                      {e.period ?? <span className="text-[var(--ink-faint)]">—</span>}
                    </td>
                    <td className="tabular whitespace-nowrap text-right font-extrabold text-[var(--royal)]">
                      +{fmtMoney(e.amount)}{" "}
                      <span className="text-[0.68rem] font-semibold text-[var(--ink-soft)]">
                        đ ảo
                      </span>
                    </td>
                    <td className="text-[var(--ink-soft)]">{e.note}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="border-b-0 border-t-2 border-solid border-[var(--ink)] pt-3.5">
                    <span className="rotate-[-5deg] inline-block">
                      <StampMoc tone="blue" rotate={-5} className="!px-2.5 !py-0.5 !text-[0.58rem]">
                        Đã đối chiếu
                      </StampMoc>
                    </span>
                  </td>
                  <td className="tabular border-b-0 border-t-2 border-solid border-[var(--ink)] pt-3.5 text-right font-extrabold">
                    +{fmtMoney(total)}{" "}
                    <span className="text-[0.68rem] font-semibold text-[var(--ink-soft)]">đ ảo</span>
                  </td>
                  <td className="border-b-0 border-t-2 border-solid border-[var(--ink)] pt-3.5 text-[0.75rem] font-semibold text-[var(--ink-soft)]">
                    Tổng cộng
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          {entries.length > 5 && (
            <div className="mt-4 flex justify-center">
              <InkButton variant="outline" size="sm" onClick={() => setShowAll((v) => !v)}>
                {showAll ? (
                  <>
                    <VChevronDown size={15} className="rotate-180" /> Thu gọn sổ
                  </>
                ) : (
                  <>
                    <VInbox size={15} /> Xem thêm {entries.length - 5} giao dịch
                  </>
                )}
              </InkButton>
            </div>
          )}
        </SketchCard>
      </FadeIn>
    </div>
  );
}

/* ------------------------------- TRANG ------------------------------- */

export default function StudentKpi() {
  const [tab, setTab] = useState<TabKey>("kpi");

  return (
    <div>
      <PageHeading
        eyebrow="Năng lực & kết quả"
        title="KPI & Lương ảo"
        sub="Bảng điểm tổng hợp theo từng kỳ và sổ giao dịch lương ảo — minh bạch từng nguồn điểm."
      />

      <div className="mb-6 flex flex-wrap items-center gap-2" role="tablist" aria-label="Chọn mục xem">
        <TabButton
          active={tab === "kpi"}
          tabKey="kpi"
          icon={VChartColumn}
          onClick={() => setTab("kpi")}
        >
          KPI
        </TabButton>
        <TabButton
          active={tab === "salary"}
          tabKey="salary"
          icon={VWallet}
          onClick={() => setTab("salary")}
        >
          Lương ảo
        </TabButton>
      </div>

      {tab === "kpi" ? (
        <div role="tabpanel" id="panel-kpi" aria-labelledby="tab-kpi">
          <KpiTab />
        </div>
      ) : (
        <div role="tabpanel" id="panel-salary" aria-labelledby="tab-salary">
          <SalaryTab />
        </div>
      )}
    </div>
  );
}
