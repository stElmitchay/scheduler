export const opportunityStatuses = [
  "draft",
  "published",
  "closed",
  "archived",
] as const;

export type OpportunityStatus = (typeof opportunityStatuses)[number];

export const opportunityKinds = [
  "job",
  "scholarship",
  "internship",
  "training",
  "grant",
  "volunteer",
  "other",
] as const;

export type OpportunityKind = (typeof opportunityKinds)[number];

export const opportunityKindLabels: Record<OpportunityKind, string> = {
  job: "Job",
  scholarship: "Scholarship",
  internship: "Internship",
  training: "Training",
  grant: "Grant",
  volunteer: "Volunteer",
  other: "Other",
};

// Employment type only applies to a job. Everything else leaves it null —
// "Part-time" says nothing useful about a scholarship.
export const employmentTypes = [
  "full_time",
  "part_time",
  "contract",
  "internship",
  "temporary",
  "volunteer",
  "other",
] as const;

export type EmploymentType = (typeof employmentTypes)[number];

export const employmentTypeLabels: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  temporary: "Temporary",
  volunteer: "Volunteer",
  other: "Other",
};

export type OpportunityBoardSettings = {
  welfareWhatsappNumber: string | null;
};

export type Opportunity = {
  id: string;
  title: string;
  slug: string;
  kind: OpportunityKind;
  organisation: string;
  location: string;
  description: string;
  requirements: string | null;
  applicationInstructions: string | null;
  applicationLink: string | null;
  deadline: string | null;
  salary: string | null;
  employmentType: EmploymentType | null;
  organisationContact: string | null;
  attachmentPath: string | null;
  attachmentName: string | null;
  attachmentContentType: string | null;
  attachmentUrl: string | null;
  status: OpportunityStatus;
  createdAt: string;
  updatedAt: string;
};

export type OpportunityInput = {
  id?: string;
  title: string;
  kind: OpportunityKind;
  organisation: string;
  location: string;
  description: string;
  requirements: string;
  applicationInstructions: string;
  applicationLink: string;
  deadline: string;
  salary: string;
  employmentType: EmploymentType | "";
  organisationContact: string;
};

export type OpportunityDashboardPayload = {
  settings: OpportunityBoardSettings;
  opportunities: Opportunity[];
};

export type OpportunityDashboardAccess =
  | { kind: "pastor" }
  | { kind: "welfare"; departmentId: string; departmentName: "Welfare" };

export type OpportunityDashboardSessionSubject =
  | "pastor"
  | `department:${string}`;

export type OpportunityDashboardSessionResult =
  | { ok: true; subject: OpportunityDashboardSessionSubject }
  | { ok: false; reason: "invalid" | "expired" };

export type ValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export type OpportunityActionResult<T> =
  | { ok: true; data: T }
  | { ok: "expired"; message: string }
  | { ok: false; message: string };
