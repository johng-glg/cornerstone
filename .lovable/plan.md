

## Robust Activity Tracking

### The Problem
The Activity Log on the Client Overview tab currently only pulls from 5 sources:
1. Liability actions
2. Litigation activities
3. Service status changes
4. Settlements
5. Client communications

It is **missing** several important activity types that users expect to see automatically:
- **Task changes** (created, completed, status updates)
- **Billing entries** (time entries, expenses logged)
- **Document uploads**
- **Notes** added via the new unified notes system

This means when a manager completes a task or enters a billable, nothing appears in the Activity feed -- making it look broken.

### The Fix
Expand `useClientActivity.ts` to pull from **4 additional tables**, and add corresponding icons/colors to the UI.

---

### Changes

**1. `src/hooks/useClientActivity.ts`** -- Add new activity sources

Add these new activity type values to the `ClientActivity` type:
- `task_update` -- for task creation, completion, and status changes
- `billing_entry` -- for new time/expense entries
- `document_upload` -- for uploaded client documents
- `note` -- for notes added to any related entity

New queries to add:

| Source | Table | Link to Client | Description |
|--------|-------|----------------|-------------|
| Tasks | `tasks` | via `entity_type = 'client_service'` and `entity_id` in `serviceIds`, OR `entity_type = 'liability'` with liability lookup | "Task created: [title]" / "Task completed: [title]" |
| Billing | `billing_entries` | `client_id = clientId` OR `client_service_id` in `serviceIds` | "[entry_type] entry: [description] - $[amount]" |
| Documents | `client_documents` | `client_id = clientId` | "Document uploaded: [title] ([document_type])" |
| Notes | `notes` | `entity_type = 'client'` + `entity_id = clientId`, OR `entity_type = 'client_service'` + `entity_id` in `serviceIds` | "Note added on [entity_type]" |

Each query joins to the `staff` table for the author name where available.

**2. `src/components/clients/detail/ClientOverviewTab.tsx`** -- Add icons and colors for new types

| Type | Icon | Color |
|------|------|-------|
| `task_update` | `CheckSquare` | green |
| `billing_entry` | `DollarSign` | amber |
| `document_upload` | `Upload` | cyan |
| `note` | `MessageSquare` | indigo |
| `communication` | `MessageSquare` | yellow (already mapped but missing from icon/color maps) |

**3. Fix: `communication` type is already returned by the hook but has no icon/color entry** -- this will also be added.

---

### Technical Notes

- Tasks link to clients indirectly via `entity_type` + `entity_id`. We query tasks where `entity_type = 'client_service'` and `entity_id` is in the client's service IDs, plus tasks where `entity_type = 'liability'` with liability IDs already fetched.
- Billing entries have a direct `client_id` column, making them straightforward.
- Documents have a direct `client_id` column.
- Notes use the polymorphic `entity_type` / `entity_id` pattern; we query for `client` + `client_service` entity types.
- All new sources respect the existing pattern: fetch, transform into `ClientActivity[]`, merge, sort by timestamp, cap at 50.
- No database changes are needed -- all tables already exist with the required columns and relationships.

