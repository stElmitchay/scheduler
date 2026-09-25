"use client";

import { useState, type FormEvent } from "react";
import {
  removeOpportunityAttachmentAction,
  saveOpportunityAction,
} from "@/app/opportunities/dashboard/actions";
import {
  employmentTypeLabels,
  employmentTypes,
  opportunityKindLabels,
  opportunityKinds,
  type Opportunity,
  type OpportunityActionResult,
  type OpportunityDashboardPayload,
  type OpportunityInput,
} from "@/lib/opportunities/types";

export function OpportunityForm({
  token,
  opportunity,
  busy,
  notice,
  run,
  onSaved,
  onBack,
}: {
  token: string;
  opportunity: Opportunity | null;
  busy: boolean;
  notice: string;
  run: <T>(
    call: () => Promise<OpportunityActionResult<T>>,
  ) => Promise<T | null>;
  onSaved: (payload: OpportunityDashboardPayload) => void;
  onBack: () => void;
}) {
  const [input, setInput] = useState<OpportunityInput>({
    id: opportunity?.id,
    title: opportunity?.title ?? "",
    kind: opportunity?.kind ?? "job",
    organisation: opportunity?.organisation ?? "",
    location: opportunity?.location ?? "",
    description: opportunity?.description ?? "",
    requirements: opportunity?.requirements ?? "",
    applicationInstructions: opportunity?.applicationInstructions ?? "",
    applicationLink: opportunity?.applicationLink ?? "",
    deadline: opportunity?.deadline ?? "",
    salary: opportunity?.salary ?? "",
    employmentType: opportunity?.employmentType ?? "",
    organisationContact: opportunity?.organisationContact ?? "",
  });

  function update(key: keyof OpportunityInput, value: string) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  // Employment type only means something for a job, so it is cleared the moment
  // the kind moves away. The server enforces the same rule.
  function updateKind(value: string) {
    setInput((current) => ({
      ...current,
      kind: value as OpportunityInput["kind"],
      employmentType: value === "job" ? current.employmentType : "",
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const next = await run(() => saveOpportunityAction(token, formData));

    if (next) onSaved(next);
  }

  async function removeAttachment() {
    if (!opportunity) return;

    const next = await run(() =>
      removeOpportunityAttachmentAction(token, opportunity.id),
    );

    if (next) onSaved(next);
  }

  return (
    <main className="bulletin-page">
      <div className="bulletin-shell">
        <header className="bulletin-header">
          <div>
            <p className="bulletin-eyebrow">Welfare</p>
            <h1>{opportunity ? "Edit opportunity" : "New opportunity"}</h1>
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
        <form className="opportunity-form" onSubmit={submit}>
          <input type="hidden" name="id" value={input.id ?? ""} />
          <label>
            <span>Opportunity kind</span>
            <select
              name="kind"
              value={input.kind}
              onChange={(event) => updateKind(event.target.value)}
            >
              {opportunityKinds.map((entry) => (
                <option key={entry} value={entry}>
                  {opportunityKindLabels[entry]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Title</span>
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
            <span>{input.kind === "job" ? "Salary" : "Award or stipend"}</span>
            <input
              name="salary"
              value={input.salary}
              onChange={(event) => update("salary", event.target.value)}
            />
          </label>
          {input.kind === "job" ? (
            <label>
              <span>Employment type</span>
              <select
                name="employmentType"
                value={input.employmentType}
                onChange={(event) =>
                  update("employmentType", event.target.value)
                }
              >
                <option value="">Not specified</option>
                {employmentTypes.map((type) => (
                  <option key={type} value={type}>
                    {employmentTypeLabels[type]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
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
          {opportunity?.attachmentName ? (
            <button
              className="bulletin-secondary-full"
              type="button"
              onClick={removeAttachment}
              disabled={busy}
            >
              Remove {opportunity.attachmentName}
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
