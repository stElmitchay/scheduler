"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  opportunityKindLabels,
  opportunityKinds,
  type Opportunity,
  type OpportunityKind,
} from "@/lib/opportunities/types";
import { deadlineLabel } from "@/lib/opportunities/display.mjs";
import { formatEmploymentType } from "./format";

export function OpportunityBoard({
  opportunities,
}: {
  opportunities: Opportunity[];
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<OpportunityKind | "all">("all");

  // Only offer kinds that are actually on the board — a filter for Grant with
  // no grants on it is noise.
  const presentKinds = useMemo(
    () =>
      opportunityKinds.filter((entry) =>
        opportunities.some((opportunity) => opportunity.kind === entry),
      ),
    [opportunities],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return opportunities.filter((opportunity) => {
      const matchesQuery =
        !normalized ||
        [
          opportunity.title,
          opportunity.organisation,
          opportunity.location,
          opportunity.description,
          opportunityKindLabels[opportunity.kind],
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);

      return matchesQuery && (kind === "all" || opportunity.kind === kind);
    });
  }, [opportunities, query, kind]);

  return (
    <>
      <label className="opportunity-search">
        <span>Search</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Role, organisation or place"
          autoComplete="off"
        />
      </label>

      <div className="bulletin-filters" aria-label="Kind filters">
        <button
          type="button"
          className={kind === "all" ? "active" : ""}
          onClick={() => setKind("all")}
        >
          All kinds
        </button>
        {presentKinds.map((entry) => (
          <button
            key={entry}
            type="button"
            className={kind === entry ? "active" : ""}
            onClick={() => setKind(entry)}
          >
            {opportunityKindLabels[entry]}
          </button>
        ))}
      </div>

      <div className="bulletin-title-rule">
        {filtered.length === opportunities.length
          ? `${opportunities.length} open`
          : `${filtered.length} of ${opportunities.length}`}
      </div>

      <section className="opportunity-list" aria-label="Opportunities">
        {filtered.length === 0 ? (
          <p className="bulletin-empty">No opportunities match that.</p>
        ) : (
          filtered.map((opportunity) => (
            <OpportunityRow key={opportunity.id} opportunity={opportunity} />
          ))
        )}
      </section>
    </>
  );
}

// Split row: title and organisation left, deadline and place right, so a column
// of dates lines up down the board and "what closes soonest" needs no reading.
function OpportunityRow({ opportunity }: { opportunity: Opportunity }) {
  const deadline = deadlineLabel(opportunity.deadline);
  const meta = [
    opportunity.organisation,
    formatEmploymentType(opportunity.employmentType),
    opportunity.salary,
  ].filter(Boolean);

  return (
    <Link href={`/opportunities/${opportunity.slug}`} className="opportunity-row">
      <div className="opportunity-row-main">
        <span className={`opportunity-kind kind-${opportunity.kind}`}>
          {opportunityKindLabels[opportunity.kind]}
        </span>
        <h3>{opportunity.title}</h3>
        <p className="opportunity-row-meta">{meta.join(" · ")}</p>
      </div>
      <div className="opportunity-row-side">
        <b className={deadline?.urgent ? "urgent" : undefined}>
          {deadline ? deadline.short : "Open"}
        </b>
        <span>{opportunity.location}</span>
      </div>
    </Link>
  );
}
