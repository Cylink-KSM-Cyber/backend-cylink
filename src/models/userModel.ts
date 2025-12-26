/**
 * User Model
 *
 * Provides functions for interacting with the users table
 * @module models/userModel
 */

import { User } from '../collections/userCollection';

const pool = require('../config/database');

/**
 * Retrieves a user by email
 * @param {string} email - Email address to search for
 * @returns {Promise<User|undefined>} User object or undefined if not found
 */
export const getUserByEmail = async (email: string): Promise<User | undefined> => {
  const res = await pool.query('SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL', [
    email,
  ]);

  return res.rows[0];
};

/**
 * Retrieves a user by ID
 * @param {number} id - User ID to search for
 * @returns {Promise<User|undefined>} User object or undefined if not found
 */
export const getUserById = async (id: number): Promise<User | undefined> => {
  const res = await pool.query('SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL', [id]);

  return res.rows[0];
};

/**
 * Retrieves a user by username
 * @param {string} username - Username to search for
 * @returns {Promise<User|undefined>} User object or undefined if not found
 */
export const getUserByUsername = async (username: string): Promise<User | undefined> => {
  const res = await pool.query('SELECT * FROM users WHERE username = $1 AND deleted_at IS NULL', [
    username,
  ]);

  return res.rows[0];
};

/**
 * Retrieves a user by password reset token
 * @param {string} token - Password reset token to search for
 * @returns {Promise<User|undefined>} User object or undefined if not found or token expired
 */
export const getUserByPasswordResetToken = async (token: string): Promise<User | undefined> => {
  const res = await pool.query(
    `SELECT * FROM users 
     WHERE password_reset_token = $1 
     AND password_reset_expires_at > NOW() 
     AND deleted_at IS NULL`,
    [token],
  );

  return res.rows[0];
};

/**
 * Creates a new user
 * @param {User} user - User data to create
 * @returns {Promise<User>} Created user
 */
export const createUser = async (user: User): Promise<User> => {
  const query = `
    INSERT INTO users (email, password, username, role, verification_token)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const res = await pool.query(query, [
    user.email,
    user.password,
    user.username,
    user.role ?? 'user',
    user.verification_token,
  ]);

  return res.rows[0];
};

/**
 * Updates a user
 * @param {Partial<User>} userData - User data to update
 * @param {number} userId - User ID to update
 * @returns {Promise<User>} Updated user
 */
export const updateUser = async (userData: Partial<User>, userId?: number): Promise<User> => {
  // Build dynamic update query based on provided fields
  const updateFields: string[] = [];
  const values: unknown[] = [];
  let paramCounter = 1;

  Object.entries(userData).forEach(([key, value]) => {
    if (value !== undefined) {
      updateFields.push(`${key} = $${paramCounter}`);
      values.push(value);
      paramCounter++;
    }
  });

  // Add updated_at timestamp
  updateFields.push(`updated_at = NOW()`);

  // Add WHERE condition
  let whereClause = '';
  if (userId) {
    whereClause = `WHERE id = $${paramCounter}`;
    values.push(userId);
  } else if (userData.email) {
    whereClause = `WHERE email = $${paramCounter}`;
    values.push(userData.email);
  }

  const query = `
    UPDATE users 
    SET ${updateFields.join(', ')}
    ${whereClause}
    RETURNING *
  `;

  const res = await pool.query(query, values);
  return res.rows[0];
};

/**
 * Sets password reset token and expiration for a user
 * @param {string} email - User email
 * @param {string} token - Password reset token
 * @param {Date} expiresAt - Token expiration time
 * @returns {Promise<User>} Updated user
 */
export const setPasswordResetToken = async (
  email: string,
  token: string,
  expiresAt: Date,
): Promise<User> => {
  const query = `
    UPDATE users 
    SET password_reset_token = $1,
        password_reset_expires_at = $2,
        password_reset_requested_at = NOW(),
        updated_at = NOW()
    WHERE email = $3 AND deleted_at IS NULL
    RETURNING *
  `;

  const res = await pool.query(query, [token, expiresAt, email]);
  return res.rows[0];
};

/**
 * Clears password reset token for a user
 * @param {string} email - User email
 * @returns {Promise<User>} Updated user
 */
export const clearPasswordResetToken = async (email: string): Promise<User> => {
  const query = `
    UPDATE users 
    SET password_reset_token = NULL,
        password_reset_expires_at = NULL,
        updated_at = NOW()
    WHERE email = $1 AND deleted_at IS NULL
    RETURNING *
  `;

  const res = await pool.query(query, [email]);
  return res.rows[0];
};

/**
 * Clears password reset token by token value
 * @param {string} token - Password reset token
 * @returns {Promise<User>} Updated user
 */
export const clearPasswordResetTokenByToken = async (token: string): Promise<User> => {
  const query = `
    UPDATE users 
    SET password_reset_token = NULL,
        password_reset_expires_at = NULL,
        updated_at = NOW()
    WHERE password_reset_token = $1 AND deleted_at IS NULL
    RETURNING *
  `;

  const res = await pool.query(query, [token]);
  return res.rows[0];
};

/**
 * Cleans up expired password reset tokens
 * @returns {Promise<number>} Number of tokens cleaned up
 */
export const cleanupExpiredPasswordResetTokens = async (): Promise<number> => {
  const query = `
    UPDATE users 
    SET password_reset_token = NULL,
        password_reset_expires_at = NULL,
        updated_at = NOW()
    WHERE password_reset_expires_at < NOW() 
    AND password_reset_token IS NOT NULL
    AND deleted_at IS NULL
  `;

  const res = await pool.query(query);
  return res.rowCount ?? 0;
};

/**
 * Checks if user has requested password reset within rate limit window
 * @param {string} email - User email
 * @param {number} windowMinutes - Rate limit window in minutes (default: 5)
 * @returns {Promise<boolean>} True if within rate limit, false otherwise
 */
export const isWithinPasswordResetRateLimit = async (
  email: string,
  windowMinutes: number = 5,
): Promise<boolean> => {
  const query = `
    SELECT password_reset_requested_at 
    FROM users 
    WHERE email = $1 
    AND password_reset_requested_at > NOW() - INTERVAL '${windowMinutes} minutes'
    AND deleted_at IS NULL
  `;

  const res = await pool.query(query, [email]);
  return res.rows.length > 0;
};

/**
 * Inserts a login record into user_logins table
 * @param {number} userId - User ID
 * @param {string | null} ipAddress - IP address
 * @param {string | null} userAgent - User agent string
 * @returns {Promise<void>}
 */
export const insertUserLogin = async (
  userId: number,
  ipAddress: string | null,
  userAgent: string | null,
): Promise<void> => {
  const query = `
    INSERT INTO user_logins (user_id, ip_address, user_agent)
    VALUES ($1, $2, $3)
  `;
  await pool.query(query, [userId, ipAddress, userAgent]);
};

/**
 * Gets the last_login value for a user
 * @param {number} userId - User ID
 * @returns {Promise<Date | null>} last_login value or null
 */
export const getLastLogin = async (userId: number): Promise<Date | null> => {
  const res = await pool.query('SELECT last_login FROM users WHERE id = $1', [userId]);
  return res.rows[0]?.last_login ?? null;
};

/**
 * Retrieves a user by Google ID
 * @param {string} googleId - Google user ID
 * @returns {Promise<User|undefined>} User object or undefined if not found
 */
export const getUserByGoogleId = async (googleId: string): Promise<User | undefined> => {
  const res = await pool.query('SELECT * FROM users WHERE google_id = $1 AND deleted_at IS NULL', [
    googleId,
  ]);

  return res.rows[0];
};

/**
 * Links a Google account to an existing user
 * @param {number} userId - User ID
 * @param {string} googleId - Google user ID
 * @param {object} tokens - OAuth tokens
 * @returns {Promise<User>} Updated user
 */
export const linkGoogleAccount = async (
  userId: number,
  googleId: string,
  tokens: { access_token: string; refresh_token?: string },
): Promise<User> => {
  const query = `
    UPDATE users 
    SET google_id = $1,
        oauth_provider = $2,
        oauth_access_token = $3,
        oauth_refresh_token = $4,
        updated_at = NOW()
    WHERE id = $5 AND deleted_at IS NULL
    RETURNING *
  `;

  const res = await pool.query(query, [
    googleId,
    'google',
    tokens.access_token,
    tokens.refresh_token || null,
    userId,
  ]);

  return res.rows[0];
};

/**
 * Updates OAuth tokens for a user
 * @param {number} userId - User ID
 * @param {object} tokens - OAuth tokens
 * @returns {Promise<User>} Updated user
 */
export const updateOAuthTokens = async (
  userId: number,
  tokens: { access_token: string; refresh_token?: string },
): Promise<User> => {
  const query = `
    UPDATE users 
    SET oauth_access_token = $1,
        oauth_refresh_token = $2,
        updated_at = NOW()
    WHERE id = $3 AND deleted_at IS NULL
    RETURNING *
  `;

  const res = await pool.query(query, [tokens.access_token, tokens.refresh_token || null, userId]);

  return res.rows[0];
};

/**
 * Creates a new OAuth user
 * @param {object} userData - User data from OAuth provider
 * @returns {Promise<User>} Created user
 */
export const createOAuthUser = async (userData: {
  email: string;
  username: string;
  google_id: string;
  oauth_provider: string;
  oauth_access_token: string;
  oauth_refresh_token?: string;
}): Promise<User> => {
  const query = `
    INSERT INTO users (
      email, 
      username, 
      google_id, 
      oauth_provider, 
      oauth_access_token, 
      oauth_refresh_token,
      email_verified_at,
      role
    )
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
    RETURNING *
  `;

  const res = await pool.query(query, [
    userData.email,
    userData.username,
    userData.google_id,
    userData.oauth_provider,
    userData.oauth_access_token,
    userData.oauth_refresh_token || null,
    'user',
  ]);

  return res.rows[0];
};
