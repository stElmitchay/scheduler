"use client";

import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import {
  employmentTypeLabels,
  employmentTypes,
  opportunityKindLabels,
  opportunityKinds,
  type EmploymentType,
  type Opportunity,
  type OpportunityKind,
} from "@/lib/opportunities/types";
import {
  formatEmploymentType,
  formatOpportunityDeadline,
  formatOpportunityKind,
} from "./format";

export function OpportunityBoard({
  opportunities,
}: {
  opportunities: Opportunity[];
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<OpportunityKind | "all">("all");
  const [employmentType, setEmploymentType] = useState<EmploymentType | "all">(
    "all",
  );
  const [location, setLocation] = useState("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const locations = useMemo(
    () =>
      Array.from(
        new Set(opportunities.map((opportunity) => opportunity.location)),
      ).sort(),
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
      const matchesKind = kind === "all" || opportunity.kind === kind;
      const matchesEmploymentType =
        employmentType === "all" ||
        opportunity.employmentType === employmentType;
      const matchesLocation =
        location === "all" || opportunity.location === location;

      return (
        matchesQuery && matchesKind && matchesEmploymentType && matchesLocation
      );
    });
  }, [opportunities, query, kind, employmentType, location]);

  return (
    <>
      <section
        className="opportunities-filter-shell"
        aria-label="Opportunity filters"
      >
        <div className="opportunities-toolbar">
          <button
            type="button"
            className={
              filtersOpen
                ? "opportunities-filter-button active"
                : "opportunities-filter-button"
            }
            onClick={() => setFiltersOpen((current) => !current)}
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
            <span>Filter</span>
          </button>
          <button
            type="button"
            className={
              searchOpen
                ? "active opportunities-search-toggle"
                : "opportunities-search-toggle"
            }
            onClick={() => setSearchOpen((current) => !current)}
            aria-label="Search opportunities"
          >
            <Search size={17} aria-hidden="true" />
          </button>
        </div>

        {searchOpen ? (
          <label className="opportunities-search-panel">
            <span>Search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search opportunities"
            />
          </label>
        ) : null}

        {filtersOpen ? (
          <div className="opportunities-filters-panel">
            <label>
              <span>Kind</span>
              <select
                value={kind}
                onChange={(event) =>
                  setKind(event.target.value as OpportunityKind | "all")
                }
              >
                <option value="all">All kinds</option>
                {opportunityKinds.map((entry) => (
                  <option key={entry} value={entry}>
                    {opportunityKindLabels[entry]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Employment type</span>
              <select
                value={employmentType}
                onChange={(event) =>
                  setEmploymentType(
                    event.target.value as EmploymentType | "all",
                  )
                }
              >
                <option value="all">All types</option>
                {employmentTypes.map((type) => (
                  <option key={type} value={type}>
                    {employmentTypeLabels[type]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Location</span>
              <select
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              >
                <option value="all">All locations</option>
                {locations.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </section>

      <section className="opportunities-list" aria-label="Opportunities">
        {filtered.length === 0 ? (
          <p className="bulletin-empty">No opportunities match those filters.</p>
        ) : (
          filtered.map((opportunity) => (
            <Link
              key={opportunity.id}
              href={`/opportunities/${opportunity.slug}`}
              className="opportunity-card"
            >
              <span className="opportunity-card-top">
                <span className="opportunity-card-meta">
                  {opportunity.organisation}
                </span>
                <span className="opportunity-kind-badge">
                  {formatOpportunityKind(opportunity.kind)}
                </span>
              </span>
              <strong>{opportunity.title}</strong>
              <span>
                {[
                  opportunity.location,
                  formatEmploymentType(opportunity.employmentType),
                  opportunity.salary,
                ]
                  .filter(Boolean)
                  .join(" / ")}
              </span>
              {opportunity.deadline ? (
                <small>
                  Deadline: {formatOpportunityDeadline(opportunity.deadline)}
                </small>
              ) : null}
            </Link>
          ))
        )}
      </section>
    </>
  );
}
