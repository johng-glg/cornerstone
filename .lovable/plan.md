
# Client-Centric Architecture Implementation Plan

## Overview

This plan transforms the current fragmented navigation pattern into a comprehensive Client Hub where users can view and manage everything about a client without context-switching between modules.

---

## Current State Analysis

**Problem Identified:**
- Client Detail Sheet shows only basic contact info (name, phones, addresses)
- Users must navigate separately to Services, Liabilities, Payments, Tasks to see related data
- No cross-linking between entities
- Information scattered across 5+ different pages

**Current Components:**
- `ClientDetailSheet.tsx` - 245 lines, 3 tabs (Details, Phones, Addresses)
- `ServiceDetailSheet.tsx` - 424 lines, comprehensive but service-focused
- Separate pages for Liabilities, Payments, Tasks

**Database Relationships Available:**
- `client_services.primary_client_id` links to `clients.id`
- `liabilities.client_service_id` links to services
- `transactions.client_service_id` links to services
- `tasks.entity_type` + `entity_id` can reference clients

---

## Architecture Decision

**Approach: Convert Sheet to Full-Page View**

The current slide-out sheet is too constrained for a comprehensive client hub. The solution will:

1. Replace the side-panel `ClientDetailSheet` with a new full-page `ClientDetailPage`
2. Use URL routing (`/clients/:id`) for proper navigation
3. Implement tabbed interface with all client data consolidated
4. Keep Services page as an admin/oversight view with lightweight service detail sheets

---

## Implementation Phases

### Phase 1: Data Layer - New Hooks for Client-Centric Queries

**New File: `src/hooks/useClientData.ts`**

Create aggregated hooks to fetch all client-related data:

```text
Functions to create:
- useClientServicesForClient(clientId) - All services for a client
- useLiabilitiesForClient(clientId) - All liabilities across all client services  
- useTransactionsForClient(clientId) - All transactions across all client services
- useTasksForClient(clientId) - All tasks linked to client or their services
- useClientActivitySummary(clientId) - Aggregated stats for Overview tab
```

These will be efficient queries that join through the `client_services` table.

---

### Phase 2: Client Detail Page Component Structure

**New File: `src/pages/ClientDetail.tsx`**

```text
ClientDetailPage
+-- Header Section
|   +-- Client name, email, primary phone
|   +-- Status badges (Active, TCPA, Preferred Contact)
|   +-- Quick Actions: [Log Communication] [Schedule Call] [Upload Document] [Edit]
|
+-- Tabs Container
    +-- Overview Tab (default)
    |   +-- ServicesSummaryCard (collapsed cards for each service)
    |   +-- RecentActivityCard (last 5-10 activities)
    |   +-- UpcomingCard (next payment, scheduled tasks)
    |
    +-- Services Tab
    |   +-- Full list of all services with expandable details
    |   +-- Each service shows status badges, financials, team
    |   +-- Click to expand inline (not navigate away)
    |
    +-- Liabilities Tab
    |   +-- Table of all liabilities across ALL services
    |   +-- Columns: Creditor, Type, Balance, Status, Service#
    |   +-- Click to open LiabilityDetailSheet
    |
    +-- Payments Tab
    |   +-- Transaction history across ALL services
    |   +-- Date, Amount, Type, Status, Service#
    |
    +-- Tasks Tab
    |   +-- All tasks linked to client or their services
    |   +-- Status, Priority, Due Date, Assignee
    |
    +-- Details Tab (formerly the only content)
    |   +-- Contact info, DOB, notes
    |   +-- Phone numbers (add/delete)
    |   +-- Addresses (add/delete)
    |
    +-- Activity Tab
        +-- Complete timeline of all changes/events
```

---

### Phase 3: New Sub-Components

**New Directory: `src/components/clients/detail/`**

| Component | Purpose |
|-----------|---------|
| `ClientHeader.tsx` | Name, contact info, badges, quick actions |
| `ClientOverviewTab.tsx` | Summary cards for services, activity, upcoming |
| `ClientServicesTab.tsx` | Expandable service cards with inline details |
| `ClientLiabilitiesTab.tsx` | Table of all liabilities with filtering |
| `ClientPaymentsTab.tsx` | Transaction history table |
| `ClientTasksTab.tsx` | Task list with quick status updates |
| `ClientDetailsTab.tsx` | Contact info, phones, addresses (refactor from existing) |
| `ClientActivityTab.tsx` | Complete activity timeline |
| `ServiceSummaryCard.tsx` | Compact service card for Overview tab |

---

### Phase 4: Routing and Navigation Updates

**File: `src/App.tsx`**

Add new route:
```text
/clients/:id -> ClientDetailPage
```

**File: `src/pages/Clients.tsx`**

Update click handler to navigate to `/clients/${client.id}` instead of opening sheet.

**File: `src/components/services/ServiceDetailSheet.tsx`**

Add prominent "View Full Client Profile" link/button that navigates to `/clients/${clientId}`.

---

### Phase 5: Service Detail Sheet Simplification

Make the existing `ServiceDetailSheet` lighter-weight and service-focused:

- Add client name as clickable link to client profile
- Keep Status, Program, Financials tabs
- Add "View Full Client Profile" as primary action
- Remove duplicated client contact info

---

## File Changes Summary

### New Files (10 files)
```text
src/pages/ClientDetail.tsx
src/hooks/useClientData.ts
src/components/clients/detail/ClientHeader.tsx
src/components/clients/detail/ClientOverviewTab.tsx
src/components/clients/detail/ClientServicesTab.tsx
src/components/clients/detail/ClientLiabilitiesTab.tsx
src/components/clients/detail/ClientPaymentsTab.tsx
src/components/clients/detail/ClientTasksTab.tsx
src/components/clients/detail/ClientDetailsTab.tsx
src/components/clients/detail/ServiceSummaryCard.tsx
```

### Modified Files (4 files)
```text
src/App.tsx - Add /clients/:id route
src/pages/Clients.tsx - Change row click to navigate
src/components/services/ServiceDetailSheet.tsx - Add client link
src/components/layout/AppSidebar.tsx - Ensure Clients is prominent
```

### Deprecated (keep for now)
```text
src/components/clients/ClientDetailSheet.tsx - Can be removed after migration
```

---

## Technical Details

### Data Query Strategy

The Overview tab aggregates data efficiently:

```text
Services Summary Query:
- Count of active services
- Total enrolled debt across services
- Total settled amount
- Settlement percentage

Liabilities Aggregation:
- Join through client_services to get all liabilities
- Group by status for summary counts

Recent Activity:
- Query service_status_history
- Query liability_actions  
- Combine and sort by timestamp
```

### URL Structure
```text
/clients              - Client list (existing)
/clients/:id          - Client detail hub (new)
/clients/:id/services - Direct link to services tab
/clients/:id/tasks    - Direct link to tasks tab
```

### State Management

Each tab lazy-loads its data when activated to avoid over-fetching:
```text
<TabsContent value="liabilities">
  <Suspense fallback={<Skeleton />}>
    <ClientLiabilitiesTab clientId={id} />
  </Suspense>
</TabsContent>
```

---

## UI/UX Specifications

### Client Header
- Full width, fixed at top of detail page
- Client avatar/initials circle
- Name prominently displayed (24px bold)
- Email and primary phone on second line
- Badge row: Status | TCPA | Preferred Contact
- Action buttons aligned right: Log Comm, Schedule, Upload, Edit

### Tab Navigation
- Horizontal tabs below header
- Sticky when scrolling
- 8 tabs total: Overview, Services, Liabilities, Payments, Tasks, Comms, Documents, Activity
- Note: Communications and Documents tabs will show "Coming Soon" placeholder initially

### Overview Tab Cards
- Services card shows 2-3 most recent/active services
- Each service card is clickable to expand
- Shows: Status badges, enrolled debt, settled %, team members
- "View All Services" link if more than 3

### Responsive Behavior
- Tabs stack vertically on mobile
- Tables become card lists on mobile
- Quick actions collapse to dropdown menu

---

## Implementation Order

1. **Data Layer First**: Create `useClientData.ts` with all aggregation hooks
2. **Page Shell**: Create `ClientDetail.tsx` with header and empty tabs
3. **Overview Tab**: Build summary cards with real data
4. **Details Tab**: Refactor existing phone/address management
5. **Services Tab**: Create expandable service cards
6. **Liabilities Tab**: Table with all debts across services
7. **Payments Tab**: Transaction history table
8. **Tasks Tab**: Task list with filters
9. **Navigation**: Update routing and click handlers
10. **Service Sheet**: Add client profile link

---

## Success Metrics

After implementation, users should be able to:
- Open a client and see ALL their services immediately
- View total debt and settlement progress without navigation
- See recent activity across all services
- Access any related data without leaving the client page
- Navigate to full client view from any service detail

---

## Dependencies

- Existing components: Badge, Card, Table, Tabs, Sheet
- Existing hooks: useClient, useClientServices, useLiabilities, useTransactions, useTasks
- No new npm packages required
- No database schema changes needed
