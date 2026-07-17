import crypto from "node:crypto";

const code = process.argv[2];
const pepper = process.env.ACCESS_CODE_PEPPER;

if (!code) {
  console.error('Usage: ACCESS_CODE_PEPPER="..." npm run hash-code -- "CODE-VALUE"');
  process.exit(1);
}

if (!pepper) {
  console.error("ACCESS_CODE_PEPPER is required.");
  process.exit(1);
}

const normalizedCode = code.trim().toUpperCase();
const hash = crypto
  .createHash("sha256")
  .update(`${pepper}:${normalizedCode}`)
  .digest("hex");

console.log(hash);
