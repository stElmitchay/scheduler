import { jobTypes, type JobOpportunityInput, type ValidationResult } from "./types";

const allowedAttachmentTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function present(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function validOptionalUrl(value: string) {
  if (!present(value)) return true;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateJobDraft(input: JobOpportunityInput): ValidationResult {
  if (!present(input.title)) return { ok: false, message: "Job title is required." };
  if (!present(input.organisation)) return { ok: false, message: "Organisation is required." };
  if (!present(input.location)) return { ok: false, message: "Location is required." };
  if (!present(input.description)) return { ok: false, message: "Description is required." };

  if (input.jobType && !jobTypes.includes(input.jobType)) {
    return { ok: false, message: "Job type is not valid." };
  }

  if (input.applicationLink && !validOptionalUrl(input.applicationLink)) {
    return { ok: false, message: "Application link must be a valid URL." };
  }

  return { ok: true };
}

export function validateJobPublish(input: JobOpportunityInput): ValidationResult {
  const draft = validateJobDraft(input);

  if (!draft.ok) return draft;

  if (
    !present(input.applicationLink) &&
    !present(input.applicationInstructions) &&
    !present(input.organisationContact)
  ) {
    return {
      ok: false,
      message: "Add an application link, application instructions, or organisation contact before publishing.",
    };
  }

  return { ok: true };
}

export function validateWhatsappNumber(value: string): ValidationResult {
  const trimmed = value.trim();

  if (!trimmed) return { ok: true };

  if (!/^[1-9][0-9]{7,14}$/.test(trimmed)) {
    return {
      ok: false,
      message: "WhatsApp number must use international format without +.",
    };
  }

  return { ok: true };
}

export function validateAttachment(file: File): ValidationResult {
  if (file.size === 0) return { ok: true };

  if (!allowedAttachmentTypes.has(file.type)) {
    return { ok: false, message: "Attachment must be a PDF, PNG, JPG, or WEBP file." };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, message: "Attachment must be 10 MB or smaller." };
  }

  return { ok: true };
}
