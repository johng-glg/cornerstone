

# Eligibility Review Area Enhancement

## What's Being Added

The Eligibility Reviews page and its detail sheet will be upgraded from a simple approve/decline queue into a full "client file" view for the ER team, with pipeline tracking for pre-enrollment paperwork.

## Changes Overview

### 1. Eligibility Review Pipeline Stages
Add a new `checklist` JSONB column to `eligibility_reviews` to track pre-enrollment paperwork milestones:
- Agreement Sent
- Agreement Signed
- Paperwork Received
- Documents Verified

A visual step/progress indicator will appear at the top of each review's detail view so the ER team can see exactly where a lead is in the process.

### 2. Expanded Detail Sheet with Tabs
The current `EligibilityReviewDetailSheet` will be restructured into a tabbed layout with:

- **Overview Tab**: Personal information (name, phone, email, state, DOB, employment, income), lead score, interest type, estimated debt, and the pipeline progress indicator.
- **Debts Tab**: Pulls from the `lead_debts` table to show all creditors enrolled during intake -- creditor name, account type, original/current balance, and enrollment status.
- **Documents Tab**: Reuses the existing `LeadDocumentsTab` component so the ER team can view, upload, and manage lead documents (summons, credit reports, statements, pay stubs, IDs) directly from the review.
- **Flags / Decision Tab**: The current underwriting flags display and approve/decline form, kept as-is.

### 3. Richer Table Columns on the Queue Page
The main `EligibilityReviewsPage` table will add columns for:
- Estimated debt amount
- Number of debts (from lead_debts count)
- Pipeline progress (e.g., "2/4 steps")

### 4. Lead Link
Each review will include a button/link to open the full Lead Detail Sheet for deeper investigation, so the ER team can always drill into the complete lead record.

---

## Technical Details

### Database Migration
```sql
ALTER TABLE eligibility_reviews
ADD COLUMN checklist jsonb DEFAULT '[]'::jsonb;
```
The checklist will store an array of objects like:
```json
[
  {"step": "agreement_sent", "completed": false, "completed_at": null, "completed_by": null},
  {"step": "agreement_signed", "completed": false, "completed_at": null, "completed_by": null},
  {"step": "paperwork_received", "completed": false, "completed_at": null, "completed_by": null},
  {"step": "documents_verified", "completed": false, "completed_at": null, "completed_by": null}
]
```

### Hook Changes (`useEligibilityReviews.ts`)
- Expand the `lead` join to include: `state`, `date_of_birth`, `employment_status`, `employer_name`, `monthly_income`, `interest_type`, `number_of_debts`, `has_active_lawsuit`.
- Add a new `useLeadDebtsForReview(leadId)` query or reuse existing lead_debts query to fetch debts for display.
- Add a `useUpdateReviewChecklist` mutation for toggling checklist items.

### New Components
- `EligibilityPipelineProgress` -- visual step indicator (checkmarks/circles) for the 4 checklist stages.
- `EligibilityDebtsTab` -- table showing lead_debts for the review's lead.

### Modified Components
- `EligibilityReviewDetailSheet` -- restructured with Tabs (Overview, Debts, Documents, Decision).
- `EligibilityReviewsPage` -- additional table columns for debt amount and pipeline progress.

### Existing Reuse
- `LeadDocumentsTab` will be embedded directly in the detail sheet's Documents tab (already accepts a `leadId` prop).
- Lead Detail Sheet link will use the existing `LeadDetailSheet` component.

