export const DEADLINE_URGENT_DAYS = 7;

function dayStart(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

// Two forms of the same thing: `text` reads as a sentence fragment in prose
// ("Closes 30 Oct"), `short` fits the board's deadline column ("30 Oct").
// A posting inside the urgent window counts down instead, so a leader gets a
// nudge before closeExpiredPublishedOpportunities() closes it.
export function deadlineLabel(deadline, now = new Date()) {
  if (!deadline) return null;

  const due = dayStart(`${deadline}T00:00:00`);

  if (Number.isNaN(due.getTime())) return null;

  const today = dayStart(now);
  const days = Math.round((due - today) / 86400000);

  if (days < 0) return { text: "Closed", short: "Closed", urgent: false, days };
  if (days === 0) {
    return { text: "Closes today", short: "Today", urgent: true, days };
  }
  if (days === 1) {
    return { text: "Closes tomorrow", short: "Tomorrow", urgent: true, days };
  }

  if (days <= DEADLINE_URGENT_DAYS) {
    return {
      text: `Closes in ${days} days`,
      short: `In ${days} days`,
      urgent: true,
      days,
    };
  }

  const short = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(due);

  return { text: `Closes ${short}`, short, urgent: false, days };
}
