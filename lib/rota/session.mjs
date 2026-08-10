import crypto from "node:crypto";

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function sign(departmentId, expiresAt) {
  const pepper = process.env.ACCESS_CODE_PEPPER;

  if (!pepper) {
    throw new Error("ACCESS_CODE_PEPPER is missing.");
  }

  return crypto
    .createHmac("sha256", pepper)
    .update(`${departmentId}:${expiresAt}`)
    .digest("hex");
}

export function signRotaSession(departmentId, now = Date.now()) {
  const expiresAt = now + SESSION_TTL_MS;
  return `${departmentId}.${expiresAt}.${sign(departmentId, expiresAt)}`;
}

export function verifyRotaSession(token, now = Date.now()) {
  if (typeof token !== "string") {
    return { ok: false, reason: "invalid" };
  }

  const parts = token.split(".");

  if (parts.length !== 3) {
    return { ok: false, reason: "invalid" };
  }

  const [departmentId, expiresAtRaw, signature] = parts;
  const expiresAt = Number(expiresAtRaw);

  if (!departmentId || !expiresAtRaw || !Number.isFinite(expiresAt)) {
    return { ok: false, reason: "invalid" };
  }

  const given = Buffer.from(signature, "hex");
  const wanted = Buffer.from(sign(departmentId, expiresAt), "hex");

  // Signature is checked before expiry so a forged token always reads as
  // "invalid" — an attacker learns nothing from the difference.
  if (given.length !== wanted.length || !crypto.timingSafeEqual(given, wanted)) {
    return { ok: false, reason: "invalid" };
  }

  if (now >= expiresAt) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, departmentId };
}
