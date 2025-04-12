-- Migration: Drop QR codes table
-- Description: Drops the QR codes table and its associated index

-- Drop the index first
DROP INDEX IF EXISTS idx_qr_codes_url_id;

-- Drop the table
DROP TABLE IF EXISTS qr_codes; 