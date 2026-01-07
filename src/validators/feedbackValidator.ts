/**
 * Feedback Validator
 *
 * Defines validation rules for feedback-related operations
 * @module validators/feedbackValidator
 */

module.exports = {
  /**
   * Validation rules for GET /feedback endpoint (query params as array)
   */
  getFeedbackList: [
    { name: 'type', type: 'string', optional: true, enum: ['bug', 'feature', 'all'] },
    {
      name: 'status',
      type: 'string',
      optional: true,
      enum: ['open', 'under_review', 'planned', 'in_progress', 'completed', 'closed', 'all'],
    },
    { name: 'sortBy', type: 'string', optional: true, enum: ['trending', 'top_voted', 'newest'] },
    { name: 'search', type: 'string', optional: true },
    { name: 'myVotes', type: 'string', optional: true },
    { name: 'page', type: 'integer', optional: true },
    { name: 'limit', type: 'integer', optional: true },
  ],

  /**
   * Validation rules for POST /feedback endpoint
   */
  createFeedback: [
    { name: 'title', type: 'string', required: true, min: 10 },
    { name: 'description', type: 'text', required: true },
    { name: 'type', type: 'string', required: true },
    { name: 'tags', type: 'string', optional: true },
    { name: 'use_case', type: 'string', optional: true },
    { name: 'reproduction_steps', type: 'string', optional: true },
    { name: 'expected_behavior', type: 'string', optional: true },
    { name: 'actual_behavior', type: 'string', optional: true },
  ],

  /**
   * Validation rules for POST /feedback/:id/vote endpoint
   */
  voteFeedback: [
    { name: 'vote_type', type: 'string', required: true },
    { name: 'reason', type: 'string', optional: true },
    { name: 'comment', type: 'string', optional: true },
  ],

  /**
   * Validation rules for GET /feedback/search-similar endpoint (query params as array)
   */
  searchSimilar: [{ name: 'title', type: 'string', required: true }],

  /**
   * Validation rules for GET /feedback/:id/voters endpoint (query params as array)
   */
  getVoters: [{ name: 'search', type: 'string', optional: true }],
};
