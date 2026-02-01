-- Add 'cancelled' status to settlement_status enum for soft delete functionality
ALTER TYPE settlement_status ADD VALUE IF NOT EXISTS 'cancelled';