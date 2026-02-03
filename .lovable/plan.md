
# Opposing Counsel Lookup Field for Litigation Matters

## Overview
Replace the plain text "Opposing Counsel" input in the Litigation Matter form with a structured lookup field that allows users to:
1. Search and select from existing law firms in the Opposing Counsel Directory
2. Optionally select a specific attorney/contact at the selected firm
3. Create a new law firm or contact inline without leaving the matter form
4. Automatically associate the selected firm/contact with the matter

## Current State
- `LitigationMatterFormDialog.tsx` has a simple text `<Input>` for `opposing_counsel` (line 308-319)
- The form schema already supports `opposing_law_firm_id` and `opposing_counsel_id` fields
- The database `litigation_matters` table has foreign key columns to link to `law_firms` and `law_firm_contacts`
- `OpposingCounselSelect.tsx` component already exists with inline "Add New" functionality

## Implementation Plan

### Step 1: Update the Litigation Matter Form Dialog
**File:** `src/components/litigation/LitigationMatterFormDialog.tsx`

Changes:
1. Import the `OpposingCounselSelect` component
2. Replace the text input for `opposing_counsel` with the `OpposingCounselSelect` component
3. Wire up the component to control both `opposing_law_firm_id` and `opposing_counsel_id` form fields
4. Retain the `opposing_counsel` text field as a fallback label (auto-populate with selected firm/contact name for display purposes)

### Step 2: Enhance OpposingCounselSelect for Callbacks
**File:** `src/components/opposing-counsel/OpposingCounselSelect.tsx`

Changes:
1. Add optional `onFirmCreated` callback prop to auto-select newly created firms
2. Add optional `onContactCreated` callback prop to auto-select newly created contacts
3. Modify the `LawFirmFormDialog` and `LawFirmContactFormDialog` usage to capture the newly created IDs and trigger the callbacks

### Step 3: Update LawFirmFormDialog for onCreate Callback
**File:** `src/components/opposing-counsel/LawFirmFormDialog.tsx`

Changes:
1. Add optional `onCreated?: (firm: LawFirm) => void` prop
2. Call the callback with the newly created firm data upon successful creation
3. This allows the parent component to immediately select the new firm

### Step 4: Update LawFirmContactFormDialog for onCreate Callback
**File:** `src/components/opposing-counsel/LawFirmContactFormDialog.tsx`

Changes:
1. Add optional `onCreated?: (contact: LawFirmContact) => void` prop  
2. Call the callback with the newly created contact data upon successful creation
3. This allows the parent component to immediately select the new contact

---

## Technical Details

### Form Field Layout Change
The current layout has Opposing Party and Opposing Counsel side-by-side in a 2-column grid (lines 293-321). The new layout will:
- Keep "Opposing Party" as a standalone text input (for the creditor/plaintiff name)
- Place the "Opposing Counsel" lookup below it, spanning full width to accommodate the two-tier selection (firm + contact)

### Data Flow
```text
User selects Law Firm → opposing_law_firm_id is set
                      → opposing_counsel_id is cleared
                      → Contact dropdown becomes available

User selects Contact  → opposing_counsel_id is set

User clicks "Add New Law Firm" → Dialog opens
                                → On save, new firm is created
                                → Firm is auto-selected in dropdown

User clicks "Add New Contact"  → Dialog opens (for selected firm)
                               → On save, contact is created  
                               → Contact is auto-selected in dropdown
```

### Backwards Compatibility
- The `opposing_counsel` text field is retained for legacy data display
- When saving, if a firm/contact is selected, we'll concatenate their names into `opposing_counsel` for backwards-compatible display in lists/reports

### UI Preview
The form will show:
- **Opposing Party**: [Text Input] - for plaintiff/creditor name
- **Opposing Counsel**: 
  - [Law Firm Dropdown] with search and "Add New" option
  - [Attorney/Contact Dropdown] (only appears after firm is selected) with "Add New" option
