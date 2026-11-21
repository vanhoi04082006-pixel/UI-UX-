"use client";

/* =====================================================================
 * STUDENT MENTOR — "AI Mentor": danh sách hội thoại + khung chat gửi qua
 * adapter mentor (máy chủ lưu bền hội thoại hai phía, trả lời kèm theo) —
 * có chỉ báo đang gõ & fallback lỗi.
 * ===================================================================== */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  createConversation,
  getConversation,
  listConversations,
  sendMentorMessage,
} from "@/lib/api/mentor";
import { useApi } from "@/lib/use-api";
import type { MentorConversation, MentorMessage } from "@/lib/mock/types";
import { cn } from "@/lib/utils";
import {
  Eyebrow,
  MarginNote,
  NoteCard,
  SketchCard,
  formatDateTimeVN,
} from "@/components/notebook/ui";
import { SquiggleUnderline, CrossDoodle } from "@/components/notebook/doodles";
import { InkButton } from "@/components/notebook/reveal";
import { VArrowLeft, VBot, VPlus, VSend, VSparkles } from "@/components/icons/v-icons";
import { ErrorNote, LoadingBlocks, shortTimeVN } from "./student-shared";

const QUICK_PROMPTS = [
  "Giải thích story point là gì?",
  "Review code như nào cho chuẩn?",
  "Chia component thế nào cho gọn?",
  "Viết commit message tiếng Anh giúp mình",
];

export default function StudentMentor() {
  const { data, loading, error, reload } = useApi<MentorConversation[]>(
    () => listConversations(),
    [],
  );

  const [convs, setConvs] = useState<MentorConversation[] | null>(null);
  /* Danh sách theo hợp đồng không kèm tin nhắn — tải nội dung từng hội thoại
   * để khung chat và xem trước danh sách giống hệt bản GET cũ. */
  useEffect(() => {
    if (!data) return;
    let alive = true;
    Promise.all(
      data.map((c) => getConversation(c.id).catch(() => c)),
    ).then((full) => {
      if (alive) setConvs(full);
    });
    return () => {
      alive = false;
    };
  }, [data]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<"open" | "archived">("open");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(false);
  const [input, setInput] = useState("");
  /* Hội thoại đã mở xem — chấm dot “chưa đọc” cho hội thoại có tin cuối từ AI. */
  const [openedIds, setOpenedIds] = useState<Set<string>>(() => new Set<string>());
  const taRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* Chọn hội thoại mặc định khi dữ liệu mới tới. */
  useEffect(() => {
    if (convs && convs.length > 0 && !convs.some((c) => c.id === activeId)) {
      const def = convs.find((c) => !c.archived)?.id ?? convs[0].id;
      setActiveId(def);
      setOpenedIds((prev) => new Set(prev).add(def));
    }
  }, [convs, activeId]);

  const active = convs?.find((c) => c.id === activeId) ?? null;
  const list = (convs ?? []).filter((c) => (tab === "open" ? !c.archived : c.archived));
  const openCount = (convs ?? []).filter((c) => !c.archived).length;

  /* Tự cuộn xuống tin cuối cùng. */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [active?.messages.length, typing, activeId]);

  const patchConv = (id: string, updater: (c: MentorConversation) => MentorConversation) => {
    setConvs((prev) => (prev ?? []).map((c) => (c.id === id ? updater(c) : c)));
  };

  const newConversation = async () => {
    const now = new Date();
    const title = `Hội thoại mới · ${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
    try {
      /* Hợp đồng mới: hội thoại được lưu trên máy chủ (kèm câu chào mở màn) —
       * thay cho bản tạo thuần local trước đây. */
      const conv = await createConversation(title);
      setConvs((prev) => [conv, ...(prev ?? [])]);
      setActiveId(conv.id);
      setTab("open");
      setMobileChatOpen(true);
      setInput("");
    } catch {
      toast.error("Không mở được hội thoại mới — thử lại giúp mình nhé!");
    }
  };

  const autoGrow = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || typing || !active) return;
    const conv = active;
    const myMsg: MentorMessage = { id: `me-${Date.now()}`, from: "me", text, at: new Date().toISOString() };
    patchConv(conv.id, (c) => ({ ...c, messages: [...c.messages, myMsg] }));
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    setTyping(true);

    try {
      /* Hợp đồng mới: máy chủ lưu cả tin của bạn lẫn câu trả lời AI,
       * trả về kèm `reply` — bản địa chỉ ghép hồi âm như cũ. */
      const res = await sendMentorMessage(conv.id, text);
      patchConv(conv.id, (c) => ({
        ...c,
        messages: [
          ...c.messages,
          { id: `ai-${Date.now()}`, from: "ai", text: res.reply, at: new Date().toISOString() },
        ],
      }));
    } catch {
      // Mất kết nối: hoàn tác tin nhắn vừa gửi, trả lại nội dung vào ô nhập để gửi lại.
      patchConv(conv.id, (c) => ({ ...c, messages: c.messages.filter((m) => m.id !== myMsg.id) }));
      setInput(text);
      // Câu hỏi dài có thể cần ô nhập cao lại sau khi trả nội dung về.
      requestAnimationFrame(autoGrow);
      toast.error("AI Mentor đang bận — câu hỏi đã giữ lại, gửi lại giúp mình nhé!");
    } finally {
      setTyping(false);
    }
  };

  if (loading || (!convs && !error)) return <LoadingBlocks label="Đang mở hộp thoại AI Mentor…" />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;

  const showTip = !tipDismissed && (!active || !active.messages.some((m) => m.from === "me"));

  return (
    <div className="space-y-4">
      <header className="nb-rise flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <Eyebrow>AI MENTOR · TRỢ LÝ TRỰC 24/7</Eyebrow>
          <h1 className="mt-1.5 text-2xl font-extrabold leading-tight text-[var(--ink)]">AI Mentor</h1>
          <SquiggleUnderline className="mt-1 h-2.5 w-36 text-[var(--royal)]" />
        </div>
        <MarginNote className="max-w-56">hỏi nhỏ nhận gợi ý lớn — không cần đặt lịch</MarginNote>
      </header>

      <SketchCard hover={false} className="overflow-hidden">
        <div className="grid h-[70vh] min-h-[520px] md:grid-cols-[280px_1fr]">
          {/* ------------------------- Cột trái: danh sách ------------------------- */}
          <div
            className={cn(
              "min-h-0 flex-col border-[color-mix(in_srgb,var(--ink)_25%,transparent)] md:flex md:border-r-2 md:border-dashed",
              mobileChatOpen ? "hidden" : "flex",
            )}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b-2 border-dashed border-[color-mix(in_srgb,var(--ink)_25%,transparent)] px-4 py-3.5">
              <h2 className="text-[0.95rem] font-bold">Hội thoại</h2>
              <span className="tabular text-[0.68rem] font-semibold text-[var(--ink-soft)]">
                {convs?.length ?? 0} tổng
              </span>
            </div>

            <div className="flex shrink-0 gap-1.5 p-2.5" role="tablist" aria-label="Lọc hội thoại theo trạng thái">
              {(
                [
                  { key: "open", label: `Đang mở` },
                  { key: "archived", label: "Lưu trữ" },
                ] as const
              ).map((t) => {
                const on = tab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "focus-ink flex-1 rounded-full border-2 px-3 py-1.5 text-[0.72rem] font-bold transition-all",
                      on
                        ? "border-[var(--ink)] bg-[var(--royal)] text-white shadow-ink-2 dark:text-[#101018]"
                        : "border-[color-mix(in_srgb,var(--ink)_35%,transparent)] bg-[var(--paper-raised)] text-[var(--ink-soft)] hover:border-[var(--ink)] hover:text-[var(--ink)]",
                    )}
                  >
                    {t.label} · {t.key === "open" ? openCount : (convs?.length ?? 0) - openCount}
                  </button>
                );
              })}
            </div>

            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-2.5 pb-2.5 [scrollbar-width:thin]">
              {list.length === 0 && (
                <p className="px-2 py-8 text-center font-hand text-[0.95rem] text-[var(--ink-faint)]">
                  chưa có hội thoại nào ở đây
                </p>
              )}
              {list.map((c) => {
                const last = c.messages[c.messages.length - 1];
                const on = c.id === activeId;
                const unread = !openedIds.has(c.id) && last?.from === "ai";
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setActiveId(c.id);
                      setOpenedIds((prev) => new Set(prev).add(c.id));
                      setMobileChatOpen(true);
                    }}
                    aria-current={on ? "true" : undefined}
                    className={cn(
                      "focus-ink w-full rounded-[10px_12px_11px_12px] border-l-4 p-2.5 text-left transition-colors",
                      on
                        ? "border-[var(--royal)] bg-[var(--blue-mist)]"
                        : "border-transparent hover:bg-[var(--blue-mist)]",
                    )}
                  >
                    <p className="flex items-center gap-2 truncate text-[0.82rem] font-bold text-[var(--ink)]">
                      {c.title}
                      {unread && (
                        <span
                          role="img"
                          aria-label="Hội thoại có tin nhắn mới từ AI Mentor"
                          className="ws-dot mt-0.5 shrink-0"
                          style={{ background: "var(--royal)", borderColor: "var(--royal)" }}
                        />
                      )}
                    </p>
                    <p className="truncate text-[0.72rem] leading-snug text-[var(--ink-soft)]">
                      {last ? `${last.from === "me" ? "Bạn: " : ""}${last.text}` : "—"}
                    </p>
                    <p className="tabular mt-0.5 text-[0.65rem] text-[var(--ink-faint)]">
                      {last ? shortTimeVN(last.at) : ""} · {c.messages.length} tin
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="shrink-0 border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_25%,transparent)] p-2.5">
              <InkButton variant="outline" size="sm" className="w-full" onClick={newConversation}>
                <VPlus size={15} /> Cuộc trò chuyện mới
              </InkButton>
            </div>
          </div>

          {/* ------------------------- Cột phải: khung chat ------------------------- */}
          <div className={cn("relative min-h-0 flex-col", mobileChatOpen ? "flex" : "hidden md:flex")}>
            {!active ? (
              <div className="grid h-full place-items-center p-6 text-center">
                <div>
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-[14px_17px_15px_16px] border-2 border-[var(--ink)] bg-[var(--royal)] text-white shadow-ink-3 dark:text-[#101018]">
                    <VBot size={30} />
                  </span>
                  <p className="mt-4 max-w-60 font-hand text-xl leading-snug text-[var(--ink-soft)]">
                    Chọn một hội thoại bên trái, hoặc mở cuộc trò chuyện mới
                  </p>
                </div>
              </div>
            ) : (
              <>
                <header className="flex shrink-0 items-center gap-3 border-b-2 border-dashed border-[color-mix(in_srgb,var(--ink)_25%,transparent)] px-3.5 py-3">
                  <button
                    type="button"
                    onClick={() => setMobileChatOpen(false)}
                    aria-label="Về danh sách hội thoại"
                    className="focus-ink grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--ink)] shadow-ink-2 md:hidden"
                  >
                    <VArrowLeft size={16} />
                  </button>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px_12px_10px_12px] border-2 border-[var(--ink)] bg-[var(--royal)] text-white dark:text-[#101018]">
                    <VBot size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.9rem] font-bold text-[var(--ink)]">{active.title}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[0.7rem] font-semibold text-[var(--ink-soft)]">
                      <span className="ws-dot animate-blink-dot" style={{ background: "var(--success)" }} aria-hidden="true" />
                      AI Mentor · trực 24/7
                    </p>
                  </div>
                  <MarginNote className="hidden max-w-48 text-[0.8rem] lg:block">gợi ý của AI chỉ để tham khảo</MarginNote>
                </header>

                {showTip && (
                  <div className="relative shrink-0 px-3.5 py-2">
                    <NoteCard tone="yellow" rotate={-0.6} className="!px-3.5 !py-2.5 !text-[0.78rem]">
                      Hỏi càng cụ thể, gợi ý càng sát bài của bạn — kèm cả code, task code (VD-102...)
                      nhé!
                    </NoteCard>
                    <button
                      type="button"
                      onClick={() => setTipDismissed(true)}
                      aria-label="Đóng gợi ý"
                      className="focus-ink absolute right-5 top-3.5 grid size-6 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--ink-soft)] shadow-ink-2 transition-colors hover:text-[var(--ink)]"
                    >
                      <CrossDoodle className="size-3" />
                    </button>
                  </div>
                )}

                <div
                  ref={scrollRef}
                  role="log"
                  aria-label="Nội dung hội thoại với AI Mentor"
                  className="paper-grid min-h-0 flex-1 space-y-3 overflow-y-auto p-4 [scrollbar-width:thin]"
                >
                  <AnimatePresence initial={false}>
                    {active.messages.map((m) => (
                      <ChatBubble key={m.id} msg={m} />
                    ))}
                  </AnimatePresence>
                  {typing && (
                    <div className="flex items-end gap-2">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--royal)] text-white dark:text-[#101018]">
                        <VBot size={14} />
                      </span>
                      <div className="sketch-border-thin flex items-center gap-1.5 bg-[var(--paper-raised)] px-3.5 py-3">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="h-2 w-2 animate-blink-dot rounded-full bg-[var(--ink-soft)]"
                            style={{ animationDelay: `${i * 0.22}s` }}
                          />
                        ))}
                        <span className="sr-only">AI Mentor đang soạn trả lời</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="shrink-0 border-t-2 border-dashed border-[color-mix(in_srgb,var(--ink)_25%,transparent)] p-3">
                  {/* Câu hỏi nhanh — bấm gửi ngay */}
                  <div className="mb-2 flex flex-wrap gap-1.5" aria-label="Gợi ý câu hỏi nhanh">
                    {QUICK_PROMPTS.map((qp) => (
                      <button
                        key={qp}
                        type="button"
                        onClick={() => void send(qp)}
                        disabled={typing}
                        title={`Gửi ngay: “${qp}”`}
                        className="focus-ink inline-flex items-center gap-1 rounded-full border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_38%,transparent)] bg-[var(--paper-raised)] px-2.5 py-1 text-[0.7rem] font-semibold text-[var(--ink-soft)] transition-all hover:-translate-y-0.5 hover:border-[var(--royal)] hover:text-[var(--royal)] disabled:pointer-events-none disabled:opacity-50"
                      >
                        <VSparkles size={11} aria-hidden="true" />
                        {qp}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={taRef}
                      value={input}
                      rows={1}
                      onChange={(e) => {
                        setInput(e.target.value);
                        autoGrow();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void send();
                        }
                      }}
                      placeholder="Nhập câu hỏi cho AI Mentor…"
                      aria-label="Nhập câu hỏi cho AI Mentor"
                      className="focus-ink max-h-30 min-h-10.5 w-full min-w-0 flex-1 resize-none rounded-[10px_12px_11px_12px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2.5 text-[0.85rem] leading-snug outline-none placeholder:text-[var(--ink-faint)]"
                    />
                    <InkButton
                      variant="royal"
                      size="md"
                      onClick={() => void send()}
                      disabled={!input.trim() || typing}
                      aria-label="Gửi tin nhắn cho AI Mentor"
                      className="ink-ripple"
                    >
                      {typing ? <span className="spinner-ink" aria-hidden="true" /> : <VSend size={16} />} Gửi
                    </InkButton>
                  </div>
                  <p className="mt-1.5 text-[0.65rem] text-[var(--ink-faint)]">
                    Enter để gửi · Shift+Enter xuống dòng — AI soạn trong vài giây
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </SketchCard>
    </div>
  );
}

/* ------------------------------ Bong bóng chat ------------------------------ */

function ChatBubble({ msg }: { msg: MentorMessage }) {
  const mine = msg.from === "me";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={cn("flex items-end gap-2", mine && "flex-row-reverse")}
    >
      {!mine && (
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--royal)] text-white dark:text-[#101018]">
          <VBot size={14} />
        </span>
      )}
      <div
        title={`Gửi lúc ${formatDateTimeVN(msg.at)}`}
        className={cn(
          "animate-pop-in max-w-[85%] border-2 border-[var(--ink)] p-3 text-[0.84rem] leading-relaxed sm:max-w-[75%]",
          mine
            ? "rounded-[14px_14px_4px_14px] bg-[var(--royal)] text-white dark:text-[#101018]"
            : "rounded-[4px_14px_14px_14px] bg-[var(--paper-raised)] text-[var(--ink)] shadow-ink-2",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
        <p
          className={cn(
            "tabular mt-1 text-right text-[0.62rem]",
            mine ? "text-white/70 dark:text-[#101018]/60" : "text-[var(--ink-soft)]",
          )}
        >
          {shortTimeVN(msg.at)}
        </p>
      </div>
    </motion.div>
  );
}
