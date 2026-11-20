"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import AppShell from "@/components/shell/app-shell";
import Landing from "@/components/landing/landing";
import AuthScreen from "@/components/auth/auth-screen";
import { useApp } from "@/lib/store";

/* Trang duy nhất "/" — máy trạng thái: landing → auth → app.
 * Toàn bộ "điều hướng" diễn ra trong store (SPA một route) + hash routing. */

export default function Page() {
  const view = useApp((s) => s.view);
  const hydrate = useApp((s) => s.hydrate);

  // Khôi phục phiên từ localStorage + hash (chạy 1 lần sau mount,
  // tránh lệch hydration giữa SSR và client).
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Về đầu trang mỗi khi đổi màn hình lớn
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [view]);

  return (
    <AnimatePresence mode="wait">
      {view === "landing" && (
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.28 }}
        >
          <Landing />
        </motion.div>
      )}
      {view === "auth" && (
        <motion.div
          key="auth"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.28, ease: [0.21, 0.47, 0.32, 0.98] }}
        >
          <AuthScreen />
        </motion.div>
      )}
      {view === "app" && (
        <motion.div
          key="app"
          initial={{ opacity: 0, scale: 0.995 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="min-h-screen"
        >
          <AppShell />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
