"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { openPeriodAction, refreshRotaAction } from "@/app/rota/actions";
import type {
  PeriodPayload,
  RotaActionResult,
  RotaPayload,
} from "@/lib/rota/types";
import { MonthBuilder } from "./month-builder";
import { PeopleManager } from "./people-manager";
import { RotaGate } from "./rota-gate";
import { RotaSetup } from "./rota-setup";

const TOKEN_KEY = "rota-session";

type Screen = "months" | "builder" | "people" | "setup";

export function formatMonthLabel(month: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${month}T00:00:00`));
}

function firstOfMonth(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

function shiftMonth(month: string, amount: number) {
  const date = new Date(`${month}T00:00:00`);
  date.setMonth(date.getMonth() + amount);
  return firstOfMonth(date);
}

export function RotaApp() {
  const [token, setToken] = useState<string | null>(null);
  const [payload, setPayload] = useState<RotaPayload | null>(null);
  const [period, setPeriod] = useState<PeriodPayload | null>(null);
  const [screen, setScreen] = useState<Screen>("months");
  const [notice, setNotice] = useState("");
  const [gateNotice, setGateNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(true);

  const signOut = useCallback((message: string) => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setPayload(null);
    setPeriod(null);
    setScreen("months");
    setGateNotice(message);
  }, []);

  // One place where an expired token is handled, so no child has to know about it.
  const run = useCallback(
    async <T,>(call: () => Promise<RotaActionResult<T>>): Promise<T | null> => {
      setBusy(true);

      try {
        const result = await call();

        if (result.ok === "expired") {
          signOut(result.message);
          return null;
        }

        if (!result.ok) {
          setNotice(result.message);
          return null;
        }

        setNotice("");
        return result.data;
      } finally {
        setBusy(false);
      }
    },
    [signOut],
  );

  // sessionStorage survives a reload but not closing the tab, which is the
  // whole point: the rota must not sit unlocked on a phone someone picks up.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const stored = sessionStorage.getItem(TOKEN_KEY);

      if (!stored) {
        if (!cancelled) setRestoring(false);
        return;
      }

      const result = await refreshRotaAction(stored);

      if (cancelled) return;

      if (result.ok === true) {
        setToken(stored);
        setPayload(result.data);
      } else {
        sessionStorage.removeItem(TOKEN_KEY);
        if (result.ok === "expired") setGateNotice(result.message);
      }

      setRestoring(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (restoring) {
    return (
      <main className="bulletin-page">
        <div className="bulletin-shell">
          <p className="bulletin-empty">Loading…</p>
        </div>
      </main>
    );
  }

  if (!token || !payload) {
    return (
      <RotaGate
        notice={gateNotice}
        onUnlocked={(nextPayload, nextToken) => {
          sessionStorage.setItem(TOKEN_KEY, nextToken);
          setToken(nextToken);
          setPayload(nextPayload);
          setGateNotice("");
        }}
      />
    );
  }

  async function openMonth(month: string) {
    const next = await run(() => openPeriodAction(token!, month));

    if (next) {
      setPeriod(next);
      setScreen("builder");
    }
  }

  if (screen === "setup") {
    return (
      <RotaSetup
        payload={payload}
        notice={notice}
        busy={busy}
        token={token}
        run={run}
        onSaved={setPayload}
        onBack={() => setScreen("months")}
      />
    );
  }

  if (screen === "people") {
    return (
      <PeopleManager
        payload={payload}
        notice={notice}
        busy={busy}
        token={token}
        run={run}
        onSaved={setPayload}
        onBack={() => setScreen("months")}
      />
    );
  }

  if (screen === "builder" && period) {
    return (
      <MonthBuilder
        payload={payload}
        period={period}
        notice={notice}
        busy={busy}
        token={token}
        run={run}
        onChanged={setPeriod}
        onBack={() => setScreen("months")}
      />
    );
  }

  const existingMonths = new Set(payload.periods.map((entry) => entry.month));
  const thisMonth = firstOfMonth(new Date());
  const suggestions = [thisMonth, shiftMonth(thisMonth, 1)].filter(
    (month) => !existingMonths.has(month),
  );

  return (
    <main className="bulletin-page">
      <div className="bulletin-shell">
        <header className="bulletin-header">
          <div>
            <p className="bulletin-eyebrow">{payload.departmentName}</p>
            <h1>Serving rota</h1>
          </div>
          <Link className="bulletin-icon-button" href="/" aria-label="Go back">
            <span className="bulletin-back-mark">‹</span>
          </Link>
        </header>

        <nav className="bulletin-menu-panel" aria-label="Rota menu">
          <button type="button" onClick={() => setScreen("people")}>
            <span>
              <strong>People</strong>
              <small>
                {payload.people.filter((person) => person.isActive).length} active
                on the team
              </small>
            </span>
            <b>›</b>
          </button>
          <button type="button" onClick={() => setScreen("setup")}>
            <span>
              <strong>Services and roles</strong>
              <small>
                {payload.services.length === 0
                  ? "Not set up yet — start here"
                  : `${payload.services.length} service${payload.services.length === 1 ? "" : "s"} configured`}
              </small>
            </span>
            <b>›</b>
          </button>
        </nav>

        {notice ? <p className="bulletin-message error">{notice}</p> : null}

        <div className="bulletin-title-rule">Months</div>
        {payload.periods.length === 0 ? (
          <p className="bulletin-empty">No months started yet.</p>
        ) : (
          <section className="bulletin-manage-list">
            {payload.periods.map((entry) => (
              <article key={entry.id} className="bulletin-manage-row">
                <div>
                  <h3>{formatMonthLabel(entry.month)}</h3>
                  <span className={`bulletin-status-badge ${entry.status}`}>
                    {entry.status}
                  </span>
                </div>
                <div className="bulletin-row-actions">
                  <button
                    type="button"
                    onClick={() => openMonth(entry.month)}
                    disabled={busy}
                  >
                    Open
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}

        {suggestions.map((month) => (
          <button
            key={month}
            type="button"
            className="bulletin-primary"
            onClick={() => openMonth(month)}
            disabled={busy}
          >
            Start {formatMonthLabel(month)}
          </button>
        ))}
      </div>
    </main>
  );
}
