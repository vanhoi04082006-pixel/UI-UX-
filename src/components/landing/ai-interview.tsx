"use client";

import { VBot, VGitPullRequest, VTerminal } from "@/components/icons/v-icons";
import { Eyebrow, InkBadge, MarginNote, SketchCard, StampMoc } from "@/components/notebook/ui";
import { FadeIn, Stagger, StaggerItem } from "@/components/notebook/reveal";
import { PolaroidFrame } from "@/components/notebook/ui";

/** Dấu tick vẽ-dần nét mực — dùng cho trạng thái "đã ghi nhận". */
function DrawCheck({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`draw-check h-3.5 w-3.5 shrink-0 ${className}`}
    >
      <path
        d="M4.5 12.5l5 5L20 7"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={60}
      />
    </svg>
  );
}

export function AiInterview() {
  return (
    <section
      id="ai-interview"
      aria-label="Phỏng vấn AI thích ứng"
      className="scroll-mt-24 bg-[var(--paper)] py-16 lg:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-12">
          {/* Cột trái: polaroid buổi phỏng vấn + mộc + pill */}
          <FadeIn className="relative mx-auto w-full max-w-lg lg:mx-0">
            <PolaroidFrame
              src="/images/landing/ai-interview.png"
              alt="Minh hoạ một buổi phỏng vấn AI trên V-Intern"
              caption="một buổi phỏng vấn thật dễ chịu"
              rotate={-2}
              tapeVariant="warm"
              className="w-full"
            />
            <StampMoc
              tone="red"
              rotate={-8}
              className="absolute -right-1 -top-4 z-10 sm:-right-3"
            >
              Tiêu biểu
            </StampMoc>
            <InkBadge
              tone="blue"
              dot
              className="absolute -bottom-3.5 left-7 z-10 -rotate-2 bg-[var(--paper-raised)]"
            >
              Buổi phỏng vấn AI tiêu biểu
            </InkBadge>
          </FadeIn>

          {/* Cột phải: bản mô phỏng hội thoại — tin nhắn lần lượt lật vào */}
          <FadeIn delay={0.12}>
            <Eyebrow>✦ Phỏng vấn thích ứng</Eyebrow>
            <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-[var(--ink)] sm:text-3xl">
              Câu hỏi thích ứng theo từng câu trả lời
            </h3>

            <SketchCard className="mt-7 p-4 sm:p-5">
              <Stagger className="space-y-4">
                {/* Tin nhắn của người phỏng vấn AI */}
                <StaggerItem>
                  <div className="flex items-start gap-2.5">
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--blue-mist)] text-[var(--royal)]"
                    >
                      <VBot size={18} />
                    </span>
                    <p className="min-w-0 rounded-[4px_14px_14px_14px] border-2 border-[var(--ink)]/15 bg-[var(--paper)] px-3.5 py-2.5 text-[13px] leading-relaxed text-[var(--ink)]">
                      Chào An, tôi là người phỏng vấn AI của V-Intern. Buổi hôm
                      nay gồm 5 câu hỏi về React và tư duy giải quyết vấn đề —
                      sẵn sàng chứ?
                    </p>
                  </div>
                </StaggerItem>

                {/* Tin nhắn của sinh viên */}
                <StaggerItem>
                  <div className="flex items-start justify-end gap-2.5">
                    <p className="min-w-0 rounded-[14px_4px_14px_14px] border-2 border-[var(--ink)] bg-[var(--royal)] px-3.5 py-2.5 text-[13px] font-medium leading-relaxed text-white dark:text-[#101018]">
                      Sẵn sàng ạ, em bắt đầu được ngay.
                    </p>
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--ink)] text-xs font-extrabold text-[var(--paper)]"
                    >
                      AN
                    </span>
                  </div>
                </StaggerItem>

                {/* AI đang "gõ" */}
                <StaggerItem>
                  <div className="flex items-center gap-2.5 pl-11">
                    <span
                      aria-hidden="true"
                      className="flex items-center gap-1.5 rounded-full border-2 border-dashed border-[var(--ink)]/25 px-3.5 py-2"
                    >
                      <span className="h-1.5 w-1.5 animate-blink-dot rounded-full bg-[var(--ink)]/60" />
                      <span
                        className="h-1.5 w-1.5 animate-blink-dot rounded-full bg-[var(--ink)]/60"
                        style={{ animationDelay: "180ms" }}
                      />
                      <span
                        className="h-1.5 w-1.5 animate-blink-dot rounded-full bg-[var(--ink)]/60"
                        style={{ animationDelay: "360ms" }}
                      />
                    </span>
                    <span className="font-hand text-sm text-[var(--ink-soft)]">
                      AI đang chọn câu hỏi tiếp theo…
                    </span>
                  </div>
                </StaggerItem>

                {/* Câu hỏi tiếp theo + tick vẽ-dần xác nhận đã ghi nhận */}
                <StaggerItem>
                  <div className="flex items-start gap-2.5">
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--blue-mist)] text-[var(--royal)]"
                    >
                      <VBot size={18} />
                    </span>
                    <p className="min-w-0 rounded-[4px_14px_14px_14px] border-2 border-[var(--ink)]/15 bg-[var(--paper)] px-3.5 py-2.5 text-[13px] leading-relaxed text-[var(--ink)]">
                      Câu 1/5: Kể tôi nghe về một dự án bạn từng tự học — làm
                      gì, kẹt ở đâu, và bạn tự xử thế nào?
                      <span className="mt-2 flex items-center gap-1.5 rounded-full border-2 border-dashed border-[var(--success)]/40 bg-[color-mix(in_srgb,var(--success)_10%,transparent)] px-2.5 py-1 text-[11px] font-bold text-[var(--success)]">
                        <DrawCheck />
                        câu trả lời đã được ghi nhận
                      </span>
                    </p>
                  </div>
                </StaggerItem>
              </Stagger>
            </SketchCard>

            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <MarginNote className="max-w-[16rem] -rotate-1">
                càng trả lời tốt, thử thách càng thật!
              </MarginNote>
              <div className="sketch-card animate-float-soft flex items-center gap-3 p-2.5 pr-4">
                <img
                  src="/images/landing/robot-grader.png"
                  alt="Robot chấm điểm của V-Intern"
                  className="h-14 w-14 select-none rounded-[8px]"
                  draggable={false}
                />
                <div>
                  <p className="text-xs font-bold text-[var(--ink)]">AI chấm nháp</p>
                  <p className="font-hand text-sm leading-tight text-[var(--royal)]">
                    giảng viên chốt điểm
                  </p>
                </div>
              </div>
            </div>

            {/* Chip "AI phân tích PR" — phân tích pull request như dev thật */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="link-chip">
                <VGitPullRequest size={13} aria-hidden="true" />
                AI phân tích PR
              </span>
              <span className="link-chip">
                <VTerminal size={13} aria-hidden="true" />
                gợi ý qua terminal
              </span>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
