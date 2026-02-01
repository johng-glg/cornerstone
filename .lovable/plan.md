
# Fix: Services Page Not Displaying Data

## Problem Identified

The Services page shows "No services found" even though 8 client_services records exist in the database. The issue is a **foreign key constraint name mismatch**.

## Root Cause

When tables were renamed in a previous migration:
- `engagements` was renamed to `client_services`
- `primary_contact_id` was renamed to `primary_client_id`

However, PostgreSQL does NOT automatically rename foreign key constraints when tables/columns are renamed. The original constraint name `engagements_primary_contact_id_fkey` was preserved, but the code is referencing the non-existent `client_services_primary_client_id_fkey`.

**Current Constraint Names (from DB):**

| Column | Actual Constraint Name | Code Expects |
|--------|------------------------|--------------|
| primary_client_id | `engagements_primary_contact_id_fkey` | `client_services_primary_client_id_fkey` |

This causes a **400 Bad Request** error from Supabase:
```
"Could not find a relationship between 'client_services' and 'clients' in the schema cache"
```

---

## Solution

**Option A: Fix the code to use correct constraint names** (Recommended)
Update `useClientServices.ts` to use the actual foreign key constraint name that exists in the database.

**Files to modify:**
1. `src/hooks/useClientServices.ts` - Update the FK hint from `client_services_primary_client_id_fkey` to `engagements_primary_contact_id_fkey`

---

## Technical Details

### Change in useClientServices.ts

**Before (lines 27-29, 59-61):**
```typescript
primary_client:clients!client_services_primary_client_id_fkey(id, first_name, last_name, email)
```

**After:**
```typescript
primary_client:clients!engagements_primary_contact_id_fkey(id, first_name, last_name, email)
```

This change is needed in two places:
1. `useClientServices()` function (list query)
2. `useClientService()` function (single record query)

---

## Alternative Option

**Option B: Database migration to rename constraints** (More involved)

Create a migration to rename all the legacy constraint names to match the new table/column names. This would be cleaner long-term but requires more changes. This can be done as a follow-up task.

---

## Expected Outcome

After applying Option A, the Services page will correctly load and display all 8 existing client_services records with their linked client information.
