#!/usr/bin/env node
/**
 * CI gate (approved divergence Q-A4): no wildcard CORS in edge functions.
 *
 * The Lovable build used `Access-Control-Allow-Origin: *` everywhere. Production restricts
 * origins per environment. This gate fails if any edge-function file sets the wildcard.
 *
 * Recurses through `supabase/functions/` (including `_shared/`). Exit 0 = clean. Exit 1 = found.
 */
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const FUNCTIONS_DIR = "supabase/functions";
// Matches: "Access-Control-Allow-Origin": "*"  (any quoting/spacing)
const WILDCARD_CORS = /["']?Access-Control-Allow-Origin["']?\s*[:=]\s*["']\*["']/i;

if (!existsSync(FUNCTIONS_DIR)) {
  console.log("check:cors — no supabase/functions directory; nothing to check.");
  process.exit(0);
}

const violations = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
    } else if (/\.(ts|js)$/.test(entry)) {
      const source = readFileSync(full, "utf8");
      if (WILDCARD_CORS.test(source)) violations.push(full);
    }
  }
}

walk(FUNCTIONS_DIR);

if (violations.length > 0) {
  console.error("check:cors — FAIL. Wildcard CORS (Access-Control-Allow-Origin: *) found in:");
  for (const v of violations) console.error(`  - ${v}`);
  console.error("\nRestrict CORS to an explicit per-environment origin allowlist (see Q-A4).");
  process.exit(1);
}

console.log("check:cors — OK (no wildcard CORS).");
