import type { Knex } from 'knex';

/**
 * Migration: Fix short_code column length from VARCHAR(10) to VARCHAR(30)
 *
 * This migration addresses the schema mismatch where the short_code column
 * was created with VARCHAR(10) by the old migration system, but the application
 * expects VARCHAR(30) for validation and functionality.
 *
 * Bug #023: Update short code length to support up to 30 characters
 */

export async function up(knex: Knex): Promise<void> {
  // Check current column length
  const columnInfo = await knex.raw(`
    SELECT character_maximum_length 
    FROM information_schema.columns
    WHERE table_name = 'urls' AND column_name = 'short_code'
  `);

  const currentLength = columnInfo.rows[0]?.character_maximum_length;

  // Only alter if current length is less than 30
  if (currentLength && currentLength < 30) {
    console.log(`Altering short_code column from VARCHAR(${currentLength}) to VARCHAR(30)`);

    await knex.raw('ALTER TABLE urls ALTER COLUMN short_code TYPE VARCHAR(30)');

    // Add comment to document the change
    await knex.raw(`
      COMMENT ON COLUMN urls.short_code IS 'Shortened URL code - up to 30 characters (updated from ${currentLength} to fix bug #023)'
    `);

    console.log('✅ short_code column updated successfully');
  } else {
    console.log(`short_code column already has correct length (${currentLength})`);
  }
}

export async function down(knex: Knex): Promise<void> {
  // Check if any short codes exceed 10 characters
  const longCodes = await knex('urls').where(knex.raw('LENGTH(short_code) > 10'));

  if (longCodes.length > 0) {
    throw new Error(
      `Cannot rollback: ${longCodes.length} short codes exceed 10 characters. ` +
        'Rolling back would cause data truncation.',
    );
  }

  // Safe to rollback to VARCHAR(10)
  await knex.raw('ALTER TABLE urls ALTER COLUMN short_code TYPE VARCHAR(10)');

  // Update comment
  await knex.raw(`
    COMMENT ON COLUMN urls.short_code IS 'Shortened URL code - up to 10 characters (rolled back from 30)'
  `);

  console.log('⚠️  short_code column rolled back to VARCHAR(10)');
}
