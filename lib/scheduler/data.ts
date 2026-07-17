import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hashAccessCode } from "./access";
import { rangesOverlap, validateBookingInput } from "./validation";
import type {
  AccessContext,
  Booking,
  BookingFormInput,
  BookingStatus,
  Department,
  Space,
} from "./types";

export type ActionResult =
  | { ok: true; message: string; startAt?: string; status?: BookingStatus }
  | { ok: false; message: string };

type BookingRow = {
  id: string;
  department_id: string;
  space_id: string | null;
  activity_type: Booking["activityType"];
  activity_name: string;
  start_at: string;
  end_at: string;
  status: BookingStatus;
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
    spaceName: row.spaces?.name ?? "No space needed",
    activityType: row.activity_type,
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

  return "The activity could not be saved.";
}

type OccurrenceInput = {
  spaceId: string | null;
  startAt: string;
  endAt: string;
};

function buildOccurrences(input: BookingFormInput) {
  const repeatCount = input.repeatWeekly ? 12 : 1;
  const start = new Date(input.startAt);
  const end = new Date(input.endAt);

  return Array.from({ length: repeatCount }, (_, index): OccurrenceInput => {
    const occurrenceStart = new Date(start);
    const occurrenceEnd = new Date(end);
    occurrenceStart.setDate(start.getDate() + index * 7);
    occurrenceEnd.setDate(end.getDate() + index * 7);

    return {
      spaceId: input.spaceId || null,
      startAt: occurrenceStart.toISOString(),
      endAt: occurrenceEnd.toISOString(),
    };
  });
}

async function getConfirmedOverlaps(
  occurrences: OccurrenceInput[],
  bookingId?: string,
) {
  if (occurrences.length === 0) {
    return [];
  }

  const minStart = new Date(
    Math.min(...occurrences.map((occurrence) => new Date(occurrence.startAt).getTime())),
  ).toISOString();
  const maxEnd = new Date(
    Math.max(...occurrences.map((occurrence) => new Date(occurrence.endAt).getTime())),
  ).toISOString();

  let query = createServerSupabaseClient()
    .from("bookings")
    .select(
      `
      id,
      department_id,
      space_id,
      activity_type,
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
    .eq("status", "confirmed")
    .lt("start_at", maxEnd)
    .gt("end_at", minStart);

  if (bookingId) {
    query = query.neq("id", bookingId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data as unknown as BookingRow[]).filter((booking) =>
    occurrences.some((occurrence) =>
      rangesOverlap(
        new Date(occurrence.startAt),
        new Date(occurrence.endAt),
        new Date(booking.start_at),
        new Date(booking.end_at),
      ),
    ),
  );
}

function hasHardSpaceConflict(
  occurrences: OccurrenceInput[],
  bookings: BookingRow[],
) {
  return occurrences.some(
    (occurrence) =>
      occurrence.spaceId &&
      bookings.some(
        (booking) =>
          booking.space_id === occurrence.spaceId &&
          rangesOverlap(
            new Date(occurrence.startAt),
            new Date(occurrence.endAt),
            new Date(booking.start_at),
            new Date(booking.end_at),
          ),
      ),
  );
}

function hasSoftDepartmentConflict(
  occurrences: OccurrenceInput[],
  bookings: BookingRow[],
  departmentId: string,
) {
  return occurrences.some((occurrence) =>
    bookings.some(
      (booking) =>
        booking.department_id !== departmentId &&
        rangesOverlap(
          new Date(occurrence.startAt),
          new Date(occurrence.endAt),
          new Date(booking.start_at),
          new Date(booking.end_at),
        ),
    ),
  );
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
      activity_type,
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
  const occurrences = buildOccurrences(input);
  const overlappingBookings = await getConfirmedOverlaps(occurrences);

  if (hasHardSpaceConflict(occurrences, overlappingBookings)) {
    return { ok: false, message: "That space is unavailable for the selected time." };
  }

  const status: BookingStatus = hasSoftDepartmentConflict(
    occurrences,
    overlappingBookings,
    departmentId,
  )
    ? "pending"
    : "confirmed";

  const { error } = await supabase.from("bookings").insert(
    occurrences.map((occurrence) => ({
      department_id: departmentId,
      space_id: occurrence.spaceId,
      activity_type: input.activityType,
      activity_name: input.activityName.trim(),
      start_at: occurrence.startAt,
      end_at: occurrence.endAt,
      status,
    })),
  );

  if (error) {
    return { ok: false, message: conflictMessage(error) };
  }

  if (status === "pending") {
    return {
      ok: true,
      message:
        "Activity saved as pending because another department has an activity at that time. Confirm it after clarifying off-app.",
      startAt: occurrences[0]?.startAt,
      status,
    };
  }

  return {
    ok: true,
    message: input.repeatWeekly
      ? "12 weekly activities created."
      : "Activity created.",
    startAt: occurrences[0]?.startAt,
    status,
  };
}

export async function updateBooking(
  input: BookingFormInput,
): Promise<ActionResult> {
  const validation = validateBookingInput(input);

  if (!validation.ok) {
    return validation;
  }

  if (!input.bookingId) {
    return { ok: false, message: "Activity is required." };
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
    return { ok: false, message: "Activity was not found." };
  }

  if (
    access.kind === "department" &&
    existing.department_id !== access.departmentId
  ) {
    return {
      ok: false,
      message: "You can only edit your department's activities.",
    };
  }

  const departmentId =
    access.kind === "department" ? access.departmentId : input.departmentId;

  if (!departmentId) {
    return { ok: false, message: "Department is required." };
  }

  const occurrences = buildOccurrences({ ...input, repeatWeekly: false });
  const overlappingBookings = await getConfirmedOverlaps(
    occurrences,
    input.bookingId,
  );

  if (hasHardSpaceConflict(occurrences, overlappingBookings)) {
    return { ok: false, message: "That space is unavailable for the selected time." };
  }

  const status: BookingStatus = hasSoftDepartmentConflict(
    occurrences,
    overlappingBookings,
    departmentId,
  )
    ? "pending"
    : "confirmed";

  const { error } = await supabase
    .from("bookings")
    .update({
      department_id: departmentId,
      space_id: input.spaceId || null,
      activity_type: input.activityType,
      activity_name: input.activityName.trim(),
      start_at: input.startAt,
      end_at: input.endAt,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.bookingId);

  if (error) {
    return { ok: false, message: conflictMessage(error) };
  }

  return {
    ok: true,
    message:
      status === "pending"
        ? "Activity updated and moved to pending because another department has an activity at that time."
        : "Activity updated.",
    startAt: input.startAt,
    status,
  };
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
    return { ok: false, message: "Activity was not found." };
  }

  if (
    access.kind === "department" &&
    existing.department_id !== access.departmentId
  ) {
    return {
      ok: false,
      message: "You can only cancel your department's activities.",
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
    return { ok: false, message: "The activity could not be cancelled." };
  }

  return { ok: true, message: "Activity cancelled." };
}

export async function confirmBooking(
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
    .select("department_id, space_id, start_at, end_at")
    .eq("id", bookingId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (!existing) {
    return { ok: false, message: "Activity was not found." };
  }

  if (
    access.kind === "department" &&
    existing.department_id !== access.departmentId
  ) {
    return {
      ok: false,
      message: "You can only confirm your department's activities.",
    };
  }

  const occurrence = {
    spaceId: existing.space_id || null,
    startAt: existing.start_at,
    endAt: existing.end_at,
  };
  const overlappingBookings = await getConfirmedOverlaps([occurrence], bookingId);

  if (hasHardSpaceConflict([occurrence], overlappingBookings)) {
    return { ok: false, message: "That space is unavailable for the selected time." };
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "confirmed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (error) {
    return { ok: false, message: "The activity could not be confirmed." };
  }

  return {
    ok: true,
    message: "Activity confirmed.",
    startAt: existing.start_at,
    status: "confirmed",
  };
}
