const pool = require("@/config/database");

/**
 * URL Model
 *
 * Provides functions for interacting with the URLs table
 * @module models/urlModel
 */

/**
 * URL object interface
 * @typedef {Object} URL
 * @property {number} id - The URL's unique identifier
 * @property {number|null} user_id - The ID of the user who created the URL
 * @property {string} original_url - The original long URL
 * @property {string} short_code - The shortened URL code
 * @property {string|null} title - Optional title for the URL
 * @property {Date|null} expiry_date - Optional expiration date
 * @property {boolean} is_active - Whether the URL is active
 * @property {boolean} has_password - Whether the URL is password protected
 * @property {string|null} password_hash - Hashed password if protected
 * @property {string} redirect_type - HTTP redirect type (301 or 302)
 * @property {Date} created_at - When the URL was created
 * @property {Date} updated_at - When the URL was last updated
 * @property {Date|null} deleted_at - When the URL was soft deleted (if applicable)
 */

interface UrlData {
  user_id?: number;
  original_url: string;
  short_code: string;
  title?: string;
  expiry_date?: Date;
  is_active?: boolean;
  has_password?: boolean;
  password_hash?: string;
  redirect_type?: string;
}

interface UrlUpdateData {
  original_url?: string;
  short_code?: string;
  title?: string;
  expiry_date?: Date;
  is_active?: boolean;
  has_password?: boolean;
  password_hash?: string;
  redirect_type?: string;
}

/**
 * Create a new shortened URL
 *
 * @param {UrlData} urlData - The URL data
 * @returns {Promise<any>} The created URL object
 */
exports.createUrl = async (urlData: UrlData) => {
  const {
    user_id,
    original_url,
    short_code,
    title,
    expiry_date,
    is_active = true,
    has_password = false,
    password_hash,
    redirect_type = "302",
  } = urlData;

  const result = await pool.query(
    `INSERT INTO urls 
    (user_id, original_url, short_code, title, expiry_date, is_active, has_password, password_hash, redirect_type)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      user_id,
      original_url,
      short_code,
      title,
      expiry_date,
      is_active,
      has_password,
      password_hash,
      redirect_type,
    ]
  );

  return result.rows[0];
};

/**
 * Get a URL by its short code
 *
 * @param {string} shortCode - The short code to look up
 * @returns {Promise<any|null>} The URL object or null if not found
 */
exports.getUrlByShortCode = async (shortCode: string) => {
  const result = await pool.query(
    "SELECT * FROM urls WHERE short_code = $1 AND is_active = TRUE AND deleted_at IS NULL",
    [shortCode]
  );

  return result.rows[0] || null;
};

/**
 * Get all URLs created by a specific user
 *
 * @param {number} userId - The user ID
 * @returns {Promise<any[]>} Array of URL objects
 */
exports.getUrlsByUser = async (userId: number) => {
  const result = await pool.query(
    "SELECT * FROM urls WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC",
    [userId]
  );

  return result.rows;
};

/**
 * Update an existing URL
 *
 * @param {number} id - The URL ID to update
 * @param {UrlUpdateData} updateData - The fields to update
 * @returns {Promise<any|null>} The updated URL or null if not found
 */
exports.updateUrl = async (id: number, updateData: UrlUpdateData) => {
  // Build dynamic update query
  const setClause = [];
  const values = [];
  let paramCounter = 1;

  Object.entries(updateData).forEach(([key, value]) => {
    setClause.push(`${key} = $${paramCounter}`);
    values.push(value);
    paramCounter++;
  });

  // Add updated_at timestamp
  setClause.push(`updated_at = NOW()`);

  // Add the ID to the values array
  values.push(id);

  const result = await pool.query(
    `UPDATE urls SET ${setClause.join(
      ", "
    )} WHERE id = $${paramCounter} RETURNING *`,
    values
  );

  return result.rows[0] || null;
};

/**
 * Soft delete a URL by ID
 *
 * @param {number} id - The URL ID to delete
 * @returns {Promise<boolean>} Whether the deletion was successful
 */
exports.deleteUrl = async (id: number) => {
  const result = await pool.query(
    "UPDATE urls SET deleted_at = NOW(), is_active = FALSE WHERE id = $1 RETURNING id",
    [id]
  );

  return result.rowCount > 0;
};

/**
 * Check if a short code already exists
 *
 * @param {string} shortCode - The short code to check
 * @returns {Promise<boolean>} Whether the short code exists
 */
exports.shortCodeExists = async (shortCode: string) => {
  const result = await pool.query("SELECT 1 FROM urls WHERE short_code = $1", [
    shortCode,
  ]);

  return result.rowCount > 0;
};

/**
 * Get a URL by its ID (including soft deleted URLs)
 *
 * @param {number} id - The URL ID to look up
 * @param {boolean} includeDeleted - Whether to include soft deleted URLs
 * @returns {Promise<any|null>} The URL object or null if not found
 */
exports.getUrlById = async (id: number, includeDeleted = false) => {
  let query = "SELECT * FROM urls WHERE id = $1";

  if (!includeDeleted) {
    query += " AND deleted_at IS NULL";
  }

  const result = await pool.query(query, [id]);

  return result.rows[0] || null;
};
