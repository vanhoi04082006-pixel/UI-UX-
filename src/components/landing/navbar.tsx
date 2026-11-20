"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { VArrowRight, VLogo, VMenu, VX } from "@/components/icons/v-icons";
import { InkButton } from "@/components/notebook/reveal";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useApp } from "@/lib/store";

const NAV_LINKS = [
  { label: "Nền tảng", href: "#platform" },
  { label: "Cách hoạt động", href: "#how-it-works" },
  { label: "Phỏng vấn AI", href: "#ai-interview" },
  { label: "Dành cho sinh viên", href: "#for-students" },
  { label: "Dành cho giảng viên", href: "#for-instructors" },
  { label: "Quy trình", href: "#workflow" },
] as const;

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();
  const enterAuth = useApp((s) => s.enterAuth);

  /* --- Vạch tiến trình cuộn: nét mực hoàng gia phủ dần theo % cuộn --- */
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 130, damping: 28, mass: 0.4 });

  /* --- Theo dõi mục đang đọc: IntersectionObserver quanh dải giữa khung --- */
  useEffect(() => {
    const sections = NAV_LINKS.map((link) => document.getElementById(link.href.slice(1))).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;
        const best = visible.reduce((a, b) => (a.intersectionRatio >= b.intersectionRatio ? a : b));
        setActiveSection(`#${best.target.id}`);
      },
      { rootMargin: "-42% 0px -52% 0px", threshold: 0 },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  /* --- Menu mobile đóng bằng Escape và trả focus về nút bật/tắt --- */
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      menuButtonRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 w-full border-b-2 border-[var(--ink)] bg-[var(--paper)]/90 backdrop-blur-md">
      <nav
        aria-label="Điều hướng chính"
        className="mx-auto flex h-18 max-w-6xl items-center justify-between px-4 sm:px-6"
      >
        <div className="flex items-center gap-6 xl:gap-8">
          <a
            href="#platform"
            aria-label="V-Intern — về đầu trang"
            className="focus-ink inline-flex min-h-11 items-center rounded-lg text-[var(--ink)] transition-transform duration-200 hover:-rotate-2"
          >
            <VLogo size={26} />
          </a>

          <ul className="hidden items-center gap-1 xl:flex">
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.href;
              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    aria-current={isActive ? "location" : undefined}
                    className={`focus-ink inline-flex min-h-11 items-center rounded-lg px-3 py-1 text-sm font-semibold transition-colors ${
                      isActive
                        ? "nav-marker font-bold text-[var(--ink)]"
                        : "ink-underline-hover text-[var(--ink-soft)] hover:text-[var(--ink)]"
                    }`}
                  >
                    {link.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="hidden items-center gap-3 xl:flex">
          <ThemeToggle />
          <InkButton variant="royal" size="sm" onClick={enterAuth}>
            Bắt đầu
            <VArrowRight size={15} aria-hidden="true" />
          </InkButton>
        </div>

        <div className="flex items-center gap-2.5 xl:hidden">
          <ThemeToggle />
          <button
            ref={menuButtonRef}
            type="button"
            aria-label={open ? "Đóng menu" : "Mở menu"}
            aria-expanded={open}
            aria-controls="landing-mobile-menu"
            onClick={() => setOpen((v) => !v)}
            className="focus-ink inline-flex h-11 w-11 items-center justify-center rounded-[10px_12px_10px_12px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--ink)] shadow-ink-2 transition-all hover:-translate-y-0.5 hover:shadow-ink-3"
          >
            {open ? <VX size={20} /> : <VMenu size={20} />}
          </button>
        </div>
      </nav>

      {/* Vạch tiến trình cuộn — nét mực 2px chạy dần theo % trang đã đọc */}
      <motion.div
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-0.5 w-full origin-left rounded-full bg-[var(--royal)]"
        style={reduced ? { scaleX: scrollYProgress } : { scaleX: progress }}
      />

      <AnimatePresence>
        {open && (
          <motion.div
            id="landing-mobile-menu"
            initial={reduced ? undefined : { height: 0, opacity: 0 }}
            animate={reduced ? undefined : { height: "auto", opacity: 1 }}
            exit={reduced ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="overflow-hidden border-t-2 border-dashed border-[var(--ink)]/15 bg-[var(--paper)]/95 backdrop-blur-md xl:hidden"
          >
            <ul className="mx-auto max-w-6xl space-y-1 px-4 py-4 sm:px-6">
              {NAV_LINKS.map((link, index) => (
                <motion.li
                  key={link.href}
                  initial={reduced ? undefined : { opacity: 0, x: -18 }}
                  animate={reduced ? undefined : { opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + index * 0.055, duration: 0.32, ease: EASE }}
                >
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="focus-ink flex min-h-11 items-center rounded-xl border-2 border-transparent px-4 text-sm font-semibold text-[var(--ink)] transition-colors hover:border-[var(--royal)] hover:bg-[var(--blue-mist)] hover:text-[var(--royal)]"
                  >
                    {link.label}
                  </a>
                </motion.li>
              ))}
            </ul>
            <motion.div
              initial={reduced ? undefined : { opacity: 0, y: 10 }}
              animate={reduced ? undefined : { opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3, ease: EASE }}
              className="mx-auto flex max-w-6xl flex-col px-4 pb-5 sm:px-6"
            >
              <InkButton
                variant="royal"
                className="w-full"
                onClick={() => {
                  setOpen(false);
                  enterAuth();
                }}
              >
                Bắt đầu
                <VArrowRight size={15} aria-hidden="true" />
              </InkButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
