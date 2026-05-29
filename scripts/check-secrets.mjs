#!/usr/bin/env node
/**
 * Lightweight secret scan over git-tracked files. A fast first line of defence so a
 * credential never lands in a commit; full history scanning (gitleaks) + SAST (CodeQL)
 * are added in Phase D per the seed.
 *
 * Fails on high-signal patterns: private key blocks, AWS access keys, and Supabase/JWT
 * service-role tokens. Skips this script, the env template, and verbatim reference docs.
 *
 * Exit 0 = clean. Exit 1 = potential secret found.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const SKIP = new Set([
  ".env.example",
  "scripts/check-secrets.mjs",
  "ADR-009-plsa-adapter-interface-contract.md",
  "claude_code_standalone_prompt.md",
  "cornerstone_advisory_panel_report.md",
  "forth_integration_audit.md",
]);

const PATTERNS = [
  { name: "Private key block", re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: "AWS access key id", re: /\bAKIA[0-9A-Z]{16}\b/ },
  {
    name: "Supabase/JWT service token",
    re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  },
  {
    name: "Generic hardcoded secret assignment",
    re: /(?:service_role_key|secret_key|api[_-]?secret)\s*[:=]\s*["'][A-Za-z0-9/+=_-]{24,}["']/i,
  },
];

const tracked = execSync("git ls-files", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((f) => !SKIP.has(f))
  .filter((f) => !/\.(pdf|png|jpe?g|svg|ico|lockb|woff2?)$/i.test(f));

const findings = [];
for (const file of tracked) {
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const { name, re } of PATTERNS) {
    if (re.test(content)) findings.push({ file, name });
  }
}

if (findings.length > 0) {
  console.error("check:secrets — FAIL. Potential secrets detected:");
  for (const f of findings) console.error(`  - [${f.name}] ${f.file}`);
  console.error("\nRemove the secret, rotate it, and use the env/secret manager instead.");
  process.exit(1);
}

console.log(`check:secrets — OK (${tracked.length} tracked files scanned).`);
