

# Load Mock Data - Step 1: Companies

## Overview

Load foundation data one table at a time to avoid timeouts. This first step creates the company hierarchy that all other data depends on.

## Step 1: Companies (This Migration)

Insert 2 company records:

| Name | Type | Role |
|------|------|------|
| Johnson & Associates Law Firm | law_firm | Main company (parent) |
| Legal Solutions Affiliate | affiliate | Child company |

## Loading Order (Future Steps)

After this migration succeeds, we'll continue with:

1. **Step 2**: Staff (5 members)
2. **Step 3**: Contacts + Phones + Addresses (8 contacts)
3. **Step 4**: Leads + Lead Activities (6 leads)
4. **Step 5**: Creditors (8 creditors)
5. **Step 6**: Engagements + Links (5 engagements)
6. **Step 7**: Tasks (10 tasks)
7. **Step 8**: Liabilities (12 liabilities)
8. **Step 9**: Settlements + Actions (6 settlements)
9. **Step 10**: Transactions (8 transactions)

## Technical Details

```sql
-- Insert parent company first
INSERT INTO companies (name, company_type, address_line1, city, state, zip_code, phone, email, website, is_active, data_visibility)
VALUES 
  ('Johnson & Associates Law Firm', 'law_firm', '123 Legal Plaza, Suite 500', 'Los Angeles', 'CA', '90001', '(555) 123-4567', 'info@johnsonlaw.com', 'www.johnsonlaw.com', true, 'company_wide');

-- Insert affiliate company with parent reference
INSERT INTO companies (name, company_type, address_line1, city, state, zip_code, phone, email, is_active, data_visibility, parent_company_id)
SELECT 'Legal Solutions Affiliate', 'affiliate', '456 Partner Street', 'San Diego', 'CA', '92101', '(555) 987-6543', 'info@legalsolutions.com', true, 'own_only', id
FROM companies WHERE name = 'Johnson & Associates Law Firm';
```

