import type { NextConfig } from "next";

/* Proxy target cho BE thật (đọc từ .env — biến SERVER-side, không public).
 * Khi có giá trị: route handler src/app/api/v1/[...path]/route.ts forward
 * mọi request same-origin /api/v1/* sang BE. KHÔNG dùng rewrites cho việc
 * này vì rewrite forward nguyên User-Agent của browser → ngrok free-tier
 * chèn interstitial HTML vào GET. Proxy bằng route handler giải quyết trọn
 * gói 3 rào cản của direct mode:
 *  1. BE CORS allowHeaders thiếu "ngrok-skip-browser-warning" (preflight fail).
 *  2. ngrok interstitial HTML cho GET từ browser (user mới chưa cookie).
 *  3. Refresh cookie Path=/api/v1/auth khớp đúng source path qua proxy.
 * Khi BE bổ sung header trên vào CORS allowHeaders → quay lại direct:
 *  đặt NEXT_PUBLIC_API_BASE_URL=<URL đầy đủ> và bỏ API_PROXY_TARGET. */

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async rewrites() {
    /* BE redirect sau OAuth GitHub về path-based URL:
     *   /admin/settings?github=connected · /instructor/github?connected=1
     *   /intern/github?connected=1
     * FE là SPA hash-routing một route "/" — rewrite các path này về "/"
     * để hydrate() đọc query param rồi đưa đúng màn GitHub theo role. */
    return [
      { source: "/admin/settings", destination: "/" },
      { source: "/instructor/github", destination: "/" },
      { source: "/intern/github", destination: "/" },
    ];
  },
};

export default nextConfig;
