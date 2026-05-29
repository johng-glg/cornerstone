# Compliance Evidence

> **Phase D.** Evidence supporting Cornerstone's regulatory and bar-defensibility posture.
> Drafts are **engineering-complete and automatically verified** where the claim is verifiable
> from code/schema; items requiring a named reviewer or regulatory artifact are marked
> **pending sign-off** (Q-A5).

## Sign-off owner

Per the seed and `docs/open_questions.md` (Q-A5), the compliance sign-off owner is
**Kimberly Uptain**. Reviewer identity and the required evidence formats for the regulatory
artifacts below are still to be confirmed — until then those artifacts are scaffolds with the
verifiable portions filled in.

## Index

| Artifact                           | Status                                                               | What backs it                                                                        |
| ---------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `rls_audit_report.md`              | ✅ Engineering-complete, auto-verified                               | `tests/db/rls_isolation.test.sql` (21 groups) in CI; live RLS coverage 95/95 tables. |
| `ssn_backfill_evidence.md`         | ✅ Schema guarantee auto-verified; ⏳ production attestation pending | `assert_no_plaintext_pii()` (test group 21).                                         |
| `tsr_disclosure_evidence.md`       | ⏳ Scaffold, pending sign-off                                        | TSR §310.3(a)(1) disclosure-capture mechanism (below).                               |
| `dfpi_registration_evidence.md`    | ⏳ Scaffold, pending artifacts                                       | DFPI registration records (external).                                                |
| `bar_trust_accounting_evidence.md` | ⏳ Scaffold, pending sign-off                                        | Trust-accounting / money-flow controls.                                              |

## What "engineering-complete, pending sign-off" means

The technical control exists, is implemented, and is verified by an automated test in CI. The
remaining work is **attestation** — a named compliance reviewer confirming the control satisfies
the regulatory requirement, and (for external artifacts like DFPI registration) attaching the
authoritative document. No further engineering is required for the ✅ items unless sign-off
surfaces a gap.

## Regulatory artifact scaffolds

The three regulatory artifacts (`tsr_*`, `dfpi_*`, `bar_*`) capture, for each requirement: the
control in Cornerstone that addresses it, where that control is enforced/verified, and the
evidence the reviewer needs to attach. They are intentionally drafted now so the reviewer has a
concrete checklist; they are **not** a substitute for the reviewer's attestation or for the
external registration documents.
