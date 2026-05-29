#!/usr/bin/env node
/**
 * CI gate (approved divergence Q-A4): every edge function must validate its input with Zod.
 *
 * Scans each `supabase/functions/<name>/index.ts` (excluding `_shared/`) and fails if it does
 * not import Zod. This is a coarse but effective guard that a new function wasn't added without
 * input validation — reviewers still confirm the schema actually covers the payload.
 *
 * Exit 0 = all good (including when there are no functions yet). Exit 1 = violation.
 */
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const FUNCTIONS_DIR = "supabase/functions";
const ZOD_IMPORT = /from\s+["'][^"']*\bzod\b[^"']*["']/;

if (!existsSync(FUNCTIONS_DIR)) {
  console.log("check:zod — no supabase/functions directory; nothing to check.");
  process.exit(0);
}

const violations = [];
let checked = 0;

for (const entry of readdirSync(FUNCTIONS_DIR)) {
  if (entry === "_shared" || entry.startsWith(".")) continue;
  const dir = join(FUNCTIONS_DIR, entry);
  if (!statSync(dir).isDirectory()) continue;
  const indexPath = join(dir, "index.ts");
  if (!existsSync(indexPath)) continue;

  checked += 1;
  const source = readFileSync(indexPath, "utf8");
  if (!ZOD_IMPORT.test(source)) {
    violations.push(entry);
  }
}

if (violations.length > 0) {
  console.error("check:zod — FAIL. Edge functions missing a Zod import (input validation):");
  for (const v of violations) console.error(`  - supabase/functions/${v}/index.ts`);
  console.error("\nEvery edge function must validate its input with Zod (see Q-A4).");
  process.exit(1);
}

console.log(`check:zod — OK (${checked} edge function(s) validated).`);
