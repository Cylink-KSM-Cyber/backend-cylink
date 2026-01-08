/**
 * Feedback Vote Model
 *
 * Provides functions for interacting with the feedback_votes table
 * @module models/feedbackVoteModel
 */

const pool = require('../config/database');

/**
 * Vote type enumeration
 */
export type VoteType = 'upvote' | 'downvote';

/**
 * Vote reason enumeration
 */
export type VoteReason =
  | 'not_useful'
  | 'duplicate'
  | 'unclear'
  | 'out_of_scope'
  | 'not_reproducible'
  | 'spam'
  | 'off_topic'
  | 'other';

/**
 * Vote data interface
 */
export interface VoteData {
  id: number;
  feedback_id: number;
  user_id: number;
  vote_type: VoteType;
  reason: VoteReason | null;
  comment: string | null;
  created_at: Date;
}

/**
 * Vote creation input interface
 */
export interface VoteCreateInput {
  feedback_id: number;
  user_id: number;
  vote_type: VoteType;
  reason?: VoteReason;
  comment?: string;
}

/**
 * Voter information interface
 */
export interface VoterInfo {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
}

/**
 * Creates a new vote
 * @param data - Vote creation data
 * @returns Created vote object
 */
export const createVote = async (data: VoteCreateInput): Promise<VoteData> => {
  const query = `
    INSERT INTO feedback_votes (feedback_id, user_id, vote_type, reason, comment)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const res = await pool.query(query, [
    data.feedback_id,
    data.user_id,
    data.vote_type,
    data.reason || null,
    data.comment || null,
  ]);

  return res.rows[0];
};

/**
 * Retrieves a vote by user and feedback
 * @param userId - User ID
 * @param feedbackId - Feedback ID
 * @returns Vote object or null if not found
 */
export const getVoteByUserAndFeedback = async (
  userId: number,
  feedbackId: number,
): Promise<VoteData | null> => {
  const query = `
    SELECT * FROM feedback_votes 
    WHERE user_id = $1 AND feedback_id = $2
  `;

  const res = await pool.query(query, [userId, feedbackId]);
  return res.rows[0] || null;
};

/**
 * Updates an existing vote
 * @param id - Vote ID
 * @param data - Data to update
 * @returns Updated vote object
 */
export const updateVote = async (
  id: number,
  data: Partial<VoteCreateInput>,
): Promise<VoteData | null> => {
  const updateFields: string[] = [];
  const values: (string | number | null)[] = [];
  let paramIndex = 1;

  if (data.vote_type !== undefined) {
    updateFields.push(`vote_type = $${paramIndex}`);
    values.push(data.vote_type);
    paramIndex++;
  }

  if (data.reason !== undefined) {
    updateFields.push(`reason = $${paramIndex}`);
    values.push(data.reason || null);
    paramIndex++;
  }

  if (data.comment !== undefined) {
    updateFields.push(`comment = $${paramIndex}`);
    values.push(data.comment || null);
    paramIndex++;
  }

  if (updateFields.length === 0) {
    const query = `SELECT * FROM feedback_votes WHERE id = $1`;
    const res = await pool.query(query, [id]);
    return res.rows[0] || null;
  }

  const query = `
    UPDATE feedback_votes 
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  values.push(id);

  const res = await pool.query(query, values);
  return res.rows[0] || null;
};

/**
 * Deletes a vote
 * @param userId - User ID
 * @param feedbackId - Feedback ID
 * @returns Whether deletion was successful
 */
export const deleteVote = async (userId: number, feedbackId: number): Promise<boolean> => {
  const query = `
    DELETE FROM feedback_votes 
    WHERE user_id = $1 AND feedback_id = $2
  `;

  const res = await pool.query(query, [userId, feedbackId]);
  return (res.rowCount ?? 0) > 0;
};

/**
 * Retrieves voters (upvoters) for a feedback entry
 * @param feedbackId - Feedback ID
 * @param voterLimit - Maximum number of voters to return
 * @param search - Optional search term for name or email
 * @returns Array of voter information
 */
export const getVotersByFeedback = async (
  feedbackId: number,
  voterLimit?: number,
  search?: string,
): Promise<VoterInfo[]> => {
  let query = `
    SELECT u.id, u.username AS name, u.email, NULL AS avatar_url
    FROM feedback_votes fv
    LEFT JOIN users u ON fv.user_id = u.id
    WHERE fv.feedback_id = $1 AND fv.vote_type = 'upvote'
  `;

  const params: (string | number)[] = [feedbackId];
  let paramIndex = 2;

  if (search) {
    query += ` AND (u.username ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  query += ` ORDER BY fv.created_at ASC`;

  if (voterLimit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(voterLimit);
  }

  const res = await pool.query(query, params);
  return res.rows;
};

/**
 * Gets total count of upvoters for a feedback entry
 * @param feedbackId - Feedback ID
 * @returns Total upvoter count
 */
export const getTotalVotersCount = async (feedbackId: number): Promise<number> => {
  const query = `
    SELECT COUNT(*) FROM feedback_votes 
    WHERE feedback_id = $1 AND vote_type = 'upvote'
  `;

  const res = await pool.query(query, [feedbackId]);
  return parseInt(res.rows[0].count, 10);
};

/**
 * Gets vote counts for a feedback entry
 * @param feedbackId - Feedback ID
 * @returns Object with upvote and downvote counts
 */
export const getVoteCounts = async (
  feedbackId: number,
): Promise<{ upvotes: number; downvotes: number }> => {
  const query = `
    SELECT 
      COUNT(*) FILTER (WHERE vote_type = 'upvote') AS upvotes,
      COUNT(*) FILTER (WHERE vote_type = 'downvote') AS downvotes
    FROM feedback_votes 
    WHERE feedback_id = $1
  `;

  const res = await pool.query(query, [feedbackId]);
  return {
    upvotes: parseInt(res.rows[0].upvotes, 10) || 0,
    downvotes: parseInt(res.rows[0].downvotes, 10) || 0,
  };
};

module.exports = {
  createVote,
  getVoteByUserAndFeedback,
  updateVote,
  deleteVote,
  getVotersByFeedback,
  getTotalVotersCount,
  getVoteCounts,
};
