/**
 * Feedback Model
 *
 * Provides functions for interacting with the feedback table
 * @module models/feedbackModel
 */

const pool = require('../config/database');

/**
 * Feedback type enumeration
 */
export type FeedbackType = 'bug' | 'feature';

/**
 * Feedback status enumeration
 */
export type FeedbackStatus =
  | 'open'
  | 'under_review'
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'closed';

/**
 * Feedback data interface
 */
export interface FeedbackData {
  id: number;
  title: string;
  description: string;
  type: FeedbackType;
  status: FeedbackStatus;
  user_id: number | null;
  upvotes: number;
  downvotes: number;
  score: number;
  tags: string[] | null;
  use_case: string | null;
  reproduction_steps: string | null;
  expected_behavior: string | null;
  actual_behavior: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

/**
 * Feedback creation input interface
 */
export interface FeedbackCreateInput {
  title: string;
  description: string;
  type: FeedbackType;
  user_id: number;
  tags?: string[];
  use_case?: string;
  reproduction_steps?: string;
  expected_behavior?: string;
  actual_behavior?: string;
}

/**
 * Feedback filter options interface
 */
export interface FeedbackFilters {
  type?: FeedbackType | 'all';
  status?: FeedbackStatus | 'all';
  sortBy?: 'trending' | 'top_voted' | 'newest';
  search?: string;
  myVotes?: boolean;
  userId?: number;
  page?: number;
  limit?: number;
}

/**
 * Creates a new feedback entry
 * @param data - Feedback creation data
 * @returns Created feedback object
 */
export const createFeedback = async (data: FeedbackCreateInput): Promise<FeedbackData> => {
  const query = `
    INSERT INTO feedback (
      title, description, type, user_id, tags, use_case,
      reproduction_steps, expected_behavior, actual_behavior,
      upvotes, downvotes, score
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, 0, 1)
    RETURNING *
  `;

  const res = await pool.query(query, [
    data.title,
    data.description,
    data.type,
    data.user_id,
    data.tags ? JSON.stringify(data.tags) : null,
    data.use_case || null,
    data.reproduction_steps || null,
    data.expected_behavior || null,
    data.actual_behavior || null,
  ]);

  return res.rows[0];
};

/**
 * Retrieves a feedback entry by ID
 * @param id - Feedback ID
 * @returns Feedback object or null if not found
 */
export const getFeedbackById = async (id: number): Promise<FeedbackData | null> => {
  const query = `
    SELECT * FROM feedback 
    WHERE id = $1 AND deleted_at IS NULL
  `;

  const res = await pool.query(query, [id]);
  return res.rows[0] || null;
};

/**
 * Retrieves feedback list with filters and pagination
 * @param filters - Filter options
 * @returns Paginated feedback list with total count
 */
export const getFeedbackList = async (
  filters: FeedbackFilters,
): Promise<{ feedbacks: FeedbackData[]; total: number }> => {
  const {
    type = 'all',
    status = 'all',
    sortBy = 'newest',
    search,
    myVotes,
    userId,
    page = 1,
    limit = 10,
  } = filters;

  const conditions: string[] = ['f.deleted_at IS NULL'];
  const params: (string | number)[] = [];
  let paramIndex = 1;

  // Type filter
  if (type !== 'all') {
    conditions.push(`f.type = $${paramIndex}`);
    params.push(type);
    paramIndex++;
  }

  // Status filter
  if (status !== 'all') {
    conditions.push(`f.status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  // Search filter
  if (search) {
    conditions.push(`(
      f.title ILIKE $${paramIndex} OR 
      f.description ILIKE $${paramIndex}
    )`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  // My votes filter
  if (myVotes && userId) {
    conditions.push(`EXISTS (
      SELECT 1 FROM feedback_votes fv 
      WHERE fv.feedback_id = f.id AND fv.user_id = $${paramIndex}
    )`);
    params.push(userId);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Determine sort order
  let orderBy: string;
  switch (sortBy) {
    case 'top_voted':
      orderBy = 'f.score DESC, f.created_at DESC';
      break;
    case 'trending':
      // Wilson Score approximation using score and recency
      orderBy = `
        (f.upvotes + 1.9208) / (f.upvotes + f.downvotes + 3.8416) - 
        1.96 * SQRT((f.upvotes * f.downvotes) / (f.upvotes + f.downvotes + 3.8416) + 0.9604) / 
        (f.upvotes + f.downvotes + 3.8416) DESC,
        f.created_at DESC
      `;
      break;
    case 'newest':
    default:
      orderBy = 'f.created_at DESC';
      break;
  }

  // Get total count
  const countQuery = `SELECT COUNT(*) FROM feedback f ${whereClause}`;
  const countRes = await pool.query(countQuery, params);
  const total = parseInt(countRes.rows[0].count, 10);

  // Get paginated results
  const offset = (page - 1) * limit;
  const dataQuery = `
    SELECT f.* FROM feedback f
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  const dataRes = await pool.query(dataQuery, [...params, limit, offset]);

  return {
    feedbacks: dataRes.rows,
    total,
  };
};

/**
 * Searches for similar feedback by title
 * @param title - Title to search for
 * @param searchLimit - Maximum number of results (default: 5)
 * @returns Array of similar feedback items
 */
export const searchSimilarFeedback = async (
  title: string,
  searchLimit: number = 5,
): Promise<FeedbackData[]> => {
  // Use trigram similarity for fuzzy matching
  const query = `
    SELECT *, 
      similarity(title, $1) AS sim_score,
      ts_rank(to_tsvector('english', title || ' ' || description), plainto_tsquery('english', $1)) AS ts_score
    FROM feedback
    WHERE deleted_at IS NULL
      AND (
        title ILIKE $2 
        OR description ILIKE $2
        OR similarity(title, $1) > 0.1
      )
    ORDER BY sim_score DESC, ts_score DESC, score DESC
    LIMIT $3
  `;

  const res = await pool.query(query, [title, `%${title}%`, searchLimit]);
  return res.rows;
};

/**
 * Updates a feedback entry
 * @param id - Feedback ID
 * @param data - Data to update
 * @returns Updated feedback object
 */
export const updateFeedback = async (
  id: number,
  data: Partial<FeedbackCreateInput> & { status?: FeedbackStatus },
): Promise<FeedbackData | null> => {
  const updateFields: string[] = [];
  const values: (string | number | null)[] = [];
  let paramIndex = 1;

  const allowedFields = [
    'title',
    'description',
    'type',
    'status',
    'tags',
    'use_case',
    'reproduction_steps',
    'expected_behavior',
    'actual_behavior',
  ];

  for (const [key, value] of Object.entries(data)) {
    if (allowedFields.includes(key) && value !== undefined) {
      updateFields.push(`${key} = $${paramIndex}`);
      const paramValue = key === 'tags' ? JSON.stringify(value) : (value as string | number | null);
      values.push(paramValue);
      paramIndex++;
    }
  }

  if (updateFields.length === 0) {
    return getFeedbackById(id);
  }

  updateFields.push('updated_at = NOW()');

  const query = `
    UPDATE feedback 
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex} AND deleted_at IS NULL
    RETURNING *
  `;

  values.push(id);

  const res = await pool.query(query, values);
  return res.rows[0] || null;
};

/**
 * Soft deletes a feedback entry
 * @param id - Feedback ID
 * @returns Whether deletion was successful
 */
export const deleteFeedback = async (id: number): Promise<boolean> => {
  const query = `
    UPDATE feedback 
    SET deleted_at = NOW(), updated_at = NOW()
    WHERE id = $1 AND deleted_at IS NULL
  `;

  const res = await pool.query(query, [id]);
  return (res.rowCount ?? 0) > 0;
};

/**
 * Updates vote counts for a feedback entry by recalculating from votes table
 * @param feedbackId - Feedback ID
 */
export const updateVoteCounts = async (feedbackId: number): Promise<void> => {
  const query = `
    UPDATE feedback f
    SET 
      upvotes = COALESCE((
        SELECT COUNT(*) FROM feedback_votes fv 
        WHERE fv.feedback_id = f.id AND fv.vote_type = 'upvote'
      ), 0),
      downvotes = COALESCE((
        SELECT COUNT(*) FROM feedback_votes fv 
        WHERE fv.feedback_id = f.id AND fv.vote_type = 'downvote'
      ), 0),
      score = COALESCE((
        SELECT COUNT(*) FILTER (WHERE fv.vote_type = 'upvote') - COUNT(*) FILTER (WHERE fv.vote_type = 'downvote')
        FROM feedback_votes fv WHERE fv.feedback_id = f.id
      ), 0),
      updated_at = NOW()
    WHERE f.id = $1
  `;

  await pool.query(query, [feedbackId]);
};

module.exports = {
  createFeedback,
  getFeedbackById,
  getFeedbackList,
  searchSimilarFeedback,
  updateFeedback,
  deleteFeedback,
  updateVoteCounts,
};
