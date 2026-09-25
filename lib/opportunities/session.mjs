import crypto from "node:crypto";

export const OPPORTUNITY_DASHBOARD_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function sign(subject, expiresAt) {
  const pepper = process.env.ACCESS_CODE_PEPPER;

  if (!pepper) {
    throw new Error("ACCESS_CODE_PEPPER is missing.");
  }

  return crypto
    .createHmac("sha256", pepper)
    .update(`opportunity-dashboard:${subject}:${expiresAt}`)
    .digest("hex");
}

export function signOpportunityDashboardSession(subject, now = Date.now()) {
  const expiresAt = now + OPPORTUNITY_DASHBOARD_SESSION_TTL_MS;
  return `${subject}.${expiresAt}.${sign(subject, expiresAt)}`;
}

export function verifyOpportunityDashboardSession(token, now = Date.now()) {
  if (typeof token !== "string") {
    return { ok: false, reason: "invalid" };
  }

  const parts = token.split(".");

  if (parts.length !== 3) {
    return { ok: false, reason: "invalid" };
  }

  const [subject, expiresAtRaw, signature] = parts;
  const expiresAt = Number(expiresAtRaw);

  if (!subject || !expiresAtRaw || !Number.isFinite(expiresAt)) {
    return { ok: false, reason: "invalid" };
  }

  const given = Buffer.from(signature, "hex");
  const wanted = Buffer.from(sign(subject, expiresAt), "hex");

  if (given.length !== wanted.length || !crypto.timingSafeEqual(given, wanted)) {
    return { ok: false, reason: "invalid" };
  }

  if (now >= expiresAt) {
    return { ok: false, reason: "expired" };
  }

  if (subject !== "pastor" && !subject.startsWith("department:")) {
    return { ok: false, reason: "invalid" };
  }

  return { ok: true, subject };
}
