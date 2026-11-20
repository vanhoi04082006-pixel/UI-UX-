"use client";

import { useEffect, useState } from "react";

/**
 * Hook theo dõi theme tối cho các hiệu ứng animate-ui cần màu theo
 * chủ đề (topography lineColor, glyph shapeColor…). Theo dõi class
 * `.dark` trên <html> — tương thích với next-themes (attribute="class").
 * Khởi tạo `false` để SSR ổn định; đồng bộ lại trong effect sau mount.
 */
export function useIsDarkTheme(): boolean {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const sync = () =>
      setDark(document.documentElement.classList.contains("dark"));
    sync();
    // next-themes toggle class .dark trên <html> — quan sát thay đổi attribute.
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return dark;
}
