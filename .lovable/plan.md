

# Add Test Staff Without Email Confirmation

## The Challenge

The `staff` table requires a valid `user_id` referencing `auth.users`. This means you can't add staff records without creating actual authentication accounts first.

## Solution: Create a Backend Function for Admin User Creation

I'll create a secure backend function that allows admins to create test users with auto-confirmed emails. This bypasses the email verification step while maintaining proper security.

## What This Enables

- Add staff members directly from the Staff Management page
- No email confirmation required for test accounts
- You control the password for all test accounts
- Proper authentication records are created (users can actually log in)

## Implementation Steps

### Step 1: Create Backend Function

A new backend function (`create-staff-user`) that:
- Accepts staff details (name, email, department, etc.)
- Creates an auth user with a default test password
- Auto-confirms the email (no verification needed)
- Creates the corresponding staff record
- Optionally assigns roles

### Step 2: Add Staff Form Dialog

A new form component (`StaffFormDialog.tsx`) with fields for:
- First Name, Last Name
- Email (will be used for login)
- Phone (optional)
- Department (dropdown: admin, attorney, negotiations, case_manager, etc.)
- Job Title (optional)
- Company assignment
- Active status

### Step 3: Update Staff Page

- Add "Add Staff" button
- Add edit functionality with pencil icon on hover
- Show loading states during user creation

## Technical Details

```text
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────┐
│  Staff Form     │────▶│  create-staff-user   │────▶│  auth.users │
│  (Frontend)     │     │  (Backend Function)  │     │  + staff    │
└─────────────────┘     └──────────────────────┘     └─────────────┘
```

**Backend Function Logic:**
1. Verify caller is admin (RLS check)
2. Create auth user with `supabase.auth.admin.createUser({ email_confirm: true })`
3. Insert staff record linked to new user
4. Optionally add roles to `user_roles` table
5. Return success/error

**Security:**
- Only admins can call this function
- Default password is `TestPass123!` (you can change it)
- Created users can reset their password via email later

## Test Accounts to Create

Once implemented, you can add these test staff:

| Name | Department | Role |
|------|------------|------|
| Sarah Mitchell | attorney | attorney |
| Mike Chen | negotiations | negotiator |
| Emily Rodriguez | case_manager | case_manager |
| David Kim | sales_intake | sales_rep |

## Outcome

After this is implemented, you'll be able to:
1. Click "Add Staff" on the Staff Management page
2. Fill in the form with test user details
3. Staff member is created and can log in immediately (no email needed)

