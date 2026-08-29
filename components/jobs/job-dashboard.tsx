"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { refreshJobDashboardAction } from "@/app/jobs/dashboard/actions";
import type {
  JobActionResult,
  JobDashboardPayload,
  JobOpportunity,
  JobStatus,
} from "@/lib/jobs/types";
import { JobDashboardGate } from "./job-dashboard-gate";
import { JobDashboardList } from "./job-dashboard-list";
import { JobForm } from "./job-form";
import { JobSettings } from "./job-settings";

const TOKEN_KEY = "job-dashboard-session";

type Screen = JobStatus | "settings" | "form";

export function JobDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [payload, setPayload] = useState<JobDashboardPayload | null>(null);
  const [screen, setScreen] = useState<Screen>("draft");
  const [editingJob, setEditingJob] = useState<JobOpportunity | null>(null);
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
    async <T,>(call: () => Promise<JobActionResult<T>>): Promise<T | null> => {
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

      const result = await refreshJobDashboardAction(stored);

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
      <JobDashboardGate
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
    const returnScreen = editingJob?.status ?? "draft";

    return (
      <JobForm
        token={token}
        job={editingJob}
        busy={busy}
        notice={notice}
        run={run}
        onSaved={(nextPayload) => {
          setPayload(nextPayload);
          setEditingJob(null);
          setScreen(returnScreen);
        }}
        onBack={() => {
          setEditingJob(null);
          setNotice("");
          setScreen(returnScreen);
        }}
      />
    );
  }

  if (screen === "settings") {
    return (
      <JobSettings
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
            <h1>Job Dashboard</h1>
          </div>
          <Link className="bulletin-icon-button" href="/" aria-label="Go back">
            <span className="bulletin-back-mark">‹</span>
          </Link>
        </header>
        <JobDashboardList
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
            setEditingJob(null);
            setScreen("form");
          }}
          onEdit={(job) => {
            setNotice("");
            setEditingJob(job);
            setScreen("form");
          }}
        />
      </div>
    </main>
  );
}
