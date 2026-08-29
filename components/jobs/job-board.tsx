"use client";

import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import {
  jobTypeLabels,
  jobTypes,
  type JobOpportunity,
  type JobType,
} from "@/lib/jobs/types";
import { formatJobDeadline, formatJobType } from "./format";

export function JobBoard({ jobs }: { jobs: JobOpportunity[] }) {
  const [query, setQuery] = useState("");
  const [jobType, setJobType] = useState<JobType | "all">("all");
  const [location, setLocation] = useState("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const locations = useMemo(
    () => Array.from(new Set(jobs.map((job) => job.location))).sort(),
    [jobs],
  );

  const filteredJobs = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesQuery =
        !normalized ||
        [job.title, job.organisation, job.location, job.description]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      const matchesType = jobType === "all" || job.jobType === jobType;
      const matchesLocation = location === "all" || job.location === location;

      return matchesQuery && matchesType && matchesLocation;
    });
  }, [jobs, query, jobType, location]);

  return (
    <>
      <section className="jobs-filter-shell" aria-label="Job filters">
        <div className="jobs-toolbar">
          <button
            type="button"
            className={filtersOpen ? "active" : ""}
            onClick={() => setFiltersOpen((current) => !current)}
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
            Filter
          </button>
          <button
            type="button"
            className={searchOpen ? "active jobs-search-toggle" : "jobs-search-toggle"}
            onClick={() => setSearchOpen((current) => !current)}
            aria-label="Search jobs"
          >
            <Search size={17} aria-hidden="true" />
          </button>
        </div>

        {searchOpen ? (
          <label className="jobs-search-panel">
            <span>Search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search jobs"
            />
          </label>
        ) : null}

        {filtersOpen ? (
          <div className="jobs-filters-panel">
            <label>
              <span>Type</span>
              <select
                value={jobType}
                onChange={(event) =>
                  setJobType(event.target.value as JobType | "all")
                }
              >
                <option value="all">All types</option>
                {jobTypes.map((type) => (
                  <option key={type} value={type}>
                    {jobTypeLabels[type]}
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

      <section className="jobs-list" aria-label="Job opportunities">
        {filteredJobs.length === 0 ? (
          <p className="bulletin-empty">No opportunities match those filters.</p>
        ) : (
          filteredJobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.slug}`} className="job-card">
              <span className="job-card-meta">{job.organisation}</span>
              <strong>{job.title}</strong>
              <span>
                {[job.location, formatJobType(job.jobType), job.salary]
                  .filter(Boolean)
                  .join(" / ")}
              </span>
              {job.deadline ? (
                <small>Deadline: {formatJobDeadline(job.deadline)}</small>
              ) : null}
            </Link>
          ))
        )}
      </section>
    </>
  );
}
