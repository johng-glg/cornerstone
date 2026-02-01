
# Settlement Offer Builder and Transaction Structure Enhancement

## Overview

This plan implements a comprehensive financial workflow for your debt settlement business, including:
1. Enhanced transaction categorization (drafts, processor fees, settlement payments, contingency fees)
2. Updated transaction status workflow (Open, Pending, Cleared, Cancelled)
3. A sophisticated Settlement Offer Builder that analyzes escrow projections and suggests viable settlement terms

---

## Understanding Your Business Model

Based on your description:

| Component | Details |
|-----------|---------|
| **Monthly Draft** | 1 draft per month for the program term (e.g., 36 drafts for a 36-month program) |
| **Processor Fee** | $10 per month, collected with each draft |
| **Contingency Fee** | 27% of settlement amount, becomes AR when debt is settled |
| **Fee Collection** | Split evenly across settlement term OR collected in full (after first creditor payment) |
| **Settlement Payments** | Paid to creditors per accepted settlement terms |

---

## Phase 1: Database Schema Updates

### 1.1 Update Transactions Table

Add new columns to support the transaction workflow:

```text
New Columns:
- scheduled_date: date (when the transaction is scheduled to process)
- settlement_id: uuid (links fee/settlement payments to specific settlements) 
- liability_id: uuid (links to the specific liability for settlement payments)
- parent_transaction_id: uuid (for linking fees to their associated draft)
- description: text (human-readable description)
- sequence_number: integer (for ordering within a series)
```

### 1.2 Update Transaction Enums

**Transaction Types:**
- `draft` - Monthly client draft
- `processor_fee` - $10 monthly processor fee
- `settlement_payment` - Payment to creditor
- `contingency_fee` - 27% fee payment from client

**Transaction Statuses (replacing current):**
- `open` - Scheduled for future
- `pending` - In process
- `cleared` - Successfully completed
- `cancelled` - Cancelled

### 1.3 Add Settlement Schedule Details

Enhance the `settlements` table:

```text
New Columns:
- first_payment_date: date
- payment_schedule: jsonb (detailed payment schedule)
- fee_collection_method: text ('split' | 'lump_sum')
- fee_start_offset_months: integer (months after first settlement payment)
```

---

## Phase 2: Service Enrollment Transaction Generation

### 2.1 Create Transaction Generator Logic

When a client enrolls, automatically generate scheduled transactions:

```text
For a 36-month program at $450/month:

Month 1:  Draft $450 (open) + Processor Fee $10 (open)
Month 2:  Draft $450 (open) + Processor Fee $10 (open)
...
Month 36: Draft $450 (open) + Processor Fee $10 (open)

Total: 72 transactions created at enrollment
```

### 2.2 Escrow Balance Projection

Create a utility to project escrow balance over time:

```text
Escrow projection factors:
+ Cleared drafts (inflow)
- Processor fees (outflow)
- Settlement payments (outflow)
- Contingency fees (outflow)
= Projected escrow at any point
```

---

## Phase 3: Settlement Offer Builder

### 3.1 New Component: SettlementOfferBuilder

A modal/dialog that opens when creating a settlement offer, showing:

```text
+------------------------------------------------------------------+
| Settlement Offer Builder                                    [X]  |
+------------------------------------------------------------------+
|                                                                   |
| CREDITOR: Capital One                                            |
| Current Balance: $14,200                                         |
| Recommended Settlement: 45-55% ($6,390 - $7,810)                |
|                                                                   |
+------------------------------------------------------------------+
|                                                                   |
| OFFER PARAMETERS                                                 |
| ┌──────────────────────────────────────────────────────────────┐|
| │ Settlement Amount: [________] (50% = $7,100)                 │|
| │ Number of Payments: [6]                                       │|
| │ First Payment Date: [Mar 15, 2026]                           │|
| │ Payment per Month: $1,183.33                                  │|
| └──────────────────────────────────────────────────────────────┘|
|                                                                   |
| CONTINGENCY FEE (27%)                                            |
| Fee Amount: $1,917.00                                            |
| Collection: [Split across 6 months] / [Lump sum after 1st pmt]  |
|                                                                   |
+------------------------------------------------------------------+
|                                                                   |
| ESCROW PROJECTION                                                |
| ┌──────────────────────────────────────────────────────────────┐|
| │ Month     | Escrow In | Settlement | Fees | Balance          │|
| │───────────+───────────+────────────+──────+──────────────────│|
| │ Feb 2026  | $450      | -          | $10  | $2,340           │|
| │ Mar 2026  | $450      | $1,183     | $330 | $1,277  WARNING  │|
| │ Apr 2026  | $450      | $1,183     | $330 | $214    DANGER   │|
| │ May 2026  | $450      | $1,183     | $330 | -$849   NEGATIVE │|
| └──────────────────────────────────────────────────────────────┘|
|                                                                   |
| !!! THIS SETTLEMENT WOULD CAUSE NEGATIVE BALANCE !!!            |
|                                                                   |
+------------------------------------------------------------------+
|                                                                   |
| SUGGESTED ADJUSTMENTS                                            |
| ┌──────────────────────────────────────────────────────────────┐|
| │ Option A: Increase monthly draft by $75 for 6 months         │|
| │ Option B: Add one-time payment of $450 before settlement     │|
| │ Option C: Delay first payment by 2 months                    │|
| │ Option D: Extend settlement to 9 payments                    │|
| └──────────────────────────────────────────────────────────────┘|
|                                                                   |
| [Cancel]                               [Apply Adjustment] [Save] |
+------------------------------------------------------------------+
```

### 3.2 Projection Algorithm

```text
function projectEscrow(
  currentBalance: number,
  scheduledTransactions: Transaction[],
  proposedSettlement: {
    amount: number,
    payments: number,
    startDate: Date,
    feeMethod: 'split' | 'lump_sum'
  }
): ProjectionResult {

  1. Get all future "open" transactions (drafts, existing settlements)
  2. Add proposed settlement payments to timeline
  3. Add 27% fee payments based on collection method
  4. Walk through each month:
     - Add incoming drafts
     - Subtract outgoing payments
     - Track running balance
  5. Flag any month with negative balance
  6. If negative, calculate adjustment options

  return {
    projections: MonthlyProjection[],
    isViable: boolean,
    shortfall: number,
    suggestions: AdjustmentOption[]
  }
}
```

### 3.3 Suggestion Engine

When a settlement would cause negative balance, suggest:

| Suggestion Type | Calculation |
|-----------------|-------------|
| Increase Draft | `shortfall / remainingMonths` |
| One-Time Payment | `maxNegativeBalance + buffer` |
| Delay Start | Find month with sufficient balance |
| Extend Term | Recalculate with more payments |

---

## Phase 4: UI Components

### 4.1 New Files to Create

```text
src/components/liabilities/SettlementOfferBuilder.tsx
  - Main builder component with all inputs
  
src/components/liabilities/EscrowProjectionTable.tsx
  - Visual table showing month-by-month projections
  
src/components/liabilities/AdjustmentSuggestions.tsx
  - Cards showing possible adjustments

src/hooks/useEscrowProjection.ts
  - Logic for calculating projections

src/hooks/useTransactionSchedule.ts
  - Fetch and manage scheduled transactions
```

### 4.2 Modify Existing Components

**LiabilityDetailSheet.tsx:**
- Replace "New Offer" button with "Build Offer" button
- Opens SettlementOfferBuilder instead of simple form

**SettlementFormDialog.tsx:**
- Keep for quick edits, but deprecate for new offers
- SettlementOfferBuilder becomes primary creation flow

---

## Phase 5: Transaction Management Updates

### 5.1 Automatic Transaction Generation

When a settlement is accepted:

```text
1. Create settlement payment transactions:
   - Type: settlement_payment
   - Status: open
   - Scheduled dates based on payment plan

2. Create contingency fee transactions:
   - Type: contingency_fee  
   - Amount: settlement_amount * 0.27 / number_of_fee_payments
   - First fee after first settlement payment clears
```

### 5.2 Transaction Status Workflow

```text
OPEN → PENDING → CLEARED
                ↘ CANCELLED

- Transactions start as OPEN (scheduled)
- Move to PENDING on processing day
- Move to CLEARED when confirmed
- Can be CANCELLED at any point before CLEARED
```

### 5.3 Update Payments Page

Add filters for new transaction types and statuses.

---

## Implementation Order

| Step | Task | Priority |
|------|------|----------|
| 1 | Database migration for transactions and settlements tables | High |
| 2 | Update TypeScript types and hooks for new fields | High |
| 3 | Create useEscrowProjection hook with projection logic | High |
| 4 | Build SettlementOfferBuilder component | High |
| 5 | Add EscrowProjectionTable visualization | Medium |
| 6 | Implement AdjustmentSuggestions component | Medium |
| 7 | Update LiabilityDetailSheet to use new builder | Medium |
| 8 | Create transaction generation on enrollment | Medium |
| 9 | Update Payments page with new filters | Low |
| 10 | Add sample data for testing | Low |

---

## Technical Considerations

### Data Integrity
- Settlement transactions are auto-generated but can be manually adjusted
- Fee calculations use 27% (configurable via `settlement_fee_percentage`)
- Processor fee is hardcoded at $10 but could be made configurable

### Performance
- Projection calculations done client-side for responsiveness
- Scheduled transactions indexed by `client_service_id` and `scheduled_date`
- Use React Query for caching transaction data

### Edge Cases
- Paused programs: suspend scheduled transactions
- NSF: mark draft as failed, reschedule
- Partial payments: track remaining balances
- Multiple settlements: stack projections correctly

---

## Summary

This implementation transforms the settlement workflow from a simple offer form into an intelligent builder that:

1. Shows real-time escrow impact of proposed settlements
2. Warns when a settlement would cause negative balance
3. Suggests specific adjustments to make settlements viable
4. Auto-generates all related transactions when accepted
5. Provides full visibility into the financial timeline
