
# Duplicate Lead Detection Implementation Plan

## Overview

This plan implements duplicate detection that identifies potential matches when creating or converting leads. The system will check for duplicates against both existing leads AND existing clients, displaying warnings with options to merge, proceed anyway, or cancel.

---

## Architecture Decision

### Detection Points

Duplicate detection will occur at three key points:

1. **Lead Creation** - Check for duplicate leads when creating a new lead
2. **Lead Edit** - Re-check if email/phone changes during edit
3. **Lead Conversion** - Block or warn if email/phone already exists in clients

### Matching Strategy

Match on multiple fields with weighted scoring:

| Field | Weight | Match Type |
|-------|--------|------------|
| Email | High (exact) | Case-insensitive exact match |
| Phone | High (exact) | Normalized digits only (strip formatting) |
| SSN Last 4 | High (exact) | Exact match when present |
| Name | Medium (fuzzy) | First + Last name case-insensitive match |

---

## Components to Create

| File | Purpose |
|------|---------|
| `src/hooks/useDuplicateDetection.ts` | Hook to check for duplicates against leads and clients |
| `src/components/leads/DuplicateWarningDialog.tsx` | Warning dialog showing potential matches with actions |

---

## Components to Modify

| File | Changes |
|------|---------|
| `src/components/leads/LeadFormDialog.tsx` | Add duplicate check before submission |
| `src/components/enrollment/EnrollmentWizard.tsx` | Block conversion if client email duplicate exists |
| `src/lib/docs/roadmapData.ts` | Update status to Completed after implementation |

---

## Technical Details

### 1. Duplicate Detection Hook (`src/hooks/useDuplicateDetection.ts`)

This hook performs parallel queries to find potential duplicates.

```typescript
interface DuplicateMatch {
  id: string;
  type: 'lead' | 'client';
  matchType: 'email' | 'phone' | 'name' | 'ssn';
  name: string;
  email?: string;
  phone?: string;
  status?: string;
  created_at: string;
  confidence: 'high' | 'medium';
}

interface UseDuplicateDetectionOptions {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  ssnLast4?: string;
  excludeLeadId?: string;  // Exclude current lead when editing
}

function useDuplicateDetection(options: UseDuplicateDetectionOptions)
```

**Query Logic:**

```typescript
// Check leads table
async function checkLeadDuplicates(options) {
  const { email, phone, firstName, lastName, excludeLeadId } = options;
  const matches: DuplicateMatch[] = [];
  
  // Email match (high confidence)
  if (email) {
    const { data } = await supabase
      .from('leads')
      .select('id, first_name, last_name, email, phone, status, created_at')
      .ilike('email', email)
      .neq('id', excludeLeadId || '')
      .limit(5);
    // Add to matches with confidence: 'high', matchType: 'email'
  }
  
  // Phone match (high confidence) - normalize phone first
  if (phone) {
    const normalizedPhone = phone.replace(/\D/g, '');
    const { data } = await supabase
      .from('leads')
      .select('id, first_name, last_name, email, phone, status, created_at')
      .ilike('phone', `%${normalizedPhone.slice(-10)}%`)
      .neq('id', excludeLeadId || '')
      .limit(5);
    // Add to matches with confidence: 'high', matchType: 'phone'
  }
  
  // Name match (medium confidence)
  if (firstName && lastName) {
    const { data } = await supabase
      .from('leads')
      .select('id, first_name, last_name, email, phone, status, created_at')
      .ilike('first_name', firstName)
      .ilike('last_name', lastName)
      .neq('id', excludeLeadId || '')
      .limit(5);
    // Add to matches with confidence: 'medium', matchType: 'name'
  }
  
  return deduplicateMatches(matches);
}

// Similar function for clients, including phone join
async function checkClientDuplicates(options) {
  // Query clients table with client_phones join
  // Match on email, phone (via join), and name
}
```

### 2. Duplicate Warning Dialog (`src/components/leads/DuplicateWarningDialog.tsx`)

A modal that displays potential duplicates and offers actions.

**Features:**
- Shows list of potential matches with confidence indicators
- Groups by match type (email, phone, name)
- Shows relevant details: name, email, phone, status, created date
- Action buttons: "View Existing", "Proceed Anyway", "Cancel"
- For client matches during conversion: stricter blocking

**UI Structure:**

```text
+--------------------------------------------------+
|  ⚠️  Potential Duplicates Found                   |
+--------------------------------------------------+
|  We found existing records that may match this   |
|  lead. Please review before proceeding.          |
|                                                  |
|  ┌──────────────────────────────────────────┐   |
|  │ 🔴 HIGH: Email Match                      │   |
|  │ ┌────────────────────────────────────┐   │   |
|  │ │ John Smith (Lead #L-000123)        │   │   |
|  │ │ john@example.com | (555) 123-4567  │   │   |
|  │ │ Status: Contacted | Created 2d ago │   │   |
|  │ │                        [View Lead] │   │   |
|  │ └────────────────────────────────────┘   │   |
|  └──────────────────────────────────────────┘   |
|                                                  |
|  ┌──────────────────────────────────────────┐   |
|  │ 🟡 MEDIUM: Name Match                     │   |
|  │ ┌────────────────────────────────────┐   │   |
|  │ │ John Smith (Client)                 │   │   |
|  │ │ Active Service: SVC-000456          │   │   |
|  │ │                       [View Client] │   │   |
|  │ └────────────────────────────────────┘   │   |
|  └──────────────────────────────────────────┘   |
|                                                  |
|  [Cancel]              [Proceed Anyway] [Merge*] |
+--------------------------------------------------+
* Merge option for lead-to-lead duplicates only
```

**Props:**

```typescript
interface DuplicateWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matches: DuplicateMatch[];
  mode: 'create' | 'convert';
  onProceed: () => void;
  onViewMatch: (match: DuplicateMatch) => void;
  onMerge?: (targetLeadId: string) => void;  // Future: merge functionality
}
```

### 3. LeadFormDialog Integration

**Changes to `src/components/leads/LeadFormDialog.tsx`:**

```typescript
// Add state for duplicate checking
const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
const [pendingSubmit, setPendingSubmit] = useState<LeadFormData | null>(null);

// Modify onSubmit to check for duplicates first
const onSubmit = async (data: LeadFormData) => {
  // Check for duplicates before creating/updating
  const matches = await checkForDuplicates({
    email: data.email,
    phone: data.phone,
    firstName: data.first_name,
    lastName: data.last_name,
    excludeLeadId: lead?.id,
  });
  
  if (matches.length > 0) {
    setDuplicateMatches(matches);
    setPendingSubmit(data);
    setShowDuplicateWarning(true);
    return;
  }
  
  // No duplicates, proceed with submission
  await performSubmit(data);
};

const handleProceedAnyway = async () => {
  if (pendingSubmit) {
    await performSubmit(pendingSubmit);
    setShowDuplicateWarning(false);
    setPendingSubmit(null);
  }
};
```

### 4. EnrollmentWizard Integration

**Changes to `src/components/enrollment/EnrollmentWizard.tsx`:**

Add duplicate check at the start of the wizard (eligibility step) or before final submission.

```typescript
// In ClientInfoStep or before handleComplete
const checkClientDuplicate = async () => {
  if (!data.email) return null;
  
  const { data: existingClients } = await supabase
    .from('clients')
    .select('id, first_name, last_name, email')
    .ilike('email', data.email)
    .eq('is_active', true)
    .limit(1);
  
  if (existingClients?.length) {
    return existingClients[0];
  }
  return null;
};

// Show blocking dialog if client email exists
// "This email is already associated with an existing client. 
//  Please update the lead's email or contact the existing client."
```

---

## Matching Logic Details

### Phone Normalization

```typescript
function normalizePhone(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  // Return last 10 digits (US phone number)
  return digits.slice(-10);
}

function phonesMatch(phone1: string, phone2: string): boolean {
  return normalizePhone(phone1) === normalizePhone(phone2);
}
```

### Email Normalization

```typescript
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
```

### Deduplication

When the same record matches on multiple criteria (e.g., same lead matches on both email AND phone), deduplicate the results:

```typescript
function deduplicateMatches(matches: DuplicateMatch[]): DuplicateMatch[] {
  const seen = new Map<string, DuplicateMatch>();
  
  for (const match of matches) {
    const key = `${match.type}-${match.id}`;
    const existing = seen.get(key);
    
    if (!existing || match.confidence === 'high') {
      // Keep highest confidence match or combine match types
      seen.set(key, {
        ...match,
        matchType: existing 
          ? `${existing.matchType}, ${match.matchType}` 
          : match.matchType,
      });
    }
  }
  
  return Array.from(seen.values());
}
```

---

## User Experience Flow

### Creating a New Lead

```text
User fills out lead form
         ↓
User clicks "Create Lead"
         ↓
System checks for duplicates (leads + clients)
         ↓
    ┌────┴────┐
    ↓         ↓
No matches  Matches found
    ↓              ↓
Lead created  Show warning dialog
                   ↓
         ┌────────┴────────┐
         ↓                 ↓
   "Proceed Anyway"   "Cancel"/"View"
         ↓                 ↓
   Lead created       Dialog closes
```

### Converting a Lead

```text
User clicks "Convert" on lead
         ↓
Enrollment Wizard opens
         ↓
System checks if lead email exists in clients
         ↓
    ┌────┴────┐
    ↓         ↓
No match   Email exists in clients
    ↓              ↓
Continue    Show BLOCKING dialog
wizard      (cannot proceed - must update email
            or work with existing client)
```

---

## Database Considerations

### Future Enhancement: Unique Constraint

Per the roadmap notes, a unique constraint on `clients.email` could be added. However, this should be approached carefully:

1. **Current State**: No constraint, allows duplicate emails
2. **Recommended Approach**: Implement soft duplicate checking first (this plan)
3. **Future**: After data cleanup, add unique constraint:

```sql
-- Only add after ensuring no duplicate emails exist
CREATE UNIQUE INDEX clients_email_unique 
ON clients (LOWER(email)) 
WHERE email IS NOT NULL AND is_active = true;
```

This plan focuses on warning-based detection first, which is less disruptive.

---

## Files Summary

### Create (2 files)

| File | Purpose |
|------|---------|
| `src/hooks/useDuplicateDetection.ts` | Hook with duplicate checking logic |
| `src/components/leads/DuplicateWarningDialog.tsx` | Warning dialog component |

### Modify (3 files)

| File | Changes |
|------|---------|
| `src/components/leads/LeadFormDialog.tsx` | Add duplicate check before submission |
| `src/components/enrollment/EnrollmentWizard.tsx` | Add client email check before conversion |
| `src/lib/docs/roadmapData.ts` | Update status to Completed |

---

## Edge Cases

1. **Empty email/phone**: Skip matching for empty fields
2. **Self-match when editing**: Exclude current lead from results
3. **Converted leads**: Show that a lead was already converted (link to client)
4. **Inactive clients**: Optionally include/exclude inactive clients
5. **Multiple matches**: Sort by confidence, then by recency
6. **Network errors**: Show toast error, allow retry
