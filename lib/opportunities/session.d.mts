import type {
  OpportunityDashboardSessionResult,
  OpportunityDashboardSessionSubject,
} from "./types";

export const OPPORTUNITY_DASHBOARD_SESSION_TTL_MS: number;

export function signOpportunityDashboardSession(
  subject: OpportunityDashboardSessionSubject,
  now?: number,
): string;

export function verifyOpportunityDashboardSession(
  token: string,
  now?: number,
): OpportunityDashboardSessionResult;
