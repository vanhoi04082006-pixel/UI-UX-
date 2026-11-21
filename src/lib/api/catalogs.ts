"use client";
/* =====================================================================
 * CATALOGS ADAPTER (admin) — nhóm catalogs (5 ops) + career-roles (8 ops).
 * Contract khớp BE thật (docs/api-specs/catalogs.md · career-roles.md):
 *  · GET   /catalogs/types           → {data, meta}
 *  · POST  /catalogs/types           {code, name, description?}
 *  · GET   /catalogs/items?typeCode= → {data, meta}
 *  · POST  /catalogs/items           {typeCode, code, name, description?}
 *  · PATCH /catalogs/items/{id}      (body phần tử tùy chọn)
 *  · GET   /admin/career-roles       → {items, total, page, pageSize}
 *  · POST  /admin/career-roles       {code, name, description?, level, ...}
 *  · GET   /admin/career-roles/{code}
 *  · PUT   /admin/career-roles/{code} {version, status, acceptingApplications, ...}
 *  · POST  /admin/career-roles/{code}/archive {version}
 *  · GET   /admin/career-roles/{code}/revisions
 *  · GET   /career-roles             (public — không dùng trong màn, dự phòng)
 *  · GET   /career-roles/reference   (public — dự phòng)
 * ===================================================================== */
import { request } from "./client";
import { array, boolean, nullable, number, parsePage, record, string } from "./parse";

/* ------------------------------ catalog types --------------------------- */

export interface CatalogType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

function parseCatalogType(value: unknown): CatalogType {
  const v = record(value);
  return {
    id: string(v.id),
    code: string(v.code),
    name: nullable(v.name, string) ?? "",
    description: nullable(v.description, string),
    createdAt: nullable(v.createdAt, string),
    updatedAt: nullable(v.updatedAt, string),
  };
}

export async function listCatalogTypes(
  page = 1,
  pageSize = 50,
): Promise<{ items: CatalogType[]; total: number; totalPages: number }> {
  const body = await request(
    `/catalogs/types?page=${page}&pageSize=${pageSize}`,
    (value) => parsePage(value, parseCatalogType),
  );
  return { items: body.items, total: body.total, totalPages: body.totalPages };
}

export async function createCatalogType(input: {
  code: string;
  name: string;
  description?: string;
}): Promise<CatalogType> {
  return request("/catalogs/types", parseCatalogType, {
    method: "POST",
    body: input,
  });
}

/* ------------------------------ catalog items --------------------------- */

export interface CatalogItem {
  id: string;
  typeCode: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
}

function parseCatalogItem(value: unknown): CatalogItem {
  const v = record(value);
  return {
    id: nullable(v.id, string) ?? `${string(v.typeCode)}:${string(v.code)}`,
    typeCode: nullable(v.typeCode, string) ?? "",
    code: string(v.code),
    name: nullable(v.name, string) ?? "",
    description: nullable(v.description, string),
    status: nullable(v.status, string) ?? "active",
    createdAt: nullable(v.createdAt, string),
    updatedAt: nullable(v.updatedAt, string),
  };
}

export async function listCatalogItems(
  opts: { page?: number; pageSize?: number; typeCode?: string } = {},
): Promise<{ items: CatalogItem[]; total: number; totalPages: number }> {
  const params = new URLSearchParams();
  params.set("page", String(opts.page ?? 1));
  params.set("pageSize", String(opts.pageSize ?? 50));
  if (opts.typeCode) params.set("typeCode", opts.typeCode);
  const body = await request(`/catalogs/items?${params.toString()}`, (value) =>
    parsePage(value, parseCatalogItem),
  );
  return { items: body.items, total: body.total, totalPages: body.totalPages };
}

export async function createCatalogItem(input: {
  typeCode: string;
  code: string;
  name: string;
  description?: string;
}): Promise<CatalogItem> {
  return request("/catalogs/items", parseCatalogItem, {
    method: "POST",
    body: input,
  });
}

export async function updateCatalogItem(
  id: string,
  input: { typeCode?: string; code?: string; name?: string; description?: string },
): Promise<CatalogItem> {
  return request(
    `/catalogs/items/${encodeURIComponent(id)}`,
    parseCatalogItem,
    { method: "PATCH", body: input },
  );
}

/* ------------------------------ career roles ---------------------------- */

export type CareerRoleLevel = "intern" | "junior";
export type CareerRoleStatus = "draft" | "published" | "archived";

export interface CareerRole {
  code: string;
  name: string;
  description: string;
  level: string;
  language: string;
  requiredSkills: string[];
  optionalSkills: string[];
  competencyWeights: Record<string, unknown>;
  status: string;
  acceptingApplications: boolean;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

function parseCareerRole(value: unknown): CareerRole {
  const v = record(value);
  return {
    code: string(v.code),
    name: nullable(v.name, string) ?? "",
    description: nullable(v.description, string) ?? "",
    level: nullable(v.level, string) ?? "intern",
    language: nullable(v.language, string) ?? "vi",
    requiredSkills: array(v.requiredSkills ?? [], (x) => string(x)),
    optionalSkills: array(v.optionalSkills ?? [], (x) => string(x)),
    competencyWeights:
      v.competencyWeights === undefined || v.competencyWeights === null
        ? {}
        : record(v.competencyWeights),
    status: nullable(v.status, string) ?? "draft",
    acceptingApplications: v.acceptingApplications === true,
    version: nullable(v.version, number) ?? 1,
    createdAt: nullable(v.createdAt, string),
    updatedAt: nullable(v.updatedAt, string),
  };
}

export async function listCareerRoles(
  page = 1,
  pageSize = 25,
): Promise<{ items: CareerRole[]; total: number }> {
  return request(`/admin/career-roles?page=${page}&pageSize=${pageSize}`, (value) => {
    const v = record(value);
    return {
      items: array(v.items ?? [], parseCareerRole),
      total: nullable(v.total, number) ?? 0,
    };
  });
}

export interface CreateCareerRoleInput {
  code: string;
  name: string;
  description?: string;
  level: string;
  language: string;
  requiredSkills?: string[];
  optionalSkills?: string[];
}

export async function createCareerRole(
  input: CreateCareerRoleInput,
): Promise<CareerRole> {
  return request("/admin/career-roles", parseCareerRole, {
    method: "POST",
    body: input,
  });
}

export async function getCareerRole(code: string): Promise<CareerRole> {
  return request(`/admin/career-roles/${encodeURIComponent(code)}`, parseCareerRole);
}

/** PUT đòi đủ field (probe validation: version, status, acceptingApplications,
 * name, description, level, language, skills, competencyWeights). */
export interface UpdateCareerRoleInput {
  version: number;
  status: string;
  acceptingApplications: boolean;
  name: string;
  description: string;
  level: string;
  language: string;
  requiredSkills: string[];
  optionalSkills: string[];
  competencyWeights: Record<string, unknown>;
}

export async function updateCareerRole(
  code: string,
  input: UpdateCareerRoleInput,
): Promise<CareerRole> {
  return request(`/admin/career-roles/${encodeURIComponent(code)}`, parseCareerRole, {
    method: "PUT",
    body: input,
  });
}

export async function archiveCareerRole(
  code: string,
  version: number,
): Promise<CareerRole> {
  return request(
    `/admin/career-roles/${encodeURIComponent(code)}/archive`,
    parseCareerRole,
    { method: "POST", body: { version } },
  );
}

export interface CareerRoleRevision {
  version: number;
  createdBy: string | null;
  createdAt: string | null;
  snapshot: CareerRole | null;
}

export async function listCareerRoleRevisions(
  code: string,
  page = 1,
  pageSize = 25,
): Promise<{ items: CareerRoleRevision[]; total: number }> {
  return request(
    `/admin/career-roles/${encodeURIComponent(code)}/revisions?page=${page}&pageSize=${pageSize}`,
    (value) => {
      const v = record(value);
      return {
        items: array(v.items ?? [], (raw) => {
          const r = record(raw);
          return {
            version: nullable(r.version, number) ?? 0,
            createdBy: nullable(r.createdBy, string),
            createdAt: nullable(r.createdAt, string),
            snapshot:
              r.snapshot === undefined || r.snapshot === null
                ? null
                : parseCareerRole(r.snapshot),
          };
        }),
        total: nullable(v.total, number) ?? 0,
      };
    },
  );
}

/* --------------------- public catalog (dự phòng, không dùng màn) --------- */

export async function listPublicCareerRoles(): Promise<CareerRole[]> {
  return request("/career-roles", (value) => {
    const v = record(value);
    return array(v.items ?? [], parseCareerRole);
  });
}

export async function listCareerRoleReferences(): Promise<
  { code: string; name: string }[]
> {
  return request("/career-roles/reference", (value) => {
    const v = record(value);
    return array(v.items ?? [], (raw) => {
      const r = record(raw);
      return { code: string(r.code), name: nullable(r.name, string) ?? "" };
    });
  });
}
