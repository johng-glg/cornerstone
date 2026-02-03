
# Plan: Litigation Team Management with Kanban View

## Overview
Add a team management feature for the litigation department, with a Kanban-style view showing staff organized by legal teams. Teams can be configured in Settings and will support future integration with matter assignment rules.

## Visual Preview

```text
Litigation Page Header:
+------------------------------------------------------------------+
| [Scale] Litigation                    [Legal Teams] [Court Cal]  |
|         120 total matters                                        |
+------------------------------------------------------------------+

Legal Teams Kanban View (/litigation/teams):
+------------------------------------------------------------------+
| Legal Teams                                       [+ New Team]   |
+------------------------------------------------------------------+
| [Team A: LA Team]     | [Team B: TX Team]     | [Unassigned]    |
| 5 members             | 3 members             | 2 members        |
+-------------------+   +-------------------+   +------------------+
| [Purple] Attorney |   | [Purple] Attorney |   | [Purple] Jane A  |
| John Smith        |   | Maria Lopez       |   |                  |
|                   |   |                   |   |                  |
| [Blue] Case Mgr   |   | [Blue] Case Mgr   |   | [Green] Bob N    |
| Sarah Jones       |   | Tom Garcia        |   |                  |
| Mike Lee          |   |                   |   |                  |
|                   |   | [Green] Negotiator|   |                  |
| [Green] Negotiator|   | Ana Williams      |   |                  |
| Chris Brown       |   |                   |   |                  |
+-------------------+   +-------------------+   +------------------+
```

## How It Works

1. **Teams**: Named groups (e.g., "California Team", "Texas Team") that staff can be assigned to
2. **Members**: Staff with eligible roles (Attorney, Case Manager, Negotiator) can be dragged between teams
3. **Role Ordering**: Within each team, members are sorted by role hierarchy: Attorney > Case Manager > Negotiator
4. **Unassigned Column**: Staff not in any team appear here; can be dragged into teams
5. **Future Use**: Teams will be selectable in matter assignment rules to auto-assign matters to team members

---

## Implementation Steps

### 1. Database: Create Tables

**litigation_teams table:**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| company_id | uuid | Company reference (for RLS) |
| name | text | Team name (e.g., "California Team") |
| description | text | Optional description |
| color | text | Color for visual identification |
| is_active | boolean | Whether team is active |
| priority | integer | Display order |
| created_at, updated_at | timestamptz | Timestamps |

**litigation_team_members table:**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| team_id | uuid | Reference to litigation_teams |
| staff_id | uuid | Reference to staff |
| assigned_at | timestamptz | When staff was added to team |
| created_at | timestamptz | Timestamp |
| unique | (team_id, staff_id) | Each staff can only be in one team |

### 2. TypeScript Types

Create new type file `src/types/litigationTeams.ts`:
- `LitigationTeam` interface
- `LitigationTeamMember` interface with nested staff data
- Type for eligible roles

### 3. React Query Hooks

Create `src/hooks/useLitigationTeams.ts`:
- `useLitigationTeams()` - Fetch all teams with member counts
- `useLitigationTeamMembers(teamId?)` - Fetch members, optionally by team
- `useEligibleLitigationStaff()` - Fetch staff with eligible roles (Attorney, Case Manager, Negotiator)
- `useCreateLitigationTeam()` - Create team mutation
- `useUpdateLitigationTeam()` - Update team mutation
- `useDeleteLitigationTeam()` - Delete team mutation
- `useAssignToTeam()` - Add staff to team
- `useRemoveFromTeam()` - Remove staff from team
- `useMoveStaffToTeam()` - Move staff between teams (for drag-drop)

### 4. UI Components

**New page: `src/pages/LitigationTeams.tsx`**
- Header with title and "New Team" button
- Kanban-style grid layout using `@hello-pangea/dnd`
- One column per team + "Unassigned" column
- Staff cards showing name, role (color-coded), and avatar
- Drag-and-drop to move staff between teams

**New component: `src/components/litigation/LitigationTeamFormDialog.tsx`**
- Dialog to create/edit teams
- Fields: name, description, color picker
- Used from both the teams page and Settings

**New component: `src/components/litigation/LitigationTeamMemberCard.tsx`**
- Draggable card showing staff member
- Avatar, name, role badge (color-coded by role)
- Remove button on hover

**Update: `src/components/settings/LitigationTeamsSettingsTab.tsx`**
- New settings tab for managing litigation teams
- Table listing teams with edit/delete actions
- "New Team" button using the shared form dialog

### 5. Routing and Navigation

**Update Litigation page header:**
- Add "Legal Teams" button next to "Court Calendar"
- Links to `/litigation/teams`

**Update App.tsx:**
- Add route `/litigation/teams` for the new page

**Update Settings page:**
- Add "Legal Teams" tab in settings for team management

---

## Technical Details

### Role Color Mapping
```
Attorney:      purple (bg-purple-100 text-purple-700)
Case Manager:  blue   (bg-blue-100 text-blue-700)
Negotiator:    green  (bg-green-100 text-green-700)
```

### Role Display Order
1. Attorneys first (primary legal counsel)
2. Case Managers second (paralegal/support)
3. Negotiators third (settlement specialists)

### Eligible Staff Filter
Staff are eligible for litigation teams if their department is:
- `attorney`
- `case_manager`
- `negotiations`

### Drag-and-Drop Logic
- Dragging from "Unassigned" to a team: Creates team membership
- Dragging between teams: Updates team_id
- Dragging to "Unassigned": Deletes team membership

### Future Matter Assignment Integration
The `litigation_teams` table is designed to support:
- Assignment rules that target specific teams
- Automatic matter distribution among team members
- Round-robin or workload-based assignment within teams

---

## Files to Create
- `src/types/litigationTeams.ts` - Type definitions
- `src/hooks/useLitigationTeams.ts` - Data fetching hooks
- `src/pages/LitigationTeams.tsx` - Main kanban page
- `src/components/litigation/LitigationTeamFormDialog.tsx` - Team create/edit dialog
- `src/components/litigation/LitigationTeamMemberCard.tsx` - Draggable staff card
- `src/components/settings/LitigationTeamsSettingsTab.tsx` - Settings tab

## Files to Modify
- `src/pages/Litigation.tsx` - Add "Legal Teams" button
- `src/pages/Settings.tsx` - Add "Legal Teams" tab
- `src/App.tsx` - Add route for `/litigation/teams`

## Database Migration
- Create `litigation_teams` table with RLS policies
- Create `litigation_team_members` table with RLS policies and unique constraint
