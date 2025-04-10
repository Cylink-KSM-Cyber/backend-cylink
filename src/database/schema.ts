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
    id: "SERIAL PRIMARY KEY",
    email: "VARCHAR(255) NOT NULL",
    password: "VARCHAR(255) NOT NULL",
    username: "VARCHAR(255)",
    role: `ENUM('user', 'admin')`,
    verification_token: "VARCHAR(255)",
    email_verified_at: "TIMESTAMP",
    last_email_verify_requested_at: "TIMESTAMP",
    timestamps: true,
  },

  /**
   * URLs table for storing shortened links
   *
   * Contains original URL, short code, and additional metadata
   * such as title, expiry date, and password protection
   */
  urls: {
    id: "SERIAL PRIMARY KEY",
    user_id: "INTEGER REFERENCES users(id) ON DELETE SET NULL",
    original_url: "TEXT NOT NULL",
    short_code: "VARCHAR(10) UNIQUE NOT NULL",
    title: "VARCHAR(255)",
    expiry_date: "TIMESTAMP WITH TIME ZONE",
    is_active: "BOOLEAN DEFAULT TRUE",
    has_password: "BOOLEAN DEFAULT FALSE",
    password_hash: "VARCHAR(255)",
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
    id: "SERIAL PRIMARY KEY",
    url_id: "INTEGER NOT NULL REFERENCES urls(id) ON DELETE CASCADE",
    clicked_at: "TIMESTAMP WITH TIME ZONE DEFAULT NOW()",
    ip_address: "VARCHAR(45)",
    user_agent: "TEXT",
    referrer: "TEXT",
    country: "VARCHAR(2)",
    device_type: "VARCHAR(20)",
    browser: "VARCHAR(50)",
  },
};
