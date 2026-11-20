"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { useMock } from "@/lib/use-mock";
import type { Certificate } from "@/lib/mock/types";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  InkBadge,
  MarginNote,
  SketchCard,
  StampMoc,
  Tape,
  formatDateVN,
} from "@/components/notebook/ui";
import { CheckDoodle } from "@/components/notebook/doodles";
import { InkButton, Stagger, StaggerItem } from "@/components/notebook/reveal";
import { VX } from "@/components/icons/v-icons";
import {
  VAward,
  VCertificate,
  VCopy,
  VDownload,
  VExternal,
  VAlert,
} from "@/components/icons/v-icons";
import {
  EmptyFigure,
  ErrorPanel,
  LoadingPanel,
  PageHeading,
} from "./nb-kit-5c2";

/* =====================================================================
 * CHỨNG NHẬN — bằng hoàn thành kỳ thực tập, mỗi bản có mã xác minh công khai.
 * ====================================================================== */

const CONDITIONS = [
  "Hoàn thành ≥ 80% nhiệm vụ được giao",
  "Điểm KPI kỳ cuối ≥ 70/100",
  "Không vi phạm kỷ luật nộp bài",
];

function CertCard({
  c,
  onCopy,
  onDownload,
  onPreview,
}: {
  c: Certificate;
  onCopy: (c: Certificate) => void;
  onDownload: (c: Certificate) => void;
  onPreview: (c: Certificate) => void;
}) {
  const revoked = c.status === "revoked";
  return (
    <StaggerItem>
      <SketchCard as="article" className={cn("relative p-5 pt-8", revoked && "opacity-75")}>
        <Tape variant="mint" rotate={-5} className="-top-2.5 left-7 !h-5 !w-20" />

        <div className="flex items-start gap-4">
          <span
            className={cn(
              "grid size-12 shrink-0 place-items-center rounded-full border-2 border-[var(--royal)] bg-[var(--blue-mist)] text-[var(--royal)]",
              !revoked && "badge-glow",
            )}
            style={!revoked ? ({ "--glow-tone": "var(--success)" } as React.CSSProperties) : undefined}
            aria-hidden="true"
          >
            <VCertificate size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-geist-mono text-[0.95rem] font-extrabold">{c.code}</p>
              {revoked ? (
                <InkBadge tone="red" dot>
                  Đã thu hồi
                </InkBadge>
              ) : (
                <InkBadge tone="green" dot>
                  Còn hiệu lực
                </InkBadge>
              )}
            </div>
            <dl className="mt-2.5 space-y-1 text-[0.82rem]">
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 font-semibold text-[var(--ink-soft)]">Dự án</dt>
                <dd className="min-w-0 font-semibold leading-snug">{c.project}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 font-semibold text-[var(--ink-soft)]">Phiên</dt>
                <dd>{c.session}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 font-semibold text-[var(--ink-soft)]">Cấp ngày</dt>
                <dd className="tabular">{formatDateVN(c.issuedAt)}</dd>
              </div>
            </dl>
          </div>
        </div>

        {revoked && (
          <p
            className="ants-border mt-3 flex items-start gap-2 rounded-[10px] bg-[color-mix(in_srgb,var(--danger)_7%,transparent)] px-3 py-2 text-[0.78rem] font-semibold leading-snug text-[var(--danger)]"
            style={{ "--ants-color": "var(--danger)" } as React.CSSProperties}
          >
            <VAlert size={15} className="mt-0.5 shrink-0" />
            Chứng nhận đã bị thu hồi — mã xác minh không còn hiệu lực. Liên hệ quản trị viên để
            biết chi tiết.
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onCopy(c)}
            className="link-chip focus-ink font-geist-mono !text-[0.78rem] !font-bold !tracking-wide !text-[var(--royal)]"
            aria-label={`Sao chép mã xác minh ${c.verifyCode}`}
            title="Bấm để sao chép mã xác minh"
          >
            <VCopy size={12} aria-hidden="true" /> {c.verifyCode}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2.5">
          <InkButton
            variant="outline"
            size="sm"
            onClick={() => onDownload(c)}
            disabled={revoked}
          >
            <VDownload size={15} /> Tải PDF
          </InkButton>
          <InkButton variant="ghost" size="sm" onClick={() => onPreview(c)}>
            <VExternal size={15} /> Xem trước
          </InkButton>
        </div>
      </SketchCard>
    </StaggerItem>
  );
}

export default function StudentCertificates() {
  const user = useApp((s) => s.user);
  const email = user?.email ?? "";
  const { data, loading, error, reload } = useMock<Certificate[]>(
    email ? `intern/certificates?email=${encodeURIComponent(email)}` : null,
  );
  const [preview, setPreview] = useState<Certificate | null>(null);
  const conditionsRef = useRef<HTMLDivElement>(null);

  const scrollToConditions = () => {
    conditionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    conditionsRef.current?.focus();
  };

  const copyVerify = async (c: Certificate) => {
    try {
      await navigator.clipboard.writeText(c.verifyCode);
      toast.success("Đã sao chép mã xác minh");
    } catch {
      toast.error("Không sao chép được — bạn chép tay mã bên cạnh nhé.");
    }
  };

  const download = (c: Certificate) => {
    toast.info("Đang phơi bản in... (demo)");
    window.setTimeout(() => toast.success(`Đã tải ${c.code}.pdf (mô phỏng)`), 800);
  };

  /* In / Lưu PDF: ưu tiên window.print (in đúng .print-sheet trong hộp thoại),
   * nếu trình duyệt không hỗ trợ thì rơi về nhánh toast demo. */
  const printCert = (c: Certificate) => {
    if (typeof window.print === "function") {
      window.print();
      return;
    }
    download(c);
  };

  const certs = data ?? [];

  return (
    <div className={cn(preview && "no-print")}>
      <PageHeading
        eyebrow="Năng lực & kết quả"
        title="Chứng nhận"
        sub="Bằng hoàn thành kỳ thực tập — tải bản PDF, chia sẻ mã xác minh để ai cũng kiểm tra được."
        margin="mỗi chứng nhận có mã xác minh công khai — ai cũng kiểm tra được"
      />

      {/* Điều kiện cấp chứng nhận */}
      <SketchCard hover={false} className="mb-6 p-5">
        <div ref={conditionsRef} tabIndex={-1} className="scroll-mt-24 outline-none">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--note-yellow)] text-[var(--note-yellow-ink)]">
              <VAward size={17} />
            </span>
            <div>
              <h2 className="text-base font-extrabold">Điều kiện cấp chứng nhận</h2>
              <p className="text-[0.75rem] text-[var(--ink-soft)]">
                Ba điều kiện dưới đây được kiểm tra tự động khi kỳ thực tập khép lại.
              </p>
            </div>
          </div>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-3">
            {CONDITIONS.map((cond) => (
              <li
                key={cond}
                className="flex items-start gap-2.5 rounded-[10px_12px_10px_12px] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_28%,transparent)] bg-[var(--paper)] p-3"
              >
                <CheckDoodle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--royal)]" />
                <span className="text-[0.8rem] font-semibold leading-snug">{cond}</span>
              </li>
            ))}
          </ul>
        </div>
      </SketchCard>

      {loading && <LoadingPanel rows={2} label="Đang mở hộp chứng nhận..." />}

      {!loading && error && <ErrorPanel message={error} onRetry={reload} />}

      {!loading && !error && certs.length === 0 && (
        <SketchCard hover={false} className="p-4">
          <EmptyFigure
            image="/images/empty-states/open-notebook.png"
            alt="Cuốn sổ mở sẵn trang trống"
            title="Chứng nhận xuất hiện ở đây sau khi bạn hoàn thành kỳ thực tập"
          >
            <MarginNote className="mt-1 max-w-sm">
              mỗi trang sổ hoàn thành là một con dấu
            </MarginNote>
            <InkButton variant="outline" size="sm" className="mt-3" onClick={scrollToConditions}>
              Xem điều kiện cấp
            </InkButton>
          </EmptyFigure>
        </SketchCard>
      )}

      {!loading && !error && certs.length > 0 && (
        <Stagger className="grid gap-5 md:grid-cols-2">
          {certs.map((c) => (
            <CertCard
              key={c.id}
              c={c}
              onCopy={copyVerify}
              onDownload={download}
              onPreview={setPreview}
            />
          ))}
        </Stagger>
      )}

      {/* Xem trước bản in */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent
          aria-describedby={undefined}
          className="max-w-lg border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-ink-6 sm:p-6 print:static print:max-w-none print:w-full print:translate-x-0 print:translate-y-0 print:shadow-none print:bg-transparent print:border-0 print:p-0 print:rounded-none"
        >
          <DialogHeader className="no-print text-left">
            <DialogTitle className="font-hand text-xl">
              Xem trước bản in — {preview?.code}
            </DialogTitle>
            <p className="text-[0.72rem] text-[var(--ink-soft)]">
              Bấm “In / Lưu PDF” — bản in chỉ chứa tờ chứng nhận bên dưới.
            </p>
          </DialogHeader>
          {preview && (
            <div className="max-h-[65vh] overflow-y-auto pr-1 print:max-h-none print:overflow-visible print:p-0">
              <div className="print-sheet rotate-[-0.5deg] border-[6px] border-double border-[#17171c] bg-white px-5 py-7 text-center text-[#17171c] sm:px-8">
                <p className="font-geist-mono text-[0.62rem] font-bold uppercase tracking-[0.3em]">
                  V-Intern · Sổ tay hành trình
                </p>
                <h3 className="mt-3 text-2xl font-bold leading-tight tracking-[0.3em] sm:text-3xl">
                  CHỨNG NHẬN
                  <br />
                  HOÀN THÀNH
                </h3>
                <div className="mx-auto mt-3 w-24 border-t-2 border-dashed border-[#17171c]" />
                <p className="mt-4 text-[0.8rem] text-[#5a5a64]">Chứng nhận cho</p>
                <p className="mt-1 text-2xl font-extrabold">
                  {user?.name ?? "Sinh viên V-Intern"}
                </p>
                <p className="mt-2 text-[0.8rem] leading-relaxed text-[#5a5a64]">
                  đã hoàn thành xuất sắc kỳ thực tập thuộc dự án
                </p>
                <p className="mt-1.5 text-[0.95rem] font-bold leading-snug">{preview.project}</p>
                <p className="mt-1 text-[0.8rem]">{preview.session}</p>
                <p className="mt-3 text-[0.8rem] text-[#5a5a64]">
                  Cấp ngày{" "}
                  <b className="tabular text-[#17171c]">{formatDateVN(preview.issuedAt)}</b>
                </p>
                <div className="mt-6 flex items-center justify-center gap-6">
                  <span className="grid size-16 place-items-center rounded-full border-[3px] border-double border-[#c0272d] text-[#c0272d]">
                    <VCertificate size={28} />
                  </span>
                  <span className="rotate-[-10deg]">
                    <StampMoc tone="red" rotate={-10} className="!text-[0.66rem]">
                      V-INTERN
                    </StampMoc>
                  </span>
                </div>
                <p className="mt-6 text-[0.68rem] text-[#5a5a64]">Mã xác minh công khai</p>
                <code className="mt-1 inline-block rounded-md border-2 border-dashed border-[#17171c] px-3 py-1 font-geist-mono text-sm font-bold tracking-wider">
                  {preview.verifyCode}
                </code>
                <p className="mt-4 text-[0.62rem] text-[#9c9ca6]">
                  Bản demo — mọi con dấu đều đóng bằng cả trái tim ✎
                </p>
              </div>
            </div>
          )}
          {preview && (
            <div className="no-print mt-4 flex flex-wrap justify-end gap-2.5">
              <InkButton variant="ghost" size="sm" onClick={() => setPreview(null)}>
                <VX size={14} /> Đóng
              </InkButton>
              <InkButton variant="outline" size="sm" onClick={() => download(preview)}>
                <VDownload size={15} /> Tải PDF (demo)
              </InkButton>
              <InkButton variant="royal" size="sm" onClick={() => printCert(preview)}>
                <VExternal size={15} /> In / Lưu PDF
              </InkButton>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
