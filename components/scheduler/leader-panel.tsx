"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  cancelBookingAction,
  unlockAccessAction,
  type AccessActionState,
  type FormActionState,
} from "@/app/actions";
import type {
  AccessContext,
  Booking,
  Department,
  Space,
} from "@/lib/scheduler/types";
import { BookingForm } from "./booking-form";

const initialCancelState: FormActionState = { ok: false, message: "" };
const initialAccessState: AccessActionState = {
  ok: false,
  message: "",
  access: null,
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function LeaderPanel({
  bookings,
  departments,
  spaces,
}: {
  bookings: Booking[];
  departments: Department[];
  spaces: Space[];
}) {
  const [accessCode, setAccessCode] = useState("");
  const [activeCode, setActiveCode] = useState("");
  const [activeAccess, setActiveAccess] = useState<AccessContext | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const pendingCode = useRef("");
  const [unlockState, unlockAction, unlockPending] = useActionState(
    unlockAccessAction,
    initialAccessState,
  );
  const [cancelState, cancelAction, cancelPending] = useActionState(
    cancelBookingAction,
    initialCancelState,
  );

  useEffect(() => {
    if (unlockState.ok && unlockState.access) {
      setActiveCode(pendingCode.current);
      setActiveAccess(unlockState.access);
      setEditingId(null);
    }
  }, [unlockState]);

  const editableBookings = useMemo(() => {
    if (!activeAccess) {
      return [];
    }

    return bookings.filter((booking) => {
      if (booking.status !== "confirmed") {
        return false;
      }

      if (activeAccess.kind === "pastor") {
        return true;
      }

      return booking.departmentId === activeAccess.departmentId;
    });
  }, [activeAccess, bookings]);

  const editingBooking = editableBookings.find(
    (booking) => booking.id === editingId,
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-amber-700">
            Leader access
          </p>
          <h2 className="text-xl font-semibold text-stone-950">
            Manage bookings
          </h2>
        </div>
        {activeAccess ? (
          <p className="rounded border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
            {activeAccess.kind === "pastor"
              ? "Branch pastor"
              : activeAccess.departmentName}
          </p>
        ) : null}
      </div>

      <form
        action={unlockAction}
        className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:flex-row"
        onSubmit={() => {
          pendingCode.current = accessCode;
        }}
      >
        <input
          name="accessCode"
          value={accessCode}
          onChange={(event) => setAccessCode(event.target.value)}
          className="min-w-0 flex-1 rounded border border-stone-300 px-3 py-2"
          aria-label="Access code"
        />
        <button
          className="rounded bg-stone-950 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-stone-800 disabled:opacity-60"
          disabled={unlockPending}
        >
          {unlockPending ? "Checking..." : "Unlock"}
        </button>
      </form>

      {unlockState.message ? (
        <p
          className={
            unlockState.ok ? "text-sm text-teal-700" : "text-sm text-rose-700"
          }
        >
          {unlockState.message}
        </p>
      ) : null}

      {activeAccess ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,440px)]">
          <div className="space-y-3">
            <h3 className="font-semibold text-stone-950">
              {editingBooking ? "Edit booking" : "Create booking"}
            </h3>
            <BookingForm
              access={activeAccess}
              accessCode={activeCode}
              booking={editingBooking}
              departments={departments}
              spaces={spaces}
            />
            {editingBooking ? (
              <button
                className="rounded border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 shadow-sm"
                onClick={() => setEditingId(null)}
                type="button"
              >
                Stop editing
              </button>
            ) : null}
          </div>

          <div className="space-y-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-stone-950">Editable bookings</h3>
            {editableBookings.length === 0 ? (
              <p className="text-sm text-stone-500">No editable bookings.</p>
            ) : (
              editableBookings.map((booking) => (
                <article
                  key={booking.id}
                  className="space-y-2 border-t border-stone-200 py-3 first:border-t-0 first:pt-0"
                >
                  <div>
                    <p className="font-medium text-stone-950">
                      {booking.activityName}
                    </p>
                    <p className="text-sm text-stone-600">
                      {booking.departmentName} - {booking.spaceName}
                    </p>
                    <p className="text-sm text-stone-500">
                      {formatDateTime(booking.startAt)} -{" "}
                      {formatDateTime(booking.endAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded border border-stone-300 px-3 py-1 text-sm text-stone-700"
                      onClick={() => setEditingId(booking.id)}
                    >
                      Edit
                    </button>
                    <form action={cancelAction}>
                      <input type="hidden" name="accessCode" value={activeCode} />
                      <input type="hidden" name="bookingId" value={booking.id} />
                      <button
                        type="submit"
                        disabled={cancelPending}
                        className="rounded border border-rose-300 px-3 py-1 text-sm text-rose-700 disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </form>
                  </div>
                </article>
              ))
            )}
            {cancelState.message ? (
              <p
                className={
                  cancelState.ok
                    ? "text-sm text-teal-700"
                    : "text-sm text-rose-700"
                }
              >
                {cancelState.message}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
