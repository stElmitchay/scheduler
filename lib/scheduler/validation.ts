import type { BookingFormInput, ValidationResult } from "./types";

export function validateBookingInput(input: BookingFormInput): ValidationResult {
  if (!input.accessCode.trim()) {
    return { ok: false, message: "Access code is required." };
  }

  if (!input.spaceId) {
    return { ok: false, message: "Space is required." };
  }

  if (!input.activityName.trim()) {
    return { ok: false, message: "Activity name is required." };
  }

  if (!input.startAt || !input.endAt) {
    return { ok: false, message: "Start and end times are required." };
  }

  const start = new Date(input.startAt);
  const end = new Date(input.endAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false, message: "Start and end times must be valid." };
  }

  if (end <= start) {
    return { ok: false, message: "End time must be after start time." };
  }

  return { ok: true };
}

export function rangesOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
) {
  return startA < endB && startB < endA;
}
