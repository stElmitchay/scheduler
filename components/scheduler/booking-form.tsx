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
      className="bulletin-form"
    >
      <input type="hidden" name="accessCode" value={accessCode} />
      {booking ? <input type="hidden" name="bookingId" value={booking.id} /> : null}

      {access.kind === "department" ? (
        <div className="bulletin-note">
          <strong>Department</strong>
          <p>
            {access.departmentName}
          </p>
        </div>
      ) : null}

      {showDepartmentPicker ? (
        <label>
          Department
          <select
            name="departmentId"
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

      <label>
        Activity
        <input
          name="activityName"
          defaultValue={booking?.activityName ?? ""}
          required
        />
      </label>

      <label>
        Space
        <select
          name="spaceId"
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

      <div className="bulletin-form-grid">
        <label>
          Start
          <input
            name="startAt"
            type="datetime-local"
            defaultValue={toDateTimeInputValue(booking?.startAt)}
            required
          />
        </label>
        <label>
          End
          <input
            name="endAt"
            type="datetime-local"
            defaultValue={toDateTimeInputValue(booking?.endAt)}
            required
          />
        </label>
      </div>

      {state.message ? (
        <p
          className={
            state.ok ? "bulletin-message" : "bulletin-message error"
          }
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="bulletin-primary"
      >
        {pending ? "Saving..." : booking ? "Update booking" : "Create booking"}
      </button>
    </form>
  );
}
