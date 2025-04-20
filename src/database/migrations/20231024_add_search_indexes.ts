/**
 * Migration to add search indexes for URL search functionality
 *
 * Adds text search and GIN indexes to improve search performance
 * @module database/migrations/20231024_add_search_indexes
 */

const pool = require('../../config/database');
const logger = require('../../utils/logger');

/**
 * Apply the migration by creating search indexes
 *
 * @returns {Promise<void>} Resolves when migration is complete
 */
exports.up = async (): Promise<void> => {
  try {
    await pool.query(`
      -- Basic indexes for the original URL and title
      CREATE INDEX IF NOT EXISTS idx_urls_original_url ON urls(original_url);
      CREATE INDEX IF NOT EXISTS idx_urls_title ON urls(title);
      
      -- Functional indexes for case-insensitive search
      CREATE INDEX IF NOT EXISTS idx_urls_original_url_lower ON urls(LOWER(original_url));
      CREATE INDEX IF NOT EXISTS idx_urls_short_code_lower ON urls(LOWER(short_code));
      CREATE INDEX IF NOT EXISTS idx_urls_title_lower ON urls(LOWER(title));
      
      -- GIN indexes for full-text search
      CREATE INDEX IF NOT EXISTS idx_urls_original_url_gin ON urls USING gin(to_tsvector('english', original_url));
      CREATE INDEX IF NOT EXISTS idx_urls_short_code_gin ON urls USING gin(to_tsvector('english', short_code));
      CREATE INDEX IF NOT EXISTS idx_urls_title_gin ON urls USING gin(to_tsvector('english', coalesce(title, '')));
    `);

    logger.info('Successfully added search indexes to URLs table');
  } catch (error) {
    logger.error('Error adding search indexes:', error);
    throw error;
  }
};

/**
 * Revert the migration by dropping search indexes
 *
 * @returns {Promise<void>} Resolves when migration is reverted
 */
exports.down = async (): Promise<void> => {
  try {
    await pool.query(`
      -- Drop basic indexes
      DROP INDEX IF EXISTS idx_urls_original_url;
      DROP INDEX IF EXISTS idx_urls_title;
      
      -- Drop functional indexes
      DROP INDEX IF EXISTS idx_urls_original_url_lower;
      DROP INDEX IF EXISTS idx_urls_short_code_lower;
      DROP INDEX IF EXISTS idx_urls_title_lower;
      
      -- Drop GIN indexes
      DROP INDEX IF EXISTS idx_urls_original_url_gin;
      DROP INDEX IF EXISTS idx_urls_short_code_gin;
      DROP INDEX IF EXISTS idx_urls_title_gin;
    `);

    logger.info('Successfully removed search indexes from URLs table');
  } catch (error) {
    logger.error('Error removing search indexes:', error);
    throw error;
  }
};
