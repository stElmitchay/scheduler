import type { Booking } from "@/lib/scheduler/types";
import { bookingLine, formatTime } from "./format";

export function BulletinHeader({
  eyebrow,
  title,
  onMenu,
  onBack,
}: {
  eyebrow: string;
  title: string;
  onMenu?: () => void;
  onBack?: () => void;
}) {
  return (
    <header className="bulletin-header">
      <div>
        <p className="bulletin-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      <button
        type="button"
        className="bulletin-icon-button"
        onClick={onBack ?? onMenu}
        aria-label={onBack ? "Go back" : "Open menu"}
      >
        {onBack ? (
          <span className="bulletin-back-mark">‹</span>
        ) : (
          <span className="bulletin-menu-mark">
            <span />
            <span />
            <span />
          </span>
        )}
      </button>
    </header>
  );
}

export function EventItem({ booking }: { booking: Booking }) {
  return (
    <article
      className={
        booking.status === "pending"
          ? "bulletin-event bulletin-event-pending"
          : booking.status === "cancelled"
          ? "bulletin-event bulletin-event-cancelled"
          : "bulletin-event"
      }
    >
      <time>
        {booking.status === "pending"
          ? "Pending"
          : booking.status === "cancelled"
          ? "Cancelled"
          : `${formatTime(booking.startAt)} - ${formatTime(booking.endAt)}`}
      </time>
      <h3>{booking.activityName}</h3>
      <p>{bookingLine(booking)}</p>
    </article>
  );
}
