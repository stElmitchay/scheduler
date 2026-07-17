import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  departmentsToInsert,
  formatAccessCode,
  generateDepartmentSql,
} from "../department-sql.mjs";

describe("department SQL generator", () => {
  it("includes only remaining active departments that need hashes", () => {
    const names = departmentsToInsert.map((department) => department.name);

    assert.deepEqual(names, [
      "Finance",
      "Media",
      "Prayer",
      "Engineering",
      "Assimilation",
      "Sanctuary Keepers",
      "Uniform",
      "Hospitality",
      "Admin",
      "Live Production",
      "Sound",
      "Welfare",
    ]);

    assert.equal(names.includes("Choir"), false);
    assert.equal(names.includes("Ushers"), false);
    assert.equal(names.includes("Praise"), false);
    assert.equal(names.includes("Instrumental"), false);
    assert.equal(names.includes("Follow-Up"), false);
    assert.equal(names.includes("New Believers"), false);
  });

  it("formats department access codes predictably", () => {
    assert.equal(formatAccessCode("Live Production"), "LIVE-PRODUCTION-2026");
    assert.equal(formatAccessCode("Sanctuary Keepers"), "SANCTUARY-KEEPERS-2026");
  });

  it("generates Supabase upsert SQL with hashes", () => {
    const sql = generateDepartmentSql("pepper");

    assert.match(sql, /insert into public\.departments/);
    assert.match(sql, /'Finance', '[a-f0-9]{64}'/);
    assert.match(sql, /'Welfare', '[a-f0-9]{64}'/);
    assert.match(sql, /on conflict \(name\) do update/);
  });
});
