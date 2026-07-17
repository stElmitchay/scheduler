import { BookingList } from "@/components/scheduler/booking-list";
import { Calendar } from "@/components/scheduler/calendar";
import { LeaderPanel } from "@/components/scheduler/leader-panel";
import { getBookings, getDepartments, getSpaces } from "@/lib/scheduler/data";
import { getCurrentTimestamp } from "@/lib/scheduler/time";

export const dynamic = "force-dynamic";

export default async function Home() {
  let bookings: Awaited<ReturnType<typeof getBookings>> = [];
  let departments: Awaited<ReturnType<typeof getDepartments>> = [];
  let spaces: Awaited<ReturnType<typeof getSpaces>> = [];

  try {
    [bookings, departments, spaces] = await Promise.all([
      getBookings(),
      getDepartments(),
      getSpaces(),
    ]);
  } catch (error) {
    return (
      <main className="min-h-screen bg-stone-100">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-10 sm:px-6">
          <p className="text-sm font-semibold uppercase text-teal-700">
            Kharis Church
          </p>
          <h1 className="text-3xl font-semibold text-stone-950">
            Supabase setup required
          </h1>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-medium">The scheduler could not load.</p>
            <p className="mt-2">
              Add `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and
              `ACCESS_CODE_PEPPER` to `.env.local`, then run the SQL in
              `supabase/schema.sql`.
            </p>
            <p className="mt-2 text-amber-800">
              {error instanceof Error ? error.message : "Unknown setup error."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const now = getCurrentTimestamp();
  const history = bookings.filter(
    (booking) =>
      booking.status === "cancelled" ||
      new Date(booking.endAt).getTime() < now,
  );

  return (
    <main className="min-h-screen bg-stone-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="grid gap-4 border-b border-stone-200 pb-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase text-teal-700">
              Kharis Church
            </p>
            <h1 className="text-3xl font-semibold text-stone-950">
              Scheduling & Booking
            </h1>
            <p className="max-w-2xl text-stone-600">
              View the church schedule, reserve available spaces, and keep
              department activities coordinated.
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">Bookable spaces</p>
            <p>{spaces.map((space) => space.name).join(" / ")}</p>
          </div>
        </header>

        <Calendar bookings={bookings} spaces={spaces} />
        <LeaderPanel
          bookings={bookings}
          departments={departments}
          spaces={spaces}
        />
        <BookingList bookings={history} title="History and cancelled bookings" />
      </div>
    </main>
  );
}
