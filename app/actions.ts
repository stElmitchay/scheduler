"use server";

import { revalidatePath } from "next/cache";
import {
  cancelBooking,
  confirmBooking,
  createBooking,
  resolveAccessCode,
  updateBooking,
} from "@/lib/scheduler/data";
import type {
  AccessContext,
  ActivityType,
  BookingFormInput,
  BookingStatus,
  ConflictInfo,
} from "@/lib/scheduler/types";

export type FormActionState =
  | { ok: true; message: string; startAt?: string; status?: BookingStatus }
  | { ok: "warn"; message: string; conflicts: ConflictInfo[] }
  | { ok: false; message: string };

export type AccessActionState =
  | {
      ok: true;
      message: string;
      access: AccessContext;
    }
  | {
      ok: false;
      message: string;
      access: null;
    };

const initialError: FormActionState = {
  ok: false,
  message: "The request could not be completed.",
};

function value(formData: FormData, key: string) {
  const fieldValue = formData.get(key);
  return typeof fieldValue === "string" ? fieldValue : "";
}

function readBookingInput(formData: FormData): BookingFormInput {
  return {
    accessCode: value(formData, "accessCode"),
    departmentId: value(formData, "departmentId") || undefined,
    bookingId: value(formData, "bookingId") || undefined,
    spaceId: value(formData, "spaceId"),
    activityType: value(formData, "activityType") as ActivityType,
    activityName: value(formData, "activityName"),
    startAt: value(formData, "startAt"),
    endAt: value(formData, "endAt"),
    repeatWeekly: value(formData, "repeatWeekly") === "on",
    skipSoftConflict: value(formData, "skipSoftConflict") === "true",
  };
}

export async function unlockAccessAction(
  _previousState: AccessActionState,
  formData: FormData,
): Promise<AccessActionState> {
  const accessCode = value(formData, "accessCode");

  if (!accessCode.trim()) {
    return {
      ok: false,
      message: "Access code is required.",
      access: null,
    };
  }

  const access = await resolveAccessCode(accessCode);

  if (!access) {
    return {
      ok: false,
      message: "Invalid access code.",
      access: null,
    };
  }

  return {
    ok: true,
    message:
      access.kind === "pastor"
        ? "Branch pastor access unlocked."
        : `${access.departmentName} access unlocked.`,
    access,
  };
}

export async function createBookingAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const result = await createBooking(readBookingInput(formData));

  if (result.ok === true) {
    revalidatePath("/");
  }

  return result;
}

export async function updateBookingAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const result = await updateBooking(readBookingInput(formData));

  if (result.ok === true) {
    revalidatePath("/");
  }

  return result;
}

export async function cancelBookingAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const accessCode = value(formData, "accessCode");
  const bookingId = value(formData, "bookingId");

  if (!accessCode || !bookingId) {
    return initialError;
  }

  const result = await cancelBooking(accessCode, bookingId);

  if (result.ok === true) {
    revalidatePath("/");
  }

  return result;
}

export async function confirmBookingAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const accessCode = value(formData, "accessCode");
  const bookingId = value(formData, "bookingId");

  if (!accessCode || !bookingId) {
    return initialError;
  }

  const result = await confirmBooking(accessCode, bookingId);

  if (result.ok === true) {
    revalidatePath("/");
  }

  return result;
}
