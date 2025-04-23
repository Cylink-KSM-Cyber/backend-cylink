/**
 * Migration script to add deleted_at column to qr_codes table
 *
 * Run with: ts-node src/database/migrations/add_deleted_at_to_qr_codes.ts
 */
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

(async (): Promise<void> => {
  try {
    console.log('Adding deleted_at column to qr_codes table...');

    // Run the SQL migration
    await pool.query(`
      -- Add deleted_at column to qr_codes table
      ALTER TABLE qr_codes
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
      
      -- Create index for efficiently querying non-deleted QR codes
      CREATE INDEX IF NOT EXISTS idx_qr_codes_deleted_at ON qr_codes(deleted_at) WHERE deleted_at IS NULL;
    `);

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
})();
