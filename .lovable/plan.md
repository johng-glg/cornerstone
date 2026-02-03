
# Forth Pay Workflow Integration Update

## Understanding the Forth Pay Workflow

Based on the API documentation, the complete Forth Pay workflow is:

```text
1. Create Client (POST /clients)
   └── Returns `id` (10-digit numeric Forth ID)
       │
2. Add Bank Account (POST /bank-accounts)
   └── Links bank details to client
       │
3. Create Debt (POST /debts) - for each liability
   └── Registers debts with Forth
       │
4. Enroll Client (POST /clients/{id}/enroll)
   └── Activates the client in Forth Pay
       │
5. Create Multiple Drafts (POST /bulk/drafts)
   └── Generates the payment schedule in Forth
```

Key finding: **The Forth client record must be created FIRST, and it returns the `forth_crm_id`** - we don't need to create records in both CRM and Pay separately because they share a unified ID system.

---

## Updated Solution: Integration Points

### When to Create Forth Client

The optimal timing is **during enrollment completion** when:
- All client data is collected (name, address, DOB, phone, email)
- Banking information is captured
- The service is being created

This happens in `EnrollmentWizard.tsx` at the `handleComplete` function (lines 144-272).

### Proposed Workflow

```text
Enrollment Wizard "Complete Enrollment" clicked
          │
          ▼
    ┌─────────────────────────────────────┐
    │ 1. Create local client record       │
    │ 2. Create local client_service      │
    │ 3. Create local liabilities         │
    └──────────────┬──────────────────────┘
                   │
                   ▼
    ┌─────────────────────────────────────┐
    │ 4. Call forth-register-client       │
    │    - POST /clients (creates client) │
    │    - POST /bank-accounts (optional) │
    │    - POST /debts (for each debt)    │
    │    - POST /clients/{id}/enroll      │
    │    - Return forth_crm_id            │
    └──────────────┬──────────────────────┘
                   │
                   ▼
    ┌─────────────────────────────────────┐
    │ 5. Store forth_crm_id on client     │
    │ 6. Generate payment schedule        │
    │ 7. Push drafts to Forth (optional)  │
    └─────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Create `forth-register-client` Edge Function

A new consolidated edge function that handles the full Forth onboarding:

**Endpoint:** `forth-register-client`

**Input:**
```typescript
{
  client_id: string;        // Our internal client UUID
  client_service_id: string;  // The service being created
  client_data: {
    first_name: string;
    last_name: string;
    middle_name?: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    email: string;
    phone: string;
    date_of_birth: string;
    ssn?: string;
  };
  banking?: {
    bank_name: string;
    routing_number: string;
    account_number: string;
    account_type: 'checking' | 'savings';
  };
  debts: Array<{
    creditor_name: string;
    account_type: string;
    current_balance: number;
    original_balance?: number;
    account_number?: string;
  }>;
}
```

**Actions:**
1. Call `POST /clients` to create Forth client - returns `id` (the forth_crm_id)
2. If banking provided, call `POST /bank-accounts` 
3. For each debt, call `POST /debts`
4. Call `POST /clients/{id}/enroll` to activate
5. Update local `clients.forth_crm_id` with returned ID
6. Log all operations to `forth_sync_log`

**Output:**
```typescript
{
  success: boolean;
  forth_crm_id: string;
  error?: string;
}
```

---

### Phase 2: Update Enrollment Wizard

Modify `EnrollmentWizard.tsx` to call the registration function after local records are created:

```typescript
// After creating local records (client, service, liabilities)...

// Register with Forth Pay (non-blocking - enrollment proceeds even if this fails)
if (data.routing_number && data.account_number) {
  try {
    await supabase.functions.invoke('forth-register-client', {
      body: {
        client_id: client.id,
        client_service_id: clientService.id,
        client_data: {
          first_name: data.first_name,
          last_name: data.last_name,
          // ... mapped fields
        },
        banking: {
          bank_name: data.bank_name,
          routing_number: data.routing_number,
          account_number: data.account_number,
          account_type: data.bank_account_type,
        },
        debts: data.debts.filter(d => d.is_enrolled).map(d => ({
          creditor_name: d.creditor_name,
          // ... mapped fields
        })),
      },
    });
  } catch (error) {
    // Log error but don't block enrollment
    console.error('Forth registration failed:', error);
  }
}
```

---

### Phase 3: Manual Sync Option (For clients without banking at enrollment)

Add a "Register with Forth Pay" action on the Service Detail view for clients who:
- Don't have a `forth_crm_id` yet
- Have banking information added later

---

### Phase 4: Update Existing Edge Functions

Update `forth-create-draft` to handle clients that may not be registered yet:

1. Check if client has `forth_crm_id`
2. If not, return helpful error: "Client not registered with Forth Pay. Please complete registration first."
3. If yes, proceed with draft creation

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/forth-register-client/index.ts` | Create | New consolidated registration function |
| `src/components/enrollment/EnrollmentWizard.tsx` | Modify | Add Forth registration call after enrollment |
| `src/lib/forthApi.ts` | Modify | Add `registerForthClient()` wrapper function |
| `src/hooks/useForthApi.ts` | Modify | Add `useRegisterForthClient()` hook |
| `supabase/config.toml` | Modify | Add new function config |
| `src/components/services/ServiceDetailSheet.tsx` | Modify | Add manual sync action |

---

## Technical Details

### Forth API Field Mapping

| Your Field | Forth API Field | Notes |
|------------|-----------------|-------|
| first_name | first_name | Required |
| last_name | last_name | Required |
| address_line1 | address | Required |
| city | city | Required |
| address_state | state | Required |
| zip_code | zip | Required |
| phone | home_phone | Required |
| email | email | Required |
| date_of_birth | date_of_birth | Required (format: YYYY-MM-DD) |
| ssn_encrypted | ssn | Optional |
| - | file_type | Set to "DEBT SETTLEMENT" |

### Error Handling Strategy

- **Registration fails during enrollment**: Log error, continue with enrollment. Client can be registered manually later.
- **Draft creation fails (no Forth ID)**: Show clear message to user with action to register.
- **API timeout**: Retry with exponential backoff (3 attempts).
- **Invalid data**: Return specific field validation errors from Forth API.

---

## Testing Checklist

1. Complete enrollment with banking info - verify Forth client created
2. Complete enrollment without banking - verify local records created, no Forth error
3. Manually register client after enrollment
4. Create draft for registered client
5. Attempt draft creation for unregistered client - verify helpful error

