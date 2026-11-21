"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { listMyEvaluations, listMyKpi } from "@/lib/api/outcomes";
import { listMyTasks } from "@/lib/api/work";
import { useApi } from "@/lib/use-api";
import type { Evaluation, InternState, KpiRecord, Task } from "@/lib/mock/types";
import { InkBadge, NoteCard, SketchCard } from "@/components/notebook/ui";
import { FadeIn, InkButton } from "@/components/notebook/reveal";
import {
  VAlert,
  VArrowRight,
  VCheck,
  VEdit,
  VEye,
  VEyeOff,
  VGithub,
  VGitPullRequest,
  VIdCard,
  VLock,
  VRefresh,
  VTerminal,
  VX,
} from "@/components/icons/v-icons";
import { PasswordStrength } from "./student-shared";
import { PageHeading } from "./nb-kit-5c2";

/* =====================================================================
 * HỒ SƠ & CÀI ĐẶT — thông tin cá nhân, mật khẩu, kết nối GitHub.
 * Mọi thay đổi trong bản demo chỉ lưu trong phiên làm việc hiện tại.
 * ====================================================================== */

const STATE_META: Record<InternState, { label: string; tone: string }> = {
  active: { label: "Đang thực tập", tone: "blue" },
  waiting: { label: "Chờ phân công", tone: "amber" },
  finished: { label: "Hoàn thành", tone: "green" },
};

const GH_USERNAME = "minh-nguyen-dev";
/* Số liệu GitHub mô phỏng hiển thị sau khi kết nối. */
const GH_OPEN_PRS = 3;
const GH_LAST_COMMIT = "2 giờ trước";

function PasswordField({
  id,
  label,
  value,
  show,
  hint,
  autoComplete,
  onToggle,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  show: boolean;
  hint?: string;
  autoComplete: string;
  onToggle: () => void;
  onChange: (v: string) => void;
}) {
  const [capsOn, setCapsOn] = useState(false);
  return (
    <div>
      <label
        htmlFor={id}
        className="text-[0.72rem] font-bold uppercase tracking-wider text-[var(--ink-soft)]"
      >
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyUp={(e) => setCapsOn(e.getModifierState?.("CapsLock") ?? false)}
          onBlur={() => setCapsOn(false)}
          autoComplete={autoComplete}
          className="focus-ink w-full rounded-[10px_12px_10px_12px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 pr-10 text-sm shadow-ink-2 outline-none"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? `Ẩn ${label.toLowerCase()}` : `Hiện ${label.toLowerCase()}`}
          className="focus-ink absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
        >
          {show ? <VEyeOff size={15} /> : <VEye size={15} />}
        </button>
      </div>
      {hint && <p className="mt-1 text-[0.68rem] text-[var(--ink-faint)]">{hint}</p>}
      {capsOn && (
        <p className="mt-1 inline-flex items-center gap-1.5 text-[0.68rem] font-semibold text-[var(--warning)]" role="status">
          <VLock size={11} aria-hidden="true" /> Caps Lock đang bật — cẩn thận gõ sai chữ hoa/thường nhé
        </p>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  sub,
  pct,
  tone = "royal",
  loading,
}: {
  label: string;
  value: string;
  sub?: string | null;
  pct: number;
  tone?: "royal" | "green";
  loading: boolean;
}) {
  if (loading) return <div className="skeleton-pencil h-12" />;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[0.72rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
          {label}
        </p>
        <p className="tabular text-[0.9rem] font-extrabold">{value}</p>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full border-2 border-[var(--ink)] bg-[var(--paper)]">
        <div
          className="bar-grow h-full"
          style={{
            width: `${Math.min(100, Math.round(pct))}%`,
            background: tone === "green" ? "var(--success)" : "var(--royal)",
          }}
        />
      </div>
      {sub && <p className="mt-1 text-[0.68rem] text-[var(--ink-faint)]">{sub}</p>}
    </div>
  );
}

export default function StudentProfile() {
  const user = useApp((s) => s.user);
  const navigate = useApp((s) => s.navigate);
  const email = user?.email ?? "";

  /* ----- Thông tin cá nhân: chỉnh sửa tên cục bộ ----- */
  const [name, setName] = useState(user?.name ?? "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  /* Đổi tài khoản → bỏ bản chỉnh sửa cục bộ, theo tên mới (mẫu derive của React) */
  const [lastUserName, setLastUserName] = useState(user?.name);
  if (user?.name !== lastUserName) {
    setLastUserName(user?.name);
    setName(user?.name ?? "");
  }

  const startEdit = () => {
    setDraft(name);
    setEditing(true);
  };
  const saveName = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      toast.error("Họ tên không được để trống.");
      return;
    }
    setName(trimmed);
    setEditing(false);
    toast.success("Đã lưu hồ sơ");
  };

  /* ----- Đổi mật khẩu (mô phỏng) ----- */
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  const submitPassword = () => {
    if (!pw.current) {
      setPwError("Nhập mật khẩu hiện tại để xác nhận.");
      return;
    }
    if (pw.next.length < 8) {
      setPwError("Mật khẩu mới cần tối thiểu 8 ký tự.");
      return;
    }
    if (pw.next !== pw.confirm) {
      setPwError("Mật khẩu nhập lại chưa khớp với mật khẩu mới.");
      return;
    }
    setPwError(null);
    setPwLoading(true);
    window.setTimeout(() => {
      setPwLoading(false);
      setPw({ current: "", next: "", confirm: "" });
      toast.success("Đã đổi mật khẩu (mô phỏng)");
    }, 900);
  };

  /* ----- Kết nối GitHub (mô phỏng OAuth) ----- */
  const [ghState, setGhState] = useState<"idle" | "connecting" | "connected">("idle");
  const connectGithub = () => {
    setGhState("connecting");
    window.setTimeout(() => {
      setGhState("connected");
      toast.success("Đã kết nối GitHub (mô phỏng)");
    }, 1000);
  };

  /* ----- Số liệu nhanh cho hồ sơ năng lực ----- */
  const evalsQ = useApi<Evaluation[]>(() => listMyEvaluations(), [email]);
  const kpiQ = useApi<KpiRecord[]>(() => listMyKpi(), [email]);
  const tasksQ = useApi<Task[]>(() => listMyTasks(), [email]);
  const evals = evalsQ.data ?? [];
  const kpis = kpiQ.data ?? [];
  const tasks = tasksQ.data ?? [];
  const avgEval = evals.length
    ? evals.reduce((s, e) => s + e.finalScore, 0) / evals.length
    : null;
  const lastKpi = kpis[0] ?? null;
  const doneTasks = tasks.filter((t) => t.status === "done").length;

  const stateMeta = user?.internState
    ? STATE_META[user.internState]
    : { label: "Chưa xác định", tone: "neutral" };

  return (
    <div>
      <PageHeading
        eyebrow="Tài khoản"
        title="Hồ sơ & cài đặt"
        sub="Thông tin cá nhân, bảo mật tài khoản và kết nối GitHub để nộp bài."
        margin="thông tin này hiện trong các bài nộp và chứng nhận"
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* ------------------------- Cột chính ------------------------- */}
        <div className="min-w-0 space-y-6">
          {/* Thông tin cá nhân */}
          <FadeIn>
            <SketchCard hover={false} className="p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-3 border-b-2 border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)] pb-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-[9px_11px_9px_11px] border-2 border-[var(--ink)] bg-[var(--blue-mist)] text-[var(--royal)]">
                  <VIdCard size={17} />
                </span>
                <div>
                  <h2 className="text-base font-extrabold leading-tight">Thẻ nhận diện</h2>
                  <p className="mt-0.5 text-[0.72rem] text-[var(--ink-soft)]">
                    Thông tin này hiện trong các bài nộp và chứng nhận
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <span className="badge-glow grid size-16 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--royal)] text-xl font-extrabold text-white shadow-ink-3 dark:text-[#101018]">
                  {user?.initials ?? "SV"}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold leading-tight">{name}</h2>
                    <InkBadge tone="blue">Sinh viên</InkBadge>
                  </div>
                  <p className="mt-0.5 text-[0.8rem] text-[var(--ink-soft)]">{user?.title}</p>
                </div>
              </div>

              <dl className="mt-5 border-t-2 border-[var(--ink)]">
                {/* Họ và tên — chỉnh sửa tại chỗ */}
                <div className="flex flex-col gap-1.5 border-b border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)] py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <dt className="text-[0.7rem] font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                    Họ và tên
                  </dt>
                  <dd className="sm:text-right">
                    {editing ? (
                      <span className="flex flex-wrap items-center justify-end gap-2">
                        <input
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveName();
                            if (e.key === "Escape") setEditing(false);
                          }}
                          aria-label="Chỉnh sửa họ và tên"
                          autoFocus
                          className="focus-ink w-52 rounded-[10px_12px_10px_12px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-1.5 text-sm font-semibold shadow-ink-2 outline-none"
                        />
                        <InkButton size="sm" onClick={saveName}>
                          <VCheck size={14} /> Lưu
                        </InkButton>
                        <InkButton size="sm" variant="ghost" onClick={() => setEditing(false)}>
                          <VX size={14} /> Hủy
                        </InkButton>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <b className="text-sm">{name}</b>
                        <button
                          type="button"
                          onClick={startEdit}
                          aria-label="Chỉnh sửa họ và tên"
                          title="Chỉnh sửa họ và tên"
                          className="focus-ink grid size-7 place-items-center rounded-lg border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_40%,transparent)] text-[var(--ink-soft)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
                        >
                          <VEdit size={13} />
                        </button>
                      </span>
                    )}
                  </dd>
                </div>

                {/* Email — chỉ đọc */}
                <div className="flex flex-col gap-1.5 border-b border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)] py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <dt className="text-[0.7rem] font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                    Email
                  </dt>
                  <dd className="flex items-center gap-2 sm:justify-end">
                    <VLock size={13} className="shrink-0 text-[var(--ink-faint)]" />
                    <code className="break-all font-geist-mono text-[0.8rem] font-semibold">
                      {user?.email}
                    </code>
                  </dd>
                </div>

                {/* Vai trò */}
                <div className="flex flex-col gap-1.5 border-b border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)] py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <dt className="text-[0.7rem] font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                    Vai trò
                  </dt>
                  <dd className="text-sm font-semibold">Sinh viên thực tập ảo</dd>
                </div>

                {/* Trạng thái thực tập */}
                <div className="flex flex-col gap-1.5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <dt className="text-[0.7rem] font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                    Trạng thái thực tập
                  </dt>
                  <dd>
                    <InkBadge tone={stateMeta.tone} dot>
                      {stateMeta.label}
                    </InkBadge>
                  </dd>
                </div>
              </dl>
            </SketchCard>
          </FadeIn>

          {/* Đổi mật khẩu */}
          <FadeIn>
            <SketchCard hover={false} className="p-5 sm:p-6">
              <div className="flex items-center gap-2.5">
                <VLock size={17} className="text-[var(--ink-soft)]" />
                <h2 className="text-base font-extrabold">Đổi mật khẩu</h2>
              </div>
              <form
                className="mt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitPassword();
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <PasswordField
                      id="pw-current"
                      label="Mật khẩu hiện tại"
                      value={pw.current}
                      show={showPw.current}
                      autoComplete="current-password"
                      onToggle={() => setShowPw((s) => ({ ...s, current: !s.current }))}
                      onChange={(v) => setPw((p) => ({ ...p, current: v }))}
                    />
                  </div>
                  <div>
                    <PasswordField
                      id="pw-next"
                      label="Mật khẩu mới"
                      value={pw.next}
                      show={showPw.next}
                      hint="Tối thiểu 8 ký tự"
                      autoComplete="new-password"
                      onToggle={() => setShowPw((s) => ({ ...s, next: !s.next }))}
                      onChange={(v) => setPw((p) => ({ ...p, next: v }))}
                    />
                    <PasswordStrength value={pw.next} id="pw-next-strength" />
                  </div>
                  <PasswordField
                    id="pw-confirm"
                    label="Xác nhận mật khẩu mới"
                    value={pw.confirm}
                    show={showPw.confirm}
                    autoComplete="new-password"
                    onToggle={() => setShowPw((s) => ({ ...s, confirm: !s.confirm }))}
                    onChange={(v) => setPw((p) => ({ ...p, confirm: v }))}
                  />
                </div>

                {pwError && (
                  <p
                    role="alert"
                    className="mt-3 flex items-center gap-2 text-[0.8rem] font-semibold text-[var(--danger)]"
                  >
                    <VAlert size={15} className="shrink-0" /> {pwError}
                  </p>
                )}

                <div className="mt-4">
                  <InkButton type="submit" disabled={pwLoading}>
                    {pwLoading ? (
                      <>
                        <VRefresh size={15} className="animate-spin" /> Đang lưu...
                      </>
                    ) : (
                      "Đổi mật khẩu"
                    )}
                  </InkButton>
                </div>
              </form>
            </SketchCard>
          </FadeIn>

          {/* Kết nối GitHub */}
          <FadeIn>
            <SketchCard hover={false} className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-[12px_14px_12px_14px] border-2 border-[var(--ink)] bg-[var(--coal)] text-[var(--chalk)]">
                    <VGithub size={21} />
                  </span>
                  <div>
                    <h2 className="text-base font-extrabold">Kết nối GitHub</h2>
                    {ghState === "connected" ? (
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-[0.78rem] text-[var(--ink-soft)]">
                        <span
                          className="ws-dot"
                          style={{ background: "var(--success)", borderColor: "var(--success)" }}
                        />
                        Đã kết nối
                        <code className="rounded-md border-2 border-[var(--ink)] bg-[var(--paper)] px-1.5 py-0.5 font-geist-mono text-[0.72rem] font-bold text-[var(--royal)]">
                          {GH_USERNAME}
                        </code>
                      </p>
                    ) : (
                      <p className="mt-1 flex items-center gap-1.5 text-[0.78rem] text-[var(--ink-soft)]">
                        <span
                          className="ws-dot"
                          style={{ background: "var(--warning)", borderColor: "var(--warning)" }}
                        />
                        Chưa kết nối — cần để nộp bài qua pull request
                      </p>
                    )}
                  </div>
                </div>
                {ghState !== "connected" && (
                  <InkButton variant="outline" onClick={connectGithub} disabled={ghState === "connecting"}>
                    {ghState === "connecting" ? (
                      <>
                        <VRefresh size={15} className="animate-spin" /> Đang kết nối...
                      </>
                    ) : (
                      "Kết nối tài khoản GitHub"
                    )}
                  </InkButton>
                )}
              </div>

                {ghState === "connected" && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="link-chip" title="Số pull request đang mở trên repo phiên thực tập">
                      <VGitPullRequest size={13} aria-hidden="true" /> {GH_OPEN_PRS} PR đã mở
                    </span>
                    <span className="link-chip" title="Commit gần nhất trên nhánh của bạn">
                      <VTerminal size={13} aria-hidden="true" /> Commit cuối: {GH_LAST_COMMIT}
                    </span>
                  </div>
                )}

                <NoteCard tone="pink" className="mt-4" title="Cam kết bảo mật">
                  V-Intern <b>không bao giờ</b> yêu cầu mật khẩu GitHub của bạn. Quyền truy cập chỉ
                  được cấp qua OAuth, giới hạn trong repo của phiên thực tập.
                </NoteCard>
            </SketchCard>
          </FadeIn>
        </div>

        {/* ------------------------- Cột phải ------------------------- */}
        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <NoteCard title="Tài khoản demo" tapeVariant="warm">
            Đây là bản demo với dữ liệu mẫu — thay đổi chỉ lưu trong phiên làm việc hiện tại.
          </NoteCard>

          <SketchCard className="p-5">
            <h2 className="text-base font-extrabold">Hồ sơ năng lực</h2>
            <p className="mt-0.5 text-[0.72rem] text-[var(--ink-soft)]">
              Tổng kết nhanh từ đánh giá và KPI
            </p>
            {!evalsQ.loading && !kpiQ.loading && !tasksQ.loading && !evalsQ.error && !kpiQ.error && evals.length === 0 && kpis.length === 0 ? (
              <p className="mt-4 font-hand text-[1.05rem] leading-snug text-[var(--pencil)]">
                Số liệu xuất hiện sau khi bắt đầu thực tập ✎
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                <MiniStat
                  label="Đánh giá trung bình"
                  value={avgEval ? `${avgEval.toFixed(1)}/10` : "—"}
                  sub={avgEval ? `trên ${evals.length} kỳ đã chốt` : "chưa có kỳ nào"}
                  pct={avgEval ? avgEval * 10 : 0}
                  loading={evalsQ.loading}
                />
                <MiniStat
                  label="KPI gần nhất"
                  value={lastKpi ? `${lastKpi.score}/100` : "—"}
                  sub={lastKpi ? lastKpi.period : "chưa có kỳ nào"}
                  pct={lastKpi?.score ?? 0}
                  tone={lastKpi && lastKpi.score >= 70 ? "green" : "royal"}
                  loading={kpiQ.loading}
                />
                <MiniStat
                  label="Nhiệm vụ hoàn thành"
                  value={tasks.length > 0 ? `${doneTasks}/${tasks.length}` : "—"}
                  sub={tasks.length > 0 ? "trong phiên hiện tại" : "chưa có nhiệm vụ"}
                  pct={tasks.length > 0 ? (doneTasks / tasks.length) * 100 : 0}
                  loading={tasksQ.loading}
                />
              </div>
            )}
            {(evalsQ.error || kpiQ.error || tasksQ.error) && (
              <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[0.72rem] font-semibold text-[var(--danger)]">
                <VAlert size={13} /> Không tải được số liệu —
                <button
                  type="button"
                  className="underline"
                  onClick={() => {
                    evalsQ.reload();
                    kpiQ.reload();
                    tasksQ.reload();
                  }}
                >
                  thử lại
                </button>
              </p>
            )}
          </SketchCard>

          <InkButton variant="ghost" className="w-full" onClick={() => navigate("certificates")}>
            Xem chứng nhận <VArrowRight size={15} />
          </InkButton>
        </aside>
      </div>
    </div>
  );
}
