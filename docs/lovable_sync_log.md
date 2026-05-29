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

### Hardening divergences planned (apply as the relevant objects land)

- Encrypt per-tenant Forth credentials in `company_processor_configs` (Lovable stores them
  plaintext; the `api_key_encrypted` column is unused). — A6.
- Qualify `pgp_sym_encrypt`/`pgp_sym_decrypt` with the `extensions` schema and pin search*path
  in the PII crypto functions (Lovable's final `decrypt*\*`versions call them unqualified under`search_path = public`, which is fragile). — A3/A5.
