"use client";

import {
  VBot,
  VCertificate,
  VFolderKanban,
  VHandshake,
  type VIconComponent,
} from "@/components/icons/v-icons";
import { Stagger, StaggerItem } from "@/components/notebook/reveal";

type FeatureTone = "blue" | "mint" | "pink" | "gold";

const FEATURES: { icon: VIconComponent; tone: FeatureTone; title: string; desc: string }[] = [
  {
    icon: VBot,
    tone: "blue",
    title: "Phỏng vấn AI",
    desc: "Tuyển dụng thông minh — AI phỏng vấn, chấm điểm và gợi ý vai trò",
  },
  {
    icon: VFolderKanban,
    tone: "mint",
    title: "Dự án thực tế",
    desc: "Dự án từ doanh nghiệp — task, PR, code review như công ty thật",
  },
  {
    icon: VHandshake,
    tone: "pink",
    title: "AI Mentor & Đánh giá",
    desc: "Hỗ trợ 24/7 — hỏi kèm ngữ cảnh task, nhận gợi ý tức thì",
  },
  {
    icon: VCertificate,
    tone: "gold",
    title: "Chứng nhận",
    desc: "Công nhận năng lực — mã xác minh công khai, tải PDF",
  },
];

/** Ô icon màu riêng cho từng tính năng — nước sơn theo tông. */
const TONE_TILE: Record<FeatureTone, string> = {
  blue: "bg-[var(--blue-mist)] text-[var(--royal)]",
  mint: "bg-[var(--note-mint)] text-[var(--note-mint-ink)]",
  pink: "bg-[var(--note-pink)] text-[var(--note-pink-ink)]",
  gold: "bg-gold-soft text-gold",
};

export function FeatureStrip() {
  return (
    <section aria-label="Tính năng nổi bật của V-Intern" className="relative bg-[var(--paper)]">
      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:pb-20">
        <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <StaggerItem key={feature.title} className="h-full">
              <div className="sketch-card sketch-card-hover card-tilt sketch-card-spotlight h-full p-4 sm:p-5">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-[10px_13px_11px_12px] border-2 border-[var(--ink)] shadow-ink-2 ${TONE_TILE[feature.tone]}`}
                >
                  <feature.icon size={21} aria-hidden="true" />
                </span>
                <p className="mt-3.5 text-sm font-bold leading-snug text-[var(--ink)]">
                  {feature.title}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-[var(--ink-soft)] sm:text-[13px]">
                  {feature.desc}
                </p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
