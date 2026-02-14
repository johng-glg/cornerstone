

# Consolidate Task Templates into the Template Builder

## Overview
Merge the separate "Task Templates" settings tab into the main "Templates" tab, creating a unified template management experience. The Templates tab will gain a new sub-section (or type filter) for task templates alongside the existing Email, SMS, and Document templates.

## Changes

### 1. Update the Templates Tab to include Task Templates
- Modify `TemplatesTab.tsx` to use a sub-tab layout with two sections: **Communication Templates** (email/SMS/document) and **Task Templates**
- This keeps both template types accessible from a single "Templates" tab

### 2. Remove the standalone Task Templates tab from Settings
- Remove the "Task Templates" `TabsTrigger` and `TabsContent` from `Settings.tsx`
- Remove the import of `TaskTemplatesTab`
- Optionally delete `TaskTemplatesTab.tsx` since it will no longer be needed

### 3. Add the "Eligibility" department to the Task Template List
- Update `DEPT_LABELS` in `TaskTemplateList.tsx` to include the `eligibility` department label so templates in that department render correctly

### 4. Add "Task" as a type filter option in the unified view
- Update the type filter dropdown in `TemplateList.tsx` to show task templates as a filterable type, or keep them as a clear sub-tab to avoid confusion between the two different template schemas

## Technical Details

**File changes:**

| File | Action |
|------|--------|
| `src/components/settings/TemplatesTab.tsx` | Rewrite to render sub-tabs: "Communications" (TemplateList) and "Task Templates" (TaskTemplateList) |
| `src/pages/Settings.tsx` | Remove the "task-templates" tab trigger, content, and import |
| `src/components/tasks/TaskTemplateList.tsx` | Add `eligibility` to `DEPT_LABELS` |
| `src/components/settings/TaskTemplatesTab.tsx` | Delete (no longer needed) |

**Resulting Settings tab structure:**
- Templates tab now contains:
  - Sub-tab: "Communications" -- email, SMS, document templates with merge fields
  - Sub-tab: "Task Templates" -- reusable task configurations grouped by department

No database changes required. All existing task template CRUD hooks and the form dialog remain unchanged.

