import {
  formatDateKey,
  isSameDate,
} from "@/lib/scheduler/calendar-utils.mjs";
import { visibleActivities } from "@/lib/scheduler/day-activities.mjs";
import type { Booking, Space } from "@/lib/scheduler/types";
import { BulletinHeader, EventItem } from "../bulletin-header";
import {
  bookingsForDay,
  formatDayHeading,
  formatMonth,
  type SpaceFilter,
} from "../format";

export function CalendarScreen({
  monthCursor,
  monthDays,
  selectedDate,
  publicBookings,
  spaces,
  spaceFilter,
  onBack,
  onShiftMonth,
  onToday,
  onSelectDate,
  onSpaceFilterChange,
}: {
  monthCursor: Date;
  monthDays: Date[];
  selectedDate: Date;
  publicBookings: Booking[];
  spaces: Space[];
  spaceFilter: SpaceFilter;
  onBack: () => void;
  onShiftMonth: (amount: number) => void;
  onToday: () => void;
  onSelectDate: (date: Date) => void;
  onSpaceFilterChange: (filter: SpaceFilter) => void;
}) {
  return (
    <main className="bulletin-page">
      <div className="bulletin-shell bulletin-shell-wide">
        <BulletinHeader
          eyebrow="Full calendar"
          title={formatMonth(monthCursor)}
          onBack={onBack}
        />

        <div className="bulletin-calendar-toolbar">
          <button type="button" onClick={() => onShiftMonth(-1)}>
            Previous
          </button>
          <button type="button" onClick={onToday}>
            Today
          </button>
          <button type="button" onClick={() => onShiftMonth(1)}>
            Next
          </button>
        </div>

        <div className="bulletin-filters" aria-label="Space filters">
          <button
            type="button"
            className={spaceFilter === "all" ? "active" : ""}
            onClick={() => onSpaceFilterChange("all")}
          >
            All activities
          </button>
          {spaces.map((space) => (
            <button
              type="button"
              key={space.id}
              className={spaceFilter === space.id ? "active" : ""}
              onClick={() => onSpaceFilterChange(space.id)}
            >
              {space.name}
            </button>
          ))}
        </div>

        <section className="bulletin-calendar-scroll">
          <section className="calendar-app-grid" aria-label="Monthly calendar">
            {[
              ["Sun", "S"],
              ["Mon", "M"],
              ["Tue", "T"],
              ["Wed", "W"],
              ["Thu", "T"],
              ["Fri", "F"],
              ["Sat", "S"],
            ].map(([full, short]) => (
              <div className="calendar-weekday" key={full}>
                <span className="calendar-weekday-full">{full}</span>
                <span className="calendar-weekday-short">{short}</span>
              </div>
            ))}
            {monthDays.map((day) => {
              const dayBookings = bookingsForDay(publicBookings, day, spaceFilter);
              const isSelected = isSameDate(day, selectedDate);
              const isOutsideMonth = day.getMonth() !== monthCursor.getMonth();

              return (
                <button
                  type="button"
                  key={formatDateKey(day)}
                  className={[
                    "calendar-day-cell",
                    isSelected ? "selected" : "",
                    isOutsideMonth ? "outside" : "",
                  ].join(" ")}
                  onClick={() => onSelectDate(day)}
                >
                  <span className="calendar-day-number">{day.getDate()}</span>
                  {dayBookings.length > 0 ? (
                    <span className="calendar-day-count" aria-hidden="true">
                      {dayBookings.length}
                    </span>
                  ) : null}
                  <CellActivities bookings={dayBookings} />
                </button>
              );
            })}
          </section>
        </section>

      </div>
    </main>
  );
}

// Rendered inside every cell but hidden below the desktop breakpoint, where the
// count badge carries the same information in the space available.
function CellActivities({ bookings }: { bookings: Booking[] }) {
  const { shown, overflow } = visibleActivities(bookings);

  if (bookings.length === 0) return null;

  return (
    <span className="calendar-cell-list" aria-hidden="true">
      {shown.map((booking) => (
        <span
          key={booking.id}
          className={`calendar-cell-item ${booking.status}`}
        >
          {booking.activityName}
        </span>
      ))}
      {overflow > 0 ? (
        <span className="calendar-cell-more">+{overflow} more</span>
      ) : null}
    </span>
  );
}

// The selected day. Sits in the shell's right panel on desktop and falls in
// underneath the grid on mobile, which is where it has always been.
export function CalendarDayPanel({
  selectedDate,
  selectedBookings,
  notice,
  onAddToDay,
}: {
  selectedDate: Date;
  selectedBookings: Booking[];
  notice: string;
  onAddToDay?: () => void;
}) {
  return (
    <section className="bulletin-section">
      <h2>{formatDayHeading(selectedDate)}</h2>
      {notice ? <p className="bulletin-message">{notice}</p> : null}
      {selectedBookings.length === 0 ? (
        <p className="bulletin-empty">No activities for this date.</p>
      ) : (
        selectedBookings.map((booking) => (
          <EventItem booking={booking} key={booking.id} />
        ))
      )}
      {onAddToDay ? (
        <button
          type="button"
          className="bulletin-secondary-full"
          onClick={onAddToDay}
        >
          Add to this day
        </button>
      ) : null}
    </section>
  );
}
