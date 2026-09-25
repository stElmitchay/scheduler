export const DEADLINE_URGENT_DAYS: number;

export function deadlineLabel(
  deadline: string | null,
  now?: Date,
): { text: string; short: string; urgent: boolean; days: number } | null;
