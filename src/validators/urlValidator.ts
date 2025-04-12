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
    { name: "page", type: "number", required: false },
    { name: "limit", type: "number", required: false },
    {
      name: "sortBy",
      type: "string",
      required: false,
      enum: ["created_at", "clicks", "title"],
    },
    {
      name: "sortOrder",
      type: "string",
      required: false,
      enum: ["asc", "desc"],
    },
  ],

  /**
   * Validation rules for creating a shortened URL
   */
  createUrl: [
    { name: "original_url", type: "string", required: true },
    { name: "custom_code", type: "string", required: false },
    { name: "title", type: "string", required: false },
    { name: "expiry_date", type: "string", required: false },
  ],

  /**
   * Validation rules for GET /urls/:id/analytics endpoint
   */
  getUrlAnalytics: [
    { name: "start_date", type: "string", required: false },
    { name: "end_date", type: "string", required: false },
    {
      name: "group_by",
      type: "string",
      required: false,
      enum: ["day", "week", "month"],
    },
  ],
};
