

# Recurring Payment Scheduling Implementation Plan

## Overview

Build an automated payment scheduling system that generates draft transactions (client payments) with processor fees for the full program term. This system will use the existing `transactions` table and integrate with the service enrollment flow and service management UI.

---

## Business Rules (From Context)

| Rule | Value |
|------|-------|
| **Draft Calculation** | `(Total Enrolled Debt * 0.82) / Term Months` |
| **Minimum Draft** | $350 (system-enforced) |
| **Processor Fee** | $10 per draft, scheduled 1 day after draft |
| **Term Range** | 18-48 months standard, up to 54 for GLG Exception |
| **Payment Frequencies** | Monthly, Semi-Monthly (2x/month), Bi-Weekly |
| **Contingency Fee** | 27% on settled amount (collected at settlement time) |

---

## Architecture

```text
+---------------------------+
|    Service Activation     |  (Enrollment wizard or status change to 'active')
+---------------------------+
            |
            v
+---------------------------+
|   Schedule Generator      |  (Creates draft + fee transactions for full term)
+---------------------------+
            |
            v
+---------------------------+
|   Transactions Table      |  (Stores all scheduled, pending, cleared, cancelled)
+---------------------------+
            |
            v
+---------------------------+
|   Payment Schedule UI     |  (View/modify upcoming payments)
+---------------------------+
```

---

## Database Changes

### New Table: `payment_schedules`

Master record tracking the payment schedule configuration for each service. Separates schedule metadata from individual transactions.

```text
payment_schedules
+-------------------------+---------------+-------------------------------------------+
| Column                  | Type          | Description                               |
+-------------------------+---------------+-------------------------------------------+
| id                      | uuid (PK)     | Primary key                               |
| client_service_id       | uuid (FK)     | Links to client_services                  |
| frequency               | enum          | monthly, semi_monthly, bi_weekly          |
| draft_amount            | numeric       | Amount per draft                          |
| processor_fee_amount    | numeric       | Fee per draft (default $10)               |
| first_draft_date        | date          | First scheduled draft date                |
| total_drafts            | integer       | Total number of drafts in schedule        |
| drafts_generated        | integer       | Number of transactions created            |
| last_generated_date     | date          | Last draft date generated                 |
| status                  | enum          | active, paused, completed, cancelled      |
| created_at              | timestamptz   | Creation timestamp                        |
| updated_at              | timestamptz   | Last modification                         |
+-------------------------+---------------+-------------------------------------------+
```

### New Enum: `payment_frequency_enum`

```sql
CREATE TYPE payment_frequency_enum AS ENUM ('monthly', 'semi_monthly', 'bi_weekly');
```

### New Enum: `schedule_status_enum`

```sql
CREATE TYPE schedule_status_enum AS ENUM ('active', 'paused', 'completed', 'cancelled');
```

### Transactions Table Updates

The existing `transactions` table already has the necessary fields. No schema changes needed:
- `scheduled_date` - When the transaction should process
- `sequence_number` - Draft number (1, 2, 3, ...)
- `description` - Human-readable description
- `parent_transaction_id` - Links processor fees to their draft

---

## Payment Schedule Generation Logic

### Frequency Calculations

| Frequency | Interval | Drafts per Year | Total Drafts Formula |
|-----------|----------|-----------------|----------------------|
| Monthly | 1 month | 12 | `term_months` |
| Semi-Monthly | ~15 days | 24 | `term_months * 2` |
| Bi-Weekly | 14 days | 26 | `Math.ceil(term_months * 26 / 12)` |

### Generator Algorithm

```typescript
function generateSchedule(params: {
  clientServiceId: string;
  firstDraftDate: Date;
  frequency: PaymentFrequency;
  termMonths: number;
  draftAmount: number;
  processorFeeAmount: number;
}): Transaction[] {
  const transactions: Transaction[] = [];
  const totalDrafts = calculateTotalDrafts(frequency, termMonths);
  
  for (let i = 0; i < totalDrafts; i++) {
    const draftDate = calculateDraftDate(firstDraftDate, frequency, i);
    
    // Create draft transaction
    transactions.push({
      client_service_id: clientServiceId,
      transaction_type: 'draft',
      amount: draftAmount,
      scheduled_date: draftDate,
      status: 'open',
      sequence_number: i + 1,
      description: `Draft ${i + 1} of ${totalDrafts}`,
    });
    
    // Create processor fee (1 day after draft)
    transactions.push({
      client_service_id: clientServiceId,
      transaction_type: 'processor_fee',
      amount: processorFeeAmount,
      scheduled_date: addDays(draftDate, 1),
      status: 'open',
      sequence_number: i + 1,
      description: `Processor fee for draft ${i + 1}`,
      parent_transaction_id: draftId, // Set after draft creation
    });
  }
  
  return transactions;
}
```

---

## UI Components

### 1. Payment Schedule Panel

**Location**: Service Detail Sheet → Payments section (new or enhanced)

**Features**:
- Schedule summary card showing frequency, draft amount, progress
- List of upcoming drafts (next 6-12)
- Full schedule modal/sheet with all transactions
- Status indicators (on-time, upcoming, past due, cleared)

### 2. Generate Schedule Button/Action

**Trigger Points**:
- Enrollment Wizard completion (auto-generate)
- Service activation (when status changes to 'active')
- Manual "Generate Schedule" button for pending services

### 3. Schedule Modification Dialog

**Features**:
- Change frequency (recalculates future drafts)
- Change draft amount
- Skip individual drafts (mark as cancelled)
- Reschedule individual drafts
- Pause/resume schedule

### 4. Payment Schedule Calendar View

**Location**: Client detail → Payments tab enhancement

**Features**:
- Monthly calendar view showing draft dates
- Color coding by status
- Click to view/edit individual transaction

---

## Hooks

### `usePaymentSchedule`

```typescript
// Fetch the payment schedule for a service
function usePaymentSchedule(clientServiceId: string | undefined);

// Create a new payment schedule and generate transactions
function useCreatePaymentSchedule();

// Update schedule configuration
function useUpdatePaymentSchedule();

// Pause/resume schedule
function usePausePaymentSchedule();

// Cancel remaining schedule
function useCancelPaymentSchedule();
```

### `useScheduleGenerator`

```typescript
// Generate transactions from schedule configuration
function useScheduleGenerator();

// Regenerate future transactions (after configuration change)
function useRegenerateSchedule();
```

---

## Integration Points

### 1. Enrollment Wizard

After service creation (step 7 in current flow), automatically:
1. Create `payment_schedule` record
2. Generate all draft + processor fee transactions
3. Update service with first_draft_date confirmed

### 2. Service Status Change

When service transitions to `active`:
- If no payment schedule exists, prompt to create one
- If schedule exists but no transactions, generate them

### 3. Escrow Projection

The existing `useEscrowProjection` hook already consumes scheduled transactions. No changes needed - it will automatically include the generated drafts.

### 4. Payment Status

When transactions are processed:
- Update service `payment_status` based on cleared/failed drafts
- Track consecutive cleared drafts for "current" status
- Flag missed drafts for "delinquent" status

---

## Edge Functions

### `generate-payment-schedule` (Optional)

Server-side schedule generation for:
- Batch processing during enrollment
- Schedule regeneration after modifications
- Ensuring consistent transaction creation

**Note**: Initial implementation can be client-side with `useCreateTransactionsBatch`. Edge function adds reliability for large schedules.

---

## Files to Create

### Database Migration
- Create `payment_schedules` table
- Create `payment_frequency_enum` and `schedule_status_enum`
- Add RLS policies (company-scoped via client_services)
- Add trigger to update `updated_at`

### Types
- `src/types/paymentSchedule.ts` - TypeScript type definitions

### Hooks
- `src/hooks/usePaymentSchedule.ts` - CRUD + generator logic

### Components
- `src/components/payments/PaymentSchedulePanel.tsx` - Summary display
- `src/components/payments/PaymentScheduleDialog.tsx` - Create/edit schedule
- `src/components/payments/UpcomingDraftsList.tsx` - Next N drafts list
- `src/components/payments/ScheduleModificationDialog.tsx` - Modify schedule
- `src/components/payments/DraftCalendarView.tsx` - Calendar visualization (optional)

### Updates to Existing Files
- `src/components/enrollment/EnrollmentWizard.tsx` - Generate schedule on completion
- `src/components/services/ServiceDetailSheet.tsx` - Add schedule panel
- `src/components/clients/detail/ClientPaymentsTab.tsx` - Integrate schedule view

---

## Implementation Phases

### Phase 1: Foundation (Database + Types)
1. Create `payment_schedules` table and enums
2. Add RLS policies
3. Create TypeScript types
4. Create schedule generation utility functions

### Phase 2: Generator Logic
1. Implement schedule calculation functions
2. Create `usePaymentSchedule` hook with CRUD
3. Create `useScheduleGenerator` hook
4. Test transaction batch creation

### Phase 3: Enrollment Integration
1. Update EnrollmentWizard to generate schedule on completion
2. Add schedule summary to ReviewSubmitStep
3. Verify escrow projection includes generated drafts

### Phase 4: Service Detail UI
1. Build PaymentSchedulePanel component
2. Build UpcomingDraftsList component
3. Integrate into ServiceDetailSheet
4. Add generation button for services without schedules

### Phase 5: Modification Features
1. Build ScheduleModificationDialog
2. Implement frequency change with regeneration
3. Implement skip/reschedule individual drafts
4. Add pause/resume functionality

### Phase 6: Polish
1. Add calendar view (optional)
2. Add bulk operations (skip multiple drafts)
3. Update documentation/roadmap
4. Testing and edge cases

---

## Frequency Date Calculations

### Monthly
```typescript
addMonths(firstDraftDate, draftIndex)
```

### Semi-Monthly (1st and 15th style)
```typescript
// Draft on same day each half-month
const baseMonth = addMonths(firstDraftDate, Math.floor(draftIndex / 2));
if (draftIndex % 2 === 0) {
  return startOfMonth(baseMonth).setDate(firstDraftDate.getDate());
} else {
  return startOfMonth(baseMonth).setDate(15 + (firstDraftDate.getDate() - 1));
}
```

### Bi-Weekly
```typescript
addWeeks(firstDraftDate, draftIndex * 2)
```

---

## Schedule Status Logic

| Status | Description | Triggers |
|--------|-------------|----------|
| `active` | Normal operation | Default on creation |
| `paused` | Temporarily stopped | Manual action, payment issues |
| `completed` | All drafts processed | Last draft cleared |
| `cancelled` | Terminated early | Service dropped, manual action |

---

## Validation Rules

1. **First draft date**: Must be in the future, within 30 days of enrollment
2. **Draft amount**: Must be >= $350 (minimum)
3. **Term months**: 18-48 standard, up to 54 for GLG Exception plans
4. **No duplicate schedules**: One active schedule per service

---

## Sample Generated Schedule

For a 24-month program starting March 15, 2026 with monthly frequency:

| Seq | Type | Amount | Scheduled Date | Description |
|-----|------|--------|----------------|-------------|
| 1 | draft | $450.00 | 2026-03-15 | Draft 1 of 24 |
| 1 | processor_fee | $10.00 | 2026-03-16 | Processor fee for draft 1 |
| 2 | draft | $450.00 | 2026-04-15 | Draft 2 of 24 |
| 2 | processor_fee | $10.00 | 2026-04-16 | Processor fee for draft 2 |
| ... | ... | ... | ... | ... |
| 24 | draft | $450.00 | 2028-02-15 | Draft 24 of 24 |
| 24 | processor_fee | $10.00 | 2028-02-16 | Processor fee for draft 24 |

**Total transactions created**: 48 (24 drafts + 24 fees)

---

## Success Criteria

1. Services can have automatically generated payment schedules
2. All draft + processor fee transactions are created for the full term
3. Schedules support monthly, semi-monthly, and bi-weekly frequencies
4. Users can view upcoming drafts in service detail
5. Schedules integrate with existing escrow projection
6. Individual drafts can be skipped or rescheduled
7. Schedule can be paused/resumed
8. Enrollment wizard auto-generates schedule on completion

