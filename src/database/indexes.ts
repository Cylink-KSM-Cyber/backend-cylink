/**
 * Database indexes definitions for improving query performance
 *
 * @module database/indexes
 */

/**
 * Generates SQL statements to create indexes for the database tables
 *
 * @returns {string} SQL statements for creating indexes
 */
exports.createIndexes = (): string => {
  let query = '';

  // Indexes for URLs table
  query += 'CREATE INDEX IF NOT EXISTS idx_urls_short_code ON urls(short_code);\n';
  query += 'CREATE INDEX IF NOT EXISTS idx_urls_user_id ON urls(user_id);\n';

  // Indexes for Clicks table
  query += 'CREATE INDEX IF NOT EXISTS idx_clicks_url_id ON clicks(url_id);\n';
  query += 'CREATE INDEX IF NOT EXISTS idx_clicks_clicked_at ON clicks(clicked_at);\n';
  // Add composite index for analytics queries to improve performance
  query +=
    'CREATE INDEX IF NOT EXISTS idx_clicks_url_id_clicked_at ON clicks(url_id, clicked_at);\n';
  // Add index for analytics with additional columns to avoid table lookups
  query +=
    'CREATE INDEX IF NOT EXISTS idx_clicks_analytics ON clicks(url_id, clicked_at) INCLUDE (country, browser, device_type);\n';

  // Indexes for QR Codes table
  query += 'CREATE INDEX IF NOT EXISTS idx_qr_codes_url_id ON qr_codes(url_id);\n';

  return query;
};

/**
 * Generates SQL statements to drop indexes from the database tables
 *
 * @returns {string} SQL statements for dropping indexes
 */
exports.dropIndexes = (): string => {
  let query = '';

  // Drop indexes for URLs table
  query += 'DROP INDEX IF EXISTS idx_urls_short_code;\n';
  query += 'DROP INDEX IF EXISTS idx_urls_user_id;\n';

  // Drop indexes for Clicks table
  query += 'DROP INDEX IF EXISTS idx_clicks_url_id;\n';
  query += 'DROP INDEX IF EXISTS idx_clicks_clicked_at;\n';
  query += 'DROP INDEX IF EXISTS idx_clicks_url_id_clicked_at;\n';
  query += 'DROP INDEX IF EXISTS idx_clicks_analytics;\n';

  // Drop indexes for QR Codes table
  query += 'DROP INDEX IF EXISTS idx_qr_codes_url_id;\n';

  return query;
};
