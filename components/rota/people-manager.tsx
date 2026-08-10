"use client";

import { useState } from "react";
import {
  deletePersonAction,
  deleteUnavailabilityAction,
  savePersonAction,
  saveUnavailabilityAction,
} from "@/app/rota/actions";
import type { RotaActionResult, RotaPayload } from "@/lib/rota/types";

function formatRange(startDate: string, endDate: string) {
  const format = (value: string) =>
    new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
    }).format(new Date(`${value}T00:00:00`));

  return startDate === endDate
    ? format(startDate)
    : `${format(startDate)} – ${format(endDate)}`;
}

export function PeopleManager({
  payload,
  notice,
  busy,
  token,
  run,
  onSaved,
  onBack,
}: {
  payload: RotaPayload;
  notice: string;
  busy: boolean;
  token: string;
  run: <T>(call: () => Promise<RotaActionResult<T>>) => Promise<T | null>;
  onSaved: (payload: RotaPayload) => void;
  onBack: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [openPerson, setOpenPerson] = useState<string | null>(null);
  const [range, setRange] = useState({ start: "", end: "" });
  const [localError, setLocalError] = useState("");

  const people = [...payload.people].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <main className="bulletin-page">
      <div className="bulletin-shell">
        <header className="bulletin-header">
          <div>
            <p className="bulletin-eyebrow">{payload.departmentName}</p>
            <h1>People</h1>
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

        {notice || localError ? (
          <p className="bulletin-message error">{notice || localError}</p>
        ) : null}

        <div className="rota-role-row">
          <input
            aria-label="New person"
            placeholder="Name"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
          <button
            type="button"
            className="bulletin-primary"
            disabled={busy || newName.trim().length === 0}
            onClick={async () => {
              const next = await run(() =>
                savePersonAction(token, {
                  name: newName.trim(),
                  isActive: true,
                }),
              );

              if (next) {
                setNewName("");
                onSaved(next);
              }
            }}
          >
            Add
          </button>
        </div>

        <div className="bulletin-title-rule">
          {people.length} on the team
        </div>

        {people.length === 0 ? (
          <p className="bulletin-empty">Nobody added yet.</p>
        ) : (
          <section className="bulletin-manage-list">
            {people.map((person) => (
              <article key={person.id} className="bulletin-manage-row">
                <div>
                  <h3>{person.name}</h3>
                  {person.isActive ? null : (
                    <span className="bulletin-status-badge cancelled">
                      on break
                    </span>
                  )}
                  {person.unavailability.length > 0 ? (
                    <p>
                      Away:{" "}
                      {person.unavailability
                        .map((entry) =>
                          formatRange(entry.startDate, entry.endDate),
                        )
                        .join(", ")}
                    </p>
                  ) : null}

                  {openPerson === person.id ? (
                    <div className="rota-role-row">
                      <input
                        type="date"
                        aria-label="Away from"
                        value={range.start}
                        onChange={(event) =>
                          setRange((current) => ({
                            ...current,
                            start: event.target.value,
                          }))
                        }
                      />
                      <input
                        type="date"
                        aria-label="Away until"
                        value={range.end}
                        onChange={(event) =>
                          setRange((current) => ({
                            ...current,
                            end: event.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="bulletin-primary"
                        disabled={busy}
                        onClick={async () => {
                          if (!range.start || !range.end) {
                            setLocalError("Pick both dates.");
                            return;
                          }

                          if (range.end < range.start) {
                            setLocalError(
                              "The end date cannot be before the start date.",
                            );
                            return;
                          }

                          setLocalError("");
                          const next = await run(() =>
                            saveUnavailabilityAction(
                              token,
                              person.id,
                              range.start,
                              range.end,
                            ),
                          );

                          if (next) {
                            setRange({ start: "", end: "" });
                            setOpenPerson(null);
                            onSaved(next);
                          }
                        }}
                      >
                        Save
                      </button>
                    </div>
                  ) : null}

                  {person.unavailability.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      className="bulletin-cancel-btn"
                      disabled={busy}
                      onClick={async () => {
                        const next = await run(() =>
                          deleteUnavailabilityAction(token, entry.id),
                        );
                        if (next) onSaved(next);
                      }}
                    >
                      Clear {formatRange(entry.startDate, entry.endDate)}
                    </button>
                  ))}
                </div>

                <div className="bulletin-row-actions">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      const next = await run(() =>
                        savePersonAction(token, {
                          id: person.id,
                          name: person.name,
                          isActive: !person.isActive,
                        }),
                      );
                      if (next) onSaved(next);
                    }}
                  >
                    {person.isActive ? "Set on break" : "Bring back"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenPerson(openPerson === person.id ? null : person.id)
                    }
                  >
                    Away dates
                  </button>
                  <button
                    type="button"
                    className="bulletin-delete-btn"
                    disabled={busy}
                    onClick={async () => {
                      if (!window.confirm(`Remove ${person.name}?`)) return;

                      const next = await run(() =>
                        deletePersonAction(token, person.id),
                      );
                      if (next) onSaved(next);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
