"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * useCountUp — đếm từ 0 tới `target` khi phần tử lọt vào khung nhìn (một lần).
 * Tôn trọng prefers-reduced-motion: hiện luôn giá trị cuối, không chạy rAF.
 * `decimals` giữ số thập phân (vd 99.7) — hiển thị theo định dạng vi-VN.
 */
export function useCountUp(
  target: number,
  options?: { duration?: number; decimals?: number },
) {
  const { duration = 1300, decimals = 0 } = options ?? {};
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement | null>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    let raf = 0;
    let started = false;
    const run = () => {
      const startedAt = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(target * eased);
        if (progress < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (started) return;
        if (entries.some((entry) => entry.isIntersecting)) {
          started = true;
          observer.disconnect();
          run();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, duration, reduced]);

  const shown = reduced ? target : value;
  const text = shown.toLocaleString("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return { ref, text };
}
