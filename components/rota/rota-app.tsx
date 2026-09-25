"use client";

import Link from "next/link";
import { ShellWithMenus } from "@/components/shell/shell-with-menus";
import { ROTA_TOKEN_KEY } from "@/lib/rota/session-storage";
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

const TOKEN_KEY = ROTA_TOKEN_KEY;

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
      <ShellWithMenus active="rota">
        <main className="bulletin-page">
          <div className="bulletin-shell">
            <p className="bulletin-empty">Loading…</p>
          </div>
        </main>
      </ShellWithMenus>
    );
  }

  if (!token || !payload) {
    return (
      <ShellWithMenus active="rota">
        <RotaGate
          notice={gateNotice}
          onUnlocked={(nextPayload, nextToken) => {
            sessionStorage.setItem(TOKEN_KEY, nextToken);
            setToken(nextToken);
            setPayload(nextPayload);
            setGateNotice("");
          }}
        />
      </ShellWithMenus>
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
      <ShellWithMenus active="rota">
        <RotaSetup
          payload={payload}
          notice={notice}
          busy={busy}
          token={token}
          run={run}
          onSaved={setPayload}
          onBack={() => setScreen("months")}
        />
      </ShellWithMenus>
    );
  }

  if (screen === "people") {
    return (
      <ShellWithMenus active="rota">
        <PeopleManager
          payload={payload}
          notice={notice}
          busy={busy}
          token={token}
          run={run}
          onSaved={setPayload}
          onBack={() => setScreen("months")}
        />
      </ShellWithMenus>
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
  const activePeople = payload.people.filter((person) => person.isActive).length;
  const publishedCount = payload.periods.filter(
    (entry) => entry.status === "published",
  ).length;

  return (
    <ShellWithMenus
      active="rota"
      panel={
        <>
          <p className="app-panel-label">{payload.departmentName}</p>
          <div className="app-stat">
            <b>{activePeople}</b>
            <span>people on the team</span>
          </div>
          <div className="app-stat">
            <b>{payload.services.length}</b>
            <span>services configured</span>
          </div>
          <div className="app-stat">
            <b>{publishedCount}</b>
            <span>months published</span>
          </div>
        </>
      }
    >
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

        <nav className="rota-setup-nav" aria-label="Rota setup">
          <button type="button" onClick={() => setScreen("people")}>
            <strong>People</strong>
            <small>
              {activePeople} active on the team
            </small>
            <b aria-hidden="true">›</b>
          </button>
          <button type="button" onClick={() => setScreen("setup")}>
            <strong>Services and roles</strong>
            <small>
              {payload.services.length === 0
                ? "Not set up yet — start here"
                : `${payload.services.length} service${payload.services.length === 1 ? "" : "s"} configured`}
            </small>
            <b aria-hidden="true">›</b>
          </button>
        </nav>

        {notice ? <p className="bulletin-message error">{notice}</p> : null}

        <div className="bulletin-title-rule">Months</div>

        <section className="rota-month-list">
          {payload.periods.length === 0 && suggestions.length === 0 ? (
            <p className="bulletin-empty">No months started yet.</p>
          ) : null}

          {payload.periods.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="rota-month-row"
              onClick={() => openMonth(entry.month)}
              disabled={busy}
            >
              <span className="rota-month-name">
                {formatMonthLabel(entry.month)}
              </span>
              <span className={`bulletin-status-badge ${entry.status}`}>
                {entry.status}
              </span>
              <b aria-hidden="true">›</b>
            </button>
          ))}

          {suggestions.map((month) => (
            <button
              key={month}
              type="button"
              className="rota-month-row rota-month-new"
              onClick={() => openMonth(month)}
              disabled={busy}
            >
              <span className="rota-month-name">
                {formatMonthLabel(month)}
              </span>
              <span className="rota-month-hint">Not started</span>
              <b aria-hidden="true">+</b>
            </button>
          ))}
        </section>
      </div>
    </main>
    </ShellWithMenus>
  );
}
