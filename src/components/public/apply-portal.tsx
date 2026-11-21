"use client";
/* =====================================================================
 * APPLY PORTAL — cổng ứng tuyển công khai (view #/apply, không cần tài khoản).
 *
 * Endpoint BE cover (Applications group — public/candidate, 8/8):
 *  GET  /applications/rounds          — bước 1: chọn đợt tuyển đang mở
 *  POST /applications                 — bước 2: nộp hồ sơ (multipart CV)
 *  POST /applications/verify          — bước 3: xác thực email bằng token ≥ 40 ký tự
 *  POST /applications/request-access  — gửi lại thư truy cập
 *  GET  /applications/me              — trạng thái hồ sơ (cookie candidate)
 *  GET  /applications/me/cv           — tải CV về
 *  POST /applications/me/cv           — thay/bổ sung CV
 *  POST /applications/leave           — rút hồ sơ
 * =====================================================================
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  VArrowLeft,
  VArrowRight,
  VCalendar,
  VCheck,
  VCircleCheck,
  VClock,
  VDownload,
  VFileText,
  VHome,
  VInbox,
  VInfo,
  VLock,
  VLogout,
  VMail,
  VPaperclip,
  VSend,
  VSparkles,
  VUpload,
  VUser,
} from "@/components/icons/v-icons";
import { InkButton } from "@/components/notebook/reveal";
import {
  InkBadge,
  MarginNote,
  NoteCard,
  SketchCard,
  formatDateVN,
  formatDateTimeVN,
} from "@/components/notebook/ui";
import {
  EmptyState,
  PencilLines,
  SectionError,
  SketchInput,
} from "@/components/staff/staff-kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError, errorMessage } from "@/lib/api/api-client";
import {
  CV_CONSENT_VERSION,
  cvExtension,
  downloadMyCv,
  extractVerificationToken,
  getMyApplication,
  leaveApplication,
  listPublicRounds,
  requestApplicationAccess,
  submitApplication,
  supplementMyCv,
  validateCvFile,
  verifyApplication,
  type CandidateApplication,
  type PublicRound,
} from "@/lib/api/applications";
import { saveBlobAs } from "@/lib/api/recruitment";
import { useApp } from "@/lib/store";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";

/* --------------------------- meta trạng thái --------------------------- */

type RoundWindowState = "upcoming" | "open" | "closed";

function roundWindowState(round: PublicRound): RoundWindowState {
  const now = Date.now();
  const open = round.opensAt ? new Date(round.opensAt).getTime() : Number.NEGATIVE_INFINITY;
  const close = round.closesAt ? new Date(round.closesAt).getTime() : Number.POSITIVE_INFINITY;
  if (now < open) return "upcoming";
  if (now >= close) return "closed";
  return "open";
}

const ROUND_WINDOW_META: Record<RoundWindowState, { label: string; tone: string }> = {
  open: { label: "Đang nhận hồ sơ", tone: "green" },
  upcoming: { label: "Sắp mở", tone: "amber" },
  closed: { label: "Đã đóng", tone: "red" },
};

const CANDIDATE_STATUS_META: Record<string, { label: string; tone: string }> = {
  unverified: { label: "Chờ xác thực email", tone: "amber" },
  verified: { label: "Đã xác thực", tone: "green" },
  analysing: { label: "Đang phân tích CV", tone: "blue" },
  analysed: { label: "Đã phân tích CV", tone: "blue" },
  booked: { label: "Đã đặt lịch phỏng vấn", tone: "mint" },
  interviewing: { label: "Đang phỏng vấn", tone: "blue" },
  passed: { label: "Đạt vòng phỏng vấn", tone: "green" },
  failed: { label: "Chưa đạt", tone: "red" },
  hired: { label: "Được tuyển", tone: "mint" },
  rejected: { label: "Không phù hợp", tone: "red" },
  withdrawn: { label: "Đã rút hồ sơ", tone: "neutral" },
  cancelled: { label: "Đã hủy", tone: "red" },
};

function candidateStatusMeta(status: string) {
  return CANDIDATE_STATUS_META[status] ?? { label: status, tone: "neutral" };
}

/* ============================== component ============================== */

type Phase = "rounds" | "form" | "verify" | "profile";

const STEP_INDEX: Record<Phase, number> = { rounds: 1, form: 2, verify: 3, profile: 3 };
const STEPS = [
  { n: 1, label: "Chọn đợt tuyển" },
  { n: 2, label: "Nộp hồ sơ" },
  { n: 3, label: "Xác thực & theo dõi" },
];

export default function ApplyPortal() {
  const user = useApp((s) => s.user);
  const goLanding = useApp((s) => s.goLanding);
  const enterAuth = useApp((s) => s.enterAuth);
  const goVerify = useApp((s) => s.goVerify);

  const rounds = useApi(listPublicRounds);

  const [phase, setPhase] = useState<Phase>("rounds");
  const [checkingSession, setCheckingSession] = useState(true);
  const [selectedRound, setSelectedRound] = useState<PublicRound | null>(null);

  /* Form nộp hồ sơ */
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [applyBusy, setApplyBusy] = useState(false);
  const cvInputRef = useRef<HTMLInputElement>(null);

  /* Xác thực */
  const [verifyToken, setVerifyToken] = useState("");
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [resendOpen, setResendOpen] = useState(false);
  const [resendRoundId, setResendRoundId] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resendBusy, setResendBusy] = useState(false);

  /* Hồ sơ */
  const [profile, setProfile] = useState<CandidateApplication | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [replaceBusy, setReplaceBusy] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveBusy, setLeaveBusy] = useState(false);

  /* Khi mở cổng: thử cookie candidate — còn hiệu lực thì thẳng vào hồ sơ. */
  useEffect(() => {
    let alive = true;
    getMyApplication()
      .then((app) => {
        if (!alive) return;
        setProfile(app);
        setPhase("profile");
      })
      .catch(() => {
        /* chưa xác thực / cookie hết hạn — ở lại bước 1 */
      })
      .finally(() => {
        if (alive) setCheckingSession(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const app = await getMyApplication();
      setProfile(app);
      setPhase("profile");
    } catch (error) {
      setProfile(null);
      setProfileError(error instanceof ApiError ? error.code : "LOAD_FAILED");
      setPhase("verify");
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const sortedRounds = useMemo(
    () => (rounds.data ?? []).slice().sort((a, b) => a.opensAt.localeCompare(b.opensAt)),
    [rounds.data],
  );

  /* --------------------------- nộp hồ sơ --------------------------- */

  const pickRound = (round: PublicRound) => {
    setSelectedRound(round);
    setPhase("form");
  };

  const submitApply = async () => {
    if (!selectedRound) {
      toast.error("Hãy chọn đợt tuyển trước đã.");
      return;
    }
    const name = fullName.trim();
    const mail = email.trim();
    if (name.length < 2) {
      toast.error("Hãy nhập họ tên đầy đủ (tối thiểu 2 ký tự).");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(mail)) {
      toast.error("Email chưa hợp lệ — kiểm tra lại giúp mình nhé.");
      return;
    }
    if (!cvFile) {
      toast.error("Hãy đính kèm CV (PDF hoặc DOCX, tối đa 5 MB).");
      return;
    }
    const cvError = validateCvFile(cvFile);
    if (cvError) {
      toast.error(cvError);
      return;
    }
    if (!consent) {
      toast.error("Cần đánh dấu đồng ý xử lý CV trước khi nộp.");
      return;
    }
    setApplyBusy(true);
    try {
      await submitApplication({ roundId: selectedRound.id, email: mail, fullName: name, cv: cvFile });
      toast.success("Đã nhận hồ sơ! Kiểm tra email để lấy liên kết xác thực.");
      setPhase("verify");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setApplyBusy(false);
    }
  };

  /* ----------------------------- xác thực ----------------------------- */

  const submitVerify = async () => {
    const token = extractVerificationToken(verifyToken);
    if (token.length < 40) {
      toast.error("Mã xác thực trông chưa đủ dài — dán nguyên liên kết hoặc mã từ email nhé.");
      return;
    }
    setVerifyBusy(true);
    try {
      await verifyApplication(token);
      toast.success("Đã xác thực email! Đang tải hồ sơ…");
      setVerifyToken("");
      await loadProfile();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setVerifyBusy(false);
    }
  };

  const submitResend = async () => {
    if (!resendRoundId) {
      toast.error("Chọn đợt tuyển bạn đã nộp hồ sơ.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(resendEmail.trim())) {
      toast.error("Nhập email đã dùng khi nộp hồ sơ.");
      return;
    }
    setResendBusy(true);
    try {
      await requestApplicationAccess(resendRoundId, resendEmail.trim());
      toast.success("Đã gửi lại thư truy cập — kiểm tra hộp thư (cả mục Spam).");
      setResendOpen(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setResendBusy(false);
    }
  };

  /* ------------------------- thao tác hồ sơ ------------------------- */

  const downloadCv = async () => {
    setDownloadBusy(true);
    try {
      const blob = await downloadMyCv();
      const ext = await cvExtension(blob);
      saveBlobAs(blob, `CV-${(profile?.fullName ?? "ung-vien").replace(/\s+/g, "-")}.${ext}`);
      toast.success("Đã tải CV về máy.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setDownloadBusy(false);
    }
  };

  const replaceCv = async (file: File | undefined) => {
    if (!file) return;
    const cvError = validateCvFile(file);
    if (cvError) {
      toast.error(cvError);
      return;
    }
    setReplaceBusy(true);
    try {
      await supplementMyCv(file);
      toast.success("Đã cập nhật CV mới.");
      await loadProfile();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setReplaceBusy(false);
      if (replaceInputRef.current) replaceInputRef.current.value = "";
    }
  };

  const confirmLeave = async () => {
    setLeaveBusy(true);
    try {
      await leaveApplication();
      toast.success("Đã rút hồ sơ. Hẹn gặp ở đợt tuyển sau nhé!");
      setLeaveOpen(false);
      setProfile(null);
      setSelectedRound(null);
      setFullName("");
      setEmail("");
      setCvFile(null);
      setConsent(false);
      setPhase("rounds");
      rounds.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLeaveBusy(false);
    }
  };

  const restartWizard = () => {
    setPhase("rounds");
    setSelectedRound(null);
  };

  /* ================================ render =============================== */

  const currentStep = STEP_INDEX[phase];

  return (
    <div className="flex min-h-screen flex-col bg-[var(--paper)] text-[var(--ink)]">
      {/* ------------------------------ topbar ------------------------------ */}
      <header className="sticky top-0 z-40 border-b-2 border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-[var(--paper)]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px_12px_9px_11px] border-2 border-[var(--ink)] bg-[var(--blue-mist)] text-[var(--royal)]">
              <VSparkles size={18} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold leading-tight">Cổng ứng tuyển V-Intern</p>
              <p className="hidden truncate text-[0.68rem] text-[var(--ink-soft)] sm:block">
                Nộp CV · AI phân tích · phỏng vấn theo khung giờ thật
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {user ? (
              <InkBadge tone="mint" className="!text-[0.65rem]">
                <VUser size={12} /> Đã đăng nhập: {user.name}
              </InkBadge>
            ) : (
              <InkButton variant="outline" size="sm" onClick={enterAuth}>
                Đăng nhập
              </InkButton>
            )}
            <InkButton variant="ghost" size="sm" onClick={goLanding}>
              <VHome size={15} /> Về trang chủ
            </InkButton>
          </div>
        </div>
      </header>

      {/* ------------------------------ main ------------------------------ */}
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:py-12">
        <div className="min-w-0">
          {/* Thanh bước */}
          <ol className="mb-5 flex flex-wrap items-center gap-2" aria-label="Tiến trình ứng tuyển">
            {STEPS.map((step, i) => {
              const done = currentStep > step.n;
              const active = currentStep === step.n;
              return (
                <li key={step.n} className="flex items-center gap-2">
                  <span
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-bold transition-colors",
                      active && "border-[var(--ink)] bg-[var(--royal)] text-white shadow-ink-2 dark:text-[#101018]",
                      done && "border-[var(--success)] bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]",
                      !active && !done && "border-dashed border-[color-mix(in_srgb,var(--ink)_30%,transparent)] text-[var(--ink-soft)]",
                    )}
                  >
                    {done ? <VCheck size={13} /> : <span className="tabular">{step.n}</span>}
                    {step.label}
                  </span>
                  {i < STEPS.length - 1 && (
                    <span aria-hidden="true" className="hidden text-[var(--ink-soft)] sm:inline">
                      →
                    </span>
                  )}
                </li>
              );
            })}
          </ol>

          {checkingSession ? (
            <SketchCard hover={false} className="p-5">
              <PencilLines rows={4} />
            </SketchCard>
          ) : phase === "rounds" ? (
            /* --------------------- BƯỚC 1 — chọn đợt --------------------- */
            <SketchCard hover={false} className="p-5 sm:p-6">
              <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                Chọn đợt tuyển bạn muốn ứng tuyển
              </h1>
              <p className="mt-1.5 text-sm text-[var(--ink-soft)]">
                Mỗi đợt có cửa mở/đóng riêng — chỉ đợt <b>đang nhận hồ sơ</b> mới chọn được.
              </p>

              <div className="mt-5">
                {rounds.loading ? (
                  <PencilLines rows={3} />
                ) : rounds.error ? (
                  <SectionError message={rounds.error} onRetry={rounds.reload} />
                ) : sortedRounds.length === 0 ? (
                  <EmptyState
                    icon={VInbox}
                    title="Hiện chưa có đợt tuyển nào mở cửa ✎"
                    note="Hãy quay lại sau — hoặc để lại email ở bước xác thực để nhận thư khi đợt mới mở."
                  />
                ) : (
                  <ul className="space-y-3">
                    {sortedRounds.map((round) => {
                      const state = roundWindowState(round);
                      const meta = ROUND_WINDOW_META[state];
                      const selectable = state === "open";
                      return (
                        <li key={round.id}>
                          <button
                            type="button"
                            disabled={!selectable}
                            onClick={() => pickRound(round)}
                            aria-label={`Chọn đợt ${round.name}`}
                            className={cn(
                              "focus-ink w-full rounded-[11px_13px_12px_14px] border-2 p-4 text-left transition-all",
                              selectable
                                ? "border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-2 hover:-translate-y-0.5 hover:bg-[var(--blue-mist)] hover:shadow-ink-3"
                                : "cursor-not-allowed border-dashed border-[color-mix(in_srgb,var(--ink)_25%,transparent)] opacity-65",
                            )}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                              <div className="min-w-0">
                                <p className="font-extrabold leading-snug">{round.name}</p>
                                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.78rem] text-[var(--ink-soft)]">
                                  <span className="inline-flex items-center gap-1">
                                    <VCalendar size={13} /> Mở {formatDateVN(round.opensAt)}
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <VClock size={13} /> Đóng {formatDateVN(round.closesAt)}
                                  </span>
                                </p>
                              </div>
                              <InkBadge tone={meta.tone} dot className="!text-[0.65rem]">
                                {meta.label}
                              </InkBadge>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="mt-5 border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_18%,transparent)] pt-4">
                <p className="text-sm text-[var(--ink-soft)]">
                  Đã nộp hồ sơ từ trước?{" "}
                  <button
                    type="button"
                    onClick={() => setPhase("verify")}
                    className="focus-ink inline-flex items-center gap-1 font-bold text-[var(--royal)] underline decoration-wavy underline-offset-4"
                  >
                    <VMail size={14} /> Xác thực email để xem trạng thái
                  </button>
                </p>
              </div>
            </SketchCard>
          ) : phase === "form" ? (
            /* --------------------- BƯỚC 2 — nộp hồ sơ --------------------- */
            <SketchCard hover={false} className="p-5 sm:p-6">
              <button
                type="button"
                onClick={restartWizard}
                className="focus-ink mb-3 inline-flex items-center gap-1 text-xs font-bold text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
              >
                <VArrowLeft size={14} /> Đổi đợt khác
              </button>
              <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">Hồ sơ ứng tuyển</h1>
              <p className="mt-1.5 text-sm text-[var(--ink-soft)]">
                Đợt: <b>{selectedRound?.name}</b> · đóng {formatDateVN(selectedRound?.closesAt ?? "")}
              </p>

              <form
                className="mt-5 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitApply();
                }}
              >
                <div>
                  <label htmlFor="apply-fullname" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                    Họ và tên
                  </label>
                  <SketchInput
                    id="apply-fullname"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Thị A"
                    autoComplete="name"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="apply-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                    Email liên hệ
                  </label>
                  <SketchInput
                    id="apply-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ten@edu.vn"
                    autoComplete="email"
                    required
                  />
                  <p className="mt-1.5 text-[0.72rem] text-[var(--ink-soft)]">
                    Hệ thống sẽ gửi email xác thực về địa chỉ này — dùng nó để đăng nhập theo dõi hồ sơ.
                  </p>
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                    CV (PDF hoặc DOCX, tối đa 5 MB)
                  </span>
                  <input
                    ref={cvInputRef}
                    id="apply-cv"
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const cvError = validateCvFile(file);
                        if (cvError) {
                          toast.error(cvError);
                          setCvFile(null);
                          e.target.value = "";
                          return;
                        }
                        setCvFile(file);
                      }
                    }}
                  />
                  <label
                    htmlFor="apply-cv"
                    className={cn(
                      "focus-ink flex cursor-pointer items-center gap-3 rounded-[9px_11px_10px_12px] border-2 border-dashed p-3.5 transition-colors",
                      cvFile
                        ? "border-[var(--success)] bg-[color-mix(in_srgb,var(--success)_8%,transparent)]"
                        : "border-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--blue-mist)]",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-10 w-10 shrink-0 place-items-center rounded-[9px] border-2 border-[var(--ink)]",
                        cvFile ? "bg-[var(--note-mint)] text-[var(--success)]" : "bg-[var(--paper-raised)] text-[var(--ink)]",
                      )}
                    >
                      {cvFile ? <VFileText size={18} /> : <VPaperclip size={18} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      {cvFile ? (
                        <>
                          <span className="block truncate text-sm font-bold">{cvFile.name}</span>
                          <span className="block text-[0.72rem] tabular text-[var(--ink-soft)]">
                            {(cvFile.size / 1024).toLocaleString("vi-VN")} KB · sẵn sàng nộp
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="block text-sm font-bold">Bấm để chọn tệp CV</span>
                          <span className="block text-[0.72rem] text-[var(--ink-soft)]">PDF hoặc DOCX, tối đa 5 MB</span>
                        </>
                      )}
                    </span>
                    {!cvFile && <VUpload size={16} className="shrink-0 text-[var(--ink-soft)]" />}
                  </label>
                </div>

                <label className="flex cursor-pointer items-start gap-2.5 rounded-[9px_11px_10px_12px] border-2 border-[color-mix(in_srgb,var(--ink)_25%,transparent)] bg-[var(--paper)] p-3">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--royal)]"
                  />
                  <span className="text-[0.8rem] leading-relaxed text-[var(--ink)]">
                    Tôi đồng ý để V-Intern lưu và phân tích CV phục vụ sàng lọc ứng tuyển, theo chính sách
                    xử lý dữ liệu phiên bản <span className="font-mono text-[0.72rem]">{CV_CONSENT_VERSION}</span>.
                  </span>
                </label>

                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                  <InkButton variant="royal" size="md" type="submit" disabled={applyBusy}>
                    {applyBusy ? "Đang nộp…" : "Nộp hồ sơ"} <VArrowRight size={15} />
                  </InkButton>
                </div>
              </form>
            </SketchCard>
          ) : phase === "verify" ? (
            /* --------------------- BƯỚC 3 — xác thực --------------------- */
            <SketchCard hover={false} className="p-5 sm:p-6">
              <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">Xác thực email</h1>
              <p className="mt-1.5 text-sm text-[var(--ink-soft)]">
                Dán <b>liên kết hoặc mã xác thực</b> trong email V-Intern gửi cho bạn. Mã có độ dài tối
                thiểu 40 ký tự — nếu thư tới chậm, kiểm tra mục Spam trước nhé.
              </p>

              {selectedRound && email.trim() && (
                <p className="mt-3 inline-flex flex-wrap items-center gap-1.5 rounded-full border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_30%,transparent)] bg-[var(--paper)] px-3 py-1 text-[0.72rem] text-[var(--ink-soft)]">
                  <VInfo size={13} /> Đang chờ xác thực cho
                  <b className="text-[var(--ink)]">{email.trim()}</b> tại đợt
                  <b className="text-[var(--ink)]">{selectedRound.name}</b>
                </p>
              )}

              {profileError && (
                <div className="mt-4 flex items-start gap-2.5 rounded-[10px] border-2 border-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] p-3 text-[0.8rem]">
                  <VInfo size={16} className="mt-0.5 shrink-0 text-[var(--warning)]" />
                  <p>
                    Phiên truy cập hồ sơ đã hết hạn. Xác thực lại bằng mã trong email mới nhất để tiếp
                    tục theo dõi.
                  </p>
                </div>
              )}

              <form
                className="mt-5 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitVerify();
                }}
              >
                <div>
                  <label htmlFor="verify-token" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                    Liên kết / mã xác thực từ email
                  </label>
                  <textarea
                    id="verify-token"
                    value={verifyToken}
                    onChange={(e) => setVerifyToken(e.target.value)}
                    rows={3}
                    spellCheck={false}
                    placeholder="Dán nguyên liên kết (https://…) hoặc mã xác thực dài từ email…"
                    className="focus-ink w-full resize-y rounded-[9px_11px_10px_12px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 font-mono text-[0.78rem] leading-relaxed text-[var(--ink)] outline-none transition-colors placeholder:font-sans placeholder:text-[color-mix(in_srgb,var(--ink-soft)_70%,transparent)]"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <InkButton
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setResendRoundId(selectedRound?.id ?? "");
                      setResendEmail(email);
                      setResendOpen(true);
                    }}
                  >
                    <VMail size={14} /> Chưa nhận được email?
                  </InkButton>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <InkButton variant="outline" size="sm" type="button" onClick={restartWizard}>
                      <VArrowLeft size={14} /> Nộp hồ sơ mới
                    </InkButton>
                    <InkButton variant="royal" size="md" type="submit" disabled={verifyBusy}>
                      {verifyBusy ? "Đang xác thực…" : "Xác thực"} <VSend size={15} />
                    </InkButton>
                  </div>
                </div>
              </form>
            </SketchCard>
          ) : (
            /* --------------------- hồ sơ của tôi --------------------- */
            <SketchCard hover={false} className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">Hồ sơ của bạn</h1>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">
                    {profile?.fullName ?? "Ứng viên"}
                    {profile?.email ? ` · ${profile.email}` : ""}
                  </p>
                </div>
                {profile && (
                  <InkBadge tone={candidateStatusMeta(profile.status).tone} dot>
                    {candidateStatusMeta(profile.status).label}
                  </InkBadge>
                )}
              </div>

              {profileLoading && !profile ? (
                <div className="mt-5">
                  <PencilLines rows={4} />
                </div>
              ) : !profile ? (
                <div className="mt-5">
                  <EmptyState
                    icon={VInbox}
                    title="Chưa đọc được hồ sơ ✎"
                    note="Phiên đã hết hạn — xác thực lại bằng mã trong email để xem trạng thái."
                  />
                </div>
              ) : (
                <>
                  {/* Thông tin chính */}
                  <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[10px_12px_9px_11px] border-2 border-[var(--ink)] bg-[var(--paper)] p-3.5">
                      <dt className="text-[0.65rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                        Đợt tuyển
                      </dt>
                      <dd className="mt-1 text-sm font-bold">{profile.roundName ?? "—"}</dd>
                    </div>
                    <div className="rounded-[10px_12px_9px_11px] border-2 border-[var(--ink)] bg-[var(--paper)] p-3.5">
                      <dt className="text-[0.65rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                        Vai trò phù hợp (AI)
                      </dt>
                      <dd className="mt-1 text-sm font-bold">
                        {profile.matchedRole ? (
                          <InkBadge tone="blue" className="!text-[0.65rem]">
                            {profile.matchedRole}
                          </InkBadge>
                        ) : (
                          <span className="text-[var(--ink-soft)]">Đang chờ phân tích CV</span>
                        )}
                      </dd>
                    </div>
                    {profile.booking && (
                      <>
                        {profile.booking.startsAt && (
                          <div className="rounded-[10px_12px_9px_11px] border-2 border-[var(--ink)] bg-[var(--paper)] p-3.5">
                            <dt className="text-[0.65rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                              Lịch phỏng vấn
                            </dt>
                            <dd className="mt-1 text-sm font-bold">
                              {formatDateTimeVN(profile.booking.startsAt)}
                              {profile.booking.endsAt ? ` – ${formatDateTimeVN(profile.booking.endsAt)}` : ""}
                            </dd>
                            {profile.booking.timezone && (
                              <dd className="mt-0.5 text-[0.7rem] text-[var(--ink-soft)]">
                                Múi giờ {profile.booking.timezone}
                              </dd>
                            )}
                          </div>
                        )}
                        {profile.booking.roleCode && (
                          <div className="rounded-[10px_12px_9px_11px] border-2 border-[var(--ink)] bg-[var(--paper)] p-3.5">
                            <dt className="text-[0.65rem] font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                              Vị trí phỏng vấn
                            </dt>
                            <dd className="mt-1 text-sm font-bold">{profile.booking.roleCode}</dd>
                          </div>
                        )}
                      </>
                    )}
                  </dl>

                  {/* Dòng thời gian */}
                  {profile.timeline.length > 0 && (
                    <section className="mt-5" aria-label="Lịch sử hồ sơ">
                      <p className="eyebrow !text-[0.62rem]">Hành trình hồ sơ</p>
                      <ol className="mt-2.5 max-h-72 space-y-2.5 overflow-y-auto pr-1">
                        {profile.timeline
                          .slice()
                          .reverse()
                          .map((entry, i) => (
                            <li
                              key={`${entry.createdAt}-${i}`}
                              className="flex items-start gap-2.5 rounded-[9px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)] bg-[var(--paper)] p-3"
                            >
                              <span className="mt-0.5 shrink-0 text-[var(--royal)]">
                                {i === 0 ? <VCircleCheck size={15} /> : <VClock size={15} />}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-[0.82rem] font-semibold leading-snug">{entry.message}</p>
                                <p className="mt-0.5 text-[0.68rem] tabular text-[var(--ink-soft)]">
                                  {formatDateTimeVN(entry.createdAt)}
                                  {entry.kind ? ` · ${entry.kind}` : ""}
                                </p>
                              </div>
                            </li>
                          ))}
                      </ol>
                    </section>
                  )}

                  {/* Hành động */}
                  <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_18%,transparent)] pt-4">
                    <InkButton
                      variant="outline"
                      size="sm"
                      onClick={downloadCv}
                      disabled={downloadBusy || !profile.hasCv}
                    >
                      <VDownload size={14} /> {downloadBusy ? "Đang tải…" : "Tải CV đã nộp"}
                    </InkButton>
                    <input
                      ref={replaceInputRef}
                      id="replace-cv"
                      type="file"
                      accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="sr-only"
                      onChange={(e) => replaceCv(e.target.files?.[0])}
                    />
                    <label htmlFor="replace-cv">
                      <span
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") e.currentTarget.click();
                        }}
                        className={cn(
                          "focus-ink inline-flex cursor-pointer items-center gap-1.5 rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] px-3.5 py-2 text-[0.82rem] font-bold text-[var(--ink)] shadow-ink-3 transition-all hover:-translate-y-0.5 hover:bg-[var(--blue-mist)]",
                          replaceBusy && "pointer-events-none opacity-60",
                        )}
                      >
                        <VUpload size={14} /> {replaceBusy ? "Đang tải lên…" : "Thay CV mới"}
                      </span>
                    </label>
                    <InkButton variant="ghost" size="sm" onClick={loadProfile} disabled={profileLoading}>
                      Làm mới
                    </InkButton>
                    <InkButton variant="ghost" size="sm" className="!text-[var(--danger)]" onClick={() => setLeaveOpen(true)}>
                      <VLogout size={14} /> Rút hồ sơ
                    </InkButton>
                  </div>
                </>
              )}
            </SketchCard>
          )}
        </div>

        {/* ------------------------- cột phải: hướng dẫn ------------------------- */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <SketchCard hover={false} className="overflow-hidden p-5">
            <img
              src="/images/landing/robot-mascot.png"
              alt="Linh vật robot của V-Intern đang giơ càng tay chào"
              className="mx-auto block h-40 w-auto select-none"
              draggable={false}
            />
            <p className="mt-3 text-center font-hand text-lg leading-snug">
              Ba bước nhỏ, một hành trình thực tập thật ✎
            </p>
            <ol className="mt-3 space-y-2.5 text-[0.82rem] leading-relaxed">
              {[
                "Chọn đợt đang nhận hồ sơ — mỗi đợt có cửa mở/đóng rõ ràng.",
                "Nộp CV PDF/DOCX (≤ 5 MB) kèm email liên hệ — hệ thống gửi thư xác thực ngay.",
                "Xác thực email để AI phân tích CV và đặt lịch phỏng vấn theo khung giờ thật.",
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--blue-mist)] text-[0.65rem] font-extrabold text-[var(--royal)]">
                    {i + 1}
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
          </SketchCard>

          <NoteCard tone="mint" title="Cam kết riêng tư" tapeVariant="mint">
            CV chỉ dùng để sàng lọc ứng tuyển (phiên bản <b>{CV_CONSENT_VERSION}</b>). Bạn có thể tải CV
            về, thay bản mới hoặc rút hồ sơ bất cứ lúc nào sau khi xác thực.
          </NoteCard>

          <NoteCard tone="pink" title="Đã có chứng chỉ?">
            Tra cứu tính hợp lệ chứng chỉ hoàn thành bằng mã xác thực in trên chứng chỉ —{" "}
            <button
              type="button"
              onClick={goVerify}
              className="focus-ink font-bold text-[var(--royal)] underline decoration-wavy underline-offset-4"
            >
              mở trang tra cứu
            </button>
            .
          </NoteCard>

          <MarginNote>
            Gặp trục trặc khi nộp hồ sơ? Kiểm tra lại định dạng CV và cửa đợt tuyển — phần còn lại để
            đội V-Intern lo.
          </MarginNote>
        </aside>
      </main>

      {/* ------------------------------ footer ------------------------------ */}
      <footer className="mt-auto border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)] px-4 py-4 text-center text-[0.7rem] text-[var(--ink-soft)]">
        V-Intern · Cổng ứng tuyển công khai · Hồ sơ được bảo vệ bằng xác thực email
        <span className="ml-1.5 inline-flex items-center gap-1 align-middle">
          <VLock size={11} aria-hidden="true" />
        </span>
      </footer>

      {/* --------------------- dialog: gửi lại thư truy cập --------------------- */}
      <Dialog open={resendOpen} onOpenChange={setResendOpen}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold">Gửi lại thư truy cập</DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Nhập đợt tuyển và email bạn đã dùng — hệ thống sẽ gửi lại thư xác thực/xem hồ sơ.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="resend-round" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                Đợt tuyển
              </label>
              <select
                id="resend-round"
                value={resendRoundId}
                onChange={(e) => setResendRoundId(e.target.value)}
                className="focus-ink w-full rounded-[9px_11px_10px_12px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] outline-none"
              >
                <option value="">— Chọn đợt —</option>
                {(rounds.data ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="resend-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                Email đã nộp hồ sơ
              </label>
              <SketchInput
                id="resend-email"
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="ten@edu.vn"
              />
            </div>
          </div>
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setResendOpen(false)}>
              Đóng
            </InkButton>
            <InkButton variant="royal" size="sm" onClick={submitResend} disabled={resendBusy}>
              <VSend size={14} /> {resendBusy ? "Đang gửi…" : "Gửi lại"}
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --------------------- dialog: rút hồ sơ --------------------- */}
      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent className="rounded-[14px_18px_15px_17px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] shadow-ink-4 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold">Rút hồ sơ ứng tuyển?</DialogTitle>
            <DialogDescription className="text-[var(--ink-soft)]">
              Hồ sơ và lịch phỏng vấn (nếu có) sẽ bị hủy, phiên truy cập hiện tại bị xóa. Hành động
              này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <InkButton variant="ghost" size="sm" onClick={() => setLeaveOpen(false)} disabled={leaveBusy}>
              Giữ lại hồ sơ
            </InkButton>
            <InkButton
              variant="outline"
              size="sm"
              className="!border-[var(--danger)] !text-[var(--danger)]"
              onClick={confirmLeave}
              disabled={leaveBusy}
            >
              <VLogout size={14} /> {leaveBusy ? "Đang rút…" : "Xác nhận rút hồ sơ"}
            </InkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
