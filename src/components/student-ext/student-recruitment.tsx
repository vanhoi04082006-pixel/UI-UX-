"use client";

/* =====================================================================
 * STUDENT RECRUITMENT — "Phỏng vấn AI" (intern, route "recruitment").
 * Endpoint BE cover (16 op nhóm recruitment + career-roles):
 *  · GET   /recruitment/me                          — hub: status/vai trò/lượt thử
 *  · PATCH /recruitment/me/role {role}              — đổi vai trò ứng tuyển
 *  · GET   /career-roles                            — danh mục vai trò đang tuyển
 *  · GET   /recruitment/me/interviews               — {items} lịch sử phiên
 *  · POST  /recruitment/me/interviews               — tạo phiên phỏng vấn mới
 *  · GET   /recruitment/me/interviews/{id}          — chi tiết phiên
 *  · GET   /recruitment/me/interviews/{id}/questions      — bộ câu hỏi đã làm sạch
 *  · GET   /recruitment/me/interviews/{id}/conversation   — khung hội thoại
 *  · POST  /recruitment/me/interviews/{id}/conversation/clarify — xin làm rõ
 *  · POST  /recruitment/me/interviews/{id}/conversation/next    — câu tiếp theo
 *  · PUT   /recruitment/me/interviews/{id}/answers/{questionId} — lưu câu trả lời
 *  · PUT   /recruitment/me/interviews/{id}/follow-ups/{questionId} — trả lời follow-up
 *  · POST  /recruitment/me/interviews/{id}/submit   — nộp bài (AI chấm tổng)
 *  · POST  /recruitment/me/interviews/{id}/retry-evaluation — chấm lại khi lỗi
 *  · GET   /recruitment/me/result                   — kết quả chính thức (404 → trống)
 * ===================================================================== */

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  clarifyInterviewQuestion,
  getInterviewConversation,
  getInterviewQuestions,
  getMyRecruitment,
  getMyRecruitmentResult,
  listMyInterviews,
  listPublicCareerRoles,
  nextInterviewQuestion,
  answerInterviewFollowUp,
  retryInterviewEvaluation,
  saveInterviewAnswer,
  selectRecruitmentRole,
  startInterview,
  submitInterview,
  type CareerRole,
  type ConversationView,
  type InterviewHistoryItem,
  type InterviewQuestion,
  type RecruitmentMe,
  type RecruitmentResult,
} from "@/lib/api/recruitment-interview";
import { errorMessage } from "@/lib/api/api-client";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  InkBadge,
  MarginNote,
  NoteCard,
  SketchCard,
  StampMoc,
  formatDateTimeVN,
} from "@/components/notebook/ui";
import { SquiggleUnderline } from "@/components/notebook/doodles";
import { InkButton } from "@/components/notebook/reveal";
import {
  VAlert,
  VArrowLeft,
  VBot,
  VCheck,
  VCircleCheck,
  VCircleDot,
  VFlag,
  VGraduation,
  VHistory,
  VHourglass,
  VInfo,
  VMedal,
  VPlay,
  VRefresh,
  VSend,
  VSparkles,
  VStar,
  VTimer,
  VTrophy,
} from "@/components/icons/v-icons";
import {
  EmptyFigure,
  ErrorPanel,
  LoadingPanel,
  PageHeading,
  scoreColor,
} from "@/components/student/nb-kit-5c2";
import { CountUpNumber, shortTimeVN } from "@/components/student/student-shared";

/* ============================== meta maps ============================== */

const RECRUITMENT_STATUS_META: Record<
  string,
  { label: string; tone: string; desc: string }
> = {
  recruitment_in_progress: {
    label: "Đang tuyển dụng",
    tone: "amber",
    desc: "Bạn đã đăng ký ứng tuyển — chọn vai trò và bắt đầu phỏng vấn khi sẵn sàng.",
  },
  interview_in_progress: {
    label: "Đang phỏng vấn",
    tone: "blue",
    desc: "Bạn có một phiên phỏng vấn đang mở — vào ngay để không lỡ giờ.",
  },
  recruited: {
    label: "Đã trúng tuyển",
    tone: "green",
    desc: "Chúc mừng! Bạn đã trúng tuyển — chờ phân công dự án nhé.",
  },
  failed: {
    label: "Chưa đạt",
    tone: "red",
    desc: "Kết quả lần gần nhất chưa đạt — ôn tập thêm rồi thi lại nhé.",
  },
  rejected: {
    label: "Không duyệt",
    tone: "red",
    desc: "Hồ sơ chưa được duyệt ở vòng hiện tại.",
  },
  cooldown: {
    label: "Đang chờ thi lại",
    tone: "amber",
    desc: "Bạn cần chờ hết thời gian chờ trước khi thi lại.",
  },
};

function recruitStatusMeta(status: string) {
  return (
    RECRUITMENT_STATUS_META[status] ?? {
      label: status,
      tone: "neutral",
      desc: "Trạng thái hồ sơ đang được hệ thống cập nhật.",
    }
  );
}

const INTERVIEW_STATUS_META: Record<string, { label: string; tone: string }> = {
  in_progress: { label: "Đang làm", tone: "blue" },
  expired: { label: "Quá hạn", tone: "neutral" },
  submitted: { label: "Đã nộp", tone: "amber" },
  evaluated: { label: "Đã chấm", tone: "green" },
  evaluation_failed: { label: "Lỗi chấm", tone: "red" },
};

function interviewStatusMeta(status: string) {
  return INTERVIEW_STATUS_META[status] ?? { label: status, tone: "neutral" };
}

const PHASE_META: Record<string, { label: string; tone: string }> = {
  introduction: { label: "Giới thiệu", tone: "blue" },
  technical: { label: "Chuyên môn", tone: "blue" },
  english: { label: "Tiếng Anh", tone: "pink" },
  communication: { label: "Giao tiếp", tone: "amber" },
};

function phaseMeta(phase: string | null) {
  if (!phase) return null;
  return PHASE_META[phase] ?? { label: phase, tone: "neutral" };
}

/** "2 ngày 3 giờ" / "45 phút" — đếm ngược tới mốc thi lại. */
function countdownVN(iso: string | null): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const ms = t - Date.now();
  if (ms <= 0) return "đã hết giờ chờ";
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return `${Math.max(1, Math.ceil(ms / 60_000))} phút`;
  if (hours < 24) return `${hours} giờ`;
  return `${Math.floor(hours / 24)} ngày ${hours % 24} giờ`;
}

function clockLabel(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  return `${m.toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

/* ============================== HUB ============================== */

function StatusHero({
  me,
  roles,
  onRoleChange,
  roleBusy,
}: {
  me: RecruitmentMe;
  roles: CareerRole[];
  onRoleChange: (code: string) => void;
  roleBusy: boolean;
}) {
  const meta = recruitStatusMeta(me.status);
  const wait = countdownVN(me.nextEligibleAt);
  return (
    <SketchCard as="section" className="relative p-5 pt-8">
      <StampMoc
        tone={me.status === "recruited" ? "blue" : "red"}
        rotate={-8}
        className="!text-[0.7rem] absolute right-5 top-5 hidden sm:block"
      >
        {me.status === "recruited" ? "TRÚNG TUYỂN" : meta.label.toUpperCase()}
      </StampMoc>
      <div className="flex flex-wrap items-start gap-4">
        <span
          className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--blue-mist)] text-[var(--royal)]"
          aria-hidden="true"
        >
          <VSparkles size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-extrabold">Hồ sơ ứng tuyển</h2>
            <InkBadge tone={meta.tone} dot>
              {meta.label}
            </InkBadge>
          </div>
          <p className="mt-1 max-w-xl text-[0.82rem] leading-relaxed text-[var(--ink-soft)]">
            {meta.desc}
            {me.recruitedAt && (
              <>
                {" "}
                Ngày trúng tuyển: <b className="tabular">{formatDateTimeVN(me.recruitedAt)}</b>.
              </>
            )}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="sketch-border-thin rounded-[10px_12px_10px_12px] bg-[var(--paper)] p-3">
          <dt className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
            <VGraduation size={13} /> Vai trò ứng tuyển
          </dt>
          <dd className="mt-1 text-[0.95rem] font-extrabold">{me.selectedRoleLabel ?? "Chưa chọn"}</dd>
        </div>
        <div className="sketch-border-thin rounded-[10px_12px_10px_12px] bg-[var(--paper)] p-3">
          <dt className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
            <VStar size={13} /> Lượt thử
          </dt>
          <dd className="tabular mt-1 text-[0.95rem] font-extrabold">
            Lần {me.attemptNumber ?? 0} / 3
            <span className="ml-1.5 text-[0.78rem] font-semibold text-[var(--ink-soft)]">
              (còn {me.attemptsRemaining ?? 0})
            </span>
          </dd>
        </div>
        <div className="sketch-border-thin rounded-[10px_12px_10px_12px] bg-[var(--paper)] p-3">
          <dt className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
            <VHourglass size={13} /> Thời gian chờ
          </dt>
          <dd className="mt-1 text-[0.95rem] font-extrabold">
            {wait ? (
              <span className="text-[var(--warning)]">{wait}</span>
            ) : (
              <span className="text-[var(--success)]">có thể thi ngay</span>
            )}
          </dd>
        </div>
      </dl>

      {/* Đổi vai trò ứng tuyển */}
      {me.status !== "recruited" && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[10px_12px_10px_12px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_25%,transparent)] bg-[var(--paper-raised)] p-3">
          <div className="min-w-0 flex-1">
            <p className="text-[0.8rem] font-bold">Đổi vai trò ứng tuyển</p>
            <p className="text-[0.72rem] leading-relaxed text-[var(--ink-soft)]">
              Vai trò quyết định bộ câu hỏi chuyên môn của buổi phỏng vấn.
            </p>
          </div>
          <Select
            value={me.selectedRole ?? undefined}
            onValueChange={(code) => {
              if (code && code !== me.selectedRole) onRoleChange(code);
            }}
            disabled={roleBusy || roles.length === 0}
          >
            <SelectTrigger
              aria-label="Chọn vai trò ứng tuyển"
              className="h-11 w-full min-w-44 rounded-[10px_12px_10px_12px] border-2 border-[var(--ink)] bg-[var(--paper)] font-semibold sm:w-60"
            >
              <SelectValue placeholder={roles.length === 0 ? "Chưa tải được danh mục" : "Chọn vai trò…"} />
            </SelectTrigger>
            <SelectContent className="border-2 border-[var(--ink)] bg-[var(--paper)]">
              {roles.map((r) => (
                <SelectItem key={r.code} value={r.code}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </SketchCard>
  );
}

function ResultCard({ result }: { result: RecruitmentResult | null }) {
  if (!result) {
    return (
      <NoteCard title="Kết quả tuyển dụng" tone="yellow" rotate={-1}>
        Chưa có kết quả chính thức — kết quả được chấm tự động sau khi bạn <b>nộp bài phỏng vấn</b>{" "}
        (đạt khi tổng điểm trên 70/100).
      </NoteCard>
    );
  }
  const passed = result.passed === true;
  const score = result.overallScore;
  return (
    <SketchCard as="section" className="relative p-5 pt-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 text-base font-extrabold">
            Kết quả tuyển dụng
            <InkBadge tone={passed ? "green" : "red"} dot>
              {passed ? "Đạt" : "Chưa đạt"}
            </InkBadge>
          </h2>
          <p className="mt-1 text-[0.78rem] text-[var(--ink-soft)]">
            {result.roleCode ? `Vai trò ${result.roleCode}` : "Vai trò ứng tuyển"}
            {result.evaluatedAt ? ` · chấm ngày ${formatDateTimeVN(result.evaluatedAt)}` : ""}
          </p>
        </div>
        {typeof score === "number" && (
          <div className="text-right">
            <p className="text-[0.68rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
              Tổng điểm
            </p>
            <p className="text-3xl font-extrabold leading-none" style={{ color: scoreColor(score / 10) }}>
              <CountUpNumber value={score} decimals={score % 1 === 0 ? 0 : 1} />
              <span className="text-base text-[var(--ink-soft)]">/100</span>
            </p>
          </div>
        )}
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Chuyên môn (70%)", value: result.technicalScore },
          { label: "Kỹ năng mềm (30%)", value: result.softScore },
          { label: "Tiếng Anh", value: result.englishScore },
        ].map((item) => (
          <div key={item.label} className="sketch-border-thin rounded-[10px_12px_10px_12px] bg-[var(--paper)] p-3">
            <dt className="text-[0.68rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
              {item.label}
            </dt>
            <dd className="tabular mt-1 text-[1.05rem] font-extrabold">
              {item.value === null ? "—" : <>{item.value.toLocaleString("vi-VN")}</>}
            </dd>
          </div>
        ))}
      </dl>
      <MarginNote className="mt-3">
        tổng điểm = 70% chuyên môn + 30% kỹ năng mềm — máy chủ tự chấm và ra quyết định
      </MarginNote>
    </SketchCard>
  );
}

function HistoryTable({
  items,
  onEnter,
}: {
  items: InterviewHistoryItem[];
  onEnter: (id: string) => void;
}) {
  return (
    <SketchCard as="section" hover={false} className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--royal)]">
            <VHistory size={17} />
          </span>
          <div>
            <h2 className="text-base font-extrabold">Lịch sử phiên phỏng vấn</h2>
            <p className="text-[0.75rem] text-[var(--ink-soft)]">
              Mới nhất trước — mỗi phiên 10 câu hỏi (2 giới thiệu + 6 chuyên môn + 2 tiếng Anh).
            </p>
          </div>
        </div>
        <span className="tabular text-[0.7rem] font-semibold text-[var(--ink-soft)]">
          {items.length} phiên
        </span>
      </div>

      {items.length === 0 ? (
        <EmptyFigure
          image="/images/empty-states/open-notebook.png"
          alt="Trang sổ trống — chưa có phiên phỏng vấn nào"
          title="Chưa có phiên phỏng vấn nào — bấm “Bắt đầu phỏng vấn” để mở lượt đầu tiên"
        />
      ) : (
        <>
          <ul className="mt-4 space-y-2.5">
            {items.map((it) => {
              const meta = interviewStatusMeta(it.status);
              const live = it.status === "in_progress";
              return (
                <li
                  key={it.id}
                  className={cn(
                    "sketch-border-thin flex flex-wrap items-center gap-x-4 gap-y-2.5 bg-[var(--paper-raised)] p-3.5",
                    live && "border-[var(--royal)]",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)]",
                      live ? "bg-[var(--royal)] text-white dark:text-[#101018]" : "bg-[var(--paper)] text-[var(--ink-soft)]",
                    )}
                    aria-hidden="true"
                  >
                    <VCircleDot size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-geist-mono text-[0.85rem] font-bold uppercase">
                        Lần {it.attemptNumber ?? "?"} · {it.roleCode ?? "—"}
                      </p>
                      <InkBadge tone={meta.tone} dot={live}>
                        {meta.label}
                      </InkBadge>
                      {it.result?.overallScore != null && (
                        <InkBadge tone={it.result.passed === true ? "green" : "red"}>
                          <VStar size={12} /> {it.result.overallScore.toLocaleString("vi-VN")} điểm
                        </InkBadge>
                      )}
                    </div>
                    <p className="tabular mt-1 text-[0.72rem] leading-relaxed text-[var(--ink-soft)]">
                      Bắt đầu {it.startedAt ? formatDateTimeVN(it.startedAt) : "—"}
                      {it.submittedAt ? ` · nộp ${formatDateTimeVN(it.submittedAt)}` : ""}
                      {` · ${it.questionCount ?? "?"} câu hỏi`}
                    </p>
                  </div>
                  <InkButton
                    variant={live ? "royal" : "outline"}
                    size="sm"
                    onClick={() => onEnter(it.id)}
                  >
                    {live ? <VPlay size={14} /> : <VHistory size={14} />}
                    {live ? "Vào phỏng vấn" : "Xem chi tiết"}
                  </InkButton>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </SketchCard>
  );
}

/* ============================== PHÒNG PHỎNG VẤN ============================== */

/** Số giây còn lại tới mốc tuyệt đối (expiresAt) — tự chỉnh mỗi tick. */
function secondsLeftAt(expiresAt: string | null, nowMs: number): number | null {
  if (!expiresAt) return null;
  const end = new Date(expiresAt).getTime();
  if (!Number.isFinite(end)) return null;
  return Math.max(0, Math.round((end - nowMs) / 1000));
}

/** Đồng hồ tick mỗi giây (setState chỉ chạy trong callback interval). */
function useNowTick(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

function ChatBubble({
  from,
  text,
  at,
}: {
  from: "ai" | "me";
  text: string;
  at: string | null;
}) {
  const mine = from === "me";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={cn("flex items-end gap-2", mine && "flex-row-reverse")}
    >
      {!mine && (
        <span className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--royal)] text-white dark:text-[#101018]">
          <VBot size={14} />
        </span>
      )}
      <div
        title={at ? `Lúc ${formatDateTimeVN(at)}` : undefined}
        className={cn(
          "animate-pop-in max-w-[85%] border-2 border-[var(--ink)] p-3 text-[0.84rem] leading-relaxed sm:max-w-[75%]",
          mine
            ? "rounded-[14px_14px_4px_14px] bg-[var(--royal)] text-white dark:text-[#101018]"
            : "rounded-[4px_14px_14px_14px] bg-[var(--paper-raised)] text-[var(--ink)] shadow-ink-2",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{text}</p>
        {at && (
          <p
            className={cn(
              "tabular mt-1 text-right text-[0.62rem]",
              mine ? "text-white/70 dark:text-[#101018]/60" : "text-[var(--ink-soft)]",
            )}
          >
            {shortTimeVN(at)}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function InterviewRoom({
  sessionId,
  onExit,
  onFinished,
}: {
  sessionId: string;
  onExit: () => void;
  /** Báo hub tải lại (nộp bài / tạo mới làm đổi trạng thái). */
  onFinished: () => void;
}) {
  const convQ = useApi<ConversationView>(() => getInterviewConversation(sessionId), [sessionId]);
  const questionsQ = useApi(() => getInterviewQuestions(sessionId), [sessionId]);

  const [viewOverride, setViewOverride] = useState<ConversationView | null>(null);
  /* view = phản hồi gần nhất của hành động (ưu tiên) hoặc lần tải đầu. */
  const view = viewOverride ?? convQ.data ?? null;

  const [answerText, setAnswerText] = useState("");
  const [clarifyText, setClarifyText] = useState("");
  const [busy, setBusy] = useState<"next" | "save" | "clarify" | "submit" | "retry" | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const session = view?.session ?? null;
  const live = session?.status === "in_progress";
  /* Đồng hồ đếm ngược từ mốc tuyệt đối expiresAt — tự chỉnh theo tick. */
  const now = useNowTick(live);
  const secondsLeft = live ? secondsLeftAt(session?.expiresAt ?? null, now) : null;

  const questions: InterviewQuestion[] = questionsQ.data?.questions ?? [];
  const currentQ = view?.currentQuestion ?? null;
  const currentPhase = phaseMeta(currentQ?.phase ?? null);
  const isFollowUp = currentQ?.kind != null && currentQ.kind !== "main";

  /* Tự cuộn xuống tin cuối. */
  const msgCount = view?.messages.length ?? 0;
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgCount, busy]);

  const applyView = (next: ConversationView | null) => {
    if (next) setViewOverride(next);
  };

  const refreshAll = async () => {
    try {
      const next = await getInterviewConversation(sessionId);
      setViewOverride(next);
    } catch {
      /* im lặng — useApi reload ở hub */
    }
    questionsQ.reload();
  };

  const askNext = async () => {
    setBusy("next");
    try {
      applyView(await nextInterviewQuestion(sessionId));
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const saveAnswer = async () => {
    if (!currentQ || !answerText.trim()) return;
    setBusy("save");
    try {
      const res = isFollowUp
        ? await answerInterviewFollowUp(sessionId, currentQ.id, answerText.trim())
        : await saveInterviewAnswer(sessionId, currentQ.id, answerText.trim());
      applyView(res);
      toast.success(isFollowUp ? "Đã lưu câu trả lời follow-up" : "Đã lưu câu trả lời");
      setAnswerText("");
      void refreshAll();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const askClarify = async () => {
    setBusy("clarify");
    try {
      applyView(await clarifyInterviewQuestion(sessionId, clarifyText.trim() || undefined));
      setClarifyText("");
      toast.success("Đã gửi yêu cầu làm rõ");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const submitAll = async () => {
    setBusy("submit");
    setSubmitOpen(false);
    try {
      await submitInterview(sessionId);
      toast.success("Đã nộp bài — hệ thống đang chấm, xem kết quả ở hub.");
      onFinished();
      onExit();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const retryEvaluation = async () => {
    setBusy("retry");
    try {
      await retryInterviewEvaluation(sessionId);
      toast.success("Đã gửi yêu cầu chấm lại");
      void refreshAll();
      onFinished();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  if (convQ.loading && !view) return <LoadingPanel rows={2} label="Đang mở phòng phỏng vấn..." />;
  if (convQ.error && !view) return <ErrorPanel message={convQ.error} onRetry={convQ.reload} />;
  if (!session) return <ErrorPanel message="Không đọc được phiên phỏng vấn." onRetry={convQ.reload} />;

  const meta = interviewStatusMeta(session.status);
  const answered = view?.answeredCount ?? 0;
  const totalQ = session.questionCount ?? questions.length;
  const progressPct = totalQ > 0 ? Math.round((answered / totalQ) * 100) : 0;
  const busyAny = busy !== null;
  const aiFailed = currentQ?.status === "failed";
  const needFirstQuestion = msgCount === 0 && !aiFailed;

  return (
    <div className="space-y-4">
      {/* Thanh tiêu đề phòng */}
      <header className="nb-rise flex flex-wrap items-center gap-3">
        <InkButton variant="ghost" size="sm" onClick={onExit} aria-label="Về hub phỏng vấn">
          <VArrowLeft size={16} /> Hub
        </InkButton>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">PHÒNG PHỎNG VẤN AI · LẦN {session.attemptNumber ?? "?"}</p>
          <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-2xl font-extrabold leading-tight">
            Vai trò {session.roleCode ?? "—"}
            <InkBadge tone={meta.tone} dot={live}>
              {meta.label}
            </InkBadge>
          </h1>
          <SquiggleUnderline className="mt-1 h-2.5 w-36 text-[var(--royal)]" />
        </div>
        {live && secondsLeft !== null && (
          <div
            className={cn(
              "tabular flex items-center gap-2 rounded-full border-2 px-3.5 py-1.5 text-[0.9rem] font-extrabold",
              secondsLeft <= 300
                ? "border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]"
                : "border-[var(--ink)] bg-[var(--paper-raised)]",
            )}
            aria-label={`Còn ${clockLabel(secondsLeft)} cho phiên phỏng vấn`}
          >
            <VTimer size={16} />
            {clockLabel(secondsLeft)}
          </div>
        )}
      </header>

      {!live && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[12px_15px_13px_14px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_30%,transparent)] bg-[var(--paper-raised)] p-3.5"
        >
          <InkBadge tone={meta.tone}>{meta.label}</InkBadge>
          <p className="min-w-0 flex-1 text-[0.82rem] font-semibold leading-relaxed text-[var(--ink-soft)]">
            {session.status === "expired"
              ? "Phiên đã quá hạn theo đồng hồ máy chủ — nội dung chỉ xem lại được, không sửa nữa."
              : session.status === "evaluation_failed"
                ? "Lần chấm gần nhất gặp lỗi — dùng nút “Chấm lại” để yêu cầu hệ thống chấm lại."
                : "Phiên đã đóng — bạn xem lại hội thoại và điểm bên dưới."}
          </p>
          {session.status === "evaluation_failed" && (
            <InkButton variant="outline" size="sm" onClick={retryEvaluation} disabled={busyAny}>
              <VRefresh size={14} /> Chấm lại
            </InkButton>
          )}
        </div>
      )}

      <SketchCard hover={false} className="overflow-hidden">
        <div className="grid lg:grid-cols-[1fr_270px]">
          {/* ------------------------- Cột chat ------------------------- */}
          <div className="flex min-h-[480px] flex-col border-[color-mix(in_srgb,var(--ink)_25%,transparent)] lg:border-r-2 lg:border-dashed">
            <div
              ref={scrollRef}
              role="log"
              aria-label="Hội thoại với người phỏng vấn AI"
              className="paper-grid min-h-0 flex-1 space-y-3 overflow-y-auto p-4 [scrollbar-width:thin]"
            >
              <AnimatePresence initial={false}>
                {(view?.messages ?? []).map((m) => (
                  <ChatBubble key={m.id} from={m.from} text={m.text} at={m.at} />
                ))}
              </AnimatePresence>

              {needFirstQuestion && live && (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <span className="grid size-14 place-items-center rounded-[14px_17px_15px_16px] border-2 border-[var(--ink)] bg-[var(--royal)] text-white shadow-ink-3 dark:text-[#101018]">
                    <VBot size={26} />
                  </span>
                  <p className="max-w-72 font-hand text-xl leading-snug text-[var(--ink-soft)]">
                    Sẵn sàng chưa? Bấm nút để nhận câu hỏi đầu tiên — đồng hồ bắt đầu chạy từ lúc
                    tạo phiên, đừng chờ lâu nhé!
                  </p>
                  <InkButton variant="royal" size="md" onClick={askNext} disabled={busyAny}>
                    {busy === "next" ? <span className="spinner-ink" aria-hidden="true" /> : <VPlay size={16} />}
                    Nhận câu hỏi đầu tiên
                  </InkButton>
                </div>
              )}

              {aiFailed && live && (
                <div
                  role="alert"
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[10px_12px_10px_12px] border-2 border-dashed border-[color-mix(in_srgb,var(--danger)_55%,transparent)] bg-[color-mix(in_srgb,var(--danger)_7%,transparent)] p-3"
                >
                  <VAlert size={16} className="shrink-0 text-[var(--danger)]" />
                  <p className="min-w-0 flex-1 text-[0.8rem] font-semibold leading-relaxed">
                    Câu hỏi chưa tạo được
                    {currentQ?.errorCode ? ` (mã ${currentQ.errorCode})` : ""} — dịch vụ AI đang
                    bận, thử lại sau ít giây.
                  </p>
                  <InkButton variant="outline" size="sm" onClick={askNext} disabled={busyAny}>
                    <VRefresh size={14} /> Thử lại
                  </InkButton>
                </div>
              )}

              {busy && busy !== "submit" && (
                <div className="flex items-end gap-2">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--royal)] text-white dark:text-[#101018]">
                    <VBot size={14} />
                  </span>
                  <div className="sketch-border-thin flex items-center gap-1.5 bg-[var(--paper-raised)] px-3.5 py-3">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-2 w-2 animate-blink-dot rounded-full bg-[var(--ink-soft)]"
                        style={{ animationDelay: `${i * 0.22}s` }}
                      />
                    ))}
                    <span className="sr-only">AI đang soạn câu hỏi</span>
                  </div>
                </div>
              )}
            </div>

            {/* Ô trả lời + hành động */}
            {live && currentQ && !needFirstQuestion && !aiFailed && (
              <div className="shrink-0 space-y-2.5 border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_25%,transparent)] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <InkBadge tone={isFollowUp ? "amber" : "blue"}>
                    Câu {currentQ.position ?? "?"}/{totalQ || "?"}
                    {isFollowUp ? " · follow-up" : ""}
                  </InkBadge>
                  {currentPhase && <InkBadge tone={currentPhase.tone}>{currentPhase.label}</InkBadge>}
                </div>
                <div className="flex items-end gap-2">
                  <textarea
                    ref={taRef}
                    value={answerText}
                    rows={3}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder={
                      isFollowUp
                        ? "Trả lời câu hỏi follow-up của người phỏng vấn…"
                        : "Viết câu trả lời của bạn (1–5000 ký tự)…"
                    }
                    aria-label="Ô câu trả lời phỏng vấn"
                    className="focus-ink max-h-40 min-h-11 w-full min-w-0 flex-1 resize-none rounded-[10px_12px_11px_12px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2.5 text-[0.85rem] leading-snug outline-none placeholder:text-[var(--ink-faint)]"
                  />
                  <InkButton
                    variant="royal"
                    size="md"
                    onClick={saveAnswer}
                    disabled={!answerText.trim() || busyAny}
                    aria-label="Lưu câu trả lời"
                    className="ink-ripple"
                  >
                    {busy === "save" ? <span className="spinner-ink" aria-hidden="true" /> : <VCheck size={16} />} Lưu
                  </InkButton>
                </div>
                <div className="flex items-end gap-2">
                  <input
                    value={clarifyText}
                    onChange={(e) => setClarifyText(e.target.value)}
                    placeholder="Chưa rõ câu hỏi? Nhập điều cần làm rõ…"
                    aria-label="Nhập yêu cầu làm rõ câu hỏi"
                    className="focus-ink min-h-9 w-full min-w-0 flex-1 rounded-[10px_12px_11px_12px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_45%,transparent)] bg-[var(--paper-raised)] px-3 py-2 text-[0.8rem] leading-snug outline-none placeholder:text-[var(--ink-faint)]"
                  />
                  <InkButton variant="outline" size="sm" onClick={askClarify} disabled={busyAny}>
                    {busy === "clarify" ? <span className="spinner-ink" aria-hidden="true" /> : <VSend size={14} />} Làm rõ
                  </InkButton>
                </div>
                <p className="text-[0.65rem] leading-relaxed text-[var(--ink-faint)]">
                  Trả lời xong bấm <b>Lưu</b>, rồi <b>Câu tiếp theo</b> ở thanh bên — AI giới hạn
                  5–15 lượt/phút, hãy chờ vài giây giữa các bước.
                </p>
              </div>
            )}
          </div>

          {/* ------------------------- Sidebar phải ------------------------- */}
          <aside className="flex flex-col gap-4 border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_25%,transparent)] p-4 lg:border-t-0">
            <div>
              <p className="flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                <VStar size={13} /> Tiến độ
              </p>
              <p className="tabular mt-1.5 text-2xl font-extrabold leading-none">
                <CountUpNumber value={answered} />
                <span className="text-base text-[var(--ink-soft)]">/{totalQ || "?"} câu</span>
              </p>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full border-2 border-[var(--ink)] bg-[var(--paper)]">
                <div
                  className="bar-grow h-full rounded-full bg-[var(--royal)] transition-[width] duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {questions.length > 0 && (
              <div className="min-h-0">
                <p className="text-[0.7rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                  Bộ câu hỏi
                </p>
                <ol className="mt-1.5 max-h-64 space-y-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
                  {questions.map((q) => {
                    const active = currentQ?.id === q.id;
                    const phase = phaseMeta(q.phase ?? q.category);
                    return (
                      <li
                        key={q.id}
                        className={cn(
                          "flex items-center gap-2 rounded-[8px_10px_8px_10px] border-2 px-2 py-1.5 text-[0.75rem] font-semibold",
                          active
                            ? "border-[var(--royal)] bg-[var(--blue-mist)] text-[var(--ink)]"
                            : "border-transparent text-[var(--ink-soft)]",
                        )}
                        aria-current={active ? "step" : undefined}
                      >
                        {q.answered ? (
                          <VCircleCheck size={14} className="shrink-0 text-[var(--success)]" />
                        ) : (
                          <VCircleDot size={14} className="shrink-0 text-[var(--ink-faint)]" />
                        )}
                        <span className="tabular shrink-0">#{q.position ?? "?"}</span>
                        {phase && <span className="min-w-0 truncate">{phase.label}</span>}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            <div className="mt-auto space-y-2">
              {live && (
                <>
                  <InkButton
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={askNext}
                    disabled={busyAny || needFirstQuestion || aiFailed}
                  >
                    {busy === "next" ? <span className="spinner-ink" aria-hidden="true" /> : <VPlay size={14} />} Câu
                    tiếp theo
                  </InkButton>
                  <InkButton
                    variant="royal"
                    size="sm"
                    className="w-full"
                    onClick={() => setSubmitOpen(true)}
                    disabled={busyAny}
                  >
                    <VFlag size={14} /> Nộp bài
                  </InkButton>
                </>
              )}
              <p className="flex items-start gap-1.5 text-[0.65rem] leading-relaxed text-[var(--ink-faint)]">
                <VInfo size={12} className="mt-0.5 shrink-0" />
                Sau khi nộp bài không thể sửa — hệ thống chấm tự động và khóa phiên.
              </p>
            </div>
          </aside>
        </div>
      </SketchCard>

      {/* Xác nhận nộp bài */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent
          aria-describedby={undefined}
          className="max-w-sm border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-ink-6"
        >
          <DialogHeader className="text-left">
            <DialogTitle className="font-hand text-xl">Nộp bài phỏng vấn?</DialogTitle>
          </DialogHeader>
          <p className="text-[0.85rem] leading-relaxed text-[var(--ink-soft)]">
            Bạn đã trả lời <b className="tabular">{answered}/{totalQ || "?"}</b> câu.
            Sau khi nộp, <b>không thể sửa</b> câu trả lời nữa và hệ thống sẽ chấm tự động
            (tổng = 70% chuyên môn + 30% kỹ năng mềm, đạt trên 70 điểm).
          </p>
          <div className="mt-4 flex flex-wrap justify-end gap-2.5">
            <InkButton variant="ghost" size="sm" onClick={() => setSubmitOpen(false)}>
              Xem lại đã
            </InkButton>
            <InkButton variant="royal" size="sm" onClick={submitAll} disabled={busy === "submit"}>
              {busy === "submit" ? <span className="spinner-ink" aria-hidden="true" /> : <VFlag size={15} />} Nộp bài
            </InkButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================== MÀN CHÍNH ============================== */

export default function StudentRecruitment() {
  const meQ = useApi<RecruitmentMe>(() => getMyRecruitment(), []);
  const historyQ = useApi<InterviewHistoryItem[]>(() => listMyInterviews(), []);
  const rolesQ = useApi<CareerRole[]>(() => listPublicCareerRoles(), []);
  const resultQ = useApi<RecruitmentResult | null>(() => getMyRecruitmentResult(), []);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [roleBusy, setRoleBusy] = useState(false);
  const [startBusy, setStartBusy] = useState(false);
  const [startOpen, setStartOpen] = useState(false);

  const me = meQ.data;
  const roles = rolesQ.data ?? [];

  /* Vào thẳng phiên đang mở khi có currentInterviewSessionId (chọn theo history). */
  const liveSession = useMemo(
    () => (historyQ.data ?? []).find((it) => it.status === "in_progress") ?? null,
    [historyQ.data],
  );

  const changeRole = async (code: string) => {
    setRoleBusy(true);
    try {
      await selectRecruitmentRole(code);
      const role = roles.find((r) => r.code === code);
      toast.success(`Đã đổi vai trò ứng tuyển thành ${role?.label ?? code}`);
      meQ.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setRoleBusy(false);
    }
  };

  const startNew = async () => {
    setStartBusy(true);
    setStartOpen(false);
    try {
      const session = await startInterview();
      toast.success("Đã mở phiên phỏng vấn mới — đồng hồ đang chạy!");
      setActiveId(session.id);
      historyQ.reload();
      meQ.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setStartBusy(false);
    }
  };

  /* ------------------------- Màn phòng phỏng vấn ------------------------- */
  if (activeId) {
    return (
      <InterviewRoom
        sessionId={activeId}
        onExit={() => setActiveId(null)}
        onFinished={() => {
          historyQ.reload();
          meQ.reload();
          resultQ.reload();
        }}
      />
    );
  }

  /* ------------------------------ Màn hub ------------------------------ */
  const canStart =
    me == null ||
    (me.status !== "recruited" &&
      (me.attemptsRemaining == null || me.attemptsRemaining > 0) &&
      !me.nextEligibleAt);

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="TUYỂN DỤNG · PHỎNG VẤN AI"
        title="Phỏng vấn AI"
        sub="Buổi phỏng vấn 10 câu hỏi với người phỏng vấn AI — 2 giới thiệu, 6 chuyên môn theo vai trò, 2 tiếng Anh. Mỗi tài khoản có tối đa 3 lượt thử."
        margin="trả lời tự nhiên như đang trò chuyện — AI chấm cả cách diễn đạt"
      />

      {meQ.loading && <LoadingPanel rows={2} label="Đang mở hồ sơ ứng tuyển..." />}
      {!meQ.loading && meQ.error && <ErrorPanel message={meQ.error} onRetry={meQ.reload} />}
      {!meQ.loading && !meQ.error && me && (
        <StatusHero me={me} roles={roles} onRoleChange={changeRole} roleBusy={roleBusy} />
      )}

      {/* CTA vào phiên đang mở / bắt đầu phiên mới */}
      {!meQ.loading && !meQ.error && me && (
        <div className="flex flex-wrap items-center gap-3">
          {liveSession ? (
            <InkButton variant="royal" size="lg" onClick={() => setActiveId(liveSession.id)}>
              <VPlay size={17} /> Vào phiên đang mở (lần {liveSession.attemptNumber ?? "?"})
            </InkButton>
          ) : (
            <InkButton
              variant="royal"
              size="lg"
              onClick={() => setStartOpen(true)}
              disabled={startBusy || !canStart}
              title={canStart ? undefined : "Đang chờ thời gian thi lại hoặc đã hết lượt"}
            >
              {startBusy ? <span className="spinner-ink" aria-hidden="true" /> : <VSparkles size={17} />} Bắt đầu
              phỏng vấn mới
            </InkButton>
          )}
          {me.nextEligibleAt && countdownVN(me.nextEligibleAt) && (
            <InkBadge tone="amber">
              <VHourglass size={13} /> chờ {countdownVN(me.nextEligibleAt)} trước khi thi lại
            </InkBadge>
          )}
          {me.status === "recruited" && (
            <span className="inline-flex rotate-[-4deg]">
              <StampMoc tone="blue" rotate={-4} className="!text-[0.8rem]">
                <VMedal size={13} className="mr-1 inline" /> TRÚNG TUYỂN
              </StampMoc>
            </span>
          )}
        </div>
      )}

      {/* Kết quả */}
      {!resultQ.loading && !resultQ.error && (
        <ResultCard result={resultQ.data ?? null} />
      )}
      {!resultQ.loading && resultQ.error && (
        <NoteCard title="Kết quả tuyển dụng" tone="yellow" rotate={-1}>
          Chưa đọc được kết quả từ máy chủ — thử tải lại trang.
        </NoteCard>
      )}

      {/* Lịch sử phiên */}
      {historyQ.loading && <LoadingPanel rows={1} label="Đang lật sổ lịch sử..." />}
      {!historyQ.loading && historyQ.error && (
        <ErrorPanel message={historyQ.error} onRetry={historyQ.reload} />
      )}
      {!historyQ.loading && !historyQ.error && historyQ.data && (
        <HistoryTable
          items={historyQ.data}
          onEnter={(id) => setActiveId(id)}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <NoteCard title="Mẹo cho buổi phỏng vấn" tone="mint" tapeVariant="mint" rotate={-0.8}>
          Đọc kỹ câu hỏi, trả lời đúng trọng tâm và kèm ví dụ. Nếu chưa hiểu, bấm{" "}
          <b>Làm rõ</b> — AI sẽ diễn giải lại thay vì để bạn đoán mò.
        </NoteCard>
        <NoteCard title="Đồng hồ & lượt thử" tone="pink" rotate={0.7}>
          Phiên kéo dài <b>30 phút</b> theo đồng hồ máy chủ — quá hạn là mất lượt. Bạn có{" "}
          <b>3 lượt thử</b> cho toàn bộ hành trình ứng tuyển, dùng sau khi ôn kỹ nhé!
        </NoteCard>
      </div>

      {/* Xác nhận bắt đầu phiên mới */}
      <Dialog open={startOpen} onOpenChange={setStartOpen}>
        <DialogContent
          aria-describedby={undefined}
          className="max-w-sm border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-ink-6"
        >
          <DialogHeader className="text-left">
            <DialogTitle className="font-hand text-xl">Bắt đầu phiên phỏng vấn mới?</DialogTitle>
          </DialogHeader>
          <p className="text-[0.85rem] leading-relaxed text-[var(--ink-soft)]">
            Mỗi phiên mở là <b>1 lượt thử</b> (bạn còn{" "}
            <b className="tabular">{me?.attemptsRemaining ?? "?"}</b> lượt sau lần này) và đồng hồ
            30 phút bắt đầu chạy ngay. Đảm bảo mạng ổn định và sẵn sàng trước khi bấm.
          </p>
          <div className="mt-4 flex flex-wrap justify-end gap-2.5">
            <InkButton variant="ghost" size="sm" onClick={() => setStartOpen(false)}>
              Để sau
            </InkButton>
            <InkButton variant="royal" size="sm" onClick={startNew} disabled={startBusy}>
              {startBusy ? <span className="spinner-ink" aria-hidden="true" /> : <VTrophy size={15} />} Bắt đầu ngay
            </InkButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
