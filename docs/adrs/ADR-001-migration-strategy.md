# ADR-001 — Migration strategy: squashed clean baseline

**Status:** Accepted
**Date:** 2026-05-29
**Decision owner:** Program Manager (John G.)
**Context:** Phase A, Cornerstone standalone build.

## Context

Cornerstone replicates the schema validated in the Lovable reference build
(`lovable-source` branch: 78 forward-only migrations, 94 tables, ~70 enums, ~30 DB functions,
275 RLS policies). On reading the Lovable migration history we found it does **not** replay
cleanly as a coherent narrative:

- Tables are created under one name and **renamed mid-history**:
  `contacts → clients`, `engagements → client_services`, `engagement_contacts →
client_service_clients`, `engagement_services → client_service_types`,
  `forth_sync_log → plsa_sync_log`, plus many `RENAME COLUMN` (e.g. `engagement_id →
client_service_id`, `staff.department_new → department`).
- Functions are `CREATE OR REPLACE`d several times across migrations (e.g.
  `can_access_company` has two definitions; `decrypt_client_ssn`/`decrypt_lead_banking` are
  created, dropped, and recreated with different signatures and self-logging).
- Cloud-specific bits (`pg_cron`, `pg_net`, `pgmq`, `supabase_vault`, hardcoded project refs)
  are interleaved.

The 78 migrations only reach the correct final state if replayed verbatim and in full.

## Decision

**Author a clean, consolidated baseline** that reproduces the exact final-state schema
(as captured by the Lovable `types.ts`), rather than replaying the 78 historical migrations
verbatim. Migrations are organised by logical module along the Phase A PR boundaries
(A3 tenancy/RLS/audit/PII spine, A5 core CRM, A6 PLSA, …), each forward-only and each carrying
**inline rollback SQL**.

Final-state fidelity is enforced by **applying the baseline to a real Postgres/Supabase
instance and diffing the resulting schema against the Lovable schema** — the diff is the
correctness gate that mitigates hand-transcription risk.

## Alternatives considered

- **Replay all 78 Lovable migrations verbatim, in order.** Maximum fidelity to the proven
  chain and literal to the seed's "in order" instruction. Rejected as the default because it
  carries the rename churn into a brand-new production history (creates `contacts` only to
  rename it to `clients`, etc.), which is materially harder for a new engineering team to read
  and reason about — and inheritability by an unfamiliar team is an explicit program goal. The
  cloud-specific bits would still need portability surgery regardless.

## Consequences

**Positive.** Clean, readable, module-organised migration history with first-class rollback
SQL; the schema a new engineer reads matches the schema that runs; no dead intermediate
objects.

**Negative / mitigations.** Hand-transcription risk vs. the proven chain → mitigated by the
mandatory schema-diff gate against the Lovable schema, and by transcribing final definitions
verbatim from the Lovable source (not paraphrasing). Dependency ordering differs from the
A-PR breakdown in a few places (e.g. `decrypt_client_ssn`/`decrypt_lead_banking` and the audit
_trigger attachments_ depend on `clients`/`leads`/`lead_banking`, so they land in A5 with those
tables, not in A3) — documented per migration.

**This commits us to:** a schema-diff verification step in CI/local before any
schema-bearing PR is considered done; transcribing object definitions verbatim from
`lovable-source`; documenting every intentional divergence in `docs/lovable_sync_log.md`.
