"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { refreshOpportunityDashboardAction } from "@/app/opportunities/dashboard/actions";
import type {
  Opportunity,
  OpportunityActionResult,
  OpportunityDashboardPayload,
  OpportunityStatus,
} from "@/lib/opportunities/types";
import { OpportunityDashboardGate } from "./opportunity-dashboard-gate";
import { OpportunityDashboardList } from "./opportunity-dashboard-list";
import { OpportunityForm } from "./opportunity-form";
import { OpportunitySettings } from "./opportunity-settings";

const TOKEN_KEY = "opportunity-dashboard-session";

type Screen = OpportunityStatus | "settings" | "form";

export function OpportunityDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [payload, setPayload] = useState<OpportunityDashboardPayload | null>(
    null,
  );
  const [screen, setScreen] = useState<Screen>("draft");
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [notice, setNotice] = useState("");
  const [gateNotice, setGateNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(true);

  const signOut = useCallback((message: string) => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setPayload(null);
    setGateNotice(message);
  }, []);

  const run = useCallback(
    async <T,>(
      call: () => Promise<OpportunityActionResult<T>>,
    ): Promise<T | null> => {
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

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const stored = sessionStorage.getItem(TOKEN_KEY);

      if (!stored) {
        if (!cancelled) setRestoring(false);
        return;
      }

      const result = await refreshOpportunityDashboardAction(stored);

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
          <p className="bulletin-empty">Loading...</p>
        </div>
      </main>
    );
  }

  if (!token || !payload) {
    return (
      <OpportunityDashboardGate
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

  if (screen === "form") {
    const returnScreen = editing?.status ?? "draft";

    return (
      <OpportunityForm
        token={token}
        opportunity={editing}
        busy={busy}
        notice={notice}
        run={run}
        onSaved={(nextPayload) => {
          setPayload(nextPayload);
          setEditing(null);
          setScreen(returnScreen);
        }}
        onBack={() => {
          setEditing(null);
          setNotice("");
          setScreen(returnScreen);
        }}
      />
    );
  }

  if (screen === "settings") {
    return (
      <OpportunitySettings
        token={token}
        settings={payload.settings}
        busy={busy}
        notice={notice}
        run={run}
        onSaved={(nextPayload) => {
          setPayload(nextPayload);
          setScreen("draft");
        }}
        onBack={() => {
          setNotice("");
          setScreen("draft");
        }}
      />
    );
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
        <OpportunityDashboardList
          token={token}
          payload={payload}
          activeStatus={screen}
          busy={busy}
          notice={notice}
          run={run}
          onChanged={setPayload}
          onSelectStatus={(status) => {
            setNotice("");
            setScreen(status);
          }}
          onOpenSettings={() => {
            setNotice("");
            setScreen("settings");
          }}
          onCreate={() => {
            setNotice("");
            setEditing(null);
            setScreen("form");
          }}
          onEdit={(opportunity) => {
            setNotice("");
            setEditing(opportunity);
            setScreen("form");
          }}
        />
      </div>
    </main>
  );
}
