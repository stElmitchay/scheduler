import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildMonthGrid,
  formatDateKey,
  getWeekRange,
  isSameDate,
} from "../calendar-utils.mjs";

describe("calendar utilities", () => {
  it("builds a six-week calendar grid from Sunday to Saturday", () => {
    const grid = buildMonthGrid(new Date("2026-07-17T12:00:00Z"));

    assert.equal(grid.length, 42);
    assert.equal(formatDateKey(grid[0]), "2026-06-28");
    assert.equal(formatDateKey(grid[41]), "2026-08-08");
  });

  it("builds a Sunday-start week range", () => {
    const range = getWeekRange(new Date("2026-07-17T12:00:00Z"));

    assert.deepEqual(range.map(formatDateKey), [
      "2026-07-12",
      "2026-07-13",
      "2026-07-14",
      "2026-07-15",
      "2026-07-16",
      "2026-07-17",
      "2026-07-18",
    ]);
  });

  it("compares calendar dates without comparing times", () => {
    assert.equal(
      isSameDate(
        new Date("2026-07-17T06:00:00Z"),
        new Date("2026-07-17T21:00:00Z"),
      ),
      true,
    );
    assert.equal(
      isSameDate(
        new Date("2026-07-17T23:00:00Z"),
        new Date("2026-07-18T01:00:00Z"),
      ),
      false,
    );
  });
});
