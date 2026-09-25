"use client";

import { Archive, CheckCircle2, Pencil, RotateCcw, XCircle } from "lucide-react";
import { setOpportunityStatusAction } from "@/app/opportunities/dashboard/actions";
import type {
  Opportunity,
  OpportunityActionResult,
  OpportunityDashboardPayload,
  OpportunityStatus,
} from "@/lib/opportunities/types";
import {
  formatOpportunityDeadline,
  formatOpportunityKind,
  opportunityStatusLabels,
} from "./format";

const statuses: OpportunityStatus[] = [
  "draft",
  "published",
  "closed",
  "archived",
];

function nextActions(
  status: OpportunityStatus,
): { label: string; status: OpportunityStatus }[] {
  if (status === "draft") {
    return [
      { label: "Publish", status: "published" },
      { label: "Archive", status: "archived" },
    ];
  }

  if (status === "published") {
    return [
      { label: "Close", status: "closed" },
      { label: "Archive", status: "archived" },
    ];
  }

  if (status === "closed") {
    return [{ label: "Archive", status: "archived" }];
  }

  return [{ label: "Restore", status: "draft" }];
}

function ActionIcon({ status }: { status: OpportunityStatus }) {
  if (status === "published") return <CheckCircle2 size={14} aria-hidden="true" />;
  if (status === "closed") return <XCircle size={14} aria-hidden="true" />;
  if (status === "archived") return <Archive size={14} aria-hidden="true" />;

  return <RotateCcw size={14} aria-hidden="true" />;
}

export function OpportunityDashboardList({
  token,
  payload,
  activeStatus,
  busy,
  notice,
  run,
  onChanged,
  onSelectStatus,
  onOpenSettings,
  onCreate,
  onEdit,
}: {
  token: string;
  payload: OpportunityDashboardPayload;
  activeStatus: OpportunityStatus;
  busy: boolean;
  notice: string;
  run: <T>(
    call: () => Promise<OpportunityActionResult<T>>,
  ) => Promise<T | null>;
  onChanged: (payload: OpportunityDashboardPayload) => void;
  onSelectStatus: (status: OpportunityStatus) => void;
  onOpenSettings: () => void;
  onCreate: () => void;
  onEdit: (opportunity: Opportunity) => void;
}) {
  const visible = payload.opportunities.filter(
    (opportunity) => opportunity.status === activeStatus,
  );

  async function changeStatus(
    opportunity: Opportunity,
    status: OpportunityStatus,
  ) {
    const next = await run(() =>
      setOpportunityStatusAction(token, opportunity.id, status),
    );

    if (next) onChanged(next);
  }

  return (
    <>
      <div className="opportunity-dashboard-actions">
        <button className="bulletin-primary" type="button" onClick={onCreate}>
          New opportunity
        </button>
        <button
          className="bulletin-secondary-full"
          type="button"
          onClick={onOpenSettings}
        >
          Settings
        </button>
      </div>

      <nav className="opportunity-tabs" aria-label="Opportunity status">
        {statuses.map((status) => (
          <button
            key={status}
            type="button"
            className={status === activeStatus ? "active" : ""}
            onClick={() => onSelectStatus(status)}
          >
            {opportunityStatusLabels[status]}
          </button>
        ))}
      </nav>

      {notice ? <p className="bulletin-message error">{notice}</p> : null}

      <section
        className="opportunities-list"
        aria-label={`${opportunityStatusLabels[activeStatus]} opportunities`}
      >
        {visible.length === 0 ? (
          <p className="bulletin-empty">
            No {opportunityStatusLabels[activeStatus].toLowerCase()}{" "}
            opportunities.
          </p>
        ) : (
          visible.map((opportunity) => (
            <article className="opportunity-card" key={opportunity.id}>
              <span className="opportunity-card-top">
                <span className="opportunity-card-meta">
                  {opportunity.organisation}
                </span>
                <span className="opportunity-kind-badge">
                  {formatOpportunityKind(opportunity.kind)}
                </span>
              </span>
              <strong>{opportunity.title}</strong>
              <span>{opportunity.location}</span>
              {opportunity.deadline ? (
                <small>
                  Deadline: {formatOpportunityDeadline(opportunity.deadline)}
                </small>
              ) : null}
              <div className="opportunity-card-actions">
                <button
                  type="button"
                  onClick={() => onEdit(opportunity)}
                  disabled={busy}
                >
                  <Pencil size={14} aria-hidden="true" />
                  Edit
                </button>
                {nextActions(opportunity.status).map((action) => (
                  <button
                    key={action.status}
                    type="button"
                    onClick={() => changeStatus(opportunity, action.status)}
                    disabled={busy}
                  >
                    <ActionIcon status={action.status} />
                    {action.label}
                  </button>
                ))}
              </div>
            </article>
          ))
        )}
      </section>
    </>
  );
}
