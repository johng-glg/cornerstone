# Phase 1D Summary — Terminology Pass

**Status:** ✅ Complete — verified pass (UI label sweep + docs center; code identifiers untouched per spec)

## Shipped

**New files**
- `docs/cornerstone/terminology_glossary.md` — canonical mapping + scope rules.
- `src/lib/terminology.ts` — `TERMS` constants for components that want a single source of truth going forward.

**UI swaps (display strings only)**
| File | Change |
| --- | --- |
| `src/components/layout/AppSidebar.tsx` | Sidebar item `Services` → `Engagements` (route `/services` unchanged) |
| `src/pages/Services.tsx` | H1 `Services` → `Engagements`; subtitle now "Manage client engagements and consumer debt defense programs"; button `New Service` → `New Engagement`; program-type display "Debt Settlement" → "Consumer Debt Defense" |
| `src/components/services/ServiceFormDialog.tsx` | `<SelectItem value="debt_settlement">` label → "Consumer Debt Defense" (value kept) |
| `src/components/services/ServiceDetailSheet.tsx` | Program-type label + "Escrow Balance" → "PLSA Balance" |
| `src/components/clients/detail/ServiceSummaryCard.tsx` | Program-type label + "Escrow Balance" → "PLSA Balance" |
| `src/components/clients/detail/ClientServicesTab.tsx` | Program-type label + "Escrow Balance" → "PLSA Balance" |
| `src/components/clients/detail/EscrowBalanceChart.tsx` | Card title "Projected Escrow Balance" → "Projected PLSA Balance" |
| `src/components/liabilities/SettlementOfferBuilder.tsx` | Section heading "Escrow Projection" → "PLSA Projection" |
| `src/components/workflows/ConditionBuilder.tsx` | Field label "Escrow Balance" → "PLSA Balance" |
| `src/types/templates.ts` | Template merge-field label "Escrow Balance" → "PLSA Balance" |
| `src/lib/reportModules.ts` | Report column label "Escrow Balance" → "PLSA Balance" |
| `src/pages/docs/DocsOverview.tsx` | "debt settlement law firms" → "consumer debt defense"; module list `Services` → `Engagements` |

## Intentionally NOT changed

Per spec note ("table names and column identifiers stay as-is to avoid migration churn — only display strings change"):

- Database: tables (`client_services`), columns (`escrow_balance`, `program_type`), enum value `debt_settlement`.
- Routes: `/services`, `/services/:id`.
- TypeScript types & hook names: `ClientService`, `useClientServices`, `ServiceFilters`, `ServiceStatusBadges`, etc.
- React Query keys, module name in `role_permissions.module = 'Services'` (data-driven; would require a coordinated migration).
- Docstrings inside `src/lib/docs/schemaData.ts`, `roleGuides.ts`, `featureGuides.ts`, `roadmapData.ts` — these describe the data model and reference the original wording on purpose.
- Email templates / PDFs — handled separately by the template merge registry pass.

## Rollback

`git revert` of this phase reverts the label sweep without database impact. No SQL migration in this phase.

## Open items

- Future tenant-driven re-labeling could move the strings into `tenant_feature_flags.config` and let `TERMS` resolve at runtime. Out of scope for 1D.
- A broader sweep of `src/lib/docs/*` should happen during the next documentation-center refresh.
