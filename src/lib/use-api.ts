"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/* =====================================================================
 * useApi — hook gọi adapter (contract BE) với loading / error / reload.
 * Trạng thái gom trong một "bundle" gắn với key deps — setState chỉ xảy ra
 * trong callback async (không setState đồng bộ trong effect — chuẩn
 * react-hooks v6), request cũ bị vô hiệu bằng cờ alive khi deps đổi.
 * ===================================================================== */

interface Bundle<T> {
  forKey: string;
  data?: T;
  error?: string;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
) {
  const key = JSON.stringify(deps);
  const [bundle, setBundle] = useState<Bundle<T> | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const fetcherRef = useRef(fetcher);

  /* Cập nhật ref trong effect (không mutate ref khi render) — effect này
   * chạy trước effect fetch bên dưới trong cùng một commit. */
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let alive = true;
    fetcherRef
      .current()
      .then((data) => {
        if (!alive) return;
        setBundle({ forKey: key, data });
      })
      .catch((error: unknown) => {
        if (!alive) return;
        const message =
          typeof error === "object" && error !== null && "message" in error
            ? String((error as { message: unknown }).message)
            : "Không tải được dữ liệu.";
        setBundle({ forKey: key, error: message });
      });
    return () => {
      alive = false;
    };
  }, [key, reloadToken]);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);
  return {
    data: bundle?.forKey === key ? bundle.data : undefined,
    loading: bundle?.forKey !== key || (bundle?.data === undefined && !bundle?.error),
    error: bundle?.forKey === key ? bundle.error : undefined,
    reload,
  };
}
