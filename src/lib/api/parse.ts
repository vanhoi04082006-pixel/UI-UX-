"use client";
/* =====================================================================
 * PARSE — parser contract ({data, meta} envelope, {message, code} lỗi).
 * Chuẩn layout: mọi response hợp đồng đều qua đây trước khi tới màn hình
 * (xem docs/SWAP-GUIDE.md §1). Lỗi cấu trúc ném ApiError INVALID_RESPONSE
 * để api-client.errorMessage() dịch sang thông điệp người dùng.
 * ===================================================================== */
import { ApiError } from "./api-client";

function invalid(what: string): never {
  throw new ApiError(0, "INVALID_RESPONSE", `Dữ liệu trả về thiếu hoặc sai kiểu: ${what}.`);
}

/** Đối tượng thuần (không phải mảng/null). */
export function record(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  invalid("đối tượng");
}

export function string(value: unknown): string {
  if (typeof value === "string") return value;
  invalid("chuỗi");
}

export function number(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  invalid("số");
}

export function boolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  invalid("boolean");
}

/** null/undefined → null; ngược lại parse qua next. */
export function nullable<T>(value: unknown, next: (value: unknown) => T): T | null {
  return value === null || value === undefined ? null : next(value);
}

/** Mảng + map từng phần tử qua parser con. */
export function array<T>(value: unknown, item: (raw: unknown) => T): T[] {
  if (!Array.isArray(value)) invalid("mảng");
  return value.map(item);
}

/** Giá trị phải thuộc tập cho phép (union hẹp). */
export function oneOf<T extends readonly unknown[]>(value: unknown, allowed: T): T[number] {
  if ((allowed as readonly unknown[]).includes(value)) return value as T[number];
  invalid("giá trị cho phép");
}

export interface PageMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Envelope phân trang: { data: T[], meta: { total, page, pageSize, totalPages } }. */
export function parsePage<T>(value: unknown, item: (raw: unknown) => T): { items: T[] } & PageMeta {
  const v = record(value);
  const meta = record(v.meta);
  return {
    items: array(v.data, item),
    total: number(meta.total),
    page: number(meta.page),
    pageSize: number(meta.pageSize),
    totalPages: number(meta.totalPages),
  };
}
