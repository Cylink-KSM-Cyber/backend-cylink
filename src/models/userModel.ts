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
exports.getUserByEmail = async (email: string): Promise<User | undefined> => {
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
exports.getUserById = async (id: number): Promise<User | undefined> => {
  const res = await pool.query('SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL', [id]);

  return res.rows[0];
};

/**
 * Retrieves a user by password reset token
 * @param {string} token - Password reset token to search for
 * @returns {Promise<User|undefined>} User object or undefined if not found or token expired
 */
exports.getUserByPasswordResetToken = async (token: string): Promise<User | undefined> => {
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
exports.createUser = async (user: User): Promise<User> => {
  const query = `
    INSERT INTO users (email, password, username, role, verification_token)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const res = await pool.query(query, [
    user.email,
    user.password,
    user.username,
    user.role || 'user',
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
exports.updateUser = async (userData: Partial<User>, userId?: number): Promise<User> => {
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
exports.setPasswordResetToken = async (
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
exports.clearPasswordResetToken = async (email: string): Promise<User> => {
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
exports.clearPasswordResetTokenByToken = async (token: string): Promise<User> => {
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
exports.cleanupExpiredPasswordResetTokens = async (): Promise<number> => {
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
  return res.rowCount || 0;
};

/**
 * Checks if user has requested password reset within rate limit window
 * @param {string} email - User email
 * @param {number} windowMinutes - Rate limit window in minutes (default: 5)
 * @returns {Promise<boolean>} True if within rate limit, false otherwise
 */
exports.isWithinPasswordResetRateLimit = async (
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
