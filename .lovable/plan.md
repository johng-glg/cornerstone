
# Phase 5 Completion: Court Calendar and Role-Based Dashboards

## Overview

This plan implements the remaining Phase 5 items:
1. **Court Calendar View** - A global calendar showing all hearings across matters
2. **Litigation Attorney Dashboard** - Role-specific dashboard for attorneys
3. **Case Manager Dashboard** - Role-specific dashboard for case managers

---

## 1. Court Calendar View

### Description
A dedicated calendar view showing all litigation hearings across all matters, with filtering by attorney, court, case type, and urgency-based color coding.

### New Hook: `useAllHearings`
Create a hook to fetch all hearings with their associated matter and client data:

```text
litigation_hearings
  + litigation_matter (case_number, court_name, county, state, status, opposing_party)
    + client_service (service_number)
      + primary_client (first_name, last_name)
  + staff assignments (for attorney filtering)
```

### New Component: `CourtCalendar.tsx`
Located at `src/components/litigation/CourtCalendar.tsx`

**Features:**
- Month/Week view toggle using existing `react-day-picker` Calendar component as base
- Custom day cells showing hearing count badges
- Click-through to hearing details
- Color coding by urgency:
  - Red: Response deadline within 7 days
  - Orange: Hearing within 14 days  
  - Blue: Upcoming hearings
  - Gray: Past hearings with outcome
  - Yellow: Past hearings needing outcome
- Filter panel:
  - Attorney filter (from assignments)
  - Court filter
  - Hearing type filter
  - Date range (7, 14, 30 days or custom)
- Export to iCal (generate .ics file for download)

### New Page: `CourtCalendarPage.tsx`
Located at `src/pages/CourtCalendar.tsx`

### Routing
Add new route at `/litigation/calendar`

---

## 2. Litigation Attorney Dashboard

### Description
A specialized dashboard for attorneys showing their caseload, upcoming deadlines, and actions needed.

### New Component: `AttorneyDashboard.tsx`
Located at `src/components/dashboards/AttorneyDashboard.tsx`

**Dashboard Widgets:**

| Widget | Data Source |
|--------|-------------|
| Active Cases by Status | `litigation_matters` filtered by attorney assignment, grouped by status |
| Upcoming Court Deadlines (14 days) | `litigation_hearings` + response deadlines from matters |
| Cases Requiring Action | Matters with pending tasks or missing outcomes |
| Recent Case Events | `litigation_activities` for assigned matters |
| My Tasks (7 days) | `tasks` assigned to current staff, linked to litigation entities |

**Filters:**
- Filter by matter status
- Quick links to full Litigation page with pre-applied filters

### Integration
The existing Dashboard page will detect when the logged-in user has the `attorney` role or `attorney` department and show this dashboard content.

---

## 3. Case Manager Dashboard

### Description
A specialized dashboard for case managers focused on document prep, deadlines, and task completion.

### New Component: `CaseManagerDashboard.tsx`
Located at `src/components/dashboards/CaseManagerDashboard.tsx`

**Dashboard Widgets:**

| Widget | Data Source |
|--------|-------------|
| My Assigned Cases | `assignments` where staff_id = current user, type = case_manager |
| My Tasks (7 days) | `tasks` assigned to current staff |
| Upcoming Deadlines | Response deadlines + hearing dates for assigned matters |
| Document Prep Queue | Documents pending upload for assigned matters |
| Recent Activity | `litigation_activities` for assigned matters |

**Filters:**
- Filter by priority
- Filter by deadline proximity

### Integration
The existing Dashboard page will detect when the logged-in user has the `case_manager` role or department and show this dashboard content.

---

## Technical Details

### Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useAllHearings.ts` | Fetch all hearings with related data for calendar |
| `src/hooks/useAssignedMatters.ts` | Fetch matters assigned to current staff |
| `src/components/litigation/CourtCalendar.tsx` | Calendar component with month/week views |
| `src/components/litigation/CalendarDayCell.tsx` | Custom day cell showing hearings |
| `src/components/litigation/HearingListPopover.tsx` | Popover showing hearings for selected day |
| `src/pages/CourtCalendar.tsx` | Court calendar page |
| `src/components/dashboards/AttorneyDashboard.tsx` | Attorney-specific dashboard |
| `src/components/dashboards/CaseManagerDashboard.tsx` | Case manager-specific dashboard |
| `src/components/dashboards/DashboardMetricCard.tsx` | Reusable metric card component |
| `src/components/dashboards/DeadlinesList.tsx` | Shared deadlines list component |
| `src/components/dashboards/RecentActivityFeed.tsx` | Shared activity feed component |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Add role detection, render appropriate dashboard |
| `src/pages/Litigation.tsx` | Add "Calendar View" button in header |
| `src/App.tsx` | Add `/litigation/calendar` route |
| `src/components/layout/AppSidebar.tsx` | Add Calendar sub-item under Litigation (optional) |

### No Database Changes Required
All data already exists in the schema:
- `litigation_hearings` - has scheduled_date, hearing_type, location, judge, outcome
- `litigation_matters` - has response_deadline, next_hearing_date, status
- `assignments` - has staff assignments with assignment_type
- `tasks` - has entity_type for linking to litigation_matter

---

## Implementation Order

1. **Hooks First**
   - `useAllHearings.ts` - fetch all hearings with nested data
   - `useAssignedMatters.ts` - fetch matters for current staff

2. **Shared Dashboard Components**
   - `DashboardMetricCard.tsx`
   - `DeadlinesList.tsx`
   - `RecentActivityFeed.tsx`

3. **Court Calendar**
   - `CourtCalendar.tsx` and supporting components
   - `CourtCalendarPage.tsx`
   - Route and navigation updates

4. **Attorney Dashboard**
   - `AttorneyDashboard.tsx`
   - Dashboard.tsx integration

5. **Case Manager Dashboard**
   - `CaseManagerDashboard.tsx`
   - Dashboard.tsx integration

---

## UI Preview

### Court Calendar Layout
```text
+--------------------------------------------------+
| Court Calendar                     [Month] [Week] |
+--------------------------------------------------+
| Filters: [Attorney v] [Court v] [Type v] [Export] |
+--------------------------------------------------+
|  Sun   Mon   Tue   Wed   Thu   Fri   Sat        |
|  --    --    --     1     2     3     4         |
|                    [2]   [1]                     |
|   5     6     7     8     9    10    11         |
|        [3]         [1]  [2*]                     |
|  ... (red badge = urgent deadline)               |
+--------------------------------------------------+
| Selected: Feb 6, 2026                            |
| > Status Conference - Smith v. Capital One 10am  |
| > Motion Hearing - Jones v. Chase 2pm            |
| > Trial Prep - Williams v. Amex 4pm              |
+--------------------------------------------------+
```

### Attorney Dashboard Layout
```text
+--------------------------------------------------+
| Attorney Dashboard                                |
+--------------------------------------------------+
| [24]        [8]          [3]          [12]       |
| Active     Pre-Response  Deadlines    Tasks      |
| Cases      Cases         This Week    Pending    |
+--------------------------------------------------+
| Upcoming Deadlines         | Cases Needing Action|
| > Response due: Feb 4      | > Outcome pending   |
| > Hearing: Feb 6 10am      | > Settlement review |
| > Motion deadline: Feb 8   | > Document request  |
+--------------------------------------------------+
| Recent Case Activity                              |
| > Status changed: Smith v. Capital One           |
| > Hearing scheduled: Jones v. Chase              |
+--------------------------------------------------+
```

---

## Testing Checklist

1. **Court Calendar**
   - View calendar and see hearings displayed on correct dates
   - Filter by attorney and verify only their hearings show
   - Click a date to see hearing details in popover
   - Verify color coding matches urgency rules
   - Test iCal export downloads valid .ics file

2. **Attorney Dashboard**
   - Log in as user with attorney role/department
   - Verify dashboard shows attorney-specific widgets
   - Verify case counts match actual assigned matters
   - Verify deadlines are accurate and sorted by date
   - Click "View All" links navigate correctly

3. **Case Manager Dashboard**
   - Log in as user with case_manager role/department
   - Verify dashboard shows case manager widgets
   - Verify task list shows only assigned tasks
   - Verify document queue shows matters needing docs
