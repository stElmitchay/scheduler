import assert from "node:assert/strict";
import { test } from "node:test";

process.env.ACCESS_CODE_PEPPER = "test-pepper";

const { signRotaSession, verifyRotaSession, SESSION_TTL_MS } = await import(
  "../session.mjs"
);

const DEPT = "11111111-1111-1111-1111-111111111111";

test("a signed token round-trips to its department id", () => {
  const token = signRotaSession(DEPT, 1_000_000);
  const result = verifyRotaSession(token, 1_000_000);

  assert.deepEqual(result, { ok: true, departmentId: DEPT });
});

test("a token is valid just before it expires", () => {
  const token = signRotaSession(DEPT, 1_000_000);
  const result = verifyRotaSession(token, 1_000_000 + SESSION_TTL_MS - 1);

  assert.equal(result.ok, true);
});

test("a token is rejected once it expires", () => {
  const token = signRotaSession(DEPT, 1_000_000);
  const result = verifyRotaSession(token, 1_000_000 + SESSION_TTL_MS + 1);

  assert.deepEqual(result, { ok: false, reason: "expired" });
});

test("a tampered department id is rejected", () => {
  const token = signRotaSession(DEPT, 1_000_000);
  const [, expiresAt, signature] = token.split(".");
  const forged = [
    "22222222-2222-2222-2222-222222222222",
    expiresAt,
    signature,
  ].join(".");

  assert.deepEqual(verifyRotaSession(forged, 1_000_000), {
    ok: false,
    reason: "invalid",
  });
});

test("a tampered expiry is rejected", () => {
  const token = signRotaSession(DEPT, 1_000_000);
  const [departmentId, expiresAt, signature] = token.split(".");
  const forged = [
    departmentId,
    String(Number(expiresAt) + 86_400_000),
    signature,
  ].join(".");

  assert.deepEqual(verifyRotaSession(forged, 1_000_000), {
    ok: false,
    reason: "invalid",
  });
});

test("an expired token with a broken signature reads as invalid, not expired", () => {
  const token = signRotaSession(DEPT, 1_000_000);
  const [departmentId, expiresAt] = token.split(".");
  const forged = [departmentId, expiresAt, "00".repeat(32)].join(".");

  assert.deepEqual(
    verifyRotaSession(forged, 1_000_000 + SESSION_TTL_MS + 1),
    { ok: false, reason: "invalid" },
  );
});

test("malformed tokens are rejected rather than throwing", () => {
  for (const bad of ["", "nonsense", "a.b", "a.b.c.d", "a.b.zz"]) {
    assert.deepEqual(verifyRotaSession(bad, 1_000_000), {
      ok: false,
      reason: "invalid",
    });
  }
});
