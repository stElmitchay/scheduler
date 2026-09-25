import {
  employmentTypeLabels,
  opportunityKindLabels,
  type EmploymentType,
  type Opportunity,
  type OpportunityKind,
  type OpportunityStatus,
} from "@/lib/opportunities/types";

export const opportunityStatusLabels: Record<OpportunityStatus, string> = {
  draft: "Draft",
  published: "Published",
  closed: "Closed",
  archived: "Archived",
};

export function formatOpportunityKind(kind: OpportunityKind) {
  return opportunityKindLabels[kind];
}

export function formatEmploymentType(employmentType: EmploymentType | null) {
  return employmentType ? employmentTypeLabels[employmentType] : "";
}

export function formatOpportunityDeadline(deadline: string | null) {
  if (!deadline) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${deadline}T00:00:00`));
}

export function opportunityMetaLine(opportunity: Opportunity) {
  return [
    opportunity.organisation,
    opportunity.location,
    formatEmploymentType(opportunity.employmentType),
  ]
    .filter(Boolean)
    .join(" / ");
}
