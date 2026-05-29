#!/usr/bin/env node
/**
 * CI gate (approved divergence Q-A4): every edge function must validate its input with Zod.
 *
 * Scans each `supabase/functions/<name>/` (excluding `_shared/`) and fails if no `.ts` file in
 * the function's directory imports Zod. The function must have an `index.ts`; the Zod schema may
 * live there or in a sibling module (e.g. `logic.ts`). Coarse but effective: a new function can't
 * be added without input validation — reviewers still confirm the schema covers the payload.
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
  // Pass if any non-test .ts file in the function dir imports Zod.
  const tsFiles = readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
  const hasZod = tsFiles.some((f) => ZOD_IMPORT.test(readFileSync(join(dir, f), "utf8")));
  if (!hasZod) {
    violations.push(entry);
  }
}

if (violations.length > 0) {
  console.error("check:zod — FAIL. Edge functions with no Zod import (input validation):");
  for (const v of violations) console.error(`  - supabase/functions/${v}/`);
  console.error("\nEvery edge function must validate its input with Zod (see Q-A4).");
  process.exit(1);
}

console.log(`check:zod — OK (${checked} edge function(s) validated).`);
