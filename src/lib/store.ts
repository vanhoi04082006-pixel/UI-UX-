"use client";

import { create } from "zustand";
import type { Role, SessionUser } from "@/lib/types";

/* =====================================================================
 * V-INTERN STORE — bộ máy điều hướng ảo (SPA một route "/").
 * view: landing → auth → app; route là "đường dẫn ảo" theo vai trò.
 * Bổ sung view công khai: apply (ứng tuyển) + verify (tra cứu chứng chỉ).
 *
 * Bản nâng cấp v2:
 *  · Session persistence — localStorage "v-intern-session" (chỉ client,
 *    hydrate() gọi sau mount nên không lệch hydration).
 *  · Hash routing — #/landing · #/auth · #/apply · #/verify · #/{role}/{route};
 *    nút Back/Forward của trình duyệt hoạt động, chia sẻ được đường dẫn sâu.
 * ===================================================================== */

export type AppView = "landing" | "auth" | "app" | "apply" | "verify";

const SESSION_KEY = "v-intern-session";

export const NAV_CONFIG: Record<
  Role,
  { groups: { label: string; items: { key: string; label: string; badge?: string }[] }[] }
> = {
  intern: {
    groups: [
      {
        label: "Không gian làm việc",
        items: [
          { key: "overview", label: "Tổng quan" },
          { key: "work", label: "Công việc của tôi" },
          { key: "sprint", label: "Sprint Board" },
          { key: "mentor", label: "AI Mentor" },
          { key: "github", label: "GitHub" },
        ],
      },
      {
        label: "Tuyển dụng",
        items: [{ key: "recruitment", label: "Phỏng vấn AI" }],
      },
      {
        label: "Năng lực & kết quả",
        items: [
          { key: "evaluations", label: "Đánh giá" },
          { key: "kpi", label: "KPI & Lương ảo" },
          { key: "certificates", label: "Chứng nhận" },
          { key: "performance", label: "Năng lực & Khuyến nghị" },
        ],
      },
      {
        label: "Tài khoản",
        items: [
          { key: "notifications", label: "Thông báo" },
          { key: "profile", label: "Hồ sơ" },
        ],
      },
    ],
  },
  instructor: {
    groups: [
      {
        label: "Tổ chức thực tập",
        items: [
          { key: "overview", label: "Tổng quan" },
          { key: "sessions", label: "Phiên thực tập" },
          { key: "operations", label: "Điều phối phiên" },
          { key: "sprints", label: "Sprint & Task" },
          { key: "projects", label: "Dự án & Mẫu" },
        ],
      },
      {
        label: "Theo dõi & đánh giá",
        items: [
          { key: "grading", label: "Chấm bài" },
          { key: "evaluations", label: "Chu kỳ đánh giá" },
          { key: "performance", label: "Hiệu suất SV" },
          { key: "reports", label: "Báo cáo" },
        ],
      },
      {
        label: "Trợ lý AI",
        items: [{ key: "ai-plan", label: "Lập kế hoạch AI" }],
      },
      {
        label: "Cá nhân",
        items: [
          { key: "notifications", label: "Thông báo" },
          { key: "profile", label: "Hồ sơ" },
        ],
      },
    ],
  },
  admin: {
    groups: [
      {
        label: "Vận hành",
        items: [
          { key: "overview", label: "Tổng quan" },
          { key: "users", label: "Người dùng" },
          { key: "groups", label: "Nhóm & Phân quyền" },
          { key: "recruitment", label: "Vòng tuyển dụng" },
          { key: "audit", label: "Nhật ký hệ thống" },
        ],
      },
      {
        label: "Học tập",
        items: [
          { key: "questions", label: "Ngân hàng câu hỏi" },
          { key: "templates", label: "Mẫu dự án" },
          { key: "projects", label: "Dự án đang chạy" },
          { key: "cycles", label: "Chu kỳ đánh giá" },
          { key: "kpi", label: "KPI & Lương ảo" },
          { key: "knowledge", label: "Thư viện kiến thức" },
          { key: "catalogs", label: "Danh mục & Nghề nghiệp" },
          { key: "certificates", label: "Chứng nhận" },
        ],
      },
      {
        label: "Hệ thống",
        items: [{ key: "system", label: "Vận hành & Cấu hình" }],
      },
      {
        label: "Cá nhân",
        items: [
          { key: "notifications", label: "Thông báo" },
          { key: "profile", label: "Hồ sơ" },
        ],
      },
    ],
  },
};

export function routeLabel(role: Role, key: string): string {
  for (const group of NAV_CONFIG[role].groups) {
    const item = group.items.find((i) => i.key === key);
    if (item) return item.label;
  }
  return key;
}

/** Mọi route hợp lệ của một vai trò (flattened). */
export function routesOf(role: Role): string[] {
  return NAV_CONFIG[role].groups.flatMap((g) => g.items.map((i) => i.key));
}

/** Chuyển tab trái/phải nhanh (giữ trong group hiện tại). */
export function canNavigate(role: Role, key: string) {
  return NAV_CONFIG[role].groups.some((g) => g.items.some((i) => i.key === key));
}

/* ----------------------------- hash helpers ----------------------------- */

const roleFromHash = (h: string): Role | null =>
  h.startsWith("intern/") ? "intern" : h.startsWith("instructor/") ? "instructor" : h.startsWith("admin/") ? "admin" : null;

/** Đọc hash → trạng thái (dùng cho hydrate + sự kiện popstate/hashchange). */
function parseHash(): { view: AppView; route: string } | null {
  if (typeof window === "undefined") return null;
  const raw = window.location.hash.replace(/^#\/?/, "").replace(/\/$/, "");
  if (!raw) return null;
  if (raw === "landing") return { view: "landing", route: "overview" };
  if (raw === "auth") return { view: "auth", route: "overview" };
  if (raw === "apply") return { view: "apply", route: "overview" };
  if (raw === "verify") return { view: "verify", route: "overview" };
  // #/{role}/{route} — user được lấy từ localStorage ở caller
  const role = roleFromHash(raw);
  if (role) {
    const route = raw.split("/")[1] || "overview";
    return { view: "app", route };
  }
  return null;
}

function buildHash(view: AppView, user: SessionUser | null, route: string): string {
  if (view === "app" && user) return `#/${user.role}/${route}`;
  if (view === "auth") return "#/auth";
  if (view === "apply") return "#/apply";
  if (view === "verify") return "#/verify";
  return "#/landing";
}

interface AppState {
  view: AppView;
  user: SessionUser | null;
  route: string;
  sidebarOpen: boolean;
  /** Khởi động lại phiên từ localStorage + hash (chỉ gọi 1 lần sau mount). */
  hydrate: () => void;
  /** Vào màn đăng nhập */
  enterAuth: () => void;
  /** Về trang chủ công khai */
  goLanding: () => void;
  /** Cổng ứng tuyển công khai (giữ nguyên phiên nếu đã đăng nhập). */
  goApply: () => void;
  /** Trang tra cứu chứng chỉ công khai. */
  goVerify: () => void;
  /** Đăng nhập thành công */
  login: (user: SessionUser) => void;
  logout: () => void;
  /** Điều hướng trong workspace */
  navigate: (route: string) => void;
  setSidebarOpen: (open: boolean) => void;
}

/* Cờ giữ trạng thái nội bộ (không phản ánh vào store để tránh render thừa). */
let hydrated = false;
let suppressHash = false;

export const useApp = create<AppState>((set, get) => ({
  view: "landing",
  user: null,
  route: "overview",
  sidebarOpen: false,

  hydrate: () => {
    if (hydrated) return;
    hydrated = true;
    if (typeof window === "undefined") return;
    let user: SessionUser | null = null;
    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SessionUser;
        if (parsed && typeof parsed.email === "string") user = parsed;
      }
    } catch {
      user = null;
    }
    const hash = parseHash();
    if (user) {
      const h = hash?.view === "app" ? hash : null;
      const route = h && canNavigate(user.role, h.route) ? h.route : "overview";
      if (hash?.view === "apply" || hash?.view === "verify") {
        set({ view: hash.view, user, route: "overview" });
      } else {
        set({ view: "app", user, route });
      }
    } else if (hash?.view === "auth") {
      set({ view: "auth" });
    } else if (hash?.view === "apply" || hash?.view === "verify") {
      set({ view: hash.view });
    } else {
      set({ view: "landing" });
    }
    // Lắng nghe Back/Forward + hashchange của trình duyệt (hash đổi không
    // qua popstate ở một số trường hợp navigate cùng trang).
    const syncHash = () => {
      const state = get();
      const p = parseHash();
      if (!p) return;
      suppressHash = true;
      if (p.view === "apply" || p.view === "verify") {
        /* View công khai — giữ nguyên phiên đang đăng nhập. */
        set({ view: p.view, sidebarOpen: false });
      } else if (p.view !== "app" || !state.user) {
        set({ view: p.view, user: null, route: "overview", sidebarOpen: false });
      } else {
        set({
          view: "app",
          route: canNavigate(state.user.role, p.route) ? p.route : "overview",
          sidebarOpen: false,
        });
      }
      window.setTimeout(() => (suppressHash = false), 0);
    };
    window.addEventListener("popstate", syncHash);
    window.addEventListener("hashchange", syncHash);
  },

  enterAuth: () => set({ view: "auth", user: null, route: "overview" }),
  goLanding: () => set({ view: "landing", user: null, route: "overview" }),
  goApply: () => set({ view: "apply", route: "overview", sidebarOpen: false }),
  goVerify: () => set({ view: "verify", route: "overview", sidebarOpen: false }),

  login: (user) => {
    set({ view: "app", user, route: "overview", sidebarOpen: false });
    persistSession(user);
  },

  logout: () => {
    set({ view: "landing", user: null, route: "overview", sidebarOpen: false });
    clearSession();
  },

  navigate: (route) => set({ route, sidebarOpen: false }),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));

/* --------------------------- persistence utils -------------------------- */

function persistSession(user: SessionUser) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {
    /* storage đầy/bị chặn — demo vẫn chạy tiếp */
  }
}

function clearSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* bỏ qua */
  }
}

/* Đồng bộ hash mỗi khi view/user/route đổi (trừ khi đang xử lý popstate). */
if (typeof window !== "undefined") {
  useApp.subscribe((state, prev) => {
    if (
      state.view === prev.view &&
      state.route === prev.route &&
      state.user?.id === prev.user?.id
    )
      return;
    if (!hydrated || suppressHash) return;
    const next = buildHash(state.view, state.user, state.route);
    if (window.location.hash !== next) {
      window.history.pushState({}, "", next);
    }
    if (state.view === "landing" && prev.user) clearSession();
    if (state.user && !prev.user) persistSession(state.user);
  });
}
