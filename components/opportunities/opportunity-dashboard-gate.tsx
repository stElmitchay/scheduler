"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { unlockOpportunityDashboardAction } from "@/app/opportunities/dashboard/actions";
import type { OpportunityDashboardPayload } from "@/lib/opportunities/types";

export function OpportunityDashboardGate({
  notice,
  onUnlocked,
}: {
  notice: string;
  onUnlocked: (payload: OpportunityDashboardPayload, token: string) => void;
}) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState(notice);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);

    const result = await unlockOpportunityDashboardAction(code);

    setBusy(false);

    if (result.ok !== true) {
      setMessage(result.message);
      return;
    }

    onUnlocked(result.data.payload, result.data.token);
  }

  return (
    <main className="bulletin-page">
      <div className="bulletin-shell">
        <header className="bulletin-header">
          <div>
            <p className="bulletin-eyebrow">Welfare</p>
            <h1>Opportunities Dashboard</h1>
          </div>
          <Link className="bulletin-icon-button" href="/" aria-label="Go back">
            <span className="bulletin-back-mark">‹</span>
          </Link>
        </header>
        <form className="opportunity-form" onSubmit={submit}>
          <label>
            <span>Access code</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="off"
            />
          </label>
          <button className="bulletin-primary" type="submit" disabled={busy}>
            {busy ? "Checking..." : "Open dashboard"}
          </button>
          {message ? <p className="bulletin-message error">{message}</p> : null}
        </form>
      </div>
    </main>
  );
}
