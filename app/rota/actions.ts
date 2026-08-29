"use server";

import { autoAssign, type EmptySlot } from "@/lib/rota/auto-assign.mjs";
import * as rota from "@/lib/rota/data";
import { signRotaSession, verifyRotaSession } from "@/lib/rota/session.mjs";
import type {
  PeriodPayload,
  RotaActionResult,
  RotaPayload,
  RotaPeriodStatus,
} from "@/lib/rota/types";
import { resolveAccessCode } from "@/lib/scheduler/data";

const EXPIRED = {
  ok: "expired" as const,
  message: "Your session expired, please enter your code again.",
};

// Every action but unlockRotaAction takes the token and reads the department id
// out of it. A department id is never accepted from the client.
async function withSession<T>(
  token: string,
  run: (departmentId: string) => Promise<T>,
): Promise<RotaActionResult<T>> {
  const session = verifyRotaSession(token);

  if (!session.ok) {
    return session.reason === "expired"
      ? EXPIRED
      : { ok: false, message: "That session is not valid." };
  }

  try {
    return { ok: true, data: await run(session.departmentId) };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}

export async function unlockRotaAction(
  code: string,
): Promise<RotaActionResult<{ payload: RotaPayload; token: string }>> {
  try {
    const access = await resolveAccessCode(code);

    if (!access || access.kind !== "department") {
      return {
        ok: false,
        message: "That code does not open a department rota.",
      };
    }

    const payload = await rota.getRotaPayload(access.departmentId);

    return {
      ok: true,
      data: { payload, token: signRotaSession(access.departmentId) },
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}

export async function refreshRotaAction(token: string) {
  return withSession(token, (departmentId) =>
    rota.getRotaPayload(departmentId),
  );
}

export async function openPeriodAction(token: string, month: string) {
  return withSession(token, (departmentId) =>
    rota.openPeriod(departmentId, month),
  );
}

export async function setAssignmentAction(
  token: string,
  bookingId: string,
  rotaRoleId: string,
  slotIndex: number,
  rotaPersonId: string | null,
) {
  return withSession(token, async (departmentId) => {
    await rota.setAssignment(
      departmentId,
      bookingId,
      rotaRoleId,
      slotIndex,
      rotaPersonId,
    );

    const month = await rota.monthOfBooking(bookingId);
    return rota.openPeriod(departmentId, month);
  });
}

export async function autoAssignAction(
  token: string,
  month: string,
  slots: EmptySlot[],
) {
  return withSession(
    token,
    async (
      departmentId,
    ): Promise<{ period: PeriodPayload; unfilled: number }> => {
      const payload = await rota.openPeriod(departmentId, month);
      const settings = await rota.getRotaPayload(departmentId);

      const taken = new Set(
        payload.assignments.map(
          (assignment) =>
            `${assignment.bookingId}|${assignment.rotaRoleId}|${assignment.slotIndex}`,
        ),
      );

      const empty = slots.filter(
        (slot) =>
          !taken.has(`${slot.bookingId}|${slot.rotaRoleId}|${slot.slotIndex}`),
      );

      const result = autoAssign({
        slots: empty,
        context: {
          people: settings.people.map((person) => ({
            id: person.id,
            name: person.name,
            isActive: person.isActive,
            unavailability: person.unavailability.map((range) => ({
              startDate: range.startDate,
              endDate: range.endDate,
            })),
          })),
          occurrences: [
            ...payload.occurrences,
            ...payload.historyOccurrences,
          ].map((occurrence) => ({
            bookingId: occurrence.bookingId,
            startAt: occurrence.startAt,
          })),
          assignments: [
            ...payload.assignments,
            ...payload.historyAssignments,
          ].map((assignment) => ({
            bookingId: assignment.bookingId,
            rotaPersonId: assignment.rotaPersonId,
          })),
          maxServesPerMonth: settings.settings.maxServesPerMonth,
          monthKey: month.slice(0, 7),
        },
      });

      await rota.replaceAssignments(departmentId, month, result.assignments);

      return {
        period: await rota.openPeriod(departmentId, month),
        unfilled: result.unfilled.length,
      };
    },
  );
}

async function setStatus(
  token: string,
  month: string,
  status: RotaPeriodStatus,
) {
  return withSession(token, async (departmentId) => {
    await rota.setPeriodStatus(departmentId, month, status);
    return rota.openPeriod(departmentId, month);
  });
}

export async function publishPeriodAction(token: string, month: string) {
  return setStatus(token, month, "published");
}

export async function unpublishPeriodAction(token: string, month: string) {
  return setStatus(token, month, "draft");
}

export async function savePersonAction(
  token: string,
  input: { id?: string; name: string; isActive: boolean },
) {
  return withSession(token, async (departmentId) => {
    await rota.savePerson(departmentId, input);
    return rota.getRotaPayload(departmentId);
  });
}

export async function deletePersonAction(token: string, personId: string) {
  return withSession(token, async (departmentId) => {
    const result = await rota.deletePerson(departmentId, personId);

    if (!result.ok) {
      throw new Error(result.message);
    }

    return rota.getRotaPayload(departmentId);
  });
}

export async function saveUnavailabilityAction(
  token: string,
  personId: string,
  startDate: string,
  endDate: string,
) {
  return withSession(token, async (departmentId) => {
    await rota.saveUnavailability(departmentId, personId, startDate, endDate);
    return rota.getRotaPayload(departmentId);
  });
}

export async function deleteUnavailabilityAction(token: string, id: string) {
  return withSession(token, async (departmentId) => {
    await rota.deleteUnavailability(departmentId, id);
    return rota.getRotaPayload(departmentId);
  });
}

export async function saveServiceAction(
  token: string,
  input: {
    id?: string;
    serviceName: string;
    roles: { id?: string; name: string; slotCount: number; sortOrder: number }[];
  },
) {
  return withSession(token, async (departmentId) => {
    await rota.saveService(departmentId, input);
    return rota.getRotaPayload(departmentId);
  });
}

export async function deleteServiceAction(token: string, serviceId: string) {
  return withSession(token, async (departmentId) => {
    await rota.deleteService(departmentId, serviceId);
    return rota.getRotaPayload(departmentId);
  });
}

export async function saveSettingsAction(
  token: string,
  maxServesPerMonth: number,
) {
  return withSession(token, async (departmentId) => {
    await rota.saveSettings(departmentId, maxServesPerMonth);
    return rota.getRotaPayload(departmentId);
  });
}

export async function rotateShareSlugAction(token: string) {
  return withSession(token, async (departmentId) => {
    await rota.rotateShareSlug(departmentId);
    return rota.getRotaPayload(departmentId);
  });
}
