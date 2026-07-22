"use client";

import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  createBookingAction,
  updateBookingAction,
  type FormActionState,
} from "@/app/actions";
import type {
  AccessContext,
  ActivityType,
  Booking,
  Department,
  Space,
} from "@/lib/scheduler/types";
import {
  activityTypeAllowsOptionalSpace,
  activityTypes,
} from "@/lib/scheduler/types";

const initialState: FormActionState = { ok: false, message: "" };

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

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
  onSaved,
  spaces,
}: {
  access: AccessContext;
  accessCode: string;
  booking?: Booking;
  departments: Department[];
  onSaved?: (state: Extract<FormActionState, { ok: true }>) => void;
  spaces: Space[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const action = booking ? updateBookingAction : createBookingAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [selectedActivityType, setSelectedActivityType] = useState<ActivityType>(
    booking?.activityType ?? "Meeting",
  );
  const [warnDismissed, setWarnDismissed] = useState(false);
  const [blockedDismissed, setBlockedDismissed] = useState(false);
  const showDepartmentPicker = access.kind === "pastor";
  const spaceIsOptional = activityTypeAllowsOptionalSpace(selectedActivityType);

  useEffect(() => {
    if (state.ok === true) {
      router.refresh();
      onSaved?.(state);
    }
    if (state.ok === "warn") {
      setWarnDismissed(false);
    }
    if (state.ok === "blocked") {
      setBlockedDismissed(false);
    }
  }, [onSaved, router, state]);

  const conflictModal =
    state.ok === "warn" && !warnDismissed && typeof document !== "undefined"
      ? createPortal(
          <div className="bulletin-modal-backdrop" role="presentation">
            <div
              className="bulletin-access-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="conflict-modal-title"
            >
              <button
                type="button"
                className="bulletin-modal-close"
                onClick={() => setWarnDismissed(true)}
                aria-label="Close"
              >
                ×
              </button>
              <h2 id="conflict-modal-title">Activity at this time</h2>
              <p className="bulletin-conflict-modal-intro">
                Another department has something scheduled at the same time:
              </p>
              {state.conflicts.map((conflict, i) => (
                <div key={i} className="bulletin-conflict-item">
                  <strong>{conflict.activityName}</strong>
                  <span>
                    {conflict.departmentName} · {conflict.spaceName} ·{" "}
                    {formatTime(conflict.startAt)}–{formatTime(conflict.endAt)}
                  </span>
                </div>
              ))}
              <p className="bulletin-conflict-modal-hint">
                They are using a different space, so there is no room conflict.
                Confirm with administration if needed before submitting.
              </p>
              <button
                type="button"
                className="bulletin-primary"
                style={{ marginTop: 16 }}
                onClick={() => formRef.current?.requestSubmit()}
              >
                Submit anyway
              </button>
              <button
                type="button"
                className="bulletin-secondary-full"
                onClick={() => setWarnDismissed(true)}
              >
                Go back
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  const blockedModal =
    state.ok === "blocked" && !blockedDismissed && typeof document !== "undefined"
      ? createPortal(
          <div className="bulletin-modal-backdrop" role="presentation">
            <div
              className="bulletin-access-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="blocked-modal-title"
            >
              <button
                type="button"
                className="bulletin-modal-close"
                onClick={() => setBlockedDismissed(true)}
                aria-label="Close"
              >
                ×
              </button>
              <h2 id="blocked-modal-title">Activity not saved</h2>
              <p className="bulletin-conflict-modal-intro">{state.message}</p>
              <button
                type="button"
                className="bulletin-primary"
                style={{ marginTop: 16 }}
                onClick={() => setBlockedDismissed(true)}
              >
                OK
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {conflictModal}
      {blockedModal}
    <form
      ref={formRef}
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
        Activity name
        <input
          name="activityName"
          defaultValue={booking?.activityName ?? ""}
          required
        />
      </label>

      <label>
        Activity type
        <select
          name="activityType"
          value={selectedActivityType}
          onChange={(event) =>
            setSelectedActivityType(event.target.value as ActivityType)
          }
          required
        >
          {activityTypes.map((activityType) => (
            <option key={activityType} value={activityType}>
              {activityType}
            </option>
          ))}
        </select>
      </label>

      <label>
        {spaceIsOptional ? "Space (optional)" : "Space"}
        <select
          name="spaceId"
          defaultValue={booking?.spaceId ?? ""}
          required={!spaceIsOptional}
        >
          <option value="">
            {spaceIsOptional ? "No church space needed" : "Select space"}
          </option>
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

      {!booking ? (
        <label className="bulletin-check">
          <input name="repeatWeekly" type="checkbox" />
          <span>Repeat weekly for the next 12 weeks</span>
        </label>
      ) : null}

      {state.ok === "warn" ? (
        <input type="hidden" name="skipSoftConflict" value="true" />
      ) : null}

      {state.ok === false && state.message ? (
        <p className="bulletin-message error">{state.message}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="bulletin-primary"
      >
        {pending ? "Saving..." : booking ? "Update activity" : "Create activity"}
      </button>
    </form>
    </>
  );
}
