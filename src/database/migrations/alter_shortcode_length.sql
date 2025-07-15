-- Migration: Alter short_code column length from VARCHAR(10) to VARCHAR(30)
-- Description: Fixes bug where short_code validation expects 30 characters but database column is only 10 characters
-- Issue: Bug #023 - Users cannot create new links due to short_code length mismatch

-- Start transaction
BEGIN;

-- Check if the column exists and get current length
DO $$
DECLARE
    current_length INTEGER;
    column_exists BOOLEAN;
BEGIN
    -- Check if column exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'urls' 
        AND column_name = 'short_code'
    ) INTO column_exists;

    IF column_exists THEN
        -- Get current character maximum length
        SELECT character_maximum_length 
        INTO current_length
        FROM information_schema.columns
        WHERE table_name = 'urls' 
        AND column_name = 'short_code';
        
        -- Only alter if current length is less than 30
        IF current_length < 30 THEN
            RAISE NOTICE 'Altering short_code column from VARCHAR(%) to VARCHAR(30)', current_length;
            
            -- Drop unique constraint first (if exists)
            IF EXISTS (
                SELECT 1 
                FROM information_schema.table_constraints tc
                JOIN information_schema.constraint_column_usage ccu 
                    ON tc.constraint_name = ccu.constraint_name
                WHERE tc.table_name = 'urls' 
                AND ccu.column_name = 'short_code'
                AND tc.constraint_type = 'UNIQUE'
            ) THEN
                RAISE NOTICE 'Dropping existing unique constraint on short_code';
                ALTER TABLE urls DROP CONSTRAINT IF EXISTS urls_short_code_unique;
                ALTER TABLE urls DROP CONSTRAINT IF EXISTS urls_short_code_key;
            END IF;
            
            -- Alter column length
            ALTER TABLE urls ALTER COLUMN short_code TYPE VARCHAR(30);
            
            -- Re-add unique constraint
            ALTER TABLE urls ADD CONSTRAINT urls_short_code_unique UNIQUE (short_code);
            
            RAISE NOTICE 'Successfully altered short_code column to VARCHAR(30)';
        ELSE
            RAISE NOTICE 'short_code column already has length >= 30 (current: %)', current_length;
        END IF;
    ELSE
        RAISE NOTICE 'short_code column does not exist in urls table';
    END IF;
END $$;

-- Commit transaction
COMMIT;

-- Add comment to document the change
COMMENT ON COLUMN urls.short_code IS 'Shortened URL code - up to 30 characters (updated from 10 to fix bug #023)'; 