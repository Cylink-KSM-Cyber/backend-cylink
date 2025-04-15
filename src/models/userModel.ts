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
