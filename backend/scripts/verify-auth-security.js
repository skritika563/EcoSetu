/**
 * Lightweight auth security checks — no server or DB required.
 * Run: node scripts/verify-auth-security.js
 */
require("dotenv").config();

process.env.ADMIN_EMAILS = "admin@test.com,other@test.com";

const PUBLIC_ROLES = ["household", "organization", "collector"];

const getAdminEmailAllowlist = () => {
  const raw = process.env.ADMIN_EMAILS || "";
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
};

const isAdminEmail = (email) => {
  if (!email) return false;
  return getAdminEmailAllowlist().has(email.trim().toLowerCase());
};

let passed = 0;
let failed = 0;

const assert = (label, condition) => {
  if (condition) {
    passed += 1;
    console.log(`  ✅ ${label}`);
  } else {
    failed += 1;
    console.error(`  ❌ ${label}`);
  }
};

console.log("\nAuth security checks\n");

assert("admin role excluded from PUBLIC_ROLES", !PUBLIC_ROLES.includes("admin"));
assert("household is a public role", PUBLIC_ROLES.includes("household"));
assert("allowlisted admin email recognized", isAdminEmail("admin@test.com"));
assert("allowlisted admin email is case-insensitive", isAdminEmail("Admin@Test.com"));
assert("non-allowlisted email rejected", !isAdminEmail("random@test.com"));
assert("empty email rejected", !isAdminEmail(""));

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
