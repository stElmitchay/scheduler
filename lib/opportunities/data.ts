import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveAccessCode } from "@/lib/scheduler/data";
import { buildUniqueSlug } from "./slug";
import { verifyOpportunityDashboardSession } from "./session.mjs";
import {
  normalizeFollowUpContact,
  validateAttachment,
  validateOpportunityDraft,
  validateOpportunityFollowUp,
  validateOpportunityPublish,
  validateWhatsappNumber,
} from "./validation";
import {
  opportunityStatuses,
  type EmploymentType,
  type Opportunity,
  type OpportunityBoardSettings,
  type OpportunityDashboardAccess,
  type OpportunityDashboardPayload,
  type OpportunityFollowUpInput,
  type OpportunityFollowUpOpportunity,
  type OpportunityFollowUpReport,
  type OpportunityInput,
  type OpportunityKind,
  type OpportunityStatus,
} from "./types";

const ATTACHMENT_BUCKET = "job-attachments";

const opportunitySelect = `
  id,
  title,
  slug,
  kind,
  organisation,
  location,
  description,
  requirements,
  application_instructions,
  application_link,
  deadline,
  salary,
  employment_type,
  organisation_contact,
  attachment_path,
  attachment_name,
  attachment_content_type,
  status,
  created_at,
  updated_at
`;

type OpportunityRow = {
  id: string;
  title: string;
  slug: string;
  kind: OpportunityKind;
  organisation: string;
  location: string;
  description: string;
  requirements: string | null;
  application_instructions: string | null;
  application_link: string | null;
  deadline: string | null;
  salary: string | null;
  employment_type: EmploymentType | null;
  organisation_contact: string | null;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_content_type: string | null;
  status: OpportunityStatus;
  created_at: string;
  updated_at: string;
};

type OpportunityFollowUpRow = {
  id: string;
  opportunity_id: string;
  name: string;
  contact_detail: string;
  did_apply: boolean;
  shortlisted_or_interviewed: boolean;
  offered_position: boolean;
  started_working: boolean;
  started_at: string | null;
  retained_after_three_months: boolean | null;
  created_at: string;
  updated_at: string;
  opportunities: { title: string; organisation: string };
};

function publicAttachmentUrl(path: string | null) {
  if (!path) return null;

  const {
    data: { publicUrl },
  } = createServerSupabaseClient()
    .storage
    .from(ATTACHMENT_BUCKET)
    .getPublicUrl(path);

  return publicUrl;
}

function mapOpportunity(row: OpportunityRow): Opportunity {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    kind: row.kind,
    organisation: row.organisation,
    location: row.location,
    description: row.description,
    requirements: row.requirements,
    applicationInstructions: row.application_instructions,
    applicationLink: row.application_link,
    deadline: row.deadline,
    salary: row.salary,
    employmentType: row.employment_type,
    organisationContact: row.organisation_contact,
    attachmentPath: row.attachment_path,
    attachmentName: row.attachment_name,
    attachmentContentType: row.attachment_content_type,
    attachmentUrl: publicAttachmentUrl(row.attachment_path),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function clean(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}

function todayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function toMutation(input: OpportunityInput) {
  return {
    title: input.title.trim(),
    kind: input.kind,
    organisation: input.organisation.trim(),
    location: input.location.trim(),
    description: input.description.trim(),
    requirements: clean(input.requirements),
    application_instructions: clean(input.applicationInstructions),
    application_link: clean(input.applicationLink),
    deadline: clean(input.deadline),
    salary: clean(input.salary),
    // Enforced here rather than in the form so switching a posting away from
    // Job can never leave a stale "Part-time" behind.
    employment_type: input.kind === "job" ? input.employmentType || null : null,
    organisation_contact: clean(input.organisationContact),
    updated_at: new Date().toISOString(),
  };
}

function inputFromOpportunity(opportunity: Opportunity): OpportunityInput {
  return {
    id: opportunity.id,
    title: opportunity.title,
    kind: opportunity.kind,
    organisation: opportunity.organisation,
    location: opportunity.location,
    description: opportunity.description,
    requirements: opportunity.requirements ?? "",
    applicationInstructions: opportunity.applicationInstructions ?? "",
    applicationLink: opportunity.applicationLink ?? "",
    deadline: opportunity.deadline ?? "",
    salary: opportunity.salary ?? "",
    employmentType: opportunity.employmentType ?? "",
    organisationContact: opportunity.organisationContact ?? "",
  };
}

function assertStatus(value: OpportunityStatus) {
  if (!opportunityStatuses.includes(value)) {
    throw new Error("Opportunity status is not valid.");
  }
}

function assertAllowedStatusTransition(
  current: OpportunityStatus,
  next: OpportunityStatus,
) {
  const allowed: Record<OpportunityStatus, OpportunityStatus[]> = {
    draft: ["published", "archived"],
    published: ["closed", "archived"],
    closed: ["archived"],
    archived: ["draft"],
  };

  if (current === next) return;

  if (!allowed[current].includes(next)) {
    throw new Error(`Cannot move a ${current} opportunity to ${next}.`);
  }
}

async function uniqueSlugFor(input: OpportunityInput, currentSlug?: string) {
  const { data, error } = await createServerSupabaseClient()
    .from("opportunities")
    .select("slug");

  if (error) throw new Error(error.message);

  return buildUniqueSlug(
    input.title,
    (data as { slug: string }[])
      .map((row) => row.slug)
      .filter((slug) => slug !== currentSlug),
  );
}

function extensionForContentType(contentType: string) {
  if (contentType === "application/pdf") return "pdf";
  if (contentType === "image/png") return "png";
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/webp") return "webp";

  return "file";
}

async function uploadAttachment(opportunityId: string, file: File) {
  const validation = validateAttachment(file);

  if (!validation.ok) {
    throw new Error(validation.message);
  }

  if (file.size === 0) {
    return null;
  }

  const path = `${opportunityId}/${Date.now()}.${extensionForContentType(file.type)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await createServerSupabaseClient()
    .storage
    .from(ATTACHMENT_BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (error) throw new Error(error.message);

  return {
    attachment_path: path,
    attachment_name: file.name,
    attachment_content_type: file.type,
  };
}

async function removeAttachmentPath(path: string | null) {
  if (!path) return;

  const { error } = await createServerSupabaseClient()
    .storage
    .from(ATTACHMENT_BUCKET)
    .remove([path]);

  if (error) throw new Error(error.message);
}

export async function closeExpiredPublishedOpportunities() {
  const { error } = await createServerSupabaseClient()
    .from("opportunities")
    .update({ status: "closed", updated_at: new Date().toISOString() })
    .eq("status", "published")
    .not("deadline", "is", null)
    .lt("deadline", todayDateKey());

  if (error) {
    throw new Error(error.message);
  }
}

export async function getOpportunityBoardSettings(): Promise<OpportunityBoardSettings> {
  const { data, error } = await createServerSupabaseClient()
    .from("opportunity_board_settings")
    .select("welfare_whatsapp_number")
    .eq("id", true)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    welfareWhatsappNumber: data?.welfare_whatsapp_number ?? null,
  };
}

export async function getPublicOpportunities(): Promise<Opportunity[]> {
  await closeExpiredPublishedOpportunities();

  const { data, error } = await createServerSupabaseClient()
    .from("opportunities")
    .select(opportunitySelect)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data as OpportunityRow[]).map(mapOpportunity);
}

export async function getOpportunityFollowUpOptions(): Promise<
  OpportunityFollowUpOpportunity[]
> {
  const { data, error } = await createServerSupabaseClient()
    .from("opportunities")
    .select("id, slug, title, organisation")
    .in("kind", ["job", "internship"])
    .in("status", ["published", "closed"])
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return data as OpportunityFollowUpOpportunity[];
}

export async function saveOpportunityFollowUp(
  input: OpportunityFollowUpInput,
): Promise<void> {
  const validation = validateOpportunityFollowUp(input);

  if (!validation.ok) throw new Error(validation.message);

  const supabase = createServerSupabaseClient();
  const { data: opportunity, error: opportunityError } = await supabase
    .from("opportunities")
    .select("id")
    .eq("id", input.opportunityId)
    .in("kind", ["job", "internship"])
    .in("status", ["published", "closed"])
    .maybeSingle();

  if (opportunityError) throw new Error(opportunityError.message);
  if (!opportunity) {
    throw new Error("Choose a current or closed job or internship.");
  }

  const { error } = await supabase.from("opportunity_follow_ups").upsert(
    {
      opportunity_id: input.opportunityId,
      name: input.name.trim(),
      contact_detail: input.contactDetail.trim(),
      contact_key: normalizeFollowUpContact(input.contactDetail),
      did_apply: input.didApply,
      shortlisted_or_interviewed: input.shortlistedOrInterviewed,
      offered_position: input.offeredPosition,
      started_working: input.startedWorking,
      started_at: input.startedAt,
      retained_after_three_months: input.retainedAfterThreeMonths,
      follow_up_consent: input.followUpConsent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "opportunity_id,contact_key" },
  );

  if (error) throw new Error(error.message);
}

export async function getOpportunityFollowUpReports(
  token: string,
): Promise<OpportunityFollowUpReport[]> {
  await assertOpportunityDashboardSession(token);

  const { data, error } = await createServerSupabaseClient()
    .from("opportunity_follow_ups")
    .select(
      "id, opportunity_id, name, contact_detail, did_apply, shortlisted_or_interviewed, offered_position, started_working, started_at, retained_after_three_months, created_at, updated_at, opportunities!inner(title, organisation)",
    )
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as OpportunityFollowUpRow[]).map((row) => ({
    id: row.id,
    opportunityId: row.opportunity_id,
    opportunityTitle: row.opportunities.title,
    organisation: row.opportunities.organisation,
    name: row.name,
    contactDetail: row.contact_detail,
    didApply: row.did_apply,
    shortlistedOrInterviewed: row.shortlisted_or_interviewed,
    offeredPosition: row.offered_position,
    startedWorking: row.started_working,
    startedAt: row.started_at,
    retainedAfterThreeMonths: row.retained_after_three_months,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getPublicOpportunityBySlug(
  slug: string,
): Promise<Opportunity | null> {
  await closeExpiredPublishedOpportunities();

  const { data, error } = await createServerSupabaseClient()
    .from("opportunities")
    .select(opportunitySelect)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data ? mapOpportunity(data as OpportunityRow) : null;
}

export async function getOpportunityDashboardPayload(): Promise<OpportunityDashboardPayload> {
  await closeExpiredPublishedOpportunities();

  const [settings, opportunitiesResult] = await Promise.all([
    getOpportunityBoardSettings(),
    createServerSupabaseClient()
      .from("opportunities")
      .select(opportunitySelect)
      .order("updated_at", { ascending: false }),
  ]);

  if (opportunitiesResult.error) {
    throw new Error(opportunitiesResult.error.message);
  }

  return {
    settings,
    opportunities: (opportunitiesResult.data as OpportunityRow[]).map(
      mapOpportunity,
    ),
  };
}

export async function resolveOpportunityDashboardAccess(
  code: string,
): Promise<OpportunityDashboardAccess | null> {
  const access = await resolveAccessCode(code);

  if (!access) return null;
  if (access.kind === "pastor") return { kind: "pastor" };

  if (access.departmentName === "Welfare") {
    return {
      kind: "welfare",
      departmentId: access.departmentId,
      departmentName: "Welfare",
    };
  }

  return null;
}

export async function assertOpportunityDashboardSession(
  token: string,
): Promise<OpportunityDashboardAccess> {
  const session = verifyOpportunityDashboardSession(token);

  if (!session.ok) {
    throw new Error(session.reason === "expired" ? "expired" : "invalid");
  }

  if (session.subject === "pastor") {
    return { kind: "pastor" };
  }

  const departmentId = session.subject.replace("department:", "");
  const { data, error } = await createServerSupabaseClient()
    .from("departments")
    .select("id, name")
    .eq("id", departmentId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data || data.name !== "Welfare") {
    throw new Error("invalid");
  }

  return {
    kind: "welfare",
    departmentId: data.id,
    departmentName: "Welfare",
  };
}

export async function saveOpportunity(
  token: string,
  input: OpportunityInput,
  attachment?: File | null,
): Promise<OpportunityDashboardPayload> {
  await assertOpportunityDashboardSession(token);
  await closeExpiredPublishedOpportunities();

  const validation = validateOpportunityDraft(input);

  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const supabase = createServerSupabaseClient();
  const mutation = toMutation(input);

  if (input.id) {
    const { data: existing, error: existingError } = await supabase
      .from("opportunities")
      .select(opportunitySelect)
      .eq("id", input.id)
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);
    if (!existing) throw new Error("Opportunity was not found.");

    const opportunity = mapOpportunity(existing as OpportunityRow);
    const publishValidation =
      opportunity.status === "published"
        ? validateOpportunityPublish(input)
        : { ok: true as const };

    if (!publishValidation.ok) {
      throw new Error(publishValidation.message);
    }

    const slug =
      opportunity.status === "draft"
        ? await uniqueSlugFor(input, opportunity.slug)
        : opportunity.slug;
    const attachmentMutation = attachment
      ? await uploadAttachment(opportunity.id, attachment)
      : null;

    if (attachmentMutation) {
      await removeAttachmentPath(opportunity.attachmentPath);
    }

    const { error } = await supabase
      .from("opportunities")
      .update({ ...mutation, slug, ...attachmentMutation })
      .eq("id", input.id);

    if (error) throw new Error(error.message);

    return getOpportunityDashboardPayload();
  }

  const slug = await uniqueSlugFor(input);
  const { data: inserted, error: insertError } = await supabase
    .from("opportunities")
    .insert({ ...mutation, slug, status: "draft" })
    .select("id")
    .single();

  if (insertError) throw new Error(insertError.message);

  const attachmentMutation = attachment
    ? await uploadAttachment(inserted.id, attachment)
    : null;

  if (attachmentMutation) {
    const { error } = await supabase
      .from("opportunities")
      .update(attachmentMutation)
      .eq("id", inserted.id);

    if (error) throw new Error(error.message);
  }

  return getOpportunityDashboardPayload();
}

export async function setOpportunityStatus(
  token: string,
  opportunityId: string,
  status: OpportunityStatus,
): Promise<OpportunityDashboardPayload> {
  await assertOpportunityDashboardSession(token);
  await closeExpiredPublishedOpportunities();
  assertStatus(status);

  const supabase = createServerSupabaseClient();
  const { data: existing, error: existingError } = await supabase
    .from("opportunities")
    .select(opportunitySelect)
    .eq("id", opportunityId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (!existing) throw new Error("Opportunity was not found.");

  const opportunity = mapOpportunity(existing as OpportunityRow);
  assertAllowedStatusTransition(opportunity.status, status);

  if (status === "published") {
    const validation = validateOpportunityPublish(
      inputFromOpportunity(opportunity),
    );

    if (!validation.ok) {
      throw new Error(validation.message);
    }
  }

  const { error } = await supabase
    .from("opportunities")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", opportunityId);

  if (error) throw new Error(error.message);

  return getOpportunityDashboardPayload();
}

export async function removeOpportunityAttachment(
  token: string,
  opportunityId: string,
): Promise<OpportunityDashboardPayload> {
  await assertOpportunityDashboardSession(token);

  const supabase = createServerSupabaseClient();
  const { data: existing, error: existingError } = await supabase
    .from("opportunities")
    .select("attachment_path")
    .eq("id", opportunityId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (!existing) throw new Error("Opportunity was not found.");

  await removeAttachmentPath(existing.attachment_path);

  const { error } = await supabase
    .from("opportunities")
    .update({
      attachment_path: null,
      attachment_name: null,
      attachment_content_type: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", opportunityId);

  if (error) throw new Error(error.message);

  return getOpportunityDashboardPayload();
}

export async function saveOpportunityBoardSettings(
  token: string,
  welfareWhatsappNumber: string,
): Promise<OpportunityDashboardPayload> {
  await assertOpportunityDashboardSession(token);

  const validation = validateWhatsappNumber(welfareWhatsappNumber);

  if (!validation.ok) throw new Error(validation.message);

  const { error } = await createServerSupabaseClient()
    .from("opportunity_board_settings")
    .upsert({
      id: true,
      welfare_whatsapp_number: clean(welfareWhatsappNumber),
      updated_at: new Date().toISOString(),
    });

  if (error) throw new Error(error.message);

  return getOpportunityDashboardPayload();
}
