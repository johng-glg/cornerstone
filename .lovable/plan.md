
# Forth Pay Integration Plan

## Overview
Implement a full integration with Forth Pay API (payment processing) and Forth CRM API (client data sync). This enables automated draft creation, status polling, and payment lifecycle management.

## Current State Analysis

### Existing Infrastructure
- **payment_processors table**: Already has "Forth Pay" record with `processor_type: forth_pay`
- **transactions table**: Has `external_id`, `processor_id`, `status`, `processed_at`, `error_message` columns
- **payment_schedules table**: Manages recurring drafts with skip/reschedule functionality
- **Transaction statuses**: `open`, `pending`, `cleared`, `cancelled`

### What We Need to Add
1. External ID mapping for clients (Forth CRM Contact ID)
2. Edge functions for API operations
3. Status polling mechanism
4. Frontend API wrapper

---

## Phase 1: Database Schema Updates

### Add Forth CRM Contact ID to Clients
```sql
ALTER TABLE clients 
ADD COLUMN forth_crm_id TEXT UNIQUE;

CREATE INDEX idx_clients_forth_crm_id ON clients(forth_crm_id);
```

### Add API Sync Tracking
```sql
-- Track last sync times and error states
ALTER TABLE transactions 
ADD COLUMN last_sync_at TIMESTAMPTZ,
ADD COLUMN sync_error TEXT;

-- Create sync log for audit trail
CREATE TABLE forth_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'transaction', 'client', 'draft'
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'poll', 'cancel'
  request_payload JSONB,
  response_payload JSONB,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Phase 2: Edge Functions

### 1. forth-auth (Shared Authentication)
Handles OAuth token management with caching.

```
supabase/functions/forth-auth/index.ts
```

Key features:
- Token caching (9-day validity)
- Secret normalization
- Error handling for auth failures

### 2. forth-create-draft
Creates a draft in Forth Pay from a local transaction.

```
POST /drafts → Forth Pay API
```

Input: `{ transaction_id: string }`

Actions:
- Fetch transaction with client service and client data
- Look up client's `forth_crm_id`
- Create draft via Forth Pay API
- Store `external_id` and update status to `pending`
- Log to `forth_sync_log`

### 3. forth-poll-transactions
Status polling for pending transactions.

```
GET /reports/transactions → Forth Pay API
```

Actions:
- Query local transactions with `status = 'pending'`
- Batch query Forth Pay for status updates
- Update local records: `cleared`, `failed`, or retry pending
- Handle NSF scenarios
- Log changes to `forth_sync_log`

### 4. forth-cancel-draft
Cancels a draft that hasn't processed yet.

```
POST /drafts/{id}/cancel → Forth Pay API
```

Input: `{ transaction_id: string }`

Actions:
- Check 7-day lead time rule
- Cancel via API
- Update local status to `cancelled`
- Log action

### 5. forth-update-draft
Reschedules or modifies a draft.

```
PUT /drafts/{id} → Forth Pay API
```

Input: `{ transaction_id: string, process_date?: string, amount?: number }`

Actions:
- Validate 7-day lead time
- Full payload update (required by Forth API)
- Update local record
- Log changes

### 6. forth-sync-client
Syncs client data to/from Forth CRM.

```
GET /contacts/{id} → Forth CRM API
POST /contacts/{id}/notes → Forth CRM API
```

Input: `{ client_id: string, forth_crm_id?: string }`

Actions:
- Fetch contact details from CRM
- Create notes when actions are taken
- Store/update `forth_crm_id` mapping

### 7. forth-pause-resume
Pause or resume all client drafts.

```
POST /contacts/{id}/pause → Forth CRM API
POST /contacts/{id}/resume → Forth CRM API
```

Input: `{ client_id: string, action: 'pause' | 'resume' }`

---

## Phase 3: Scheduled Polling

### Cron-Based Status Polling
Create a scheduled function that runs every 15 minutes:

```
supabase/functions/forth-poll-cron/index.ts
```

Can be triggered by:
- Supabase scheduled functions (pg_cron)
- External scheduler (n8n, etc.)
- Manual invocation for testing

---

## Phase 4: Frontend Integration

### 1. API Wrapper (src/lib/forthApi.ts)

```typescript
export async function createForthDraft(transactionId: string)
export async function cancelForthDraft(transactionId: string)
export async function updateForthDraft(transactionId: string, updates: {...})
export async function syncForthClient(clientId: string)
export async function pauseForthClient(clientId: string)
export async function resumeForthClient(clientId: string)
```

### 2. Transaction Actions Hook

Extend `useTransactions.ts` with:
- `usePushToForth()` - Create draft in Forth
- `useCancelForthDraft()` - Cancel pending draft
- `useRescheduleForthDraft()` - Update date/amount

### 3. UI Enhancements

**Transaction Detail Sheet**:
- "Push to Forth" button for open transactions
- "Cancel Draft" button for pending (with 7-day check)
- Sync status indicator
- Last sync timestamp

**Service Detail View**:
- Bulk actions: "Push All Scheduled" to Forth
- Pause/Resume client toggle
- Sync status summary

---

## Phase 5: Error Handling & Retry Logic

### NSF Handling
When a draft fails due to NSF:
1. Update status to `failed` with error message
2. Create retry draft (optional, based on config)
3. Post note to Forth CRM
4. Notify client services rep

### Retry Configuration
```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelayDays: 3,
  nsfFeeAmount: 25,
};
```

---

## Implementation Order

1. **Secrets Setup** - Add `FORTH_CLIENT_ID` and `FORTH_API_KEY`
2. **Database Migration** - Add `forth_crm_id` and sync columns
3. **forth-auth** - Shared auth module
4. **forth-create-draft** - Core draft creation
5. **forth-poll-transactions** - Status updates
6. **forth-cancel-draft** - Cancellation
7. **forth-update-draft** - Modifications
8. **Frontend wrapper** - API layer
9. **UI integration** - Buttons and status displays
10. **Scheduled polling** - Cron setup
11. **Testing & Refinement**

---

## Required Secrets

| Secret Name | Description |
|------------|-------------|
| `FORTH_CLIENT_ID` | OAuth Client ID from Forth |
| `FORTH_API_KEY` | OAuth Client Secret from Forth |

---

## Testing Checklist

- [ ] OAuth token acquisition works
- [ ] Create draft pushes to Forth sandbox
- [ ] Status polling updates local records
- [ ] Cancel respects 7-day lead time
- [ ] Reschedule updates both systems
- [ ] Client pause/resume works
- [ ] NSF handling creates appropriate records
- [ ] Sync log captures all operations
- [ ] Error states are properly displayed
