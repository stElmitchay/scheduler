import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_ACTIVITIES_PER_DAY,
  isDailyLimitExempt,
  getDayRange,
  countConfirmedByDay,
  findExceededDay,
} from "../daily-limit.mjs";

describe("daily-limit", () => {
  it("caps activities per day at 3", () => {
    assert.equal(MAX_ACTIVITIES_PER_DAY, 3);
  });

  it("exempts only the Service activity type", () => {
    assert.equal(isDailyLimitExempt("Service"), true);
    assert.equal(isDailyLimitExempt("Meeting"), false);
    assert.equal(isDailyLimitExempt("Rehearsal"), false);
  });

  it("computes a day range spanning the earliest to the latest occurrence", () => {
    const range = getDayRange([
      { startAt: "2026-07-17T14:00:00Z" },
      { startAt: "2026-07-24T09:00:00Z" },
    ]);

    assert.equal(range.start, "2026-07-17T00:00:00.000Z");
    assert.equal(range.end, "2026-07-25T00:00:00.000Z");
  });

  it("counts confirmed bookings per day, excluding Service bookings", () => {
    const counts = countConfirmedByDay([
      { activityType: "Meeting", startAt: "2026-07-17T09:00:00Z" },
      { activityType: "Meeting", startAt: "2026-07-17T14:00:00Z" },
      { activityType: "Service", startAt: "2026-07-17T10:00:00Z" },
      { activityType: "Prayer", startAt: "2026-07-18T09:00:00Z" },
    ]);

    assert.equal(counts.get("2026-07-17"), 2);
    assert.equal(counts.get("2026-07-18"), 1);
  });

  it("flags the first occurrence whose day is already at the cap", () => {
    const countsByDay = new Map([
      ["2026-07-17", 3],
      ["2026-07-18", 1],
    ]);

    assert.equal(
      findExceededDay(
        [{ startAt: "2026-07-17T16:00:00Z" }],
        countsByDay,
      ),
      "2026-07-17",
    );

    assert.equal(
      findExceededDay(
        [{ startAt: "2026-07-18T16:00:00Z" }],
        countsByDay,
      ),
      null,
    );
  });
});
