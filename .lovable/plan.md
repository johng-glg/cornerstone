
# Opposing Counsel Directory Implementation Plan

## Overview

This plan implements a two-tier directory system for managing opposing law firms and their individual attorney contacts. The directory will be accessible from the Administration menu and will integrate with litigation matters, replacing the current free-text `opposing_counsel` field with structured relationships.

---

## Architecture

### Data Model

```text
+------------------+       +------------------------+
|    law_firms     |       |   law_firm_contacts    |
+------------------+       +------------------------+
| id (PK)          |<------| law_firm_id (FK)       |
| name             |       | id (PK)                |
| phone            |       | first_name             |
| fax              |       | last_name              |
| email            |       | title                  |
| address_line1    |       | email                  |
| address_line2    |       | phone                  |
| city             |       | is_active              |
| state            |       | notes                  |
| zip_code         |       | created_at             |
| notes            |       | updated_at             |
| is_active        |       +------------------------+
| created_at       |
| updated_at       |
+------------------+
          |
          |  (linked to)
          v
+------------------------+
|   litigation_matters   |
+------------------------+
| ...                    |
| opposing_law_firm_id   |  <-- NEW FK to law_firms
| opposing_counsel_id    |  <-- NEW FK to law_firm_contacts
| opposing_counsel       |  <-- Keep for backwards compat / free text
+------------------------+
```

---

## Database Changes

### New Tables

**`law_firms`** - Parent directory of opposing law firms

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | No | gen_random_uuid() | Primary key |
| name | text | No | - | Firm name (required) |
| phone | text | Yes | - | Main phone |
| fax | text | Yes | - | Fax number |
| email | text | Yes | - | General contact email |
| address_line1 | text | Yes | - | Street address |
| address_line2 | text | Yes | - | Suite/Unit |
| city | text | Yes | - | City |
| state | text | Yes | - | State (2-letter) |
| zip_code | text | Yes | - | ZIP code |
| notes | text | Yes | - | General notes |
| is_active | boolean | No | true | Soft delete flag |
| created_at | timestamptz | No | now() | |
| updated_at | timestamptz | No | now() | |

**`law_firm_contacts`** - Individual attorneys/contacts at firms

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | No | gen_random_uuid() | Primary key |
| law_firm_id | uuid | No | - | FK to law_firms |
| first_name | text | No | - | First name (required) |
| last_name | text | No | - | Last name (required) |
| title | text | Yes | - | e.g., "Partner", "Associate" |
| email | text | Yes | - | Direct email |
| phone | text | Yes | - | Direct phone |
| is_active | boolean | No | true | Soft delete flag |
| notes | text | Yes | - | Contact-specific notes |
| created_at | timestamptz | No | now() | |
| updated_at | timestamptz | No | now() | |

### Table Modifications

**`litigation_matters`** - Add two new columns

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| opposing_law_firm_id | uuid | Yes | FK to law_firms.id |
| opposing_counsel_id | uuid | Yes | FK to law_firm_contacts.id |

The existing `opposing_counsel` text field is retained for:
- Backwards compatibility with existing data
- Cases where the firm/contact isn't in the directory yet
- Free-form notes about opposing counsel

### RLS Policies

Both tables will use policies similar to the `creditors` table:
- All authenticated staff can SELECT (view)
- Only admins can INSERT, UPDATE, DELETE

### Triggers

- `update_updated_at_column` trigger on both tables to auto-update `updated_at`

---

## Files to Create

### Hooks

| File | Purpose |
|------|---------|
| `src/hooks/useLawFirms.ts` | CRUD operations for law_firms table |
| `src/hooks/useLawFirmContacts.ts` | CRUD operations for law_firm_contacts table |

### Components

| File | Purpose |
|------|---------|
| `src/components/opposing-counsel/LawFirmFormDialog.tsx` | Create/edit law firm |
| `src/components/opposing-counsel/LawFirmDetailSheet.tsx` | View firm details + contacts |
| `src/components/opposing-counsel/LawFirmContactFormDialog.tsx` | Create/edit contact at a firm |
| `src/components/opposing-counsel/OpposingCounselSelect.tsx` | Two-tier selector for litigation forms |

### Pages

| File | Purpose |
|------|---------|
| `src/pages/OpposingCounsel.tsx` | Main directory page (list of firms) |

---

## Files to Modify

### Navigation & Routing

| File | Changes |
|------|---------|
| `src/App.tsx` | Add route `/opposing-counsel` |
| `src/components/layout/AppSidebar.tsx` | Add "Opposing Counsel" to admin nav items |

### Litigation Components

| File | Changes |
|------|---------|
| `src/components/litigation/LitigationMatterFormDialog.tsx` | Replace free-text opposing counsel input with OpposingCounselSelect |
| `src/components/litigation/LitigationMatterDetailSheet.tsx` | Display linked firm/contact with click-to-view |
| `src/hooks/useLitigationMatters.ts` | Update queries to join law_firms and law_firm_contacts |

### Documentation

| File | Changes |
|------|---------|
| `src/lib/docs/roadmapData.ts` | Update status to Completed |
| `src/lib/docs/schemaData.ts` | Add law_firms and law_firm_contacts table documentation |
| `src/pages/docs/ERDPage.tsx` | Add law_firms to ERD diagram |

---

## Component Details

### OpposingCounselSelect

A two-tier dropdown component for selecting opposing counsel:

```text
+-----------------------------------------------+
| [Select Law Firm ▾]                            |
|-----------------------------------------------|
| Search firms...                               |
|-----------------------------------------------|
| + Add New Firm                                |
|-----------------------------------------------|
| Smith & Associates                            |
| Johnson Law Group                             |
| ...                                           |
+-----------------------------------------------+

(After selecting a firm, a second dropdown appears)

+-----------------------------------------------+
| [Select Contact ▾]                            |
|-----------------------------------------------|
| + Add New Contact                             |
|-----------------------------------------------|
| John Smith (Partner) - jsmith@firm.com        |
| Jane Doe (Associate)                          |
| ...                                           |
+-----------------------------------------------+
```

**Features:**
- Search/filter within dropdowns
- Quick-add buttons to create new firms/contacts inline
- Shows "(No specific contact)" option
- Displays firm + contact summary once selected

### LawFirmFormDialog

Form fields:
- Name (required)
- Phone, Fax, Email
- Address (line1, line2, city, state, zip)
- Notes

### LawFirmContactFormDialog

Form fields:
- Law Firm (pre-selected if creating from firm detail)
- First Name, Last Name (required)
- Title (e.g., "Partner", "Associate", "Paralegal")
- Email, Phone
- Notes

### LawFirmDetailSheet

A sheet that shows:
- Firm details (name, contact info, address)
- List of contacts at the firm
- Actions: Edit Firm, Add Contact, Edit Contact
- Link to matters involving this firm (future enhancement)

### OpposingCounsel Page

Layout following the Creditors page pattern:
- Search bar
- Table with columns: Firm Name, Phone, Email, Location, # Contacts, Added
- Click row to open detail sheet
- "Add Firm" button in header

---

## Integration with Litigation Matters

### Form Changes

In `LitigationMatterFormDialog.tsx`, the current opposing counsel field:

```tsx
<FormField
  name="opposing_counsel"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Opposing Counsel</FormLabel>
      <FormControl>
        <Input placeholder="Attorney/Law firm name" {...field} />
      </FormControl>
    </FormItem>
  )}
/>
```

Will be replaced with:

```tsx
<FormField
  name="opposing_law_firm_id"
  render={({ field }) => (
    <OpposingCounselSelect
      lawFirmId={field.value}
      contactId={form.watch('opposing_counsel_id')}
      onLawFirmChange={(id) => field.onChange(id)}
      onContactChange={(id) => form.setValue('opposing_counsel_id', id)}
      legacyText={form.watch('opposing_counsel')}
      onLegacyTextChange={(text) => form.setValue('opposing_counsel', text)}
    />
  )}
/>
```

The component allows:
1. Selecting from directory (sets firm_id and optionally counsel_id)
2. Typing free-text if firm not in directory (sets opposing_counsel text)

### Detail Sheet Changes

In `LitigationMatterDetailSheet.tsx`, the opposing counsel display:

```tsx
<div>
  <p className="text-muted-foreground">Opposing Counsel</p>
  <p className="font-medium">{matter.opposing_counsel || '—'}</p>
</div>
```

Will be enhanced to show structured data when available:

```tsx
<div>
  <p className="text-muted-foreground">Opposing Counsel</p>
  {matter.opposing_law_firm ? (
    <button onClick={() => openFirmDetail(matter.opposing_law_firm.id)}>
      <p className="font-medium text-primary hover:underline">
        {matter.opposing_law_firm.name}
      </p>
      {matter.opposing_counsel_contact && (
        <p className="text-sm">
          {matter.opposing_counsel_contact.first_name} {matter.opposing_counsel_contact.last_name}
          {matter.opposing_counsel_contact.title && ` (${matter.opposing_counsel_contact.title})`}
        </p>
      )}
    </button>
  ) : (
    <p className="font-medium">{matter.opposing_counsel || '—'}</p>
  )}
</div>
```

### Query Changes

The `useLitigationMatters` hook queries will be updated to join the new tables:

```typescript
.select(`
  *,
  liability:liabilities(...),
  client_service:client_services(...),
  opposing_law_firm:law_firms(id, name, phone, email),
  opposing_counsel_contact:law_firm_contacts(id, first_name, last_name, title, email, phone)
`)
```

---

## Migration SQL

```sql
-- Create law_firms table
CREATE TABLE public.law_firms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  fax text,
  email text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip_code text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create law_firm_contacts table
CREATE TABLE public.law_firm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  title text,
  email text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add columns to litigation_matters
ALTER TABLE public.litigation_matters
  ADD COLUMN opposing_law_firm_id uuid REFERENCES public.law_firms(id),
  ADD COLUMN opposing_counsel_id uuid REFERENCES public.law_firm_contacts(id);

-- Create indexes
CREATE INDEX law_firms_name_idx ON public.law_firms(name);
CREATE INDEX law_firm_contacts_law_firm_id_idx ON public.law_firm_contacts(law_firm_id);
CREATE INDEX litigation_matters_opposing_law_firm_id_idx ON public.litigation_matters(opposing_law_firm_id);

-- Enable RLS
ALTER TABLE public.law_firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.law_firm_contacts ENABLE ROW LEVEL SECURITY;

-- RLS policies for law_firms
CREATE POLICY "All staff can view law firms"
  ON public.law_firms FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage law firms"
  ON public.law_firms FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS policies for law_firm_contacts
CREATE POLICY "All staff can view law firm contacts"
  ON public.law_firm_contacts FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage law firm contacts"
  ON public.law_firm_contacts FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Add updated_at triggers
CREATE TRIGGER update_law_firms_updated_at
  BEFORE UPDATE ON public.law_firms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_law_firm_contacts_updated_at
  BEFORE UPDATE ON public.law_firm_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

---

## Files Summary

### Create (7 files)

| File | Purpose |
|------|---------|
| `src/hooks/useLawFirms.ts` | Law firms CRUD hook |
| `src/hooks/useLawFirmContacts.ts` | Law firm contacts CRUD hook |
| `src/pages/OpposingCounsel.tsx` | Directory page |
| `src/components/opposing-counsel/LawFirmFormDialog.tsx` | Firm form |
| `src/components/opposing-counsel/LawFirmDetailSheet.tsx` | Firm detail view |
| `src/components/opposing-counsel/LawFirmContactFormDialog.tsx` | Contact form |
| `src/components/opposing-counsel/OpposingCounselSelect.tsx` | Two-tier selector |

### Modify (8 files)

| File | Changes |
|------|---------|
| `src/App.tsx` | Add route |
| `src/components/layout/AppSidebar.tsx` | Add nav item |
| `src/components/litigation/LitigationMatterFormDialog.tsx` | Use new selector |
| `src/components/litigation/LitigationMatterDetailSheet.tsx` | Display linked firm/contact |
| `src/hooks/useLitigationMatters.ts` | Join new tables in queries |
| `src/lib/docs/roadmapData.ts` | Mark as Completed |
| `src/lib/docs/schemaData.ts` | Add table documentation |
| `src/pages/docs/ERDPage.tsx` | Update ERD |

---

## User Experience

### Accessing the Directory

1. Navigate to Administration > Opposing Counsel in sidebar
2. View list of all law firms
3. Click firm to see details and contacts
4. Add/edit firms and contacts as needed

### Assigning to Litigation Matter

1. Open litigation matter form (create or edit)
2. In "Opposing Counsel" section:
   - Select firm from dropdown (searchable)
   - Optionally select specific contact at that firm
   - Or type free-text if firm not in directory
3. Save matter

### Viewing on Litigation Matter

1. Open matter detail sheet
2. See clickable firm name in Case Information card
3. Click to view firm detail sheet with full contact info
