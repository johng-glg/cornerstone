

## Role Management Settings Tab

### Overview
Add a new "Roles" tab to the Settings page where administrators can view all system roles, see and edit what each role can access, and assign/remove users from roles -- all in one place.

### Current State
- Roles are defined as a Postgres enum (`app_role`) with 11 values: admin, attorney, paralegal, negotiator, case_manager, sales_rep, client_services_rep, payment_processor, correspondent, viewer, of_counsel.
- Permissions per role are hardcoded in `src/lib/docs/rolePermissions.ts` and only displayed in the documentation section.
- Role assignment to users happens exclusively inside the Staff form dialog.
- There is no database-backed permissions system -- the permissions matrix is purely informational.

### What This Plan Delivers

**A new "Roles" settings tab with three sections:**

1. **Roles List** -- A card for each role showing its display name, department, description, and member count. Clicking a role opens its detail view.

2. **Role Detail / Permissions Editor** -- When a role is selected:
   - View and edit the **module permissions matrix** (RCUD per module) stored in a new database table.
   - View and edit **special permissions** (free-text capabilities like "Approve settlement offers").
   - See all staff members currently assigned to this role.

3. **Role Member Management** -- Add or remove staff from the selected role directly from this tab (in addition to the existing Staff form dialog).

---

### Database Changes

**New table: `role_permissions`**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| role | app_role | The role this permission applies to |
| module | TEXT | e.g. "Leads", "Clients", "Litigation" |
| can_read | BOOLEAN | Default false |
| can_create | BOOLEAN | Default false |
| can_update | BOOLEAN | Default false |
| can_delete | BOOLEAN | Default false |
| notes | TEXT (nullable) | e.g. "View only for case context" |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

Unique constraint on `(role, module)`.

RLS: All authenticated users can read; only admins can insert/update/delete (using the existing `has_role` function).

**New table: `role_special_permissions`**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| role | app_role | |
| permission | TEXT | e.g. "Approve settlement offers" |
| created_at | TIMESTAMPTZ | |

Unique constraint on `(role, permission)`.

RLS: Same as above -- authenticated read, admin write.

**Seed data migration:** Insert the current hardcoded values from `rolePermissions.ts` into both new tables so nothing changes for existing users.

---

### Frontend Changes

**New files:**
- `src/components/settings/RolesSettingsTab.tsx` -- Main tab component with role list and detail panels.
- `src/hooks/useRolePermissions.ts` -- CRUD hook for `role_permissions` and `role_special_permissions` tables, plus a hook to fetch/manage role members from `user_roles`.

**Modified files:**
- `src/pages/Settings.tsx` -- Add the "Roles" tab trigger and content.
- `src/lib/docs/rolePermissions.ts` -- Update the docs `PermissionsMatrix` to optionally read from the database instead of hardcoded values (fallback to hardcoded if no DB data exists).

**UI Layout for the Roles Tab:**

```text
+------------------------------------------+
| Roles Settings                           |
+------------------------------------------+
| [Admin] [Attorney] [Case Mgr] [Negot..].|
|                                          |
| --- Selected: Attorney ---               |
|                                          |
| Description: [editable text]             |
| Department:  Legal                       |
|                                          |
| Module Permissions                       |
| +------+---+---+---+---+------+         |
| |Module | R | C | U | D |Notes |         |
| +------+---+---+---+---+------+         |
| |Leads  | x |   |   |   |View..|         |
| |Client | x |   | x |   |      |         |
| |...    |   |   |   |   |      |         |
| +------+---+---+---+---+------+         |
|                                          |
| Special Permissions          [+ Add]     |
| * Approve settlement offers    [x]       |
| * File court documents         [x]       |
|                                          |
| Members (3)                  [+ Assign]  |
| * Jane Smith (Attorney)        [Remove]  |
| * Bob Jones (Attorney)         [Remove]  |
+------------------------------------------+
```

- Each checkbox in the permissions matrix triggers an upsert to `role_permissions`.
- "Add" on special permissions opens an inline input.
- "Assign" opens a staff picker (searchable dropdown of staff not already in this role).
- "Remove" removes the `user_roles` row for that user.
- All changes save immediately (no "Save" button needed -- optimistic updates with toast confirmations).

---

### Technical Notes

- The `app_role` enum values cannot be added/removed from this UI (that requires a database migration). This tab manages what each existing role **can do**, not which roles exist. A note in the UI will explain this.
- The role-to-department mapping remains in `staffDepartments.ts` since departments are derived from roles automatically.
- The `has_role` security definer function already exists and will be used in the RLS policies for the new tables.
- Admin-only access: The tab itself will be hidden for non-admin users using the `useAuth().isAdmin()` check.

