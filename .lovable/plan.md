

# Remaining Work for Phases 1-3

## Current Status

Priority 1 and Priority 2 fixes have been successfully implemented. After a thorough review, here's what remains:

---

## Remaining Gap (Priority 1 - Quick Fix)

### Staff Attribution on Status Change UI

**Issue Found:** The `handleStatusChange` function in `LitigationMatterDetailSheet` doesn't pass `staffId` to the mutation, even though the hook now supports it.

**Current code:**
```typescript
const handleStatusChange = (newStatus: LitigationStatus) => {
  if (matter) {
    updateMatter.mutate({ id: matter.id, status: newStatus });
    // Missing: staffId parameter
  }
};
```

**Fix Required:**
1. Import and call `useCurrentStaff` hook in `LitigationMatterDetailSheet`
2. Pass `staffId: currentStaff?.id` when calling the mutation

**File to modify:** `src/components/litigation/LitigationMatterDetailSheet.tsx`

---

## Priority 3 Items (Remaining for Phases 1-3)

### 3.1 Complete LitigationWizard Integration

**Current State:** The wizard only updates lead fields and marks status as "converted" - it does NOT create:
- Client record
- Service record  
- Liability record
- Litigation matter record

**Required Changes:**
- Create client from lead data
- Create client_service record
- Create liability record (with debt amount, opposing party as creditor)
- Create litigation_matter record linked to the liability
- Update lead with `converted_client_id` reference

**Estimated complexity:** Medium - requires transaction-like flow creating 4 records

### 3.2 Document File Upload

**Current State:** `LitigationDocumentFormDialog` only accepts a URL text input for `file_url`. The `LitigationDocumentsStep` in the wizard shows "Upload functionality coming soon."

**Required Changes:**
- Create a Supabase storage bucket for litigation documents
- Add file upload component to document forms
- Handle file upload and generate public URL
- Store URL in `litigation_documents.file_url`

**Estimated complexity:** Medium - requires storage bucket setup

### 3.3 Reports & Settings Pages

**Current State:** Placeholder text only:
```typescript
const ReportsPage = () => <div>Reports coming soon...</div>;
const SettingsPage = () => <div>Settings coming soon...</div>;
```

These are typically built in later phases once core functionality is stable.

---

## Recommended Approach

| Priority | Item | Effort | Recommendation |
|----------|------|--------|----------------|
| **Immediate** | Staff ID on status change UI | 5 min | Fix now - single line change |
| **Phase 3** | LitigationWizard completion | 2-3 hours | Implement next |
| **Phase 3** | Document file upload | 1-2 hours | Implement after wizard |
| **Later Phase** | Reports page | TBD | Defer to Phase 4+ |
| **Later Phase** | Settings page | TBD | Defer to Phase 4+ |

---

## Implementation Plan

### Step 1: Fix Staff Attribution on Status Change (5 minutes)

Update `LitigationMatterDetailSheet.tsx`:
1. Add `useCurrentStaff` hook import and call
2. Update `handleStatusChange` to include `staffId`

### Step 2: Complete LitigationWizard (Priority 3)

This involves modifying `LitigationWizard.tsx` to:
1. Create a `clients` record from lead data (name, email, phone, address)
2. Create a `client_services` record with status 'pending'
3. Create a `liabilities` record with the debt info
4. Create a `litigation_matters` record linked to liability and service
5. Update the lead with `converted_client_id` and status 'converted'
6. Navigate to the new client's detail page on success

### Step 3: Add Document File Upload (Priority 3)

1. Create `litigation-documents` storage bucket via migration
2. Update `LitigationDocumentFormDialog` with file upload field
3. Update `LitigationDocumentsStep` in wizard with upload capability
4. Add RLS policies for document access

---

## Testing After Implementation

1. **Status Change with Staff:**
   - Change matter status via dropdown
   - Check Activity tab shows staff name on the log entry

2. **LitigationWizard Flow:**
   - Create litigation-interest lead
   - Open the lead and click Convert
   - Complete wizard steps
   - Verify: Client created, Service created, Liability created, Matter created
   - Verify: Lead shows as converted with link to client

3. **Document Upload:**
   - Open a litigation matter
   - Go to Docs tab and click Add Document
   - Upload a PDF file
   - Verify file appears in document list with download link

