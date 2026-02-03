# Forth Pay Workflow Integration - IMPLEMENTED

## Summary

The Forth Pay workflow integration has been implemented with the following components:

### ✅ Completed

1. **New Edge Function: `forth-register-client`**
   - Location: `supabase/functions/forth-register-client/index.ts`
   - Handles the complete Forth client onboarding:
     - Authenticates with Forth API
     - Creates client in Forth CRM (POST /clients)
     - Adds bank account if provided (POST /bank-accounts)
     - Creates debts for each liability (POST /debts)
     - Enrolls client (POST /clients/{id}/enroll)
     - Updates local `clients.forth_crm_id` with returned ID
     - Logs all operations to `forth_sync_log`

2. **Enrollment Wizard Integration**
   - Location: `src/components/enrollment/EnrollmentWizard.tsx`
   - After creating local records (client, service, liabilities), automatically calls `forth-register-client`
   - Non-blocking: enrollment completes even if Forth registration fails
   - Logs errors to console for debugging

3. **Manual Sync Option**
   - Location: `src/components/services/ServiceDetailSheet.tsx`
   - Added "Forth Pay Integration" card to Program tab
   - Shows registration status (registered/not registered)
   - Provides "Register with Forth Pay" button for clients not yet registered

4. **API Wrapper Functions**
   - Location: `src/lib/forthApi.ts`
   - Added `registerForthClient()` function and related types

5. **React Hook**
   - Location: `src/hooks/useForthApi.ts`
   - Added `useRegisterForthClient()` mutation hook

---

## Workflow

```text
Lead Conversion (Enrollment Wizard)
          │
          ▼
┌─────────────────────────────────────┐
│ 1. Create local client record       │
│ 2. Create local client_service      │
│ 3. Create local liabilities         │
│ 4. Update lead → converted          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 5. Call forth-register-client       │
│    (non-blocking)                   │
│    - Creates Forth client           │
│    - Adds bank account (if any)     │
│    - Adds debts                     │
│    - Enrolls client                 │
│    - Saves forth_crm_id locally     │
└─────────────────────────────────────┘
```

---

## Testing Notes

The edge function is deployed and auth is working. To fully test:

1. **Complete enrollment with banking info** - Forth client should be created automatically
2. **Complete enrollment without banking** - Local records created, Forth registration skipped (no address/banking)
3. **Manual registration** - Use ServiceDetailSheet "Register with Forth Pay" button

The Forth API expects specific field formats - actual client creation may require:
- Valid phone format (home_phone)
- Valid SSN format if provided
- Proper state abbreviation

---

## Files Modified/Created

| File | Change |
|------|--------|
| `supabase/functions/forth-register-client/index.ts` | **Created** - New edge function |
| `supabase/config.toml` | **Modified** - Added function config |
| `src/lib/forthApi.ts` | **Modified** - Added types and `registerForthClient()` |
| `src/hooks/useForthApi.ts` | **Modified** - Added `useRegisterForthClient()` hook |
| `src/components/enrollment/EnrollmentWizard.tsx` | **Modified** - Call Forth registration after enrollment |
| `src/components/services/ServiceDetailSheet.tsx` | **Modified** - Added Forth Pay integration card |
