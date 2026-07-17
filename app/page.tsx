import { BulletinApp } from "@/components/scheduler/bulletin-app";
import { getBookings, getDepartments, getSpaces } from "@/lib/scheduler/data";

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

  return (
    <BulletinApp
      bookings={bookings}
      departments={departments}
      spaces={spaces}
    />
  );
}
