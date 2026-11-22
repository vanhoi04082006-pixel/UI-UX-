"use client";

/* =====================================================================
 * STAFF GITHUB — "Liên kết GitHub" (instructor, route "github").
 * BE redirect sau OAuth về /instructor/github?connected=1 — hydrate() đọc
 * param, đưa về màn này và bật cờ githubCallback để toast + reload status.
 * Endpoint BE cover (giống intern — liên kết danh tính cá nhân):
 *  · GET    /github/me                — trạng thái liên kết
 *  · POST   /github/connect           — 201 { authorizeUrl } (OAuth)
 *  · DELETE /github/me                — ngắt liên kết
 * ===================================================================== */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  connectGithub,
  disconnectGithub,
  getGithubStatus,
  type GithubStatus,
} from "@/lib/api/github";
import { errorMessage } from "@/lib/api/api-client";
import { useApi } from "@/lib/use-api";
import { useApp } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InkBadge, SketchCard, Tape } from "@/components/notebook/ui";
import { InkButton } from "@/components/notebook/reveal";
import {
  VCheck,
  VGithub,
  VKey,
  VLink,
  VLock,
  VRefresh,
} from "@/components/icons/v-icons";
import {
  EmptyState,
  PencilLines,
  SectionError,
  StaffPageHeader,
} from "../staff/staff-kit";

/* ------------------------------ màn hình ------------------------------ */

export default function StaffGithub() {
  const githubCallback = useApp((s) => s.githubCallback);
  const clearGithubCallback = useApp((s) => s.clearGithubCallback);

  const statusQ = useApi<GithubStatus>(() => getGithubStatus(), []);
  const [busy, setBusy] = useState<"connect" | "disconnect" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  /* BE redirect về với ?connected=1 → toast + tải lại trạng thái liên kết. */
  useEffect(() => {
    if (!githubCallback) return;
    if (githubCallback === "connected") {
      toast.success("Đã kết nối GitHub — trạng thái được tải lại từ hệ thống.");
      statusQ.reload();
    } else {
      toast.error("Liên kết GitHub chưa thành công — vui lòng thử lại.");
    }
    clearGithubCallback();
  }, [githubCallback, clearGithubCallback]);

  const connect = async () => {
    setBusy("connect");
    try {
      const res = await connectGithub();
      toast.success("Đang chuyển tới GitHub để cấp quyền…");
      window.location.href = res.authorizeUrl;
    } catch (error) {
      toast.error(errorMessage(error));
      setBusy(null);
    }
  };

  const disconnect = async () => {
    setBusy("disconnect");
    setConfirmOpen(false);
    try {
      await disconnectGithub();
      toast.success("Đã ngắt liên kết GitHub");
      statusQ.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const status = statusQ.data;

  return (
    <div className="space-y-5">
      <StaffPageHeader
        eyebrow="CÁ NHÂN · TÍCH HỢP GIT"
        title="Liên kết GitHub"
        note="giảng viên liên kết để đồng bộ repo phiên và hoạt động commit của sinh viên"
      />

      {statusQ.loading && (
        <SketchCard hover={false} className="p-5">
          <p className="mb-3 text-[0.8rem] font-semibold text-[var(--ink-soft)]">
            Đang kiểm tra liên kết GitHub...
          </p>
          <PencilLines rows={2} />
        </SketchCard>
      )}
      {!statusQ.loading && statusQ.error && (
        <SectionError message={statusQ.error} onRetry={statusQ.reload} />
      )}
      {!statusQ.loading && !statusQ.error && status && (
        <SketchCard as="section" hover={false} className="relative p-5 pt-8 sm:p-6 sm:pt-9">
          <Tape variant="candy" rotate={-3} className="-top-2.5 left-8 !h-5 !w-24" />
          <div className="flex flex-wrap items-start gap-4">
            <span
              className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--coal)] text-[var(--chalk)]"
              aria-hidden="true"
            >
              <VGithub size={24} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-extrabold">
                  {status.connected ? "Đã liên kết GitHub" : "Chưa liên kết GitHub"}
                </h2>
                {status.connected ? (
                  <InkBadge tone="green" dot>
                    Kết nối tốt
                  </InkBadge>
                ) : (
                  <InkBadge tone="amber" dot>
                    Chưa kết nối
                  </InkBadge>
                )}
                {status.canCreatePublicRepo && (
                  <InkBadge tone="blue">
                    <VCheck size={12} /> Tạo được repo public
                  </InkBadge>
                )}
              </div>

              {status.connected ? (
                <dl className="mt-2.5 space-y-1 text-[0.82rem]">
                  <div className="flex gap-2">
                    <dt className="w-28 shrink-0 font-semibold text-[var(--ink-soft)]">Tài khoản</dt>
                    <dd className="font-geist-mono min-w-0 break-all font-bold">
                      @{status.login ?? "—"}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-28 shrink-0 font-semibold text-[var(--ink-soft)]">GitHub ID</dt>
                    <dd className="text-[var(--ink-soft)]">{status.githubUserId ?? "—"}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-2 max-w-lg text-[0.82rem] leading-relaxed text-[var(--ink-soft)]">
                  Liên kết tài khoản GitHub để provisioning repo cho phiên thực tập và ghi nhận
                  hoạt động push của sinh viên. OAuth chỉ cần scope{" "}
                  <b>read:user</b> — không cấp quyền ghi gì thêm.
                </p>
              )}

              {status.reconnectRequired && (
                <p
                  role="alert"
                  className="mt-3 rounded-[10px] border-2 border-dashed border-[color-mix(in_srgb,var(--warning)_55%,transparent)] bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] p-3 text-[0.78rem] font-semibold leading-relaxed"
                >
                  Token cũ đã hết hiệu lực — ngắt rồi kết nối lại để provisioning tiếp tục hoạt
                  động.
                </p>
              )}
            </div>

            <div className="flex shrink-0 flex-col gap-2">
              {status.connected ? (
                <InkButton
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmOpen(true)}
                  disabled={busy !== null}
                >
                  <VLock size={15} /> Ngắt liên kết
                </InkButton>
              ) : (
                <InkButton variant="royal" size="sm" onClick={connect} disabled={busy !== null}>
                  {busy === "connect" ? (
                    <VRefresh size={15} className="animate-spin" />
                  ) : (
                    <VLink size={15} />
                  )}
                  Kết nối GitHub
                </InkButton>
              )}
              {status.connected && status.reconnectRequired && (
                <InkButton variant="outline" size="sm" onClick={connect} disabled={busy !== null}>
                  <VRefresh size={14} /> Kết nối lại
                </InkButton>
              )}
            </div>
          </div>
        </SketchCard>
      )}

      {/* Hướng dẫn nhanh khi chưa liên kết */}
      {!statusQ.loading && !statusQ.error && status && !status.connected && (
        <SketchCard hover={false} className="p-5">
          <EmptyState
            icon={VKey}
            title="Ba bước liên kết ✎"
            note="Bấm Kết nối GitHub → đăng nhập & cấp quyền trên GitHub → hệ thống ghi nhận và đưa bạn về lại màn này."
          />
        </SketchCard>
      )}

      {/* Xác nhận ngắt kết nối */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          aria-describedby={undefined}
          className="max-w-sm border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-ink-6"
        >
          <DialogHeader className="text-left">
            <DialogTitle className="font-hand text-xl">Ngắt liên kết GitHub?</DialogTitle>
          </DialogHeader>
          <p className="text-[0.85rem] leading-relaxed text-[var(--ink-soft)]">
            Việc provisioning repo cho phiên mới sẽ tạm dừng cho đến khi bạn kết nối lại. Các repo
            đang hoạt động không bị ảnh hưởng.
          </p>
          <div className="mt-4 flex flex-wrap justify-end gap-2.5">
            <InkButton variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>
              Giữ nguyên
            </InkButton>
            <InkButton
              variant="outline"
              size="sm"
              onClick={disconnect}
              disabled={busy === "disconnect"}
            >
              <VLock size={15} /> Ngắt kết nối
            </InkButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
