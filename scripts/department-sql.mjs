import crypto from "node:crypto";

export const departmentsToInsert = [
  { name: "Finance" },
  { name: "Media" },
  { name: "Prayer" },
  { name: "Engineering" },
  { name: "Assimilation" },
  { name: "Sanctuary Keepers" },
  { name: "Uniform" },
  { name: "Hospitality" },
  { name: "Admin" },
  { name: "Live Production" },
  { name: "Sound" },
  { name: "Welfare" },
];

export function formatAccessCode(name) {
  return `${name.trim().toUpperCase().replaceAll(/\s+/g, "-")}-2026`;
}

function hashAccessCode(code, pepper) {
  return crypto
    .createHash("sha256")
    .update(`${pepper}:${code.trim().toUpperCase()}`)
    .digest("hex");
}

function sqlString(value) {
  return value.replaceAll("'", "''");
}

export function generateDepartmentSql(pepper) {
  const rows = departmentsToInsert
    .map((department) => {
      const code = formatAccessCode(department.name);
      const hash = hashAccessCode(code, pepper);
      return `  ('${sqlString(department.name)}', '${hash}')`;
    })
    .join(",\n");

  const codeComments = departmentsToInsert
    .map((department) => `-- ${department.name}: ${formatAccessCode(department.name)}`)
    .join("\n");

  return `${codeComments}

insert into public.departments (name, access_code_hash)
values
${rows}
on conflict (name) do update
set access_code_hash = excluded.access_code_hash;`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const pepper = process.env.ACCESS_CODE_PEPPER;

  if (!pepper) {
    console.error("ACCESS_CODE_PEPPER is required.");
    process.exit(1);
  }

  console.log(generateDepartmentSql(pepper));
}
