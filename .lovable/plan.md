
# Multi-Dimensional Service Status System

## Overview

This plan addresses "status overload" by implementing a multi-dimensional status system for services, removing the "prospect" status (since services are created through lead conversion), and adding a computed client status (Active/Inactive) based on whether they have any active services.

---

## Database Changes

### 1. Remove "prospect" from service_status enum and add new primary statuses

**Replace the current `service_status` enum with new values:**

| Current Enum | New Enum (primary_status) |
|--------------|---------------------------|
| prospect | (removed - not applicable) |
| active | active |
| suspended | (removed - now a payment_status) |
| closed | (split into: graduated, dropped, cancelled) |
| (new) | pending |

**New primary_status values:**
- `pending` - Agreement signed, not yet started
- `active` - Service currently running
- `graduated` - Successfully completed program
- `dropped` - Client dropped out
- `cancelled` - Formally cancelled

### 2. Add new status dimension columns to client_services

```sql
-- Payment Status (only relevant when primary status is 'active')
ALTER TABLE client_services ADD COLUMN payment_status TEXT;
-- Values: current, paused, nsf, past_due, suspended, null

-- Retention Status (cancellation risk tracking)
ALTER TABLE client_services ADD COLUMN retention_flag BOOLEAN DEFAULT false;
ALTER TABLE client_services ADD COLUMN retention_type TEXT;
-- Values: client_requested_cancel, company_initiated_cancel, at_risk, churn_risk, complaint
ALTER TABLE client_services ADD COLUMN retention_date TIMESTAMPTZ;
ALTER TABLE client_services ADD COLUMN retention_reason TEXT;
ALTER TABLE client_services ADD COLUMN retention_assigned_to UUID REFERENCES staff(id);

-- Contact Status (client reachability)
ALTER TABLE client_services ADD COLUMN contact_status TEXT DEFAULT 'reachable';
-- Values: reachable, hard_to_reach, unreachable, no_contact_allowed
ALTER TABLE client_services ADD COLUMN last_successful_contact_date TIMESTAMPTZ;
ALTER TABLE client_services ADD COLUMN contact_attempts_count INTEGER DEFAULT 0;
ALTER TABLE client_services ADD COLUMN last_contact_attempt_date TIMESTAMPTZ;

-- Status history tracking
ALTER TABLE client_services ADD COLUMN primary_status_changed_at TIMESTAMPTZ;
ALTER TABLE client_services ADD COLUMN payment_status_changed_at TIMESTAMPTZ;
ALTER TABLE client_services ADD COLUMN contact_status_changed_at TIMESTAMPTZ;
```

### 3. Create status history table

```sql
CREATE TABLE service_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_service_id UUID REFERENCES client_services(id) NOT NULL,
  status_dimension TEXT NOT NULL, -- 'primary', 'payment', 'retention', 'contact'
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  changed_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4. Add client status field

```sql
-- Clients get a computed/tracked status
ALTER TABLE clients ADD COLUMN status TEXT DEFAULT 'inactive';
-- Values: active, inactive (driven by presence of active services)

-- Create a trigger to automatically update client status
CREATE OR REPLACE FUNCTION update_client_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the primary client's status based on active services
  UPDATE clients c
  SET status = CASE 
    WHEN EXISTS (
      SELECT 1 FROM client_services cs 
      WHERE cs.primary_client_id = c.id 
      AND cs.status = 'active'
    ) THEN 'active'
    ELSE 'inactive'
  END
  WHERE c.id = COALESCE(NEW.primary_client_id, OLD.primary_client_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Type Definitions

New TypeScript enums to be created:

```typescript
// Primary Service Status (lifecycle)
type PrimaryServiceStatus = 'pending' | 'active' | 'graduated' | 'dropped' | 'cancelled';

// Payment Status (financial state)
type PaymentStatus = 'current' | 'paused' | 'nsf' | 'past_due' | 'suspended' | null;

// Retention Type (cancellation risk reasons)
type RetentionType = 'client_requested_cancel' | 'company_initiated_cancel' | 'at_risk' | 'churn_risk' | 'complaint' | null;

// Contact Status (reachability)
type ContactStatus = 'reachable' | 'hard_to_reach' | 'unreachable' | 'no_contact_allowed';

// Client Status (derived from services)
type ClientStatus = 'active' | 'inactive';
```

---

## UI Components to Create/Modify

### 1. Multi-Status Badge Component

Create a new `ServiceStatusBadges` component that displays all relevant status dimensions:

```text
+----------------------------------------------------------+
| SVC-0001                                                  |
| [Active] [NSF] [At Risk] [Hard to Reach]                 |
|  ^green   ^red   ^yellow   ^orange                        |
+----------------------------------------------------------+
```

### 2. Services Page Updates

**Filter panel changes:**
- Replace single status dropdown with multi-select filters for each dimension
- Add quick filter buttons: "Needs Attention", "Payment Issues", "Retention Concerns"

**Table columns:**
| Service # | Client | Primary Status | Payment | Retention | Contact | Enrolled Debt |
|-----------|--------|----------------|---------|-----------|---------|---------------|

### 3. Service Detail Sheet Updates

Add new tabs/sections:

**Status Overview Card:**
```text
+----------------------------------------+
| Status Overview                         |
|----------------------------------------|
| Primary:    [Active]  Changed: Jan 15  |
| Payment:    [NSF]     Changed: Feb 1   |
| Retention:  [At Risk] Flagged: Jan 28  |
| Contact:    [Reachable]                 |
+----------------------------------------+
```

**Status Change Modals:**
- Each status dimension gets its own change modal with reason tracking
- Payment status only editable when primary status is 'active'

### 4. Clients Page Updates

- Add "Status" column showing Active/Inactive badge
- Add filter for client status

### 5. Dashboard Widgets (future)

- "Services Needing Attention" widget showing combined status issues
- Payment status breakdown chart
- Retention flag count

---

## Files to Modify

### Database Migration
- Create new migration with enum changes, new columns, history table, and triggers

### Hook Updates
1. `src/hooks/useClientServices.ts`
   - Update types to include new status fields
   - Add mutations for each status dimension change
   - Add history tracking on status changes

2. `src/hooks/useClients.ts`
   - Update Client type to include status field
   - Add filter by client status

### UI Component Updates
3. `src/pages/Services.tsx`
   - Remove "prospect" from filter options
   - Add multi-dimensional filter UI
   - Update table to show all status dimensions

4. `src/components/services/ServiceDetailSheet.tsx`
   - Complete redesign of status section
   - Add status change controls for each dimension
   - Add retention tracking section

5. `src/components/services/ServiceFormDialog.tsx`
   - Remove "prospect" as an option
   - Update default status to 'pending'

6. `src/pages/Clients.tsx`
   - Add status column to table
   - Add status filter

7. `src/components/clients/ClientDetailSheet.tsx`
   - Display client status badge

### New Components to Create
8. `src/components/services/ServiceStatusBadges.tsx`
   - Reusable multi-status badge display

9. `src/components/services/StatusChangeModal.tsx`
   - Modal for changing status with reason tracking

10. `src/components/services/RetentionPanel.tsx`
    - Panel for managing retention flags

---

## Status Configuration

### Primary Status Config
| Status | Label | Color | Description |
|--------|-------|-------|-------------|
| pending | Pending | blue | Agreement signed, not started |
| active | Active | green | Currently running |
| graduated | Graduated | purple | Successfully completed |
| dropped | Dropped | red | Client stopped participating |
| cancelled | Cancelled | gray | Formally cancelled |

### Payment Status Config
| Status | Label | Color | When Shown |
|--------|-------|-------|------------|
| current | Current | green | Only if active |
| paused | Paused | yellow | Only if active |
| nsf | NSF | red | Only if active |
| past_due | Past Due | orange | Only if active |
| suspended | Suspended | red | Only if active |

### Contact Status Config
| Status | Label | Color |
|--------|-------|-------|
| reachable | Reachable | green |
| hard_to_reach | Hard to Reach | yellow |
| unreachable | Unreachable | red |
| no_contact_allowed | No Contact | gray |

---

## Migration Strategy for Existing Data

```sql
-- Convert existing statuses to new system
UPDATE client_services SET 
  status = CASE 
    WHEN status = 'prospect' THEN 'pending'
    WHEN status = 'suspended' THEN 'active'
    WHEN status = 'closed' THEN 'cancelled'
    ELSE status
  END;

-- Set payment_status for previously suspended services
UPDATE client_services SET 
  payment_status = 'suspended'
WHERE status = 'active' AND OLD.status = 'suspended';

-- Initialize payment_status for active services
UPDATE client_services SET 
  payment_status = 'current'
WHERE status = 'active' AND payment_status IS NULL;

-- Initialize contact_status for all services
UPDATE client_services SET 
  contact_status = 'reachable'
WHERE contact_status IS NULL;
```

---

## Technical Notes

1. **Constraint Logic**: Payment status fields only apply when primary status is 'active'. The UI will hide/show these fields conditionally.

2. **History Tracking**: All status changes will be logged to `service_status_history` with the staff member who made the change and the reason.

3. **Client Status Automation**: A database trigger automatically updates client status when their services change status.

4. **Indexing**: Create indexes on status columns for efficient filtering:
   ```sql
   CREATE INDEX idx_client_services_status ON client_services(status);
   CREATE INDEX idx_client_services_payment_status ON client_services(payment_status);
   CREATE INDEX idx_client_services_retention_flag ON client_services(retention_flag);
   CREATE INDEX idx_client_services_contact_status ON client_services(contact_status);
   ```

5. **RLS Policies**: The new `service_status_history` table will inherit RLS from client_services via the foreign key relationship.

---

## Implementation Order

1. Database migration (new columns, enums, history table, triggers)
2. Update TypeScript types and hooks
3. Create ServiceStatusBadges component
4. Update Services page (filters, table, detail sheet)
5. Create status change modals with reason tracking
6. Update Clients page with status display
7. Add retention management panel
8. Update ServiceFormDialog to remove prospect option

