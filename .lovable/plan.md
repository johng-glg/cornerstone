

## Litigation Tab Enhancements

This plan covers four feature requests to improve the Litigation section of the app.

---

### 1. Client Info on Litigation Table and Detail Sheet

**Current state:** The Litigation page table shows Case #, Opposing Party, Court, Status, Deadlines, and Judgment -- but not the client name. The data is already fetched (client name comes through `client_service.primary_client`), it just isn't displayed.

**Changes:**
- **Litigation page table (`src/pages/Litigation.tsx`):** Add a "Client" column showing the client's full name, linked to their Client Detail page (`/clients/:id`). Also show their service number.
- **Matter detail sheet header (`src/components/litigation/LitigationMatterDetailSheet.tsx`):** Add a client info card to the Overview tab showing: client name (linked to `/clients/:id`), email, and primary phone number. This requires expanding the `useLitigationMatter` query to also fetch `clients.email` and a subquery for the primary phone from `client_phones`.
- **Hook update (`src/hooks/useLitigationMatters.ts`):** Expand the `useLitigationMatters` and `useLitigationMatter` select queries to include `clients.email` and the client's ID for linking.

---

### 2. Filing Fees Tracking

**Current state:** No filing fee concept exists in the database.

**Database migration:**
- Create a `filing_fees` table:

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| matter_id | UUID FK | References `litigation_matters.id` |
| amount | NUMERIC(10,2) | Fee amount |
| description | TEXT | e.g. "Initial filing fee", "Motion fee" |
| status | ENUM | `pending`, `submitted_to_client`, `approved`, `declined`, `paid` |
| requested_date | DATE | When the fee was identified |
| approved_date | DATE | When client approved |
| paid_date | DATE | When payment was made |
| notes | TEXT | |
| created_by | UUID FK | References `staff.id` |
| created_at / updated_at | TIMESTAMPTZ | Auto-managed |

- Create enum `filing_fee_status` with values: `pending`, `submitted_to_client`, `approved`, `declined`, `paid`.
- RLS: Authenticated users can CRUD.
- Create a notification trigger: when status changes to `submitted_to_client`, notify relevant assigned staff.

**Frontend:**
- Add a **"Filing Fees" tab** to `LitigationMatterDetailSheet` (between Billing and Activity).
- Create `src/components/litigation/FilingFeesList.tsx` -- table showing all fees for a matter with status badges, amounts, dates, and an "Add Filing Fee" button.
- Create `src/components/litigation/FilingFeeFormDialog.tsx` -- form to add/edit a filing fee with amount, description, and status.
- Create `src/hooks/useFilingFees.ts` -- CRUD hook for the `filing_fees` table.

---

### 3. Appearance Requests Tab

**Database migration:**
- Create an `appearance_requests` table:

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| matter_id | UUID FK | References `litigation_matters.id` |
| hearing_id | UUID FK (nullable) | References `litigation_hearings.id` |
| requested_date | DATE | |
| appearance_date | DATE | When appearance is needed |
| court_name | TEXT | |
| description | TEXT | Details of what's needed |
| status | ENUM | `pending`, `approved`, `assigned`, `completed`, `cancelled` |
| assigned_to | UUID FK (nullable) | References `staff.id` |
| requested_by | UUID FK | References `staff.id` |
| notes | TEXT | |
| created_at / updated_at | TIMESTAMPTZ | |

- Create enum `appearance_request_status`.
- RLS: Authenticated users can CRUD.

**Frontend:**
- Add an **"Appearances" tab** to `LitigationMatterDetailSheet`.
- Create `src/components/litigation/AppearanceRequestsList.tsx` -- list of requests with status tracking.
- Create `src/components/litigation/AppearanceRequestFormDialog.tsx` -- form to create/edit requests.
- Create `src/hooks/useAppearanceRequests.ts` -- CRUD hook.

---

### 4. Notifications for Task/Matter Assignments

**Current state:** The `matter_assigned` notification type exists in the enum but no trigger fires it when staff are assigned to matters. Similarly, task assignment notifications exist but may not cover all scenarios.

**Database migration:**
- Add a trigger on the `assignments` table: when a new row is inserted with `entity_type = 'litigation_matter'` and `is_active = true`, call `create_notification()` for the assigned staff member with type `matter_assigned`, including a link to `/litigation?open={matter_id}`.
- The email notification preference column (`email_enabled`) already exists on `notification_preferences`. The actual email sending would be a future integration (via Resend), but the in-app notification will fire immediately.

**Frontend:** No UI changes needed -- the existing Notification Center and preference toggles already support `matter_assigned`. The real-time subscription will display the toast automatically.

---

### 5. Other Active Lawsuits on Overview Tab

**Current state:** The matter detail Overview tab shows case info, dates, and financials -- but no awareness of sibling matters for the same client.

**Changes to `LitigationMatterDetailSheet.tsx`:**
- On the Overview tab, add an "Other Active Matters" card below Financial Summary.
- Query `litigation_matters` filtered by the same `client_service_id` (or same client across services), excluding the current matter, where status is not `settled`/`dismissed`/`judgment`.
- Display each sibling matter as a clickable row showing case number, status badge, creditor name, and balance.
- Clicking opens that matter's detail sheet (swap the `selectedMatterId`).

**New hook:** `useSiblingMatters(matterId, clientServiceId)` in `useLitigationMatters.ts` -- fetches other active matters for the same client service.

---

### Summary of Files

**New files:**
- `src/hooks/useFilingFees.ts`
- `src/hooks/useAppearanceRequests.ts`
- `src/components/litigation/FilingFeesList.tsx`
- `src/components/litigation/FilingFeeFormDialog.tsx`
- `src/components/litigation/AppearanceRequestsList.tsx`
- `src/components/litigation/AppearanceRequestFormDialog.tsx`
- 1 SQL migration file

**Modified files:**
- `src/hooks/useLitigationMatters.ts` (expanded queries + sibling matters hook)
- `src/pages/Litigation.tsx` (add Client column)
- `src/components/litigation/LitigationMatterDetailSheet.tsx` (client info card, Filing Fees tab, Appearances tab, Other Matters card)

