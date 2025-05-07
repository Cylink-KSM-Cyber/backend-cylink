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
  getUrls: {
    query: {
      search: {
        type: 'string',
        optional: true,
      },
      page: {
        type: 'number',
        optional: true,
        integer: true,
        positive: true,
      },
      limit: {
        type: 'number',
        optional: true,
        integer: true,
        min: 1,
        max: 100,
      },
      sortBy: {
        type: 'string',
        optional: true,
        enum: ['created_at', 'clicks', 'title', 'relevance'],
      },
      sortOrder: {
        type: 'string',
        optional: true,
        enum: ['asc', 'desc'],
      },
      status: {
        type: 'string',
        optional: true,
        enum: ['all', 'active', 'inactive', 'expired', 'expiring-soon'],
      },
    },
  },

  /**
   * Validation rules for creating a shortened URL
   */
  createUrl: [
    { name: 'original_url', type: 'string', required: true },
    { name: 'custom_code', type: 'string', required: false },
    { name: 'title', type: 'string', required: false },
    { name: 'expiry_date', type: 'string', required: false },
    { name: 'goal_id', type: 'number', required: false, optional: true },
  ],

  /**
   * Validation rules for updating a URL
   */
  updateUrl: {
    params: {
      id: {
        type: 'number',
        required: true,
        integer: true,
        positive: true,
      },
    },
    body: {
      title: {
        type: 'string',
        optional: true,
        max: 255,
      },
      short_code: {
        type: 'string',
        optional: true,
        max: 50,
      },
      original_url: {
        type: 'string',
        optional: true,
        max: 2048,
      },
      expiry_date: {
        type: 'string',
        optional: true,
        // null is allowed to remove expiry date
        nullable: true,
      },
      is_active: {
        type: 'boolean',
        optional: true,
      },
    },
  },

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

  /**
   * Validates the URL status filter parameter
   *
   * @param {string} status - The status parameter to validate
   * @returns {boolean} Whether the status is valid
   */
  isValidStatusFilter: (status: string): boolean => {
    const validStatusFilters = ['all', 'active', 'inactive', 'expired', 'expiring-soon'];
    return validStatusFilters.includes(status);
  },
};
