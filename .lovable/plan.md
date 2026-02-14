# Plan: Eligibility Review Pipeline

## Overview

Add an eligibility review process that sits between lead qualification and conversion. When a lead's file is ready, it gets "submitted for underwriting." For now, the underwriting service is simulated -- every submission is automatically flagged for manual review by the eligibility department.

---

## How It Works

1. A sales rep clicks **"Submit for Review"** on a qualified lead
2. The system creates an eligibility review record and sets the lead status to a new `eligibility_review` stage
3. A simulated underwriting check runs (via edge function) and flags the file for manual review
4. The eligibility team sees a queue of pending reviews on a new **Eligibility Reviews** tab/page
5. A reviewer can **Approve** or **Decline** the review with notes
6. On approval, the lead becomes eligible for conversion (the "Convert" button unlocked)
7. On decline, the lead is flagged with a reason and can be resubmitted after corrections

---

## User Experience

### For Sales Reps

- On the Lead Detail Sheet, a new **"Submit for Review"** button appears when the lead is in `qualified` status (or later, once documents/budget are filled)
- After submission, the lead moves to `eligibility_review` status and shows a review status card (Pending / Approved / Declined)
- The "Convert" button is blocked until the review is approved

### For Eligibility Reviewers

- A new **Eligibility Reviews** page (accessible from the sidebar) shows all pending reviews in a table
- Each row shows the lead name, submission date, flags raised by underwriting, and assigned reviewer
- Clicking a review opens a detail panel with the lead summary, documents, budget, and underwriting flags
- Reviewer can approve or decline with notes

---

## Database Changes

### 1. New `lead_status` enum value

```text
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'eligibility_review';
```

### 2. New `eligibility_reviews` table

```text
id                  UUID PK default gen_random_uuid()
lead_id             UUID NOT NULL FK -> leads(id) ON DELETE CASCADE
status              TEXT NOT NULL DEFAULT 'pending'  -- pending, approved, declined
submitted_by        UUID FK -> staff(id)
reviewed_by         UUID FK -> staff(id)
submitted_at        TIMESTAMPTZ DEFAULT now()
reviewed_at         TIMESTAMPTZ
review_notes        TEXT
decline_reason      TEXT
flags               JSONB DEFAULT '[]'   -- array of flag objects from underwriting
created_at          TIMESTAMPTZ DEFAULT now()
updated_at          TIMESTAMPTZ DEFAULT now()
```

- RLS: staff in same company can read/write (matching leads pattern)

### 3. New `eligibility_review_flags` (stored as JSONB array in `flags` column)

Each flag object:

```text
{
  "code": "high_debt_ratio",
  "label": "High Debt-to-Income Ratio",
  "severity": "warning",    -- info | warning | critical
  "details": "Debt exceeds 50% of monthly income"
}
```

---

## Edge Function: `simulate-underwriting`

A new edge function that accepts a lead ID, pulls the lead data (debts, budget, documents, eligibility fields), and returns a set of flags. For now, it always returns at least one flag to force manual review.

Simulated flag logic:

- Always flag: "Manual Review Required" (ensures everything goes to eligibility team)
- If estimated debt > $50,000: flag "High Debt Amount"
- If no documents uploaded: flag "Missing Documentation"
- If budget discretionary income < $200: flag "Low Discretionary Income"
- If lead has active lawsuit: flag "Active Lawsuit"

---

## Frontend Changes

### New Files

- `src/hooks/useEligibilityReviews.ts` -- CRUD hook for eligibility_reviews table
- `src/components/leads/EligibilityReviewCard.tsx` -- status card shown on Lead Detail Sheet
- `src/components/leads/SubmitForReviewDialog.tsx` -- confirmation dialog before submitting
- `src/pages/EligibilityReviews.tsx` -- queue page for eligibility team
- `src/components/eligibility/EligibilityReviewDetailSheet.tsx` -- review detail panel with approve/decline actions
- `src/components/eligibility/ReviewFlagsBadges.tsx` -- renders flag badges by severity

### Modified Files

- `src/components/leads/LeadDetailSheet.tsx` -- add "Submit for Review" button and EligibilityReviewCard; block "Convert" button until review is approved
- `src/components/leads/LeadKanban.tsx` -- add `eligibility_review` column to the Kanban board
- `src/components/layout/AppSidebar.tsx` -- add "Eligibility Reviews" link in sidebar
- `src/App.tsx` -- add route for `/eligibility-reviews`
- `src/lib/docs/roadmapData.ts` -- document the feature

### Lead Detail Sheet Changes

- When lead status is `eligibility_review`, show the EligibilityReviewCard with current review status, flags, and reviewer info
- The "Convert" button only appears when the latest review has `status = 'approved'`
- If declined, show decline reason and a "Resubmit for Review" button

### Kanban Board Changes

- Add `eligibility_review` as a new column between `qualified` and `converted`
- Color: orange/amber to indicate "under review"

---

## Flow Summary

```text
Lead Created (new)
    |
    v
Contacted -> Qualified
    |
    v
[Sales Rep clicks "Submit for Review"]
    |
    v
Edge function runs simulated underwriting
    |
    v
eligibility_review (flags stored in review record)
    |
    v
[Eligibility team reviews in queue]
    |
   / \
  v   v
Approved  Declined
  |         |
  v         v
Convert   Fix issues & resubmit
```