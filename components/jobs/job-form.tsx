"use client";

import { useState, type FormEvent } from "react";
import {
  removeJobAttachmentAction,
  saveJobOpportunityAction,
} from "@/app/jobs/dashboard/actions";
import {
  jobTypeLabels,
  jobTypes,
  type JobActionResult,
  type JobDashboardPayload,
  type JobOpportunity,
  type JobOpportunityInput,
} from "@/lib/jobs/types";

export function JobForm({
  token,
  job,
  busy,
  notice,
  run,
  onSaved,
  onBack,
}: {
  token: string;
  job: JobOpportunity | null;
  busy: boolean;
  notice: string;
  run: <T>(call: () => Promise<JobActionResult<T>>) => Promise<T | null>;
  onSaved: (payload: JobDashboardPayload) => void;
  onBack: () => void;
}) {
  const [input, setInput] = useState<JobOpportunityInput>({
    id: job?.id,
    title: job?.title ?? "",
    organisation: job?.organisation ?? "",
    location: job?.location ?? "",
    description: job?.description ?? "",
    requirements: job?.requirements ?? "",
    applicationInstructions: job?.applicationInstructions ?? "",
    applicationLink: job?.applicationLink ?? "",
    deadline: job?.deadline ?? "",
    salary: job?.salary ?? "",
    jobType: job?.jobType ?? "",
    organisationContact: job?.organisationContact ?? "",
  });

  function update(key: keyof JobOpportunityInput, value: string) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const next = await run(() => saveJobOpportunityAction(token, formData));

    if (next) onSaved(next);
  }

  async function removeAttachment() {
    if (!job) return;

    const next = await run(() => removeJobAttachmentAction(token, job.id));

    if (next) onSaved(next);
  }

  return (
    <main className="bulletin-page">
      <div className="bulletin-shell">
        <header className="bulletin-header">
          <div>
            <p className="bulletin-eyebrow">Welfare</p>
            <h1>{job ? "Edit job" : "New job"}</h1>
          </div>
          <button
            className="bulletin-icon-button"
            type="button"
            onClick={onBack}
            aria-label="Go back"
          >
            <span className="bulletin-back-mark">‹</span>
          </button>
        </header>
        <form className="job-form" onSubmit={submit}>
          <input type="hidden" name="id" value={input.id ?? ""} />
          <label>
            <span>Job title</span>
            <input
              name="title"
              value={input.title}
              onChange={(event) => update("title", event.target.value)}
            />
          </label>
          <label>
            <span>Organisation</span>
            <input
              name="organisation"
              value={input.organisation}
              onChange={(event) => update("organisation", event.target.value)}
            />
          </label>
          <label>
            <span>Location</span>
            <input
              name="location"
              value={input.location}
              onChange={(event) => update("location", event.target.value)}
            />
          </label>
          <label>
            <span>Description</span>
            <textarea
              name="description"
              value={input.description}
              onChange={(event) => update("description", event.target.value)}
              rows={5}
            />
          </label>
          <label>
            <span>Requirements</span>
            <textarea
              name="requirements"
              value={input.requirements}
              onChange={(event) => update("requirements", event.target.value)}
              rows={4}
            />
          </label>
          <label>
            <span>Application instructions</span>
            <textarea
              name="applicationInstructions"
              value={input.applicationInstructions}
              onChange={(event) =>
                update("applicationInstructions", event.target.value)
              }
              rows={4}
            />
          </label>
          <label>
            <span>Application link</span>
            <input
              name="applicationLink"
              value={input.applicationLink}
              onChange={(event) => update("applicationLink", event.target.value)}
            />
          </label>
          <label>
            <span>Deadline</span>
            <input
              type="date"
              name="deadline"
              value={input.deadline}
              onChange={(event) => update("deadline", event.target.value)}
            />
          </label>
          <label>
            <span>Salary</span>
            <input
              name="salary"
              value={input.salary}
              onChange={(event) => update("salary", event.target.value)}
            />
          </label>
          <label>
            <span>Job type</span>
            <select
              name="jobType"
              value={input.jobType}
              onChange={(event) => update("jobType", event.target.value)}
            >
              <option value="">Not specified</option>
              {jobTypes.map((type) => (
                <option key={type} value={type}>
                  {jobTypeLabels[type]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Organisation contact</span>
            <textarea
              name="organisationContact"
              value={input.organisationContact}
              onChange={(event) =>
                update("organisationContact", event.target.value)
              }
              rows={3}
            />
          </label>
          <label>
            <span>Attachment</span>
            <input
              type="file"
              name="attachment"
              accept=".pdf,image/png,image/jpeg,image/webp"
            />
          </label>
          {job?.attachmentName ? (
            <button
              className="bulletin-secondary-full"
              type="button"
              onClick={removeAttachment}
              disabled={busy}
            >
              Remove {job.attachmentName}
            </button>
          ) : null}
          <button className="bulletin-primary" type="submit" disabled={busy}>
            {busy ? "Saving..." : "Save draft"}
          </button>
          {notice ? <p className="bulletin-message error">{notice}</p> : null}
        </form>
      </div>
    </main>
  );
}
