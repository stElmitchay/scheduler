"use client";

import { useMemo, useState } from "react";
import type { Booking, Space } from "@/lib/scheduler/types";

type CalendarView = "week" | "month";

function startOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  next.setDate(next.getDate() - day);
  next.setHours(0, 0, 0, 0);
  return next;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatHeading(date: Date, view: CalendarView) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    ...(view === "week" ? { day: "numeric" as const } : {}),
  }).format(date);
}

export function Calendar({
  bookings,
  spaces,
}: {
  bookings: Booking[];
  spaces: Space[];
}) {
  const [view, setView] = useState<CalendarView>("week");
  const [cursorDate, setCursorDate] = useState(() => new Date());

  const days = useMemo(() => {
    if (view === "week") {
      const start = startOfWeek(cursorDate);
      return Array.from({ length: 7 }, (_, index) => {
        const day = new Date(start);
        day.setDate(start.getDate() + index);
        return day;
      });
    }

    const first = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1);
    const start = startOfWeek(first);
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [cursorDate, view]);

  function move(amount: number) {
    const next = new Date(cursorDate);

    if (view === "week") {
      next.setDate(next.getDate() + amount * 7);
    } else {
      next.setMonth(next.getMonth() + amount);
    }

    setCursorDate(next);
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-stone-200 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase text-teal-700">
            Public schedule
          </p>
          <h2 className="text-xl font-semibold text-stone-950">
            {formatHeading(cursorDate, view)}
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            {spaces.map((space) => space.name).join(" / ")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 shadow-sm hover:bg-stone-50"
            onClick={() => move(-1)}
            type="button"
          >
            Previous
          </button>
          <button
            className="rounded border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 shadow-sm hover:bg-stone-50"
            onClick={() => setCursorDate(new Date())}
            type="button"
          >
            Today
          </button>
          <button
            className="rounded border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 shadow-sm hover:bg-stone-50"
            onClick={() => move(1)}
            type="button"
          >
            Next
          </button>
          <select
            className="rounded border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 shadow-sm"
            value={view}
            onChange={(event) => setView(event.target.value as CalendarView)}
            aria-label="Calendar view"
          >
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
        {days.map((day) => {
          const dayBookings = bookings.filter((booking) =>
            sameDay(new Date(booking.startAt), day),
          );
          const isOutsideMonth =
            view === "month" && day.getMonth() !== cursorDate.getMonth();

          return (
            <div
              key={day.toISOString()}
              className={
                isOutsideMonth
                  ? "min-h-44 rounded-lg border border-stone-200 bg-stone-50 p-3 opacity-70"
                  : "min-h-44 rounded-lg border border-stone-200 bg-white p-3 shadow-sm"
              }
            >
              <h3 className="text-sm font-semibold text-stone-950">
                {new Intl.DateTimeFormat("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                }).format(day)}
              </h3>
              <div className="mt-3 space-y-2">
                {dayBookings.map((booking) => (
                  <article
                    key={booking.id}
                    className={
                      booking.status === "cancelled"
                        ? "rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-900"
                        : "rounded border border-teal-200 bg-teal-50 p-2 text-xs text-teal-950"
                    }
                  >
                    <p className="font-semibold">{booking.activityName}</p>
                    <p>{booking.departmentName}</p>
                    <p className="font-medium">{booking.spaceName}</p>
                    <p>
                      {formatTime(booking.startAt)} -{" "}
                      {formatTime(booking.endAt)}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
