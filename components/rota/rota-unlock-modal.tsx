"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { unlockRotaAction } from "@/app/rota/actions";
import { ROTA_TOKEN_KEY } from "@/lib/rota/session-storage";

// Unlocking here rather than on /rota means one code entry instead of a click
// through to the gate. The token goes into sessionStorage under the same key the
// rota app restores from, so it picks the session up on arrival.
export function RotaUnlockModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = await unlockRotaAction(code);

      if (result.ok !== true) {
        setMessage(result.message);
        return;
      }

      setMessage("");
      sessionStorage.setItem(ROTA_TOKEN_KEY, result.data.token);
      router.push("/rota");
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
        aria-labelledby="rota-unlock-title"
      >
        <button
          type="button"
          className="bulletin-modal-close"
          onClick={onClose}
          aria-label="Close serving rota popup"
        >
          ×
        </button>
        <h2 id="rota-unlock-title">Serving rota</h2>
        <form className="bulletin-form" onSubmit={handleSubmit}>
          <label>
            Access code
            <input
              name="accessCode"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="off"
              autoFocus
            />
          </label>
          <button type="submit" className="bulletin-primary" disabled={pending}>
            {pending ? "Checking..." : "Open rota"}
          </button>
        </form>
        {message ? <p className="bulletin-message error">{message}</p> : null}
      </div>
    </div>,
    document.body,
  );
}
