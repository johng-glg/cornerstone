# Engagements→Services and Contacts→Clients Refactor - COMPLETED

This refactor has been completed. All "Engagements" references are now "Services" and all "Contacts" references are now "Clients".

## Summary of Changes Made

### Database (Completed Previously)
- `contacts` → `clients`
- `contact_phones` → `client_phones`
- `contact_addresses` → `client_addresses`
- `engagements` → `client_services`
- `engagement_contacts` → `client_service_clients`
- `engagement_services` → `client_service_types`
- `engagement_id` → `client_service_id` (in liabilities, transactions tables)
- `converted_engagement_id` → `converted_service_id` (in leads table)
- `primary_contact_id` → `primary_client_id` (in client_services table)
- `engagement_number` → `service_number`

### UI/Code Changes (Completed)
1. **App.tsx** - Updated imports and routes for `/clients` and `/services`
2. **AppSidebar.tsx** - Navigation updated to "Services" and "Clients"
3. **LeadConversionWizard.tsx** - Full refactor to use new table/column names
4. **LiabilityFormDialog.tsx** - Uses `useClientServices` hook, `client_service_id` field
5. **LiabilityDetailSheet.tsx** - References `liability.client_service`
6. **CreditorDetailSheet.tsx** - References `liability.client_service`
7. **TransactionDetailSheet.tsx** - References `transaction.client_service`
8. **TransactionList.tsx** - References `transaction.client_service`
9. **Liabilities.tsx** - Updated search/display to use client_service
10. **Payments.tsx** - Updated search to use client_service
11. **useClientServices.ts** - Fixed type casting for primary_client array→object
12. **useLiabilities.ts** - Updated FK hints for client_service join
13. **useTransactions.ts** - Updated FK hints for client_service join

## Technical Notes
- The database FK constraint names retained their original names (e.g., `liabilities_engagement_id_fkey`) even though columns were renamed. The Supabase queries use these FK hints for joins.
- The `primary_client` field from Supabase joins returns as an array, which is transformed to a single object in the hooks.
