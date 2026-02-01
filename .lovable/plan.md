

# Implementation Plan: Priority 1 & Priority 2 Fixes

## Overview

This plan implements the critical fixes and enhancements identified in the analysis to complete Phases 1-3 of the Litigation Management system.

---

## Priority 1: Status Change Activity Logging & Staff Attribution

### 1.1 Add Status Change Auto-Logging to `useUpdateLitigationMatter`

**File:** `src/hooks/useLitigationMatters.ts`

Currently, the update mutation simply updates the matter without tracking status changes. We need to:

1. Fetch the current matter before updating to compare status
2. If status changed, insert an activity record
3. Include the current staff ID in the activity

**Changes:**
- Modify `useUpdateLitigationMatter` to accept an optional `staffId` parameter
- Before updating, fetch the current matter to detect status changes
- If `status` field is being updated and differs from current, insert a `litigation_activity` record with type `status_change`

```text
Current Flow:
  Update matter → Success toast

New Flow:
  Fetch current matter → Update matter → If status changed → Insert activity → Success toast
```

### 1.2 Add Staff ID to Activity Creation in `LitigationActivityFormDialog`

**File:** `src/components/litigation/LitigationActivityFormDialog.tsx`

Currently sets `staff_id: null` with a TODO comment. We will:

1. Import `useCurrentStaff` from `@/hooks/useStaff`
2. Call the hook to get the logged-in user's staff record
3. Pass `currentStaff?.id` to the activity creation

---

## Priority 2: Document Update Hook & Dashboard Quick Actions

### 2.1 Add `useUpdateLitigationDocument` Hook

**File:** `src/hooks/useLitigationDocuments.ts`

Add a new mutation hook following the existing pattern:

```typescript
export type LitigationDocumentUpdate = Partial<LitigationDocumentInsert> & { id: string };

export function useUpdateLitigationDocument() {
  // Similar pattern to useUpdateLitigationMatter
  // Update document metadata (title, dates, notes, document_type)
  // Invalidate queries on success
}
```

### 2.2 Fix Dashboard Quick Actions

**File:** `src/pages/Dashboard.tsx`

Current broken buttons:
- "New Lead" → `/leads/new` (route doesn't exist)
- "New Engagement" → `/engagements/new` (route doesn't exist)  
- "New Contact" → `/contacts/new` (route doesn't exist)
- "New Task" → `/tasks/new` (route doesn't exist)

**Solution:** Use URL query parameters to trigger dialogs on the target pages:

| Button | New Link | Behavior |
|--------|----------|----------|
| New Lead | `/leads?action=new` | Leads page opens create dialog |
| New Task | `/tasks?action=new` | Tasks page opens create dialog |

Remove "New Engagement" and "New Contact" as requested.

**Additional Changes:**
- Update `src/pages/Leads.tsx` to check for `?action=new` query param and auto-open the create dialog
- Update `src/pages/Tasks.tsx` to check for `?action=new` query param and auto-open the create dialog

---

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useLitigationMatters.ts` | Add status change detection and activity logging in `useUpdateLitigationMatter` |
| `src/components/litigation/LitigationActivityFormDialog.tsx` | Add `useCurrentStaff` hook and pass staff_id |
| `src/hooks/useLitigationDocuments.ts` | Add `useUpdateLitigationDocument` mutation |
| `src/pages/Dashboard.tsx` | Remove 2 buttons, update links to use query params |
| `src/pages/Leads.tsx` | Add useEffect to detect `?action=new` and open create dialog |
| `src/pages/Tasks.tsx` | Add useEffect to detect `?action=new` and open create dialog |

### Implementation Order

1. `useLitigationMatters.ts` - Add status change logging (uses existing patterns)
2. `LitigationActivityFormDialog.tsx` - Add staff attribution
3. `useLitigationDocuments.ts` - Add update hook
4. `Dashboard.tsx` - Fix quick action buttons
5. `Leads.tsx` & `Tasks.tsx` - Add query param detection

---

## Testing Checklist

After implementation, verify:

1. **Status Change Logging**
   - Change a matter status in the detail sheet
   - Check Activity tab shows "Status changed to X" entry
   - Verify staff name appears on the activity

2. **Activity Staff Attribution**
   - Log a new activity via the form
   - Verify the staff name appears in the activity timeline

3. **Document Update**
   - Edit a document's title or dates (if UI allows)
   - Verify changes persist

4. **Dashboard Quick Actions**
   - Click "New Lead" → Should navigate to Leads page with dialog open
   - Click "New Task" → Should navigate to Tasks page with dialog open
   - Verify "New Engagement" and "New Contact" buttons are removed

