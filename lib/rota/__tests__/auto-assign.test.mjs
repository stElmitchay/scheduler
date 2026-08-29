import assert from "node:assert/strict";
import { test } from "node:test";
import { autoAssign } from "../auto-assign.mjs";

function makeInput(overrides = {}) {
  return {
    slots: [
      { bookingId: "b1", rotaRoleId: "r1", slotIndex: 0, startAt: "2026-09-06T11:00:00", sortOrder: 0 },
      { bookingId: "b1", rotaRoleId: "r1", slotIndex: 1, startAt: "2026-09-06T11:00:00", sortOrder: 0 },
      { bookingId: "b2", rotaRoleId: "r1", slotIndex: 0, startAt: "2026-09-13T11:00:00", sortOrder: 0 },
    ],
    context: {
      people: [
        { id: "p1", name: "Aminata", isActive: true, unavailability: [] },
        { id: "p2", name: "Joseph", isActive: true, unavailability: [] },
        { id: "p3", name: "Fatmata", isActive: true, unavailability: [] },
      ],
      occurrences: [
        { bookingId: "b1", startAt: "2026-09-06T11:00:00" },
        { bookingId: "b2", startAt: "2026-09-13T11:00:00" },
      ],
      assignments: [],
      maxServesPerMonth: 3,
      monthKey: "2026-09",
    },
    ...overrides,
  };
}

test("fills every slot when there are enough people", () => {
  const result = autoAssign(makeInput());

  assert.equal(result.assignments.length, 3);
  assert.equal(result.unfilled.length, 0);
});

test("never puts the same person twice at one service", () => {
  const result = autoAssign(makeInput());
  const atB1 = result.assignments
    .filter((assignment) => assignment.bookingId === "b1")
    .map((assignment) => assignment.rotaPersonId);

  assert.equal(new Set(atB1).size, atB1.length);
});

test("is deterministic across runs", () => {
  assert.deepEqual(autoAssign(makeInput()), autoAssign(makeInput()));
});

test("does not mutate the context it is given", () => {
  const input = makeInput();
  autoAssign(input);

  assert.equal(input.context.assignments.length, 0);
});

test("does not overwrite slots already filled by hand", () => {
  const input = makeInput();
  input.context.assignments = [{ bookingId: "b1", rotaPersonId: "p1" }];
  input.slots = input.slots.filter(
    (slot) => !(slot.bookingId === "b1" && slot.slotIndex === 0),
  );

  const result = autoAssign(input);

  assert.equal(result.assignments.length, 2);
  assert.ok(
    !result.assignments.some(
      (assignment) => assignment.bookingId === "b1" && assignment.slotIndex === 0,
    ),
  );
  assert.ok(
    !result.assignments.some(
      (assignment) =>
        assignment.bookingId === "b1" && assignment.rotaPersonId === "p1",
    ),
  );
});

test("spreads the load rather than reusing one person", () => {
  const result = autoAssign(makeInput());
  const counts = new Map();

  for (const assignment of result.assignments) {
    counts.set(
      assignment.rotaPersonId,
      (counts.get(assignment.rotaPersonId) ?? 0) + 1,
    );
  }

  assert.ok(Math.max(...counts.values()) <= 1);
});

test("reports slots it cannot fill instead of forcing them", () => {
  const input = makeInput();
  input.context.people = [
    { id: "p1", name: "Aminata", isActive: true, unavailability: [] },
  ];

  const result = autoAssign(input);

  assert.equal(result.assignments.length, 2);
  assert.equal(result.unfilled.length, 1);
  assert.equal(result.unfilled[0].bookingId, "b1");
});

test("skips blocked candidates", () => {
  const input = makeInput();
  input.context.people[0].isActive = false;
  input.context.people[1].unavailability = [
    { startDate: "2026-09-06", endDate: "2026-09-06" },
  ];

  const result = autoAssign(input);
  const atB1 = result.assignments.filter(
    (assignment) => assignment.bookingId === "b1",
  );

  assert.equal(atB1.length, 1);
  assert.equal(atB1[0].rotaPersonId, "p3");
});

test("fills earlier dates first regardless of slot order in", () => {
  const input = makeInput();
  input.slots = [...input.slots].reverse();

  const result = autoAssign(input);

  assert.equal(result.assignments[0].bookingId, "b1");
});
