"use client";
/* =====================================================================
 * PROJECTS ADAPTER — dự án (10 ops) + mẫu dự án (phần xem/chi tiết) +
 * thay đổi template + task spec. Contract path khớp BE thật:
 *   · GET /projects, /projects/{id}/sessions        → { data, meta }
 *   · GET /project-templates                        → { data, meta }
 *   · GET /projects/{id}/members, /slots            → { members } / { slots }
 *   · GET /projects/{id}/changes                    → mảng phẳng
 *   · GET /project-templates/{id}/revisions         → { items, total, ... }
 *   · GET /projects/filter-options                  → object phẳng
 * ===================================================================== */
import { request } from "./client";
import { array, nullable, number, parsePage, record, string } from "./parse";

/* ------------------------------- types --------------------------------- */

export type ProjectDifficulty = "beginner" | "intermediate" | "advanced";
export type ProjectStatus = "draft" | "active" | "completed" | "archived";

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
  domainCategory: string | null;
  difficulty: ProjectDifficulty | null;
  status: ProjectStatus;
  mentorId: string | null;
  capacity: number | null;
  startDate: string | null;
  endDate: string | null;
  archivedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  technologies: string[];
}

export interface ProjectListResult {
  items: Project[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProjectFilterOptions {
  domains: string[];
  technologies: string[];
}

/** Thành viên dự án — membership theo assignment (BE QA có thể trả [] nên parse mềm). */
export interface ProjectMember {
  userId: string;
  displayName: string | null;
  email: string | null;
  role: string | null;
  assignmentStatus: string | null;
  joinedAt: string | null;
}

/** Phiên chạy trên dự án (bản rút gọn từ GET /projects/{id}/sessions). */
export interface ProjectSessionStub {
  id: string;
  code: string;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
}

export interface ProjectRoleSlot {
  roleCode: string;
  requiredCount: number;
  filledCount: number;
  members: { userId: string; displayName: string | null }[];
}

export interface SlotInput {
  roleCode: string;
  requiredCount: number;
}

/** Chi tiết vai trò trong định nghĩa template. */
export interface TemplateRoleDetail {
  code: string;
  title: string;
  countMin: number | null;
  countMax: number | null;
  level: string | null;
  requiredSkills: string[];
  recommendedSkills: string[];
  responsibilities: string[];
}

/** Định nghĩa learning-package của template — parse phòng thủ từng trường. */
export interface TemplateDefinition {
  code: string | null;
  slug: string | null;
  name: string | null;
  description: string | null;
  category: string | null;
  difficulty: string | null;
  techStack: string[];
  roles: string[];
  recommendedTeamSize: number | null;
  estimatedDurationDays: number | null;
  modules: string[];
  business: string | null;
  learningObjectives: string[];
  productObjectives: string[];
  scopeIn: string[];
  scopeOut: string[];
  functionalRequirements: string[];
  businessRules: string[];
  roleDetails: TemplateRoleDetail[];
}

export interface ProjectTemplate {
  id: string;
  code: string;
  name: string;
  category: string | null;
  difficulty: string | null;
  status: string | null;
  version: number;
  techStack: string[];
  roles: string[];
  teamSize: number | null;
  sprintCount: number | null;
  createdAt: string | null;
  archivedAt: string | null;
  definition: TemplateDefinition | null;
}

export interface TemplateRevision {
  version: number;
  sha256: string | null;
  createdAt: string | null;
  definition: TemplateDefinition | null;
}

/** Bộ assessment (staff-only) — giữ raw + rút danh sách file. */
export interface TemplateAssessment {
  version: number | null;
  assessment: Record<string, unknown> | null;
  solutionFiles: string[];
  hiddenTestFiles: string[];
  visibleTestFiles: string[];
}

/** Yêu cầu thay đổi từ template (GET /projects/{id}/changes — shape chưa fix cứng). */
export interface ProjectChange {
  id: string;
  title: string | null;
  description: string | null;
  reason: string | null;
  status: string | null;
  createdAt: string | null;
  raw: Record<string, unknown>;
}

export interface TaskSpec {
  requirements: string | null;
  role: string | null;
  dod: string[];
  rubricVersion: string | null;
  documentation: string | null;
}

/* ------------------------------ parsers -------------------------------- */

function strList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : [];
}

export function parseProject(value: unknown): Project {
  const v = record(value);
  return {
    id: string(v.id),
    code: string(v.code),
    name: string(v.name),
    description: nullable(v.description, string) ?? "",
    domainCategory: nullable(v.domainCategory, string),
    difficulty: nullable(v.difficulty, string) as ProjectDifficulty | null,
    status: (nullable(v.status, string) ?? "draft") as ProjectStatus,
    mentorId: nullable(v.mentorId, string),
    capacity: nullable(v.capacity, number),
    startDate: nullable(v.startDate, string),
    endDate: nullable(v.endDate, string),
    archivedAt: nullable(v.archivedAt, string),
    createdAt: nullable(v.createdAt, string),
    updatedAt: nullable(v.updatedAt, string),
    technologies: strList(v.technologies),
  };
}

export function parseTemplate(value: unknown): ProjectTemplate {
  const v = record(value);
  return {
    id: string(v.id),
    code: string(v.code),
    name: string(v.name),
    category: nullable(v.category, string),
    difficulty: nullable(v.difficulty, string),
    status: nullable(v.status, string),
    version: nullable(v.version, number) ?? 1,
    techStack: strList(v.techStack),
    roles: strList(v.roles),
    teamSize: nullable(v.teamSize, number),
    sprintCount: nullable(v.sprintCount, number),
    createdAt: nullable(v.createdAt, string),
    archivedAt: nullable(v.archivedAt, string),
    definition: parseTemplateDefinition(v.definition),
  };
}

export function parseTemplateDefinition(value: unknown): TemplateDefinition | null {
  if (value === null || value === undefined) return null;
  const v = record(value);
  const objectives = v.objectives === null || v.objectives === undefined ? {} : record(v.objectives);
  return {
    code: nullable(v.code, string),
    slug: nullable(v.slug, string),
    name: nullable(v.name, string),
    description: nullable(v.description, string),
    category: nullable(v.category, string),
    difficulty: nullable(v.difficulty, string),
    techStack: strList(v.techStack),
    roles: strList(v.roles),
    recommendedTeamSize: nullable(v.recommendedTeamSize, number),
    estimatedDurationDays: nullable(v.estimatedDurationDays, number),
    modules: strList(v.modules),
    business: nullable(objectives.business, string),
    learningObjectives: strList(objectives.learning),
    productObjectives: strList(objectives.product),
    scopeIn: strList(v.scopeIn),
    scopeOut: strList(v.scopeOut),
    functionalRequirements: strList(v.functionalRequirements),
    businessRules: strList(v.businessRules),
    roleDetails: Array.isArray(v.roleDetails)
      ? v.roleDetails.map((raw) => {
          const r = record(raw);
          return {
            code: nullable(r.code, string) ?? "",
            title: nullable(r.title, string) ?? "",
            countMin: nullable(r.countMin, number),
            countMax: nullable(r.countMax, number),
            level: nullable(r.level, string),
            requiredSkills: strList(r.requiredSkills),
            recommendedSkills: strList(r.recommendedSkills),
            responsibilities: strList(r.responsibilities),
          };
        })
      : [],
  };
}

function parseAssessment(value: unknown): TemplateAssessment {
  const v = record(value);
  const body = v.assessment === null || v.assessment === undefined ? null : record(v.assessment);
  const filePaths = (key: string): string[] => {
    if (!body || !Array.isArray(body[key])) return [];
    return body[key]
      .map((raw) => {
        if (typeof raw !== "object" || raw === null) return null;
        const f = raw as Record<string, unknown>;
        return typeof f.path === "string" ? f.path : null;
      })
      .filter((x): x is string => x !== null);
  };
  return {
    version: nullable(v.version, number),
    assessment: body,
    solutionFiles: filePaths("solutionFiles"),
    hiddenTestFiles: filePaths("hiddenTestFiles"),
    visibleTestFiles: filePaths("visibleTestFiles"),
  };
}

function parseChange(value: unknown): ProjectChange {
  const v = record(value);
  return {
    id: nullable(v.id, string) ?? "",
    title: nullable(v.title, string),
    description: nullable(v.description, string),
    reason: nullable(v.reason, string),
    status: nullable(v.status, string),
    createdAt: nullable(v.createdAt, string),
    raw: v,
  };
}

function parseMember(value: unknown): ProjectMember {
  const v = record(value);
  return {
    userId: nullable(v.userId, string) ?? "",
    displayName: nullable(v.displayName, string),
    email: nullable(v.email, string),
    role: nullable(v.role, string),
    assignmentStatus: nullable(v.assignmentStatus, string),
    joinedAt: nullable(v.joinedAt, string),
  };
}

function parseSlot(value: unknown): ProjectRoleSlot {
  const v = record(value);
  return {
    roleCode: nullable(v.roleCode, string) ?? "",
    requiredCount: nullable(v.requiredCount, number) ?? 0,
    filledCount: nullable(v.filledCount, number) ?? 0,
    members: Array.isArray(v.members)
      ? v.members.map((raw) => {
          const m = record(raw);
          return { userId: nullable(m.userId, string) ?? "", displayName: nullable(m.displayName, string) };
        })
      : [],
  };
}

function parseSessionStub(value: unknown): ProjectSessionStub {
  const v = record(value);
  return {
    id: string(v.id),
    code: string(v.code),
    name: nullable(v.name, string) ?? "",
    status: nullable(v.status, string) ?? "",
    startDate: nullable(v.startDate, string),
    endDate: nullable(v.endDate, string),
  };
}

function parseRevision(value: unknown): TemplateRevision {
  const v = record(value);
  return {
    version: nullable(v.version, number) ?? 0,
    sha256: nullable(v.sha256, string),
    createdAt: nullable(v.createdAt, string),
    definition: parseTemplateDefinition(v.definition),
  };
}

function parseTaskSpec(value: unknown): TaskSpec {
  const v = record(value);
  return {
    requirements: nullable(v.requirements, string),
    role: nullable(v.role, string),
    dod: strList(v.dod),
    rubricVersion: nullable(v.rubricVersion, string),
    documentation: nullable(v.documentation, string),
  };
}

/* ------------------------------ projects ------------------------------- */

export interface ListProjectsParams {
  q?: string;
  status?: string;
  difficulty?: string;
  domainCategory?: string;
  technology?: string;
  page?: number;
  pageSize?: number;
}

export async function listProjects(params: ListProjectsParams = {}): Promise<ProjectListResult> {
  const search = new URLSearchParams();
  search.set("page", String(params.page ?? 1));
  search.set("pageSize", String(params.pageSize ?? 20));
  if (params.q) search.set("q", params.q);
  if (params.status) search.set("status", params.status);
  if (params.difficulty) search.set("difficulty", params.difficulty);
  if (params.domainCategory) search.set("domainCategory", params.domainCategory);
  if (params.technology) search.set("technology", params.technology);
  const body = await request(`/projects?${search.toString()}`, (v) => parsePage(v, parseProject));
  return body;
}

export async function getProjectFilterOptions(): Promise<ProjectFilterOptions> {
  return request("/projects/filter-options", (v) => {
    const r = record(v);
    return { domains: strList(r.domains), technologies: strList(r.technologies) };
  });
}

export async function getProject(id: string): Promise<Project> {
  return request(`/projects/${encodeURIComponent(id)}`, parseProject);
}

export interface CreateProjectInput {
  code: string;
  name: string;
  description: string;
  domainCategory?: string;
  difficulty?: ProjectDifficulty;
  status?: ProjectStatus;
  mentorId?: string;
  capacity?: number;
  startDate?: string;
  endDate?: string;
  technologies?: string[];
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  return request("/projects", parseProject, { method: "POST", body: input });
}

export type UpdateProjectInput = Partial<Omit<CreateProjectInput, "code">>;

export async function updateProject(id: string, input: UpdateProjectInput): Promise<Project> {
  return request(`/projects/${encodeURIComponent(id)}`, parseProject, { method: "PATCH", body: input });
}

/** Nhận làm mentor dự án thư viện chưa có người nhận (409 khi đã có mentor). */
export async function claimProject(id: string): Promise<Project> {
  return request(`/projects/${encodeURIComponent(id)}/claim`, parseProject, { method: "POST" });
}

export async function listProjectMembers(id: string): Promise<ProjectMember[]> {
  return request(`/projects/${encodeURIComponent(id)}/members`, (v) => {
    const r = record(v);
    return array(r.members, parseMember);
  });
}

export async function listProjectSessions(id: string): Promise<ProjectSessionStub[]> {
  const body = await request(
    `/projects/${encodeURIComponent(id)}/sessions?page=1&pageSize=50`,
    (v) => parsePage(v, parseSessionStub),
  );
  return body.items;
}

export async function getProjectSlots(id: string): Promise<ProjectRoleSlot[]> {
  return request(`/projects/${encodeURIComponent(id)}/slots`, (v) => {
    const r = record(v);
    return array(r.slots, parseSlot);
  });
}

/** Thay toàn bộ slot vai trò (REPLACE) — chỉ mentor quản lý được phép. */
export async function setProjectSlots(id: string, slots: SlotInput[]): Promise<ProjectRoleSlot[]> {
  return request(`/projects/${encodeURIComponent(id)}/slots`, (v) => {
    const r = record(v);
    return array(r.slots, parseSlot);
  }, { method: "PUT", body: { slots } });
}

/* --------------------- template context / assessment -------------------- */

export async function getProjectTemplateContext(
  id: string,
): Promise<{ templateVersion: number | null; definition: TemplateDefinition | null }> {
  return request(`/projects/${encodeURIComponent(id)}/template-context`, (v) => {
    const r = record(v);
    return {
      templateVersion: nullable(r.templateVersion, number),
      definition: parseTemplateDefinition(r.definition),
    };
  });
}

export async function getProjectTemplateAssessment(id: string): Promise<TemplateAssessment> {
  return request(`/projects/${encodeURIComponent(id)}/template-assessment`, parseAssessment);
}

/* --------------------------- template changes --------------------------- */

export async function listProjectChanges(id: string): Promise<ProjectChange[]> {
  return request(`/projects/${encodeURIComponent(id)}/changes`, (v) => array(v, parseChange));
}

export async function proposeProjectChange(
  id: string,
  input: { title: string; description: string; reason: string },
): Promise<ProjectChange> {
  return request(`/projects/${encodeURIComponent(id)}/changes`, parseChange, {
    method: "POST",
    body: input,
  });
}

export async function applyProjectChange(changeId: string): Promise<Record<string, unknown>> {
  return request(`/project-changes/${encodeURIComponent(changeId)}/apply`, (v) => record(v), {
    method: "POST",
    body: {},
  });
}

/* ------------------------------ templates ------------------------------- */

export async function listTemplates(
  page = 1,
  pageSize = 20,
): Promise<{ items: ProjectTemplate[]; total: number; totalPages: number }> {
  const body = await request(
    `/project-templates?page=${page}&pageSize=${pageSize}`,
    (v) => parsePage(v, parseTemplate),
  );
  return { items: body.items, total: body.total, totalPages: body.totalPages };
}

export async function getTemplate(id: string): Promise<ProjectTemplate> {
  return request(`/project-templates/${encodeURIComponent(id)}`, parseTemplate);
}

export async function getTemplateAssessment(id: string): Promise<TemplateAssessment> {
  return request(`/project-templates/${encodeURIComponent(id)}/assessment`, parseAssessment);
}

export async function listTemplateRevisions(
  id: string,
  page = 1,
  pageSize = 20,
): Promise<{ items: TemplateRevision[]; total: number }> {
  return request(
    `/project-templates/${encodeURIComponent(id)}/revisions?page=${page}&pageSize=${pageSize}`,
    (v) => {
      const r = record(v);
      return { items: array(r.items, parseRevision), total: nullable(r.total, number) ?? 0 };
    },
  );
}

export async function getTemplateRevision(id: string, version: number): Promise<TemplateRevision> {
  return request(
    `/project-templates/${encodeURIComponent(id)}/revisions/${encodeURIComponent(version)}`,
    parseRevision,
  );
}

export async function getTemplateRevisionAssessment(
  id: string,
  version: number,
): Promise<TemplateAssessment> {
  return request(
    `/project-templates/${encodeURIComponent(id)}/revisions/${encodeURIComponent(version)}/assessment`,
    parseAssessment,
  );
}

/** Khởi tạo dự án mới từ template (POST /project-templates/{id}/start, body {}). */
export async function startTemplate(id: string): Promise<Record<string, unknown>> {
  return request(`/project-templates/${encodeURIComponent(id)}/start`, (v) => record(v), {
    method: "POST",
    body: {},
  });
}

export interface CreateTemplateInput {
  learningPackage: Record<string, unknown>;
  assessment?: Record<string, unknown> | null;
}

export async function createTemplate(input: CreateTemplateInput): Promise<ProjectTemplate> {
  return request("/project-templates", parseTemplate, { method: "POST", body: input });
}

/* ------------------------------- task spec ------------------------------ */

export async function getTaskSpec(taskId: string): Promise<TaskSpec> {
  return request(`/tasks/${encodeURIComponent(taskId)}/spec`, parseTaskSpec);
}

export async function getTaskSpecSource(taskId: string): Promise<TaskSpec> {
  return request(`/tasks/${encodeURIComponent(taskId)}/spec/source`, parseTaskSpec);
}
