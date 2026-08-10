"use client";

import Link from "next/link";
import { type FormEvent, useState, useTransition } from "react";
import { unlockRotaAction } from "@/app/rota/actions";
import type { RotaPayload } from "@/lib/rota/types";

export function RotaGate({
  notice,
  onUnlocked,
}: {
  notice: string;
  onUnlocked: (payload: RotaPayload, token: string) => void;
}) {
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
      onUnlocked(result.data.payload, result.data.token);
    });
  }

  return (
    <main className="bulletin-page">
      <div className="bulletin-shell">
        <header className="bulletin-header">
          <div>
            <p className="bulletin-eyebrow">Kharis Church</p>
            <h1>Serving rota</h1>
          </div>
          <Link className="bulletin-icon-button" href="/" aria-label="Go back">
            <span className="bulletin-back-mark">‹</span>
          </Link>
        </header>
        <div className="bulletin-title-rule">Department access</div>
        <p className="rota-lead">
          Enter your department access code to build and share your rota. You
          will need to enter it again next time you open this page in a new tab.
        </p>
        <form className="bulletin-form" onSubmit={handleSubmit}>
          <label>
            Access code
            <input
              name="accessCode"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="off"
            />
          </label>
          <button type="submit" className="bulletin-primary" disabled={pending}>
            {pending ? "Checking..." : "Continue"}
          </button>
        </form>
        {message || notice ? (
          <p className="bulletin-message error">{message || notice}</p>
        ) : null}
      </div>
    </main>
  );
}
