"use server";

import { revalidatePath } from "next/cache";
import * as opportunities from "@/lib/opportunities/data";
import { signOpportunityDashboardSession } from "@/lib/opportunities/session.mjs";
import type {
  OpportunityActionResult,
  OpportunityDashboardPayload,
  OpportunityInput,
  OpportunityStatus,
} from "@/lib/opportunities/types";

const expiredResult = {
  ok: "expired" as const,
  message: "Your session expired, please enter your code again.",
};

function value(formData: FormData, key: string) {
  const fieldValue = formData.get(key);
  return typeof fieldValue === "string" ? fieldValue : "";
}

function fileValue(formData: FormData, key: string) {
  const fieldValue = formData.get(key);
  return fieldValue instanceof File && fieldValue.size > 0 ? fieldValue : null;
}

function readOpportunityInput(formData: FormData): OpportunityInput {
  return {
    id: value(formData, "id") || undefined,
    title: value(formData, "title"),
    kind: value(formData, "kind") as OpportunityInput["kind"],
    organisation: value(formData, "organisation"),
    location: value(formData, "location"),
    description: value(formData, "description"),
    requirements: value(formData, "requirements"),
    applicationInstructions: value(formData, "applicationInstructions"),
    applicationLink: value(formData, "applicationLink"),
    deadline: value(formData, "deadline"),
    salary: value(formData, "salary"),
    employmentType: value(
      formData,
      "employmentType",
    ) as OpportunityInput["employmentType"],
    organisationContact: value(formData, "organisationContact"),
  };
}

function errorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Something went wrong.";
  }

  if (error.message === "invalid") {
    return "That session is not valid.";
  }

  return error.message;
}

async function runDashboardAction<T>(
  call: () => Promise<T>,
): Promise<OpportunityActionResult<T>> {
  try {
    const data = await call();
    revalidatePath("/opportunities");
    revalidatePath("/opportunities/dashboard");
    return { ok: true, data };
  } catch (error) {
    if (error instanceof Error && error.message === "expired") {
      return expiredResult;
    }

    return {
      ok: false,
      message: errorMessage(error),
    };
  }
}

export async function unlockOpportunityDashboardAction(
  code: string,
): Promise<
  OpportunityActionResult<{
    payload: OpportunityDashboardPayload;
    token: string;
  }>
> {
  try {
    const access = await opportunities.resolveOpportunityDashboardAccess(code);

    if (!access) {
      return {
        ok: false,
        message: "That code does not open the Opportunities dashboard.",
      };
    }

    const subject =
      access.kind === "pastor"
        ? "pastor"
        : (`department:${access.departmentId}` as const);

    return {
      ok: true,
      data: {
        payload: await opportunities.getOpportunityDashboardPayload(),
        token: signOpportunityDashboardSession(subject),
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: errorMessage(error),
    };
  }
}

export async function refreshOpportunityDashboardAction(
  token: string,
): Promise<OpportunityActionResult<OpportunityDashboardPayload>> {
  return runDashboardAction(async () => {
    await opportunities.assertOpportunityDashboardSession(token);
    return opportunities.getOpportunityDashboardPayload();
  });
}

export async function saveOpportunityAction(
  token: string,
  formData: FormData,
): Promise<OpportunityActionResult<OpportunityDashboardPayload>> {
  return runDashboardAction(() =>
    opportunities.saveOpportunity(
      token,
      readOpportunityInput(formData),
      fileValue(formData, "attachment"),
    ),
  );
}

export async function setOpportunityStatusAction(
  token: string,
  opportunityId: string,
  status: OpportunityStatus,
): Promise<OpportunityActionResult<OpportunityDashboardPayload>> {
  return runDashboardAction(() =>
    opportunities.setOpportunityStatus(token, opportunityId, status),
  );
}

export async function removeOpportunityAttachmentAction(
  token: string,
  opportunityId: string,
): Promise<OpportunityActionResult<OpportunityDashboardPayload>> {
  return runDashboardAction(() =>
    opportunities.removeOpportunityAttachment(token, opportunityId),
  );
}

export async function saveOpportunityBoardSettingsAction(
  token: string,
  welfareWhatsappNumber: string,
): Promise<OpportunityActionResult<OpportunityDashboardPayload>> {
  return runDashboardAction(() =>
    opportunities.saveOpportunityBoardSettings(token, welfareWhatsappNumber),
  );
}
