"use client";

import { Archive, CheckCircle2, Pencil, RotateCcw, XCircle } from "lucide-react";
import { useState, type DragEvent } from "react";
import { setOpportunityStatusAction } from "@/app/opportunities/dashboard/actions";
import { deadlineLabel } from "@/lib/opportunities/display.mjs";
import {
  opportunityKindLabels,
  type Opportunity,
  type OpportunityActionResult,
  type OpportunityDashboardPayload,
  type OpportunityStatus,
} from "@/lib/opportunities/types";
import { opportunityStatusLabels } from "./format";

const statuses: OpportunityStatus[] = [
  "draft",
  "published",
  "closed",
  "archived",
];

// Mirrors assertAllowedStatusTransition in lib/opportunities/data.ts. Both the
// card buttons and the drop targets read from this, so neither can offer a move
// the server will reject.
const ALLOWED: Record<OpportunityStatus, OpportunityStatus[]> = {
  draft: ["published", "archived"],
  published: ["closed", "archived"],
  closed: ["archived"],
  archived: ["draft"],
};

const ACTION_LABELS: Record<OpportunityStatus, string> = {
  published: "Publish",
  closed: "Close",
  archived: "Archive",
  draft: "Restore",
};

function canMove(from: OpportunityStatus, to: OpportunityStatus) {
  return ALLOWED[from].includes(to);
}

function ActionIcon({ status }: { status: OpportunityStatus }) {
  if (status === "published") return <CheckCircle2 size={13} aria-hidden="true" />;
  if (status === "closed") return <XCircle size={13} aria-hidden="true" />;
  if (status === "archived") return <Archive size={13} aria-hidden="true" />;

  return <RotateCcw size={13} aria-hidden="true" />;
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
  onEdit: (opportunity: Opportunity) => void;
}) {
  const [dragging, setDragging] = useState<Opportunity | null>(null);
  const [over, setOver] = useState<OpportunityStatus | null>(null);

  async function changeStatus(
    opportunity: Opportunity,
    status: OpportunityStatus,
  ) {
    const next = await run(() =>
      setOpportunityStatusAction(token, opportunity.id, status),
    );

    if (next) onChanged(next);
  }

  function byStatus(status: OpportunityStatus) {
    return payload.opportunities.filter(
      (opportunity) => opportunity.status === status,
    );
  }

  function endDrag() {
    setDragging(null);
    setOver(null);
  }

  function onDragOver(event: DragEvent, target: OpportunityStatus) {
    if (busy || !dragging || !canMove(dragging.status, target)) return;

    // Only preventDefault on a legal target — without it the browser refuses the
    // drop, which is exactly the feedback an illegal move should give.
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setOver(target);
  }

  async function onDrop(event: DragEvent, target: OpportunityStatus) {
    event.preventDefault();

    const moved = dragging;
    endDrag();

    if (!moved || busy || !canMove(moved.status, target)) return;

    await changeStatus(moved, target);
  }

  function card(opportunity: Opportunity, draggable: boolean) {
    const deadline = deadlineLabel(opportunity.deadline);

    return (
      <article
        className={
          dragging?.id === opportunity.id
            ? "kanban-card is-dragging"
            : "kanban-card"
        }
        key={opportunity.id}
        draggable={draggable && !busy}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", opportunity.id);
          setDragging(opportunity);
        }}
        onDragEnd={endDrag}
      >
        <span className={`opportunity-kind kind-${opportunity.kind}`}>
          {opportunityKindLabels[opportunity.kind]}
        </span>
        <h4>{opportunity.title}</h4>
        <p>{opportunity.organisation}</p>
        <p className={deadline?.urgent ? "kanban-due urgent" : "kanban-due"}>
          {deadline ? deadline.short : "No deadline"}
          {opportunity.location ? ` · ${opportunity.location}` : ""}
        </p>
        <div className="kanban-card-actions">
          <button
            type="button"
            onClick={() => onEdit(opportunity)}
            disabled={busy}
          >
            <Pencil size={13} aria-hidden="true" />
            Edit
          </button>
          {ALLOWED[opportunity.status].map((target) => (
            <button
              key={target}
              type="button"
              onClick={() => changeStatus(opportunity, target)}
              disabled={busy}
            >
              <ActionIcon status={target} />
              {ACTION_LABELS[target]}
            </button>
          ))}
        </div>
      </article>
    );
  }

  const visible = byStatus(activeStatus);

  return (
    <>
      {notice ? <p className="bulletin-message error">{notice}</p> : null}

      {/* Below the breakpoint a four-column board is unusable, so narrow
          viewports keep the status tabs and a single list. Drag is a pointer
          gesture and does not work on touch, so cards there are not draggable —
          the buttons are the only path, and remain so everywhere. */}
      <nav className="opportunity-tabs app-mobile-only" aria-label="Opportunity status">
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

      <section className="kanban-single app-mobile-only">
        {visible.length === 0 ? (
          <p className="bulletin-empty">
            No {opportunityStatusLabels[activeStatus].toLowerCase()} opportunities.
          </p>
        ) : (
          visible.map((opportunity) => card(opportunity, false))
        )}
      </section>

      <section className="kanban" aria-label="Opportunities by status">
        {statuses.map((status) => {
          const column = byStatus(status);
          const receptive =
            dragging !== null &&
            dragging.status !== status &&
            canMove(dragging.status, status);

          return (
            <div className="kanban-col" key={status}>
              <header className="kanban-head">
                <b>{opportunityStatusLabels[status]}</b>
                <span>{column.length}</span>
              </header>
              <div
                className={[
                  "kanban-drop",
                  receptive ? "can-drop" : "",
                  over === status ? "is-over" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onDragOver={(event) => onDragOver(event, status)}
                onDragLeave={() => setOver((c) => (c === status ? null : c))}
                onDrop={(event) => onDrop(event, status)}
              >
                {column.length === 0 ? (
                  <p className="kanban-empty">
                    {receptive ? "Drop here" : "Nothing here"}
                  </p>
                ) : (
                  column.map((opportunity) => card(opportunity, true))
                )}
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}
