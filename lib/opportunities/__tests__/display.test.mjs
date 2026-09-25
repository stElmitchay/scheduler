import assert from "node:assert/strict";
import test from "node:test";
import { deadlineLabel } from "../display.mjs";

const now = new Date("2026-10-14T09:30:00");

test("no deadline has no label", () => {
  assert.equal(deadlineLabel(null, now), null);
});

test("today and tomorrow read in words and are urgent", () => {
  assert.deepEqual(deadlineLabel("2026-10-14", now), {
    text: "Closes today",
    short: "Today",
    urgent: true,
    days: 0,
  });
  assert.deepEqual(deadlineLabel("2026-10-15", now), {
    text: "Closes tomorrow",
    short: "Tomorrow",
    urgent: true,
    days: 1,
  });
});

test("short form drops the verb so it fits the deadline column", () => {
  assert.equal(deadlineLabel("2026-10-18", now).short, "In 4 days");
  assert.equal(deadlineLabel("2026-10-22", now).short, "22 Oct");
  assert.equal(deadlineLabel("2026-10-13", now).short, "Closed");
});

test("inside the urgent window counts down in days", () => {
  const label = deadlineLabel("2026-10-18", now);

  assert.equal(label.text, "Closes in 4 days");
  assert.equal(label.urgent, true);
});

test("the last day of the window is still urgent", () => {
  const label = deadlineLabel("2026-10-21", now);

  assert.equal(label.text, "Closes in 7 days");
  assert.equal(label.urgent, true);
});

test("one day beyond the window falls back to a date", () => {
  const label = deadlineLabel("2026-10-22", now);

  assert.equal(label.text, "Closes 22 Oct");
  assert.equal(label.urgent, false);
});

test("a passed deadline reads closed and is not urgent", () => {
  const label = deadlineLabel("2026-10-13", now);

  assert.equal(label.text, "Closed");
  assert.equal(label.urgent, false);
  assert.equal(label.days, -1);
});

test("time of day does not shift the day count", () => {
  const lateEvening = new Date("2026-10-14T23:59:00");
  const earlyMorning = new Date("2026-10-14T00:01:00");

  assert.equal(deadlineLabel("2026-10-18", lateEvening).text, "Closes in 4 days");
  assert.equal(deadlineLabel("2026-10-18", earlyMorning).text, "Closes in 4 days");
});
