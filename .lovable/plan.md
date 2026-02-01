
# Complete the Engagements→Services and Contacts→Clients Refactor

This plan will fix all remaining build errors to complete the architectural refactor.

## Summary of Changes

The refactor is approximately 60% complete. The database was successfully migrated, and new hooks/pages were created, but many UI components still reference the old terminology. This plan fixes all remaining issues.

---

## Phase 1: Fix App Router and Navigation

### 1.1 Update `src/App.tsx`
- Change imports from `ContactsPage`/`EngagementsPage` to `ClientsPage`/`ServicesPage`
- Update routes from `/contacts` and `/engagements` to `/clients` and `/services`

### 1.2 Update `src/components/layout/AppSidebar.tsx`
- Rename "Engagements" → "Services" with URL `/services`
- Rename "Contacts" → "Clients" with URL `/clients`

---

## Phase 2: Fix LeadConversionWizard

### 2.1 Update `src/components/leads/LeadConversionWizard.tsx`
This is the most complex file requiring updates:

**Table name changes:**
- `contacts` → `clients`
- `contact_phones` → `client_phones`
- `engagements` → `client_services`
- `engagement_contacts` → `client_service_clients`
- `engagement_services` → `client_service_types`

**Column name changes:**
- `contact_id` → `client_id`
- `engagement_id` → `client_service_id`
- `converted_engagement_id` → `converted_service_id`
- `primary_contact_id` → `primary_client_id`
- `engagement_number` → `service_number`

**UI text updates:**
- "CONVERT LEAD TO ENGAGEMENT" → "CONVERT LEAD TO CLIENT SERVICE"
- "Contact Info" → "Client Info"
- Query invalidation keys updated

---

## Phase 3: Fix Liability Components

### 3.1 Update `src/components/liabilities/LiabilityFormDialog.tsx`
- Change import from `useEngagements` to `useClientServices`
- Update schema field from `engagement_id` to `client_service_id`
- Update form labels from "Engagement" to "Service"
- Update select options to show `service_number` instead of `engagement_number`

### 3.2 Update `src/components/liabilities/LiabilityDetailSheet.tsx`
- Change all `liability.engagement` references to `liability.client_service`
- Update field names: `engagement_number` → `service_number`, `primary_contact` → `primary_client`
- Update card title from "Engagement" to "Service"

---

## Phase 4: Fix Creditor Components

### 4.1 Update `src/components/creditors/CreditorDetailSheet.tsx`
- Change `liability.engagement` to `liability.client_service`
- Update table header from "Engagement" to "Service"
- Update field reference from `engagement_number` to `service_number`

---

## Phase 5: Fix Payment Components

### 5.1 Update `src/components/payments/TransactionDetailSheet.tsx`
- Change all `transaction.engagement` references to `transaction.client_service`
- Update field names: `engagement_number` → `service_number`, `primary_contact` → `primary_client`
- Update card title from "Engagement" to "Service"

### 5.2 Update `src/components/payments/TransactionList.tsx`
- Change all `transaction.engagement` references to `transaction.client_service`
- Update field names accordingly

### 5.3 Update `src/pages/Payments.tsx`
- Update filter comments/labels if they reference "engagement"

---

## Phase 6: Fix Hook Type Issues

### 6.1 Update `src/hooks/useClientServices.ts`
- Fix type casting issue where `primary_client` is returned as an array from the Supabase query but typed as a single object
- Either adjust the type definition or transform the data after fetching

---

## Files to be Modified

| File | Change Type |
|------|-------------|
| `src/App.tsx` | Update imports and routes |
| `src/components/layout/AppSidebar.tsx` | Update navigation labels and URLs |
| `src/components/leads/LeadConversionWizard.tsx` | Full refactor of table/column names |
| `src/components/liabilities/LiabilityFormDialog.tsx` | Update imports and schema |
| `src/components/liabilities/LiabilityDetailSheet.tsx` | Update property references |
| `src/components/creditors/CreditorDetailSheet.tsx` | Update property references |
| `src/components/payments/TransactionDetailSheet.tsx` | Update property references |
| `src/components/payments/TransactionList.tsx` | Update property references |
| `src/hooks/useClientServices.ts` | Fix type casting |

---

## Technical Notes

- The database schema is already correct - only UI/code changes needed
- All changes maintain backward compatibility with existing data
- Query invalidation keys will be updated to match new naming
- The `client_phones` table reference in LeadConversionWizard will need verification that this table exists (it may need to be `client_phones` or we may need to check if it was migrated from `contact_phones`)
