// A desktop calendar cell lists activity names instead of a count. Without a cap
// one busy day sets the height of its whole week row, so the cell shows at most
// DEFAULT_CELL_CAP names and rolls the rest into "+N more".
export const DEFAULT_CELL_CAP = 3;

export function visibleActivities(dayBookings, cap = DEFAULT_CELL_CAP) {
  const list = Array.isArray(dayBookings) ? dayBookings : [];

  if (cap <= 0) {
    return { shown: [], overflow: list.length };
  }

  // One over the cap still fits: showing "+1 more" in place of the last name
  // costs a row either way, so show the name instead.
  if (list.length <= cap + 1) {
    return { shown: list, overflow: 0 };
  }

  return { shown: list.slice(0, cap), overflow: list.length - cap };
}
