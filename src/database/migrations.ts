/**
 * Database Migration Module
 *
 * Handles the creation and dropping of tables and indexes
 * @module database/migrations
 */

const pool = require('@/config/database');
const { createIndexes, dropIndexes } = require('@/database/indexes');
const schema = require('@/database/schema');
const { generateQuery } = require('@/utils/query');

/**
 * Database migration script
 *
 * Handles the creation and dropping of tables and indexes
 * Run with: npm run db:migrate
 */
(async () => {
  /* eslint-disable no-console */
  console.log('Executing database migration...');

  // Drop existing tables and types
  await pool.query(generateQuery.tables.drop(schema));

  // Drop existing indexes
  await pool.query(dropIndexes());

  // Create tables
  await pool.query(generateQuery.tables.create(schema));

  // Create indexes
  await pool.query(createIndexes());

  console.info('Migration finished! Closing database connection...');
  /* eslint-enable no-console */
  process.exit(0);
})();
