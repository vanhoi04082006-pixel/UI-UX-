"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiEnvelope } from "@/lib/mock/types";

/* =====================================================================
 * useMock — hook fetch dữ liệu mock: loading / error / reload, có hủy
 * request cũ khi phụ thuộc đổi (tránh race condition).
 * Trạng thái gom trong một "bundle" gắn với path — không setState
 * đồng bộ trong effect (chuẩn react-hooks v6).
 * ===================================================================== */

interface Bundle<T> {
  forPath: string;
  data?: T;
  error?: string;
}

export function useMock<T>(path: string | null) {
  const [bundle, setBundle] = useState<Bundle<T> | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!path) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    fetch(`/api/mock/${path}`, { signal: controller.signal })
      .then(async (res) => {
        const json = (await res.json()) as ApiEnvelope<T>;
        if (!res.ok || !json.ok) throw new Error(json.message ?? `Lỗi ${res.status}`);
        return json;
      })
      .then((json) => setBundle({ forPath: path, data: json.data }))
      .catch((err: unknown) => {
        if ((err as Error)?.name === "AbortError") return;
        setBundle({
          forPath: path,
          error: (err as Error)?.message ?? "Không tải được dữ liệu.",
        });
      });

    return () => controller.abort();
  }, [path, reloadToken]);

  const current = path && bundle?.forPath === path ? bundle : null;
  const data = current?.data ?? null;
  const loading = !!path && !current;
  const error = current?.error ?? null;

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  return { data, loading, error, reload };
}

/** POST JSON tới mock API, trả về envelope. */
export async function postMock<TReq, TRes>(path: string, body: TReq): Promise<ApiEnvelope<TRes>> {
  const res = await fetch(`/api/mock/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as ApiEnvelope<TRes>;
  if (!res.ok || !json.ok) throw new Error(json.message ?? "Không hoàn tất được thao tác.");
  return json;
}
