"use client";

import { useMemo, useState } from "react";
import {
  autoAssignAction,
  publishPeriodAction,
  setAssignmentAction,
  unpublishPeriodAction,
} from "@/app/rota/actions";
import type { EmptySlot } from "@/lib/rota/auto-assign.mjs";
import { checkCandidate, summarizePeriod } from "@/lib/rota/fairness.mjs";
import type { FairnessContext } from "@/lib/rota/fairness.mjs";
import type {
  PeriodPayload,
  RotaActionResult,
  RotaOccurrence,
  RotaPayload,
} from "@/lib/rota/types";
import { formatMonthLabel } from "./rota-app";
import { PersonPicker, type PickerSlot } from "./person-picker";

function formatDayHeading(startAt: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(startAt));
}

function formatTime(startAt: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(startAt));
}

export function MonthBuilder({
  payload,
  period,
  notice,
  busy,
  token,
  run,
  onChanged,
  onBack,
}: {
  payload: RotaPayload;
  period: PeriodPayload;
  notice: string;
  busy: boolean;
  token: string;
  run: <T>(call: () => Promise<RotaActionResult<T>>) => Promise<T | null>;
  onChanged: (period: PeriodPayload) => void;
  onBack: () => void;
}) {
  const [picker, setPicker] = useState<PickerSlot | null>(null);
  const [autoNotice, setAutoNotice] = useState("");

  const rolesByService = useMemo(() => {
    const map = new Map<string, RotaPayload["services"][number]["roles"]>();
    for (const service of payload.services) {
      map.set(service.id, service.roles);
    }
    return map;
  }, [payload.services]);

  const personById = useMemo(
    () => new Map(payload.people.map((person) => [person.id, person])),
    [payload.people],
  );

  // History is folded in so the consecutive-weeks rule can see a run that
  // started in the previous month.
  const context = useMemo<FairnessContext>(
    () => ({
      people: payload.people.map((person) => ({
        id: person.id,
        name: person.name,
        isActive: person.isActive,
        unavailability: person.unavailability.map((entry) => ({
          startDate: entry.startDate,
          endDate: entry.endDate,
        })),
      })),
      occurrences: [...period.occurrences, ...period.historyOccurrences].map(
        (occurrence) => ({
          bookingId: occurrence.bookingId,
          startAt: occurrence.startAt,
        }),
      ),
      assignments: [...period.assignments, ...period.historyAssignments].map(
        (assignment) => ({
          bookingId: assignment.bookingId,
          rotaPersonId: assignment.rotaPersonId,
        }),
      ),
      maxServesPerMonth: payload.settings.maxServesPerMonth,
      monthKey: period.period.month.slice(0, 7),
    }),
    [payload, period],
  );

  const summary = useMemo(() => summarizePeriod(context), [context]);

  const days = useMemo(() => {
    const grouped = new Map<string, RotaOccurrence[]>();

    for (const occurrence of period.occurrences) {
      const key = occurrence.startAt.slice(0, 10);
      grouped.set(key, [...(grouped.get(key) ?? []), occurrence]);
    }

    return [...grouped.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateKey, occurrences]) => ({
        dateKey,
        occurrences: [...occurrences].sort((a, b) =>
          a.startAt.localeCompare(b.startAt),
        ),
      }));
  }, [period.occurrences]);

  const allSlots = useMemo<EmptySlot[]>(() => {
    const slots: EmptySlot[] = [];

    for (const occurrence of period.occurrences) {
      for (const role of rolesByService.get(occurrence.rotaServiceId) ?? []) {
        for (let index = 0; index < role.slotCount; index += 1) {
          slots.push({
            bookingId: occurrence.bookingId,
            rotaRoleId: role.id,
            slotIndex: index,
            startAt: occurrence.startAt,
            sortOrder: role.sortOrder,
          });
        }
      }
    }

    return slots;
  }, [period.occurrences, rolesByService]);

  const filledCount = period.assignments.length;
  const published = period.period.status === "published";

  function assignedTo(bookingId: string, roleId: string, slotIndex: number) {
    return (
      period.assignments.find(
        (assignment) =>
          assignment.bookingId === bookingId &&
          assignment.rotaRoleId === roleId &&
          assignment.slotIndex === slotIndex,
      ) ?? null
    );
  }

  async function setSlot(personId: string | null) {
    if (!picker) return;

    const next = await run(() =>
      setAssignmentAction(
        token,
        picker.bookingId,
        picker.rotaRoleId,
        picker.slotIndex,
        personId,
      ),
    );

    if (next) {
      onChanged(next);
      setPicker(null);
    }
  }

  const overCap = summary.filter((entry) => entry.overCap);
  const aboveAverage = summary.filter(
    (entry) => entry.aboveAverage && !entry.overCap,
  );
  const onRun = summary.filter((entry) => entry.consecutiveWeeks >= 3);
  const underUsed = summary.filter((entry) => entry.underUsed);

  return (
    <main className="bulletin-page">
      <div className="bulletin-shell bulletin-shell-wide">
        <header className="bulletin-header">
          <div>
            <p className="bulletin-eyebrow">{payload.departmentName}</p>
            <h1>{formatMonthLabel(period.period.month)}</h1>
          </div>
          <button
            type="button"
            className="bulletin-icon-button"
            onClick={onBack}
            aria-label="Go back"
          >
            <span className="bulletin-back-mark">‹</span>
          </button>
        </header>

        <div className="bulletin-title-rule">
          {filledCount} of {allSlots.length} slots filled
          {published ? " · published" : " · draft"}
        </div>

        {notice || autoNotice ? (
          <p className={notice ? "bulletin-message error" : "bulletin-message"}>
            {notice || autoNotice}
          </p>
        ) : null}

        {allSlots.length === 0 ? (
          <p className="bulletin-empty">
            No services on the calendar for this month, or no roles set up yet.
            Check Services and roles.
          </p>
        ) : null}

        {(overCap.length > 0 ||
          aboveAverage.length > 0 ||
          onRun.length > 0 ||
          underUsed.length > 0) && (
          <section className="rota-card rota-summary">
            {overCap.length > 0 ? (
              <p>
                <strong>Over the cap:</strong>{" "}
                {overCap.map((entry) => `${entry.name} (${entry.monthCount})`).join(", ")}
              </p>
            ) : null}
            {aboveAverage.length > 0 ? (
              <p>
                <strong>Doing more than most:</strong>{" "}
                {aboveAverage
                  .map((entry) => `${entry.name} (${entry.monthCount})`)
                  .join(", ")}
              </p>
            ) : null}
            {onRun.length > 0 ? (
              <p>
                <strong>Several weeks running:</strong>{" "}
                {onRun
                  .map((entry) => `${entry.name} (${entry.consecutiveWeeks})`)
                  .join(", ")}
              </p>
            ) : null}
            {underUsed.length > 0 ? (
              <p>
                <strong>Could take more:</strong>{" "}
                {underUsed
                  .map((entry) => `${entry.name} (${entry.monthCount})`)
                  .join(", ")}
              </p>
            ) : null}
          </section>
        )}

        {days.map((day) => (
          <section key={day.dateKey} className="rota-card">
            <div className="bulletin-title-rule">
              {formatDayHeading(day.occurrences[0].startAt)}
            </div>

            {day.occurrences.map((occurrence) => (
              <div key={occurrence.bookingId} className="rota-service">
                <h3>
                  {occurrence.serviceName}{" "}
                  <small>{formatTime(occurrence.startAt)}</small>
                </h3>

                {(rolesByService.get(occurrence.rotaServiceId) ?? []).map(
                  (role) => (
                    <div key={role.id} className="rota-role-block">
                      <h4>{role.name}</h4>
                      <div className="rota-slots">
                        {Array.from({ length: role.slotCount }, (_, index) => {
                          const assignment = assignedTo(
                            occurrence.bookingId,
                            role.id,
                            index,
                          );
                          const person = assignment
                            ? personById.get(assignment.rotaPersonId)
                            : null;
                          const warnings = person
                            ? checkCandidate({
                                personId: person.id,
                                bookingId: occurrence.bookingId,
                                context: {
                                  ...context,
                                  assignments: context.assignments.filter(
                                    (entry) =>
                                      !(
                                        entry.bookingId ===
                                          occurrence.bookingId &&
                                        entry.rotaPersonId === person.id
                                      ),
                                  ),
                                },
                              }).filter(
                                (warning) => warning.severity === "warn",
                              )
                            : [];

                          return (
                            <button
                              key={index}
                              type="button"
                              className={
                                person ? "rota-slot filled" : "rota-slot"
                              }
                              disabled={busy}
                              onClick={() =>
                                setPicker({
                                  bookingId: occurrence.bookingId,
                                  rotaRoleId: role.id,
                                  slotIndex: index,
                                  roleName: role.name,
                                  serviceName: `${occurrence.serviceName}, ${formatDayHeading(occurrence.startAt)}`,
                                  filledBy: person?.id ?? null,
                                })
                              }
                            >
                              <span>{person ? person.name : "Empty"}</span>
                              {warnings.length > 0 ? (
                                <em>{warnings[0].message}</em>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ),
                )}
              </div>
            ))}
          </section>
        ))}

        {allSlots.length > 0 ? (
          <div className="rota-actions">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                if (
                  !window.confirm(
                    "Fill the empty slots automatically? Anything you have already chosen stays exactly as it is.",
                  )
                ) {
                  return;
                }

                const next = await run(() =>
                  autoAssignAction(token, period.period.month, allSlots),
                );

                if (next) {
                  onChanged(next.period);
                  setAutoNotice(
                    next.unfilled === 0
                      ? "Every slot filled."
                      : `${next.unfilled} slot${next.unfilled === 1 ? "" : "s"} could not be filled — nobody was available. Fill those by hand.`,
                  );
                }
              }}
            >
              Auto-generate
            </button>

            <button
              type="button"
              className="bulletin-primary"
              disabled={busy}
              onClick={async () => {
                const next = await run(() =>
                  published
                    ? unpublishPeriodAction(token, period.period.month)
                    : publishPeriodAction(token, period.period.month),
                );

                if (next) {
                  onChanged(next);
                  setAutoNotice(
                    published
                      ? "Unpublished. The share link no longer shows this month."
                      : "Published. The share link now shows this month.",
                  );
                }
              }}
            >
              {published ? "Unpublish" : "Publish"}
            </button>
          </div>
        ) : null}
      </div>

      <PersonPicker
        slot={picker}
        people={payload.people}
        context={context}
        summary={summary}
        busy={busy}
        onPick={(personId) => setSlot(personId)}
        onClear={() => setSlot(null)}
        onClose={() => setPicker(null)}
      />
    </main>
  );
}
