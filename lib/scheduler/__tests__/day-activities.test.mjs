import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_CELL_CAP,
  visibleActivities,
} from "../day-activities.mjs";

const list = (count) =>
  Array.from({ length: count }, (_, index) => ({ id: `b${index}` }));

test("shows everything when the day is under the cap", () => {
  const { shown, overflow } = visibleActivities(list(2));

  assert.equal(shown.length, 2);
  assert.equal(overflow, 0);
});

test("shows everything when the day is exactly at the cap", () => {
  const { shown, overflow } = visibleActivities(list(DEFAULT_CELL_CAP));

  assert.equal(shown.length, DEFAULT_CELL_CAP);
  assert.equal(overflow, 0);
});

test("shows the fourth name rather than a +1 more that costs the same row", () => {
  const { shown, overflow } = visibleActivities(list(DEFAULT_CELL_CAP + 1));

  assert.equal(shown.length, DEFAULT_CELL_CAP + 1);
  assert.equal(overflow, 0);
});

test("rolls the tail into overflow once it is worth doing", () => {
  const { shown, overflow } = visibleActivities(list(6));

  assert.equal(shown.length, DEFAULT_CELL_CAP);
  assert.equal(overflow, 3);
});

test("keeps the original order of the day's bookings", () => {
  const { shown } = visibleActivities(list(6));

  assert.deepEqual(
    shown.map((booking) => booking.id),
    ["b0", "b1", "b2"],
  );
});

test("honours a custom cap", () => {
  const { shown, overflow } = visibleActivities(list(10), 1);

  assert.equal(shown.length, 1);
  assert.equal(overflow, 9);
});

test("a cap of zero hides every name", () => {
  const { shown, overflow } = visibleActivities(list(4), 0);

  assert.equal(shown.length, 0);
  assert.equal(overflow, 4);
});

test("an empty day is not overflow", () => {
  const { shown, overflow } = visibleActivities([]);

  assert.deepEqual(shown, []);
  assert.equal(overflow, 0);
});

test("survives a missing list", () => {
  const { shown, overflow } = visibleActivities(undefined);

  assert.deepEqual(shown, []);
  assert.equal(overflow, 0);
});
