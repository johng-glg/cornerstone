
# Phase 3: Liabilities Module Implementation Plan

## Overview

Phase 3 focuses on building the core Debt Resolution functionality. This module enables tracking client debts, managing creditor relationships, creating settlement proposals, and monitoring payment activity.

---

## Current State

**Already in Place:**
- Database tables: `liabilities`, `liability_actions`, `creditors`, `settlements`, `transactions`, `payment_processors`, `company_processor_configs`
- Basic `useCreditors` hook (read-only)
- Placeholder page in App.tsx for `/liabilities`

**What Needs to Be Built:**
- Liabilities CRUD hooks and UI components
- Creditor management (CRUD for the creditor directory)
- Settlement workflow (create, attorney review, accept/reject, complete)
- Transaction/Payment tracking UI
- Liability actions timeline (audit log)

---

## Implementation Plan

### 1. Data Hooks Layer

**New Hooks:**

| File | Purpose |
|------|---------|
| `src/hooks/useLiabilities.ts` | CRUD for liabilities linked to engagements |
| `src/hooks/useLiabilityActions.ts` | Log and query liability activity timeline |
| `src/hooks/useSettlements.ts` | CRUD for settlement proposals on liabilities |
| `src/hooks/useTransactions.ts` | Query transactions linked to engagements |

**Updates:**
- Expand `useCreditors.ts` to include mutations (create, update, delete)

### 2. Liabilities Module

**New Files:**

| File | Purpose |
|------|---------|
| `src/pages/Liabilities.tsx` | Main liabilities list with table and filters |
| `src/components/liabilities/LiabilityFormDialog.tsx` | Create/edit liability form |
| `src/components/liabilities/LiabilityDetailSheet.tsx` | View liability details, settlements, actions |
| `src/components/liabilities/LiabilityActionsTimeline.tsx` | Activity log for a liability |
| `src/components/liabilities/SettlementFormDialog.tsx` | Create/edit settlement offer |
| `src/components/liabilities/SettlementCard.tsx` | Display settlement with status actions |

**Features:**
- List view with filters by status (enrolled, in_negotiation, settled, in_litigation, dismissed, cancelled)
- Filter by engagement, creditor, or liability type (credit_card, medical, auto_loan, etc.)
- Create liability linked to an engagement
- Assign original and current creditor from creditor directory
- Track original balance, enrolled balance, current balance
- Priority ranking for negotiation order
- View settlement history on each liability
- Log actions (notes, balance updates, creditor changes) to timeline

### 3. Creditor Directory

**New Files:**

| File | Purpose |
|------|---------|
| `src/pages/Creditors.tsx` | Creditor directory with search |
| `src/components/creditors/CreditorFormDialog.tsx` | Create/edit creditor |
| `src/components/creditors/CreditorDetailSheet.tsx` | View creditor with linked liabilities |

**Features:**
- Searchable creditor list (global directory, not company-scoped)
- Creditor types: original_creditor, collection_agency, law_firm, debt_buyer
- Contact information (address, phone, fax, email)
- See all liabilities currently with this creditor

### 4. Settlement Workflow

**Settlement States Flow:**
```text
+----------+     +----------+     +-----------+     +-----------+
| offered  | --> | accepted | --> | completed |     | defaulted |
+----------+     +----------+     +-----------+     +-----------+
     |                                   ^
     v                                   |
+-----------+                            |
| rejected  |----------------------------+
+-----------+    (new offer possible)
```

**Key Features:**
- Create settlement offer on a liability (offer_amount, offer_percentage, payment_type)
- Attorney review queue (requires approval before client notification)
- Mark as accepted with date
- Track payment plan (number_of_payments) or lump sum
- Mark as completed when fully paid
- Handle defaulted settlements

**Attorney Review Queue:**
- Filter settlements awaiting attorney approval
- Attorney can approve or request changes
- Tracks attorney_approved_by and attorney_approved_date

### 5. Payments/Transactions View

**New Files:**

| File | Purpose |
|------|---------|
| `src/pages/Payments.tsx` | Replace placeholder with transaction list |
| `src/components/payments/TransactionList.tsx` | Table of transactions |
| `src/components/payments/TransactionDetailSheet.tsx` | View transaction details |

**Features:**
- List transactions by engagement
- Filter by status (pending, completed, failed, refunded)
- Show processor info (Forth Pay, Global Holdings)
- Display transaction type (monthly_payment, settlement_payment, fee)
- Read-only view (transactions created by payment processors)

---

## UI Components Summary

### Liabilities Page Layout
- Header with title and "Add Liability" button
- Filter bar: Status dropdown, Type dropdown, Search input
- Table with columns: Engagement, Creditor, Type, Original Balance, Current Balance, Status, Priority

### Liability Detail Sheet
- Header: Creditor name, account number (masked), liability type badge
- Balances card: Original, Enrolled, Current amounts
- Engagement link
- Settlements section with cards for each proposal
- Actions timeline showing history

### Settlement Form
- Offer amount input with percentage calculator
- Payment type toggle (lump sum vs payment plan)
- Number of payments (if payment plan)
- Notes field
- Submit creates settlement in "offered" status

---

## Routing Updates

**App.tsx Changes:**
- Replace `LiabilitiesPage` placeholder with actual implementation
- Replace `PaymentsPage` placeholder with actual implementation
- Add `/creditors` route for creditor directory

---

## File Summary

| Category | Files |
|----------|-------|
| **Hooks** | 4 new (useLiabilities, useLiabilityActions, useSettlements, useTransactions) + 1 updated (useCreditors) |
| **Pages** | 3 (Liabilities, Creditors, Payments) |
| **Liability Components** | 6 (FormDialog, DetailSheet, ActionsTimeline, SettlementForm, SettlementCard, and reusable sub-components) |
| **Creditor Components** | 2 (FormDialog, DetailSheet) |
| **Payment Components** | 2 (TransactionList, TransactionDetailSheet) |

**Total: ~17 new files + 2 updates**

---

## Technical Details

### Liability with Related Data
```typescript
type LiabilityWithRelations = Tables<'liabilities'> & {
  original_creditor?: Tables<'creditors'> | null;
  current_creditor?: Tables<'creditors'> | null;
  engagement?: { id: string; engagement_number: string; primary_contact?: { first_name: string; last_name: string } };
  settlements?: Tables<'settlements'>[];
};
```

### Settlement with Attorney Info
```typescript
type SettlementWithApprover = Tables<'settlements'> & {
  attorney?: Tables<'staff'> | null;
};
```

### Currency Formatting
All monetary values use consistent formatting:
```typescript
const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
```

### Status Badge Colors
| Status | Color |
|--------|-------|
| enrolled | Blue |
| in_negotiation | Yellow |
| settled | Green |
| in_litigation | Red |
| dismissed | Gray |
| cancelled | Gray muted |

---

## Execution Order

1. **Hooks First**
   - Create useLiabilities.ts with CRUD
   - Create useSettlements.ts with CRUD
   - Create useLiabilityActions.ts
   - Update useCreditors.ts with mutations
   - Create useTransactions.ts (read-only)

2. **Creditor Directory**
   - CreditorFormDialog.tsx
   - CreditorDetailSheet.tsx
   - Creditors.tsx page

3. **Liabilities Core**
   - LiabilityFormDialog.tsx
   - LiabilityDetailSheet.tsx
   - LiabilityActionsTimeline.tsx
   - Liabilities.tsx page

4. **Settlement Workflow**
   - SettlementFormDialog.tsx
   - SettlementCard.tsx (with status actions)
   - Add settlement section to LiabilityDetailSheet

5. **Payments View**
   - TransactionList.tsx
   - TransactionDetailSheet.tsx
   - Payments.tsx page

6. **Routing**
   - Update App.tsx with new routes

---

## Dependencies

- Uses existing TanStack Query patterns from Phase 1 and 2
- Follows Shadcn UI component patterns (Sheet, Dialog, Table, Badge)
- Reuses existing hooks: useStaff, useEngagements
- No new database tables needed (all tables exist)
