"use client";

/* =====================================================================
 * STUDENT GITHUB — "Liên kết GitHub" (intern, route "github").
 * Endpoint BE cover:
 *  · GET    /github/me                     — trạng thái liên kết cá nhân
 *  · POST   /github/connect                — nhận authorizeUrl → chuyển hướng OAuth
 *  · DELETE /github/me                     — ngắt liên kết (confirm)
 *  · GET    /github/me/repository-access   — {items, summary, limit} quyền truy cập repo
 *  · GET    /github/repository-account     — tài khoản repo dùng chung (403 → thông báo)
 *  · POST   /github/repository-account     — chọn tài khoản repo dùng chung
 * ===================================================================== */

import { useState } from "react";
import { toast } from "sonner";
import {
  connectGithub,
  disconnectGithub,
  getGithubStatus,
  getRepositoryAccess,
  getRepositoryAccount,
  selectRepositoryAccount,
  type GithubStatus,
  type RepoAccessView,
} from "@/lib/api/github";
import { errorMessage } from "@/lib/api/api-client";
import { useApi } from "@/lib/use-api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  InkBadge,
  MarginNote,
  NoteCard,
  SketchCard,
  Tape,
  formatDateTimeVN,
} from "@/components/notebook/ui";
import { InkButton } from "@/components/notebook/reveal";
import {
  VAlert,
  VCheck,
  VGithub,
  VKey,
  VLink,
  VLock,
  VPlug,
  VRefresh,
  VServer,
  VShield,
  VFolderOpen,
} from "@/components/icons/v-icons";
import { EmptyFigure, ErrorPanel, LoadingPanel, PageHeading } from "@/components/student/nb-kit-5c2";

/* ------------------------------ meta hiển thị ------------------------------ */

const PERMISSION_TONE: Record<string, string> = {
  admin: "red",
  maintain: "amber",
  write: "blue",
  triage: "amber",
  read: "neutral",
};

function permissionBadge(permission: string): { tone: string; label: string } {
  const key = permission.toLowerCase();
  return {
    tone: PERMISSION_TONE[key] ?? "neutral",
    label:
      key === "admin"
        ? "Admin"
        : key === "maintain"
          ? "Bảo trì"
          : key === "write"
            ? "Ghi"
            : key === "triage"
              ? "Sắp xếp"
              : key === "read"
                ? "Đọc"
                : permission,
  };
}

/* --------------------------- card trạng thái --------------------------- */

function StatusCard({
  status,
  busy,
  onConnect,
  onDisconnect,
}: {
  status: GithubStatus;
  busy: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  if (status.connected) {
    return (
      <SketchCard as="section" className="relative p-5 pt-8">
        <Tape variant="mint" rotate={-4} className="-top-2.5 left-8 !h-5 !w-24" />
        <div className="flex flex-wrap items-start gap-4">
          <span
            className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--note-mint)] text-[var(--note-mint-ink)]"
            aria-hidden="true"
          >
            <VGithub size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-extrabold">Đã liên kết GitHub</h2>
              <InkBadge tone="green" dot>
                Kết nối tốt
              </InkBadge>
              {status.canCreatePublicRepo && (
                <InkBadge tone="blue">
                  <VCheck size={12} /> Tạo được repo public
                </InkBadge>
              )}
            </div>
            <dl className="mt-2.5 space-y-1 text-[0.82rem]">
              <div className="flex gap-2">
                <dt className="w-28 shrink-0 font-semibold text-[var(--ink-soft)]">Tài khoản</dt>
                <dd className="font-geist-mono font-bold">{status.login ? `@${status.login}` : "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-28 shrink-0 font-semibold text-[var(--ink-soft)]">GitHub ID</dt>
                <dd className="font-geist-mono tabular">{status.githubUserId ?? "—"}</dd>
              </div>
            </dl>
            <p className="mt-2 text-[0.78rem] leading-relaxed text-[var(--ink-soft)]">
              Giảng viên có thể mời bạn vào repo bài nộp của phiên — kiểm tra mục
              <b> Quyền truy cập repo</b> bên dưới.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <InkButton variant="outline" size="sm" onClick={onDisconnect} disabled={busy}>
              <VLock size={15} /> Ngắt kết nối
            </InkButton>
          </div>
        </div>
      </SketchCard>
    );
  }

  /* Chưa kết nối — hướng dẫn + nút kết nối. */
  return (
    <SketchCard as="section" className="relative p-5 pt-8">
      <Tape variant="blue" rotate={-5} className="-top-2.5 left-8 !h-5 !w-24" />
      <div className="flex flex-wrap items-start gap-4">
        <span
          className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--blue-mist)] text-[var(--royal)]"
          aria-hidden="true"
        >
          <VGithub size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-extrabold">Chưa liên kết GitHub</h2>
            {status.configured ? (
              <InkBadge tone="amber" dot>
                Sẵn sàng kết nối
              </InkBadge>
            ) : (
              <InkBadge tone="red" dot>
                Hệ thống chưa cấu hình OAuth
              </InkBadge>
            )}
          </div>
          <p className="mt-2 text-[0.82rem] leading-relaxed text-[var(--ink-soft)]">
            Liên kết tài khoản GitHub để nhận quyền truy cập repo bài nộp và ghi nhận hoạt động
            commit của bạn trong phiên thực tập.
          </p>
          <ol className="mt-3 grid gap-2 sm:grid-cols-3">
            {[
              { icon: VKey, text: "Bấm “Kết nối GitHub”" },
              { icon: VGithub, text: "Đăng nhập & cấp quyền trên GitHub" },
              { icon: VCheck, text: "Quay lại đây — trạng thái chuyển xanh" },
            ].map((step, i) => (
              <li
                key={step.text}
                className="sketch-border-thin flex items-start gap-2 rounded-[10px_12px_10px_12px] bg-[var(--paper)] p-3"
              >
                <span className="font-geist-mono mt-0.5 text-[0.7rem] font-bold text-[var(--ink-faint)]">
                  {i + 1}.
                </span>
                <step.icon size={15} className="mt-0.5 shrink-0 text-[var(--royal)]" aria-hidden="true" />
                <span className="text-[0.78rem] font-semibold leading-snug">{step.text}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <InkButton variant="royal" size="md" onClick={onConnect} disabled={busy || !status.configured}>
            {busy ? <span className="spinner-ink" aria-hidden="true" /> : <VLink size={16} />} Kết nối GitHub
          </InkButton>
        </div>
      </div>
      {!status.configured && (
        <p className="mt-3 flex items-start gap-2 rounded-[10px] bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] px-3 py-2 text-[0.78rem] font-semibold leading-snug text-[var(--warning)]">
          <VAlert size={15} className="mt-0.5 shrink-0" />
          Máy chủ chưa cấu hình GitHub OAuth — hãy quay lại sau hoặc liên hệ quản trị viên.
        </p>
      )}
    </SketchCard>
  );
}

/* --------------------------- bảng quyền truy cập --------------------------- */

function AccessTable({ view }: { view: RepoAccessView }) {
  return (
    <SketchCard as="section" hover={false} className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--royal)]">
            <VFolderOpen size={17} />
          </span>
          <div>
            <h2 className="text-base font-extrabold">Quyền truy cập repo</h2>
            <p className="text-[0.75rem] text-[var(--ink-soft)]">
              Các kho bài nộp bạn được cấp quyền — tối đa {view.limit.toLocaleString("vi-VN")} repo.
            </p>
          </div>
        </div>
        {view.summary.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {view.summary.map((row) => (
              <InkBadge key={row.label} tone={permissionBadge(row.label).tone}>
                {permissionBadge(row.label).label} · {row.count.toLocaleString("vi-VN")}
              </InkBadge>
            ))}
          </div>
        )}
      </div>

      {view.items.length === 0 ? (
        <div className="mt-2">
          <EmptyFigure
            image="/images/empty-states/open-notebook.png"
            alt="Trang sổ mở trống — chưa có repo nào được cấp quyền"
            title="Chưa có repo nào được cấp quyền cho bạn"
          >
            <MarginNote className="mt-1 max-w-sm">
              khi giảng viên mở phiên và mời bạn vào repo, danh sách xuất hiện tại đây
            </MarginNote>
          </EmptyFigure>
        </div>
      ) : (
        <>
          {/* Bảng (md trở lên) */}
          <div className="mt-4 hidden overflow-hidden rounded-[10px] md:block">
            <table className="w-full border-collapse text-left text-[0.82rem]">
              <thead>
                <tr className="border-b-2 border-dashed border-[color-mix(in_srgb,var(--ink)_35%,transparent)] text-[0.7rem] uppercase tracking-wide text-[var(--ink-soft)]">
                  <th scope="col" className="px-3 py-2 font-bold">Repo</th>
                  <th scope="col" className="px-3 py-2 font-bold">Quyền</th>
                  <th scope="col" className="px-3 py-2 font-bold">Phiên</th>
                  <th scope="col" className="px-3 py-2 font-bold">Cấp lúc</th>
                  <th scope="col" className="px-3 py-2 font-bold">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {view.items.map((item) => {
                  const badge = permissionBadge(item.permission);
                  return (
                    <tr
                      key={item.id ?? item.repoName}
                      className="border-b border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)] last:border-0"
                    >
                      <td className="px-3 py-2.5">
                        <span className="font-geist-mono font-bold">{item.repoName}</span>
                        {item.ownerLogin && (
                          <span className="ml-1.5 text-[0.72rem] text-[var(--ink-soft)]">
                            @{item.ownerLogin}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <InkBadge tone={badge.tone}>{badge.label}</InkBadge>
                      </td>
                      <td className="px-3 py-2.5">{item.sessionName ?? item.sessionCode ?? "—"}</td>
                      <td className="tabular px-3 py-2.5 text-[var(--ink-soft)]">
                        {item.grantedAt ? formatDateTimeVN(item.grantedAt) : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        {item.status ? (
                          <InkBadge tone={item.status === "active" || item.status === "ready" ? "green" : "neutral"}>
                            {item.status}
                          </InkBadge>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Thẻ xếp dọc (mobile) */}
          <ul className="mt-4 space-y-2.5 md:hidden">
            {view.items.map((item) => {
              const badge = permissionBadge(item.permission);
              return (
                <li
                  key={item.id ?? item.repoName}
                  className="sketch-border-thin bg-[var(--paper-raised)] p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-geist-mono min-w-0 truncate text-[0.82rem] font-bold">{item.repoName}</p>
                    <InkBadge tone={badge.tone} className="shrink-0">
                      {badge.label}
                    </InkBadge>
                  </div>
                  <p className="mt-1 text-[0.72rem] text-[var(--ink-soft)]">
                    {item.sessionName ?? item.sessionCode ?? "Phiên thực tập"}
                    {item.grantedAt ? ` · ${formatDateTimeVN(item.grantedAt)}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </SketchCard>
  );
}

/* ------------------------------ màn hình ------------------------------ */

export default function StudentGithub() {
  const statusQ = useApi<GithubStatus>(() => getGithubStatus(), []);
  const accessQ = useApi<RepoAccessView>(() => getRepositoryAccess(), []);
  const accountQ = useApi(() => getRepositoryAccount(), []);

  const [busy, setBusy] = useState<"connect" | "disconnect" | "account" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

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
      accessQ.reload();
      accountQ.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const selectAccount = async () => {
    setBusy("account");
    try {
      await selectRepositoryAccount();
      toast.success("Đã chọn tài khoản repo dùng chung");
      accountQ.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const status = statusQ.data;
  const accountDenied =
    accountQ.error != null && /quyền|permission/i.test(accountQ.error);

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="KHÔNG GIAN LÀM VIỆC · TÍCH HỢP GIT"
        title="Liên kết GitHub"
        sub="Kết nối tài khoản GitHub để nhận repo bài nộp của phiên và ghi nhận hoạt động commit — OAuth scope chỉ cần read:user."
        margin="sinh viên chỉ cần read:user — không cấp quyền ghi gì thêm"
      />

      {/* Trạng thái kết nối */}
      {statusQ.loading && <LoadingPanel rows={1} label="Đang kiểm tra liên kết GitHub..." />}
      {!statusQ.loading && statusQ.error && (
        <ErrorPanel message={statusQ.error} onRetry={statusQ.reload} />
      )}
      {!statusQ.loading && !statusQ.error && status && (
        <>
          {status.reconnectRequired && (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[12px_15px_13px_14px] border-2 border-dashed border-[color-mix(in_srgb,var(--warning)_55%,transparent)] bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] p-3.5"
            >
              <InkBadge tone="amber" dot>
                Cần kết nối lại
              </InkBadge>
              <p className="min-w-0 flex-1 text-[0.82rem] font-semibold leading-relaxed text-[var(--ink-soft)]">
                <VAlert size={14} className="mr-1 -mt-0.5 inline" aria-hidden="true" />
                Token cũ đã hết hiệu lực — ngắt rồi kết nối lại để tiếp tục nhận quyền repo.
              </p>
              <InkButton variant="outline" size="sm" onClick={connect} disabled={busy === "connect"}>
                <VRefresh size={14} /> Kết nối lại
              </InkButton>
            </div>
          )}
          <StatusCard
            status={status}
            busy={busy !== null}
            onConnect={connect}
            onDisconnect={() => setConfirmOpen(true)}
          />
        </>
      )}

      {/* Quyền truy cập repo */}
      {accessQ.loading && <LoadingPanel rows={1} label="Đang mở sổ quyền truy cập..." />}
      {!accessQ.loading && accessQ.error && (
        <ErrorPanel message={accessQ.error} onRetry={accessQ.reload} />
      )}
      {!accessQ.loading && !accessQ.error && accessQ.data && <AccessTable view={accessQ.data} />}

      {/* Tài khoản repo dùng chung (admin scope) */}
      <section aria-label="Tài khoản repo dùng chung" className="sketch-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper-raised)] text-[var(--ink-soft)]">
              <VServer size={17} />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold">Tài khoản repo dùng chung</h2>
              <p className="mt-0.5 text-[0.75rem] leading-relaxed text-[var(--ink-soft)]">
                Tài khoản CI tổ chức dùng để tạo kho bài nộp cho phiên — thường do quản trị viên
                quản lý.
              </p>
              {accountQ.loading && (
                <p className="mt-2 text-[0.78rem] font-semibold text-[var(--ink-soft)]">
                  Đang tải trạng thái tài khoản…
                </p>
              )}
              {accountQ.error && (
                <p className="mt-2 flex items-start gap-2 text-[0.78rem] font-semibold leading-snug text-[var(--ink-soft)]">
                  <VShield size={15} className="mt-0.5 shrink-0" />
                  {accountDenied
                    ? "Bạn không có quyền xem cấu hình này — chỉ quản trị viên thao tác."
                    : accountQ.error}
                </p>
              )}
              {accountQ.data && accountQ.data.login && (
                <p className="font-geist-mono mt-2 text-[0.82rem] font-bold">
                  @{accountQ.data.login}
                  {accountQ.data.connected === false && (
                    <InkBadge tone="amber" className="ml-2">
                      Chưa kết nối
                    </InkBadge>
                  )}
                </p>
              )}
            </div>
          </div>
          <InkButton variant="outline" size="sm" onClick={selectAccount} disabled={busy !== null}>
            <VPlug size={15} /> Chọn tài khoản
          </InkButton>
        </div>
      </section>

      {/* Ghi chú scope OAuth */}
      <div className="grid gap-4 md:grid-cols-2">
        <NoteCard title="Về quyền OAuth" tone="mint" tapeVariant="mint" rotate={-0.8}>
          Hệ thống chỉ yêu cầu scope <b>read:user</b> — dùng để xác minh danh tính GitHub của bạn.
          Mọi quyền vào repo bài nộp được mời riêng theo từng phiên, không qua OAuth.
        </NoteCard>
        <NoteCard title="Bao giờ cần liên kết?" tone="yellow" rotate={0.6}>
          Nộp bài qua Pull Request cần GitHub đã liên kết (<b>GITHUB_IDENTITY_REQUIRED</b>). Nên
          kết nối ngay khi được phân công dự án để không lỡ hạn nộp.
        </NoteCard>
      </div>

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
            Bạn sẽ mất quyền ghi nhận commit và cần kết nối lại trước khi nộp bài qua Pull Request.
            Quyền repo cũ có thể được cấp lại khi kết nối mới.
          </p>
          <div className="mt-4 flex flex-wrap justify-end gap-2.5">
            <InkButton variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>
              Giữ nguyên
            </InkButton>
            <InkButton variant="outline" size="sm" onClick={disconnect} disabled={busy === "disconnect"}>
              <VLock size={15} /> Ngắt kết nối
            </InkButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
