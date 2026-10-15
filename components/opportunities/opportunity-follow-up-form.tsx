"use client";

import { useActionState, useState } from "react";
import {
  submitOpportunityFollowUpAction,
  type OpportunityFollowUpActionState,
} from "@/app/opportunities/follow-up/actions";
import type { OpportunityFollowUpOpportunity } from "@/lib/opportunities/types";

const initialState: OpportunityFollowUpActionState = {};

function YesNoQuestion({
  name,
  label,
  onChange,
}: {
  name: string;
  label: string;
  onChange?: (value: boolean) => void;
}) {
  return (
    <fieldset className="opportunity-follow-up-question">
      <legend>{label}</legend>
      <div className="opportunity-follow-up-options">
        <label className="opportunity-follow-up-option">
          <input
            type="radio"
            name={name}
            value="yes"
            required
            onChange={onChange ? () => onChange(true) : undefined}
          />
          Yes
        </label>
        <label className="opportunity-follow-up-option">
          <input
            type="radio"
            name={name}
            value="no"
            required
            onChange={onChange ? () => onChange(false) : undefined}
          />
          No
        </label>
      </div>
    </fieldset>
  );
}

export function OpportunityFollowUpForm({
  opportunities,
  initialOpportunitySlug,
}: {
  opportunities: OpportunityFollowUpOpportunity[];
  initialOpportunitySlug: string;
}) {
  const [state, formAction, pending] = useActionState(
    submitOpportunityFollowUpAction,
    initialState,
  );
  const [startedWorking, setStartedWorking] = useState<boolean | null>(null);
  const initialOpportunity = opportunities.find(
    (opportunity) => opportunity.slug === initialOpportunitySlug,
  );

  return (
    <form action={formAction} className="opportunity-follow-up-form">
      <p className="opportunity-follow-up-intro">
        Your update helps the Welfare team understand whether opportunities are
        leading to work and when a three-month check-in is due.
      </p>

      <label className="form-field">
        <span>Your name</span>
        <input
          name="name"
          type="text"
          autoComplete="name"
          maxLength={120}
          required
        />
      </label>

      <label className="form-field">
        <span>Phone/WhatsApp or email</span>
        <input
          name="contactDetail"
          type="text"
          autoComplete="off"
          maxLength={180}
          placeholder="Your phone number or email address"
          required
        />
        <small>The Welfare team will use this to follow up with you.</small>
      </label>

      <label className="form-field">
        <span>Which opportunity did you apply for?</span>
        <select
          name="opportunityId"
          defaultValue={initialOpportunity?.id ?? ""}
          required
        >
          <option value="" disabled>
            Choose a job or internship
          </option>
          {opportunities.map((opportunity) => (
            <option key={opportunity.id} value={opportunity.id}>
              {opportunity.title} — {opportunity.organisation}
            </option>
          ))}
        </select>
        {opportunities.length === 0 ? (
          <small>
            There are no current or recently closed jobs or internships to select.
          </small>
        ) : null}
      </label>

      <YesNoQuestion name="didApply" label="Did you apply?" />
      <YesNoQuestion
        name="shortlistedOrInterviewed"
        label="Have you been shortlisted or interviewed?"
      />
      <YesNoQuestion name="offeredPosition" label="Were you offered the position?" />
      <YesNoQuestion
        name="startedWorking"
        label="Have you started working?"
        onChange={setStartedWorking}
      />

      {startedWorking ? (
        <>
          <label className="form-field">
            <span>When did you start?</span>
            <input name="startedAt" type="date" required />
            <small>This helps us know when your three-month check-in is due.</small>
          </label>
          <label className="form-field">
            <span>Are you still in the role after three months?</span>
            <select name="retainedAfterThreeMonths" defaultValue="" required>
              <option value="" disabled>
                Choose an answer
              </option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="not_yet">It has not been three months yet</option>
            </select>
            <small>
              If three months have passed, choose Yes or No. Otherwise choose
              that it has not been three months yet.
            </small>
          </label>
        </>
      ) : null}

      <label className="opportunity-follow-up-consent">
        <input name="followUpConsent" type="checkbox" value="yes" required />
        <span>
          The Welfare team may contact me about this opportunity update.
        </span>
      </label>

      {state.error ? (
        <p className="bulletin-message error" role="alert">
          {state.error}
        </p>
      ) : null}

      <button className="bulletin-primary" type="submit" disabled={pending || opportunities.length === 0}>
        {pending ? "Saving update…" : "Send update"}
      </button>
    </form>
  );
}
