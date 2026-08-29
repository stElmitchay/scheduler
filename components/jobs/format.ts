import {
  jobTypeLabels,
  type JobOpportunity,
  type JobStatus,
  type JobType,
} from "@/lib/jobs/types";

export const jobStatusLabels: Record<JobStatus, string> = {
  draft: "Draft",
  published: "Published",
  closed: "Closed",
  archived: "Archived",
};

export function formatJobType(jobType: JobType | null) {
  return jobType ? jobTypeLabels[jobType] : "";
}

export function formatJobDeadline(deadline: string | null) {
  if (!deadline) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${deadline}T00:00:00`));
}

export function jobMetaLine(job: JobOpportunity) {
  return [job.organisation, job.location, formatJobType(job.jobType)]
    .filter(Boolean)
    .join(" / ");
}
