import crypto from "node:crypto";

export function normalizeAccessCode(code: string) {
  return code.trim().toUpperCase();
}

export function hashAccessCode(code: string) {
  const pepper = process.env.ACCESS_CODE_PEPPER;

  if (!pepper) {
    throw new Error("ACCESS_CODE_PEPPER is missing.");
  }

  return crypto
    .createHash("sha256")
    .update(`${pepper}:${normalizeAccessCode(code)}`)
    .digest("hex");
}
