-- Step 1: Insert parent company first
INSERT INTO companies (name, company_type, address_line1, city, state, zip_code, phone, email, website, is_active, data_visibility)
VALUES 
  ('Johnson & Associates Law Firm', 'law_firm', '123 Legal Plaza, Suite 500', 'Los Angeles', 'CA', '90001', '(555) 123-4567', 'info@johnsonlaw.com', 'www.johnsonlaw.com', true, 'full_hierarchy');

-- Step 2: Insert affiliate company with parent reference
INSERT INTO companies (name, company_type, address_line1, city, state, zip_code, phone, email, is_active, data_visibility, parent_company_id)
SELECT 'Legal Solutions Affiliate', 'affiliate', '456 Partner Street', 'San Diego', 'CA', '92101', '(555) 987-6543', 'info@legalsolutions.com', true, 'own_only', id
FROM companies WHERE name = 'Johnson & Associates Law Firm';