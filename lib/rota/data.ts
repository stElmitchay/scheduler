import crypto from "node:crypto";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { FilledSlot } from "./auto-assign.mjs";
import type {
  PeriodPayload,
  RotaAssignment,
  RotaOccurrence,
  RotaPayload,
  RotaPeriod,
  RotaPeriodStatus,
  RotaPerson,
  RotaService,
  RotaSettings,
} from "./types";

const UNIQUE_VIOLATION = "23505";

function newShareSlug() {
  return crypto.randomBytes(8).toString("hex");
}

function monthBounds(month: string) {
  const start = new Date(`${month}T00:00:00`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  const historyStart = new Date(start);
  historyStart.setDate(historyStart.getDate() - 28);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    historyStart: historyStart.toISOString(),
  };
}

function monthKeyFromDate(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

async function ensureSettings(departmentId: string): Promise<RotaSettings> {
  const supabase = createServerSupabaseClient();

  const { data: existing, error: readError } = await supabase
    .from("rota_settings")
    .select("department_id, share_slug, max_serves_per_month")
    .eq("department_id", departmentId)
    .maybeSingle();

  if (readError) {
    throw new Error(readError.message);
  }

  if (existing) {
    return {
      departmentId: existing.department_id,
      shareSlug: existing.share_slug,
      maxServesPerMonth: existing.max_serves_per_month,
    };
  }

  const { data: created, error: insertError } = await supabase
    .from("rota_settings")
    .insert({ department_id: departmentId, share_slug: newShareSlug() })
    .select("department_id, share_slug, max_serves_per_month")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return {
    departmentId: created.department_id,
    shareSlug: created.share_slug,
    maxServesPerMonth: created.max_serves_per_month,
  };
}

// The setup dropdown only ever offers these values, so rota_service.service_name
// cannot drift out of sync with bookings.activity_name through a typo.
async function getServiceNameOptions(): Promise<string[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("activity_name")
    .eq("activity_type", "Service")
    .eq("status", "confirmed");

  if (error) {
    throw new Error(error.message);
  }

  return Array.from(new Set(data.map((row) => row.activity_name))).sort();
}

export async function getRotaPayload(
  departmentId: string,
): Promise<RotaPayload> {
  const supabase = createServerSupabaseClient();
  const settings = await ensureSettings(departmentId);

  const { data: department, error: departmentError } = await supabase
    .from("departments")
    .select("name")
    .eq("id", departmentId)
    .single();

  if (departmentError) {
    throw new Error(departmentError.message);
  }

  const departmentName = department.name;

  const [servicesResult, peopleResult, periodsResult, serviceNameOptions] =
    await Promise.all([
      supabase
        .from("rota_service")
        .select(
          "id, department_id, service_name, rota_role(id, rota_service_id, name, slot_count, sort_order)",
        )
        .eq("department_id", departmentId)
        .order("service_name"),
      supabase
        .from("rota_person")
        .select(
          "id, department_id, name, is_active, rota_unavailability(id, rota_person_id, start_date, end_date)",
        )
        .eq("department_id", departmentId)
        .order("name"),
      supabase
        .from("rota_period")
        .select("id, department_id, month, status, published_at")
        .eq("department_id", departmentId)
        .order("month", { ascending: false }),
      getServiceNameOptions(),
    ]);

  for (const result of [servicesResult, peopleResult, periodsResult]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const services: RotaService[] = (servicesResult.data ?? []).map((row) => ({
    id: row.id,
    departmentId: row.department_id,
    serviceName: row.service_name,
    roles: (row.rota_role ?? [])
      .map((role) => ({
        id: role.id,
        rotaServiceId: role.rota_service_id,
        name: role.name,
        slotCount: role.slot_count,
        sortOrder: role.sort_order,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
  }));

  const people: RotaPerson[] = (peopleResult.data ?? []).map((row) => ({
    id: row.id,
    departmentId: row.department_id,
    name: row.name,
    isActive: row.is_active,
    unavailability: (row.rota_unavailability ?? []).map((range) => ({
      id: range.id,
      rotaPersonId: range.rota_person_id,
      startDate: range.start_date,
      endDate: range.end_date,
    })),
  }));

  const periods: RotaPeriod[] = (periodsResult.data ?? []).map((row) => ({
    id: row.id,
    departmentId: row.department_id,
    month: row.month,
    status: row.status as RotaPeriodStatus,
    publishedAt: row.published_at,
  }));

  return {
    departmentId,
    departmentName,
    settings,
    services,
    people,
    periods,
    serviceNameOptions,
  };
}

// Removing a role, or shrinking one, would orphan any assignment pointing at a
// slot that disappears. Refuse and name the dates instead of cascading silently.
async function assertNoOrphanedSlots(
  roleId: string,
  roleName: string,
  keptSlotCount: number,
) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("rota_assignment")
    .select("booking_id, bookings(start_at)")
    .eq("rota_role_id", roleId)
    .gte("slot_index", keptSlotCount);

  if (error) {
    throw new Error(error.message);
  }

  if (data.length === 0) {
    return;
  }

  const dates = Array.from(
    new Set(
      data.map((row) =>
        String(
          (row as unknown as { bookings?: { start_at: string } }).bookings
            ?.start_at ?? "",
        ).slice(0, 10),
      ),
    ),
  )
    .filter(Boolean)
    .sort();

  throw new Error(
    `"${roleName}" still has people assigned on ${dates.join(", ")}. Clear those slots first.`,
  );
}

export async function saveService(
  departmentId: string,
  input: {
    id?: string;
    serviceName: string;
    roles: { id?: string; name: string; slotCount: number; sortOrder: number }[];
  },
): Promise<void> {
  const supabase = createServerSupabaseClient();

  const { data: service, error: serviceError } = await supabase
    .from("rota_service")
    .upsert(
      {
        ...(input.id ? { id: input.id } : {}),
        department_id: departmentId,
        service_name: input.serviceName,
      },
      { onConflict: "department_id,service_name" },
    )
    .select("id")
    .single();

  if (serviceError) {
    throw new Error(serviceError.message);
  }

  const { data: existingRoles, error: rolesError } = await supabase
    .from("rota_role")
    .select("id, name, slot_count")
    .eq("rota_service_id", service.id);

  if (rolesError) {
    throw new Error(rolesError.message);
  }

  for (const role of existingRoles) {
    const replacement = input.roles.find((entry) => entry.id === role.id);
    const nextCount = replacement ? replacement.slotCount : 0;

    if (nextCount < role.slot_count) {
      await assertNoOrphanedSlots(role.id, role.name, nextCount);
    }
  }

  const keptIds = new Set(
    input.roles.map((role) => role.id).filter(Boolean) as string[],
  );
  const removed = existingRoles.filter((role) => !keptIds.has(role.id));

  if (removed.length > 0) {
    const { error } = await supabase
      .from("rota_role")
      .delete()
      .in(
        "id",
        removed.map((role) => role.id),
      );

    if (error) {
      throw new Error(error.message);
    }
  }

  // Existing and new roles are written separately. PostgREST rejects a bulk
  // write whose objects do not all carry the same keys, so a batch mixing rows
  // that have an id with rows that do not fails outright.
  const updated = input.roles.filter((role) => role.id);
  const inserted = input.roles.filter((role) => !role.id);

  if (updated.length > 0) {
    const { error } = await supabase.from("rota_role").upsert(
      updated.map((role) => ({
        id: role.id,
        rota_service_id: service.id,
        name: role.name.trim(),
        slot_count: role.slotCount,
        sort_order: role.sortOrder,
      })),
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  if (inserted.length > 0) {
    const { error } = await supabase.from("rota_role").insert(
      inserted.map((role) => ({
        rota_service_id: service.id,
        name: role.name.trim(),
        slot_count: role.slotCount,
        sort_order: role.sortOrder,
      })),
    );

    if (error) {
      throw new Error(error.message);
    }
  }
}

export async function deleteService(
  departmentId: string,
  serviceId: string,
): Promise<void> {
  const supabase = createServerSupabaseClient();

  const { data: roles, error: rolesError } = await supabase
    .from("rota_role")
    .select("id, name")
    .eq("rota_service_id", serviceId);

  if (rolesError) {
    throw new Error(rolesError.message);
  }

  for (const role of roles) {
    await assertNoOrphanedSlots(role.id, role.name, 0);
  }

  const { error } = await supabase
    .from("rota_service")
    .delete()
    .eq("id", serviceId)
    .eq("department_id", departmentId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function savePerson(
  departmentId: string,
  input: { id?: string; name: string; isActive: boolean },
): Promise<void> {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase.from("rota_person").upsert({
    ...(input.id ? { id: input.id } : {}),
    department_id: departmentId,
    name: input.name.trim(),
    is_active: input.isActive,
  });

  if (error) {
    throw new Error(
      error.code === UNIQUE_VIOLATION
        ? "Someone with that name is already on the list."
        : error.message,
    );
  }
}

export async function deletePerson(
  departmentId: string,
  personId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createServerSupabaseClient();

  const { count, error: countError } = await supabase
    .from("rota_assignment")
    .select("id", { count: "exact", head: true })
    .eq("rota_person_id", personId);

  if (countError) {
    throw new Error(countError.message);
  }

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      message:
        "This person has served before. Set them to on break instead of deleting them.",
    };
  }

  const { error } = await supabase
    .from("rota_person")
    .delete()
    .eq("id", personId)
    .eq("department_id", departmentId);

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true };
}

async function assertOwnsPerson(departmentId: string, personId: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("rota_person")
    .select("id")
    .eq("id", personId)
    .eq("department_id", departmentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("That person is not on your team.");
  }
}

export async function saveUnavailability(
  departmentId: string,
  personId: string,
  startDate: string,
  endDate: string,
): Promise<void> {
  await assertOwnsPerson(departmentId, personId);

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("rota_unavailability").insert({
    rota_person_id: personId,
    start_date: startDate,
    end_date: endDate,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteUnavailability(
  departmentId: string,
  id: string,
): Promise<void> {
  const supabase = createServerSupabaseClient();

  const { data, error: readError } = await supabase
    .from("rota_unavailability")
    .select("rota_person_id")
    .eq("id", id)
    .maybeSingle();

  if (readError) {
    throw new Error(readError.message);
  }

  if (!data) {
    return;
  }

  await assertOwnsPerson(departmentId, data.rota_person_id);

  const { error } = await supabase
    .from("rota_unavailability")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function saveSettings(
  departmentId: string,
  maxServesPerMonth: number,
): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("rota_settings")
    .update({ max_serves_per_month: maxServesPerMonth })
    .eq("department_id", departmentId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function rotateShareSlug(departmentId: string): Promise<string> {
  const supabase = createServerSupabaseClient();
  const shareSlug = newShareSlug();

  const { error } = await supabase
    .from("rota_settings")
    .update({ share_slug: shareSlug })
    .eq("department_id", departmentId);

  if (error) {
    throw new Error(error.message);
  }

  return shareSlug;
}

export async function monthOfBooking(bookingId: string): Promise<string> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("start_at")
    .eq("id", bookingId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return monthKeyFromDate(data.start_at);
}

export async function openPeriod(
  departmentId: string,
  month: string,
): Promise<PeriodPayload> {
  const supabase = createServerSupabaseClient();
  const { start, end, historyStart } = monthBounds(month);

  const { data: periodRow, error: periodError } = await supabase
    .from("rota_period")
    .upsert(
      { department_id: departmentId, month },
      { onConflict: "department_id,month" },
    )
    .select("id, department_id, month, status, published_at")
    .single();

  if (periodError) {
    throw new Error(periodError.message);
  }

  const period: RotaPeriod = {
    id: periodRow.id,
    departmentId: periodRow.department_id,
    month: periodRow.month,
    status: periodRow.status as RotaPeriodStatus,
    publishedAt: periodRow.published_at,
  };

  const { data: services, error: servicesError } = await supabase
    .from("rota_service")
    .select("id, service_name")
    .eq("department_id", departmentId);

  if (servicesError) {
    throw new Error(servicesError.message);
  }

  // Without this, .in("activity_name", []) matches nothing in a way that reads
  // like a bug during first-time setup.
  if (services.length === 0) {
    return {
      period,
      occurrences: [],
      assignments: [],
      historyOccurrences: [],
      historyAssignments: [],
    };
  }

  const serviceIdByName = new Map(
    services.map((service) => [service.service_name, service.id]),
  );

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("id, activity_name, start_at")
    .eq("status", "confirmed")
    .eq("activity_type", "Service")
    .in("activity_name", [...serviceIdByName.keys()])
    .gte("start_at", historyStart)
    .lt("start_at", end)
    .order("start_at", { ascending: true });

  if (bookingsError) {
    throw new Error(bookingsError.message);
  }

  const all: RotaOccurrence[] = bookings.map((row) => ({
    bookingId: row.id,
    rotaServiceId: serviceIdByName.get(row.activity_name)!,
    serviceName: row.activity_name,
    startAt: row.start_at,
  }));

  const occurrences = all.filter((occurrence) => occurrence.startAt >= start);
  const historyOccurrences = all.filter(
    (occurrence) => occurrence.startAt < start,
  );

  if (all.length === 0) {
    return {
      period,
      occurrences,
      assignments: [],
      historyOccurrences,
      historyAssignments: [],
    };
  }

  const { data: assignmentRows, error: assignmentsError } = await supabase
    .from("rota_assignment")
    .select("id, booking_id, rota_role_id, slot_index, rota_person_id")
    .in(
      "booking_id",
      all.map((occurrence) => occurrence.bookingId),
    );

  if (assignmentsError) {
    throw new Error(assignmentsError.message);
  }

  const monthBookingIds = new Set(
    occurrences.map((occurrence) => occurrence.bookingId),
  );
  const mapped: RotaAssignment[] = assignmentRows.map((row) => ({
    id: row.id,
    bookingId: row.booking_id,
    rotaRoleId: row.rota_role_id,
    slotIndex: row.slot_index,
    rotaPersonId: row.rota_person_id,
  }));

  return {
    period,
    occurrences,
    assignments: mapped.filter((assignment) =>
      monthBookingIds.has(assignment.bookingId),
    ),
    historyOccurrences,
    historyAssignments: mapped.filter(
      (assignment) => !monthBookingIds.has(assignment.bookingId),
    ),
  };
}

export async function setAssignment(
  departmentId: string,
  bookingId: string,
  rotaRoleId: string,
  slotIndex: number,
  rotaPersonId: string | null,
): Promise<void> {
  const supabase = createServerSupabaseClient();

  if (rotaPersonId === null) {
    const { error } = await supabase
      .from("rota_assignment")
      .delete()
      .eq("booking_id", bookingId)
      .eq("rota_role_id", rotaRoleId)
      .eq("slot_index", slotIndex);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { data: role, error: roleError } = await supabase
    .from("rota_role")
    .select("id, slot_count, rota_service!inner(department_id)")
    .eq("id", rotaRoleId)
    .maybeSingle();

  if (roleError) {
    throw new Error(roleError.message);
  }

  const roleDepartmentId = (
    role as unknown as { rota_service?: { department_id: string } } | null
  )?.rota_service?.department_id;

  if (!role || roleDepartmentId !== departmentId) {
    throw new Error("That role is not part of your rota.");
  }

  if (slotIndex >= role.slot_count) {
    throw new Error("That slot no longer exists on this role.");
  }

  await assertOwnsPerson(departmentId, rotaPersonId);

  const month = await monthOfBooking(bookingId);

  const { data: period, error: periodError } = await supabase
    .from("rota_period")
    .select("id, month")
    .eq("department_id", departmentId)
    .eq("month", month)
    .maybeSingle();

  if (periodError) {
    throw new Error(periodError.message);
  }

  if (!period) {
    throw new Error("Open that month before assigning people to it.");
  }

  const { error } = await supabase.from("rota_assignment").upsert(
    {
      rota_period_id: period.id,
      booking_id: bookingId,
      rota_role_id: rotaRoleId,
      slot_index: slotIndex,
      rota_person_id: rotaPersonId,
    },
    { onConflict: "booking_id,rota_role_id,slot_index" },
  );

  if (error) {
    throw new Error(
      error.code === UNIQUE_VIOLATION
        ? "That person is already serving at this service."
        : error.message,
    );
  }
}

export async function setPeriodStatus(
  departmentId: string,
  month: string,
  status: RotaPeriodStatus,
): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("rota_period")
    .update({
      status,
      published_at: status === "published" ? new Date().toISOString() : null,
    })
    .eq("department_id", departmentId)
    .eq("month", month);

  if (error) {
    throw new Error(error.message);
  }
}

export async function replaceAssignments(
  departmentId: string,
  month: string,
  filled: FilledSlot[],
): Promise<void> {
  if (filled.length === 0) {
    return;
  }

  const supabase = createServerSupabaseClient();

  const { data: period, error: periodError } = await supabase
    .from("rota_period")
    .select("id")
    .eq("department_id", departmentId)
    .eq("month", month)
    .maybeSingle();

  if (periodError) {
    throw new Error(periodError.message);
  }

  if (!period) {
    throw new Error("Open that month before generating a rota for it.");
  }

  const { error } = await supabase.from("rota_assignment").insert(
    filled.map((slot) => ({
      rota_period_id: period.id,
      booking_id: slot.bookingId,
      rota_role_id: slot.rotaRoleId,
      slot_index: slot.slotIndex,
      rota_person_id: slot.rotaPersonId,
    })),
  );

  if (error) {
    throw new Error(error.message);
  }
}

export type PublicRota = {
  departmentName: string;
  periods: {
    month: string;
    days: {
      dateKey: string;
      services: {
        serviceName: string;
        startAt: string;
        roles: { roleName: string; people: string[] }[];
      }[];
    }[];
  }[];
};

export async function getPublicRota(
  slug: string,
): Promise<PublicRota | null> {
  const supabase = createServerSupabaseClient();

  const { data: settings, error: settingsError } = await supabase
    .from("rota_settings")
    .select("department_id, departments(name)")
    .eq("share_slug", slug)
    .maybeSingle();

  if (settingsError) {
    throw new Error(settingsError.message);
  }

  if (!settings) {
    return null;
  }

  const departmentId = settings.department_id;
  const departmentName =
    (settings as unknown as { departments?: { name: string } }).departments
      ?.name ?? "Serving rota";

  const { data: periods, error: periodsError } = await supabase
    .from("rota_period")
    .select("month")
    .eq("department_id", departmentId)
    .eq("status", "published")
    .order("month", { ascending: false });

  if (periodsError) {
    throw new Error(periodsError.message);
  }

  const built: PublicRota["periods"] = [];

  for (const row of periods) {
    const payload = await openPeriod(departmentId, row.month);

    if (payload.assignments.length === 0) {
      built.push({ month: row.month, days: [] });
      continue;
    }

    const [{ data: roles, error: rolesError }, { data: people, error: peopleError }] =
      await Promise.all([
        supabase.from("rota_role").select("id, name, sort_order"),
        supabase
          .from("rota_person")
          .select("id, name")
          .eq("department_id", departmentId),
      ]);

    if (rolesError) {
      throw new Error(rolesError.message);
    }

    if (peopleError) {
      throw new Error(peopleError.message);
    }

    const roleById = new Map(roles.map((role) => [role.id, role]));
    const personNameById = new Map(
      people.map((person) => [person.id, person.name]),
    );

    const byDate = new Map<string, PublicRota["periods"][number]["days"][number]>();

    for (const occurrence of payload.occurrences) {
      const dateKey = occurrence.startAt.slice(0, 10);
      const slots = payload.assignments.filter(
        (assignment) => assignment.bookingId === occurrence.bookingId,
      );

      if (slots.length === 0) {
        continue;
      }

      const byRole = new Map<string, string[]>();

      for (const slot of slots) {
        const roleName = roleById.get(slot.rotaRoleId)?.name ?? "Serving";
        const name = personNameById.get(slot.rotaPersonId);

        if (!name) continue;

        byRole.set(roleName, [...(byRole.get(roleName) ?? []), name]);
      }

      const day = byDate.get(dateKey) ?? { dateKey, services: [] };
      day.services.push({
        serviceName: occurrence.serviceName,
        startAt: occurrence.startAt,
        roles: Array.from(byRole, ([roleName, names]) => ({
          roleName,
          people: names.sort((a, b) => a.localeCompare(b)),
        })).sort((a, b) => a.roleName.localeCompare(b.roleName)),
      });
      byDate.set(dateKey, day);
    }

    built.push({
      month: row.month,
      days: Array.from(byDate.values()).sort((a, b) =>
        a.dateKey.localeCompare(b.dateKey),
      ),
    });
  }

  return { departmentName, periods: built };
}
