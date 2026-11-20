"use client";

import { VColumns } from "@/components/icons/v-icons";
import { FadeIn } from "@/components/notebook/reveal";
import {
  CheckDoodle,
  HandArrowRight,
  PushPin,
  SparkleDoodle,
} from "@/components/notebook/doodles";

const CHIPS = ["Sprint 2 tuần", "Story point", "Pull request", "Đánh giá đồng nghiệp"];

const KANBAN_COLUMNS: {
  label: string;
  tint: string;
  ink: string;
  cards: { title: string; chip: string; glow?: boolean; done?: boolean }[];
}[] = [
  {
    label: "Cần làm",
    tint: "rgba(139, 147, 166, 0.22)",
    ink: "#c3c8d4",
    cards: [
      { title: "Viết test cho module auth", chip: "test" },
      { title: "Sửa lỗi validate form", chip: "fix" },
    ],
  },
  {
    label: "Đang làm",
    tint: "rgba(91, 141, 246, 0.28)",
    ink: "#8fb0f9",
    cards: [{ title: "API danh sách nhiệm vụ", chip: "node", glow: true }],
  },
  {
    label: "Chờ duyệt",
    tint: "rgba(245, 166, 35, 0.24)",
    ink: "#f5c06a",
    cards: [
      { title: "PR #128 — fix kanban", chip: "PR" },
      { title: "PR #131 — docs đăng nhập", chip: "PR" },
    ],
  },
  {
    label: "Hoàn thành",
    tint: "rgba(52, 211, 153, 0.22)",
    ink: "#6fe0b0",
    cards: [{ title: "Đăng nhập JWT", chip: "auth", done: true }],
  },
];

export function ProductHeart() {
  return (
    <section
      aria-label="Trái tim sản phẩm — vòng đời sprint thu nhỏ"
      className="relative overflow-hidden bg-[var(--coal)] py-16 text-[#f2f1e9] lg:py-24"
    >
      {/* Thẻ "Đang làm" rực ring mực khi hover — đúng nét glow-ring hoàng gia */}
      <style>{`
        .ph-kanban-live {
          transition:
            box-shadow 220ms var(--motion-ease),
            transform 180ms var(--motion-ease);
        }
        .ph-kanban-live:hover {
          transform: translateY(-2px);
          box-shadow:
            0 0 0 2px var(--royal),
            0 0 0 6px color-mix(in srgb, var(--royal) 32%, transparent),
            0 0 20px color-mix(in srgb, var(--royal) 38%, transparent);
        }
      `}</style>

      {/* Bụi phấn — chấm bi trắng mờ trên bảng đen */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(242, 241, 233, 0.07) 1.2px, transparent 1.2px)",
          backgroundSize: "22px 22px",
        }}
      />
      <SparkleDoodle
        aria-hidden="true"
        className="pointer-events-none absolute right-[6%] top-14 hidden h-7 w-7 text-[#7d97ff]/40 lg:block"
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <FadeIn>
            <p className="font-mono2 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[#7d97ff]">
              Trái tim sản phẩm
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Sản phẩm mô phỏng{" "}
              <span
                className="marker marker-yellow"
                style={{
                  backgroundImage:
                    "linear-gradient(100deg, transparent 0.5%, rgba(253, 224, 71, 0.42) 3%, rgba(253, 224, 71, 0.42) 97%, transparent 99.5%)",
                }}
              >
                toàn diện
              </span>
            </h2>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-[#a8a8b2]">
              Sprint 2 tuần, story point, pull request, đánh giá đồng nghiệp —
              cả một vòng đời sản phẩm phần mềm được tái hiện trọn vẹn, như
              công ty thật thu nhỏ.
            </p>

            <ul className="mt-7 flex flex-wrap gap-2.5">
              {CHIPS.map((chip) => (
                <li
                  key={chip}
                  className="rounded-full border-2 border-[#f2f1e9]/25 px-3.5 py-1 text-xs font-semibold text-[#f2f1e9]/90"
                >
                  {chip}
                </li>
              ))}
            </ul>

            <p className="mt-8 flex items-center gap-2 font-hand text-[1.1rem] text-[#a8a8b2]">
              <span className="-rotate-1">nghỉ ngơi vài phút, ghim bảng sprint lên tường nhé</span>
              <HandArrowRight aria-hidden="true" className="h-4 w-9 shrink-0 text-[#7d97ff]" />
            </p>
          </FadeIn>

          {/* Bảng sprint mini — bản phác trên bảng đen */}
          <FadeIn delay={0.12}>
            <div
              className="sketch-card relative p-4 sm:p-5"
              style={{
                background: "var(--coal-soft)",
                borderColor: "rgba(242, 241, 233, 0.85)",
                boxShadow: "6px 6px 0 0 rgba(0, 0, 0, 0.4)",
              }}
            >
              <PushPin
                aria-hidden="true"
                className="absolute -top-4 left-1/2 h-9 w-7 -translate-x-1/2 text-[#7d97ff]"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5">
                <p className="flex items-center gap-2 font-hand text-lg text-[#f2f1e9]">
                  <span className="ws-dot-live" aria-hidden="true" />
                  bảng sprint #4 · Tuần 2/2
                </p>
                <span className="rounded-full border border-[#f2f1e9]/25 px-2.5 py-0.5 font-mono2 text-[10px] uppercase tracking-wider text-[#a8a8b2]">
                  6 người
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {KANBAN_COLUMNS.map((column) => (
                  <div key={column.label} className="rounded-[8px_10px_8px_10px] border border-[#f2f1e9]/12 p-2">
                    <p
                      className="flex items-center gap-1 rounded-[6px] px-2 py-1 text-[10px] font-bold uppercase tracking-wider"
                      style={{ background: column.tint, color: column.ink }}
                    >
                      <VColumns size={11} aria-hidden="true" className="shrink-0" />
                      {column.label}
                    </p>
                    <ul className="mt-2 space-y-2">
                      {column.cards.map((card) => (
                        <li
                          key={card.title}
                          className={`rounded-[6px_8px_6px_8px] border border-[#f2f1e9]/12 bg-[#141419] p-2 ${
                            card.glow ? "ph-kanban-live" : ""
                          }`}
                        >
                          <p
                            className={`text-[11px] font-semibold leading-snug ${
                              card.done ? "text-[#f2f1e9]/55 line-through" : "text-[#f2f1e9]/90"
                            }`}
                          >
                            {card.title}
                          </p>
                          <span className="mt-1.5 flex items-center gap-1">
                            <span className="rounded border border-[#f2f1e9]/15 bg-[#f2f1e9]/5 px-1.5 py-0.5 font-mono2 text-[9px] text-[#f2f1e9]/60">
                              {card.chip}
                            </span>
                            {card.done && (
                              <CheckDoodle aria-hidden="true" className="h-3 w-3 text-[#6fe0b0]" />
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
