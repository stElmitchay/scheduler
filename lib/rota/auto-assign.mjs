import { checkCandidate, monthKeyOf } from "./fairness.mjs";

function slotOrder(a, b) {
  const byDate = new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
  if (byDate !== 0) return byDate;

  const byRole = a.sortOrder - b.sortOrder;
  if (byRole !== 0) return byRole;

  return a.slotIndex - b.slotIndex;
}

function loadOf(personId, assignments, byBookingMonth, monthKey) {
  return assignments.filter(
    (assignment) =>
      assignment.rotaPersonId === personId &&
      byBookingMonth.get(assignment.bookingId) === monthKey,
  ).length;
}

function lastServedAt(personId, assignments, byBookingTime) {
  let latest = -Infinity;

  for (const assignment of assignments) {
    if (assignment.rotaPersonId !== personId) continue;
    latest = Math.max(
      latest,
      byBookingTime.get(assignment.bookingId) ?? -Infinity,
    );
  }

  return latest;
}

export function autoAssign({ slots, context }) {
  const byBookingMonth = new Map();
  const byBookingTime = new Map();

  for (const occurrence of context.occurrences) {
    byBookingMonth.set(occurrence.bookingId, monthKeyOf(occurrence.startAt));
    byBookingTime.set(
      occurrence.bookingId,
      new Date(occurrence.startAt).getTime(),
    );
  }

  // The caller's array is never mutated; picks accumulate on a local copy so
  // each slot sees the choices made a moment ago.
  const working = { ...context, assignments: [...context.assignments] };
  const assignments = [];
  const unfilled = [];

  for (const slot of [...slots].sort(slotOrder)) {
    const candidates = working.people
      .filter((person) => {
        const warnings = checkCandidate({
          personId: person.id,
          bookingId: slot.bookingId,
          context: working,
        });

        return !warnings.some((warning) => warning.severity === "block");
      })
      .sort((a, b) => {
        const loadDiff =
          loadOf(a.id, working.assignments, byBookingMonth, working.monthKey) -
          loadOf(b.id, working.assignments, byBookingMonth, working.monthKey);
        if (loadDiff !== 0) return loadDiff;

        const servedDiff =
          lastServedAt(a.id, working.assignments, byBookingTime) -
          lastServedAt(b.id, working.assignments, byBookingTime);
        if (servedDiff !== 0) return servedDiff;

        return a.name.localeCompare(b.name);
      });

    const chosen = candidates[0];

    if (!chosen) {
      unfilled.push(slot);
      continue;
    }

    working.assignments.push({
      bookingId: slot.bookingId,
      rotaPersonId: chosen.id,
    });
    assignments.push({ ...slot, rotaPersonId: chosen.id });
  }

  return { assignments, unfilled };
}
