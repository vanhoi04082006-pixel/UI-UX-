"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  VAlert,
  VArrowLeft,
  VArrowRight,
  VArrowUpRight,
  VButterfly,
  VCheck,
  VCircleCheck,
  VClipboardCheck,
  VEye,
  VEyeOff,
  VFolderKanban,
  VInfo,
  VKey,
  VLock,
  VLogo,
  VMail,
  VQuote,
  VRainbow,
  VTrend,
  VUser,
} from "@/components/icons/v-icons";
import {
  InkBadge,
  MarginNote,
  PolaroidFrame,
  SketchCard,
  Tape,
} from "@/components/notebook/ui";
import {
  AsteriskDoodle,
  InkSplat,
  PaperclipDoodle,
  SparkleDoodle,
  SquiggleUnderline,
  StarDoodle,
} from "@/components/notebook/doodles";
import { InkButton } from "@/components/notebook/reveal";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { ApiError } from "@/lib/api/api-client";
import { changePassword, login as apiLogin, register } from "@/lib/api/auth";
import { useApp } from "@/lib/store";
import type { Role, SessionUser } from "@/lib/types";
import { cn } from "@/lib/utils";

/* =====================================================================
 * AUTH SCREEN — trang "Đăng nhập / Đăng ký" theo thiết kế Sổ tay hành
 * trình: giấy kẻ ô, lề đỏ, băng dính washi, tab gạch nguệch ngoằn.
 * Bao gồm dải tài khoản demo 12 nick (kèm 403 khóa) và luồng đổi mật
 * khẩu bắt buộc lần đầu (mustChangePassword).
 * ===================================================================== */

type TabKey = "login" | "register";
type FormStatus = "idle" | "submitting" | "success" | "error";

/** Phiên "chờ đổi mật khẩu": đăng nhập đúng nhưng còn mật khẩu mặc định. */
type ChangeCtx = {
  user: SessionUser;
  email: string;
  /** Mật khẩu người dùng vừa gõ ở form đăng nhập — giữ lại để điền lại nhanh. */
  loginPassword: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REMEMBER_KEY = "v-intern-remembered-email";

const INPUT_CLS =
  "w-full rounded-[10px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] px-3.5 py-3 text-sm text-[var(--ink)] transition-all placeholder:text-[var(--ink-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-60";

const BENEFITS: { icon: ReactNode; title: string; desc: string }[] = [
  {
    icon: <VFolderKanban size={20} />,
    title: "Dự án thực tế",
    desc: "task, PR, code review như công ty thật",
  },
  {
    icon: <VClipboardCheck size={20} />,
    title: "Quy trình chuyên nghiệp",
    desc: "sprint 2 tuần, KPI, lương ảo",
  },
  {
    icon: <VTrend size={20} />,
    title: "Phát triển kỹ năng",
    desc: "AI Mentor đồng hành 24/7",
  },
];

/** Câu nói chân trang xoay vòng ở cột trái (mỗi 5 giây đổi một câu). */
const TESTIMONIALS: { quote: string; name: string; meta: string }[] = [
  {
    quote:
      "Sprint đầu nhìn bảng task mà hoa mắt — đến sprint thứ ba mình đã được giao review code của bạn cùng nhóm.",
    name: "Minh",
    meta: "thực tập sinh Frontend · kỳ 2026A",
  },
  {
    quote:
      "Theo dõi 30 sinh viên trên V-Intern dễ hơn chấm bài giấy. Điểm AI chỉ để tham khảo — tôi chỉ việc chốt.",
    name: "Cô Lan",
    meta: "giảng viên hướng dẫn",
  },
  {
    quote:
      "Lương ảo thôi mà, nhưng KPI hàng tuần thì thật — cứ thế mà ráng hết sprint này sang sprint khác.",
    name: "Khánh Vy",
    meta: "thực tập sinh · sprint 4",
  },
];

const ROLE_META: Record<Role, { label: string; tone: string }> = {
  intern: { label: "Sinh viên", tone: "blue" },
  instructor: { label: "Giảng viên", tone: "amber" },
  admin: { label: "Quản trị viên", tone: "mint" },
};

const ROLE_AVATAR: Record<Role, string> = {
  intern: "bg-[var(--royal)] text-white dark:text-[#101018]",
  instructor: "bg-[var(--note-yellow)] text-[var(--note-yellow-ink)]",
  admin: "bg-[var(--note-mint)] text-[var(--note-mint-ink)]",
};

/* ------------------------------ tiện ích ------------------------------ */

/* Ánh xạ ApiError của adapter về ĐÚNG câu chữ mà màn hình cũ từng hiển thị —
 * microcopy (mẹo tài khoản demo, hộp khóa 403…) giữ nguyên không đổi. */

/** Lỗi POST /auth/login — 401 kèm mẹo demo, 403 kèm dòng liên hệ quản trị. */
function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.statusCode) {
      case 401:
        return "Email hoặc mật khẩu không đúng. Mẹo: màn đăng nhập có sẵn tài khoản demo.";
      case 403:
        return "Tài khoản đã bị khóa vì vi phạm quy định nộp bài. Liên hệ quản trị viên qua email quan.tri@vintern.edu.vn.";
      case 0:
        return "Không kết nối được máy chủ demo — kiểm tra kết nối rồi thử lại nhé.";
      default:
        return error.message;
    }
  }
  return "Không hoàn tất được thao tác. Thử lại nhé.";
}

/** Lỗi POST /auth/change-password — 401/400 giữ nguyên câu chữ cũ (không
 * dấu chấm cuối, đúng máy chủ cũ); 401 do phiên (UNAUTHORIZED) thì hiển thị
 * đúng câu adapter trả về. */
function changePasswordErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.statusCode === 401) {
      return error.code === "INVALID_CREDENTIALS" || error.code === "HTTP_ERROR"
        ? "Mật khẩu hiện tại không đúng"
        : error.message;
    }
    if (error.statusCode === 400) return "Mật khẩu mới cần tối thiểu 8 ký tự";
    return error.message;
  }
  return error instanceof Error ? error.message : "Không đổi được mật khẩu. Thử lại nhé.";
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Khoảng chờ cho hiệu ứng ăn tiền — rút ngắn gần như 0 khi bật giảm chuyển động. */
function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, prefersReducedMotion() ? 30 : ms);
  });
}

/* --------------------------- tiểu Handy --------------------------- */

/** Chữ "G" của Google vẽ tay bằng nét mực — thay cho logo chính thức. */
function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <path
        d="M16.6 6.2 C 15.3 4.9 13.6 4.1 11.8 4.2 c -4.2 0.1 -7.4 3.4 -7.3 7.7 c 0.1 4.3 3.4 7.6 7.6 7.5 c 3.7 -0.1 6.6 -2.7 6.9 -6.2 c 0 -0.4 -0.3 -0.7 -0.7 -0.7 h -5.6"
        stroke="var(--royal)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-[#101018]/40 dark:border-t-[#101018]"
    />
  );
}

/** Ô nhập mật khẩu: icon khóa, nút hiện/ẩn + phát hiện Caps Lock. */
function PasswordInput({
  id,
  value,
  onChange,
  show,
  onToggle,
  placeholder,
  autoComplete,
  autoFocus = false,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder: string;
  autoComplete: string;
  autoFocus?: boolean;
}) {
  const [capsOn, setCapsOn] = useState(false);
  return (
    <div>
      <div className="relative">
        <VLock
          size={17}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]"
        />
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyUp={(e) => setCapsOn(e.getModifierState("CapsLock"))}
          onBlur={() => setCapsOn(false)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          className={cn(INPUT_CLS, "pl-10 pr-11")}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-pressed={show}
          className="focus-ink absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
        >
          {show ? <VEyeOff size={17} /> : <VEye size={17} />}
        </button>
      </div>
      {capsOn ? (
        <p role="status" className="mt-1.5 font-hand text-[0.84rem] font-medium text-[var(--warning)]">
          Caps Lock đang bật
        </p>
      ) : null}
    </div>
  );
}

/** Checkbox nét mực: ô vuông viền ink, đánh dấu khi chọn. */
function InkCheckbox({
  id,
  checked,
  onChange,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <span className="flex cursor-pointer select-none items-start gap-2.5">
      <span className="relative inline-flex h-5 w-5 shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="h-5 w-5 rounded-[5px_6px_5px_6px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] transition-colors duration-150 peer-checked:border-[var(--royal)] peer-checked:bg-[var(--royal)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--ink)]"
        />
        <VCheck
          size={12}
          strokeWidth={3.4}
          className="pointer-events-none absolute left-1 top-1 text-white opacity-0 transition-opacity duration-150 peer-checked:opacity-100 dark:text-[#101018]"
        />
      </span>
      <label htmlFor={id} className="cursor-pointer text-sm leading-snug text-[var(--ink)]">
        {children}
      </label>
    </span>
  );
}

function Field({
  id,
  label,
  icon,
  hint,
  hintDanger,
  error,
  children,
}: {
  id: string;
  label: string;
  icon: ReactNode;
  hint?: string;
  hintDanger?: boolean;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="flex items-center gap-1.5 text-sm font-semibold text-[var(--ink)]"
      >
        <span aria-hidden="true" className="text-[var(--ink-soft)]">
          {icon}
        </span>
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs font-medium text-[var(--danger)]">
          {error}
        </p>
      ) : hint ? (
        <p
          className={cn(
            "text-xs",
            hintDanger ? "font-medium text-[var(--danger)]" : "text-[var(--ink-soft)]",
          )}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function InlineAlert({ tone, children }: { tone: "danger" | "info"; children: ReactNode }) {
  return (
    <motion.div
      role={tone === "danger" ? "alert" : "status"}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={cn(
        "flex items-start gap-2.5 rounded-[10px_12px_10px_12px] border-2 p-3 text-[0.83rem] font-medium leading-snug",
        tone === "danger" &&
          "border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_9%,transparent)] text-[var(--danger)]",
        tone === "info" && "border-[var(--royal)] bg-[var(--blue-mist)] text-[var(--ink)]",
      )}
    >
      {tone === "danger" ? (
        <VAlert size={17} className="mt-[1px] shrink-0" />
      ) : (
        <VInfo size={17} className="mt-[1px] shrink-0 text-[var(--royal)]" />
      )}
      <p className="min-w-0">{children}</p>
    </motion.div>
  );
}

/** Hộp chú ý 403 — viền kiến bò (ants) quanh, ổ khóa vẽ tay + dòng liên hệ. */
function LockedNotice({ message, shakeKey }: { message: string; shakeKey: number }) {
  return (
    <div
      key={shakeKey}
      role="alert"
      className="animate-shake-ink ants-border flex items-start gap-3 rounded-[10px_12px_10px_12px] bg-[color-mix(in_srgb,var(--danger)_7%,transparent)] p-3.5"
      style={{ ["--ants-color" as string]: "var(--danger)" }}
    >
      <VLock size={22} className="mt-0.5 shrink-0 text-[var(--danger)]" />
      <div className="min-w-0 text-[0.83rem] leading-snug">
        <p className="font-bold text-[var(--danger)]">Tài khoản đã bị khóa</p>
        <p className="mt-0.5 font-medium text-[var(--ink-soft)]">{message}</p>
      </div>
    </div>
  );
}

/* --------------------------- thước độ mạnh --------------------------- */

const STRENGTH_LEVELS = [
  { label: "Yếu", color: "var(--danger)" },
  { label: "Trung bình", color: "var(--warning)" },
  { label: "Khá", color: "var(--success)" },
  { label: "Mạnh", color: "var(--success)" },
] as const;

function scorePassword(pw: string): number {
  if (!pw) return 0;
  /* Chưa đủ 8 ký tự thì tối đa chỉ "Yếu" — trùng với ràng buộc tối thiểu. */
  if (pw.length < 8) return 1;
  let s = 1; /* đã đạt tối thiểu 8 ký tự */
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s += 1;
  if (/\d/.test(pw)) s += 1;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 14) s += 1;
  return Math.min(s, 4);
}

/** Thước độ mạnh mật khẩu — 4 vạch mực, đỏ → hổ phách → xanh. */
function PasswordStrength({ password }: { password: string }) {
  const score = scorePassword(password);
  const level = STRENGTH_LEVELS[Math.max(0, score - 1)];
  return (
    <div
      className="mt-2"
      role="meter"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={4}
      aria-label={`Độ mạnh mật khẩu: ${level.label}`}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex flex-1 gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={cn(
                "h-[7px] flex-1 rounded-[4px_5px_4px_5px] border-2 transition-colors duration-200",
                i < score
                  ? "border-[var(--ink)]"
                  : "border-dashed border-[color-mix(in_srgb,var(--ink)_35%,transparent)]",
              )}
              style={i < score ? { background: level.color } : undefined}
            />
          ))}
        </div>
        <span
          className="shrink-0 text-[0.7rem] font-bold uppercase tracking-wide"
          style={{ color: level.color }}
        >
          {level.label}
        </span>
      </div>
    </div>
  );
}

function DividerHoac() {
  return (
    <div aria-hidden="true" className="flex items-center gap-3">
      <span className="h-0 flex-1 border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)]" />
      <span className="text-xs font-medium text-[var(--ink-soft)]">Hoặc</span>
      <span className="h-0 flex-1 border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)]" />
    </div>
  );
}

/* ------------------------------ MÀN HÌNH ------------------------------ */

export default function AuthScreen() {
  const goLanding = useApp((s) => s.goLanding);
  const goApply = useApp((s) => s.goApply);
  const login = useApp((s) => s.login);
  const githubCallback = useApp((s) => s.githubCallback);
  const clearGithubCallback = useApp((s) => s.clearGithubCallback);

  const [tab, setTab] = useState<TabKey>("login");

  /* --- đăng nhập --- */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [loginStatus, setLoginStatus] = useState<FormStatus>("idle");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const [lockedMsg, setLockedMsg] = useState<string | null>(null);
  /** Mỗi lần có lỗi mới thì tăng — dùng làm key để chạy lại animation lắc mực. */
  const [errNonce, setErrNonce] = useState(0);

  /* --- đổi mật khẩu bắt buộc (mustChangePassword) --- */
  const [cpCtx, setCpCtx] = useState<ChangeCtx | null>(null);
  const [cpCurrent, setCpCurrent] = useState("");
  const [cpNew, setCpNew] = useState("");
  const [cpConfirm, setCpConfirm] = useState("");
  const [showCpCurrent, setShowCpCurrent] = useState(false);
  const [showCpNew, setShowCpNew] = useState(false);
  const [showCpConfirm, setShowCpConfirm] = useState(false);
  const [cpStatus, setCpStatus] = useState<FormStatus>("idle");
  const [cpError, setCpError] = useState<string | null>(null);
  const [cpErrNonce, setCpErrNonce] = useState(0);
  const [cpShake, setCpShake] = useState(false);

  /* --- đăng ký --- */
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [showRegPass, setShowRegPass] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [agree, setAgree] = useState(false);
  const [regStatus, setRegStatus] = useState<FormStatus>("idle");
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [regErrNonce, setRegErrNonce] = useState(0);

  /* --- câu nói chân trang xoay vòng --- */
  const [tIdx, setTIdx] = useState(0);

  /* ------------------------------ effects ------------------------------ */

  /* Đọc email được ghi nhớ từ lần đăng nhập trước (chỉ chạy phía client).
   * Đọc qua rAF — không setState đồng bộ trong effect (tránh cascading render). */
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        const id = window.requestAnimationFrame(() => {
          setEmail(saved);
          setRemember(true);
        });
        return () => window.cancelAnimationFrame(id);
      }
    } catch {
      /* localStorage bị chặn — bỏ qua */
    }
  }, []);

  /* Câu nói chân trang đổi mỗi 5 giây. */
  useEffect(() => {
    const id = window.setInterval(() => setTIdx((i) => (i + 1) % TESTIMONIALS.length), 5000);
    return () => window.clearInterval(id);
  }, []);

  /* OAuth GitHub về nhưng phiên đã hết hạn — thông báo để người dùng đăng nhập
   * lại; kết nối đã được BE ghi nhận, trạng thái sẽ hiện đúng sau đăng nhập. */
  useEffect(() => {
    if (!githubCallback) return;
    if (githubCallback === "connected") {
      toast.success("GitHub đã được liên kết — đăng nhập để tiếp tục.");
    } else {
      toast.error("Liên kết GitHub chưa thành công — thử lại sau khi đăng nhập.");
    }
    clearGithubCallback();
  }, [githubCallback, clearGithubCallback]);

  /* ------------------------------ luồng ------------------------------ */

  function persistRemember(nextEmail: string) {
    try {
      if (remember) window.localStorage.setItem(REMEMBER_KEY, nextEmail);
      else window.localStorage.removeItem(REMEMBER_KEY);
    } catch {
      /* storage đầy/bị chặn — demo vẫn chạy tiếp */
    }
  }

  function handleRememberChange(v: boolean) {
    setRemember(v);
    try {
      if (!v) window.localStorage.removeItem(REMEMBER_KEY);
    } catch {
      /* bỏ qua */
    }
  }

  async function runLogin(nextEmail: string, nextPassword: string) {
    setLoginStatus("submitting");
    setLoginError(null);
    setLoginNotice(null);
    setLockedMsg(null);
    try {
      /* Adapter tự lưu accessToken vào localStorage — store chỉ cần user. */
      const result = await apiLogin(nextEmail, nextPassword);
      const user = result.user;
      /* Đăng nhập đúng nhưng còn mật khẩu mặc định — CHẶN trước của sổ tay,
       * chưa gọi login() vào workspace cho tới khi đổi mật khẩu xong. */
      if (user.mustChangePassword === true) {
        setPassword("");
        setCpCurrent("");
        setCpNew("");
        setCpConfirm("");
        setCpError(null);
        setCpStatus("idle");
        setCpCtx({ user, email: nextEmail, loginPassword: nextPassword });
        setLoginStatus("idle");
        return;
      }
      setLoginStatus("success");
      const first = user.name.trim().split(/\s+/).at(-1) ?? "bạn";
      toast.success(`Chào ${first}!`);
      persistRemember(nextEmail);
      /* Chờ giữa chừng để dấu tick vẽ mực kịp hoàn tất rồi mới mở sổ tay. */
      await waitMs(560);
      login(user);
    } catch (error) {
      setLoginStatus("error");
      setErrNonce((n) => n + 1);
      if (error instanceof ApiError && error.statusCode === 403) {
        setLockedMsg(loginErrorMessage(error));
        toast.error("Tài khoản đã bị khóa");
      } else {
        setLoginError(loginErrorMessage(error));
      }
    }
  }

  async function handleLoginSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loginStatus === "submitting" || loginStatus === "success") return;
    const nextEmail = email.trim();
    if (!nextEmail || !password) {
      setLoginNotice(null);
      setLoginError("Vui lòng nhập email và mật khẩu.");
      setErrNonce((n) => n + 1);
      return;
    }
    await runLogin(nextEmail, password);
  }

  async function handleRegisterSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!regValid || regStatus === "submitting") return;
    setRegStatus("submitting");
    setRegError(null);
    try {
      /* Adapter trả sẵn câu chào mừng của máy chủ (giữ nguyên như chữ cũ). */
      const message = await register(regName.trim(), regEmail.trim(), regPass);
      setRegStatus("success");
      setRegSuccess(message);
    } catch (err) {
      setRegStatus("error");
      setRegError(err instanceof Error ? err.message : "Đăng ký không thành công. Thử lại nhé.");
      setRegErrNonce((n) => n + 1);
    }
  }

  /** Lắc mực toàn bộ form đổi mật khẩu khi có lỗi. */
  function triggerCpShake() {
    setCpErrNonce((n) => n + 1);
    setCpShake(true);
    window.setTimeout(() => setCpShake(false), 520);
  }

  async function handleChangePasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (cpStatus === "submitting" || cpCtx === null) return;
    if (!cpCurrent) {
      setCpError("Nhập mật khẩu hiện tại — chính là mật khẩu bạn vừa dùng để đăng nhập.");
      triggerCpShake();
      return;
    }
    if (cpNew.length < 12) {
      setCpError("Mật khẩu mới cần tối thiểu 12 ký tự (yêu cầu máy chủ).");
      triggerCpShake();
      return;
    }
    if (cpConfirm.length === 0 || cpConfirm !== cpNew) {
      setCpError("Mật khẩu xác nhận chưa khớp với mật khẩu mới.");
      triggerCpShake();
      return;
    }
    setCpStatus("submitting");
    setCpError(null);
    try {
      /* BE thật: đổi mật khẩu thành công → refresh cookie bị xoá, phiên
       * hiện tại kết thúc → bắt đăng nhập lại bằng mật khẩu mới. */
      await changePassword(cpCurrent, cpNew);
      setCpStatus("success");
      toast.success("Đã đổi mật khẩu — hãy đăng nhập lại bằng mật khẩu mới.");
      persistRemember(cpCtx.email);
      await waitMs(680);
      setCpCtx(null);
      setCpCurrent("");
      setCpNew("");
      setCpConfirm("");
      switchTab("login", cpCtx.email);
      setLoginNotice("Mật khẩu đã được đổi — đăng nhập lại bằng mật khẩu mới nhé!");
    } catch (err) {
      setCpStatus("error");
      setCpError(changePasswordErrorMessage(err));
      triggerCpShake();
    }
  }

  /** Thoát phiên đổi mật khẩu — về trang chủ, không đăng nhập. */
  function escapeChangeFlow() {
    setCpCtx(null);
    setCpCurrent("");
    setCpNew("");
    setCpConfirm("");
    setCpError(null);
    setCpStatus("idle");
    goLanding();
  }

  function switchTab(next: TabKey, prefillEmail?: string) {
    setTab(next);
    if (next === "login" && prefillEmail) {
      setEmail(prefillEmail);
      setPassword("");
    }
    if (next === "register") setRegSuccess(null);
    setLoginError(null);
    setLoginNotice(null);
    setLockedMsg(null);
  }

  /* --- kiểm tra hợp lệ phía client (nút đăng ký chỉ bật khi đủ) --- */
  const regNameOk = regName.trim().length >= 2;
  const regEmailOk = EMAIL_RE.test(regEmail.trim());
  const regPassOk = regPass.length >= 8;
  const confirmMismatch = regConfirm.length > 0 && regPass !== regConfirm;
  const regValid = regNameOk && regEmailOk && regPassOk && regConfirm === regPass && agree;

  /* --- kiểm tra hợp lệ phía form đổi mật khẩu --- */
  const cpNewOk = cpNew.length >= 8;
  const cpConfirmMismatch = cpConfirm.length > 0 && cpConfirm !== cpNew;

  const submittingLogin = loginStatus === "submitting";
  const submittingRegister = regStatus === "submitting";
  const t = TESTIMONIALS[tIdx];

  return (
    <div className="paper-grain relative flex min-h-screen flex-col overflow-hidden bg-[var(--paper)] text-[var(--ink)]">
      {/* Giấy kẻ ô xuyên suốt trang */}
      <div aria-hidden="true" className="paper-grid pointer-events-none absolute inset-0" />

      {/* Doodles trôi nhẹ — chỉ hiện từ md trở lên */}
      <StarDoodle
        className="animate-float-soft pointer-events-none absolute left-[5%] top-[13%] hidden h-9 w-9 text-[var(--royal)] opacity-25 md:block"
        style={{ animationDelay: "0.3s" }}
      />
      <SparkleDoodle
        className="animate-float-soft pointer-events-none absolute right-[6%] top-[17%] hidden h-7 w-7 text-[var(--royal)] opacity-20 md:block"
        style={{ animationDelay: "1.4s" }}
      />
      <InkSplat
        className="animate-float-soft pointer-events-none absolute bottom-[9%] left-[36%] hidden h-16 w-16 text-[var(--ink)] opacity-[0.07] md:block"
        style={{ animationDelay: "0.8s" }}
      />
      <AsteriskDoodle
        className="animate-float-soft pointer-events-none absolute bottom-[15%] right-[4%] hidden h-6 w-6 text-[var(--stamp-red)] opacity-30 md:block"
        style={{ animationDelay: "2s" }}
      />
      <VRainbow
        className="animate-float-y pointer-events-none absolute bottom-[22%] right-[10%] hidden h-10 w-10 text-[var(--gold)] opacity-30 md:block"
        style={{ animationDelay: "0.6s" }}
      />
      <VButterfly
        className="animate-float-y pointer-events-none absolute bottom-[9%] left-[8%] hidden h-7 w-7 text-[var(--royal)] opacity-25 md:block"
        style={{ animationDelay: "2.4s" }}
      />

      {/* Hàng đầu trang: logo + quay lại + đổi theme */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <VLogo size={34} />
          <div className="leading-none">
            <p className="text-lg font-extrabold tracking-tight">V-Intern</p>
            <p className="eyebrow mt-1 !text-[0.58rem]">sổ tay hành trình</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={goLanding}
            aria-label="Quay lại trang chủ"
            className="focus-ink inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] px-3.5 py-2 text-[0.83rem] font-semibold shadow-ink-2 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-ink-3"
          >
            <VArrowLeft size={16} />
            <span className="hidden sm:inline">Quay lại</span>
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* Nội dung chính */}
      <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-4 pb-4 pt-6 sm:px-6 sm:pt-10 lg:pb-10 lg:pt-12">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
          {/* ---- Cột trái: bối cảnh hành trình (ẩn trên mobile) ---- */}
          <section
            aria-label="Vì sao nên thực tập qua V-Intern"
            className="relative hidden lg:block"
          >
            <div className="dog-ear red-margin h-full pb-2 pl-7 pr-1 pt-1">
              <p className="eyebrow">hành trình thực tập</p>
              <h2 className="mt-3 max-w-md text-3xl font-bold leading-[1.25]">
                Thực tập như một{" "}
                <span className="marker animate-marker-blot font-extrabold">
                  lập trình viên thực thụ
                </span>
                .
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--ink-soft)]">
                V-Intern đặt bạn vào một công ty công nghệ thu nhỏ: nhận task thật,
                mở pull request, được review code và chấm điểm sau mỗi sprint — tất
                cả được ghi lại trung thực trong từng trang sổ.
              </p>

              <ul className="mt-7 space-y-4">
                {BENEFITS.map((b) => (
                  <li key={b.title} className="flex items-start gap-3.5">
                    <span
                      aria-hidden="true"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px_12px_10px_12px] border-2 border-[var(--ink)] bg-[var(--blue-mist)] text-[var(--royal-deep)] shadow-ink-2"
                    >
                      {b.icon}
                    </span>
                    <span>
                      <span className="block text-sm font-bold">{b.title}</span>
                      <span className="mt-0.5 block text-xs text-[var(--ink-soft)]">{b.desc}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <MarginNote className="mt-7">
                sổ tay này ghi lại từng bước của bạn
              </MarginNote>

              {/* Câu nói chân trang — dán băng dính, xoay vòng 5 giây/câu */}
              <div className="relative mt-10 max-w-md">
                <Tape
                  variant="mint"
                  rotate={-2}
                  peel
                  className="absolute -top-3 left-1/2 z-10 !h-6 !w-24 -translate-x-1/2"
                />
                <div className="rounded-[12px_15px_11px_14px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] p-5 shadow-ink-3">
                  <div className="flex items-center gap-2">
                    <VQuote size={18} className="text-[var(--royal)]" />
                    <p className="eyebrow !text-[0.58rem]">lời ghi chân trang</p>
                  </div>
                  <div aria-live="polite">
                    <AnimatePresence mode="wait">
                      <motion.blockquote
                        key={tIdx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.32, ease: "easeOut" }}
                        className="mt-3 min-h-[104px]"
                      >
                        <p className="font-hand text-[1.06rem] leading-relaxed text-[var(--ink)]">
                          “{t.quote}”
                        </p>
                        <footer className="mt-2.5 text-xs text-[var(--ink-soft)]">
                          — <b className="text-[var(--ink)]">{t.name}</b> · {t.meta}
                        </footer>
                      </motion.blockquote>
                    </AnimatePresence>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5" aria-hidden="true">
                    {TESTIMONIALS.map((tt, i) => (
                      <span
                        key={tt.name}
                        className={cn(
                          "h-1.5 w-1.5 rounded-full border transition-colors duration-200",
                          i === tIdx
                            ? "border-[var(--royal)] bg-[var(--royal)]"
                            : "border-[var(--ink-soft)] bg-transparent",
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-10 hidden xl:block">
                <PolaroidFrame
                  src="/images/characters/student-walker.png"
                  alt="Vẽ tay sinh viên đeo balo bước trên hành trình thực tập"
                  caption="trang đầu tiên bắt đầu từ đây →"
                  rotate={2}
                  tapeVariant="candy"
                  className="w-52"
                />
              </div>
            </div>
          </section>

          {/* ---- Cột phải: thẻ đăng nhập/đăng ký + dải tài khoản demo ---- */}
          <div>
            <div className="relative">
              <SketchCard hover={false} className="p-6 pb-7 sm:p-8">
                {cpCtx !== null ? (
                  /* ---------------- ĐỔI MẬT KHẨU BẮT BUỘC ---------------- */
                  <div key="cp-panel" className="page-curl-enter">
                    <form
                      onSubmit={handleChangePasswordSubmit}
                      noValidate
                      aria-label="Form đổi mật khẩu bắt buộc"
                      className={cn("space-y-5", cpShake && "animate-shake-ink")}
                    >
                      <div className="flex items-start gap-3.5">
                        <span
                          aria-hidden="true"
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px_14px_10px_13px] border-2 border-[var(--gold)] bg-[var(--gold-soft)] text-[var(--gold)] shadow-ink-2"
                        >
                          <VKey size={22} />
                        </span>
                        <div>
                          <h1 className="text-[1.35rem] font-extrabold leading-tight sm:text-[1.45rem]">
                            Đổi mật khẩu trước khi vào sổ tay
                          </h1>
                          <p className="mt-1 text-[0.83rem] leading-relaxed text-[var(--ink-soft)]">
                            Tài khoản của bạn đang dùng mật khẩu mặc định. Vì an toàn, hãy
                            đặt mật khẩu riêng của mình ở lần đăng nhập đầu tiên này nhé.
                          </p>
                        </div>
                      </div>

                      {/* Ai đang đổi mật khẩu */}
                      <div className="flex items-center gap-3 rounded-[10px_12px_10px_12px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_25%,transparent)] bg-[var(--paper-raised)] p-3">
                        <span
                          aria-hidden="true"
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[var(--ink)] text-[0.74rem] font-extrabold",
                            ROLE_AVATAR[cpCtx.user.role],
                          )}
                        >
                          {cpCtx.user.initials}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-[var(--ink)]">
                            {cpCtx.user.name}
                          </span>
                          <span className="block truncate text-xs text-[var(--ink-soft)]">
                            {cpCtx.user.email}
                          </span>
                        </span>
                        <InkBadge
                          tone={ROLE_META[cpCtx.user.role].tone}
                          className="shrink-0 !px-2 !py-0 !text-[0.66rem]"
                        >
                          {ROLE_META[cpCtx.user.role].label}
                        </InkBadge>
                      </div>

                      <Field
                        id="cp-current"
                        label="Mật khẩu hiện tại"
                        icon={<VLock size={14} />}
                        hint="Chính là mật khẩu bạn vừa dùng để đăng nhập lúc nãy."
                      >
                        <PasswordInput
                          id="cp-current"
                          value={cpCurrent}
                          onChange={setCpCurrent}
                          show={showCpCurrent}
                          onToggle={() => setShowCpCurrent((v) => !v)}
                          placeholder="Nhập mật khẩu hiện tại"
                          autoComplete="current-password"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setCpCurrent(cpCtx.loginPassword)}
                          className="focus-ink mt-1 rounded-[6px] font-hand text-[0.84rem] text-[var(--pencil)] underline decoration-dotted decoration-1 underline-offset-4 transition-colors hover:text-[var(--ink)]"
                        >
                          quên gõ lại? điền mật khẩu vừa dùng ở form đăng nhập ✎
                        </button>
                      </Field>

                      <Field
                        id="cp-new"
                        label="Mật khẩu mới"
                        icon={<VKey size={14} />}
                        hint={
                          cpNew.length > 0 && !cpNewOk
                            ? "Mật khẩu mới cần tối thiểu 8 ký tự."
                            : "Tối thiểu 8 ký tự — nên trộn chữ hoa, số và ký tự đặc biệt."
                        }
                        hintDanger={cpNew.length > 0 && !cpNewOk}
                      >
                        <PasswordInput
                          id="cp-new"
                          value={cpNew}
                          onChange={setCpNew}
                          show={showCpNew}
                          onToggle={() => setShowCpNew((v) => !v)}
                          placeholder="Chọn mật khẩu mới"
                          autoComplete="new-password"
                        />
                        {cpNew.length > 0 ? <PasswordStrength password={cpNew} /> : null}
                      </Field>

                      <Field
                        id="cp-confirm"
                        label="Xác nhận mật khẩu mới"
                        icon={<VLock size={14} />}
                        error={cpConfirmMismatch ? "Mật khẩu xác nhận chưa khớp." : null}
                      >
                        <PasswordInput
                          id="cp-confirm"
                          value={cpConfirm}
                          onChange={setCpConfirm}
                          show={showCpConfirm}
                          onToggle={() => setShowCpConfirm((v) => !v)}
                          placeholder="Nhập lại mật khẩu mới"
                          autoComplete="new-password"
                        />
                      </Field>

                      {cpError ? (
                        <div
                          key={`cp-err-${cpErrNonce}`}
                          className="animate-shake-ink"
                          aria-live="assertive"
                        >
                          <InlineAlert tone="danger">{cpError}</InlineAlert>
                        </div>
                      ) : null}

                      {cpStatus === "success" ? (
                        <div
                          role="status"
                          className="flex items-center justify-center gap-2.5 rounded-[10px_13px_11px_12px] border-2 border-[var(--success)] bg-[color-mix(in_srgb,var(--success)_12%,transparent)] p-4 text-sm font-bold text-[var(--success)]"
                        >
                          <span className="confetti-pop play relative inline-flex">
                            <VCircleCheck size={24} className="draw-check" />
                          </span>
                          Đã đổi mật khẩu — đang mở sổ tay…
                        </div>
                      ) : (
                        <InkButton
                          type="submit"
                          variant="royal"
                          size="lg"
                          className="shine-sweep w-full"
                          disabled={cpStatus === "submitting"}
                          aria-busy={cpStatus === "submitting"}
                        >
                          {cpStatus === "submitting" ? (
                            <>
                              <Spinner />
                              Đang đổi mật khẩu...
                            </>
                          ) : (
                            <>
                              Đổi mật khẩu &amp; vào sổ tay
                              <VKey size={17} />
                            </>
                          )}
                        </InkButton>
                      )}

                      <p className="text-center">
                        <button
                          type="button"
                          onClick={escapeChangeFlow}
                          className="focus-ink rounded-[6px] text-[0.83rem] font-semibold text-[var(--ink-soft)] underline decoration-dotted decoration-1 underline-offset-4 transition-colors hover:text-[var(--danger)]"
                        >
                          Đăng xuất khỏi phiên này
                        </button>
                      </p>
                    </form>
                  </div>
                ) : (
                  <>
                    {/* Tab vẽ tay — gạch chân nguệch ngoằn khi đang chọn */}
                    <div
                      role="tablist"
                      aria-label="Chọn chế độ truy cập"
                      className="mb-6 flex gap-1.5 border-b-2 border-[var(--ink)] sm:gap-5"
                    >
                      {(["login", "register"] as const).map((key) => {
                        const active = tab === key;
                        return (
                          <button
                            key={key}
                            role="tab"
                            type="button"
                            aria-selected={active}
                            onClick={() => switchTab(key)}
                            className={cn(
                              "focus-ink relative rounded-t-[8px] px-3 pb-3 pt-1.5 text-[0.95rem] font-bold transition-colors sm:px-4",
                              active
                                ? "text-[var(--ink)]"
                                : "text-[var(--ink-soft)] hover:text-[var(--ink)]",
                            )}
                          >
                            {key === "login" ? "Đăng nhập" : "Đăng ký"}
                            {active && (
                              <SquiggleUnderline className="absolute inset-x-2 -bottom-[3px] h-2.5 text-[var(--royal)]" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div key={tab} role="tabpanel" className="page-curl-enter" aria-label={tab === "login" ? "Đăng nhập" : "Đăng ký"}>
                      {tab === "login" ? (
                        /* ------------------------- ĐĂNG NHẬP ------------------------- */
                        <form
                          onSubmit={handleLoginSubmit}
                          noValidate
                          className="space-y-5"
                          aria-label="Form đăng nhập"
                        >
                          <div>
                            <h1 className="text-[1.55rem] font-extrabold leading-tight sm:text-[1.7rem]">
                              Chào mừng trở lại!
                            </h1>
                            <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-soft)]">
                              Đăng nhập để tiếp tục hành trình thực tập của bạn.
                            </p>
                          </div>

                          <Field id="login-email" label="Email" icon={<VMail size={14} />}>
                            <div className="relative">
                              <VMail
                                size={17}
                                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]"
                              />
                              <input
                                id="login-email"
                                name="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Nhập email — ví dụ: minh.nguyen@student.edu.vn"
                                autoComplete="email"
                                className={cn(INPUT_CLS, "pl-10")}
                              />
                            </div>
                          </Field>

                          <Field id="login-password" label="Mật khẩu" icon={<VLock size={14} />}>
                            <PasswordInput
                              id="login-password"
                              value={password}
                              onChange={setPassword}
                              show={showLoginPass}
                              onToggle={() => setShowLoginPass((v) => !v)}
                              placeholder="Nhập mật khẩu"
                              autoComplete="current-password"
                            />
                          </Field>

                          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                            <InkCheckbox
                              id="remember"
                              checked={remember}
                              onChange={handleRememberChange}
                            >
                              Ghi nhớ email
                            </InkCheckbox>
                            <button
                              type="button"
                              onClick={() =>
                                toast.info("Liên hệ quản trị viên để đặt lại mật khẩu (mô phỏng)")
                              }
                              className="focus-ink rounded-[6px] text-sm font-semibold text-[var(--royal)] underline decoration-dotted decoration-1 underline-offset-4 transition-colors hover:text-[var(--royal-deep)]"
                            >
                              Quên mật khẩu?
                            </button>
                          </div>

                          {lockedMsg ? (
                            <LockedNotice message={lockedMsg} shakeKey={errNonce} />
                          ) : loginError ? (
                            <div
                              key={`err-${errNonce}`}
                              className="animate-shake-ink"
                              aria-live="assertive"
                            >
                              <InlineAlert tone="danger">{loginError}</InlineAlert>
                            </div>
                          ) : null}
                          {loginNotice ? <InlineAlert tone="info">{loginNotice}</InlineAlert> : null}

                          <InkButton
                            type="submit"
                            variant="royal"
                            size="lg"
                            className="shine-sweep w-full"
                            disabled={submittingLogin}
                            aria-busy={submittingLogin}
                          >
                            {submittingLogin ? (
                              <>
                                <Spinner />
                                Đang đăng nhập...
                              </>
                            ) : loginStatus === "success" ? (
                              <>
                                <VCircleCheck size={19} className="draw-check" />
                                Đăng nhập thành công!
                              </>
                            ) : (
                              <>
                                Đăng nhập
                                <VArrowRight size={17} />
                              </>
                            )}
                          </InkButton>

                          <DividerHoac />

                          <InkButton
                            type="button"
                            variant="outline"
                            size="lg"
                            className="w-full"
                            onClick={() => {
                              setLoginError(null);
                              setLockedMsg(null);
                              setLoginNotice("Đăng nhập Google chưa được kết nối với hệ thống demo.");
                            }}
                          >
                            <GoogleMark />
                            Đăng nhập với Google
                          </InkButton>

                          {/* Chưa có tài khoản → cổng ứng tuyển công khai (không cần đăng ký) */}
                          <div className="space-y-2.5 pt-1">
                            <p className="text-center text-sm text-[var(--ink-soft)]">
                              Chưa có tài khoản? Nộp hồ sơ ứng tuyển — không cần đăng ký.
                            </p>
                            <InkButton
                              type="button"
                              variant="outline"
                              size="lg"
                              className="w-full"
                              onClick={goApply}
                            >
                              Ứng Tuyển Ngay
                              <VArrowUpRight size={17} className="text-[var(--royal)]" />
                            </InkButton>
                          </div>
                        </form>
                      ) : regSuccess ? (
                        /* --------------------- ĐĂNG KÝ THÀNH CÔNG --------------------- */
                        <div className="flex flex-col items-center py-6 text-center">
                          <motion.span
                            initial={{ scale: 0, rotate: -24 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 16 }}
                            className="confetti-pop play relative inline-flex text-[var(--royal)]"
                          >
                            <VCircleCheck size={56} />
                          </motion.span>
                          <h2 className="nb-rise mt-4 text-2xl font-extrabold">Đăng ký thành công!</h2>
                          <p className="nb-rise mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--ink-soft)]">
                            {regSuccess}
                          </p>
                          <p className="nb-rise mt-2 max-w-sm font-hand text-[0.95rem] text-[var(--pencil)]">
                            email của bạn đã được điền sẵn ở tab đăng nhập ✎
                          </p>
                          <InkButton
                            type="button"
                            variant="royal"
                            size="lg"
                            className="mt-6"
                            onClick={() => switchTab("login", regEmail.trim())}
                          >
                            Đăng nhập ngay
                            <VArrowRight size={17} />
                          </InkButton>
                        </div>
                      ) : (
                        /* --------------------------- ĐĂNG KÝ --------------------------- */
                        <form
                          onSubmit={handleRegisterSubmit}
                          noValidate
                          className="space-y-5"
                          aria-label="Form đăng ký"
                        >
                          <div>
                            <h1 className="text-[1.55rem] font-extrabold leading-tight sm:text-[1.7rem]">
                              Tạo tài khoản mới
                            </h1>
                            <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-soft)]">
                              Bắt đầu hành trình thực tập của bạn ngay hôm nay.
                            </p>
                          </div>

                          <div className="grid gap-5 sm:grid-cols-2">
                            <Field id="reg-name" label="Họ và tên" icon={<VUser size={14} />}>
                              <div className="relative">
                                <VUser
                                  size={17}
                                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]"
                                />
                                <input
                                  id="reg-name"
                                  name="name"
                                  type="text"
                                  value={regName}
                                  onChange={(e) => setRegName(e.target.value)}
                                  placeholder="Ví dụ: Nguyễn Văn A"
                                  autoComplete="name"
                                  className={cn(INPUT_CLS, "pl-10")}
                                />
                              </div>
                            </Field>

                            <Field id="reg-email" label="Email" icon={<VMail size={14} />}>
                              <div className="relative">
                                <VMail
                                  size={17}
                                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]"
                                />
                                <input
                                  id="reg-email"
                                  name="email"
                                  type="email"
                                  value={regEmail}
                                  onChange={(e) => setRegEmail(e.target.value)}
                                  placeholder="ten.ban@student.edu.vn"
                                  autoComplete="email"
                                  className={cn(INPUT_CLS, "pl-10")}
                                />
                              </div>
                            </Field>

                            <Field
                              id="reg-password"
                              label="Mật khẩu"
                              icon={<VLock size={14} />}
                              hint={
                                regPass.length > 0 && !regPassOk
                                  ? "Mật khẩu cần tối thiểu 8 ký tự."
                                  : "Tối thiểu 8 ký tự."
                              }
                              hintDanger={regPass.length > 0 && !regPassOk}
                            >
                              <PasswordInput
                                id="reg-password"
                                value={regPass}
                                onChange={setRegPass}
                                show={showRegPass}
                                onToggle={() => setShowRegPass((v) => !v)}
                                placeholder="Chọn một mật khẩu"
                                autoComplete="new-password"
                              />
                              {regPass.length > 0 ? <PasswordStrength password={regPass} /> : null}
                            </Field>

                            <Field
                              id="reg-confirm"
                              label="Xác nhận mật khẩu"
                              icon={<VLock size={14} />}
                              error={confirmMismatch ? "Mật khẩu xác nhận chưa khớp." : null}
                            >
                              <PasswordInput
                                id="reg-confirm"
                                value={regConfirm}
                                onChange={setRegConfirm}
                                show={showRegConfirm}
                                onToggle={() => setShowRegConfirm((v) => !v)}
                                placeholder="Nhập lại mật khẩu"
                                autoComplete="new-password"
                              />
                            </Field>
                          </div>

                          <InkCheckbox id="agree" checked={agree} onChange={setAgree}>
                            Tôi đồng ý với <b>Điều khoản sử dụng</b> và{" "}
                            <b>Chính sách bảo mật</b> của V-Intern.
                          </InkCheckbox>

                          {regError ? (
                            <div
                              key={`reg-err-${regErrNonce}`}
                              className="animate-shake-ink"
                              aria-live="assertive"
                            >
                              <InlineAlert tone="danger">{regError}</InlineAlert>
                            </div>
                          ) : null}

                          <InkButton
                            type="submit"
                            variant="royal"
                            size="lg"
                            className="shine-sweep w-full"
                            disabled={!regValid || submittingRegister}
                            aria-busy={submittingRegister}
                          >
                            {submittingRegister ? (
                              <>
                                <Spinner />
                                Đang đăng ký...
                              </>
                            ) : (
                              <>
                                Đăng ký
                                <VArrowRight size={17} />
                              </>
                            )}
                          </InkButton>

                          <p className="pt-1 text-center text-sm text-[var(--ink-soft)]">
                            Đã có tài khoản?{" "}
                            <button
                              type="button"
                              onClick={() => switchTab("login")}
                              className="focus-ink rounded-[6px] font-bold text-[var(--royal)] underline decoration-2 underline-offset-4 transition-colors hover:text-[var(--royal-deep)]"
                            >
                              Đăng nhập ngay
                            </button>
                          </p>
                        </form>
                      )}
                    </div>
                  </>
                )}
              </SketchCard>

              {/* Băng dính kẹo + kẹp giấy trang trí trên mép thẻ */}
              <Tape
                variant="candy"
                rotate={-3}
                peel
                className="z-10 -top-3.5 left-1/2 !h-7 !w-28 -translate-x-1/2"
              />
              <PaperclipDoodle className="absolute -right-3.5 -top-6 z-10 h-14 w-9 text-[var(--ink)] opacity-85" />
            </div>

          </div>
        </div>
      </main>

      {/* Chân trang dính đáy */}
      <footer className="relative z-10 mt-auto">
        <div className="mx-auto w-full max-w-6xl px-4 pb-5 pt-6 text-center sm:px-6">
          <p className="text-xs text-[var(--ink-soft)]">© 2026 V-Intern · Sổ tay hành trình</p>
          <p className="font-hand mt-1 text-[0.92rem] text-[var(--pencil)]">
            an toàn như cuốn sổ khóa bằng kẹp bấm ✎
          </p>
        </div>
      </footer>
    </div>
  );
}
