
# Litigation Matter Detail View - Implementation Plan

## Overview
Build a comprehensive litigation matter management interface that opens when clicking on a litigation record. This will enable case tracking, activity logging, staff role assignments, court event management, and document tracking.

---

## Phase 1: Database Schema Extensions

### New Tables

**1. `litigation_activities` Table**
Tracks all activities on a litigation matter (similar to liability_actions pattern):
- `id` (uuid, primary key)
- `matter_id` (uuid, FK to litigation_matters)
- `activity_type` (text: note, status_change, hearing, filing, deadline, communication)
- `description` (text)
- `outcome` (text, nullable)
- `activity_date` (timestamp, for scheduled events)
- `staff_id` (uuid, nullable FK to staff)
- `document_url` (text, nullable)
- `created_at` (timestamp)

**2. `litigation_hearings` Table**
Dedicated tracking for court events:
- `id` (uuid, primary key)
- `matter_id` (uuid, FK to litigation_matters)
- `hearing_type` (text: status_conference, motion_hearing, trial, deposition, mediation)
- `scheduled_date` (timestamp)
- `location` (text, nullable)
- `judge_name` (text, nullable)
- `outcome` (text, nullable)
- `notes` (text, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**3. `litigation_documents` Table**
Track pleadings and documents:
- `id` (uuid, primary key)
- `matter_id` (uuid, FK to litigation_matters)
- `document_type` (text: complaint, answer, motion, discovery, subpoena, order, settlement_agreement, other)
- `title` (text)
- `file_url` (text, nullable)
- `filed_date` (date, nullable)
- `deadline_date` (date, nullable)
- `notes` (text, nullable)
- `uploaded_by` (uuid, nullable FK to staff)
- `created_at` (timestamp)

### RLS Policies
All three tables will inherit access control from the parent `litigation_matters` via `client_service_id`, following the existing pattern.

---

## Phase 2: React Hooks

### New Hooks

**`useLitigationActivities.ts`**
- `useLitigationActivities(matterId)` - Fetch activities for a matter
- `useCreateLitigationActivity()` - Add new activity

**`useLitigationHearings.ts`**
- `useLitigationHearings(matterId)` - Fetch hearings for a matter
- `useCreateLitigationHearing()` / `useUpdateLitigationHearing()` - CRUD for hearings

**`useLitigationDocuments.ts`**
- `useLitigationDocuments(matterId)` - Fetch documents for a matter
- `useCreateLitigationDocument()` / `useDeleteLitigationDocument()` - CRUD for documents

**`useMatterAssignments.ts`**
- `useMatterAssignments(matterId)` - Fetch staff assignments for entity_type='litigation_matter'
- `useAssignStaffToMatter()` / `useUnassignStaffFromMatter()` - Manage role assignments

---

## Phase 3: UI Components

### Main Detail View

**`LitigationMatterDetailSheet.tsx`**
A slide-out sheet (following existing patterns) with tabbed interface:

```text
+------------------------------------------+
|  Case #2024-CV-12345                     |
|  Plaintiff v. Client Name                |
|  [Pending Response] [In Litigation]      |
|------------------------------------------|
|  [Overview] [Team] [Events] [Docs] [Activity]
|------------------------------------------|
```

**Tab 1: Overview**
- Case information (case number, court, county/state)
- Opposing party and counsel details
- Key dates (service date, response deadline, next hearing)
- Financial summary (judgment amount, settlement amount if applicable)
- Status management with change workflow
- Edit button to open form dialog

**Tab 2: Team (Assignments)**
- List of assigned staff with their roles
- Add assignment dropdown (select staff + assignment type)
- Remove assignment option
- Supported roles from existing enum: litigation_attorney, case_manager, negotiator

**Tab 3: Events (Hearings/Deadlines)**
- List of upcoming and past hearings
- Add new hearing button
- Calendar-style view of deadlines
- Outcome tracking for completed events

**Tab 4: Documents**
- List of filed documents with dates
- Upload new document capability
- Document type categorization
- Deadline tracking for required filings

**Tab 5: Activity Timeline**
- Chronological feed of all matter activities
- Quick add activity form
- Status changes auto-logged
- Staff attribution on all entries

### Supporting Components

**`LitigationActivityTimeline.tsx`**
Timeline display component showing matter activities with icons per activity type.

**`LitigationHearingCard.tsx`**
Card component for displaying hearing details with outcome status.

**`LitigationDocumentList.tsx`**
Table/list of documents with type badges and deadline indicators.

**`MatterTeamPanel.tsx`**
Panel showing assigned staff with role badges and assignment management.

**Form Dialogs:**
- `LitigationHearingFormDialog.tsx` - Add/edit hearings
- `LitigationDocumentFormDialog.tsx` - Add documents
- `LitigationActivityFormDialog.tsx` - Log activities
- `MatterAssignmentDialog.tsx` - Assign staff roles

---

## Phase 4: Integration

### Update ClientLitigationTab
- Make each MatterCard clickable to open `LitigationMatterDetailSheet`
- Pass matter ID and control sheet open state

### Task Integration
- Display tasks linked to the matter (entity_type='litigation_matter', entity_id=matter.id)
- Quick create task button on detail sheet

### Status Change Logging
- When matter status changes via `useUpdateLitigationMatter`, auto-create activity record

---

## Technical Details

### Entity Type Extension
Need to add 'litigation_matter' to the `entity_type` enum for assignments and tasks to reference litigation matters directly.

### Assignment Types
The existing `assignment_type` enum already includes relevant roles:
- `litigation_attorney` - Primary attorney handling the matter
- `case_manager` - Staff managing case workflow
- `negotiator` - Handles settlement discussions

### Status Workflow
Maintain existing statuses from `litigation_status` enum with visual status progression indicator on the overview tab.

---

## Files to Create
1. `src/hooks/useLitigationActivities.ts`
2. `src/hooks/useLitigationHearings.ts`
3. `src/hooks/useLitigationDocuments.ts`
4. `src/hooks/useMatterAssignments.ts`
5. `src/components/litigation/LitigationMatterDetailSheet.tsx`
6. `src/components/litigation/LitigationActivityTimeline.tsx`
7. `src/components/litigation/LitigationHearingCard.tsx`
8. `src/components/litigation/LitigationDocumentList.tsx`
9. `src/components/litigation/MatterTeamPanel.tsx`
10. `src/components/litigation/LitigationHearingFormDialog.tsx`
11. `src/components/litigation/LitigationDocumentFormDialog.tsx`
12. `src/components/litigation/LitigationActivityFormDialog.tsx`
13. `src/components/litigation/MatterAssignmentDialog.tsx`

## Files to Modify
1. `src/components/clients/detail/ClientLitigationTab.tsx` - Add click handler to open detail sheet
2. `src/hooks/useLitigationMatters.ts` - Add auto-activity logging on status changes

## Database Migrations
1. Create `litigation_activities` table with RLS
2. Create `litigation_hearings` table with RLS
3. Create `litigation_documents` table with RLS
4. Add 'litigation_matter' to `entity_type` enum (if needed for task/assignment linking)
