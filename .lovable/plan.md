# Cornerstone Plan — Live Status

This file tracks the active Operation Cornerstone roadmap. Detailed per-phase write-ups live in `phase_{1..7}_summary.md` and `docs/cornerstone/`.

## Phase status

| Phase | Title | Status |
|-------|-------|--------|
| 1 (A–E) | Multi-tenancy, RLS audit, central audit log, inactivity timeout, role/permission hardening | ✅ Done |
| 2 (A–E) | PII encryption (SSN, banking), DB audit triggers, server-side input validation, storage allowlists | ✅ Done |
| 3 | Forth refactor: extract `_shared/forthAuth`, OAuth caching, central error handling | ✅ Done |
| 4 | PLSA routing layer: `plsa-adapter-mock`, `plsa-routing` orchestrator, feature-flagged adapter selection | ✅ Done |
| 5 | Reconciliation + NSF retry: `plsa-reconciliation`, `plsa-nsf-retry`, `NsfRetryPolicyTab`, reconciliation dashboard | ✅ Done |
| 6 | Creditor response tracking + service graduation automation | ✅ Done |
| **7** | **Storage hardening: private buckets, company-scoped storage RLS, signed URLs, realtime channel auth** | **✅ Done** |
| 8 | New PLSA processor adapter (`plsa-adapter-{processor}`) + sandbox integration tests | ⏸ Blocked — waiting on sandbox availability (~2026-08-19) and ADR-009 v2 |
| 9 | Cohort routing + production cutover: `cohort_assignments`, admin UI, parallel-run validation, decommission Forth servicing UI | ⏸ Blocked on Phase 8 |

## Open items

- Phase 8 prerequisites: confirm new processor sandbox account, finalize ADR-009 v2, write contract tests against mock first.
- Phase 9 prerequisites: validate Phase 8 adapter at scale; draft rollback playbook.

## Security posture

All `error`-level scanner findings are resolved as of Phase 7. Outstanding warnings are documented and accepted in `@security-memory` (search-path WARN, extension-in-public WARN, etc.).
