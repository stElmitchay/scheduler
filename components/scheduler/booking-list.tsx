import type { Booking } from "@/lib/scheduler/types";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function BookingList({
  bookings,
  title,
}: {
  bookings: Booking[];
  title: string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-stone-950">{title}</h2>
      <div className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white shadow-sm">
        {bookings.length === 0 ? (
          <p className="p-4 text-sm text-stone-500">No bookings to show.</p>
        ) : (
          bookings.map((booking) => (
            <article key={booking.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium text-stone-950">
                  {booking.activityName}
                </h3>
                <span
                  className={
                    booking.status === "cancelled"
                      ? "rounded bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700"
                      : "rounded bg-teal-100 px-2 py-1 text-xs font-medium text-teal-700"
                  }
                >
                  {booking.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-stone-600">
                {booking.departmentName} - {booking.spaceName}
              </p>
              <p className="mt-1 text-sm text-stone-600">
                {formatDateTime(booking.startAt)} -{" "}
                {formatDateTime(booking.endAt)}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
