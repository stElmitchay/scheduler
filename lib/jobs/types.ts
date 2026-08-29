export const jobStatuses = ["draft", "published", "closed", "archived"] as const;

export type JobStatus = (typeof jobStatuses)[number];

export const jobTypes = [
  "full_time",
  "part_time",
  "contract",
  "internship",
  "temporary",
  "volunteer",
  "other",
] as const;

export type JobType = (typeof jobTypes)[number];

export const jobTypeLabels: Record<JobType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  temporary: "Temporary",
  volunteer: "Volunteer",
  other: "Other",
};

export type JobSettings = {
  welfareWhatsappNumber: string | null;
};

export type JobOpportunity = {
  id: string;
  title: string;
  slug: string;
  organisation: string;
  location: string;
  description: string;
  requirements: string | null;
  applicationInstructions: string | null;
  applicationLink: string | null;
  deadline: string | null;
  salary: string | null;
  jobType: JobType | null;
  organisationContact: string | null;
  attachmentPath: string | null;
  attachmentName: string | null;
  attachmentContentType: string | null;
  attachmentUrl: string | null;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
};

export type JobOpportunityInput = {
  id?: string;
  title: string;
  organisation: string;
  location: string;
  description: string;
  requirements: string;
  applicationInstructions: string;
  applicationLink: string;
  deadline: string;
  salary: string;
  jobType: JobType | "";
  organisationContact: string;
};

export type JobDashboardPayload = {
  settings: JobSettings;
  jobs: JobOpportunity[];
};

export type JobDashboardAccess =
  | { kind: "pastor" }
  | { kind: "welfare"; departmentId: string; departmentName: "Welfare" };

export type JobDashboardSessionSubject = "pastor" | `department:${string}`;

export type JobDashboardSessionResult =
  | { ok: true; subject: JobDashboardSessionSubject }
  | { ok: false; reason: "invalid" | "expired" };

export type ValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export type JobActionResult<T> =
  | { ok: true; data: T }
  | { ok: "expired"; message: string }
  | { ok: false; message: string };
