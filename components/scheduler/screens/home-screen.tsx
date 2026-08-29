import { formatDateKey } from "@/lib/scheduler/calendar-utils.mjs";
import type { Booking } from "@/lib/scheduler/types";
import { BulletinHeader, EventItem } from "../bulletin-header";
import { formatShortDay } from "../format";

export function HomeScreen({
  weekDays,
  onMenu,
  onOpenCalendar,
}: {
  weekDays: { day: Date; bookings: Booking[] }[];
  onMenu: () => void;
  onOpenCalendar: () => void;
}) {
  return (
    <main className="bulletin-page">
      <div className="bulletin-shell">
        <BulletinHeader
          eyebrow="Kharis Church"
          title="Freetown"
          onMenu={onMenu}
        />
        <div className="bulletin-title-rule">This week at Kharis Freetown</div>
        <section className="bulletin-week-list">
          {weekDays.length === 0 ? (
            <p className="bulletin-empty">No confirmed activities this week.</p>
          ) : (
            weekDays.map(({ day, bookings }) => (
              <div key={formatDateKey(day)} className="bulletin-day-group">
                <h2>{formatShortDay(day)}</h2>
                {bookings.map((booking) => (
                  <EventItem booking={booking} key={booking.id} />
                ))}
              </div>
            ))
          )}
        </section>
        <button
          type="button"
          className="bulletin-cta-link"
          onClick={onOpenCalendar}
        >
          Open full calendar <span aria-hidden="true">&rarr;</span>
        </button>
      </div>
    </main>
  );
}
