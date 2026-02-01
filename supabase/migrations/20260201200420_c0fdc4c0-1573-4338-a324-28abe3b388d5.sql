-- First rename the old enum
ALTER TYPE litigation_status RENAME TO litigation_status_old;

-- Create the new enum with desired values
CREATE TYPE litigation_status AS ENUM (
  'new',
  'pre_response',
  'post_response',
  'settled',
  'dropped',
  'judgment',
  'declined',
  'dismissed'
);

-- Alter the column with a mapping function
ALTER TABLE litigation_matters 
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE litigation_status USING (
    CASE status::text
      WHEN 'pending_response' THEN 'new'
      WHEN 'discovery' THEN 'post_response'
      WHEN 'negotiation' THEN 'post_response'
      WHEN 'trial_prep' THEN 'post_response'
      WHEN 'trial' THEN 'post_response'
      WHEN 'settled' THEN 'settled'
      WHEN 'dismissed' THEN 'dismissed'
      WHEN 'judgment' THEN 'judgment'
      ELSE 'new'
    END
  )::litigation_status,
  ALTER COLUMN status SET DEFAULT 'new'::litigation_status;

-- Drop the old enum
DROP TYPE litigation_status_old;