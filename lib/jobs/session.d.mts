import type {
  JobDashboardSessionResult,
  JobDashboardSessionSubject,
} from "./types";

export const JOB_DASHBOARD_SESSION_TTL_MS: number;

export function signJobDashboardSession(
  subject: JobDashboardSessionSubject,
  now?: number,
): string;

export function verifyJobDashboardSession(
  token: string,
  now?: number,
): JobDashboardSessionResult;
