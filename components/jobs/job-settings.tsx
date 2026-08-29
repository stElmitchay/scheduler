"use client";

import { useState, type FormEvent } from "react";
import { saveJobBoardSettingsAction } from "@/app/jobs/dashboard/actions";
import type {
  JobActionResult,
  JobDashboardPayload,
  JobSettings as JobSettingsType,
} from "@/lib/jobs/types";

export function JobSettings({
  token,
  settings,
  busy,
  notice,
  run,
  onSaved,
  onBack,
}: {
  token: string;
  settings: JobSettingsType;
  busy: boolean;
  notice: string;
  run: <T>(call: () => Promise<JobActionResult<T>>) => Promise<T | null>;
  onSaved: (payload: JobDashboardPayload) => void;
  onBack: () => void;
}) {
  const [number, setNumber] = useState(settings.welfareWhatsappNumber ?? "");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = await run(() => saveJobBoardSettingsAction(token, number));

    if (next) onSaved(next);
  }

  return (
    <main className="bulletin-page">
      <div className="bulletin-shell">
        <header className="bulletin-header">
          <div>
            <p className="bulletin-eyebrow">Welfare</p>
            <h1>Job settings</h1>
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
        <form className="job-settings" onSubmit={submit}>
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
