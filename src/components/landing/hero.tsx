"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  VArrowRight,
  VBot,
  VChartColumn,
  VDashboard,
  VFolderKanban,
  VKanban,
  VListTodo,
  VLogo,
  VSparkles,
  type VIconComponent,
} from "@/components/icons/v-icons";
import { InkBadge, MarginNote, NoteCard, Tape } from "@/components/notebook/ui";
import { FadeIn, InkButton, Parallax } from "@/components/notebook/reveal";
import {
  CoffeeStain,
  HandArrowDown,
  SparkleDoodle,
  SquiggleUnderline,
  StarDoodle,
} from "@/components/notebook/doodles";
import { PolaroidFrame } from "@/components/notebook/ui";
import { useApp } from "@/lib/store";
import { useCountUp } from "./use-count-up";

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

const SIDEBAR_ITEMS: { label: string; icon: VIconComponent; active?: boolean }[] = [
  { label: "Tổng quan", icon: VDashboard, active: true },
  { label: "Công việc", icon: VListTodo },
  { label: "Sprint", icon: VKanban },
  { label: "Dự án", icon: VFolderKanban },
  { label: "AI Mentor", icon: VBot },
  { label: "Hiệu suất", icon: VChartColumn },
];

const OVERVIEW_CARDS: { title: string; text: string; icon: VIconComponent }[] = [
  {
    title: "Dự án & Sprint",
    text: "Theo dõi mục tiêu và công việc được giao",
    icon: VFolderKanban,
  },
  {
    title: "Nhiệm vụ",
    text: "Cập nhật tiến độ, trao đổi và gửi duyệt",
    icon: VListTodo,
  },
  {
    title: "AI Mentor",
    text: "Nhận hướng dẫn tham khảo khi cần hỗ trợ",
    icon: VBot,
  },
];

const HERO_STATS: { target: number; label: string; decimals?: number; suffix?: string }[] = [
  { target: 12, label: "phiên thực tập" },
  { target: 87, label: "sinh viên" },
  { target: 41, label: "chứng nhận" },
  { target: 99.7, label: "uptime", decimals: 1, suffix: "%" },
];

/** Tiêu đề gắn word-by-word — từng chữ rơi xuống theo nhịp, giữ blot marker vàng */
function HeadlineWords() {
  const reduced = useReducedMotion();
  const lines: { words: string[]; highlight?: boolean }[] = [
    { words: ["Kỹ", "năng", "thật."] },
    { words: ["Dự", "án", "thật."] },
    { words: ["Tương", "lai", "của", "bạn."], highlight: true },
  ];

  let wordIndex = -1;

  return (
    <h1
      aria-label="Kỹ năng thật. Dự án thật. Tương lai của bạn."
      className="mt-7 text-[2.6rem] font-extrabold leading-[1.06] tracking-tight text-[var(--ink)] sm:text-5xl lg:text-[3.9rem]"
    >
      {lines.map((line, lineIndex) => (
        <span key={lineIndex} aria-hidden="true" className="block">
          <span className={line.highlight ? "relative inline-block" : undefined}>
            <span
              className={
                line.highlight
                  ? "marker marker-yellow animate-marker-blot dark:[background-image:linear-gradient(100deg,transparent_0.5%,rgba(253,224,71,0.32)_3%,rgba(253,224,71,0.32)_97%,transparent_99.5%)]"
                  : undefined
              }
            >
              {line.words.map((word) => {
                wordIndex += 1;
                const delay = 0.12 + wordIndex * 0.08;
                if (reduced) return <span key={word}>{word} </span>;
                return (
                  <motion.span
                    key={word}
                    className="inline-block will-change-transform"
                    initial={{ opacity: 0, y: 22, rotate: 1.6 }}
                    animate={{ opacity: 1, y: 0, rotate: 0 }}
                    transition={{ delay, duration: 0.55, ease: EASE }}
                  >
                    {word}{" "}
                  </motion.span>
                );
              })}
            </span>
            {line.highlight && (
              <StarDoodle className="absolute -right-8 -top-5 hidden h-7 w-7 animate-wiggle text-[var(--royal)] sm:block" />
            )}
          </span>
        </span>
      ))}
    </h1>
  );
}

/** Chip số liệu nhỏ có count-up — ĐANG mở dần từ 0 khi lọt khung nhìn */
function HeroStatChip({
  target,
  label,
  decimals = 0,
  suffix = "",
}: {
  target: number;
  label: string;
  decimals?: number;
  suffix?: string;
}) {
  const { ref, text } = useCountUp(target, { decimals });
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--ink)]/12 bg-[var(--paper-raised)] px-3 py-1 shadow-ink-2">
      <span ref={ref} className="font-mono2 text-[0.82rem] font-bold text-[var(--royal)]">
        {text}
        {suffix}
      </span>
      <span className="text-xs text-[var(--ink-soft)]">{label}</span>
    </span>
  );
}

/** Khung polaroid chứa bản phác nhỏ workspace — như tấm hình dán lên trang sổ. */
function DashboardPolaroid() {
  return (
    <figure
      className="relative m-0 max-w-full rounded-[3px_4px_3px_4px] bg-[var(--paper-raised)] p-2.5 pb-0 shadow-ink-4"
      aria-label="Phác thảo không gian làm việc thực tập của V-Intern"
    >
      <Tape variant="warm" rotate={-8} peel className="-top-3 left-10 z-20" />
      <Tape variant="candy" rotate={7} peel className="-top-3 right-10 z-20" />

      <div className="flex overflow-hidden rounded-[6px_8px_6px_8px] border-2 border-[var(--ink)]/12">
        {/* Thanh bên mô phỏng */}
        <aside aria-hidden="true" className="hidden w-40 shrink-0 flex-col gap-1 bg-[var(--coal)] p-3 sm:flex">
          <div className="mb-3 px-1 text-[#f2f1e9]">
            <VLogo size={15} />
          </div>
          {SIDEBAR_ITEMS.map((item) => (
            <span
              key={item.label}
              className={
                item.active
                  ? "flex items-center gap-2 rounded-lg bg-[var(--royal)] px-2.5 py-1.5 text-[11px] font-semibold text-white dark:text-[#101018]"
                  : "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-white/55"
              }
            >
              <item.icon size={14} />
              {item.label}
            </span>
          ))}
        </aside>

        {/* Nội dung chính mô phỏng */}
        <div className="min-w-0 flex-1 bg-[var(--paper)] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-extrabold text-[var(--ink)] sm:text-base">
              Tổng quan · Sprint #4
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-dashed border-[var(--royal)]/50 bg-[var(--blue-mist)] px-2.5 py-1 font-mono2 text-[10px] font-bold uppercase tracking-wider text-[var(--royal)]">
              <span className="ws-dot-live" aria-hidden="true" />
              Đang mở
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-[var(--ink-soft)] sm:text-xs">
            Đăng nhập để xem dự án, Sprint và nhiệm vụ được phân công.
          </p>

          <div className="mt-4 space-y-2.5">
            {OVERVIEW_CARDS.map((item, index) => (
              <div
                key={item.title}
                className="flex items-start gap-3 rounded-xl border-2 border-[var(--ink)]/10 bg-[var(--paper-raised)] p-3 transition-colors hover:border-[var(--royal)]/50"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--blue-mist)] text-[var(--royal)]">
                  <item.icon size={16} />
                </span>
                <div className="min-w-0">
                  <strong className="text-[11px] font-bold text-[var(--ink)] sm:text-xs">
                    {item.title}
                  </strong>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--ink-soft)] sm:text-[11px]">
                    {item.text}
                  </p>
                </div>
                {index === 0 && (
                  <SparkleDoodle className="ml-auto mt-0.5 h-4 w-4 shrink-0 text-[var(--royal)]/60" />
                )}
              </div>
            ))}
          </div>

          <p className="mt-4 border-t-2 border-dashed border-[var(--ink)]/10 pt-2.5 font-hand text-[13px] text-[var(--ink-soft)]">
            giới thiệu các chức năng · dữ liệu cá nhân hiển thị sau đăng nhập
          </p>
        </div>
      </div>

      <figcaption className="px-1 pb-1.5 pt-2 text-center font-hand text-[0.95rem] text-[var(--ink-soft)]">
        Không gian thực tập của bạn
      </figcaption>
    </figure>
  );
}

export function Hero() {
  const enterAuth = useApp((s) => s.enterAuth);
  const reduced = useReducedMotion();
  const burstRef = useRef<HTMLSpanElement>(null);

  const scrollToHowItWorks = () => {
    document.getElementById("how-it-works")?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
    });
  };

  /** Nút royal: bắn confetti một nhịp rồi mới mở auth — để kịp thấy "mưa giấy". */
  const handleStart = () => {
    const burst = burstRef.current;
    if (burst) {
      burst.classList.remove("play");
      burst.getBoundingClientRect();
      burst.classList.add("play");
    }
    if (reduced) enterAuth();
    else window.setTimeout(enterAuth, 240);
  };

  return (
    <section
      id="platform"
      aria-label="Giới thiệu nền tảng V-Intern"
      className="paper-grain relative scroll-mt-24 overflow-hidden bg-[var(--paper)] pb-20 pt-12 sm:pt-16 lg:pb-24"
    >
      {/* Nền giấy chấm bi + vết cà phê mờ — dấu vết "học khuya" */}
      <div aria-hidden="true" className="paper-dots pointer-events-none absolute inset-0" />
      <CoffeeStain
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-4 left-[42%] hidden h-24 w-24 text-[var(--ink)] opacity-[0.05] lg:block"
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,47fr)_minmax(0,53fr)] lg:gap-12">
          {/* Cột trái */}
          <FadeIn>
            <InkBadge tone="blue" className="-rotate-1 px-3.5 py-1 text-[0.78rem]">
              <VSparkles size={13} className="animate-wiggle" aria-hidden="true" />
              Nền tảng thực tập ảo ứng dụng AI
            </InkBadge>

            <HeadlineWords />

            <SquiggleUnderline className="mt-5 h-3 w-44 text-[var(--royal)]/70" />

            <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--ink-soft)] md:text-lg">
              V-Intern mô phỏng môi trường làm việc thực tế, giúp sinh viên trải
              nghiệm quy trình phát triển phần mềm chuyên nghiệp với sự hỗ trợ
              của AI.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <span ref={burstRef} className="confetti-pop relative inline-flex">
                <InkButton variant="royal" size="lg" onClick={handleStart}>
                  Bắt đầu ngay
                  <VArrowRight size={17} aria-hidden="true" />
                </InkButton>
              </span>
              <InkButton variant="outline" size="lg" onClick={scrollToHowItWorks}>
                Tìm hiểu thêm
              </InkButton>
            </div>

            {/* Dải chip số liệu — đếm dần khi cuộn tới */}
            <FadeIn delay={0.25} className="mt-7">
              <div className="flex flex-wrap items-center gap-2.5">
                {HERO_STATS.map((stat) => (
                  <HeroStatChip key={stat.label} {...stat} />
                ))}
              </div>
            </FadeIn>

            {/* Ghi chú lề kèm mũi tên chỉ CTA */}
            <div className="mt-8 hidden items-start gap-1.5 sm:flex">
              <MarginNote className="-rotate-2 text-[1.05rem] text-[var(--royal)]">
                miễn phí cho sinh viên —
                <br />
                chỉ cần mang theo tinh thần học hỏi!
              </MarginNote>
              <HandArrowDown className="mt-2 h-12 w-9 rotate-[26deg] text-[var(--royal)]/80" />
            </div>
          </FadeIn>

          {/* Cột phải — collage polaroid nhiều lớp parallax */}
          <FadeIn className="relative mx-auto w-full max-w-[600px] lg:max-w-none" delay={0.15}>
            <div className="relative px-1 pb-6 pt-5 md:pb-10 lg:pt-8">
              {/* Lớp xa: góc bàn học — polaroid nhỏ trôi chậm hơn trang */}
              <Parallax
                speed={0.07}
                className="absolute -top-3 right-0 z-0 hidden w-[42%] lg:block"
              >
                <PolaroidFrame
                  src="/images/landing/hero-desk.png"
                  alt="Minh hoạ góc bàn học với sổ tay, laptop và cà phê"
                  caption="góc bàn làm việc của bạn"
                  rotate={3}
                  tapeVariant="mint"
                  imgClassName="rounded-[4px]"
                />
              </Parallax>

              {/* Lớp gần: polaroid workspace chính */}
              <div className="relative z-10">
                <DashboardPolaroid />
              </div>

              {/* Sticky note "Đánh giá AI" — ghim góc dưới-phải, chỉ đè vùng
                  caption trống bên phải, không che chữ trong mock. */}
              <Parallax
                speed={0.11}
                className="absolute -bottom-3 right-[-1.5rem] z-20 hidden w-48 md:block"
              >
                <NoteCard
                  title="Đánh giá AI"
                  tone="pink"
                  tapeVariant="candy"
                  rotate={-3}
                  className="animate-float-soft sticker-pop"
                >
                  Gợi ý tham khảo theo công việc —{" "}
                  <b className="font-hand text-[1.05rem]">giảng viên chốt điểm chính thức</b>
                </NoteCard>
              </Parallax>

              {/* Robot linh vật + bong bóng chat — chạy dưới collage theo dòng
                  chảy, không absolute để không bao giờ đè lên thẻ. */}
              <div className="mt-5 flex animate-bob items-end gap-2.5 pl-2 lg:pl-10">
                <span className="inline-block rotate-[2deg] rounded-[10px_12px_10px_12px] border-2 border-[var(--ink)] bg-[var(--paper-raised)] p-1 shadow-ink-3">
                  <img
                    src="/images/landing/robot-mascot.png"
                    alt="Robot linh vật của V-Intern đang vẫy tay chào"
                    className="h-24 w-24 select-none rounded-[8px] lg:h-28 lg:w-28"
                    draggable={false}
                  />
                </span>
                <span className="caret-blink mb-8 -rotate-2 rounded-2xl rounded-bl-sm border-2 border-[var(--ink)] bg-[var(--paper-raised)] px-4 py-2.5 font-hand text-[1.05rem] leading-tight text-[var(--royal)] shadow-ink-3">
                  Cùng xây dựng tương lai nhé!
                </span>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
