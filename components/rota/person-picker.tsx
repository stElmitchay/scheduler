"use client";

import { createPortal } from "react-dom";
import { checkCandidate } from "@/lib/rota/fairness.mjs";
import type { FairnessContext, PersonSummary } from "@/lib/rota/fairness.mjs";
import type { RotaPerson } from "@/lib/rota/types";

export type PickerSlot = {
  bookingId: string;
  rotaRoleId: string;
  slotIndex: number;
  roleName: string;
  serviceName: string;
  filledBy: string | null;
};

export function PersonPicker({
  slot,
  people,
  context,
  summary,
  busy,
  onPick,
  onClear,
  onClose,
}: {
  slot: PickerSlot | null;
  people: RotaPerson[];
  context: FairnessContext;
  summary: PersonSummary[];
  busy: boolean;
  onPick: (personId: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  if (!slot || typeof document === "undefined") {
    return null;
  }

  // Load comes off the same summary the builder shows, so the picker's ordering
  // and the summary strip can never disagree.
  const loadByPerson = new Map(
    summary.map((entry) => [entry.personId, entry.monthCount]),
  );

  const candidates = people
    .map((person) => ({
      person,
      warnings: checkCandidate({
        personId: person.id,
        bookingId: slot.bookingId,
        context,
      }),
    }))
    .sort((a, b) => {
      const aBlocked = a.warnings.some((warning) => warning.severity === "block");
      const bBlocked = b.warnings.some((warning) => warning.severity === "block");
      if (aBlocked !== bBlocked) return aBlocked ? 1 : -1;

      const loadDiff =
        (loadByPerson.get(a.person.id) ?? 0) -
        (loadByPerson.get(b.person.id) ?? 0);
      if (loadDiff !== 0) return loadDiff;

      return a.person.name.localeCompare(b.person.name);
    });

  const modal = (
    <div className="bulletin-modal-backdrop" role="presentation">
      <div
        className="bulletin-access-modal rota-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rota-picker-title"
      >
        <button
          type="button"
          className="bulletin-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 id="rota-picker-title">{slot.roleName}</h2>
        <p className="rota-lead">{slot.serviceName}</p>

        <ul className="rota-candidates">
          {candidates.map(({ person, warnings }) => {
            const blocked = warnings.some(
              (warning) => warning.severity === "block",
            );
            const count = loadByPerson.get(person.id) ?? 0;

            return (
              <li key={person.id}>
                <button
                  type="button"
                  className={blocked ? "rota-candidate blocked" : "rota-candidate"}
                  disabled={blocked || busy}
                  onClick={() => onPick(person.id)}
                >
                  <span className="rota-candidate-name">
                    {person.name}
                    <small>
                      {count} {count === 1 ? "serve" : "serves"} this month
                    </small>
                  </span>
                  {warnings.length > 0 ? (
                    <span className="rota-candidate-warnings">
                      {warnings.map((warning) => (
                        <em key={warning.code} className={warning.severity}>
                          {warning.message}
                        </em>
                      ))}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>

        {slot.filledBy ? (
          <button
            type="button"
            className="bulletin-cancel-btn"
            disabled={busy}
            onClick={onClear}
          >
            Clear this slot
          </button>
        ) : null}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
