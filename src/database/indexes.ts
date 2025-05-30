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

  // Indexes for Users table
  query += 'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);\n';
  query +=
    'CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token) WHERE password_reset_token IS NOT NULL;\n';
  query +=
    'CREATE INDEX IF NOT EXISTS idx_users_password_reset_expires ON users(password_reset_expires_at) WHERE password_reset_expires_at IS NOT NULL;\n';

  // Indexes for URLs table
  query += 'CREATE INDEX IF NOT EXISTS idx_urls_short_code ON urls(short_code);\n';
  query += 'CREATE INDEX IF NOT EXISTS idx_urls_user_id ON urls(user_id);\n';
  query += 'CREATE INDEX IF NOT EXISTS idx_urls_created_at ON urls(created_at);\n';
  query += 'CREATE INDEX IF NOT EXISTS idx_urls_expiry_date ON urls(expiry_date);\n';
  query += 'CREATE INDEX IF NOT EXISTS idx_urls_deleted_at ON urls(deleted_at);\n';
  query += 'CREATE INDEX IF NOT EXISTS idx_urls_is_active ON urls(is_active);\n';
  // Composite index for URL expiration queries
  query +=
    'CREATE INDEX IF NOT EXISTS idx_urls_expiry_active_deleted ON urls(expiry_date, is_active, deleted_at) WHERE expiry_date IS NOT NULL;\n';
  query +=
    'CREATE INDEX IF NOT EXISTS idx_urls_is_active_deleted_at ON urls(is_active, deleted_at);\n';
  query +=
    'CREATE INDEX IF NOT EXISTS idx_urls_user_id_is_active_deleted_at ON urls(user_id, is_active, deleted_at);\n';
  query += 'CREATE INDEX IF NOT EXISTS idx_urls_lower_title ON urls(LOWER(title));\n';
  query += 'CREATE INDEX IF NOT EXISTS idx_urls_lower_short_code ON urls(LOWER(short_code));\n';
  query += 'CREATE INDEX IF NOT EXISTS idx_urls_lower_original_url ON urls(LOWER(original_url));\n';

  // Text search indexes for the URLs table
  query += 'CREATE INDEX IF NOT EXISTS idx_urls_original_url ON urls(original_url);\n';
  query += 'CREATE INDEX IF NOT EXISTS idx_urls_title ON urls(title);\n';

  // Functional indexes for case-insensitive search
  query += 'CREATE INDEX IF NOT EXISTS idx_urls_original_url_lower ON urls(LOWER(original_url));\n';
  query += 'CREATE INDEX IF NOT EXISTS idx_urls_short_code_lower ON urls(LOWER(short_code));\n';
  query += 'CREATE INDEX IF NOT EXISTS idx_urls_title_lower ON urls(LOWER(title));\n';

  // GIN indexes for full-text search (if needed in the future)
  query +=
    "CREATE INDEX IF NOT EXISTS idx_urls_original_url_gin ON urls USING gin(to_tsvector('english', original_url));\n";
  query +=
    "CREATE INDEX IF NOT EXISTS idx_urls_short_code_gin ON urls USING gin(to_tsvector('english', short_code));\n";
  query +=
    "CREATE INDEX IF NOT EXISTS idx_urls_title_gin ON urls USING gin(to_tsvector('english', coalesce(title, '')));\n";

  // Indexes for Clicks table
  query += 'CREATE INDEX IF NOT EXISTS idx_clicks_url_id ON clicks(url_id);\n';
  query += 'CREATE INDEX IF NOT EXISTS idx_clicks_clicked_at ON clicks(clicked_at);\n';
  // Add composite index for analytics queries to improve performance
  query +=
    'CREATE INDEX IF NOT EXISTS idx_clicks_url_id_clicked_at ON clicks(url_id, clicked_at);\n';
  // Add index for analytics with additional columns to avoid table lookups
  query += 'CREATE INDEX IF NOT EXISTS idx_clicks_country ON clicks(country);\n';
  query += 'CREATE INDEX IF NOT EXISTS idx_clicks_device_type ON clicks(device_type);\n';
  query += 'CREATE INDEX IF NOT EXISTS idx_clicks_browser ON clicks(browser);\n';

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

  // Indexes for Impressions table
  query += 'CREATE INDEX IF NOT EXISTS idx_impressions_url_id ON impressions(url_id);\n';
  query += 'CREATE INDEX IF NOT EXISTS idx_impressions_timestamp ON impressions(timestamp);\n';
  query += 'CREATE INDEX IF NOT EXISTS idx_impressions_unique ON impressions(is_unique);\n';
  query +=
    'CREATE INDEX IF NOT EXISTS idx_impressions_url_id_timestamp ON impressions(url_id, timestamp);\n';
  query += 'CREATE INDEX IF NOT EXISTS idx_impressions_source ON impressions(source);\n';

  return query;
};

/**
 * Generates SQL statements to drop indexes from the database tables
 *
 * @returns {string} SQL statements for dropping indexes
 */
exports.dropIndexes = (): string => {
  let query = '';

  // Drop indexes for Users table
  query += 'DROP INDEX IF EXISTS idx_users_email;\n';
  query += 'DROP INDEX IF EXISTS idx_users_password_reset_token;\n';
  query += 'DROP INDEX IF EXISTS idx_users_password_reset_expires;\n';

  // Drop indexes for URLs table
  query += 'DROP INDEX IF EXISTS idx_urls_short_code;\n';
  query += 'DROP INDEX IF EXISTS idx_urls_user_id;\n';
  query += 'DROP INDEX IF EXISTS idx_urls_created_at;\n';
  query += 'DROP INDEX IF EXISTS idx_urls_expiry_date;\n';
  query += 'DROP INDEX IF EXISTS idx_urls_deleted_at;\n';
  query += 'DROP INDEX IF EXISTS idx_urls_is_active;\n';
  query += 'DROP INDEX IF EXISTS idx_urls_expiry_active_deleted;\n';
  query += 'DROP INDEX IF EXISTS idx_urls_is_active_deleted_at;\n';
  query += 'DROP INDEX IF EXISTS idx_urls_user_id_is_active_deleted_at;\n';
  query += 'DROP INDEX IF EXISTS idx_urls_lower_title;\n';
  query += 'DROP INDEX IF EXISTS idx_urls_lower_short_code;\n';
  query += 'DROP INDEX IF EXISTS idx_urls_lower_original_url;\n';
  query += 'DROP INDEX IF EXISTS idx_urls_original_url;\n';
  query += 'DROP INDEX IF EXISTS idx_urls_title;\n';
  query += 'DROP INDEX IF EXISTS idx_urls_original_url_lower;\n';
  query += 'DROP INDEX IF EXISTS idx_urls_short_code_lower;\n';
  query += 'DROP INDEX IF EXISTS idx_urls_title_lower;\n';
  query += 'DROP INDEX IF EXISTS idx_urls_original_url_gin;\n';
  query += 'DROP INDEX IF EXISTS idx_urls_short_code_gin;\n';
  query += 'DROP INDEX IF EXISTS idx_urls_title_gin;\n';

  // Drop indexes for Clicks table
  query += 'DROP INDEX IF EXISTS idx_clicks_url_id;\n';
  query += 'DROP INDEX IF EXISTS idx_clicks_clicked_at;\n';
  query += 'DROP INDEX IF EXISTS idx_clicks_url_id_clicked_at;\n';
  query += 'DROP INDEX IF EXISTS idx_clicks_country;\n';
  query += 'DROP INDEX IF EXISTS idx_clicks_device_type;\n';
  query += 'DROP INDEX IF EXISTS idx_clicks_browser;\n';

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

  // Drop indexes for Impressions table
  query += 'DROP INDEX IF EXISTS idx_impressions_url_id;\n';
  query += 'DROP INDEX IF EXISTS idx_impressions_timestamp;\n';
  query += 'DROP INDEX IF EXISTS idx_impressions_unique;\n';
  query += 'DROP INDEX IF EXISTS idx_impressions_url_id_timestamp;\n';
  query += 'DROP INDEX IF EXISTS idx_impressions_source;\n';

  return query;
};
