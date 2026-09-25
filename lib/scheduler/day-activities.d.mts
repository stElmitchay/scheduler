import type { Booking } from "./types";

export const DEFAULT_CELL_CAP: number;

export function visibleActivities<T = Booking>(
  dayBookings: T[],
  cap?: number,
): { shown: T[]; overflow: number };
