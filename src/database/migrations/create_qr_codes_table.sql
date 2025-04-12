-- Migration: Create QR codes table
-- Description: Creates a table for storing QR code configurations with url association

-- Create the QR codes table
CREATE TABLE IF NOT EXISTS qr_codes (
    id SERIAL PRIMARY KEY,
    url_id INTEGER NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
    color VARCHAR(7) NOT NULL DEFAULT '#000000',
    background_color VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
    include_logo BOOLEAN NOT NULL DEFAULT TRUE,
    logo_size DECIMAL(3,2) NOT NULL DEFAULT 0.2 CHECK (logo_size >= 0.1 AND logo_size <= 0.3),
    size INTEGER NOT NULL DEFAULT 300,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Create index for fast lookups by URL ID
CREATE INDEX IF NOT EXISTS idx_qr_codes_url_id ON qr_codes(url_id); 