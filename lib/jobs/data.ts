import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveAccessCode } from "@/lib/scheduler/data";
import { buildUniqueSlug } from "./slug";
import { verifyJobDashboardSession } from "./session.mjs";
import {
  validateAttachment,
  validateJobDraft,
  validateJobPublish,
  validateWhatsappNumber,
} from "./validation";
import { jobStatuses, type JobDashboardAccess, type JobDashboardPayload, type JobOpportunity, type JobOpportunityInput, type JobSettings, type JobStatus, type JobType } from "./types";

const ATTACHMENT_BUCKET = "job-attachments";

const jobSelect = `
  id,
  title,
  slug,
  organisation,
  location,
  description,
  requirements,
  application_instructions,
  application_link,
  deadline,
  salary,
  job_type,
  organisation_contact,
  attachment_path,
  attachment_name,
  attachment_content_type,
  status,
  created_at,
  updated_at
`;

type JobOpportunityRow = {
  id: string;
  title: string;
  slug: string;
  organisation: string;
  location: string;
  description: string;
  requirements: string | null;
  application_instructions: string | null;
  application_link: string | null;
  deadline: string | null;
  salary: string | null;
  job_type: JobType | null;
  organisation_contact: string | null;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_content_type: string | null;
  status: JobStatus;
  created_at: string;
  updated_at: string;
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

function mapJobOpportunity(row: JobOpportunityRow): JobOpportunity {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    organisation: row.organisation,
    location: row.location,
    description: row.description,
    requirements: row.requirements,
    applicationInstructions: row.application_instructions,
    applicationLink: row.application_link,
    deadline: row.deadline,
    salary: row.salary,
    jobType: row.job_type,
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

function toMutation(input: JobOpportunityInput) {
  return {
    title: input.title.trim(),
    organisation: input.organisation.trim(),
    location: input.location.trim(),
    description: input.description.trim(),
    requirements: clean(input.requirements),
    application_instructions: clean(input.applicationInstructions),
    application_link: clean(input.applicationLink),
    deadline: clean(input.deadline),
    salary: clean(input.salary),
    job_type: input.jobType || null,
    organisation_contact: clean(input.organisationContact),
    updated_at: new Date().toISOString(),
  };
}

function inputFromJob(job: JobOpportunity): JobOpportunityInput {
  return {
    id: job.id,
    title: job.title,
    organisation: job.organisation,
    location: job.location,
    description: job.description,
    requirements: job.requirements ?? "",
    applicationInstructions: job.applicationInstructions ?? "",
    applicationLink: job.applicationLink ?? "",
    deadline: job.deadline ?? "",
    salary: job.salary ?? "",
    jobType: job.jobType ?? "",
    organisationContact: job.organisationContact ?? "",
  };
}

function assertStatus(value: JobStatus) {
  if (!jobStatuses.includes(value)) {
    throw new Error("Job status is not valid.");
  }
}

function assertAllowedStatusTransition(current: JobStatus, next: JobStatus) {
  const allowed: Record<JobStatus, JobStatus[]> = {
    draft: ["published", "archived"],
    published: ["closed", "archived"],
    closed: ["archived"],
    archived: ["draft"],
  };

  if (current === next) return;

  if (!allowed[current].includes(next)) {
    throw new Error(`Cannot move a ${current} job to ${next}.`);
  }
}

async function uniqueSlugFor(input: JobOpportunityInput, currentSlug?: string) {
  const { data, error } = await createServerSupabaseClient()
    .from("job_opportunities")
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

async function uploadAttachment(jobId: string, file: File) {
  const validation = validateAttachment(file);

  if (!validation.ok) {
    throw new Error(validation.message);
  }

  if (file.size === 0) {
    return null;
  }

  const path = `${jobId}/${Date.now()}.${extensionForContentType(file.type)}`;
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

export async function closeExpiredPublishedJobs() {
  const { error } = await createServerSupabaseClient()
    .from("job_opportunities")
    .update({ status: "closed", updated_at: new Date().toISOString() })
    .eq("status", "published")
    .not("deadline", "is", null)
    .lt("deadline", todayDateKey());

  if (error) {
    throw new Error(error.message);
  }
}

export async function getJobSettings(): Promise<JobSettings> {
  const { data, error } = await createServerSupabaseClient()
    .from("job_board_settings")
    .select("welfare_whatsapp_number")
    .eq("id", true)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    welfareWhatsappNumber: data?.welfare_whatsapp_number ?? null,
  };
}

export async function getPublicJobs(): Promise<JobOpportunity[]> {
  await closeExpiredPublishedJobs();

  const { data, error } = await createServerSupabaseClient()
    .from("job_opportunities")
    .select(jobSelect)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data as JobOpportunityRow[]).map(mapJobOpportunity);
}

export async function getPublicJobBySlug(
  slug: string,
): Promise<JobOpportunity | null> {
  await closeExpiredPublishedJobs();

  const { data, error } = await createServerSupabaseClient()
    .from("job_opportunities")
    .select(jobSelect)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data ? mapJobOpportunity(data as JobOpportunityRow) : null;
}

export async function getJobDashboardPayload(): Promise<JobDashboardPayload> {
  await closeExpiredPublishedJobs();

  const [settings, jobsResult] = await Promise.all([
    getJobSettings(),
    createServerSupabaseClient()
      .from("job_opportunities")
      .select(jobSelect)
      .order("updated_at", { ascending: false }),
  ]);

  if (jobsResult.error) throw new Error(jobsResult.error.message);

  return {
    settings,
    jobs: (jobsResult.data as JobOpportunityRow[]).map(mapJobOpportunity),
  };
}

export async function resolveJobDashboardAccess(
  code: string,
): Promise<JobDashboardAccess | null> {
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

export async function assertJobDashboardSession(
  token: string,
): Promise<JobDashboardAccess> {
  const session = verifyJobDashboardSession(token);

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

export async function saveJobOpportunity(
  token: string,
  input: JobOpportunityInput,
  attachment?: File | null,
): Promise<JobDashboardPayload> {
  await assertJobDashboardSession(token);
  await closeExpiredPublishedJobs();

  const validation = validateJobDraft(input);

  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const supabase = createServerSupabaseClient();
  const mutation = toMutation(input);

  if (input.id) {
    const { data: existing, error: existingError } = await supabase
      .from("job_opportunities")
      .select(jobSelect)
      .eq("id", input.id)
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);
    if (!existing) throw new Error("Job was not found.");

    const job = mapJobOpportunity(existing as JobOpportunityRow);
    const publishValidation =
      job.status === "published" ? validateJobPublish(input) : { ok: true as const };

    if (!publishValidation.ok) {
      throw new Error(publishValidation.message);
    }

    const slug =
      job.status === "draft" ? await uniqueSlugFor(input, job.slug) : job.slug;
    const attachmentMutation = attachment
      ? await uploadAttachment(job.id, attachment)
      : null;

    if (attachmentMutation) {
      await removeAttachmentPath(job.attachmentPath);
    }

    const { error } = await supabase
      .from("job_opportunities")
      .update({ ...mutation, slug, ...attachmentMutation })
      .eq("id", input.id);

    if (error) throw new Error(error.message);

    return getJobDashboardPayload();
  }

  const slug = await uniqueSlugFor(input);
  const { data: inserted, error: insertError } = await supabase
    .from("job_opportunities")
    .insert({ ...mutation, slug, status: "draft" })
    .select("id")
    .single();

  if (insertError) throw new Error(insertError.message);

  const attachmentMutation = attachment
    ? await uploadAttachment(inserted.id, attachment)
    : null;

  if (attachmentMutation) {
    const { error } = await supabase
      .from("job_opportunities")
      .update(attachmentMutation)
      .eq("id", inserted.id);

    if (error) throw new Error(error.message);
  }

  return getJobDashboardPayload();
}

export async function setJobOpportunityStatus(
  token: string,
  jobId: string,
  status: JobStatus,
): Promise<JobDashboardPayload> {
  await assertJobDashboardSession(token);
  await closeExpiredPublishedJobs();
  assertStatus(status);

  const supabase = createServerSupabaseClient();
  const { data: existing, error: existingError } = await supabase
    .from("job_opportunities")
    .select(jobSelect)
    .eq("id", jobId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (!existing) throw new Error("Job was not found.");

  const job = mapJobOpportunity(existing as JobOpportunityRow);
  assertAllowedStatusTransition(job.status, status);

  if (status === "published") {
    const validation = validateJobPublish(inputFromJob(job));

    if (!validation.ok) {
      throw new Error(validation.message);
    }
  }

  const { error } = await supabase
    .from("job_opportunities")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", jobId);

  if (error) throw new Error(error.message);

  return getJobDashboardPayload();
}

export async function removeJobAttachment(
  token: string,
  jobId: string,
): Promise<JobDashboardPayload> {
  await assertJobDashboardSession(token);

  const supabase = createServerSupabaseClient();
  const { data: existing, error: existingError } = await supabase
    .from("job_opportunities")
    .select("attachment_path")
    .eq("id", jobId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (!existing) throw new Error("Job was not found.");

  await removeAttachmentPath(existing.attachment_path);

  const { error } = await supabase
    .from("job_opportunities")
    .update({
      attachment_path: null,
      attachment_name: null,
      attachment_content_type: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) throw new Error(error.message);

  return getJobDashboardPayload();
}

export async function saveJobBoardSettings(
  token: string,
  welfareWhatsappNumber: string,
): Promise<JobDashboardPayload> {
  await assertJobDashboardSession(token);

  const validation = validateWhatsappNumber(welfareWhatsappNumber);

  if (!validation.ok) throw new Error(validation.message);

  const { error } = await createServerSupabaseClient()
    .from("job_board_settings")
    .upsert({
      id: true,
      welfare_whatsapp_number: clean(welfareWhatsappNumber),
      updated_at: new Date().toISOString(),
    });

  if (error) throw new Error(error.message);

  return getJobDashboardPayload();
}
