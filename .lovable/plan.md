
# Populate Sample Liabilities for Active Client Services

## Overview

This plan adds realistic sample liabilities (debts) to the 4 active client services, creating a diverse portfolio that demonstrates the debt resolution workflow.

---

## Current State

**4 Active Client Services:**
| Service # | Client | Service ID |
|-----------|--------|------------|
| ENG-2026-0001 | Michael Johnson | 373efcd3-a4ec-4a47-9741-bba0b57f0d49 |
| ENG-2026-0002 | Sarah Williams | 312c78f9-c439-49da-940e-ad86f6f3d4e8 |
| ENG-2026-0003 | Robert Davis | b398972b-db12-448d-975f-31b3c4423769 |
| ENG-2026-0006 | Emily Taylor | a24458e5-b95e-4023-962d-f58ae8568df5 |

**20 Available Creditors:** Chase, Capital One, Discover, AmEx, Bank of America, Wells Fargo, Synchrony, Comenity, Barclays, etc.

---

## Liabilities Schema

Each liability requires:
- `client_service_id` - Link to active service
- `liability_type` - credit_card, medical, personal_loan, auto_loan, student_loan, mortgage, other
- `status` - enrolled, in_negotiation, settled, in_litigation, dismissed, cancelled
- `original_creditor_id` - Link to creditor
- `current_creditor_id` - Same as original or collection agency (if sold)
- `original_balance` - Balance when debt originated
- `enrolled_balance` - Balance when enrolled in program
- `current_balance` - Current negotiated balance
- `account_number` - Last 4 digits masked
- `priority` - Order for settlement (1 = highest)
- `notes` - Optional

---

## Sample Data Plan

### Service 1: Michael Johnson (ENG-2026-0001) - $47,500 Total
*Mix of statuses showing program progress*

| Creditor | Type | Original | Enrolled | Current | Status | Priority |
|----------|------|----------|----------|---------|--------|----------|
| Chase | Credit Card | $12,500 | $14,200 | $0 | settled | 1 |
| Capital One | Credit Card | $8,750 | $9,400 | $4,700 | in_negotiation | 2 |
| Discover | Credit Card | $15,800 | $17,100 | $17,100 | enrolled | 3 |
| Best Egg | Personal Loan | $6,200 | $6,800 | $6,800 | enrolled | 4 |

### Service 2: Sarah Williams (ENG-2026-0002) - $32,800 Total
*Early stage program - mostly enrolled*

| Creditor | Type | Original | Enrolled | Current | Status | Priority |
|----------|------|----------|----------|---------|--------|----------|
| American Express | Credit Card | $11,200 | $12,500 | $12,500 | enrolled | 1 |
| Bank of America | Credit Card | $9,800 | $10,200 | $10,200 | in_negotiation | 2 |
| Synchrony | Credit Card | $7,400 | $7,900 | $7,900 | enrolled | 3 |
| Wells Fargo | Credit Card | $2,200 | $2,200 | $2,200 | enrolled | 4 |

### Service 3: Robert Davis (ENG-2026-0003) - $58,200 Total
*Larger debt portfolio with litigation*

| Creditor | Type | Original | Enrolled | Current | Status | Priority |
|----------|------|----------|----------|---------|--------|----------|
| Barclays | Credit Card | $18,500 | $21,200 | $21,200 | in_litigation | 1 |
| Credit One | Credit Card | $5,800 | $6,400 | $3,200 | in_negotiation | 2 |
| Comenity | Credit Card | $14,200 | $15,800 | $15,800 | enrolled | 3 |
| Lending Club | Personal Loan | $11,400 | $12,600 | $0 | settled | 4 |
| TD Bank | Credit Card | $8,300 | $8,300 | $8,300 | enrolled | 5 |

### Service 4: Emily Taylor (ENG-2026-0006) - $28,400 Total
*Medical and credit mix*

| Creditor | Type | Original | Enrolled | Current | Status | Priority |
|----------|------|----------|----------|---------|--------|----------|
| US Bank | Credit Card | $9,600 | $10,800 | $10,800 | enrolled | 1 |
| Upgrade | Personal Loan | $7,200 | $7,900 | $3,950 | in_negotiation | 2 |
| Onemain | Personal Loan | $8,400 | $9,700 | $9,700 | enrolled | 3 |

---

## Implementation Steps

1. **Insert 16 Liabilities** via SQL insert statements with varied statuses:
   - 7 enrolled (awaiting negotiation)
   - 4 in_negotiation (active offers)
   - 2 settled (completed)
   - 1 in_litigation (legal action)

2. **Update Client Services** to recalculate `total_enrolled_debt` based on enrolled balances

---

## Technical Notes

- Account numbers will be randomly generated last-4 digits (e.g., "****4521")
- Settled liabilities have current_balance = 0
- In-negotiation liabilities show reduced current_balance (offer amount)
- Enrolled liabilities have current_balance = enrolled_balance
- Priority 1 = first to settle

---

## Status Distribution Summary

| Status | Count | Description |
|--------|-------|-------------|
| enrolled | 7 | Waiting to begin negotiation |
| in_negotiation | 4 | Active settlement offers |
| settled | 2 | Successfully resolved |
| in_litigation | 1 | Legal proceedings active |
