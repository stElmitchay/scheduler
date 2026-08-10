"use client";

import { type FormEvent, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { unlockAccessAction } from "@/app/actions";
import type { AccessContext } from "@/lib/scheduler/types";

export function AccessModal({
  open,
  requirePastor,
  onClose,
  onUnlocked,
}: {
  open: boolean;
  requirePastor: boolean;
  onClose: () => void;
  onUnlocked: (access: AccessContext, code: string) => void;
}) {
  const [accessCode, setAccessCode] = useState("");
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const submittedCode = accessCode;

    startTransition(async () => {
      const result = await unlockAccessAction(
        { ok: false, message: "", access: null },
        formData,
      );

      if (!result.ok) {
        setMessage(result.message);
        setMessageIsError(true);
        return;
      }

      if (requirePastor && result.access.kind !== "pastor") {
        setMessage("Pastor code required.");
        setMessageIsError(true);
        return;
      }

      setMessage(result.message);
      setMessageIsError(false);
      onUnlocked(result.access, submittedCode);
    });
  }

  if (!open || typeof document === "undefined") {
    return null;
  }

  const modal = (
    <div className="bulletin-modal-backdrop" role="presentation">
      <div
        className="bulletin-access-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="access-modal-title"
      >
        <button
          type="button"
          className="bulletin-modal-close"
          onClick={onClose}
          aria-label="Close access code popup"
        >
          ×
        </button>
        <h2 id="access-modal-title">Enter access code</h2>
        <form className="bulletin-form" onSubmit={handleSubmit}>
          <label>
            Access code
            <input
              name="accessCode"
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value)}
              autoComplete="off"
            />
          </label>
          <button type="submit" className="bulletin-primary" disabled={pending}>
            {pending ? "Checking..." : "Continue"}
          </button>
        </form>
        {message ? (
          <p
            className={
              messageIsError ? "bulletin-message error" : "bulletin-message"
            }
          >
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
