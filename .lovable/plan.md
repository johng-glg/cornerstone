
# Plan: Lead Document Uploads, Servicing Creditor, and Budget Analysis Tool

This plan covers three feature requests ranked #2, #4, and #5 from the prioritized backlog.

---

## Feature 1: Lead Document Uploads

Sales reps need to attach documents (summons, credit reports, statements) directly to lead records during intake.

### What gets built
- A new "Documents" tab on the Lead Detail Sheet where reps can upload and view files
- A new `lead_documents` database table (mirrors the existing `client_documents` pattern)
- Files stored in a new `lead-documents` storage bucket
- Document types tailored to intake: Summons, Credit Report, Statement, Pay Stub, ID, and Other
- When a lead converts to a client, documents remain accessible via the lead reference

### User experience
- Open a lead, click the new "Documents" tab (added as a 5th tab alongside Details, Notes, Tasks, Activity)
- Click "Add Document", pick a file, select a type (e.g., "Summons"), optionally add a title/notes
- See a list of uploaded documents with download/view links and who uploaded them

---

## Feature 2: Servicing Creditor Field

Negotiators need to track which creditor they are actively negotiating with, separate from the original and current creditor.

### What gets built
- A new nullable `servicing_creditor_id` column on the `liabilities` table (FK to `creditors`)
- Updated Liability Form to include a "Servicing Creditor" dropdown (same creditor list as Original/Current)
- Updated Liability Detail Sheet to display the servicing creditor alongside the existing creditor fields
- Updated query joins to fetch the servicing creditor name

### User experience
- When editing a liability, a new "Servicing Creditor" dropdown appears in the Creditors section
- The Liability Detail Sheet shows it in the Creditors card as a third entry
- This is the creditor the negotiator is actively working with for settlement discussions

---

## Feature 3: Budget Analysis Tool

Sales reps need to document client income, expenses, and calculate an estimated available budget during intake. This helps determine program eligibility and draft amounts.

### What gets built
- A new `lead_budgets` table storing income/expense line items per lead
- A "Budget" tab on the Lead Detail Sheet with an income/expense form and summary
- Income categories: Employment, Self-Employment, Spouse/Partner, Social Security, Other
- Expense categories: Rent/Mortgage, Utilities, Food, Transportation, Insurance, Childcare, Minimum Payments, Other
- Auto-calculated fields: total income, total expenses, discretionary income (the difference)
- Visual summary showing whether the lead can afford a program draft

### User experience
- Open a lead, click the "Budget" tab
- Enter income sources and monthly amounts
- Enter fixed expense items and amounts
- See a summary card showing Total Income, Total Expenses, and Discretionary Income
- A visual indicator (green/yellow/red) shows affordability at a glance

---

## Technical Details

### Database Changes

**1. `lead_documents` table:**
```text
id              UUID PK default gen_random_uuid()
lead_id         UUID NOT NULL FK -> leads(id) ON DELETE CASCADE
document_type   TEXT NOT NULL
title           TEXT NOT NULL
file_url        TEXT NOT NULL
notes           TEXT nullable
uploaded_by     UUID nullable FK -> staff(id)
created_at      TIMESTAMPTZ default now()
```
- RLS: staff in same company can read/write (matching leads RLS pattern)

**2. `lead-documents` storage bucket:**
- Public bucket (matching existing pattern for litigation-documents/client-documents)
- RLS policies for authenticated uploads

**3. `servicing_creditor_id` column on `liabilities`:**
```text
ALTER TABLE liabilities ADD COLUMN servicing_creditor_id UUID REFERENCES creditors(id);
```

**4. `lead_budgets` table:**
```text
id              UUID PK default gen_random_uuid()
lead_id         UUID NOT NULL FK -> leads(id) ON DELETE CASCADE
category        TEXT NOT NULL (e.g., 'income_employment', 'expense_rent')
label           TEXT NOT NULL (user-friendly name)
amount          NUMERIC NOT NULL default 0
created_at      TIMESTAMPTZ default now()
updated_at      TIMESTAMPTZ default now()
```
- RLS: staff in same company can read/write

### Frontend Changes

**Lead Document Uploads:**
- New hook: `src/hooks/useLeadDocuments.ts` (follows `useClientDocuments` pattern)
- New component: `src/components/leads/LeadDocumentFormDialog.tsx`
- New component: `src/components/leads/LeadDocumentsTab.tsx`
- Modified: `src/components/leads/LeadDetailSheet.tsx` (add Documents tab)

**Servicing Creditor:**
- Modified: `src/hooks/useLiabilities.ts` (add join for servicing_creditor)
- Modified: `src/components/liabilities/LiabilityFormDialog.tsx` (add dropdown)
- Modified: `src/components/liabilities/LiabilityDetailSheet.tsx` (display field)

**Budget Analysis:**
- New hook: `src/hooks/useLeadBudget.ts`
- New component: `src/components/leads/BudgetAnalysisTab.tsx`
- Modified: `src/components/leads/LeadDetailSheet.tsx` (add Budget tab)

### Tab Layout Update
The Lead Detail Sheet tabs change from 4 to 6:
```text
Details | Notes | Tasks | Documents | Budget | Activity
```
