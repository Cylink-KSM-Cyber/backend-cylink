/**
 * Conversion Goal Model
 *
 * Provides functions for managing conversion goals
 * @module models/conversionGoalModel
 */

import { ConversionGoal, UrlConversionGoal } from '../interfaces/Conversion';
const pool = require('../config/database');

/**
 * Create a new conversion goal
 *
 * @param {ConversionGoal} goalData - The goal data
 * @returns {Promise<ConversionGoal>} The created goal
 */
exports.createGoal = async (goalData: ConversionGoal): Promise<ConversionGoal> => {
  const { user_id, name, description } = goalData;

  const result = await pool.query(
    `INSERT INTO conversion_goals
     (user_id, name, description)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [user_id, name, description],
  );

  return result.rows[0];
};

/**
 * Associate a goal with a URL
 *
 * @param {UrlConversionGoal} associationData - The association data
 * @returns {Promise<UrlConversionGoal>} The created association
 */
exports.associateGoalWithUrl = async (
  associationData: UrlConversionGoal,
): Promise<UrlConversionGoal> => {
  const { url_id, goal_id } = associationData;

  const result = await pool.query(
    `INSERT INTO url_conversion_goals
     (url_id, goal_id)
     VALUES ($1, $2)
     RETURNING *`,
    [url_id, goal_id],
  );

  return result.rows[0];
};

/**
 * Remove a goal association from a URL
 *
 * @param {number} urlId - The URL ID
 * @param {number} goalId - The goal ID
 * @returns {Promise<boolean>} Whether the association was removed
 */
exports.removeGoalFromUrl = async (urlId: number, goalId: number): Promise<boolean> => {
  const result = await pool.query(
    `DELETE FROM url_conversion_goals
     WHERE url_id = $1 AND goal_id = $2
     RETURNING id`,
    [urlId, goalId],
  );

  return result.rowCount > 0;
};

/**
 * Get goals for a URL
 *
 * @param {number} urlId - The URL ID
 * @returns {Promise<ConversionGoal[]>} Array of goals
 */
exports.getGoalsByUrlId = async (urlId: number): Promise<ConversionGoal[]> => {
  const result = await pool.query(
    `SELECT cg.*
     FROM conversion_goals cg
     JOIN url_conversion_goals ucg ON cg.id = ucg.goal_id
     WHERE ucg.url_id = $1`,
    [urlId],
  );

  return result.rows;
};

/**
 * Get all goals for a user
 *
 * @param {number} userId - The user ID
 * @returns {Promise<ConversionGoal[]>} Array of goals
 */
exports.getGoalsByUserId = async (userId: number): Promise<ConversionGoal[]> => {
  const result = await pool.query(
    `SELECT * FROM conversion_goals
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId],
  );

  return result.rows;
};

/**
 * Get a goal by ID
 *
 * @param {number} goalId - The goal ID
 * @returns {Promise<ConversionGoal|null>} The goal or null if not found
 */
exports.getGoalById = async (goalId: number): Promise<ConversionGoal | null> => {
  const result = await pool.query(
    `SELECT * FROM conversion_goals
     WHERE id = $1`,
    [goalId],
  );

  return result.rows[0] || null;
};

/**
 * Update a goal
 *
 * @param {number} goalId - The goal ID
 * @param {Partial<ConversionGoal>} updateData - The fields to update
 * @returns {Promise<ConversionGoal|null>} The updated goal or null if not found
 */
exports.updateGoal = async (
  goalId: number,
  updateData: Partial<ConversionGoal>,
): Promise<ConversionGoal | null> => {
  // Build dynamic update query
  const setClause: string[] = [];
  const values: any[] = [];
  let paramCounter = 1;

  Object.entries(updateData).forEach(([key, value]) => {
    if (key !== 'id' && key !== 'user_id' && key !== 'created_at') {
      setClause.push(`${key} = $${paramCounter}`);
      values.push(value);
      paramCounter++;
    }
  });

  // Add updated_at timestamp
  setClause.push(`updated_at = NOW()`);

  // Add the goal ID to the values array
  values.push(goalId);

  const result = await pool.query(
    `UPDATE conversion_goals
     SET ${setClause.join(', ')}
     WHERE id = $${paramCounter}
     RETURNING *`,
    values,
  );

  return result.rows[0] || null;
};

/**
 * Delete a goal
 *
 * @param {number} goalId - The goal ID
 * @returns {Promise<boolean>} Whether the goal was deleted
 */
exports.deleteGoal = async (goalId: number): Promise<boolean> => {
  const result = await pool.query(
    `DELETE FROM conversion_goals
     WHERE id = $1
     RETURNING id`,
    [goalId],
  );

  return result.rowCount > 0;
};

/**
 * Check if a URL has a goal association
 *
 * @param {number} urlId - The URL ID
 * @param {number} goalId - The goal ID
 * @returns {Promise<boolean>} Whether the URL has the goal
 */
exports.urlHasGoal = async (urlId: number, goalId: number): Promise<boolean> => {
  const result = await pool.query(
    `SELECT 1 FROM url_conversion_goals
     WHERE url_id = $1 AND goal_id = $2`,
    [urlId, goalId],
  );

  return result.rowCount > 0;
};

/**
 * Get full goal details including URL information
 *
 * @param {number} urlId - The URL ID
 * @param {number} goalId - The goal ID
 * @returns {Promise<any|null>} The goal details or null if not found
 */
exports.getGoalDetails = async (urlId: number, goalId: number): Promise<any | null> => {
  const result = await pool.query(
    `SELECT 
       cg.id as goal_id,
       cg.name as goal_name,
       cg.description,
       u.id as url_id,
       u.short_code,
       u.original_url
     FROM conversion_goals cg
     JOIN url_conversion_goals ucg ON cg.id = ucg.goal_id
     JOIN urls u ON ucg.url_id = u.id
     WHERE ucg.url_id = $1 AND ucg.goal_id = $2`,
    [urlId, goalId],
  );

  return result.rows[0] || null;
};
