/**
 * URL Validator
 *
 * Defines validation rules for URL-related operations
 * @module validators/urlValidator
 */

module.exports = {
  /**
   * Validation rules for GET /urls endpoint
   */
  getUrls: [
    { name: 'page', type: 'number', required: false },
    { name: 'limit', type: 'number', required: false },
    {
      name: 'sortBy',
      type: 'string',
      required: false,
      enum: ['created_at', 'clicks', 'title', 'relevance'],
    },
    {
      name: 'sortOrder',
      type: 'string',
      required: false,
      enum: ['asc', 'desc'],
    },
    { name: 'search', type: 'string', required: false },
  ],

  /**
   * Validation rules for creating a shortened URL
   */
  createUrl: [
    { name: 'original_url', type: 'string', required: true },
    { name: 'custom_code', type: 'string', required: false },
    { name: 'title', type: 'string', required: false },
    { name: 'expiry_date', type: 'string', required: false },
    { name: 'goal_id', type: 'number', required: false },
  ],

  /**
   * Validation rules for GET /urls/:id/analytics endpoint
   */
  getUrlAnalytics: [
    { name: 'start_date', type: 'string', required: false },
    { name: 'end_date', type: 'string', required: false },
    {
      name: 'group_by',
      type: 'string',
      required: false,
      enum: ['day', 'week', 'month'],
    },
  ],

  /**
   * Validation rules for getting total clicks analytics
   */
  getTotalClicksAnalytics: {
    start_date: {
      name: 'start_date',
      type: 'string',
      // It's optional since we'll default to last 30 days
      optional: true,
    },
    end_date: {
      name: 'end_date',
      type: 'string',
      // It's optional since we'll default to today
      optional: true,
    },
    comparison: {
      name: 'comparison',
      type: 'string',
      optional: true,
      // We need to validate that this is one of the allowed values
      enum: ['7', '14', '30', '90', 'custom'],
    },
    custom_comparison_start: {
      name: 'custom_comparison_start',
      type: 'string',
      optional: true,
    },
    custom_comparison_end: {
      name: 'custom_comparison_end',
      type: 'string',
      optional: true,
    },
    group_by: {
      name: 'group_by',
      type: 'string',
      optional: true,
      enum: ['day', 'week', 'month'],
    },
    page: {
      name: 'page',
      type: 'integer',
      optional: true,
    },
    limit: {
      name: 'limit',
      type: 'integer',
      optional: true,
    },
  },
};
