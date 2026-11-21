"use client";
/* =====================================================================
 * GROUPS ADAPTER (admin) — nhóm người dùng + RBAC + danh sách user.
 * Envelope groups/roles/permissions/users: { data, meta } (live-shapes 2026-11).
 * Ops cover:
 *  GROUPS (8):
 *   GET    /groups (q, page, pageSize)
 *   POST   /groups
 *   PATCH  /groups/{id}
 *   GET    /groups/{id}/members     → { members: [{ userId, joinedAt }] }
 *   POST   /groups/{id}/members     → { added, skipped }
 *   DELETE /groups/{id}/members/{userId} → { removed }
 *   GET    /groups/{id}/roles       → { roles: string[] }
 *   PUT    /groups/{id}/roles       → { roles: string[] }
 *  RBAC (3):
 *   GET /roles                     → { data, meta }
 *   GET /permissions               → { data, meta }
 *   GET /roles/{id}/permissions    → { data, meta }
 *  USERS (trợ giúp chọn thành viên):
 *   GET /users                     → { data, meta }
 * ===================================================================== */
import { request } from "./client";
import { array, nullable, number, parsePage, record, string } from "./parse";

export interface GroupRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  userId: string;
  joinedAt: string;
}

export interface RoleRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: string;
}

/** User cho picker — shape thật của GET /users (displayName, không phải name). */
export interface UserOption {
  id: string;
  email: string;
  username: string;
  displayName: string;
  status: string;
  createdAt: string;
}

function parseGroup(value: unknown): GroupRow {
  const v = record(value);
  return {
    id: string(v.id),
    code: string(v.code),
    name: string(v.name),
    description: nullable(v.description, string),
    createdAt: string(v.createdAt),
    updatedAt: string(v.updatedAt),
  };
}

function parseRole(value: unknown): RoleRow {
  const v = record(value);
  return {
    id: string(v.id),
    code: string(v.code),
    name: string(v.name),
    description: nullable(v.description, string),
    isSystem: v.isSystem === true,
    createdAt: string(v.createdAt),
    updatedAt: string(v.updatedAt),
  };
}

function parsePermission(value: unknown): PermissionRow {
  const v = record(value);
  return {
    id: string(v.id),
    code: string(v.code),
    name: string(v.name),
    description: nullable(v.description, string),
    createdAt: string(v.createdAt),
  };
}

function parseUserOption(value: unknown): UserOption {
  const v = record(value);
  return {
    id: string(v.id),
    email: string(v.email),
    username: string(v.username),
    displayName: string(v.displayName),
    status: string(v.status),
    createdAt: string(v.createdAt),
  };
}

/* --------------------------------- groups -------------------------------- */

export interface GroupListFilter {
  page?: number;
  pageSize?: number;
  q?: string;
}

/** GET /groups — envelope { data, meta }. */
export async function listGroups(
  filter: GroupListFilter = {},
): Promise<{ items: GroupRow[]; total: number }> {
  const params = new URLSearchParams();
  params.set("page", String(filter.page ?? 1));
  params.set("pageSize", String(filter.pageSize ?? 100));
  if (filter.q) params.set("q", filter.q);
  const body = await request(`/groups?${params.toString()}`, (value) =>
    parsePage(value, parseGroup),
  );
  return { items: body.items, total: body.total };
}

export interface CreateGroupInput {
  code: string;
  name: string;
  description?: string;
}

/** POST /groups — code 3-64 ký tự a-z0-9._- , name <= 128. */
export async function createGroup(input: CreateGroupInput): Promise<GroupRow> {
  return request("/groups", parseGroup, { method: "POST", body: input });
}

export interface UpdateGroupInput {
  name?: string;
  description?: string;
}

/** PATCH /groups/{id} — sửa tên / mô tả. */
export async function updateGroup(id: string, input: UpdateGroupInput): Promise<GroupRow> {
  return request(`/groups/${encodeURIComponent(id)}`, parseGroup, {
    method: "PATCH",
    body: input,
  });
}

/** GET /groups/{id}/members — envelope { members: [...] }. */
export async function listGroupMembers(id: string): Promise<GroupMember[]> {
  return request(`/groups/${encodeURIComponent(id)}/members`, (value) => {
    const r = record(value);
    return array(r.members, (raw) => {
      const m = record(raw);
      return { userId: string(m.userId), joinedAt: string(m.joinedAt) };
    });
  });
}

/** POST /groups/{id}/members — idempotent, tối đa 200 userIds duy nhất. */
export async function addGroupMembers(
  id: string,
  userIds: string[],
): Promise<{ added: number; skipped: number }> {
  return request(`/groups/${encodeURIComponent(id)}/members`, (value) => {
    const r = record(value);
    return { added: number(r.added), skipped: number(r.skipped) };
  }, { method: "POST", body: { userIds } });
}

/** DELETE /groups/{id}/members/{userId} — trả { removed }. */
export async function removeGroupMember(
  id: string,
  userId: string,
): Promise<{ removed: number }> {
  return request(
    `/groups/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`,
    (value) => {
      const r = record(value);
      return { removed: number(r.removed) };
    },
    { method: "DELETE" },
  );
}

/** GET /groups/{id}/roles — envelope { roles: string[] } (mã vai trò). */
export async function listGroupRoles(id: string): Promise<string[]> {
  return request(`/groups/${encodeURIComponent(id)}/roles`, (value) => {
    const r = record(value);
    return array(r.roles, string);
  });
}

/** PUT /groups/{id}/roles — thay toàn bộ tập vai trò của nhóm. */
export async function setGroupRoles(id: string, roleCodes: string[]): Promise<string[]> {
  return request(`/groups/${encodeURIComponent(id)}/roles`, (value) => {
    const r = record(value);
    return array(r.roles, string);
  }, { method: "PUT", body: { roleCodes } });
}

/* ---------------------------------- RBAC --------------------------------- */

/** GET /roles — envelope { data, meta }. */
export async function listRoles(page = 1, pageSize = 100): Promise<{ items: RoleRow[]; total: number }> {
  const body = await request(`/roles?page=${page}&pageSize=${pageSize}`, (value) =>
    parsePage(value, parseRole),
  );
  return { items: body.items, total: body.total };
}

/** GET /permissions — envelope { data, meta }, 60 permission hệ thống. */
export async function listPermissions(
  page = 1,
  pageSize = 20,
): Promise<{ items: PermissionRow[]; total: number; totalPages: number }> {
  const body = await request(`/permissions?page=${page}&pageSize=${pageSize}`, (value) =>
    parsePage(value, parsePermission),
  );
  return { items: body.items, total: body.total, totalPages: body.totalPages };
}

/** GET /roles/{id}/permissions — ma trận quyền read-only của 1 vai trò. */
export async function listRolePermissions(
  id: string,
  page = 1,
  pageSize = 100,
): Promise<{ items: PermissionRow[]; total: number }> {
  const body = await request(
    `/roles/${encodeURIComponent(id)}/permissions?page=${page}&pageSize=${pageSize}`,
    (value) => parsePage(value, parsePermission),
  );
  return { items: body.items, total: body.total };
}

/* ------------------------------ user options ----------------------------- */

/** GET /users — danh sách user cho picker (shape thật: displayName). */
export async function listUserOptions(page = 1, pageSize = 100): Promise<UserOption[]> {
  const body = await request(`/users?page=${page}&pageSize=${pageSize}`, (value) =>
    parsePage(value, parseUserOption),
  );
  return body.items;
}
