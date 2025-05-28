-- Migration: Add timezone column to users table
-- Description: Adds timezone preference column for user profile management

-- Add timezone column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';

-- Add comment to document the column purpose
COMMENT ON COLUMN users.timezone IS 'User preferred timezone for URL expiration calculations and date displays';

-- Create index for efficient timezone-based queries
CREATE INDEX IF NOT EXISTS idx_users_timezone ON users(timezone) WHERE timezone IS NOT NULL;

-- Update existing users to have UTC timezone as default
UPDATE users 
SET timezone = 'UTC' 
WHERE timezone IS NULL; 