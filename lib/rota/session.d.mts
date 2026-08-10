export const SESSION_TTL_MS: number;
export function signRotaSession(departmentId: string, now?: number): string;
export function verifyRotaSession(
  token: string,
  now?: number,
):
  | { ok: true; departmentId: string }
  | { ok: false; reason: "expired" | "invalid" };
