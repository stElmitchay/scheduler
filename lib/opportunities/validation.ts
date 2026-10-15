import {
  employmentTypes,
  opportunityKinds,
  type OpportunityFollowUpInput,
  type OpportunityInput,
  type ValidationResult,
} from "./types";

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

export function validateOpportunityDraft(
  input: OpportunityInput,
): ValidationResult {
  if (!present(input.title)) return { ok: false, message: "Title is required." };
  if (!present(input.organisation)) return { ok: false, message: "Organisation is required." };
  if (!present(input.location)) return { ok: false, message: "Location is required." };
  if (!present(input.description)) return { ok: false, message: "Description is required." };

  if (!opportunityKinds.includes(input.kind)) {
    return { ok: false, message: "Opportunity kind is not valid." };
  }

  if (input.employmentType && !employmentTypes.includes(input.employmentType)) {
    return { ok: false, message: "Employment type is not valid." };
  }

  if (input.applicationLink && !validOptionalUrl(input.applicationLink)) {
    return { ok: false, message: "Application link must be a valid URL." };
  }

  return { ok: true };
}

export function validateOpportunityPublish(
  input: OpportunityInput,
): ValidationResult {
  const draft = validateOpportunityDraft(input);

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

export function normalizeFollowUpContact(value: string) {
  const trimmed = value.trim().toLowerCase();

  return trimmed.includes("@")
    ? trimmed.replace(/\s/g, "")
    : trimmed.replace(/\D/g, "");
}

function threeMonthDueDate(startedAt: string) {
  const [year, month, day] = startedAt.split("-").map(Number);
  const targetMonth = month + 2;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();

  return new Date(
    Date.UTC(targetYear, normalizedMonth, Math.min(day, lastDay)),
  );
}

export function validateOpportunityFollowUp(
  input: OpportunityFollowUpInput,
): ValidationResult {
  if (!input.name.trim()) return { ok: false, message: "Your name is required." };
  if (input.name.trim().length > 120) {
    return { ok: false, message: "Your name must be 120 characters or fewer." };
  }

  const contact = input.contactDetail.trim();
  if (contact.length > 180) {
    return { ok: false, message: "Your contact detail must be 180 characters or fewer." };
  }

  const digits = contact.replace(/\D/g, "");
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  const validPhone =
    /^[+\d\s().-]+$/.test(contact) &&
    digits.length >= 7 &&
    digits.length <= 15;

  if (!validEmail && !validPhone) {
    return {
      ok: false,
      message: "Enter a valid phone/WhatsApp number or email address.",
    };
  }

  if (!input.opportunityId) {
    return { ok: false, message: "Choose the opportunity you applied for." };
  }
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      input.opportunityId,
    )
  ) {
    return { ok: false, message: "Choose a valid opportunity." };
  }

  if (input.startedWorking) {
    if (!input.startedAt || !/^\d{4}-\d{2}-\d{2}$/.test(input.startedAt)) {
      return { ok: false, message: "Enter the date you started working." };
    }

    const startedAt = new Date(`${input.startedAt}T00:00:00Z`);
    const now = new Date();

    if (
      Number.isNaN(startedAt.getTime()) ||
      startedAt.toISOString().slice(0, 10) !== input.startedAt ||
      startedAt > now
    ) {
      return { ok: false, message: "The start date must be a valid date in the past." };
    }

    const followUpDueDate = threeMonthDueDate(input.startedAt);

    if (followUpDueDate <= now && input.retainedAfterThreeMonths === null) {
      return {
        ok: false,
        message: "Please answer the three-month role update.",
      };
    }

    if (followUpDueDate > now && input.retainedAfterThreeMonths !== null) {
      return {
        ok: false,
        message: "The three-month role update is not due yet.",
      };
    }
  } else if (input.startedAt || input.retainedAfterThreeMonths !== null) {
    return {
      ok: false,
      message: "Role dates and the three-month update require a start date.",
    };
  }

  if (!input.followUpConsent) {
    return {
      ok: false,
      message: "Please allow the Welfare team to contact you about this update.",
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
