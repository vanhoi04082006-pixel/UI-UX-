"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  VChevronDown,
  VCircleCheck,
  VExternal,
  VGithub,
  VLogo,
  VMail,
  VMessage,
} from "@/components/icons/v-icons";
import { FadeIn, InkButton } from "@/components/notebook/reveal";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FooterLink = { label: string; href: string | null };
type FooterColumn = { heading: string; links: FooterLink[] };

/** `href: null` = trang đích chưa có — hiển thị kèm chú thích "sắp ra mắt". */
const LINK_COLUMNS: FooterColumn[] = [
  {
    heading: "Sản phẩm",
    links: [
      { label: "Nền tảng", href: "#platform" },
      { label: "Quy trình", href: "#how-it-works" },
      { label: "Chứng nhận", href: "#workflow" },
      { label: "Câu hỏi", href: "#faq" },
    ],
  },
  {
    heading: "Đối tượng",
    links: [
      { label: "Sinh viên", href: "#for-students" },
      { label: "Giảng viên", href: "#for-instructors" },
    ],
  },
  {
    heading: "Tài nguyên",
    links: [
      { label: "Tài liệu", href: "#how-it-works" },
      { label: "Blog", href: null },
    ],
  },
  {
    heading: "Công ty",
    links: [
      { label: "Giới thiệu", href: null },
      { label: "Liên hệ", href: null },
    ],
  },
];

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = email.trim();
    if (!EMAIL_PATTERN.test(value)) {
      setError("Email chưa đúng dáng dấp — kiểm tra lại giúp mình nhé!");
      setShaking(true);
      window.setTimeout(() => setShaking(false), 520);
      inputRef.current?.focus();
      return;
    }
    setError(null);
    setSent(true);
    toast.success("Đã ghi nhận email — bản tin demo sẽ sớm ghé thăm!");
  };

  return (
    <form onSubmit={onSubmit} className="mt-3 max-w-xs" noValidate>
      <div className="flex items-center gap-2">
        <label htmlFor="landing-newsletter" className="sr-only">
          Email nhận bản tin
        </label>
        <input
          ref={inputRef}
          id="landing-newsletter"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error !== null}
          aria-describedby={error ? "landing-newsletter-error" : undefined}
          placeholder="email@truong.edu.vn"
          className={`focus-ink min-w-0 flex-1 rounded-[10px_12px_10px_12px] border-2 bg-[#141419] px-3.5 py-2.5 text-sm text-[#f2f1e9] outline-none transition-colors placeholder:text-[#70707b] focus:border-[#7d97ff] ${
            error ? "animate-shake-ink border-[#d6548a]" : "border-[#f2f1e9]/25"
          }`}
        />
        <InkButton variant="white" size="sm" type="submit" className="shrink-0">
          Nhận bản tin
        </InkButton>
      </div>

      {error && (
        <p id="landing-newsletter-error" role="alert" className="mt-2.5 font-hand text-[0.9rem] leading-snug text-[#f9a8c9]">
          {error}
        </p>
      )}

      {sent && !error && (
        <p className="mt-2.5 flex items-center gap-1.5 font-hand text-[0.9rem] leading-snug text-[#a8a8b2]">
          <VCircleCheck size={16} className="animate-pop-in shrink-0 text-[#6fe0b0]" aria-hidden="true" />
          đã ghi nhận — bản tin đầu tiên sẽ đến sớm ✎
        </p>
      )}
    </form>
  );
}

/** Nút về đầu trang — tròn sketch, hiện sau 600px cuộn, mượt và keyboard-friendly. */
function BackToTop() {
  const [visible, setVisible] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="Về đầu trang"
      title="Về đầu trang"
      onClick={() => window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" })}
      className={`no-print focus-ink fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--ink)] shadow-ink-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-ink-4 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <VChevronDown size={18} className="rotate-180" aria-hidden="true" />
    </button>
  );
}

const SOCIAL_ANCHORS = [
  { label: "GitHub", href: "https://github.com", icon: VGithub },
  { label: "Email", href: "mailto:hello@v-intern.vn", icon: VMail },
];

const SOCIAL_BUTTONS = [
  { label: "Cộng đồng", icon: VExternal },
  { label: "Hỗ trợ", icon: VMessage },
];

export function Footer() {
  return (
    <footer className="relative mt-auto w-full bg-[var(--coal)] text-[#f2f1e9]">
      {/* Gạch chân mực trên nền bảng đen — chỉnh màu phấn cho nhìn thấy */}
      <style>{`
        .footer-ink-link.ink-underline-hover::after {
          background: var(--chalk);
        }
      `}</style>

      {/* Mép giấy rách — trang cuối xé nhẹ để lộ bìa sau than chì */}
      <div
        aria-hidden="true"
        className="divider-torn"
        style={{ background: "var(--paper)" }}
      />
      {/* Bụi phấn mờ */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(242, 241, 233, 0.05) 1.2px, transparent 1.2px)",
          backgroundSize: "22px 22px",
        }}
      />

      <FadeIn y={16} className="relative mx-auto max-w-6xl px-4 pb-12 pt-14 sm:px-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-[1.5fr_repeat(4,minmax(0,1fr))] lg:gap-x-8">
          {/* Khuôn hiệu + bản tin */}
          <div className="col-span-2 lg:col-span-1 lg:pr-4">
            <VLogo size={26} className="text-[#f2f1e9]" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#a8a8b2]">
              Nền tảng thực tập ảo mô phỏng quy trình làm việc thật, giúp sinh
              viên và giảng viên kết nối với cơ hội nghề nghiệp thực tế.
            </p>

            <div className="mt-8">
              <h2 className="font-mono2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#f2f1e9]">
                Nhận bản tin
              </h2>
              <p className="mt-2 max-w-xs text-xs leading-relaxed text-[#a8a8b2]">
                Nhập email và nhận tin ngành phần mềm mỗi kỳ sprint.
              </p>
              <NewsletterForm />
            </div>

            <ul className="mt-7 flex gap-3">
              {SOCIAL_ANCHORS.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target={social.href.startsWith("http") ? "_blank" : undefined}
                    rel={social.href.startsWith("http") ? "noreferrer" : undefined}
                    className="focus-ink flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#f2f1e9]/20 bg-[#f2f1e9]/5 text-[#a8a8b2] transition-all hover:-translate-y-0.5 hover:border-[#7d97ff] hover:bg-[#7d97ff] hover:text-white"
                  >
                    <span className="sr-only">{social.label}</span>
                    <social.icon size={17} />
                  </a>
                </li>
              ))}
              {SOCIAL_BUTTONS.map((social) => (
                <li key={social.label}>
                  <button
                    type="button"
                    onClick={() => toast(`${social.label} của V-Intern — sắp ra mắt`)}
                    className="focus-ink flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#f2f1e9]/20 bg-[#f2f1e9]/5 text-[#a8a8b2] transition-all hover:-translate-y-0.5 hover:border-[#7d97ff] hover:bg-[#7d97ff] hover:text-white"
                  >
                    <span className="sr-only">{social.label}</span>
                    <social.icon size={17} />
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span
                className="stamp-moc font-hand tracking-wide"
                style={{
                  ["--stamp-rotate" as string]: "-7deg",
                  borderColor: "rgba(242, 241, 233, 0.65)",
                  color: "rgba(242, 241, 233, 0.75)",
                }}
              >
                Ấn bản 2026
              </span>
              <span className="font-hand text-[0.95rem] text-[#a8a8b2]">
                in tại Việt Nam ✎
              </span>
            </div>
          </div>

          {/* 4 cột liên kết */}
          {LINK_COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h2 className="font-mono2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#f2f1e9]">
                {column.heading}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) =>
                  link.href ? (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="footer-ink-link ink-underline-hover focus-ink rounded text-sm text-[#a8a8b2] transition-colors hover:text-[#7d97ff]"
                      >
                        {link.label}
                      </a>
                    </li>
                  ) : (
                    <li key={link.label} className="text-sm text-[#a8a8b2]">
                      <span title="Sắp ra mắt" className="cursor-default">
                        {link.label}
                      </span>
                      <span className="ml-1.5 font-hand text-[13px] text-[#7d97ff]/80">
                        (sắp ra mắt)
                      </span>
                    </li>
                  ),
                )}
              </ul>
            </nav>
          ))}
        </div>
      </FadeIn>

      <div className="relative border-t-2 border-[#f2f1e9]/10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-4 pt-6 sm:flex-row sm:items-center sm:px-6 [padding-bottom:calc(1.5rem+env(safe-area-inset-bottom))]">
          <p className="text-sm text-[#a8a8b2]">© 2026 V-Intern. Bảo lưu mọi quyền.</p>
          <p className="font-hand text-[0.95rem] text-[#7d97ff]">
            làm bằng cả trái tim ở Việt Nam ✎
          </p>
        </div>
      </div>

      <BackToTop />
    </footer>
  );
}
