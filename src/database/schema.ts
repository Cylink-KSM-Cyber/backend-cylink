/**
 * Abstraction layer for defining SQL tables.
 *
 * Usage: {
 *   table_name: {
 *     column_name: 'raw schema definition',
 *   }
 * }
 */
module.exports = {
  users: {
    id: 'SERIAL PRIMARY KEY',
    email: 'VARCHAR(255) NOT NULL',
    password: 'VARCHAR(255) NOT NULL',
    username: 'VARCHAR(255)',
    role: `ENUM('user', 'admin')`,
    timezone: `VARCHAR(50) DEFAULT 'UTC'`,
    verification_token: 'VARCHAR(255)',
    email_verified_at: 'TIMESTAMP',
    last_email_verify_requested_at: 'TIMESTAMP',
    password_reset_token: 'VARCHAR(255)',
    password_reset_expires_at: 'TIMESTAMP WITH TIME ZONE',
    password_reset_requested_at: 'TIMESTAMP WITH TIME ZONE',
    timestamps: true,
  },

  /**
   * URLs table for storing shortened links
   *
   * Contains original URL, short code, and additional metadata
   * such as title, expiry date, and password protection
   */
  urls: {
    id: 'SERIAL PRIMARY KEY',
    user_id: 'INTEGER REFERENCES users(id) ON DELETE SET NULL',
    original_url: 'TEXT NOT NULL',
    short_code: 'VARCHAR(10) UNIQUE NOT NULL',
    title: 'VARCHAR(255)',
    expiry_date: 'TIMESTAMP WITH TIME ZONE',
    auto_expired_at: 'TIMESTAMP WITH TIME ZONE',
    is_active: 'BOOLEAN DEFAULT TRUE',
    has_password: 'BOOLEAN DEFAULT FALSE',
    password_hash: 'VARCHAR(255)',
    redirect_type: `VARCHAR(3) DEFAULT '302'`,
    timestamps: true,
  },

  /**
   * Clicks table for tracking and analytics
   *
   * Stores data about each click on a shortened URL
   * including IP address, user agent, referrer, and geo information
   */
  clicks: {
    id: 'SERIAL PRIMARY KEY',
    url_id: 'INTEGER NOT NULL REFERENCES urls(id) ON DELETE CASCADE',
    clicked_at: 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
    ip_address: 'VARCHAR(45)',
    user_agent: 'TEXT',
    referrer: 'TEXT',
    country: 'VARCHAR(2)',
    device_type: 'VARCHAR(20)',
    browser: 'VARCHAR(50)',
  },

  /**
   * Impressions table for tracking URL views
   *
   * Stores data about each time a URL is displayed to users
   * used for calculating Click-Through Rate (CTR)
   */
  impressions: {
    id: 'SERIAL PRIMARY KEY',
    url_id: 'INTEGER NOT NULL REFERENCES urls(id) ON DELETE CASCADE',
    timestamp: 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
    ip_address: 'VARCHAR(45)',
    user_agent: 'TEXT',
    referrer: 'TEXT',
    is_unique: 'BOOLEAN DEFAULT false',
    source: 'VARCHAR(100)',
  },

  /**
   * QR Codes table for storing QR code configurations
   *
   * Contains customization options for QR codes linked to URLs
   * such as colors, logo options, and size
   */
  qr_codes: {
    id: 'SERIAL PRIMARY KEY',
    url_id: 'INTEGER NOT NULL REFERENCES urls(id) ON DELETE CASCADE',
    color: "VARCHAR(7) NOT NULL DEFAULT '#000000'",
    background_color: "VARCHAR(7) NOT NULL DEFAULT '#FFFFFF'",
    include_logo: 'BOOLEAN NOT NULL DEFAULT TRUE',
    logo_size: 'DECIMAL(3,2) NOT NULL DEFAULT 0.2 CHECK (logo_size >= 0.1 AND logo_size <= 0.3)',
    size: 'INTEGER NOT NULL DEFAULT 300',
    created_at: 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
    updated_at: 'TIMESTAMP WITH TIME ZONE',
    deleted_at: 'TIMESTAMP WITH TIME ZONE DEFAULT NULL',
  },

  /**
   * Conversion Goals table for storing different conversion objectives
   *
   * Defines various goals that can be tracked for URLs
   */
  conversion_goals: {
    id: 'SERIAL PRIMARY KEY',
    user_id: 'INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE',
    name: 'VARCHAR(255) NOT NULL',
    description: 'TEXT',
    created_at: 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
    updated_at: 'TIMESTAMP WITH TIME ZONE',
  },

  /**
   * URL Conversion Goals table for associating goals with URLs
   *
   * Links conversion goals to specific URLs
   */
  url_conversion_goals: {
    id: 'SERIAL PRIMARY KEY',
    url_id: 'INTEGER NOT NULL REFERENCES urls(id) ON DELETE CASCADE',
    goal_id: 'INTEGER NOT NULL REFERENCES conversion_goals(id) ON DELETE CASCADE',
    created_at: 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
    unique: ['url_id', 'goal_id'],
  },

  /**
   * Conversions table for tracking successful conversions
   *
   * Records when users complete desired actions after clicking URLs
   */
  conversions: {
    id: 'SERIAL PRIMARY KEY',
    click_id: 'INTEGER REFERENCES clicks(id) ON DELETE SET NULL',
    url_id: 'INTEGER NOT NULL REFERENCES urls(id) ON DELETE CASCADE',
    goal_id: 'INTEGER REFERENCES conversion_goals(id) ON DELETE SET NULL',
    conversion_value: 'DECIMAL(10, 2)',
    converted_at: 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
    user_agent: 'TEXT',
    ip_address: 'VARCHAR(45)',
    referrer: 'TEXT',
    custom_data: 'JSONB',
  },
};
