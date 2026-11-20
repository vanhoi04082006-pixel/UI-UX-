"use client";

import { create } from "zustand";
import type { Role, SessionUser } from "@/lib/mock/types";

/* =====================================================================
 * V-INTERN STORE — bộ máy điều hướng ảo (SPA một route "/").
 * view: landing → auth → app; route là "đường dẫn ảo" theo vai trò.
 *
 * Bản nâng cấp v2:
 *  · Session persistence — localStorage "v-intern-session" (chỉ client,
 *    hydrate() gọi sau mount nên không lệch hydration).
 *  · Hash routing — #/landing · #/auth · #/{role}/{route}; nút Back/
 *    Forward của trình duyệt hoạt động, chia sẻ được đường dẫn sâu.
 * ===================================================================== */

export type AppView = "landing" | "auth" | "app";

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
        ],
      },
      {
        label: "Năng lực & kết quả",
        items: [
          { key: "evaluations", label: "Đánh giá" },
          { key: "kpi", label: "KPI & Lương ảo" },
          { key: "certificates", label: "Chứng nhận" },
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
          { key: "sprints", label: "Sprint & Task" },
        ],
      },
      {
        label: "Theo dõi & đánh giá",
        items: [
          { key: "grading", label: "Chấm bài" },
          { key: "reports", label: "Báo cáo" },
        ],
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
        ],
      },
      {
        label: "Học tập",
        items: [
          { key: "questions", label: "Ngân hàng câu hỏi" },
          { key: "templates", label: "Mẫu dự án" },
        ],
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
      set({ view: "app", user, route });
    } else if (hash?.view === "auth") {
      set({ view: "auth" });
    } else {
      set({ view: "landing" });
    }
    // Lắng nghe Back/Forward của trình duyệt
    window.addEventListener("popstate", () => {
      const state = get();
      const p = parseHash();
      if (!p) return;
      suppressHash = true;
      if (p.view !== "app" || !state.user) {
        set({ view: p.view, user: null, route: "overview", sidebarOpen: false });
      } else {
        set({ route: canNavigate(state.user.role, p.route) ? p.route : "overview", sidebarOpen: false });
      }
      window.setTimeout(() => (suppressHash = false), 0);
    });
  },

  enterAuth: () => set({ view: "auth", user: null, route: "overview" }),
  goLanding: () => set({ view: "landing", user: null, route: "overview" }),

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
