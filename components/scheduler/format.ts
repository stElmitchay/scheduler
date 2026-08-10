import { isSameDate } from "@/lib/scheduler/calendar-utils.mjs";
import type { Booking } from "@/lib/scheduler/types";

export type SpaceFilter = "all" | string;

export function formatDayHeading(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatShortDay(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
  }).format(date);
}

export function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function byStartTime(a: Booking, b: Booking) {
  return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
}

export function filterBySpace(bookings: Booking[], spaceFilter: SpaceFilter) {
  if (spaceFilter === "all") {
    return bookings;
  }

  return bookings.filter((booking) => booking.spaceId === spaceFilter);
}

export function bookingsForDay(bookings: Booking[], day: Date, spaceFilter: SpaceFilter = "all") {
  return filterBySpace(bookings, spaceFilter)
    .filter((booking) => isSameDate(new Date(booking.startAt), day))
    .sort(byStartTime);
}

export function bookingLine(booking: Booking) {
  const location = booking.spaceId ? booking.spaceName : "No church space";
  return `${location} / ${booking.departmentName}`;
}

export function countByLabel<T>(items: T[], getLabel: (item: T) => string) {
  const counts = new Map<string, number>();

  items.forEach((item) => {
    const label = getLabel(item);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });

  return Array.from(counts, ([label, count]) => ({ label, count })).sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  );
}
