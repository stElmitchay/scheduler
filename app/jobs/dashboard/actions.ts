"use server";

import { revalidatePath } from "next/cache";
import * as jobs from "@/lib/jobs/data";
import { signJobDashboardSession } from "@/lib/jobs/session.mjs";
import type {
  JobActionResult,
  JobDashboardPayload,
  JobOpportunityInput,
  JobStatus,
} from "@/lib/jobs/types";

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

function readJobInput(formData: FormData): JobOpportunityInput {
  return {
    id: value(formData, "id") || undefined,
    title: value(formData, "title"),
    organisation: value(formData, "organisation"),
    location: value(formData, "location"),
    description: value(formData, "description"),
    requirements: value(formData, "requirements"),
    applicationInstructions: value(formData, "applicationInstructions"),
    applicationLink: value(formData, "applicationLink"),
    deadline: value(formData, "deadline"),
    salary: value(formData, "salary"),
    jobType: value(formData, "jobType") as JobOpportunityInput["jobType"],
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
): Promise<JobActionResult<T>> {
  try {
    const data = await call();
    revalidatePath("/jobs");
    revalidatePath("/jobs/dashboard");
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

export async function unlockJobDashboardAction(
  code: string,
): Promise<JobActionResult<{ payload: JobDashboardPayload; token: string }>> {
  try {
    const access = await jobs.resolveJobDashboardAccess(code);

    if (!access) {
      return {
        ok: false,
        message: "That code does not open the Job Board dashboard.",
      };
    }

    const subject =
      access.kind === "pastor" ? "pastor" : (`department:${access.departmentId}` as const);

    return {
      ok: true,
      data: {
        payload: await jobs.getJobDashboardPayload(),
        token: signJobDashboardSession(subject),
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: errorMessage(error),
    };
  }
}

export async function refreshJobDashboardAction(
  token: string,
): Promise<JobActionResult<JobDashboardPayload>> {
  return runDashboardAction(async () => {
    await jobs.assertJobDashboardSession(token);
    return jobs.getJobDashboardPayload();
  });
}

export async function saveJobOpportunityAction(
  token: string,
  formData: FormData,
): Promise<JobActionResult<JobDashboardPayload>> {
  return runDashboardAction(() =>
    jobs.saveJobOpportunity(
      token,
      readJobInput(formData),
      fileValue(formData, "attachment"),
    ),
  );
}

export async function setJobOpportunityStatusAction(
  token: string,
  jobId: string,
  status: JobStatus,
): Promise<JobActionResult<JobDashboardPayload>> {
  return runDashboardAction(() =>
    jobs.setJobOpportunityStatus(token, jobId, status),
  );
}

export async function removeJobAttachmentAction(
  token: string,
  jobId: string,
): Promise<JobActionResult<JobDashboardPayload>> {
  return runDashboardAction(() => jobs.removeJobAttachment(token, jobId));
}

export async function saveJobBoardSettingsAction(
  token: string,
  welfareWhatsappNumber: string,
): Promise<JobActionResult<JobDashboardPayload>> {
  return runDashboardAction(() =>
    jobs.saveJobBoardSettings(token, welfareWhatsappNumber),
  );
}
