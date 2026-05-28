# Terminology Glossary — Phase 1D

Single source of truth for user-facing language across the GLG Case Management System.
**Code identifiers, table names, column names, and type literals do NOT change.** Only
display strings shown to staff/clients are updated.

## Canonical mapping

| Old (UI)                 | New (UI)                                  | Notes                                                                  |
| ------------------------ | ----------------------------------------- | ---------------------------------------------------------------------- |
| Debt Settlement          | Consumer Debt Defense                     | Program-level label. Database enum `debt_settlement` stays as-is.       |
| Service / Services       | Engagement / Engagements                  | Display only. Table `client_services` and routes stay (`/services`).    |
| Escrow                   | PLSA                                      | First mention in a screen may expand to "PLSA (administered by Set Forth)". |
| Escrow Balance           | PLSA Balance                              | Card titles, labels, chart titles.                                      |
| Escrow Projection        | PLSA Projection                           |                                                                        |
| Debt (where it is really a Liability) | Liability                    | Already correct in code; sweep only stray UI strings.                  |

## Where it lives

- `src/lib/terminology.ts` — display constants. Import these from components instead
  of hard-coding the words a second time.
- Route paths, table names, enum values, query keys, and TypeScript type names are
  unchanged. A future tenant could re-label via tenant feature flags without a
  migration.

## Out of scope (intentional)

- Database renames (`client_services`, `program_type='debt_settlement'`, etc.) —
  spec explicitly says identifiers stay.
- Docs/spec strings inside `src/lib/docs/*` — these describe the underlying data
  model and keep their original wording for traceability.
- Email templates and PDFs — handled by the template merge registry in a separate
  pass.
