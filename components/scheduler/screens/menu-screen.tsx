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
  const [opportunityModalOpen, setOpportunityModalOpen] = useState(false);

  function renderOpportunityModal() {
    if (!opportunityModalOpen || typeof document === "undefined") {
      return null;
    }

    return createPortal(
      <div className="bulletin-modal-backdrop" role="presentation">
        <div
          className="opportunity-menu-popup"
          role="dialog"
          aria-modal="true"
          aria-labelledby="opportunity-menu-title"
        >
          <button
            type="button"
            className="bulletin-modal-close"
            onClick={() => setOpportunityModalOpen(false)}
            aria-label="Close opportunities popup"
          >
            ×
          </button>
          <div>
            <p className="bulletin-eyebrow">Welfare</p>
            <h2 id="opportunity-menu-title">Opportunities</h2>
          </div>
          <Link href="/opportunities" className="bulletin-secondary-full opportunity-action-link">
            Opportunities Board
          </Link>
          <Link
            href="/opportunities/dashboard"
            className="bulletin-secondary-full opportunity-action-link"
          >
            Opportunities Dashboard
          </Link>
          <button
            className="bulletin-primary"
            type="button"
            onClick={() => setOpportunityModalOpen(false)}
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
          <button type="button" onClick={() => setOpportunityModalOpen(true)}>
            <span>
              <strong>Opportunities</strong>
              <small>Jobs, scholarships, and more from Welfare</small>
            </span>
            <b>›</b>
          </button>
        </nav>
        {renderOpportunityModal()}
      </div>
    </main>
  );
}
