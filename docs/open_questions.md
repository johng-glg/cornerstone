# Open Questions — Phase A

> Section 10 deliverable. Questions to resolve early, plus new ones surfaced by reading the
> `lovable-source` tree. Status tracked here until closed.
>
> **Date opened:** 2026-05-29.

## From seed §10

| # | Question | Status / current assumption |
|---|---|---|
| Q1 | **Deployment target.** Vercel + Supabase Cloud assumed. Confirm — if AWS/GCP/self-host, Phase F scope changes. | **Open.** Assuming Vercel + Supabase Cloud (seed §2A default). |
| Q2 | **Lovable IP / source extraction.** Confirm GLG owns the Lovable source and can extract for replication. | **Resolved.** Source delivered as `lovable-source` branch; John built it. |
| Q3 | **Senior engineering hire status.** Onboard? Affects dev-env choices and pace. | **Open.** Phase B docs written stack-agnostic so either way works. |
| Q4 | **Sync cadence with Lovable.** Default: within 1 week of each Lovable phase shipping. Confirm. | **Open.** Assuming 1-week default; `docs/lovable_sync_log.md` will track. |
| Q5 | **Phase 8 sandbox for 2026-08-19?** Joe's processor team. Affects adapter-integration start. | **Open.** Mock adapter (A5) makes us independent of the real sandbox until then. |
| Q6 | **Phase 9 cohort cutover plan.** Detailed cohort selection logic owed by 2026-09-15. Who owns? | **Open.** Out of Phase A/B scope; flagged for ownership. |

## New questions surfaced by the source read

| # | Question | Why it matters |
|---|---|---|
| **Q-A1** | **Phase A scope: "spine-first" or "entire surface"?** The system is ~2–3× the spec's apparent scope. Plan assumes Phase A = dependency spine + core CRM, with litigation/lead-engine/workflow/email-infra/billing porting through early Phase C. | Determines the A6→C boundary and the Phase A landing date (~2026-06-19 spine vs later for full parity). |
| **Q-A2** | **Duplicate tables: which is live —** `services` vs `client_services`, and `template_usage` vs `template_usages`? | We replicate only the live table and mark the other deprecated; avoids carrying confusion into production. Needs FK/RLS/code-reference confirmation from source. |
| **Q-A3** | **Forth poller cron — in a migration or only in the Supabase dashboard?** (Forth audit §3 left this ambiguous; in-repo crons are escrow-sync/nsf-retry/reconciliation only.) | Determines whether transaction polling is reproducible from source or needs to be authored. |
| **Q-A4** | **Confirm divergences** (inventory §9): encrypt per-tenant Forth creds, pin `supabase-js` version, restrict CORS, Zod on every input. All are hardening beyond Lovable. | Seed requires documented justification for any divergence from a Lovable pattern; confirming up front avoids rework. |
| **Q-A5** | **Compliance sign-off owners.** Seed names Kimberly Uptain (Phase D compliance) and references bar/DFPI/TSR evidence. Confirm reviewers and required evidence formats for `docs/compliance-evidence/`. | Phase D exit depends on named sign-off; good to line up early. |

## Cross-program note (not blocking)

Advisory Panel Q5 (2026-05-28) voted **DEFER migration off Lovable**. The v3 seed prompt
supersedes that — John reframed the standalone as the production destination with Phase A
starting now. Proceeding per the seed; logged here for the record.
