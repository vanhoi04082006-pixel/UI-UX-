import { NextRequest, NextResponse } from "next/server";

/* =====================================================================
 * API PROXY — forward same-origin /api/v1/* sang BE thật (API_PROXY_TARGET).
 *
 * Tại sao tồn tại (chẩn đoán QA tunnel ngrok 2026-11-21):
 *  1. BE CORS allowHeaders chỉ có "Content-Type,Authorization" — thiếu
 *     "ngrok-skip-browser-warning" → mọi fetch cross-origin kèm header
 *     này bị preflight từ chối.
 *  2. ngrok free-tier chèn interstitial HTML vào GET request mang
 *     User-Agent browser khi không có skip header / bypass cookie →
 *     user mới gọi GET đầu tiên nhận HTML thay JSON.
 *  3. Rewrite của next.config forward nguyên browser UA → vẫn dính
 *     interstitial; route handler này chủ động dựng header tối thiểu
 *     (không User-Agent) + skip header → BE nhận request sạch.
 *  4. Refresh cookie của BE có Path=/api/v1/auth — khớp đúng source
 *     path /api/v1/auth/refresh nên cookie flow hoạt động nguyên vẹn.
 *
 * Trả lỗi đúng shape {message, code} của BE để api-client.errorMessage()
 * dịch thông điệp quen thuộc; BE offline → 502 NETWORK_ERROR.
 *
 * Khi BE bổ sung "ngrok-skip-browser-warning" vào CORS allowHeaders,
 * có thể quay lại direct mode: NEXT_PUBLIC_API_BASE_URL=<URL đầy đủ>,
 * bỏ API_PROXY_TARGET — route này khi đó không được khớp nữa.
 * ===================================================================== */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function proxyTarget(): string {
  return (process.env.API_PROXY_TARGET ?? "").trim().replace(/\/+$/, "");
}

function errorBody(message: string, code: string) {
  return NextResponse.json({ message, code }, { status: 502 });
}

type Ctx = { params: Promise<{ path?: string[] }> };

async function forward(request: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const target = proxyTarget();
  if (!target) {
    return NextResponse.json(
      { message: "API_PROXY_TARGET chưa được cấu hình.", code: "API_CONFIG_MISSING" },
      { status: 500 },
    );
  }
  const { path } = await ctx.params;
  const search = new URL(request.url).search;
  const upstreamUrl = `${target}/${(path ?? []).join("/")}${search}`;

  /* Header tối thiểu — cố ý KHÔNG forward User-Agent/Accept/Origin/Sec-*
   * để ngrok không coi đây là browser request (tránh interstitial). */
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const authorization = request.headers.get("authorization");
  if (authorization) headers.set("authorization", authorization);
  /* Cookie phiên (vintern_refresh) — browser tự gửi same-origin theo Path. */
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  headers.set("ngrok-skip-browser-warning", "true");

  /* Body passthrough nguyên vẹn: JSON, multipart (upload CV), binary. */
  let body: ArrayBuffer | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      ...(body && body.byteLength > 0 ? { body } : {}),
      signal: request.signal,
      cache: "no-store",
      redirect: "manual",
    });
  } catch (error) {
    if (request.signal.aborted) return new NextResponse(null, { status: 499 });
    return errorBody(
      "Không thể kết nối đến hệ thống. Vui lòng kiểm tra kết nối và thử lại.",
      "NETWORK_ERROR",
    );
  }

  /* Response: giữ content-type (JSON/PDF/XLSX/octet-stream), content-disposition
   * (tải file) và forward từng Set-Cookie (refresh token rotate). */
  const resHeaders = new Headers();
  const resContentType = upstream.headers.get("content-type");
  if (resContentType) resHeaders.set("content-type", resContentType);
  const disposition = upstream.headers.get("content-disposition");
  if (disposition) resHeaders.set("content-disposition", disposition);
  const setCookies = upstream.headers.getSetCookie?.() ?? [];
  for (const c of setCookies) resHeaders.append("set-cookie", c);

  const buffer = await upstream.arrayBuffer();
  return new NextResponse(buffer, { status: upstream.status, headers: resHeaders });
}

export async function GET(request: NextRequest, ctx: Ctx) {
  return forward(request, ctx);
}
export async function POST(request: NextRequest, ctx: Ctx) {
  return forward(request, ctx);
}
export async function PUT(request: NextRequest, ctx: Ctx) {
  return forward(request, ctx);
}
export async function PATCH(request: NextRequest, ctx: Ctx) {
  return forward(request, ctx);
}
export async function DELETE(request: NextRequest, ctx: Ctx) {
  return forward(request, ctx);
}
