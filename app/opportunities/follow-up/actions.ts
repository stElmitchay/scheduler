"use server";

import { redirect } from "next/navigation";
import { saveOpportunityFollowUp } from "@/lib/opportunities/data";
import { validateOpportunityFollowUp } from "@/lib/opportunities/validation";
import type { OpportunityFollowUpInput } from "@/lib/opportunities/types";

export type OpportunityFollowUpActionState = {
  error?: string;
};

function value(formData: FormData, key: string) {
  const formValue = formData.get(key);
  return typeof formValue === "string" ? formValue : "";
}

function yesNo(value: string): boolean | null {
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}

export async function submitOpportunityFollowUpAction(
  _previousState: OpportunityFollowUpActionState,
  formData: FormData,
): Promise<OpportunityFollowUpActionState> {
  const didApply = yesNo(value(formData, "didApply"));
  const shortlistedOrInterviewed = yesNo(
    value(formData, "shortlistedOrInterviewed"),
  );
  const offeredPosition = yesNo(value(formData, "offeredPosition"));
  const startedWorking = yesNo(value(formData, "startedWorking"));
  const retentionValue = value(formData, "retainedAfterThreeMonths");
  const retention = yesNo(retentionValue);

  if (
    didApply === null ||
    shortlistedOrInterviewed === null ||
    offeredPosition === null ||
    startedWorking === null
  ) {
    return { error: "Please answer each application progress question." };
  }

  if (
    startedWorking &&
    !["yes", "no", "not_yet"].includes(retentionValue)
  ) {
    return { error: "Please answer the three-month role update." };
  }

  const input: OpportunityFollowUpInput = {
    opportunityId: value(formData, "opportunityId"),
    name: value(formData, "name"),
    contactDetail: value(formData, "contactDetail"),
    didApply,
    shortlistedOrInterviewed,
    offeredPosition,
    startedWorking,
    startedAt: value(formData, "startedAt") || null,
    retainedAfterThreeMonths: retentionValue === "not_yet" ? null : retention,
    followUpConsent: value(formData, "followUpConsent") === "yes",
  };
  const validation = validateOpportunityFollowUp(input);

  if (!validation.ok) return { error: validation.message };

  try {
    await saveOpportunityFollowUp(input);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Choose a current or closed job or internship."
    ) {
      return { error: error.message };
    }

    return { error: "We couldn't save your update. Please try again." };
  }

  redirect("/opportunities/follow-up?submitted=1");
}
