
# Client Communications Tab - Phase 6 Implementation

## Overview

This plan implements a full-featured Communications tab for the Client Detail page, including call/email logging and a timeline view. This completes Phase 6 of the document/communication management functionality.

---

## Database Design

A new `client_communications` table will store all communication records tied to clients.

### Table Structure

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Primary key |
| `client_id` | uuid (FK -> clients) | The client this communication is about |
| `communication_type` | enum | Type: call, email, sms, meeting, note |
| `direction` | enum | inbound or outbound |
| `subject` | text | Subject line for emails or brief description |
| `notes` | text | Detailed notes about the communication |
| `outcome` | text | Result: answered, voicemail, no_answer, sent, received, completed |
| `contact_phone` | text | Phone number used (if applicable) |
| `contact_email` | text | Email address used (if applicable) |
| `duration_minutes` | integer | Call duration in minutes |
| `staff_id` | uuid (FK -> staff) | Staff member who logged this |
| `created_at` | timestamptz | When the record was created |
| `communication_date` | timestamptz | When the communication occurred |

### Database Enums

```text
communication_type: call, email, sms, meeting, note
communication_direction: inbound, outbound
```

### RLS Policy

Staff can access communications for clients within their company:

```text
CREATE POLICY "Staff can access client communications"
ON client_communications FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = client_communications.client_id
    AND can_access_company(auth.uid(), c.company_id)
  )
);
```

---

## Files to Create

### 1. Hook: `src/hooks/useClientCommunications.ts`

Provides CRUD operations for client communications.

**Exports:**
- `useClientCommunications(clientId)` - Fetches all communications for a client with staff info
- `useCreateClientCommunication()` - Creates a new communication record
- `useUpdateClientCommunication()` - Updates an existing record
- `useDeleteClientCommunication()` - Deletes a record

**Constants:**
- `COMMUNICATION_TYPES` - call, email, sms, meeting, note
- `COMMUNICATION_OUTCOMES` - answered, voicemail, no_answer, sent, received, completed

### 2. Tab Component: `src/components/clients/detail/ClientCommsTab.tsx`

The main Communications tab component.

**Layout:**
- Header with "Communications" title and "Log Communication" button
- Filter bar with type filter and date range
- Timeline view showing communications in reverse chronological order
- Empty state when no communications exist

**Features:**
- Grouped by date (Today, Yesterday, Last 7 Days, Older)
- Type icons: Phone for calls, Mail for emails, MessageSquare for SMS, Users for meetings, FileText for notes
- Direction indicator (inbound/outbound arrow icons)
- Outcome badges with contextual colors
- Click to view/edit, delete option
- Staff attribution shown

### 3. Form Dialog: `src/components/clients/CommunicationFormDialog.tsx`

Dialog for logging and editing communications.

**Form Fields:**
- Type (dropdown): Call, Email, SMS, Meeting, Note
- Direction (toggle): Inbound / Outbound
- Date/Time (datetime-local): When the communication occurred
- Subject (text): Brief description
- Duration (number, for calls): Minutes
- Outcome (dropdown): Contextual based on type
- Notes (textarea): Detailed notes

**Behavior:**
- Conditionally shows fields based on type:
  - Call: Shows duration, direction
  - Email: Shows direction, subject
  - SMS: Shows direction
  - Meeting: Shows duration
  - Note: Minimal fields
- Pre-fills current staff and date
- Validates required fields

### 4. Timeline Item Component: `src/components/clients/CommunicationTimelineItem.tsx`

Individual timeline entry component.

**Elements:**
- Icon based on communication type
- Direction indicator (arrow up = outbound, arrow down = inbound)
- Type label and outcome badge
- Subject/notes preview (truncated)
- Relative timestamp ("2 hours ago")
- Staff name who logged it
- Edit/Delete action buttons (on hover)

---

## Files to Modify

### 1. `src/pages/ClientDetail.tsx`

**Changes:**
- Import `ClientCommsTab`
- Enable the "comms" tab (remove `disabled` attribute)
- Replace placeholder content with `<ClientCommsTab clientId={client.id} />`

### 2. `src/components/clients/detail/ClientHeader.tsx`

**Changes:**
- Make "Log Communication" button functional
- Add `onLogCommunication` prop
- Wire click handler to open the form dialog

---

## UI Design Details

### Timeline View Layout

```text
+--------------------------------------------------+
| Communications                    [Log Communication] |
+--------------------------------------------------+
| Filter: [All Types v]           [Last 30 Days v]  |
+--------------------------------------------------+
| TODAY                                              |
|  +----------------------------------------------+ |
|  | [Phone] [->] Call - Outbound                 | |
|  |   Discussed payment schedule options         | |
|  |   Outcome: Answered                          | |
|  |   Duration: 15 min                           | |
|  |   2 hours ago • by John Smith       [Edit][X]| |
|  +----------------------------------------------+ |
|                                                    |
| YESTERDAY                                          |
|  +----------------------------------------------+ |
|  | [Mail] [<-] Email - Inbound                  | |
|  |   Re: Account Statement Request              | |
|  |   Client requested updated statement...      | |
|  |   Outcome: Received                          | |
|  |   Mar 1, 2026 2:30 PM • by Jane Doe  [Edit][X]| |
|  +----------------------------------------------+ |
+--------------------------------------------------+
```

### Form Dialog Layout

```text
+-----------------------------------------------+
| Log Communication                         [X] |
+-----------------------------------------------+
| Type:      [Call v]                           |
| Direction: (•) Outbound  ( ) Inbound          |
| Date/Time: [Feb 2, 2026 10:30 AM      ]       |
| Duration:  [15] minutes                        |
| Outcome:   [Answered v]                       |
| Subject:   [Brief description...        ]     |
| Notes:                                         |
| +-------------------------------------------+ |
| | Detailed notes about the call...          | |
| |                                           | |
| +-------------------------------------------+ |
|                                               |
|                    [Cancel] [Log Communication]|
+-----------------------------------------------+
```

### Type-Specific Icons and Colors

| Type | Icon | Color |
|------|------|-------|
| Call | Phone | blue |
| Email | Mail | green |
| SMS | MessageSquare | purple |
| Meeting | Users | orange |
| Note | FileText | gray |

### Outcome Badges

| Outcome | Used For | Color |
|---------|----------|-------|
| Answered | Call | green |
| Voicemail | Call | yellow |
| No Answer | Call | red |
| Sent | Email, SMS | blue |
| Received | Email, SMS | green |
| Completed | Meeting | green |

---

## Integration with Client Activity

The `useClientActivity` hook (used in Overview tab) should be updated to include communications in the unified activity feed. This ensures communications appear alongside liability actions, litigation activities, and status changes.

### Update to `src/hooks/useClientActivity.ts`

Add a new query section to fetch recent client communications and merge them into the activities array with type `'communication'`.

---

## Technical Details

### Query Pattern

```typescript
// Fetch communications with staff info
const { data, error } = await supabase
  .from('client_communications')
  .select(`
    *,
    staff:staff!client_communications_staff_id_fkey(
      id, first_name, last_name, avatar_url
    )
  `)
  .eq('client_id', clientId)
  .order('communication_date', { ascending: false });
```

### Form Validation

- Type: Required
- Communication Date: Required, defaults to now
- Subject: Optional for notes, recommended for emails
- Notes: Optional but encouraged
- Outcome: Required for calls and emails
- Duration: Required for calls, optional for meetings

---

## Implementation Order

1. **Database Migration**
   - Create `communication_type` and `communication_direction` enums
   - Create `client_communications` table
   - Add RLS policy

2. **Hook**
   - Create `useClientCommunications.ts` with all CRUD operations

3. **Form Dialog**
   - Create `CommunicationFormDialog.tsx` with conditional fields

4. **Timeline Item**
   - Create `CommunicationTimelineItem.tsx` component

5. **Tab Component**
   - Create `ClientCommsTab.tsx` with timeline view and filters

6. **Integration**
   - Update `ClientDetail.tsx` to enable tab and import component
   - Update `ClientHeader.tsx` to wire the Log Communication button
   - Update `useClientActivity.ts` to include communications

---

## Testing Checklist

After implementation:
- Log a call with duration and outcome
- Log an email with subject and direction
- Edit an existing communication
- Delete a communication
- Verify communications appear in the Overview Activity Log
- Test date grouping (Today, Yesterday, Older)
- Test type filtering
- Verify the "Log Communication" button in header opens the dialog
