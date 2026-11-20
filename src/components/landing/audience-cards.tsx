"use client";

import { useReducedMotion, motion } from "framer-motion";
import { VArrowRight } from "@/components/icons/v-icons";
import { CheckDoodle } from "@/components/notebook/doodles";
import { FadeIn, InkButton } from "@/components/notebook/reveal";
import { Eyebrow, InkBadge } from "@/components/notebook/ui";
import { useApp } from "@/lib/store";

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

const STUDENT_CHECKLIST = [
  "Thực hành trên các dự án thực tế",
  "Nhận phản hồi từ AI và người hướng dẫn",
  "Theo dõi tiến độ và KPI cá nhân",
  "Nhận chứng nhận hoàn thành",
];

const INSTRUCTOR_CHECKLIST = [
  "Quản lý dự án, nhiệm vụ, sprint",
  "Chấm bài với đề xuất điểm AI",
  "Theo dõi hiệu suất từng sinh viên",
  "Báo cáo và thống kê tự động",
];

/** Danh sách check vẽ-dần từng dòng — tick lần lượt như gạch mực trong sổ. */
function DrawChecklist({ items, tone }: { items: string[]; tone: "royal" | "mint" }) {
  const reduced = useReducedMotion();
  const textColor = tone === "royal" ? "text-[var(--ink)]" : "text-[#f2f1e9]/90";
  const checkColor = tone === "royal" ? "text-[var(--royal)]" : "text-[#6fe0b0]";

  if (reduced) {
    return (
      <ul className="mt-5 space-y-2.5">
        {items.map((item) => (
          <li key={item} className={`flex items-start gap-2.5 text-sm font-medium ${textColor}`}>
            <CheckDoodle aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${checkColor}`} />
            {item}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <motion.ul
      className="mt-5 space-y-2.5"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
    >
      {items.map((item) => (
        <motion.li
          key={item}
          className={`flex items-start gap-2.5 text-sm font-medium ${textColor}`}
          variants={{
            hidden: { opacity: 0, x: -18 },
            show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE } },
          }}
        >
          <CheckDoodle aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${checkColor}`} />
          {item}
        </motion.li>
      ))}
    </motion.ul>
  );
}

export function AudienceCards() {
  const enterAuth = useApp((s) => s.enterAuth);
  const reduced = useReducedMotion();

  const scrollToPlatform = () => {
    document.getElementById("platform")?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
    });
  };

  return (
    <section
      id="for-students"
      aria-label="Đối tượng sử dụng V-Intern"
      className="scroll-mt-24 bg-[var(--paper)] py-16 lg:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <Eyebrow>Đối tượng sử dụng</Eyebrow>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--ink)] sm:text-4xl">
            Hai vai trò — một hành trình
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--ink-soft)]">
            Sinh viên viết trang kỹ năng, giảng viên viết trang quản lý — cùng
            một cuốn sổ V-Intern.
          </p>
        </FadeIn>

        <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:gap-10">
          {/* Dành cho sinh viên — thẻ giấy xanh mờ */}
          <FadeIn>
            <article
              className="card-tilt sketch-card sketch-card-hover flex h-full flex-col p-6 sm:p-8"
              style={{ background: "var(--blue-mist)" }}
            >
              <InkBadge tone="blue" className="self-start">
                Dành cho sinh viên
              </InkBadge>
              <h3 className="mt-4 text-2xl font-extrabold tracking-tight text-[var(--ink)]">
                Phát triển kỹ năng — Kiến tạo sự nghiệp
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">
                Luyện tay nghề qua dự án thật, nhận phản hồi mỗi ngày và tự tin
                bước vào thị trường lao động với hành trang của riêng mình.
              </p>

              <DrawChecklist items={STUDENT_CHECKLIST} tone="royal" />

              <InkButton variant="royal" className="mt-6 self-start" onClick={enterAuth}>
                Bắt đầu hành trình của bạn
                <VArrowRight size={15} aria-hidden="true" />
              </InkButton>

              <div className="relative mt-6 overflow-hidden rounded-[10px_12px_10px_12px] border-2 border-[var(--ink)]">
                <img
                  src="/images/landing/student.png"
                  alt="Sinh viên đang học bên góc bàn làm việc"
                  className="h-44 w-full object-cover object-top"
                  draggable={false}
                />
                <span className="sticker-pop absolute bottom-3 right-3 -rotate-2 rounded-[6px] border-2 border-[var(--ink)] bg-[var(--note-yellow)] px-3 py-1 font-hand text-[0.95rem] text-[var(--note-yellow-ink)] shadow-ink-2">
                  Học / Làm / Vươn xa
                </span>
              </div>
            </article>
          </FadeIn>

          {/* Dành cho giảng viên — thẻ bảng đen */}
          <div id="for-instructors" className="scroll-mt-24">
            <FadeIn delay={0.1}>
              <article
                className="card-tilt sketch-card sketch-card-hover flex h-full flex-col p-6 text-[#f2f1e9] sm:p-8"
                style={{
                  background: "var(--coal)",
                  borderColor: "rgba(242, 241, 233, 0.85)",
                  boxShadow: "6px 6px 0 0 rgba(0, 0, 0, 0.35)",
                }}
              >
                <InkBadge
                  tone="neutral"
                  className="self-start border-[#f2f1e9]/70 bg-[#f2f1e9]/10 text-[#f2f1e9]"
                >
                  Dành cho giảng viên
                </InkBadge>
                <h3 className="mt-4 text-2xl font-extrabold tracking-tight">
                  Dễ dàng quản lý — Hiệu quả vượt trội
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#a8a8b2]">
                  Một bảng điều khiển cho cả lớp: giao việc, chấm bài, theo dõi
                  tiến độ — đúng nhịp, đúng dữ liệu, đúng thời điểm.
                </p>

                <DrawChecklist items={INSTRUCTOR_CHECKLIST} tone="mint" />

                <InkButton variant="white" className="mt-6 self-start" onClick={scrollToPlatform}>
                  Khám phá tính năng
                </InkButton>

                <div className="relative mt-6 overflow-hidden rounded-[10px_12px_10px_12px] border-2 border-[#f2f1e9]/85">
                  <img
                    src="/images/landing/instructor.png"
                    alt="Giảng viên đang theo dõi tiến độ lớp thực tập"
                    className="h-44 w-full object-cover object-top"
                    draggable={false}
                  />
                  <span className="sticker-pop absolute bottom-3 right-3 rotate-2 rounded-[6px] border-2 border-[var(--ink)] bg-[var(--note-mint)] px-3 py-1 font-hand text-[0.95rem] text-[var(--note-mint-ink)] shadow-ink-2">
                    Sinh viên tốt hơn
                    <br />
                    Tương lai rộng hơn
                  </span>
                </div>
              </article>
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}
