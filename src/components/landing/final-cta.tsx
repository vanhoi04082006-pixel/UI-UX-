"use client";

import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { VArrowRight, VRocket } from "@/components/icons/v-icons";
import {
  RouteTrail,
  SparkleDoodle,
  SquiggleUnderline,
  StarDoodle,
} from "@/components/notebook/doodles";
import { FadeIn, InkButton } from "@/components/notebook/reveal";
import { useApp } from "@/lib/store";

export function FinalCta() {
  const enterAuth = useApp((s) => s.enterAuth);
  const reduced = useReducedMotion();
  const burstRef = useRef<HTMLSpanElement>(null);

  /** Bắn confetti một nhịp cho kịp thấy "mưa giấy" rồi mới mở auth. */
  const handleStart = () => {
    const burst = burstRef.current;
    if (burst) {
      burst.classList.remove("play");
      burst.getBoundingClientRect();
      burst.classList.add("play");
    }
    if (reduced) enterAuth();
    else window.setTimeout(enterAuth, 350);
  };

  return (
    <section
      aria-label="Bắt đầu hành trình thực tập với V-Intern"
      className="paper-grain relative overflow-hidden py-20 lg:py-28"
      style={{
        background:
          "linear-gradient(120deg, #5b8df6 0%, #2060f0 30%, #0f2a86 55%, #2060f0 80%, #5b8df6 100%)",
        backgroundSize: "200% 200%",
        animation: "landing-cta-pan 18s ease infinite",
      }}
    >
      {/* Gradient hoán đổi chậm — tôn trọng prefers-reduced-motion nhờ globals.css */}
      <style>{`@keyframes landing-cta-pan { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }`}</style>

      {/* Bụi phấn trắng */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.16) 1.2px, transparent 1.2px)",
          backgroundSize: "22px 22px",
        }}
      />

      {/* Nét vẽ tay trên nền hoàng gia */}
      <RouteTrail aria-hidden="true" className="absolute left-[4%] top-10 hidden h-8 w-36 animate-float-soft text-white/30 md:block" />
      <StarDoodle aria-hidden="true" className="absolute right-[9%] top-16 hidden h-6 w-6 animate-wiggle text-white/40 md:block" />
      <SparkleDoodle aria-hidden="true" className="absolute bottom-14 left-[11%] hidden h-5 w-5 animate-bob text-white/35 md:block" />

      {/* Tên lửa giấy lượn — chờ bay cùng bạn */}
      <VRocket
        aria-hidden="true"
        size={36}
        className="absolute left-[12%] top-[22%] hidden rotate-[18deg] animate-float-y text-white/85 drop-shadow-[2px_3px_0_rgba(15,42,134,0.35)] md:block"
      />

      <div className="relative mx-auto max-w-6xl px-4 text-center text-white sm:px-6">
        <FadeIn>
          <p className="-rotate-1 font-hand text-lg text-white/85 sm:text-xl">
            vẫn còn đó, một trang sổ trắng đang chờ bạn viết tiếp…
          </p>

          <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            Sẵn sàng bắt đầu
            <br className="sm:hidden" /> hành trình thực tập đầu tiên?
          </h2>
          <SquiggleUnderline className="mx-auto mt-5 block h-3 w-56 text-white/80" />

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/85">
            Tạo tài khoản, chọn lĩnh vực bạn yêu thích và để AI hướng bạn qua
            từng bước — hoàn toàn miễn phí cho sinh viên.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-6">
            <span ref={burstRef} className="confetti-pop relative inline-flex">
              <InkButton variant="white" size="lg" onClick={handleStart}>
                Viết trang đầu tiên
                <VArrowRight size={17} aria-hidden="true" />
              </InkButton>
            </span>
            <span
              className="stamp-moc animate-stamp-thump font-hand tracking-wide"
              style={{
                ["--stamp-rotate" as string]: "-7deg",
                borderColor: "rgba(255, 255, 255, 0.85)",
                color: "rgba(255, 255, 255, 0.95)",
              }}
            >
              Miễn phí cho sinh viên
            </span>
          </div>

          <p className="mt-9 font-mono2 text-[0.72rem] uppercase tracking-[0.22em] text-white/70">
            hẹn gặp bạn bên trong ✦
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
