"use client";

import { VPlus } from "@/components/icons/v-icons";
import { FadeIn } from "@/components/notebook/reveal";
import { Eyebrow, MarginNote } from "@/components/notebook/ui";

type FaqItem = { q: string; a: string; note?: string };

const FAQ_ITEMS: FaqItem[] = [
  {
    q: "V-Intern có miễn phí thật không cho sinh viên?",
    a: "Có — hoàn toàn miễn phí cho sinh viên. Tạo tài khoản, làm bài phỏng vấn AI và tham gia kỳ thực tập đều không tốn phí. Chỉ cần mang theo tinh thần học hỏi là đủ.",
    note: "miễn phí thật, không có dấu asterisk nhỏ nhỏ ở đâu đâu!",
  },
  {
    q: "Em chưa biết gì về Git và pull request, có theo được không?",
    a: "Được. Phiên đầu tiên có giai đoạn làm quen: AI Mentor giải thích từng khái niệm theo ngữ cảnh nhiệm vụ của bạn, và nhiệm vụ khởi động được thiết kế để bạn quen dần với task, PR và code review.",
    note: "git cũng chỉ là sổ ghi việc — học được trong tuần đầu!",
  },
  {
    q: "Phỏng vấn với AI có khó không? Em sợ trả lời sai.",
    a: "Câu hỏi thích ứng theo trình độ của bạn — trả lời tốt thì thử thách tăng dần, trả lời yếu thì AI gợi ý hướng ôn lại. Sai không bị trừ gì cả: kết quả kèm nhận xét chi tiết để bạn đọc lại phần mình hổng.",
  },
  {
    q: "Điểm AI chấm có phải là điểm chính thức?",
    a: "Không. AI chỉ chấm nháp kèm đề xuất điểm và nhận xét; giảng viên xem xét kết quả công việc thực tế và chốt điểm chính thức. Con số của AI là ánh sáng soi đường, không phải phán quyết.",
    note: "AI nháp — thầy cô mới là người chốt điểm!",
  },
  {
    q: "Chứng nhận dùng được khi đi xin việc không?",
    a: "Chứng nhận số ghi rõ kỳ thực tập, vai trò và bảng kỹ năng tích luỹ, kèm mã xác minh công khai để nhà tuyển dụng tự tra cứu. Bạn cũng có thể tải PDF đính kèm hồ sơ.",
  },
  {
    q: "Một kỳ thực tập kéo dài bao lâu?",
    a: "Khoảng 12 tuần — 7 bước hành trình, mỗi bước trung bình 1 tuần, gọn như một cuốn sổ bảy chương. Sprint 2 tuần một nhịp, đúng nhịp quen thuộc của các đội phát triển thật.",
    note: "12 tuần — vừa đủ để đổi một thói quen nghề nghiệp",
  },
  {
    q: "Giảng viên có phải canh hệ thống cả ngày không?",
    a: "Không cần. Bảng sprint tổng hợp tiến độ cả lớp, AI chấm nháp và đề xuất điểm, báo cáo cuối kỳ tự tổng hợp. Giảng viên tập trung vào phần khó nhất: dẫn dắt con người.",
    note: "công việc lặp lại để máy lo — coaching để thầy cô lo",
  },
];

export function Faq() {
  return (
    <section
      id="faq"
      aria-label="Câu hỏi thường gặp về V-Intern"
      className="paper-grain relative scroll-mt-24 bg-[var(--paper)] py-16 lg:py-24"
    >
      {/* Thẻ Q&A gấp-mở — nét vẽ vào khi bung câu trả lời */}
      <style>{`
        details[open] .faq-body {
          animation: faq-open 300ms var(--motion-ease) both;
        }
        @keyframes faq-open {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
        <FadeIn className="text-center">
          <Eyebrow>✦ Giải đáp nhanh</Eyebrow>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--ink)] sm:text-4xl">
            Câu hỏi <span className="marker marker-yellow">thường gặp</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--ink-soft)]">
            Bảy câu ngắn gọn được gấp sẵn như các tab sổ tay — tab nào đúng
            thắc mắc thì mở tab đó ra.
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="mt-10 space-y-4">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.q}
                className="group sketch-card p-0 transition-[box-shadow] duration-200 [&[open]]:shadow-ink-4"
              >
                <summary className="focus-ink flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden">
                  <span className="text-sm font-bold leading-snug text-[var(--ink)] sm:text-[0.95rem]">
                    {item.q}
                  </span>
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px_11px_9px_10px] border-2 border-[var(--ink)] bg-[var(--blue-mist)] text-[var(--royal)] shadow-ink-2 transition-transform duration-200 group-open:rotate-45"
                  >
                    <VPlus size={16} />
                  </span>
                </summary>
                <div className="faq-body px-5 pb-5">
                  <p className="text-sm leading-relaxed text-[var(--ink-soft)]">{item.a}</p>
                  {item.note && <MarginNote className="mt-3 -rotate-1">{item.note}</MarginNote>}
                </div>
              </details>
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={0.15} className="mt-10 text-center">
          <p className="font-hand text-[1.05rem] leading-snug text-[var(--pencil)]">
            còn thắc mắc nào lở dở — cuộn lên trên hỏi robot linh vật nhé ✎
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
