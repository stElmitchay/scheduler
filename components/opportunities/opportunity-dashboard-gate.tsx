"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { unlockOpportunityDashboardAction } from "@/app/opportunities/dashboard/actions";
import { ShellWithMenus } from "@/components/shell/shell-with-menus";
import type { OpportunityDashboardPayload } from "@/lib/opportunities/types";

// Arriving at the dashboard URL directly used to land on a full gate screen,
// which is a different pattern from everywhere else in the app: the scheduler
// shows its page with the code modal over it. This does the same — the dashboard
// shell behind, the prompt on top.
export function OpportunityDashboardGate({
  notice,
  onUnlocked,
}: {
  notice: string;
  onUnlocked: (payload: OpportunityDashboardPayload, token: string) => void;
}) {
  const router = useRouter();
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

  const modal =
    typeof document === "undefined"
      ? null
      : createPortal(
          <div className="bulletin-modal-backdrop" role="presentation">
            <div
              className="bulletin-access-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="dashboard-gate-title"
            >
              <button
                type="button"
                className="bulletin-modal-close"
                onClick={() => router.push("/opportunities")}
                aria-label="Close and go to the board"
              >
                ×
              </button>
              <p className="bulletin-eyebrow">Welfare</p>
              <h2 id="dashboard-gate-title">Opportunities dashboard</h2>
              <form className="bulletin-form" onSubmit={submit}>
                <label>
                  Access code
                  <input
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    autoComplete="off"
                    autoFocus
                  />
                </label>
                <button
                  className="bulletin-primary"
                  type="submit"
                  disabled={busy}
                >
                  {busy ? "Checking..." : "Open dashboard"}
                </button>
              </form>
              {message ? (
                <p className="bulletin-message error">{message}</p>
              ) : null}
            </div>
          </div>,
          document.body,
        );

  return (
    <ShellWithMenus active="opportunities">
      <main className="bulletin-page">
        <div className="bulletin-shell">
          <header className="bulletin-header">
            <div>
              <p className="bulletin-eyebrow">Welfare</p>
              <h1>Opportunities</h1>
            </div>
          </header>
          <p className="bulletin-empty">
            Enter the Welfare or pastor access code to post and manage listings.
          </p>
        </div>
      </main>
      {modal}
    </ShellWithMenus>
  );
}
