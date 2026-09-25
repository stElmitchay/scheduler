"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
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
import { deadlineLabel } from "@/lib/opportunities/display.mjs";

const STEP_COUNT = 6;

// Steps are hidden, never unmounted — FormData is read off the form element, so
// an unmounted input would silently drop its value on save.
function stepClass(index: number, step: number) {
  return index === step ? "wizard-step active" : "wizard-step";
}

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
  // Creating is a guided walk through questions not yet answered. Editing is the
  // opposite job — you came for one field and should not have to page past five
  // others to reach it — so it is one screen.
  const isEditing = Boolean(opportunity);

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
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState("");
  const [fileName, setFileName] = useState("");
  const shellRef = useRef<HTMLDivElement>(null);

  function update(key: keyof OpportunityInput, value: string) {
    setInput((current) => ({ ...current, [key]: value }));
    setStepError("");
  }

  // Employment type only means something for a job, so it is cleared the moment
  // the kind moves away. The server enforces the same rule.
  function updateKind(value: string) {
    setInput((current) => ({
      ...current,
      kind: value as OpportunityInput["kind"],
      employmentType: value === "job" ? current.employmentType : "",
    }));
    setStepError("");
  }

  const isJob = input.kind === "job";
  const previewDeadline = deadlineLabel(input.deadline || null);
  const hasApplicationRoute = Boolean(
    input.applicationLink.trim() ||
      input.applicationInstructions.trim() ||
      input.organisationContact.trim(),
  );

  // Only the rules that block a draft from saving. The apply route is not one of
  // them — it blocks publishing, so it stays a hint.
  function problemWith(index: number) {
    if (index === 1) {
      if (!input.title.trim()) return "A title is needed.";
      if (!input.organisation.trim()) return "An organisation is needed.";
      if (!input.location.trim()) return "A location is needed.";
    }

    if (index === 2 && !input.description.trim()) {
      return "A description is needed.";
    }

    return "";
  }

  function go(next: number) {
    const target = Math.max(0, Math.min(STEP_COUNT - 1, next));

    if (target > step) {
      const problem = problemWith(step);

      if (problem) {
        setStepError(problem);
        return;
      }
    }

    setStepError("");
    setStep(target);
    shellRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  // Enter moves on rather than submitting, except on the last step. Without this
  // a stray Return on step 1 would save a half-filled draft. Editing is a normal
  // form, so Enter behaves normally there.
  function onKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (isEditing) return;

    const target = event.target as HTMLElement;

    if (event.key !== "Enter" || target.tagName === "TEXTAREA") return;
    if (step === STEP_COUNT - 1) return;

    event.preventDefault();
    go(step + 1);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    for (let index = 0; index < STEP_COUNT; index += 1) {
      const problem = problemWith(index);

      if (problem) {
        if (!isEditing) setStep(index);
        setStepError(problem);
        return;
      }
    }

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

  // One definition per field group, shared by both modes so they cannot drift.
  const kindField = (
    <>
      <div className="wizard-choices">
        {opportunityKinds.map((entry) => (
          <label
            key={entry}
            className={input.kind === entry ? "wizard-choice on" : "wizard-choice"}
          >
            <input
              type="radio"
              name="kind"
              value={entry}
              checked={input.kind === entry}
              onChange={(event) => updateKind(event.target.value)}
            />
            {opportunityKindLabels[entry]}
          </label>
        ))}
      </div>
      {isJob ? (
        <label className="form-field wizard-field">
          <span>Employment type</span>
          <select
            name="employmentType"
            value={input.employmentType}
            onChange={(event) => update("employmentType", event.target.value)}
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
    </>
  );

  const identityFields = (
    <>
      <label className="form-field wizard-field">
        <span>Title</span>
        <input
          name="title"
          value={input.title}
          onChange={(event) => update("title", event.target.value)}
          placeholder={isJob ? "Graduate Trainee" : "Undergraduate Award"}
        />
      </label>
      <div className="form-grid">
        <label className="form-field">
          <span>Organisation</span>
          <input
            name="organisation"
            value={input.organisation}
            onChange={(event) => update("organisation", event.target.value)}
          />
        </label>
        <label className="form-field">
          <span>Location</span>
          <input
            name="location"
            value={input.location}
            onChange={(event) => update("location", event.target.value)}
            placeholder="Freetown"
          />
        </label>
      </div>
    </>
  );

  const detailFields = (
    <>
      <label className="form-field wizard-field">
        <span>Description</span>
        <textarea
          name="description"
          value={input.description}
          onChange={(event) => update("description", event.target.value)}
          rows={6}
        />
        <small>The first two lines show on the board.</small>
      </label>
      <label className="form-field wizard-field">
        <span>Requirements</span>
        <textarea
          name="requirements"
          value={input.requirements}
          onChange={(event) => update("requirements", event.target.value)}
          rows={4}
          placeholder="Optional"
        />
      </label>
    </>
  );

  const applyFields = (
    <>
      <p className={hasApplicationRoute ? "form-hint ok" : "form-hint"}>
        {hasApplicationRoute
          ? "There is a way to apply, so this can be published."
          : "Fill at least one of these. A draft saves without them, but it cannot be published."}
      </p>
      <label className="form-field wizard-field">
        <span>Application link</span>
        <input
          name="applicationLink"
          value={input.applicationLink}
          onChange={(event) => update("applicationLink", event.target.value)}
          placeholder="https://"
        />
      </label>
      <label className="form-field wizard-field">
        <span>Application instructions</span>
        <textarea
          name="applicationInstructions"
          value={input.applicationInstructions}
          onChange={(event) =>
            update("applicationInstructions", event.target.value)
          }
          rows={3}
        />
      </label>
      <label className="form-field wizard-field">
        <span>Organisation contact</span>
        <textarea
          name="organisationContact"
          value={input.organisationContact}
          onChange={(event) => update("organisationContact", event.target.value)}
          rows={2}
          placeholder="Name, phone or email"
        />
      </label>
    </>
  );

  const extraFields = (
    <>
      <div className="form-grid">
        <label className="form-field">
          <span>{isJob ? "Salary" : "Award or stipend"}</span>
          <input
            name="salary"
            value={input.salary}
            onChange={(event) => update("salary", event.target.value)}
            placeholder="Optional"
          />
        </label>
        <label className="form-field">
          <span>Deadline</span>
          <input
            type="date"
            name="deadline"
            value={input.deadline}
            onChange={(event) => update("deadline", event.target.value)}
          />
          <small>Closes itself once this date passes.</small>
        </label>
      </div>
      {opportunity?.attachmentName ? (
        <div className="form-attachment">
          <span>{opportunity.attachmentName}</span>
          <button type="button" onClick={removeAttachment} disabled={busy}>
            Remove
          </button>
        </div>
      ) : null}
      <div className="form-field wizard-field">
        <span>{opportunity?.attachmentName ? "Replace file" : "Add a file"}</span>
        <label className="file-drop">
          <input
            type="file"
            name="attachment"
            accept=".pdf,image/png,image/jpeg,image/webp"
            onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
          />
          <span className="file-drop-button">Choose file</span>
          <span className={fileName ? "file-drop-name chosen" : "file-drop-name"}>
            {fileName || "No file chosen"}
          </span>
        </label>
        <small>PDF, PNG, JPG or WEBP, up to 10 MB.</small>
      </div>
    </>
  );

  const boardPreview = (
    <div className="wizard-preview">
      <div className="opportunity-list">
        <div className="opportunity-row">
          <div className="opportunity-row-main">
            <span className={`opportunity-kind kind-${input.kind}`}>
              {opportunityKindLabels[input.kind]}
            </span>
            <h3>{input.title || "Untitled"}</h3>
            <p className="opportunity-row-meta">
              {[
                input.organisation,
                isJob && input.employmentType
                  ? employmentTypeLabels[input.employmentType]
                  : "",
                input.salary,
              ]
                .filter(Boolean)
                .join(" · ") || "No organisation yet"}
            </p>
          </div>
          <div className="opportunity-row-side">
            <b className={previewDeadline?.urgent ? "urgent" : undefined}>
              {previewDeadline ? previewDeadline.short : "Open"}
            </b>
            <span>{input.location}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const fullPreview = (
    <div className="wizard-preview">
      <article className="opportunity-detail">
        <div className="opportunity-detail-head">
          <div>
            <span className={`opportunity-kind kind-${input.kind}`}>
              {opportunityKindLabels[input.kind]}
            </span>
            <p className="bulletin-eyebrow">
              {input.organisation || "Organisation"}
            </p>
            <h1>{input.title || "Untitled"}</h1>
            <p className="opportunity-detail-meta">
              {[
                input.location,
                isJob && input.employmentType
                  ? employmentTypeLabels[input.employmentType]
                  : "",
                input.salary,
              ]
                .filter(Boolean)
                .join(" / ")}
            </p>
            {previewDeadline ? (
              <p
                className={
                  previewDeadline.urgent
                    ? "opportunity-detail-deadline urgent"
                    : "opportunity-detail-deadline"
                }
              >
                {previewDeadline.text}
              </p>
            ) : null}
          </div>
        </div>
        <section>
          <h2>Description</h2>
          <p>{input.description || "No description yet."}</p>
        </section>
        {input.requirements ? (
          <section>
            <h2>Requirements</h2>
            <p>{input.requirements}</p>
          </section>
        ) : null}
        {input.applicationInstructions ? (
          <section>
            <h2>Application instructions</h2>
            <p>{input.applicationInstructions}</p>
          </section>
        ) : null}
        {input.organisationContact ? (
          <section>
            <h2>Contact</h2>
            <p>{input.organisationContact}</p>
          </section>
        ) : null}
        {fileName || opportunity?.attachmentName ? (
          <p className="wizard-preview-note">
            Attachment: {fileName || opportunity?.attachmentName}
          </p>
        ) : null}
        {input.applicationLink ? (
          <p className="wizard-preview-note">
            Apply button links to {input.applicationLink}
          </p>
        ) : null}
      </article>
    </div>
  );

  return (
    <main className="bulletin-page">
      <div className="bulletin-shell" ref={shellRef}>
        <header className="bulletin-header">
          <div>
            <p className="bulletin-eyebrow">Welfare</p>
            <h1>{isEditing ? "Edit opportunity" : "New opportunity"}</h1>
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

        {isEditing ? null : (
          <>
            <div className="wizard-progress" aria-hidden="true">
              <div style={{ width: `${((step + 1) / STEP_COUNT) * 100}%` }} />
            </div>
            <p className="wizard-count">
              Step {step + 1} of {STEP_COUNT}
            </p>
          </>
        )}

        <form className="wizard" onSubmit={submit} onKeyDown={onKeyDown}>
          <input type="hidden" name="id" value={input.id ?? ""} />

          {isEditing ? (
            <>
              <p className="wizard-preview-label">How it looks now</p>
              {boardPreview}
              <p className="edit-note">
                Everything is already filled in — change only what you need. The
                preview updates as you type.
              </p>

              <div className="bulletin-title-rule">What it is</div>
              {kindField}
              {identityFields}

              <div className="bulletin-title-rule">Details</div>
              {detailFields}

              <div className="bulletin-title-rule">How to apply</div>
              {applyFields}

              <div className="bulletin-title-rule">Money, deadline and file</div>
              {extraFields}

              <div className="bulletin-title-rule">Full posting</div>
              {fullPreview}
            </>
          ) : (
            <>
              <fieldset className={stepClass(0, step)}>
                <legend className="wizard-q">
                  What kind of opportunity is this?
                </legend>
                <p className="wizard-help">
                  This is how people filter the board. Employment type only
                  applies to a job.
                </p>
                {kindField}
              </fieldset>

              <fieldset className={stepClass(1, step)}>
                <legend className="wizard-q">
                  What is it called, and who is offering it?
                </legend>
                {identityFields}
              </fieldset>

              <fieldset className={stepClass(2, step)}>
                <legend className="wizard-q">Describe it</legend>
                {detailFields}
              </fieldset>

              <fieldset className={stepClass(3, step)}>
                <legend className="wizard-q">How does someone apply?</legend>
                {applyFields}
              </fieldset>

              <fieldset className={stepClass(4, step)}>
                <legend className="wizard-q">Money, deadline and any file</legend>
                {extraFields}
              </fieldset>

              <fieldset className={stepClass(5, step)}>
                <legend className="wizard-q">Preview</legend>
                <p className="wizard-help">
                  Exactly what people will see. Saving puts this in Draft.
                </p>
                <p className="wizard-preview-label">On the board</p>
                {boardPreview}
                <p className="wizard-preview-label">The full posting</p>
                {fullPreview}
                <p className={hasApplicationRoute ? "form-hint ok" : "form-hint"}>
                  {hasApplicationRoute
                    ? "Ready to publish once saved."
                    : "This saves as a draft, but needs a link, instructions or a contact before it can be published."}
                </p>
              </fieldset>
            </>
          )}

          <div className="wizard-nav">
            <button
              type="button"
              className="bulletin-secondary-full"
              onClick={() => (isEditing || step === 0 ? onBack() : go(step - 1))}
              disabled={busy}
            >
              {isEditing || step === 0 ? "Cancel" : "Back"}
            </button>
            {isEditing || step === STEP_COUNT - 1 ? (
              <button className="bulletin-primary" type="submit" disabled={busy}>
                {busy ? "Saving..." : isEditing ? "Save changes" : "Save draft"}
              </button>
            ) : (
              <button
                type="button"
                className="bulletin-primary"
                onClick={() => go(step + 1)}
                disabled={busy}
              >
                Next
              </button>
            )}
          </div>

          {stepError ? <p className="bulletin-message error">{stepError}</p> : null}
          {notice ? <p className="bulletin-message error">{notice}</p> : null}
        </form>
      </div>
    </main>
  );
}
