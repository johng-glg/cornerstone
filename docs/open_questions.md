# Open Questions — Phase A

> Section 10 deliverable. Questions to resolve early, plus new ones surfaced by reading the
> `lovable-source` tree. Status tracked here until closed.
>
> **Date opened:** 2026-05-29.

## From seed §10

| # | Question | Status / current assumption |
|---|---|---|
| Q1 | **Deployment target.** Vercel + Supabase Cloud assumed. Confirm — if AWS/GCP/self-host, Phase F scope changes. | **Partially resolved (2026-05-29):** PM selected **"Other" (not Vercel + Supabase Cloud)**. Specifics pending — see Q-A6. Phase F scope will change accordingly. |
| Q2 | **Lovable IP / source extraction.** Confirm GLG owns the Lovable source and can extract for replication. | **Resolved.** Source delivered as `lovable-source` branch; John built it. |
| Q3 | **Senior engineering hire status.** Onboard? Affects dev-env choices and pace. | **Open.** Phase B docs written stack-agnostic so either way works. |
| Q4 | **Sync cadence with Lovable.** Default: within 1 week of each Lovable phase shipping. Confirm. | **Open.** Assuming 1-week default; `docs/lovable_sync_log.md` will track. |
| Q5 | **Phase 8 sandbox for 2026-08-19?** Joe's processor team. Affects adapter-integration start. | **Open.** Mock adapter (A5) makes us independent of the real sandbox until then. |
| Q6 | **Phase 9 cohort cutover plan.** Detailed cohort selection logic owed by 2026-09-15. Who owns? | **Open.** Out of Phase A/B scope; flagged for ownership. |

## New questions surfaced by the source read

| # | Question | Why it matters |
|---|---|---|
| **Q-A1** | **Phase A scope: "spine-first" or "entire surface"?** | **Resolved (2026-05-29): ENTIRE SURFACE in Phase A.** PM elected to replicate the full 94-table / 34-function / all-frontend-module surface at production+test quality within Phase A, absorbing most of Phase C's replication work. Revised landing ~late July; see execution plan. |
| **Q-A6** | **What is the "Other" deployment target?** | **Resolved (2026-05-29): Backend = Supabase Cloud (managed); Frontend = AWS/GCP/Azure static hosting (specific hyperscaler TBD at Phase F).** Not Vercel. Backend ops stay managed (Supabase Cloud is the backend SRE); only the FE host changes. Phase A/B remain host-agnostic on local Supabase; Phase F builds 3 Supabase Cloud projects (dev/staging/prod) + a static FE pipeline to the chosen cloud. |
| **Q-A6b** | **Which hyperscaler for the frontend** (AWS S3+CloudFront / GCP Cloud Storage+CDN / Azure Static Web Apps)? | **Deferrable to Phase F.** Does not affect Phase A/B (static build is portable). |
| **Q-A2** | **Duplicate tables: which is live —** `services` vs `client_services`, and `template_usage` vs `template_usages`? | We replicate only the live table and mark the other deprecated; avoids carrying confusion into production. Needs FK/RLS/code-reference confirmation from source. |
| **Q-A3** | **Forth poller cron — in a migration or only in the Supabase dashboard?** (Forth audit §3 left this ambiguous; in-repo crons are escrow-sync/nsf-retry/reconciliation only.) | Determines whether transaction polling is reproducible from source or needs to be authored. |
| **Q-A4** | **Confirm divergences** (inventory §9): encrypt per-tenant Forth creds, pin `supabase-js` version, restrict CORS, Zod on every input. | **Resolved (2026-05-29): ALL FOUR APPROVED.** Apply in Phase A; each gets a sync-log/ADR note. (Q-A2 duplicate-table resolution still pending source confirmation — I will resolve from source, not block on PM.) |
| **Q-A5** | **Compliance sign-off owners.** Seed names Kimberly Uptain (Phase D compliance) and references bar/DFPI/TSR evidence. Confirm reviewers and required evidence formats for `docs/compliance-evidence/`. | Phase D exit depends on named sign-off; good to line up early. |

## Cross-program note (not blocking)

Advisory Panel Q5 (2026-05-28) voted **DEFER migration off Lovable**. The v3 seed prompt
supersedes that — John reframed the standalone as the production destination with Phase A
starting now. Proceeding per the seed; logged here for the record.
