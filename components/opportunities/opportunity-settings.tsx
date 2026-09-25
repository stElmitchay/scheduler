"use client";

import { useState, type FormEvent } from "react";
import { saveOpportunityBoardSettingsAction } from "@/app/opportunities/dashboard/actions";
import type {
  OpportunityActionResult,
  OpportunityBoardSettings,
  OpportunityDashboardPayload,
} from "@/lib/opportunities/types";

export function OpportunitySettings({
  token,
  settings,
  busy,
  notice,
  run,
  onSaved,
  onBack,
}: {
  token: string;
  settings: OpportunityBoardSettings;
  busy: boolean;
  notice: string;
  run: <T>(
    call: () => Promise<OpportunityActionResult<T>>,
  ) => Promise<T | null>;
  onSaved: (payload: OpportunityDashboardPayload) => void;
  onBack: () => void;
}) {
  const [number, setNumber] = useState(settings.welfareWhatsappNumber ?? "");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = await run(() =>
      saveOpportunityBoardSettingsAction(token, number),
    );

    if (next) onSaved(next);
  }

  return (
    <main className="bulletin-page">
      <div className="bulletin-shell">
        <header className="bulletin-header">
          <div>
            <p className="bulletin-eyebrow">Welfare</p>
            <h1>Opportunity settings</h1>
          </div>
          <button
            className="bulletin-icon-button"
            type="button"
            onClick={onBack}
            aria-label="Go back"
          >
            <span className="bulletin-back-mark">‹</span>
          </button>
        </header>
        <form className="opportunity-settings" onSubmit={submit}>
          <label>
            <span>WhatsApp number</span>
            <input
              value={number}
              onChange={(event) => setNumber(event.target.value)}
              placeholder="23276123456"
            />
          </label>
          <button className="bulletin-primary" type="submit" disabled={busy}>
            {busy ? "Saving..." : "Save settings"}
          </button>
          {notice ? <p className="bulletin-message error">{notice}</p> : null}
        </form>
      </div>
    </main>
  );
}
