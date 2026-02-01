
# Consumer Defense Enrollment Wizard Architecture

## Overview

Based on the provided intake process documents, the current simple "Lead Conversion Wizard" needs to be replaced with a comprehensive, multi-step **Enrollment Wizard** that mirrors the actual sales workflow at Guardian Litigation Group. The wizard will guide sales reps through the complete intake-to-enrollment process.

---

## Current State Analysis

### Existing Lead Flow
- **Lead statuses**: new, contacted, qualified, converted, lost
- **LeadConversionWizard**: Simple 4-step process (Client Info, Services, Liabilities, Confirm)
- **Missing**: Eligibility verification, credit analysis, debt selection, plan building, banking/disclosure, QC process

### Data Gaps in Lead Table
Current leads table is missing critical intake fields:
- Employment information (employer, job title, income)
- State of residence (for prohibited state check)
- Hardship reason
- Security clearance flag
- Banking information (for creditor conflict check)
- SSN (last 4 for verification)
- DOB

---

## Proposed Architecture

### Rename Service Type
- "Debt Resolution" becomes **"Consumer Defense"** as the primary service type
- All client services for debt settlement work will be categorized as Consumer Defense regardless of litigation status

### New Lead Statuses
Expand lead status to reflect the actual sales pipeline stages:

| Status | Description |
|--------|-------------|
| `new` | Initial lead capture |
| `contacted` | First contact made |
| `intake` | Formal intake in progress |
| `credit_review` | Credit report pulled, reviewing debts |
| `plan_selection` | Building quote, selecting program |
| `qc_pending` | Awaiting QC bot verification |
| `docs_pending` | Contract sent, awaiting signature |
| `qualified` | Fully qualified, ready for enrollment |
| `converted` | Successfully enrolled |
| `lost` | Did not convert |

### New Enrollment Wizard Steps

The wizard will have 8 progressive screens:

```text
Step 1: Intake & Eligibility
   |
Step 2: Client Information
   |
Step 3: Employment & Hardship
   |
Step 4: Credit Authorization
   |
Step 5: Debt Selection
   |
Step 6: Plan Selection
   |
Step 7: Banking & Disclosure
   |
Step 8: Review & Submit
```

---

## Step-by-Step Design

### Step 1: Intake & Eligibility
**Purpose**: Verify client qualifies for the program

**Fields collected**:
- State of residence (with prohibited state check: MN, DE, WI)
- In active bankruptcy? (Yes = disqualify)
- Any federal accounts? (Yes = disqualify)
- Secured credit issues resolved? (No = disqualify)
- Has security clearance? (flag for reporting)

**Validation**: Must pass eligibility to proceed

---

### Step 2: Client Information
**Purpose**: Capture full legal identity

**Fields collected**:
- Full legal name (first, middle, last)
- Date of birth
- Email
- Phone number(s) - with type selection
- Primary address
- SSN (last 4 digits for credit auth)
- TCPA consent checkbox

**Note**: SSN last 4 is stored encrypted for credit authorization

---

### Step 3: Employment & Hardship
**Purpose**: Document financial distress and income

**Fields collected**:
- Employment status (employed, unemployed, self-employed, retired, disabled)
- Current employer (if employed)
- Job title (if employed)
- Monthly income (approximate)
- Hardship reason (dropdown with options):
  - Job loss
  - Medical emergency
  - Divorce
  - Reduced income
  - Business failure
  - Other (with notes field)
- Hardship description (notes)

---

### Step 4: Credit Authorization
**Purpose**: Obtain verbal authorization for soft credit pull

**Display**: Script for sales rep to read:
> "I need to verify your identity before we pull your credit. Please state your full legal name and the last 4 digits of your Social Security Number."

**Fields collected**:
- Verbal authorization confirmed (checkbox)
- Verification code sent (future integration point)
- Verification code confirmed (future integration point)
- Authorization timestamp

**Note**: This step documents the required verbal consent

---

### Step 5: Debt Selection
**Purpose**: Review credit report and select debts for enrollment

**UI Components**:
- List of debts (manually entered or from future credit pull integration)
- For each debt:
  - Creditor name (searchable dropdown from creditors table)
  - Account type (credit card, medical, personal loan, etc.)
  - Original balance
  - Current balance (used for plan calculations)
  - Account number (last 4)
  - Enrolled checkbox

**Key Feature**: Differentiate between "Original Amount" (for detail) and "Current Debt Amount" (for plan calculations)

**Running totals displayed**:
- Total enrolled debt
- Number of enrolled accounts

---

### Step 6: Plan Selection
**Purpose**: Build quote and select program terms

**Plan Options Generated**:
Based on total enrolled debt, calculate multiple term options:

| Term | Monthly Draft | Total Cost |
|------|---------------|------------|
| 18 months | $X | $Y |
| 24 months | $X | $Y |
| 36 months | $X | $Y |
| 48 months | $X | $Y |

**Calculation Logic**:
```
Monthly Draft = (Total Enrolled Debt * 0.82) / Term Months
Minimum Draft = $350
```

**Plan Types** (pre-defined):
- **GLG 2.0 Standard**: 25% settlement fee, estimated 55% settlement rate
- **GLG Adjustable**: Higher settlement % estimate (55-70%) for aggressive creditors
- **GLG Exception**: Extended terms (54 months), requires management approval

**Fields collected**:
- Selected term (months)
- Selected monthly draft amount
- First payment date (date picker, must be within 30 days)
- Payment frequency (monthly, semi-monthly, bi-weekly)
- Plan type selection

---

### Step 7: Banking & Disclosure
**Purpose**: Capture payment details and provide disclosures

**Banking section**:
- Bank name (searchable)
- Routing number
- Account number
- Account type (checking/savings)

**Conflict check**: Warning if bank name matches any enrolled creditor

**Disclosures** (checkboxes with explanatory text):
- Credit score impact acknowledged
- Collection calls may continue
- Possible lawsuits explained
- Role of negotiations explained
- Program not guaranteed

---

### Step 8: Review & Submit
**Purpose**: Final review before enrollment

**Display summary**:
- Client information
- Employment details
- Enrolled debts with totals
- Selected plan with payment details
- All disclosure acknowledgments

**Actions**:
- "Save as Prospect" - Creates client_service with status `prospect`
- "Send to QC" - Updates lead status to `qc_pending`
- "Complete Enrollment" - Creates full enrollment

---

## Database Schema Changes

### Updates to `leads` Table
Add new columns:
- `state` (text) - State of residence
- `in_bankruptcy` (boolean)
- `has_federal_accounts` (boolean)
- `secured_credit_resolved` (boolean)
- `has_security_clearance` (boolean)
- `employment_status` (enum)
- `employer_name` (text)
- `job_title` (text)
- `monthly_income` (numeric)
- `hardship_reason` (enum)
- `hardship_notes` (text)
- `ssn_last4_encrypted` (text)
- `credit_auth_given` (boolean)
- `credit_auth_date` (timestamp)
- `wizard_step` (integer) - Track progress
- `wizard_data` (jsonb) - Store in-progress wizard data

### New Enum: `lead_status`
Update to include new statuses:
`new`, `contacted`, `intake`, `credit_review`, `plan_selection`, `qc_pending`, `docs_pending`, `qualified`, `converted`, `lost`

### New Enum: `employment_status`
`employed`, `unemployed`, `self_employed`, `retired`, `disabled`

### New Enum: `hardship_reason`
`job_loss`, `medical_emergency`, `divorce`, `reduced_income`, `business_failure`, `other`

### Updates to `client_services` Table
Add/update:
- Rename `program_type` to use `consumer_defense` instead of `debt_settlement`
- Add `plan_type` (enum: `glg_standard`, `glg_adjustable`, `glg_exception`)
- Add `estimated_settlement_percentage` (numeric)
- Add `first_draft_date` (date)
- Add `requires_management_approval` (boolean)

### New Table: `lead_banking` (or add to clients later)
For storing banking info during intake:
- `lead_id` (FK)
- `bank_name` (text)
- `routing_number_encrypted` (text)
- `account_number_encrypted` (text)
- `account_type` (enum: checking, savings)

### New Table: `lead_disclosures`
Track which disclosures were acknowledged:
- `lead_id` (FK)
- `disclosure_type` (text)
- `acknowledged_at` (timestamp)

### New Table: `lead_debts`
Store debt selections during wizard (before becoming liabilities):
- `id` (uuid)
- `lead_id` (FK)
- `creditor_id` (FK to creditors, nullable)
- `creditor_name` (text) - For manual entry
- `account_type` (liability_type enum)
- `original_balance` (numeric)
- `current_balance` (numeric)
- `account_number_last4` (text)
- `is_enrolled` (boolean)
- `created_at` (timestamp)

---

## UI Component Structure

### New Components

```
src/components/enrollment/
  EnrollmentWizard.tsx        # Main wizard container
  steps/
    IntakeEligibilityStep.tsx # Step 1
    ClientInfoStep.tsx        # Step 2
    EmploymentHardshipStep.tsx # Step 3
    CreditAuthStep.tsx        # Step 4
    DebtSelectionStep.tsx     # Step 5
    PlanSelectionStep.tsx     # Step 6
    BankingDisclosureStep.tsx # Step 7
    ReviewSubmitStep.tsx      # Step 8
  PlanCalculator.tsx          # Plan option generator
  DebtEntryRow.tsx            # Individual debt form row
  DisclosureCheckbox.tsx      # Disclosure with expand
```

### State Management
Use a combination of:
- React Hook Form for each step's validation
- Context or prop drilling for cross-step data
- Auto-save to `leads.wizard_data` JSONB field on step completion

---

## Files to be Modified/Created

| File | Action | Purpose |
|------|--------|---------|
| Migration | Create | Add new columns to leads, update enums |
| `src/components/enrollment/EnrollmentWizard.tsx` | Create | New 8-step wizard |
| `src/components/enrollment/steps/*.tsx` | Create | Individual step components |
| `src/hooks/useEnrollmentWizard.ts` | Create | Wizard state management |
| `src/hooks/useLeadDebts.ts` | Create | CRUD for lead_debts table |
| `src/pages/Leads.tsx` | Modify | Launch new wizard instead of old one |
| `LeadConversionWizard.tsx` | Delete | Replace with new EnrollmentWizard |

---

## Phase 1 Implementation (Core Wizard)

For initial implementation, focus on:
1. Database schema updates (leads table, new enums)
2. Steps 1-3 (Intake, Client Info, Employment)
3. Step 5 (Debt Selection - manual entry)
4. Step 6 (Plan Selection - calculation logic)
5. Step 8 (Review & basic submit)

Steps 4 and 7 can be simplified initially (credit auth = checkbox, banking = skip for now).

---

## Summary

This architecture transforms the simple 4-step conversion into a comprehensive 8-step enrollment wizard that:

1. Matches the actual Guardian Litigation Group intake process
2. Captures all required eligibility and qualification data
3. Provides plan options with automatic draft calculations
4. Documents consent and disclosures properly
5. Supports progressive saving (don't lose work)
6. Prepares for future credit bureau integration
