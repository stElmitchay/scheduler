import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hashAccessCode } from "./access";
import { validateBookingInput } from "./validation";
import type {
  AccessContext,
  Booking,
  BookingFormInput,
  Department,
  Space,
} from "./types";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

type BookingRow = {
  id: string;
  department_id: string;
  space_id: string;
  activity_name: string;
  start_at: string;
  end_at: string;
  status: "confirmed" | "cancelled";
  created_at: string;
  updated_at: string;
  departments: { name: string } | null;
  spaces: { name: string } | null;
};

type SupabaseMutationError = {
  code?: string;
  message: string;
};

function mapBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    departmentId: row.department_id,
    departmentName: row.departments?.name ?? "Unknown department",
    spaceId: row.space_id,
    spaceName: row.spaces?.name ?? "Unknown space",
    activityName: row.activity_name,
    startAt: row.start_at,
    endAt: row.end_at,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function conflictMessage(error: SupabaseMutationError) {
  if (
    error.code === "23P01" ||
    error.message.includes("bookings_no_confirmed_overlap")
  ) {
    return "That space is unavailable for the selected time.";
  }

  return "The booking could not be saved.";
}

export async function getSpaces(): Promise<Space[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("spaces")
    .select("id, name")
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getDepartments(): Promise<Department[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("departments")
    .select("id, name")
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getBookings(): Promise<Booking[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      department_id,
      space_id,
      activity_name,
      start_at,
      end_at,
      status,
      created_at,
      updated_at,
      departments(name),
      spaces(name)
    `,
    )
    .order("start_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as unknown as BookingRow[]).map(mapBooking);
}

export async function resolveAccessCode(
  code: string,
): Promise<AccessContext | null> {
  const codeHash = hashAccessCode(code);
  const supabase = createServerSupabaseClient();

  const { data: department, error: departmentError } = await supabase
    .from("departments")
    .select("id, name")
    .eq("access_code_hash", codeHash)
    .maybeSingle();

  if (departmentError) {
    throw new Error(departmentError.message);
  }

  if (department) {
    return {
      kind: "department",
      departmentId: department.id,
      departmentName: department.name,
    };
  }

  const { data: settings, error: settingsError } = await supabase
    .from("app_settings")
    .select("pastor_access_code_hash")
    .eq("id", true)
    .maybeSingle();

  if (settingsError) {
    throw new Error(settingsError.message);
  }

  if (settings?.pastor_access_code_hash === codeHash) {
    return { kind: "pastor" };
  }

  return null;
}

export async function createBooking(
  input: BookingFormInput,
): Promise<ActionResult> {
  const validation = validateBookingInput(input);

  if (!validation.ok) {
    return validation;
  }

  const access = await resolveAccessCode(input.accessCode);

  if (!access) {
    return { ok: false, message: "Invalid access code." };
  }

  const departmentId =
    access.kind === "department" ? access.departmentId : input.departmentId;

  if (!departmentId) {
    return { ok: false, message: "Department is required." };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("bookings").insert({
    department_id: departmentId,
    space_id: input.spaceId,
    activity_name: input.activityName.trim(),
    start_at: input.startAt,
    end_at: input.endAt,
    status: "confirmed",
  });

  if (error) {
    return { ok: false, message: conflictMessage(error) };
  }

  return { ok: true, message: "Booking created." };
}

export async function updateBooking(
  input: BookingFormInput,
): Promise<ActionResult> {
  const validation = validateBookingInput(input);

  if (!validation.ok) {
    return validation;
  }

  if (!input.bookingId) {
    return { ok: false, message: "Booking is required." };
  }

  const access = await resolveAccessCode(input.accessCode);

  if (!access) {
    return { ok: false, message: "Invalid access code." };
  }

  const supabase = createServerSupabaseClient();
  const { data: existing, error: existingError } = await supabase
    .from("bookings")
    .select("department_id")
    .eq("id", input.bookingId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (!existing) {
    return { ok: false, message: "Booking was not found." };
  }

  if (
    access.kind === "department" &&
    existing.department_id !== access.departmentId
  ) {
    return {
      ok: false,
      message: "You can only edit your department's bookings.",
    };
  }

  const departmentId =
    access.kind === "department" ? access.departmentId : input.departmentId;

  if (!departmentId) {
    return { ok: false, message: "Department is required." };
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      department_id: departmentId,
      space_id: input.spaceId,
      activity_name: input.activityName.trim(),
      start_at: input.startAt,
      end_at: input.endAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.bookingId);

  if (error) {
    return { ok: false, message: conflictMessage(error) };
  }

  return { ok: true, message: "Booking updated." };
}

export async function cancelBooking(
  accessCode: string,
  bookingId: string,
): Promise<ActionResult> {
  const access = await resolveAccessCode(accessCode);

  if (!access) {
    return { ok: false, message: "Invalid access code." };
  }

  const supabase = createServerSupabaseClient();
  const { data: existing, error: existingError } = await supabase
    .from("bookings")
    .select("department_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (!existing) {
    return { ok: false, message: "Booking was not found." };
  }

  if (
    access.kind === "department" &&
    existing.department_id !== access.departmentId
  ) {
    return {
      ok: false,
      message: "You can only cancel your department's bookings.",
    };
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (error) {
    return { ok: false, message: "The booking could not be cancelled." };
  }

  return { ok: true, message: "Booking cancelled." };
}
