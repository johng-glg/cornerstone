

# Staff Classification Restructure: Departments and Job Titles

## Overview

This plan restructures how staff are classified by:
1. **Consolidating departments** into broader organizational groupings
2. **Adding a `job_title` field** to capture specializations/seniority levels within a role

This provides a clearer organizational structure while maintaining granular role-based permissions.

---

## Current vs. Proposed Structure

### Current State
The system has 8 granular departments that closely mirror roles:

| Department | Roles |
|------------|-------|
| admin | admin, viewer |
| attorney | attorney, paralegal |
| case_manager | case_manager |
| negotiations | negotiator |
| sales_intake | sales_rep |
| client_services | client_services_rep |
| payment_processing | payment_processor |
| correspondence | correspondent |

### Proposed Departments (Consolidated)

| New Department | Contains Roles | Description |
|----------------|----------------|-------------|
| **Administration** | admin, viewer | Executive and system admin staff |
| **Legal** | attorney, case_manager, paralegal | Legal team handling cases and litigation |
| **Negotiations** | negotiator | Settlement negotiation specialists |
| **Sales** | sales_rep | Lead intake and conversion |
| **Client Services** | client_services_rep | Client communication and support |
| **Operations** | payment_processor, correspondent | Back-office processing functions |

---

## Job Title Examples by Role

The `job_title` field (which already exists in the database) will be used to capture seniority and specialization:

| Role | Example Job Titles |
|------|-------------------|
| **Attorney** | Associate Attorney, Staff Attorney, Senior Associate, Junior Partner, Managing Partner |
| **Case Manager** | Case Manager, Senior Case Manager, Team Lead |
| **Negotiator** | Negotiator, Priority Negotiator, Bulk Negotiator, Senior Negotiator |
| **Sales Rep** | Sales Representative, Senior Sales Rep, Sales Lead |
| **Client Services** | Client Services Rep, Senior CSR, Retention Specialist |

---

## Data Model Changes

### Database Updates

1. **Update `department` enum** with consolidated values:
   - Rename `admin` to `administration`
   - Merge `attorney` + `case_manager` into `legal`
   - Rename `sales_intake` to `sales`
   - Merge `payment_processing` + `correspondence` into `operations`
   - Keep `negotiations` and `client_services` as-is

2. **Add `job_titles` reference table** (optional, for dropdown suggestions):

```text
+-------------------+
| job_titles        |
+-------------------+
| id (uuid)         |
| role (app_role)   |
| title (text)      |
| display_order     |
| is_active         |
+-------------------+
```

This allows admins to configure suggested job titles per role without restricting free-text entry.

---

## UI Changes

### Staff Form Dialog Updates

The staff creation/edit form will:
1. Keep the **Role** dropdown (determines permissions)
2. Auto-derive **Department** from role (displayed but not editable)
3. Add **Job Title** as a text field with autocomplete suggestions based on the selected role

```text
+----------------------------------+
| Role: [Attorney          v]     |
| Department: Legal (auto-set)    |
| Job Title: [Senior Associate  ] |
|            Suggestions:         |
|            - Associate Attorney |
|            - Staff Attorney     |
|            - Senior Associate   |
+----------------------------------+
```

### Staff List Display

- **List View**: Show Role and Job Title
- **Grouped View**: Group by new consolidated departments

---

## Code Updates Required

### 1. Database Migration
- Update `department` enum to new values
- Migrate existing staff records to new department values
- Optionally create `job_titles` lookup table

### 2. Backend Updates
- Update `create-staff-user` edge function with new department mapping

### 3. Frontend Updates

| File | Changes |
|------|---------|
| `src/components/staff/StaffFormDialog.tsx` | Add job title field with autocomplete |
| `src/pages/Staff.tsx` | Update department labels, add job title column |
| `src/pages/Dashboard.tsx` | Update department checks for routing |
| `src/lib/docs/rolePermissions.ts` | Update department labels |
| `src/types/litigationTeams.ts` | Update eligible departments constant |
| `src/hooks/useLitigationTeams.ts` | Update department filter |

---

## Migration Strategy

### Phase 1: Database Schema
- Add new department enum values
- Create migration to map old values to new ones

### Phase 2: Code Updates
- Update role-to-department mapping
- Add job title UI to staff form
- Update dashboard routing logic

### Phase 3: Data Migration
- Run migration to update existing staff department values

---

## Role-to-Department Mapping (New)

```text
Role                 -> Department
-------------------------------------
admin                -> administration
viewer               -> administration
attorney             -> legal
paralegal            -> legal
case_manager         -> legal
negotiator           -> negotiations
sales_rep            -> sales
client_services_rep  -> client_services
payment_processor    -> operations
correspondent        -> operations
```

---

## Benefits

1. **Clearer Organization**: Departments represent actual organizational units, not just permission groups
2. **Flexible Titles**: Job titles capture seniority/specialization without adding database complexity
3. **Preserved Permissions**: Roles remain the source of truth for access control
4. **Scalable**: Easy to add new job titles without schema changes

