"use client";

import Link from "next/link";
import { useState } from "react";
import { createPortal } from "react-dom";
import { BulletinHeader } from "../bulletin-header";

export type ProtectedTarget = "add" | "manage" | "pastor";

export function MenuScreen({
  onBack,
  onOpenProtected,
  onOpenCalendar,
}: {
  onBack: () => void;
  onOpenProtected: (target: ProtectedTarget) => void;
  onOpenCalendar: () => void;
}) {
  const [jobModalOpen, setJobModalOpen] = useState(false);

  function renderJobModal() {
    if (!jobModalOpen || typeof document === "undefined") {
      return null;
    }

    return createPortal(
      <div className="bulletin-modal-backdrop" role="presentation">
        <div
          className="job-menu-popup"
          role="dialog"
          aria-modal="true"
          aria-labelledby="job-menu-title"
        >
          <button
            type="button"
            className="bulletin-modal-close"
            onClick={() => setJobModalOpen(false)}
            aria-label="Close job popup"
          >
            ×
          </button>
          <div>
            <p className="bulletin-eyebrow">Job</p>
            <h2 id="job-menu-title">Open jobs</h2>
          </div>
          <Link href="/jobs" className="bulletin-secondary-full job-action-link">
            Job Board
          </Link>
          <Link
            href="/jobs/dashboard"
            className="bulletin-secondary-full job-action-link"
          >
            Job Dashboard
          </Link>
          <button
            className="bulletin-primary"
            type="button"
            onClick={() => setJobModalOpen(false)}
          >
            Close
          </button>
        </div>
      </div>,
      document.body,
    );
  }

  return (
    <main className="bulletin-page">
      <div className="bulletin-shell">
        <BulletinHeader eyebrow="Kharis Church" title="Menu" onBack={onBack} />
        <nav className="bulletin-menu-panel" aria-label="Scheduler menu">
          <button type="button" onClick={() => onOpenProtected("add")}>
            <span>
              <strong>Add activity</strong>
              <small>Add a space booking or church activity</small>
            </span>
            <b>+</b>
          </button>
          <button type="button" onClick={() => onOpenProtected("manage")}>
            <span>
              <strong>Manage activities</strong>
              <small>Edit, confirm, or cancel what you own</small>
            </span>
            <b>›</b>
          </button>
          <button type="button" onClick={() => onOpenProtected("pastor")}>
            <span>
              <strong>Pastor dashboard</strong>
              <small>Pastor code required</small>
            </span>
            <b>›</b>
          </button>
          <button type="button" onClick={onOpenCalendar}>
            <span>
              <strong>Full calendar</strong>
              <small>Public month view and space filters</small>
            </span>
            <b>›</b>
          </button>
          <a href="/rota" className="bulletin-menu-link">
            <span>
              <strong>Serving rota</strong>
              <small>Build and share your department rota</small>
            </span>
            <b>›</b>
          </a>
          <button type="button" onClick={() => setJobModalOpen(true)}>
            <span>
              <strong>Job</strong>
              <small>Open the Job Board or Welfare dashboard</small>
            </span>
            <b>›</b>
          </button>
        </nav>
        {renderJobModal()}
      </div>
    </main>
  );
}
