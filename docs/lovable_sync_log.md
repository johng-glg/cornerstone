# Lovable Sync Log

Records each sync from the Lovable reference build into the Cornerstone production codebase,
with timestamp, Lovable phase/scope, and **divergence notes** (where and why we deviate from a
Lovable-shipped pattern — required by the seed's working model).

---

## 2026-05-29 — Phase A foundation (initial extraction)

**Source:** `lovable-source` branch (mirror of `johng-glg/guardian-case-craft@lovable`),
covering Lovable Operation Cornerstone Phases 1–7 + 11–12 and the underlying base CRM,
litigation, lead-engine, workflow-engine, and email-infrastructure layers.

**Scope synced so far:** repository scaffold (A1), CI + quality gates (A2). Schema replication
(A3+) in progress.

### Divergences from Lovable (approved Q-A4, 2026-05-29)

1. **Pinned `@supabase/supabase-js` to an exact version.** Lovable mixes `^2.93.3` (frontend)
   and `@2` / `@2.45.0` (edge functions via esm.sh). We pin one version everywhere for
   reproducibility.
2. **Removed `lovable-tagger`.** Lovable-Cloud-specific dev plugin; not used in production.
3. **No secrets in source.** Lovable committed a live `.env`; we ship `.env.example` only and
   enforce a secret-scan CI gate (`check:secrets`).
4. **Restrict CORS (CI-enforced).** Lovable uses `Access-Control-Allow-Origin: *` on every edge
   function; we forbid the wildcard via `check:cors` and will set per-environment origin
   allowlists when the functions are ported (A6+).
5. **Zod on every edge-function input (CI-enforced).** Lovable validation is inconsistent;
   `check:zod` fails any edge function without a Zod import.

### Migration approach divergence

6. **Squashed clean baseline instead of replaying 78 historical migrations.** See
   `docs/adrs/ADR-001-migration-strategy.md`. The Lovable history only converges via mid-history
   renames (`contacts→clients`, `engagements→client_services`, `forth_sync_log→plsa_sync_log`);
   we author a consolidated final-state baseline, verified by schema-diff against the Lovable
   schema.

### A6 Forth auth (2026-05-29)

- **Credential encryption implemented (Q-A4).** Per-tenant Forth creds: client_id in
  `company_processor_configs.config`, api_key encrypted in `api_key_encrypted` (via `encrypt_pii`),
  read through the service-role-only `decrypt_processor_credentials` RPC. Diverges from Lovable's
  plaintext `config.{client_id,api_key}`.

### A6 schema (2026-05-29)

- PLSA/payments tables extracted from the reference; **re-added the two A5-deferred `transactions`
  FKs** (their targets `payment_processors`/`payment_schedules` now exist).
- Grants: explicit (vs Lovable's reliance on Supabase default privileges) for local testability +
  least privilege; matched the reference's no-DELETE on `reconciliation_findings` /
  `transaction_retry_attempts`.

### A5 groundwork (2026-05-29)

- Stood up a local stub harness (`scripts/schema-harness/`) that applies the **full** Lovable
  migration chain on stock Postgres and dumps the authoritative final `public` schema to
  `supabase/reference/lovable_public_schema.sql` — the ADR-001 schema-diff baseline. Confirms
  the inventory exactly: **94 tables, 94 RLS-enabled, 212 live policies, 38 functions** (212 live
  vs 275 raw `CREATE POLICY` is the expected effect of the history's DROP/CREATE churn).
- Q-A2 resolved for core CRM: `services` (catalog) and `client_services` (engagements) are
  distinct, not duplicates. `template_usage`/`template_usages` duplicate deferred to A10.

### A12 — Phase A closeout (2026-05-29)

- **ADR-009 ratified** and moved to `docs/adrs/ADR-009-plsa-adapter-interface-contract.md`
  (was repo root). Interface frozen; A6 `plsa-routing` + `plsa-adapter-mock` are the conforming
  implementation. New-processor co-sign (target 2026-06-17) is the one open external follow-up.
- **Phase A summary** written (`docs/phases/phase_A_summary.md`). Records final parity: the
  whole-schema object diff is empty (all 954 objects) except the accepted, documented `staff`
  physical column ordering (logical schema byte-identical).
- No new schema in A12 — documentation, ADR ratification, and CHANGELOG only.

### Phase B — local dev + onboarding (2026-05-29)

- **Synthetic, PII-free seed.** Lovable committed a live `.env` and seeded against real-looking
  data; Cornerstone's `supabase/seed.sql` is fully synthetic — fake names/emails, SSNs only via
  `encrypt_pii` in the `900-00-000x` range, processor api keys stored encrypted. Idempotent
  (stable-id `ON CONFLICT` guards) so `supabase start` / `db reset` re-runs cleanly. Verified
  end-to-end on local Postgres 16 (migrations + seed + both SQL suites green; 3× re-seed stable).
- **Seed verification in CI.** `tests/db/seed_verify.test.sql` asserts the acceptance criteria
  (2+ tenants, login-ready users, cross-tenant fixtures, no plaintext PII, idempotency) in the
  `db-verify` job — the B-A1 workaround: the stack boots in CI, not the sandbox.
- **Docker Compose DB-only path** added for engineers without the Supabase CLI, reusing the
  schema-harness approach (stub the Supabase-managed surface on stock Postgres). Path A
  (`supabase start`) remains the recommended full-stack local environment.
- No schema changes in Phase B — seed, tests, docs, and tooling only.

### Phase D — security hardening (2026-05-29)

- **Rate limiting (Lovable had none — accepted risk resolved).** Postgres-backed fixed-window
  limiter wired into auth-adjacent / external-API edge functions + webhooks. Lovable's functions
  had no limiter; this is net-new hardening, not a transcription.
- **PII-plaintext verification.** Lovable left deprecated plaintext-era PII columns
  (`clients.ssn_encrypted`, `lead_banking.*_encrypted`) in place; Cornerstone adds a standing
  assertion (`assert_no_plaintext_pii`) proving they hold no data, run in CI.
- **SAST + edge-fn type-check.** CodeQL added (Lovable had no SAST); Q-A8 edge-fn type-checking
  restored via `--no-check=remote`.
- **Compliance evidence corpus** authored (`docs/compliance-evidence/`) — Lovable had none.
  RLS audit + SSN-backfill auto-verified; TSR/DFPI/bar scaffolds pending sign-off (Q-A5).
- One new table (`rate_limit_counters`) + functions; no change to existing Lovable-derived schema.

### Hardening divergences planned (apply as the relevant objects land)

- Encrypt per-tenant Forth credentials in `company_processor_configs` (Lovable stores them
  plaintext; the `api_key_encrypted` column is unused). — A6.
- Qualify `pgp_sym_encrypt`/`pgp_sym_decrypt` with the `extensions` schema and pin search*path
  in the PII crypto functions (Lovable's final `decrypt*\*`versions call them unqualified under`search_path = public`, which is fragile). — A3/A5.
