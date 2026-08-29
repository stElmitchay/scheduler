"use client";

import { Archive, CheckCircle2, Pencil, RotateCcw, XCircle } from "lucide-react";
import { setJobOpportunityStatusAction } from "@/app/jobs/dashboard/actions";
import type {
  JobActionResult,
  JobDashboardPayload,
  JobOpportunity,
  JobStatus,
} from "@/lib/jobs/types";
import { formatJobDeadline, jobStatusLabels } from "./format";

const statuses: JobStatus[] = ["draft", "published", "closed", "archived"];

function nextActions(status: JobStatus): { label: string; status: JobStatus }[] {
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

function ActionIcon({ status }: { status: JobStatus }) {
  if (status === "published") return <CheckCircle2 size={14} aria-hidden="true" />;
  if (status === "closed") return <XCircle size={14} aria-hidden="true" />;
  if (status === "archived") return <Archive size={14} aria-hidden="true" />;

  return <RotateCcw size={14} aria-hidden="true" />;
}

export function JobDashboardList({
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
  payload: JobDashboardPayload;
  activeStatus: JobStatus;
  busy: boolean;
  notice: string;
  run: <T>(call: () => Promise<JobActionResult<T>>) => Promise<T | null>;
  onChanged: (payload: JobDashboardPayload) => void;
  onSelectStatus: (status: JobStatus) => void;
  onOpenSettings: () => void;
  onCreate: () => void;
  onEdit: (job: JobOpportunity) => void;
}) {
  const jobs = payload.jobs.filter((job) => job.status === activeStatus);

  async function changeStatus(job: JobOpportunity, status: JobStatus) {
    const next = await run(() =>
      setJobOpportunityStatusAction(token, job.id, status),
    );

    if (next) onChanged(next);
  }

  return (
    <>
      <div className="job-dashboard-actions">
        <button className="bulletin-primary" type="button" onClick={onCreate}>
          New job
        </button>
        <button
          className="bulletin-secondary-full"
          type="button"
          onClick={onOpenSettings}
        >
          Settings
        </button>
      </div>

      <nav className="job-tabs" aria-label="Job status">
        {statuses.map((status) => (
          <button
            key={status}
            type="button"
            className={status === activeStatus ? "active" : ""}
            onClick={() => onSelectStatus(status)}
          >
            {jobStatusLabels[status]}
          </button>
        ))}
      </nav>

      {notice ? <p className="bulletin-message error">{notice}</p> : null}

      <section
        className="jobs-list"
        aria-label={`${jobStatusLabels[activeStatus]} jobs`}
      >
        {jobs.length === 0 ? (
          <p className="bulletin-empty">
            No {jobStatusLabels[activeStatus].toLowerCase()} jobs.
          </p>
        ) : (
          jobs.map((job) => (
            <article className="job-card" key={job.id}>
              <span className="job-card-meta">{job.organisation}</span>
              <strong>{job.title}</strong>
              <span>{job.location}</span>
              {job.deadline ? (
                <small>Deadline: {formatJobDeadline(job.deadline)}</small>
              ) : null}
              <div className="job-card-actions">
                <button type="button" onClick={() => onEdit(job)} disabled={busy}>
                  <Pencil size={14} aria-hidden="true" />
                  Edit
                </button>
                {nextActions(job.status).map((action) => (
                  <button
                    key={action.status}
                    type="button"
                    onClick={() => changeStatus(job, action.status)}
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
