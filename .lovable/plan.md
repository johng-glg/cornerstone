

# Plan: Staff Management Enhancements

## Overview
Add two enhancements to the Staff Management page:
1. **Group by Department Toggle** - Option to organize the staff list by department with collapsible sections
2. **Last Login Display** - Show when each staff member last logged in

---

## How It Works

```text
Staff Management Header:
+------------------------------------------------------------------+
| Staff Management                                [List | Grouped]  |
| 15 staff members                                    [+ Add Staff] |
+------------------------------------------------------------------+

Flat List View (Current):
+------------------------------------------------------------------+
| Staff Member    | Dept     | Contact | Company | Roles | Status  |
+------------------------------------------------------------------+
| John Smith      | Admin    | ...     | ...     | ...   | Active  |
| Jane Doe        | Attorney | ...     | ...     | ...   | Active  |
+------------------------------------------------------------------+

Grouped View (New):
+------------------------------------------------------------------+
| [v] Admin (2 members)                                             |
|   +--------------------------------------------------------------+
|   | Staff Member  | Contact   | Company | Roles | Last Login      |
|   +--------------------------------------------------------------+
|   | John Smith    | john@...  | GLG     | Admin | Today, 3:15 PM  |
|   | Mary Johnson  | mary@...  | GLG     | Admin | Yesterday       |
+------------------------------------------------------------------+
| [v] Attorney (4 members)                                          |
|   ...                                                             |
+------------------------------------------------------------------+
| [v] Case Manager (3 members)                                      |
|   ...                                                             |
+------------------------------------------------------------------+
```

---

## Implementation Steps

### 1. Database: Add last_login_at Column to Staff
Add a new column to track when staff last logged in:
- `last_login_at timestamptz` - Updated via database trigger when user signs in

Create a trigger that updates this field when a user authenticates. The trigger will listen for auth events and update the corresponding staff record.

### 2. Update Staff Interface
Update the `StaffMember` interface in `src/pages/Staff.tsx` to include:
- `last_login_at: string | null` - The timestamp of last login

### 3. UI Components

**Add View Toggle to Header:**
- Toggle between "List" (flat table) and "Grouped" (by department) views
- Use ToggleGroup component for consistent UI with other pages

**Add Last Login Column:**
- New column showing formatted last login time
- Display relative times like "Today, 3:15 PM", "Yesterday", "3 days ago", or "Never" for null values
- Use Clock icon for visual consistency

**Grouped View Implementation:**
- Group staff by department using collapsible sections
- Each group header shows department name and member count
- Groups are color-coded using existing department colors
- Department order follows natural hierarchy:
  1. Admin
  2. Sales/Intake
  3. Client Services
  4. Attorney
  5. Case Manager
  6. Negotiations
  7. Payment Processing
  8. Correspondence

### 4. Date Formatting Helper
Create a helper function to format last login times:
- Within today: "Today, 3:15 PM"
- Yesterday: "Yesterday, 3:15 PM"
- Within 7 days: "3 days ago"
- Older: "Jan 15, 2026"
- Never logged in: "Never"

---

## Technical Details

### Department Order Constant
```typescript
const DEPARTMENT_ORDER = [
  'admin',
  'sales_intake',
  'client_services',
  'attorney',
  'case_manager',
  'negotiations',
  'payment_processing',
  'correspondence',
];
```

### Department Display Labels
```typescript
const DEPARTMENT_LABELS: Record<string, string> = {
  admin: 'Admin',
  sales_intake: 'Sales & Intake',
  client_services: 'Client Services',
  attorney: 'Attorney',
  case_manager: 'Case Manager',
  negotiations: 'Negotiations',
  payment_processing: 'Payment Processing',
  correspondence: 'Correspondence',
};
```

### Grouping Logic
```typescript
const staffByDepartment = useMemo(() => {
  if (!staff) return new Map();
  
  const grouped = new Map<string, StaffMember[]>();
  for (const member of staff) {
    const existing = grouped.get(member.department) || [];
    grouped.set(member.department, [...existing, member]);
  }
  
  // Sort by department order
  return new Map(
    DEPARTMENT_ORDER
      .filter(dept => grouped.has(dept))
      .map(dept => [dept, grouped.get(dept)!])
  );
}, [staff]);
```

### Database Migration
The migration will:
1. Add `last_login_at` column to the `staff` table
2. Create a function to update `last_login_at` when user signs in
3. Create a trigger on `auth.sessions` to call this function (or use Supabase's built-in auth hooks)

Note: Since we cannot create triggers on auth schema tables, we'll update `last_login_at` from the client side when the user loads the app and is authenticated. This approach is simpler and doesn't require modifying reserved schemas.

---

## Files to Modify

### Modified Files
- `src/pages/Staff.tsx` - Add view toggle, grouped view, last login column

### Database Changes
- Add `last_login_at` column to `staff` table

### Optional Enhancement
- Update auth flow (e.g., in `AppLayout.tsx` or auth provider) to update `last_login_at` on successful authentication

