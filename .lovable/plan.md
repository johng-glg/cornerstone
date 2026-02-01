
# Implementation Plan: Remaining Phase 1-3 Items

## Overview

This plan completes three items to finalize Phases 1-3:
1. **LitigationDocumentsStep** - Add actual file upload capability to the wizard
2. **Client Documents Tab** - Build out the documents tab for clients
3. **Settings Page** - Create a functional settings page

---

## 1. LitigationDocumentsStep File Upload

### Current State
The `LitigationDocumentsStep.tsx` uses checkboxes to confirm document receipt and shows a "coming soon" placeholder for file uploads.

### Changes
Replace the placeholder with the existing `DocumentFileUpload` component to allow actual file uploads during the wizard flow.

**Key Considerations:**
- During the wizard, we don't have a `matter_id` yet (the matter is created at the end)
- Solution: Use a temporary folder path (e.g., `temp/{leadId}/`) for uploads during the wizard
- After conversion, documents can be associated with the created matter

**File Changes:**
- `src/components/litigation/steps/LitigationDocumentsStep.tsx`
  - Import and use `DocumentFileUpload` component
  - Create simplified upload components for complaint and summons
  - Store uploaded URLs in the wizard data for later association

---

## 2. Client Documents Tab

### Current State
The Documents tab in `ClientDetail.tsx` shows a placeholder: "Documents feature coming soon..."

### Database Design
Create a new `client_documents` table to store client-level documents (contracts, IDs, disclosures, etc.)

**Schema:**
```text
client_documents
├── id (uuid, PK)
├── client_id (uuid, FK → clients)
├── document_type (text) - e.g., 'id_verification', 'contract', 'disclosure', 'correspondence', 'other'
├── title (text)
├── file_url (text)
├── notes (text, nullable)
├── uploaded_by (uuid, FK → staff, nullable)
├── created_at (timestamp)
```

**New Files:**
- `src/hooks/useClientDocuments.ts` - CRUD hooks following the same pattern as `useLitigationDocuments`
- `src/components/clients/detail/ClientDocumentsTab.tsx` - Document list with upload capability
- `src/components/clients/ClientDocumentFormDialog.tsx` - Form dialog for adding/editing documents

**RLS Policies:**
- Staff can view/manage documents for clients in their company hierarchy

---

## 3. Settings Page

### Current State
Inline placeholder in `App.tsx`: `"Settings coming soon..."`

### Proposed Settings Sections

| Section | Description | Data Source |
|---------|-------------|-------------|
| **Profile** | User's own name, email, avatar, phone | `staff` table (current user) |
| **Notifications** | Email/in-app notification preferences | Future `user_preferences` table or local state |
| **Company** | View company info (read-only for most) | `companies` table |
| **Appearance** | Theme toggle (light/dark) | Local storage / next-themes |

**New Files:**
- `src/pages/Settings.tsx` - Full settings page with tabs
- `src/components/settings/ProfileSettingsTab.tsx` - Edit profile info
- `src/components/settings/AppearanceSettingsTab.tsx` - Theme toggle
- `src/components/settings/CompanySettingsTab.tsx` - View company info

**Implementation Notes:**
- Use the existing `next-themes` package for dark/light mode toggle
- Profile updates will use a new `useUpdateCurrentStaff` mutation
- Keep it simple for Phase 3 - notifications can be enhanced later

---

## Technical Details

### Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useClientDocuments.ts` | CRUD hooks for client documents |
| `src/components/clients/detail/ClientDocumentsTab.tsx` | Documents tab UI |
| `src/components/clients/ClientDocumentFormDialog.tsx` | Add/edit document dialog |
| `src/pages/Settings.tsx` | Main settings page |
| `src/components/settings/ProfileSettingsTab.tsx` | Profile editing |
| `src/components/settings/AppearanceSettingsTab.tsx` | Theme settings |
| `src/components/settings/CompanySettingsTab.tsx` | Company info display |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/litigation/steps/LitigationDocumentsStep.tsx` | Add file upload UI |
| `src/pages/ClientDetail.tsx` | Enable Documents tab, render new component |
| `src/App.tsx` | Replace inline SettingsPage with proper import |
| `src/hooks/useStaff.ts` | Add `useUpdateCurrentStaff` mutation |

### Database Migration

Create `client_documents` table with RLS policies for document storage at the client level.

---

## Implementation Order

1. **Database Migration** - Create `client_documents` table
2. **LitigationDocumentsStep** - Add upload capability (quick win)
3. **Client Documents Tab** - Hook, dialog, and tab component
4. **Settings Page** - Profile, appearance, and company tabs
5. **App.tsx Update** - Wire up the new Settings page

---

## Testing Checklist

After implementation:

1. **Litigation Wizard Documents**
   - Start a litigation conversion
   - Reach the Documents step
   - Upload a complaint document
   - Verify file appears and can be removed
   - Complete conversion successfully

2. **Client Documents Tab**
   - Open a client's detail page
   - Go to Documents tab (should now be enabled)
   - Click "Add Document"
   - Upload a file (e.g., PDF)
   - Verify document appears in list with download link

3. **Settings Page**
   - Navigate to Settings from sidebar or user menu
   - **Profile Tab**: Update phone number, verify it saves
   - **Appearance Tab**: Toggle dark/light mode
   - **Company Tab**: Verify company info displays correctly
