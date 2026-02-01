

# Phase 3 Continuation: UI Components Implementation

## Current Status

The **hooks layer is complete** (5 hooks implemented). We stopped before building the UI layer.

## Remaining Work

### Step 2: Creditor Directory (3 files)

| File | Description |
|------|-------------|
| `src/components/creditors/CreditorFormDialog.tsx` | Dialog for creating/editing creditors with fields: name, type (original_creditor, collection_agency, law_firm, debt_buyer), address, phone, fax, email |
| `src/components/creditors/CreditorDetailSheet.tsx` | Side sheet showing creditor details and all liabilities assigned to this creditor |
| `src/pages/Creditors.tsx` | Main page with searchable table, type filter, and Add Creditor button |

### Step 3: Liabilities Module (6 files)

| File | Description |
|------|-------------|
| `src/components/liabilities/LiabilityFormDialog.tsx` | Dialog for creating/editing liabilities - engagement selector, creditor selectors, balance fields, type, status, priority |
| `src/components/liabilities/LiabilityActionsTimeline.tsx` | Vertical timeline showing liability history (notes, balance updates, creditor changes, settlement events) |
| `src/components/liabilities/SettlementFormDialog.tsx` | Dialog for creating settlement offers - amount, percentage calc, payment type toggle, number of payments |
| `src/components/liabilities/SettlementCard.tsx` | Card component showing settlement with status badge and action buttons (approve, accept, reject, complete) |
| `src/components/liabilities/LiabilityDetailSheet.tsx` | Side sheet with liability details, balances card, settlements section, and actions timeline |
| `src/pages/Liabilities.tsx` | Main page with table, status/type filters, search, and Add Liability button |

### Step 4: Payments View (3 files)

| File | Description |
|------|-------------|
| `src/components/payments/TransactionList.tsx` | Reusable table component for transactions with columns: date, engagement, type, amount, status, processor |
| `src/components/payments/TransactionDetailSheet.tsx` | Side sheet showing full transaction details including processor info and external references |
| `src/pages/Payments.tsx` | Main page with transaction table, status/type filters, and engagement search |

### Step 5: Routing Updates (1 file)

| File | Changes |
|------|---------|
| `src/App.tsx` | Replace inline placeholders with actual page imports for Liabilities, Creditors, Payments; add `/creditors` route |
| `src/components/layout/AppSidebar.tsx` | Add Creditors nav item to admin section |

---

## Implementation Order

1. **Creditors** - CreditorFormDialog, CreditorDetailSheet, Creditors.tsx page
2. **Liabilities Core** - LiabilityFormDialog, LiabilityActionsTimeline, LiabilityDetailSheet
3. **Settlement Workflow** - SettlementFormDialog, SettlementCard (integrated into LiabilityDetailSheet)
4. **Liabilities Page** - Liabilities.tsx main page
5. **Payments** - TransactionList, TransactionDetailSheet, Payments.tsx page
6. **Routing** - Update App.tsx and AppSidebar.tsx

---

## Technical Details

### Status Badge Colors (consistent across module)

| Status | Tailwind Classes |
|--------|------------------|
| enrolled | `bg-blue-100 text-blue-800` |
| in_negotiation | `bg-yellow-100 text-yellow-800` |
| settled | `bg-green-100 text-green-800` |
| in_litigation | `bg-red-100 text-red-800` |
| dismissed | `bg-gray-100 text-gray-600` |
| cancelled | `bg-gray-100 text-gray-400` |

### Settlement Status Badges

| Status | Tailwind Classes |
|--------|------------------|
| offered | `bg-blue-100 text-blue-800` |
| accepted | `bg-green-100 text-green-800` |
| rejected | `bg-red-100 text-red-800` |
| completed | `bg-emerald-100 text-emerald-800` |
| defaulted | `bg-orange-100 text-orange-800` |

### Currency Formatting Helper
```typescript
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
```

### Account Number Masking
```typescript
const maskAccountNumber = (num: string | null) =>
  num ? `****${num.slice(-4)}` : 'N/A';
```

---

## File Summary

| Category | New Files | Updates |
|----------|-----------|---------|
| Creditor Components | 2 | - |
| Creditor Pages | 1 | - |
| Liability Components | 5 | - |
| Liability Pages | 1 | - |
| Payment Components | 2 | - |
| Payment Pages | 1 | - |
| Routing | - | 2 (App.tsx, AppSidebar.tsx) |
| **Total** | **12 new files** | **2 updates** |

---

## Dependencies

- All hooks already exist and are fully functional
- Uses existing patterns from Phase 1/2 (Sheet, Dialog, Table, Badge, Form)
- Reuses useEngagements for engagement selection in liability forms
- Follows existing UI patterns from Contacts, Engagements, Tasks pages

