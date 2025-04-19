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

  // Indexes for Conversion Goals table
  query +=
    'CREATE INDEX IF NOT EXISTS idx_conversion_goals_user_id ON conversion_goals(user_id);\n';

  // Indexes for URL Conversion Goals table
  query +=
    'CREATE INDEX IF NOT EXISTS idx_url_conversion_goals_url_id ON url_conversion_goals(url_id);\n';
  query +=
    'CREATE INDEX IF NOT EXISTS idx_url_conversion_goals_goal_id ON url_conversion_goals(goal_id);\n';

  // Indexes for Conversions table
  query += 'CREATE INDEX IF NOT EXISTS idx_conversions_url_id ON conversions(url_id);\n';
  query += 'CREATE INDEX IF NOT EXISTS idx_conversions_click_id ON conversions(click_id);\n';
  query += 'CREATE INDEX IF NOT EXISTS idx_conversions_goal_id ON conversions(goal_id);\n';
  query +=
    'CREATE INDEX IF NOT EXISTS idx_conversions_converted_at ON conversions(converted_at);\n';
  // Composite indexes for analytics queries
  query += 'CREATE INDEX IF NOT EXISTS idx_conversions_url_goal ON conversions(url_id, goal_id);\n';
  query +=
    'CREATE INDEX IF NOT EXISTS idx_conversions_url_date ON conversions(url_id, converted_at);\n';

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

  // Drop indexes for Conversion Goals table
  query += 'DROP INDEX IF EXISTS idx_conversion_goals_user_id;\n';

  // Drop indexes for URL Conversion Goals table
  query += 'DROP INDEX IF EXISTS idx_url_conversion_goals_url_id;\n';
  query += 'DROP INDEX IF EXISTS idx_url_conversion_goals_goal_id;\n';

  // Drop indexes for Conversions table
  query += 'DROP INDEX IF EXISTS idx_conversions_url_id;\n';
  query += 'DROP INDEX IF EXISTS idx_conversions_click_id;\n';
  query += 'DROP INDEX IF EXISTS idx_conversions_goal_id;\n';
  query += 'DROP INDEX IF EXISTS idx_conversions_converted_at;\n';
  query += 'DROP INDEX IF EXISTS idx_conversions_url_goal;\n';
  query += 'DROP INDEX IF EXISTS idx_conversions_url_date;\n';

  return query;
};
