"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  VAward,
  VArrowRight,
  VBot,
  VCertificate,
  VClipboardCheck,
  VFileCode,
  VFolderKanban,
  VKanban,
  VListTodo,
  VStar,
  VTrophy,
  VUserSearch,
  VWallet,
  type VIconComponent,
} from "@/components/icons/v-icons";
import { CheckDoodle, RouteTrail } from "@/components/notebook/doodles";
import { FadeIn } from "@/components/notebook/reveal";
import { Eyebrow, InkBadge, MarginNote, SketchCard, Tape } from "@/components/notebook/ui";

/* ------------------------------------------------------------------ */
/* Nguyên thủy preview nhỏ                                            */
/* ------------------------------------------------------------------ */

function FactRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--ink)]/15 py-1.5 text-[11px] last:border-b-0">
      <span className="shrink-0 text-[var(--ink-soft)]">{label}</span>
      <span className="min-w-0 text-right font-semibold text-[var(--ink)]">{value}</span>
    </li>
  );
}

function ArtifactPreview({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      className="sketch-card density-light sketch-card-spotlight p-3.5"
      style={{ background: "var(--blue-mist)" }}
    >
      <p className="mb-2">
        <span className="link-chip">xem trước · {label}</span>
      </p>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dữ liệu 7 bước                                                     */
/* ------------------------------------------------------------------ */

type Phase = "Bắt đầu" | "Thực chiến" | "Công nhận";

type WorkflowStep = {
  id: string;
  no: string;
  icon: VIconComponent;
  phase: Phase;
  name: string;
  detail: string;
  note?: string;
  does: string[];
  gets: string[];
  artifact: string;
  preview: ReactNode;
};

const PHASE_TONE: Record<Phase, "blue" | "amber" | "green"> = {
  "Bắt đầu": "blue",
  "Thực chiến": "amber",
  "Công nhận": "green",
};

/** Băng dính trên bảng chi tiết đổi màu theo giai đoạn. */
const TAPE_BY_PHASE: Record<Phase, "blue" | "warm" | "mint"> = {
  "Bắt đầu": "blue",
  "Thực chiến": "warm",
  "Công nhận": "mint",
};

const STEPS: WorkflowStep[] = [
  {
    id: "phong-van",
    no: "01",
    icon: VUserSearch,
    phase: "Bắt đầu",
    name: "Phỏng vấn",
    detail:
      "Chọn lĩnh vực thực tập và trả lời bộ câu hỏi do AI dẫn dắt. Câu hỏi thích ứng theo từng câu trả lời của bạn — kết quả kèm nhận xét chi tiết và gợi ý vai trò phù hợp nhất.",
    does: ["Chọn lĩnh vực muốn thực tập", "Trả lời và gửi bài phỏng vấn AI"],
    gets: ["Kết quả tuyển dụng kèm nhận xét", "Gợi ý vai trò phù hợp"],
    artifact: "Kết quả tuyển dụng",
    preview: (
      <ArtifactPreview label="Kết quả tuyển dụng">
        <ul>
          <FactRow label="Vai trò gợi ý" value="Lập trình viên Frontend" />
          <FactRow label="Điểm phỏng vấn" value="8.2/10" />
          <FactRow
            label="Kết quả"
            value={
              <InkBadge tone="green" className="px-2 py-0 text-[10px]">
                Đạt
              </InkBadge>
            }
          />
        </ul>
      </ArtifactPreview>
    ),
  },
  {
    id: "du-an",
    no: "02",
    icon: VFolderKanban,
    phase: "Bắt đầu",
    name: "Dự án",
    detail:
      "Sau khi đạt tuyển dụng, giảng viên phân công dự án và phiên thực tập. Không gian làm việc cập nhật đúng theo phân công — công nghệ, mục tiêu, người hướng dẫn.",
    does: ["Theo dõi trạng thái chờ phân công", "Đọc kỹ thông tin dự án được giao"],
    gets: ["Dự án và người hướng dẫn phù hợp", "Mục tiêu kỳ thực tập rõ ràng"],
    artifact: "Thông tin dự án",
    preview: (
      <ArtifactPreview label="Thông tin dự án">
        <ul>
          <FactRow label="Dự án" value="Cổng thông tin khoa" />
          <FactRow label="Công nghệ" value="React · Node.js" />
          <FactRow label="Người hướng dẫn" value="Thầy Minh" />
        </ul>
      </ArtifactPreview>
    ),
  },
  {
    id: "sprint",
    no: "03",
    icon: VKanban,
    phase: "Thực chiến",
    name: "Sprint",
    detail:
      "Công việc được tổ chức thành các sprint 2 tuần với mục tiêu riêng. Kéo việc giữa các cột trạng thái, theo dõi tiến độ của cả nhóm trên cùng một bảng.",
    note: "việc cứ thế chảy qua 4 cột — đừng để nó kẹt ngủ ở 'Cần làm' nhé!",
    does: ["Xem mục tiêu và thời gian sprint", "Kéo nhiệm vụ giữa các cột trạng thái"],
    gets: ["Bảng sprint trực quan", "Nhịp làm việc như công ty thật"],
    artifact: "Sprint Board",
    preview: (
      <ArtifactPreview label="Sprint Board">
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-[11px] font-semibold text-[var(--ink)]">
          <InkBadge tone="neutral" className="px-2 py-0 text-[10px]">Cần làm 3</InkBadge>
          <VArrowRight size={11} aria-hidden="true" className="text-[var(--ink-faint)]" />
          <InkBadge tone="blue" className="px-2 py-0 text-[10px]">Đang làm 2</InkBadge>
          <VArrowRight size={11} aria-hidden="true" className="text-[var(--ink-faint)]" />
          <InkBadge tone="amber" className="px-2 py-0 text-[10px]">Chờ duyệt 1</InkBadge>
          <VArrowRight size={11} aria-hidden="true" className="text-[var(--ink-faint)]" />
          <InkBadge tone="green" className="px-2 py-0 text-[10px]">Hoàn thành 5</InkBadge>
        </p>
      </ArtifactPreview>
    ),
  },
  {
    id: "nhiem-vu",
    no: "04",
    icon: VListTodo,
    phase: "Thực chiến",
    name: "Nhiệm vụ",
    detail:
      "Mỗi nhiệm vụ có story point, deadline và quy trình gửi duyệt như pull request thật. Bình luận trao đổi, lịch sử trạng thái — mọi thứ đều minh bạch.",
    does: ["Đọc yêu cầu và hạn của nhiệm vụ", "Cập nhật tiến độ và gửi duyệt"],
    gets: ["Phản hồi từ người review", "Lịch sử trạng thái rõ ràng"],
    artifact: "Chi tiết nhiệm vụ",
    preview: (
      <ArtifactPreview label="Chi tiết nhiệm vụ">
        <ul>
          <FactRow label="Nhiệm vụ" value="Task #42 · SP 3" />
          <FactRow label="Hạn chót" value="20/06 · 17:00" />
          <FactRow
            label="Trạng thái"
            value={
              <InkBadge tone="amber" className="px-2 py-0 text-[10px]">
                Chờ duyệt
              </InkBadge>
            }
          />
        </ul>
        <p className="mt-2">
          <span className="link-chip">
            <VFileCode size={12} aria-hidden="true" />
            PR #42 · AI phân tích code review
          </span>
        </p>
      </ArtifactPreview>
    ),
  },
  {
    id: "ai-mentor",
    no: "05",
    icon: VBot,
    phase: "Thực chiến",
    name: "AI Mentor",
    detail:
      "Kẹt ở đâu, hỏi đó. AI Mentor gợi ý hướng tham khảo theo ngữ cảnh công việc — sẵn sàng 24/7, không cần chờ giờ hành chính.",
    does: ["Đặt câu hỏi kèm ngữ cảnh nhiệm vụ", "Nhận gợi ý tham khảo tức thì"],
    gets: ["Hướng giải quyết tham khảo", "Tiến độ không bị gián đoạn"],
    artifact: "Cuộc hội thoại",
    preview: (
      <ArtifactPreview label="Cuộc hội thoại">
        <div className="space-y-2">
          <p className="ml-auto w-fit max-w-[85%] rounded-[10px_3px_10px_10px] border-2 border-[var(--ink)] bg-[var(--royal)] px-2.5 py-1.5 text-[11px] font-medium leading-snug text-white dark:text-[#101018]">
            Em bị kẹt ở useEffect chạy 2 lần…
          </p>
          <p className="w-fit max-w-[85%] rounded-[3px_10px_10px_10px] border-2 border-[var(--ink)]/15 bg-[var(--paper-raised)] px-2.5 py-1.5 text-[11px] leading-snug text-[var(--ink)]">
            Thử truyền dependency đúng và viết cleanup trong hàm trả về nhé.
          </p>
        </div>
      </ArtifactPreview>
    ),
  },
  {
    id: "danh-gia",
    no: "06",
    icon: VClipboardCheck,
    phase: "Công nhận",
    name: "Đánh giá",
    detail:
      "AI chấm nháp dựa trên kết quả công việc, giảng viên xem xét và chốt điểm chính thức. KPI và lương ảo tổng hợp hiệu suất của bạn từng kỳ.",
    note: "Điểm AI đề xuất không tự trở thành điểm chính thức — giảng viên mới là người chốt!",
    does: ["Xem điểm nháp và nhận xét của AI", "Trao đổi với giảng viên để chốt điểm"],
    gets: ["Bảng KPI cá nhân", "Lương ảo theo hiệu suất"],
    artifact: "Đánh giá & KPI",
    preview: (
      <ArtifactPreview label="Đánh giá & KPI">
        <ul>
          <FactRow
            label="KPI hoàn thành"
            value={
              <span className="inline-flex items-center gap-1.5">
                <VTrophy size={12} className="text-gold" aria-hidden="true" />
                92%
              </span>
            }
          />
          <FactRow label="Điểm AI đề xuất" value="8.5/10" />
          <FactRow
            label="Lương ảo"
            value={
              <span className="inline-flex items-center gap-1.5">
                <VWallet size={12} className="text-[var(--royal)]" aria-hidden="true" />
                8.500.000 đ ảo
              </span>
            }
          />
        </ul>
        <p className="mt-2 font-mono2 text-[9px] leading-relaxed text-[var(--ink-faint)]">
          Lương ảo là giá trị trong chương trình, không phải bảng lương thực tế.
        </p>
      </ArtifactPreview>
    ),
  },
  {
    id: "chung-nhan",
    no: "07",
    icon: VAward,
    phase: "Công nhận",
    name: "Chứng nhận",
    detail:
      "Hoàn thành kỳ thực tập, bạn nhận chứng nhận số công nhận năng lực — kèm bảng kỹ năng tích luỹ suốt hành trình, minh chứng đúng nghĩa cho hồ sơ nghề nghiệp.",
    does: ["Hoàn tất nhiệm vụ và đánh giá cuối kỳ", "Nhận chứng nhận số của chương trình"],
    gets: ["Chứng nhận hoàn thành", "Trang kỹ năng để khoe với nhà tuyển dụng"],
    artifact: "Chứng nhận",
    preview: (
      <ArtifactPreview label="Chứng nhận">
        <div className="flex flex-col items-center rounded-[8px_10px_8px_10px] border-2 border-double border-[var(--ink)]/40 px-3 py-4 text-center">
          <VCertificate size={26} className="text-[var(--royal)]" aria-hidden="true" />
          <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-[var(--ink)]">
            Chứng nhận hoàn thành kỳ thực tập
          </p>
          <p className="mt-1 font-hand text-base text-[var(--royal)]">Nguyễn Văn An</p>
          <span
            className="stamp-moc stamp-blue mt-2.5 animate-stamp-thump"
            style={{ ["--stamp-rotate" as string]: "-6deg", fontSize: "0.55rem" }}
          >
            Đã cấp
          </span>
        </div>
      </ArtifactPreview>
    ),
  },
];

const PHASES: { label: Phase; stepIds: string[] }[] = [
  { label: "Bắt đầu", stepIds: ["phong-van", "du-an"] },
  { label: "Thực chiến", stepIds: ["sprint", "nhiem-vu", "ai-mentor"] },
  { label: "Công nhận", stepIds: ["danh-gia", "chung-nhan"] },
];

/* ------------------------------------------------------------------ */

/** Đỉnh ray tiến trình tính từ mép trên của khối mục lục (top-3 = 12px). */
const RAIL_TOP = 12;

export function Workflow() {
  const [activeId, setActiveId] = useState(STEPS[0].id);
  const [railFill, setRailFill] = useState(0);
  const reduced = useReducedMotion();

  const tocRef = useRef<HTMLDivElement | null>(null);
  const stepRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const active = STEPS.find((s) => s.id === activeId) ?? STEPS[0];
  const ActiveIcon = active.icon;
  const activeIndex = STEPS.findIndex((s) => s.id === active.id);

  /* Đo vị trí nút đang chọn để đổ mực vào rail tới đúng bước đó */
  useEffect(() => {
    const measure = () => {
      const rail = tocRef.current;
      const button = stepRefs.current.get(activeId);
      if (!rail || !button) return;
      const center = button.offsetTop + button.offsetHeight / 2;
      setRailFill(Math.max(0, center - RAIL_TOP));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeId]);

  /** Phím mũi tên trái/phải lật bước trên bảng chi tiết (focus đang ở panel). */
  const onPanelKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = event.key === "ArrowRight" ? activeIndex + 1 : activeIndex - 1;
    const clamped = Math.min(STEPS.length - 1, Math.max(0, next));
    setActiveId(STEPS[clamped].id);
  };

  return (
    <section
      id="workflow"
      aria-label="Quy trình thực tập ảo chi tiết"
      className="scroll-mt-24 border-t-2 border-[var(--ink)]/10 bg-[var(--paper)] py-16 lg:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <Eyebrow>Mục lục hành trình</Eyebrow>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--ink)] sm:text-4xl">
            Quy trình <span className="marker">thực tập ảo</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--ink-soft)]">
            Bảy bước, từ lúc bạn bước vào phòng phỏng vấn đến ngày nhận chứng
            nhận.
          </p>
        </FadeIn>

        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-12">
          {/* Mục lục 3 giai đoạn — rail mực bên trái đổ dần tới bước đang đọc */}
          <FadeIn>
            <div ref={tocRef} className="relative space-y-8 pl-6 lg:pb-6">
              {/* Ray: rãng mờ + đoạn mực hoàng gia + chấm hiện tại */}
              <span
                aria-hidden="true"
                className="absolute bottom-4 left-[7px] top-3 w-[2px] rounded-full bg-[var(--ink)]/12"
              />
              <span
                aria-hidden="true"
                className="absolute left-[7px] top-3 w-[2px] rounded-full bg-[var(--royal)] transition-[height] duration-500"
                style={{ height: railFill }}
              />
              <span
                aria-hidden="true"
                className="absolute left-[2px] h-3 w-3 rounded-full border-2 border-[var(--ink)] bg-[var(--royal)] shadow-ink-2 transition-[top] duration-500"
                style={{ top: railFill + 6 }}
              />

              {PHASES.map((phase) => (
                <div key={phase.label}>
                  <p className="font-mono2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--ink-faint)]">
                    {phase.label}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {STEPS.filter((s) => phase.stepIds.includes(s.id)).map((step) => {
                      const isActive = step.id === activeId;
                      return (
                        <li key={step.id}>
                          <button
                            type="button"
                            ref={(el) => {
                              if (el) stepRefs.current.set(step.id, el);
                            }}
                            onClick={() => setActiveId(step.id)}
                            onMouseEnter={() => setActiveId(step.id)}
                            aria-current={isActive ? "step" : undefined}
                            className={`focus-ink flex min-h-11 w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm transition-colors ${
                              isActive
                                ? "nav-marker font-bold text-[var(--ink)]"
                                : "font-medium text-[var(--ink-soft)] hover:bg-[var(--blue-mist)]/60 hover:text-[var(--ink)]"
                            }`}
                          >
                            <span className="font-mono2 text-xs font-bold text-[var(--royal)]">
                              {step.no}
                            </span>
                            {step.name}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              <div className="pt-2">
                <RouteTrail aria-hidden="true" className="h-6 w-28 text-[var(--royal)]/40" />
                <p className="mt-2 font-hand text-[0.95rem] leading-snug text-[var(--pencil)]">
                  rê chuột hoặc chạm vào từng bước để lật trang ✎
                </p>
                <p className="mt-1.5 font-hand text-[0.95rem] leading-snug text-[var(--pencil)]">
                  mỗi bước trung bình 1 tuần — 7 bước cho một kỳ thực tập
                </p>
              </div>
            </div>
          </FadeIn>

          {/* Bảng chi tiết — dính đầu khi cuộn trên desktop, phím ← → chuyển bước */}
          <FadeIn delay={0.1}>
            <div className="lg:sticky lg:top-28">
              <div
                tabIndex={0}
                role="group"
                aria-label={`Chi tiết bước ${active.no}: ${active.name} — dùng phím mũi tên trái/phải để chuyển bước`}
                aria-keyshortcuts="ArrowLeft ArrowRight"
                onKeyDown={onPanelKeyDown}
                className="focus-ink rounded-[12px_15px_13px_14px] outline-offset-4"
              >
                <SketchCard hover={false} className="relative p-6 sm:p-7">
                  <Tape
                    variant={TAPE_BY_PHASE[active.phase]}
                    rotate={-3}
                    peel
                    className="-top-3 z-10"
                    style={{ width: 92, left: "calc(50% - 46px)" }}
                  />
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={active.id}
                      initial={reduced ? undefined : { opacity: 0, x: 28 }}
                      animate={reduced ? undefined : { opacity: 1, x: 0 }}
                      exit={reduced ? undefined : { opacity: 0, x: -20 }}
                      transition={{ duration: reduced ? 0 : 0.26, ease: [0.21, 0.47, 0.32, 0.98] }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-[10px_13px_11px_12px] border-2 border-[var(--ink)] bg-[var(--blue-mist)] text-[var(--royal)] shadow-ink-2">
                          <ActiveIcon size={22} />
                        </span>
                        <InkBadge tone={PHASE_TONE[active.phase]}>{active.phase}</InkBadge>
                        <span className="font-mono2 text-xs text-[var(--ink-faint)]">
                          bước {active.no}/07
                        </span>
                      </div>

                      <h3 className="mt-5 text-2xl font-extrabold tracking-tight text-[var(--ink)]">
                        {active.name}
                      </h3>
                      <p className="mt-2.5 text-sm leading-relaxed text-[var(--ink-soft)]">
                        {active.detail}
                      </p>

                      {active.note && (
                        <MarginNote className="mt-3 -rotate-1">{active.note}</MarginNote>
                      )}

                      <div className="mt-5 grid gap-5 sm:grid-cols-2">
                        <div>
                          <p className="font-mono2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                            bạn làm
                          </p>
                          <ul className="mt-2.5 space-y-2">
                            {active.does.map((item) => (
                              <li key={item} className="flex items-start gap-2 text-[13px] leading-snug text-[var(--ink)]">
                                <CheckDoodle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--royal)]" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="font-mono2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                            bạn nhận
                          </p>
                          <ul className="mt-2.5 space-y-2">
                            {active.gets.map((item) => (
                              <li key={item} className="flex items-start gap-2 text-[13px] leading-snug text-[var(--ink)]">
                                <VStar size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--warning)]" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="mt-6">{active.preview}</div>

                      <p className="mt-5 flex flex-wrap items-center gap-2">
                        <span className="link-chip">← →</span>
                        <span className="font-hand text-[0.9rem] leading-snug text-[var(--pencil)]">
                          lật trang từng bước bằng phím mũi tên ✎
                        </span>
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </SketchCard>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
