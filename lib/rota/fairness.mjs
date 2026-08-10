const MS_PER_DAY = 86_400_000;
const CONSECUTIVE_WEEK_LIMIT = 3;

function dateKeyOf(startAt) {
  const date = new Date(startAt);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function monthKeyOf(startAt) {
  return dateKeyOf(startAt).slice(0, 7);
}

export function weekIndex(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const days = Math.floor(Date.UTC(year, month - 1, day) / MS_PER_DAY);
  // 1 Jan 1970 was a Thursday; +4 moves the week boundary onto Sunday,
  // matching getWeekRange in calendar-utils.mjs.
  return Math.floor((days + 4) / 7);
}

function indexOccurrences(occurrences) {
  const byBooking = new Map();

  for (const occurrence of occurrences) {
    byBooking.set(occurrence.bookingId, {
      dateKey: dateKeyOf(occurrence.startAt),
      monthKey: monthKeyOf(occurrence.startAt),
    });
  }

  return byBooking;
}

function servesFor(personId, context, byBooking) {
  const serves = [];

  for (const assignment of context.assignments) {
    if (assignment.rotaPersonId !== personId) continue;

    const occurrence = byBooking.get(assignment.bookingId);
    if (!occurrence) continue;

    serves.push({ ...occurrence, bookingId: assignment.bookingId });
  }

  return serves;
}

function weeksOf(serves) {
  return serves.map((serve) => weekIndex(serve.dateKey));
}

function longestRun(weekIndexes) {
  const sorted = [...new Set(weekIndexes)].sort((a, b) => a - b);
  let best = 0;
  let run = 0;

  for (let index = 0; index < sorted.length; index += 1) {
    run = index > 0 && sorted[index] === sorted[index - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }

  return best;
}

function activePeople(context) {
  return context.people.filter((person) => person.isActive);
}

function monthAssignmentTotal(context, byBooking) {
  return context.assignments.filter(
    (assignment) =>
      byBooking.get(assignment.bookingId)?.monthKey === context.monthKey,
  ).length;
}

function isUnavailable(person, dateKey) {
  return person.unavailability.some(
    (range) => dateKey >= range.startDate && dateKey <= range.endDate,
  );
}

export function checkCandidate({ personId, bookingId, context }) {
  const byBooking = indexOccurrences(context.occurrences);
  const target = byBooking.get(bookingId);
  const person = context.people.find((entry) => entry.id === personId);
  const warnings = [];

  if (!person || !target) {
    return warnings;
  }

  if (!person.isActive) {
    warnings.push({
      code: "inactive",
      severity: "block",
      message: `${person.name} is on break.`,
    });
  }

  if (isUnavailable(person, target.dateKey)) {
    warnings.push({
      code: "unavailable",
      severity: "block",
      message: `${person.name} is unavailable on ${target.dateKey}.`,
    });
  }

  const serves = servesFor(personId, context, byBooking);

  if (serves.some((serve) => serve.bookingId === bookingId)) {
    warnings.push({
      code: "same_service",
      severity: "block",
      message: `${person.name} is already serving at this service.`,
    });
  }

  if (
    serves.some(
      (serve) =>
        serve.dateKey === target.dateKey && serve.bookingId !== bookingId,
    )
  ) {
    warnings.push({
      code: "same_day",
      severity: "warn",
      message: `${person.name} is already serving at another service that day.`,
    });
  }

  // Cap and average count this calendar month only; the run below deliberately
  // spans the history window so a streak starting last month is still caught.
  const monthServes = serves.filter(
    (serve) => serve.monthKey === context.monthKey,
  );
  const nextCount = monthServes.length + 1;

  if (nextCount > context.maxServesPerMonth) {
    warnings.push({
      code: "over_cap",
      severity: "warn",
      message: `${person.name} would be on serve ${nextCount} this month (cap ${context.maxServesPerMonth}).`,
    });
  }

  const active = activePeople(context);

  if (active.length > 0) {
    const average = monthAssignmentTotal(context, byBooking) / active.length;

    if (nextCount > average + 1) {
      warnings.push({
        code: "above_average",
        severity: "warn",
        message: `${person.name} would be well above the team average of ${average.toFixed(1)}.`,
      });
    }
  }

  const run = longestRun([...weeksOf(serves), weekIndex(target.dateKey)]);

  if (run >= CONSECUTIVE_WEEK_LIMIT) {
    warnings.push({
      code: "consecutive_weeks",
      severity: "warn",
      message: `${person.name} would be serving ${run} weeks running.`,
    });
  }

  return warnings;
}

export function summarizePeriod(context) {
  const byBooking = indexOccurrences(context.occurrences);
  const active = activePeople(context);
  const total = monthAssignmentTotal(context, byBooking);
  const average = active.length > 0 ? total / active.length : 0;

  return context.people.map((person) => {
    const serves = servesFor(person.id, context, byBooking);
    const monthCount = serves.filter(
      (serve) => serve.monthKey === context.monthKey,
    ).length;

    return {
      personId: person.id,
      name: person.name,
      monthCount,
      overCap: monthCount > context.maxServesPerMonth,
      aboveAverage: monthCount > average + 1,
      underUsed: person.isActive && monthCount < average - 1,
      consecutiveWeeks: longestRun(weeksOf(serves)),
    };
  });
}
