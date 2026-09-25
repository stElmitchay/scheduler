"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { unlockOpportunityDashboardAction } from "@/app/opportunities/dashboard/actions";
import { OPPORTUNITY_DASHBOARD_TOKEN_KEY } from "@/lib/opportunities/session-storage";

// Two destinations that look the same from the rail: the board anyone can read,
// and the Welfare dashboard behind a code. The dashboard asks for the code here
// rather than at the far end, so it is one entry instead of a click and a gate.
export function OpportunityMenuModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"choose" | "code">("choose");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  // Reopening should always start at the choice, never on a half-typed code.
  function close() {
    setStep("choose");
    setCode("");
    setMessage("");
    onClose();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = await unlockOpportunityDashboardAction(code);

      if (result.ok !== true) {
        setMessage(result.message);
        return;
      }

      sessionStorage.setItem(
        OPPORTUNITY_DASHBOARD_TOKEN_KEY,
        result.data.token,
      );
      close();
      router.push("/opportunities/dashboard");
    });
  }

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="bulletin-modal-backdrop" role="presentation">
      <div
        className="bulletin-access-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="opportunity-menu-title"
      >
        <button
          type="button"
          className="bulletin-modal-close"
          onClick={close}
          aria-label="Close opportunities popup"
        >
          ×
        </button>

        {step === "choose" ? (
          <>
            <h2 id="opportunity-menu-title">Opportunities</h2>
            <nav className="popup-stack" aria-label="Opportunities destinations">
              <button
                type="button"
                onClick={() => {
                  close();
                  router.push("/opportunities");
                }}
              >
                <strong>Browse the board</strong>
                <small>Jobs, scholarships and more. No code needed.</small>
                <b aria-hidden="true">›</b>
              </button>
              <button type="button" onClick={() => setStep("code")}>
                <strong>Welfare dashboard</strong>
                <small>Post and manage listings. Welfare or pastor code.</small>
                <b aria-hidden="true">›</b>
              </button>
            </nav>
          </>
        ) : (
          <>
            <h2 id="opportunity-menu-title">Welfare dashboard</h2>
            <form className="bulletin-form" onSubmit={handleSubmit}>
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
                type="submit"
                className="bulletin-primary"
                disabled={pending}
              >
                {pending ? "Checking..." : "Open dashboard"}
              </button>
            </form>
            <button
              type="button"
              className="bulletin-cta-link"
              onClick={() => {
                setStep("choose");
                setMessage("");
              }}
            >
              Back
            </button>
            {message ? (
              <p className="bulletin-message error">{message}</p>
            ) : null}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
