"use client";

import { VQuote } from "@/components/icons/v-icons";
import { FadeIn, Stagger, StaggerItem } from "@/components/notebook/reveal";
import { Eyebrow, Tape } from "@/components/notebook/ui";
import { PushPin } from "@/components/notebook/doodles";

type TapeVariant = "blue" | "warm" | "candy" | "mint" | "slate" | "gold";

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  initials: string;
  avatarTone: string;
  tape: TapeVariant;
  rotate: number;
  pin?: boolean;
};

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Lần đầu em được \"đi làm\" thật sự — sprint 2 tuần, code review từng dòng PR. Đến buổi phỏng vấn thật, em không còn run tay nữa.",
    name: "Nguyễn Văn An",
    role: "Thực tập sinh Frontend · Kỳ 2025",
    initials: "AN",
    avatarTone: "bg-[var(--blue-mist)] text-[var(--royal)]",
    tape: "blue",
    rotate: -1.6,
    pin: true,
  },
  {
    quote:
      "PR đầu tiên bị trả về ba lần — và chính cái PR đó dạy em nhiều nhất. Sai ở đâu sửa ở đó, sổ tay này ghi hết từng lần.",
    name: "Trần Thị Linh",
    role: "Thực tập sinh Backend",
    initials: "TL",
    avatarTone: "bg-[var(--note-mint)] text-[var(--note-mint-ink)]",
    tape: "candy",
    rotate: 1.3,
  },
  {
    quote:
      "Tôi chỉ cần mở bảng sprint là biết nhóm nào kẹt ở đâu. AI chấm nháp giúp sinh viên tự sửa trước — tôi chỉ còn việc chốt điểm.",
    name: "Phạm Quốc Minh",
    role: "Giảng viên · Công nghệ phần mềm",
    initials: "PM",
    avatarTone: "bg-gold-soft text-gold",
    tape: "gold",
    rotate: 2,
  },
  {
    quote:
      "Chứng nhận có mã xác minh công khai — sinh viên lớp tôi khoe hồ sơ xin việc cực tự tin, tôi cũng yên tâm khi ký tên.",
    name: "Lê Thu Hoa",
    role: "Giảng viên cơ sở",
    initials: "LH",
    avatarTone: "bg-[var(--note-pink)] text-[var(--note-pink-ink)]",
    tape: "warm",
    rotate: -2,
    pin: true,
  },
  {
    quote:
      "Hỏi AI Mentor lúc 2 giờ sáng vẫn có hướng tham khảo. Tuần sau deadline mới dễ thở — không phải đợi giờ hành chính.",
    name: "Đỗ Hoàng Dũng",
    role: "Thực tập sinh Mobile",
    initials: "ĐD",
    avatarTone: "bg-[var(--paper)] text-[var(--ink)]",
    tape: "slate",
    rotate: 1.1,
  },
];

export function Testimonials() {
  return (
    <section
      id="testimonials"
      aria-label="Người dùng kể lại — cảm nhận về V-Intern"
      className="paper-grain relative scroll-mt-24 bg-[var(--paper)] py-16 lg:py-24"
    >
      {/* Giấy note ghim nghiêng — hover thẳng lại như bóc note khỏi tường */}
      <style>{`
        .t-note {
          transform: rotate(var(--tilt, 0deg));
        }
        .t-note:hover {
          transform: rotate(0deg) translateY(-4px);
        }
      `}</style>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <Eyebrow>✦ Trích từ sổ tay</Eyebrow>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--ink)] sm:text-4xl">
            Người dùng <span className="marker marker-pink">kể lại</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--ink-soft)]">
            Lời thật từ những trang sổ đã viết xong vài chương — sinh viên và
            giảng viên nói về hành trình của chính họ.
          </p>
        </FadeIn>

        <Stagger className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((item) => (
            <StaggerItem key={item.name} className="h-full">
              <article
                className="t-note sketch-card relative flex h-full flex-col p-5 pt-8"
                style={{ ["--tilt" as string]: `${item.rotate}deg` }}
              >
                <Tape
                  variant={item.tape === "gold" ? "warm" : item.tape}
                  rotate={item.rotate * -2}
                  peel
                  className={`-top-3 ${item.tape === "gold" ? "tape-gold" : ""}`}
                  style={{ width: 76, left: "calc(50% - 38px)" }}
                />
                {item.pin && (
                  <PushPin
                    aria-hidden="true"
                    className="absolute -top-3.5 right-5 h-8 w-6 text-[var(--royal)]"
                  />
                )}

                <VQuote
                  size={20}
                  aria-hidden="true"
                  className="text-[var(--royal)]/50"
                />
                <blockquote className="mt-2.5">
                  <p className="text-sm leading-relaxed text-[var(--ink)]">
                    {item.quote}
                  </p>
                </blockquote>

                <div className="mt-auto flex items-center gap-3 pt-5">
                  <span
                    aria-hidden="true"
                    className={`sticker-pop flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[var(--ink)] font-mono2 text-xs font-extrabold shadow-ink-2 ${item.avatarTone}`}
                  >
                    {item.initials}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold leading-tight text-[var(--ink)]">
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-xs leading-snug text-[var(--ink-soft)]">
                      {item.role}
                    </p>
                  </div>
                </div>
              </article>
            </StaggerItem>
          ))}

          {/* Ghi chú tay lấp ô trống trên desktop */}
          <div className="hidden lg:flex lg:items-center lg:justify-center">
            <p className="max-w-[15rem] -rotate-2 font-hand text-[1.05rem] leading-snug text-[var(--pencil)]">
              mỗi lời khen đều được dán bằng băng dính thật —
              <br />
              không ai trả tiền để viết đoạn này đâu, thật đấy! ✎
            </p>
          </div>
        </Stagger>
      </div>
    </section>
  );
}
