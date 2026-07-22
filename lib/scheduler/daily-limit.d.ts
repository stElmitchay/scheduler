export const MAX_ACTIVITIES_PER_DAY: number;
export function isDailyLimitExempt(activityType: string): boolean;
export function getDayRange(occurrences: { startAt: string }[]): {
  start: string;
  end: string;
};
export function countConfirmedByDay(
  bookings: { activityType: string; startAt: string }[],
): Map<string, number>;
export function findExceededDay(
  occurrences: { startAt: string }[],
  countsByDay: Map<string, number>,
): string | null;
