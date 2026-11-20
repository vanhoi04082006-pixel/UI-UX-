"use client";

import { FadeIn, Stagger, StaggerItem } from "@/components/notebook/reveal";
import { useCountUp } from "./use-count-up";

type Stat = {
  value: number;
  label: string;
  note: string;
  decimals?: number;
};

const STATS: Stat[] = [
  { value: 87, label: "sinh viên đang thực tập", note: "đang viết trang của riêng mình" },
  { value: 19, label: "giảng viên đồng hành", note: "mỗi người giữ một nhóm" },
  { value: 41, label: "chứng nhận đã cấp", note: "mỗi cái một mã xác minh" },
  { value: 1240, label: "lượt gọi AI", note: "hỏi lúc nào cũng được" },
  { value: 96, label: "câu hỏi phỏng vấn", note: "thích ứng theo từng câu trả lời" },
];

/** Số to viết phấn — đếm dần từ 0 khi cuộn tới dải số liệu. */
function BigStat({ stat }: { stat: Stat }) {
  const { ref, text } = useCountUp(stat.value, { decimals: stat.decimals ?? 0 });
  return (
    <div className="text-center">
      <p className="chalk-text font-mono2 text-4xl font-extrabold leading-none sm:text-[2.6rem] lg:text-5xl">
        <span ref={ref}>{text}</span>
      </p>
      <p className="mt-3 text-sm font-bold leading-snug text-[#f2f1e9]/90">{stat.label}</p>
      <p className="mt-1.5 font-hand text-[0.95rem] leading-snug text-[#a8a8b2]">{stat.note}</p>
    </div>
  );
}

export function StatsBand() {
  return (
    <section
      aria-label="Số liệu nổi bật của V-Intern"
      className="relative overflow-hidden border-y-2 border-[var(--ink)] bg-[var(--coal)] py-14 text-[#f2f1e9] lg:py-20"
    >
      {/* Bụi phấn — chấm bi trắng mờ trên bảng đen */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(242, 241, 233, 0.07) 1.2px, transparent 1.2px)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <FadeIn>
          <p className="font-mono2 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[#7d97ff]">
            con số biết nói
          </p>
          <h2 className="chalk-text mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Hành trình đang được viết mỗi ngày
          </h2>
        </FadeIn>

        <Stagger className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-8">
          {STATS.map((stat) => (
            <StaggerItem key={stat.label} className="h-full">
              <BigStat stat={stat} />
            </StaggerItem>
          ))}
        </Stagger>

        <FadeIn delay={0.15} className="mt-10 lg:mt-12">
          <p className="font-hand text-[0.95rem] text-[#a8a8b2]">
            số liệu trong chương trình thực tập ảo — cập nhật theo từng kỳ sprint ✎
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
