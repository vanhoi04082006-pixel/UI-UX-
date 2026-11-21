"use client";
/* =====================================================================
 * PERFORMANCE ADAPTER — hiệu suất sinh viên + khuyến nghị AI cho từng SV.
 * Contract BE thật:
 *   · GET /performance/interns            → { items, total, ranking }
 *   · GET /performance/interns/{userId}   → object phẳng { userId, period, metrics }
 *   · GET /performance/interns/{userId}/detail → { profile, interview, metrics,
 *     assignments, tasks: { items, total }, trend, trendDefinition }
 *   · GET /performance/interns/{userId}/ai-recommendations → object phẳng
 *     (404 AI_RECOMMENDATION_NOT_AVAILABLE khi chưa có snapshot).
 * ===================================================================== */
import { request } from "./client";
import { array, nullable, number, record, string } from "./parse";

/* ------------------------------- shapes --------------------------------- */

export interface InternPerformanceRow {
  userId: string;
  displayName: string;
  completedTaskCount: number | null;
  totalTaskCount: number | null;
  taskCompletionRate: number | null;
  storyPointCompletionRate: number | null;
  averageEvaluationScore: number | null;
  overdueOpenTaskCount: number | null;
  onTimeCompletionRate: number | null;
  primaryProjectName: string | null;
  primarySessionName: string | null;
  rank: number | null;
}

export interface PerformanceMetrics {
  totalTaskCount: number;
  completedTaskCount: number;
  taskCompletionRate: number | null;
  committedStoryPoints: number;
  completedStoryPoints: number;
  storyPointCompletionRate: number | null;
  onTimeCompletionRate: number | null;
  onTimeCompletedTaskCount: number;
  dueDatedCompletedTaskCount: number;
  overdueOpenTaskCount: number;
  averageEvaluationScore: number | null;
  finalizedEvaluationCount: number;
  activeSprintProgress: number | null;
}

export interface InternPerformanceOverview {
  userId: string;
  periodFrom: string | null;
  periodTo: string | null;
  metrics: PerformanceMetrics;
}

export interface StudentProfile {
  id: string;
  displayName: string;
  email: string | null;
  selectedRole: string | null;
}

export interface StudentInterview {
  overallScore: number | null;
  technicalScore: number | null;
  englishScore: number | null;
  softSkillScore: number | null;
  decision: string | null;
  strengths: string[];
  weaknesses: string[];
  feedback: string | null;
  evaluatedAt: string | null;
}

export interface StudentAssignment {
  id: string;
  projectName: string | null;
  sessionName: string | null;
  roleInProject: string | null;
  status: string | null;
  assignedAt: string | null;
  completedAt: string | null;
}

export interface StudentTaskRow {
  id: string;
  code: string;
  title: string;
  status: string | null;
  priority: string | null;
  progress: number | null;
  dueDate: string | null;
  sprintName: string | null;
  submissionStatus: string | null;
  instructorScore: number | null;
  submittedAt: string | null;
}

export interface TrendPoint {
  month: string;
  created: number;
  completed: number;
}

export interface StudentPerformanceDetail {
  profile: StudentProfile;
  interview: StudentInterview | null;
  metrics: PerformanceMetrics;
  assignments: StudentAssignment[];
  tasks: StudentTaskRow[];
  taskTotal: number;
  trend: TrendPoint[];
  trendDefinition: string | null;
}

export interface AiRecommendationItem {
  type: string | null;
  priority: string | null;
  title: string | null;
  reason: string | null;
  actions: string[];
  evidenceMetricCodes: string[];
}

export interface AiRecommendations {
  id: string;
  userId: string;
  promptVersion: string | null;
  createdAt: string | null;
  reused: boolean;
  items: AiRecommendationItem[];
}

/* ------------------------------ parsers --------------------------------- */

function parseMetrics(value: unknown): PerformanceMetrics {
  const v = record(value);
  return {
    totalTaskCount: nullable(v.totalTaskCount, number) ?? 0,
    completedTaskCount: nullable(v.completedTaskCount, number) ?? 0,
    taskCompletionRate: nullable(v.taskCompletionRate, number),
    committedStoryPoints: nullable(v.committedStoryPoints, number) ?? 0,
    completedStoryPoints: nullable(v.completedStoryPoints, number) ?? 0,
    storyPointCompletionRate: nullable(v.storyPointCompletionRate, number),
    onTimeCompletionRate: nullable(v.onTimeCompletionRate, number),
    onTimeCompletedTaskCount: nullable(v.onTimeCompletedTaskCount, number) ?? 0,
    dueDatedCompletedTaskCount: nullable(v.dueDatedCompletedTaskCount, number) ?? 0,
    overdueOpenTaskCount: nullable(v.overdueOpenTaskCount, number) ?? 0,
    averageEvaluationScore: nullable(v.averageEvaluationScore, number),
    finalizedEvaluationCount: nullable(v.finalizedEvaluationCount, number) ?? 0,
    activeSprintProgress: nullable(v.activeSprintProgress, number),
  };
}

function parsePerfRow(value: unknown): InternPerformanceRow {
  const v = record(value);
  return {
    userId: string(v.userId),
    displayName: nullable(v.displayName, string) ?? "",
    completedTaskCount: nullable(v.completedTaskCount, number),
    totalTaskCount: nullable(v.totalTaskCount, number),
    taskCompletionRate: nullable(v.taskCompletionRate, number),
    storyPointCompletionRate: nullable(v.storyPointCompletionRate, number),
    averageEvaluationScore: nullable(v.averageEvaluationScore, number),
    overdueOpenTaskCount: nullable(v.overdueOpenTaskCount, number),
    onTimeCompletionRate: nullable(v.onTimeCompletionRate, number),
    primaryProjectName: nullable(v.primaryProjectName, string),
    primarySessionName: nullable(v.primarySessionName, string),
    rank: nullable(v.rank, number),
  };
}

/* ------------------------------ endpoints ------------------------------- */

export async function listInternPerformances(
  page = 1,
  pageSize = 100,
): Promise<{ items: InternPerformanceRow[]; total: number; ranking: string | null }> {
  return request(`/performance/interns?page=${page}&pageSize=${pageSize}`, (v) => {
    const r = record(v);
    return {
      items: array(r.items, parsePerfRow),
      total: nullable(r.total, number) ?? 0,
      ranking: nullable(r.ranking, string),
    };
  });
}

export async function getInternPerformance(userId: string): Promise<InternPerformanceOverview> {
  return request(`/performance/interns/${encodeURIComponent(userId)}`, (v) => {
    const r = record(v);
    const period = r.period === null || r.period === undefined ? {} : record(r.period);
    return {
      userId: string(r.userId),
      periodFrom: nullable(period.from, string),
      periodTo: nullable(period.to, string),
      metrics: parseMetrics(r.metrics),
    };
  });
}

export async function getInternPerformanceDetail(
  userId: string,
  page = 1,
  pageSize = 20,
): Promise<StudentPerformanceDetail> {
  return request(
    `/performance/interns/${encodeURIComponent(userId)}/detail?page=${page}&pageSize=${pageSize}`,
    (v) => {
      const r = record(v);
      const profile = record(r.profile);
      const interviewRaw =
        r.interview === null || r.interview === undefined ? null : record(r.interview);
      const tasks = r.tasks === null || r.tasks === undefined ? {} : record(r.tasks);
      const strList = (x: unknown): string[] =>
        Array.isArray(x) ? x.filter((i): i is string => typeof i === "string") : [];
      return {
        profile: {
          id: nullable(profile.id, string) ?? "",
          displayName: nullable(profile.displayName, string) ?? "",
          email: nullable(profile.email, string),
          selectedRole: nullable(profile.selectedRole, string),
        },
        interview: interviewRaw
          ? {
              overallScore: nullable(interviewRaw.overallScore, number),
              technicalScore: nullable(interviewRaw.technicalScore, number),
              englishScore: nullable(interviewRaw.englishScore, number),
              softSkillScore: nullable(interviewRaw.softSkillScore, number),
              decision: nullable(interviewRaw.decision, string),
              strengths: strList(interviewRaw.strengths),
              weaknesses: strList(interviewRaw.weaknesses),
              feedback: nullable(interviewRaw.feedback, string),
              evaluatedAt: nullable(interviewRaw.evaluatedAt, string),
            }
          : null,
        metrics: parseMetrics(r.metrics),
        assignments: array(r.assignments ?? [], (raw) => {
          const a = record(raw);
          return {
            id: nullable(a.id, string) ?? "",
            projectName: nullable(a.projectName, string),
            sessionName: nullable(a.sessionName, string),
            roleInProject: nullable(a.roleInProject, string),
            status: nullable(a.status, string),
            assignedAt: nullable(a.assignedAt, string),
            completedAt: nullable(a.completedAt, string),
          };
        }),
        tasks: array(tasks.items ?? [], (raw) => {
          const t = record(raw);
          return {
            id: string(t.id),
            code: nullable(t.code, string) ?? "",
            title: nullable(t.title, string) ?? "",
            status: nullable(t.status, string),
            priority: nullable(t.priority, string),
            progress: nullable(t.progress, number),
            dueDate: nullable(t.dueDate, string),
            sprintName: nullable(t.sprintName, string),
            submissionStatus: nullable(t.submissionStatus, string),
            instructorScore: nullable(t.instructorScore, number),
            submittedAt: nullable(t.submittedAt, string),
          };
        }),
        taskTotal: nullable(tasks.total, number) ?? 0,
        trend: array(r.trend ?? [], (raw) => {
          const t = record(raw);
          return {
            month: nullable(t.month, string) ?? "",
            created: nullable(t.created, number) ?? 0,
            completed: nullable(t.completed, number) ?? 0,
          };
        }),
        trendDefinition: nullable(r.trendDefinition, string),
      };
    },
  );
}

/** Khuyến nghị AI mới nhất của một SV — 404 khi chưa từng refresh. */
export async function getInternAiRecommendations(userId: string): Promise<AiRecommendations> {
  return request(`/performance/interns/${encodeURIComponent(userId)}/ai-recommendations`, (v) => {
    const r = record(v);
    const body = r.recommendations === null || r.recommendations === undefined ? {} : record(r.recommendations);
    return {
      id: string(r.id),
      userId: nullable(r.userId, string) ?? "",
      promptVersion: nullable(r.promptVersion, string),
      createdAt: nullable(r.createdAt, string),
      reused: r.reused === true,
      items: array(body.recommendations ?? [], (raw) => {
        const rec = record(raw);
        return {
          type: nullable(rec.type, string),
          priority: nullable(rec.priority, string),
          title: nullable(rec.title, string),
          reason: nullable(rec.reason, string),
          actions: Array.isArray(rec.actions)
            ? rec.actions.filter((x): x is string => typeof x === "string")
            : [],
          evidenceMetricCodes: Array.isArray(rec.evidenceMetricCodes)
            ? rec.evidenceMetricCodes.filter((x): x is string => typeof x === "string")
            : [],
        };
      }),
    };
  });
}
