-- Migration: Add password reset columns to users table
-- Date: 2024-01-XX
-- Description: Add columns for password reset functionality with secure tokens and expiration

-- Add password reset token column
ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255);

-- Add password reset expiration timestamp
ALTER TABLE users ADD COLUMN password_reset_expires_at TIMESTAMP WITH TIME ZONE;

-- Add password reset request timestamp for rate limiting
ALTER TABLE users ADD COLUMN password_reset_requested_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for efficient lookups and cleanup operations
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token) WHERE password_reset_token IS NOT NULL;
CREATE INDEX idx_users_password_reset_expires ON users(password_reset_expires_at) WHERE password_reset_expires_at IS NOT NULL;

-- Add comments to columns for documentation
COMMENT ON COLUMN users.password_reset_token IS 'Secure token for password reset verification';
COMMENT ON COLUMN users.password_reset_expires_at IS 'Expiration timestamp for password reset token (1 hour from generation)';
COMMENT ON COLUMN users.password_reset_requested_at IS 'Timestamp when password reset was last requested (for rate limiting)'; 