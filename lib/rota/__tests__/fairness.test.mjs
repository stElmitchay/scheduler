import assert from "node:assert/strict";
import { test } from "node:test";
import {
  checkCandidate,
  monthKeyOf,
  summarizePeriod,
  weekIndex,
} from "../fairness.mjs";

// September 2026: the 6th, 13th, 20th and 27th are Sundays.
function makeContext(overrides = {}) {
  return {
    people: [
      { id: "p1", name: "Aminata", isActive: true, unavailability: [] },
      { id: "p2", name: "Joseph", isActive: true, unavailability: [] },
      { id: "p3", name: "Fatmata", isActive: true, unavailability: [] },
    ],
    occurrences: [
      { bookingId: "b1", startAt: "2026-09-06T11:00:00" },
      { bookingId: "b2", startAt: "2026-09-13T11:00:00" },
      { bookingId: "b3", startAt: "2026-09-20T11:00:00" },
      { bookingId: "b4", startAt: "2026-09-27T11:00:00" },
    ],
    assignments: [],
    maxServesPerMonth: 3,
    monthKey: "2026-09",
    ...overrides,
  };
}

function codes(warnings) {
  return warnings.map((warning) => warning.code).sort();
}

function has(warnings, code) {
  return warnings.some((warning) => warning.code === code);
}

test("weekIndex puts Sunday at the start of a new week", () => {
  assert.equal(weekIndex("2026-09-13") - weekIndex("2026-09-12"), 1);
  assert.equal(weekIndex("2026-09-12"), weekIndex("2026-09-06"));
});

test("weekIndex increments by one across a year boundary", () => {
  assert.equal(weekIndex("2027-01-03") - weekIndex("2026-12-27"), 1);
});

test("monthKeyOf derives the month from a timestamp", () => {
  assert.equal(monthKeyOf("2026-09-06T11:00:00"), "2026-09");
});

test("a clean candidate produces no warnings", () => {
  assert.deepEqual(
    checkCandidate({ personId: "p1", bookingId: "b1", context: makeContext() }),
    [],
  );
});

test("an inactive person is blocked", () => {
  const context = makeContext();
  context.people[0].isActive = false;

  const warnings = checkCandidate({ personId: "p1", bookingId: "b1", context });

  assert.deepEqual(codes(warnings), ["inactive"]);
  assert.equal(warnings[0].severity, "block");
});

test("an unavailable person is blocked on a date inside the range", () => {
  const context = makeContext();
  context.people[0].unavailability = [
    { startDate: "2026-09-05", endDate: "2026-09-07" },
  ];

  assert.deepEqual(
    codes(checkCandidate({ personId: "p1", bookingId: "b1", context })),
    ["unavailable"],
  );
  assert.deepEqual(
    checkCandidate({ personId: "p1", bookingId: "b2", context }),
    [],
  );
});

test("unavailability boundaries are inclusive", () => {
  const context = makeContext();
  context.people[0].unavailability = [
    { startDate: "2026-09-06", endDate: "2026-09-06" },
  ];

  assert.deepEqual(
    codes(checkCandidate({ personId: "p1", bookingId: "b1", context })),
    ["unavailable"],
  );
});

test("holding two posts at one service is blocked", () => {
  const context = makeContext({
    assignments: [{ bookingId: "b1", rotaPersonId: "p1" }],
  });

  assert.ok(
    has(checkCandidate({ personId: "p1", bookingId: "b1", context }), "same_service"),
  );
});

test("a second service on the same day warns but does not block", () => {
  const context = makeContext();
  context.occurrences.push({
    bookingId: "b1b",
    startAt: "2026-09-06T18:00:00",
  });
  context.assignments = [{ bookingId: "b1", rotaPersonId: "p1" }];

  const warnings = checkCandidate({ personId: "p1", bookingId: "b1b", context });

  assert.ok(has(warnings, "same_day"));
  assert.ok(warnings.every((warning) => warning.severity === "warn"));
});

test("over_cap warns past the cap, not at it", () => {
  const context = makeContext({
    assignments: [
      { bookingId: "b1", rotaPersonId: "p1" },
      { bookingId: "b2", rotaPersonId: "p1" },
    ],
  });

  assert.ok(
    !has(checkCandidate({ personId: "p1", bookingId: "b3", context }), "over_cap"),
  );

  context.assignments.push({ bookingId: "b3", rotaPersonId: "p1" });

  assert.ok(
    has(checkCandidate({ personId: "p1", bookingId: "b4", context }), "over_cap"),
  );
});

test("above_average fires when someone exceeds the team average plus one", () => {
  const context = makeContext({
    assignments: [
      { bookingId: "b1", rotaPersonId: "p1" },
      { bookingId: "b2", rotaPersonId: "p1" },
    ],
  });

  assert.ok(
    has(
      checkCandidate({ personId: "p1", bookingId: "b3", context }),
      "above_average",
    ),
  );
});

test("inactive people are excluded from the team average", () => {
  const context = makeContext({
    assignments: [{ bookingId: "b1", rotaPersonId: "p1" }],
  });
  context.people[2].isActive = false;

  assert.ok(
    has(
      checkCandidate({ personId: "p1", bookingId: "b2", context }),
      "above_average",
    ),
  );
});

test("three consecutive weeks warns", () => {
  const context = makeContext({
    assignments: [
      { bookingId: "b1", rotaPersonId: "p1" },
      { bookingId: "b2", rotaPersonId: "p1" },
    ],
  });

  assert.ok(
    has(
      checkCandidate({ personId: "p1", bookingId: "b3", context }),
      "consecutive_weeks",
    ),
  );
});

test("a run starting in the previous month is detected", () => {
  const context = makeContext();
  context.occurrences.push(
    { bookingId: "h1", startAt: "2026-08-23T11:00:00" },
    { bookingId: "h2", startAt: "2026-08-30T11:00:00" },
  );
  context.assignments = [
    { bookingId: "h1", rotaPersonId: "p1" },
    { bookingId: "h2", rotaPersonId: "p1" },
  ];

  assert.ok(
    has(
      checkCandidate({ personId: "p1", bookingId: "b1", context }),
      "consecutive_weeks",
    ),
  );
});

test("a gap breaks the consecutive run", () => {
  const context = makeContext({
    assignments: [
      { bookingId: "b1", rotaPersonId: "p1" },
      { bookingId: "b3", rotaPersonId: "p1" },
    ],
  });

  assert.ok(
    !has(
      checkCandidate({ personId: "p1", bookingId: "b4", context }),
      "consecutive_weeks",
    ),
  );
});

test("previous-month serves do not count toward the monthly cap", () => {
  const context = makeContext({ maxServesPerMonth: 1 });
  context.occurrences.push({ bookingId: "h1", startAt: "2026-08-30T11:00:00" });
  context.assignments = [{ bookingId: "h1", rotaPersonId: "p1" }];

  assert.ok(
    !has(checkCandidate({ personId: "p1", bookingId: "b1", context }), "over_cap"),
  );
});

test("an unknown person or booking yields no warnings rather than throwing", () => {
  const context = makeContext();

  assert.deepEqual(
    checkCandidate({ personId: "nobody", bookingId: "b1", context }),
    [],
  );
  assert.deepEqual(
    checkCandidate({ personId: "p1", bookingId: "nothing", context }),
    [],
  );
});

test("summarizePeriod reports counts, flags and the under-used", () => {
  const context = makeContext({
    assignments: [
      { bookingId: "b1", rotaPersonId: "p1" },
      { bookingId: "b2", rotaPersonId: "p1" },
      { bookingId: "b3", rotaPersonId: "p1" },
      { bookingId: "b4", rotaPersonId: "p2" },
    ],
  });

  const summary = summarizePeriod(context);
  const aminata = summary.find((entry) => entry.personId === "p1");
  const fatmata = summary.find((entry) => entry.personId === "p3");

  assert.equal(aminata.monthCount, 3);
  assert.equal(aminata.aboveAverage, true);
  assert.equal(aminata.consecutiveWeeks, 3);
  assert.equal(aminata.overCap, false);
  assert.equal(fatmata.monthCount, 0);
  assert.equal(fatmata.underUsed, true);
});

test("summarizePeriod never marks an inactive person under-used", () => {
  const context = makeContext({
    assignments: [
      { bookingId: "b1", rotaPersonId: "p1" },
      { bookingId: "b2", rotaPersonId: "p1" },
      { bookingId: "b3", rotaPersonId: "p1" },
    ],
  });
  context.people[2].isActive = false;

  const fatmata = summarizePeriod(context).find(
    (entry) => entry.personId === "p3",
  );

  assert.equal(fatmata.underUsed, false);
});
