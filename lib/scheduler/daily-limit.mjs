import { formatDateKey } from "./calendar-utils.mjs";

export const MAX_ACTIVITIES_PER_DAY = 3;
const DAILY_LIMIT_EXEMPT_ACTIVITY_TYPE = "Service";

export function isDailyLimitExempt(activityType) {
  return activityType === DAILY_LIMIT_EXEMPT_ACTIVITY_TYPE;
}

export function getDayRange(occurrences) {
  const times = occurrences.map((occurrence) =>
    new Date(occurrence.startAt).getTime(),
  );

  const start = new Date(Math.min(...times));
  start.setHours(0, 0, 0, 0);

  const end = new Date(Math.max(...times));
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1);

  return { start: start.toISOString(), end: end.toISOString() };
}

export function countConfirmedByDay(bookings) {
  const counts = new Map();

  for (const booking of bookings) {
    if (isDailyLimitExempt(booking.activityType)) continue;

    const key = formatDateKey(new Date(booking.startAt));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

export function findExceededDay(occurrences, countsByDay) {
  for (const occurrence of occurrences) {
    const key = formatDateKey(new Date(occurrence.startAt));
    const count = countsByDay.get(key) ?? 0;

    if (count >= MAX_ACTIVITIES_PER_DAY) {
      return key;
    }
  }

  return null;
}
