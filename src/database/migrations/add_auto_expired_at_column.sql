-- Migration: Add auto_expired_at column to URLs table
-- Description: Adds tracking column for automatic URL expiration events

-- Add auto_expired_at column to track when URLs were automatically expired
ALTER TABLE urls 
ADD COLUMN IF NOT EXISTS auto_expired_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add comment to document the column purpose
COMMENT ON COLUMN urls.auto_expired_at IS 'Timestamp when the URL was automatically expired by the background job';

-- Create index for efficient queries on auto-expired URLs
CREATE INDEX IF NOT EXISTS idx_urls_auto_expired_at ON urls(auto_expired_at) WHERE auto_expired_at IS NOT NULL;

-- Create composite index for expiration job queries
CREATE INDEX IF NOT EXISTS idx_urls_expiry_auto_expired ON urls(expiry_date, auto_expired_at) 
WHERE expiry_date IS NOT NULL AND auto_expired_at IS NULL; 