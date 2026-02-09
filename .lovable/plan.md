

## Task System Enhancements

### Overview
Three improvements to the task system: (1) an entity search picker in the task form so tasks can be linked to any module item, (2) a task template system with department-based organization, and (3) "Add Task" buttons on the Client and Lead detail views.

---

### 1. Entity Linker with Search in Task Form

**Problem:** When creating a task from the main Tasks page, there is no way to associate it with a client, lead, liability, or litigation matter.

**Solution:** Add an "Entity Link" section to `TaskFormDialog` that reuses the existing global search logic to let users search across leads, clients, liabilities, and litigation matters, then associate the selected item with the task.

**Changes:**
- **New component: `src/components/tasks/EntitySearchSelect.tsx`** -- A combo-box search field that queries the same data sources as global search (`useGlobalSearch`). When an item is selected, it maps the search result type to the corresponding `entity_type` enum value and stores the entity ID.
- **Modified: `src/components/tasks/TaskFormDialog.tsx`** -- Add `entity_type` and `entity_id` fields to the form schema. Render the `EntitySearchSelect` component. When the form already has a `defaultEntityType`/`defaultEntityId`, show the linked entity as a read-only badge instead.

**Type mapping:**
```text
search type "lead"       -> entity_type "lead"
search type "client"     -> entity_type "engagement" (matches existing pattern)
search type "liability"  -> entity_type "liability"
search type "litigation" -> entity_type "litigation_matter"
```

---

### 2. Task Templates (Database + Builder + Picker)

**Database changes (1 migration):**

**New table: `task_templates`**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Default gen_random_uuid() |
| name | TEXT NOT NULL | Template display name |
| description | TEXT | Optional longer description |
| department | department_new (enum) | Which department this template belongs to |
| task_type | task_type (enum) | Default task type |
| priority | task_priority (enum) | Default priority |
| default_title | TEXT NOT NULL | Pre-filled task title |
| default_description | TEXT | Pre-filled task description |
| default_due_days | INTEGER | Days from creation to auto-set due date |
| company_id | UUID FK | Reference to companies table |
| created_by | UUID FK | Staff who created the template |
| is_active | BOOLEAN | Default true |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

RLS: Authenticated users can read; admin-only write (using `has_role`).

**New files:**
- **`src/hooks/useTaskTemplates.ts`** -- CRUD hooks for `task_templates` table.
- **`src/components/tasks/TaskTemplateFormDialog.tsx`** -- Form to create/edit a task template (name, department, default title, description, priority, type, due days).
- **`src/components/tasks/TaskTemplateList.tsx`** -- List of all templates grouped by department with create/edit/delete actions.
- **`src/components/settings/TaskTemplatesTab.tsx`** -- Settings tab wrapper for the template builder.

**Modified files:**
- **`src/pages/Settings.tsx`** -- Add "Task Templates" tab in the settings page.
- **`src/components/tasks/TaskFormDialog.tsx`** -- Add a "Use Template" dropdown at the top of the form. When a template is selected, auto-fill the title, description, priority, type, and due date (calculated from `default_due_days`). Templates are grouped by department in the dropdown for easy browsing.

---

### 3. "Add Task" Buttons on Client and Lead Detail Views

**Modified: `src/components/clients/detail/ClientTasksTab.tsx`**
- Add an "Add Task" button at the top of the tab.
- Include the `TaskFormDialog` with `defaultEntityType="engagement"` and `defaultEntityId={clientId}` so the task auto-links to the client.
- After creating, invalidate the client tasks query.

**Modified: `src/components/leads/LeadDetailSheet.tsx`**
- Add a "Tasks" tab (making the tabs grid 4 columns instead of 3).
- Inside the new tab, show tasks filtered by `entity_type: 'lead'` and `entity_id: leadId` using the existing `useTasks` hook.
- Include an "Add Task" button with `defaultEntityType="lead"` and `defaultEntityId={leadId}`.

---

### Technical Notes

- The `entity_type` enum already supports `engagement`, `case`, `liability`, `lead`, and `litigation_matter` -- no enum changes needed.
- The `department_new` enum already exists with values matching the department system (`administration`, `legal`, `negotiations`, `sales`, `client_services`, `operations`).
- Task template selection is additive -- it pre-fills fields but users can modify anything before saving.
- The entity search select will debounce input and run parallel queries just like the existing global search.

