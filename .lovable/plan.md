
# Complete Missing Phase 1 Pieces

## Current State Analysis

After reviewing the codebase, here's what exists:

**Completed:**
- Authentication system with login/signup (src/lib/auth.tsx, src/pages/Auth.tsx)
- Full database schema with 17 tables and RLS policies
- App shell with sidebar, top nav, and routing
- Dashboard with mock data
- Lead Management (Phase 2) - fully functional

**Missing Phase 1 Components:**
1. **Contacts Module** - currently shows "coming soon" placeholder
2. **Engagements Module** - currently shows "coming soon" placeholder  
3. **Tasks Module** - currently shows "coming soon" placeholder

---

## Implementation Plan

### 1. Contacts Module

**New Files:**
- `src/hooks/useContacts.ts` - TanStack Query hooks for contacts CRUD
- `src/pages/Contacts.tsx` - Main contacts list page with table view
- `src/components/contacts/ContactFormDialog.tsx` - Create/edit contact form
- `src/components/contacts/ContactDetailSheet.tsx` - View contact details, phones, addresses
- `src/components/contacts/ContactPhoneForm.tsx` - Add/edit phone numbers
- `src/components/contacts/ContactAddressForm.tsx` - Add/edit addresses

**Features:**
- Contact list with search, pagination, and filtering
- Contact creation with required fields (first name, last name, email)
- Phone number management (multiple phones with types: mobile, home, work, fax)
- Address management (multiple addresses with types: home, work, mailing)
- TCPA consent tracking with timestamp
- Preferred contact method selection
- View engagements linked to a contact
- Notes field with SSN/DOB (display masked for security)

### 2. Engagements Module

**New Files:**
- `src/hooks/useEngagements.ts` - TanStack Query hooks for engagements CRUD
- `src/pages/Engagements.tsx` - Main engagements list page
- `src/components/engagements/EngagementFormDialog.tsx` - Create engagement form
- `src/components/engagements/EngagementDetailSheet.tsx` - View engagement details
- `src/components/engagements/EngagementContactsSection.tsx` - Manage engagement-contact relationships
- `src/components/engagements/EngagementServicesSection.tsx` - Manage services assigned to engagement

**Features:**
- Engagement list with status filtering (prospect, active, suspended, closed)
- Auto-generated engagement numbers (ENG-2026-0001)
- Primary contact assignment
- Multiple contact relationships (primary_client, co_client, spouse, authorized_contact)
- Service assignment (Debt Resolution, Consumer Defense, Hybrid)
- Status management and enrolled date tracking
- View linked liabilities and tasks

### 3. Tasks Module

**New Files:**
- `src/hooks/useTasks.ts` - TanStack Query hooks for tasks CRUD
- `src/pages/Tasks.tsx` - Main tasks page with table and Kanban views
- `src/components/tasks/TaskFormDialog.tsx` - Create/edit task form
- `src/components/tasks/TaskDetailSheet.tsx` - View task details
- `src/components/tasks/TaskKanban.tsx` - Kanban board for task status

**Features:**
- Task list with filtering by status, priority, assignee
- Task creation with title, description, priority (low, medium, high, urgent)
- Task types: follow_up, document_review, court_deadline, settlement_negotiation, client_call, general
- Due date management with overdue highlighting
- Task assignment to staff members
- Link tasks to entities (engagement, liability, lead)
- Kanban view by status (pending, in_progress, completed, cancelled)
- "My Tasks" filter for current user

---

## File Changes

### Update App.tsx
- Import new page components (Contacts, Engagements, Tasks)
- Remove placeholder inline components

### Summary of New Files

| Module | Files Created |
|--------|---------------|
| Contacts | 6 new files (1 hook, 1 page, 4 components) |
| Engagements | 5 new files (1 hook, 1 page, 3 components) |
| Tasks | 5 new files (1 hook, 1 page, 3 components) |

**Total: 16 new files**

---

## UI Patterns (Following Lead Management)

All components will follow the established patterns from the Lead Management module:

- **Page Layout**: Header with title and primary action button, filters row, content area
- **Data Tables**: Using Shadcn Table component with skeleton loading states
- **Forms**: React Hook Form + Zod validation in Dialog components
- **Detail Views**: Sheet component sliding in from the right
- **Loading States**: Skeleton components during data fetching
- **Toast Notifications**: Success/error feedback for all mutations
- **Status Badges**: Color-coded badges matching the Guardian brand

---

## Technical Details

### Data Hooks Pattern
```typescript
// Example structure for all hooks
export function useContacts() { /* list query */ }
export function useContact(id) { /* single item query */ }
export function useCreateContact() { /* mutation */ }
export function useUpdateContact() { /* mutation */ }
export function useDeleteContact() { /* mutation */ }
```

### Form Validation
All forms use Zod schemas for validation with:
- Required field validation
- Email format validation
- Phone number format (optional)
- Date validation for due dates

### Related Data Loading
- Contacts load with phones and addresses
- Engagements load with primary contact, services, and contact relationships
- Tasks load with assigned staff and linked entity details

---

## Execution Order

1. **Create hooks first** - useContacts, useEngagements, useTasks
2. **Create form components** - reusable dialogs for create/edit
3. **Create detail sheets** - view components with related data
4. **Create main pages** - list views with filters and actions
5. **Update App.tsx** - wire up the new pages to routes

Each module is independent and can be built in parallel, but I'll create them in order: Contacts, Engagements, Tasks.
