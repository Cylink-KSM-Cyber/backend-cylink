-- Migration: Add deleted_at to qr_codes table
-- Description: Adds deleted_at column to qr_codes table for implementing soft delete

-- Add deleted_at column to qr_codes table
ALTER TABLE qr_codes
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for efficiently querying non-deleted QR codes
CREATE INDEX IF NOT EXISTS idx_qr_codes_deleted_at ON qr_codes(deleted_at) WHERE deleted_at IS NULL; 