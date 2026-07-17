"use client";

import { useActionState } from "react";
import {
  createBookingAction,
  updateBookingAction,
  type FormActionState,
} from "@/app/actions";
import type {
  AccessContext,
  Booking,
  Department,
  Space,
} from "@/lib/scheduler/types";

const initialState: FormActionState = { ok: false, message: "" };

function toDateTimeInputValue(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function BookingForm({
  access,
  accessCode,
  booking,
  departments,
  spaces,
}: {
  access: AccessContext;
  accessCode: string;
  booking?: Booking;
  departments: Department[];
  spaces: Space[];
}) {
  const action = booking ? updateBookingAction : createBookingAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const showDepartmentPicker = access.kind === "pastor";

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="accessCode" value={accessCode} />
      {booking ? <input type="hidden" name="bookingId" value={booking.id} /> : null}

      {access.kind === "department" ? (
        <div>
          <p className="text-sm font-medium text-stone-700">Department</p>
          <p className="mt-1 rounded border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
            {access.departmentName}
          </p>
        </div>
      ) : null}

      {showDepartmentPicker ? (
        <label className="block text-sm font-medium text-stone-700">
          Department
          <select
            name="departmentId"
            className="mt-1 w-full rounded border border-stone-300 bg-white px-3 py-2"
            defaultValue={booking?.departmentId ?? ""}
            required
          >
            <option value="">Select department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="block text-sm font-medium text-stone-700">
        Activity
        <input
          name="activityName"
          className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
          defaultValue={booking?.activityName ?? ""}
          required
        />
      </label>

      <label className="block text-sm font-medium text-stone-700">
        Space
        <select
          name="spaceId"
          className="mt-1 w-full rounded border border-stone-300 bg-white px-3 py-2"
          defaultValue={booking?.spaceId ?? ""}
          required
        >
          <option value="">Select space</option>
          {spaces.map((space) => (
            <option key={space.id} value={space.id}>
              {space.name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-stone-700">
          Start
          <input
            name="startAt"
            type="datetime-local"
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
            defaultValue={toDateTimeInputValue(booking?.startAt)}
            required
          />
        </label>
        <label className="block text-sm font-medium text-stone-700">
          End
          <input
            name="endAt"
            type="datetime-local"
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
            defaultValue={toDateTimeInputValue(booking?.endAt)}
            required
          />
        </label>
      </div>

      {state.message ? (
        <p
          className={
            state.ok ? "text-sm text-teal-700" : "text-sm text-rose-700"
          }
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-stone-950 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-stone-800 disabled:opacity-60"
      >
        {pending ? "Saving..." : booking ? "Update booking" : "Create booking"}
      </button>
    </form>
  );
}
