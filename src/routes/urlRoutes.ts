const router = require("express").Router();
const { accessToken } = require("@/middlewares/authMiddleware");
const validate = require("@/utils/validator");
const fields = require("@/validators/urlValidator");

const urlController = require("@/controllers/urlController");

/**
 * URL Routes
 *
 * Defines routes for URL shortening and management
 * @module routes/urlRoutes
 */

/**
 * Get all URLs for authenticated user
 *
 * @route GET /api/v1/urls
 * @param {string} authorization - Bearer token for user authentication
 * @param {number} [page=1] - Page number for pagination
 * @param {number} [limit=10] - Number of items per page
 * @param {string} [sortBy='created_at'] - Field to sort by (created_at, clicks, title)
 * @param {string} [sortOrder='desc'] - Sort order (asc, desc)
 * @returns {object} URLs list with pagination
 *
 * @example
 * // Request
 * GET /api/v1/urls?page=1&limit=10&sortBy=clicks&sortOrder=desc
 * Authorization: Bearer {token}
 *
 * // Response
 * {
 *   "status": 200,
 *   "message": "Successfully retrieved all URLs",
 *   "data": {
 *     "urls": [...],
 *     "pagination": {
 *       "total": 57,
 *       "page": 1,
 *       "limit": 10,
 *       "total_pages": 6
 *     }
 *   }
 * }
 */
router.get(
  "/",
  accessToken,
  validate({ query: fields.getUrls }),
  urlController.getAllUrls
);

/**
 * Get URL details by ID
 *
 * @route GET /api/v1/urls/:identifier
 * @param {string} authorization - Bearer token for user authentication
 * @param {number|string} identifier - URL ID or short code to look up
 * @returns {object} URL details with analytics
 *
 * @example
 * // Request
 * GET /api/v1/urls/123
 * Authorization: Bearer {token}
 *
 * // Response
 * {
 *   "status": 200,
 *   "message": "Successfully retrieved URL",
 *   "data": {
 *     "id": 123,
 *     "original_url": "https://example.com/very-long-url-path",
 *     "short_code": "abc123",
 *     "short_url": "https://cylink.id/abc123",
 *     "title": "Example Title",
 *     "clicks": 42,
 *     "created_at": "2025-04-10T12:00:00Z",
 *     "updated_at": "2025-04-11T09:30:00Z",
 *     "expiry_date": "2025-05-10T00:00:00Z",
 *     "is_active": true,
 *     "analytics": {
 *       "browser_stats": {
 *         "Chrome": 25,
 *         "Firefox": 10,
 *         "Safari": 7
 *       },
 *       "device_stats": {
 *         "mobile": 18,
 *         "desktop": 24
 *       },
 *       "recent_clicks": [
 *         {
 *           "timestamp": "2025-04-10T15:23:11Z",
 *           "device_type": "mobile"
 *         }
 *       ]
 *     }
 *   }
 * }
 */
router.get("/:identifier", accessToken, urlController.getUrlDetails);

/**
 * Delete a URL by ID
 *
 * @route DELETE /api/v1/urls/:id
 * @param {string} authorization - Bearer token for user authentication
 * @param {number} id - URL ID to delete
 * @returns {object} Confirmation of deletion with timestamp
 *
 * @example
 * // Request
 * DELETE /api/v1/urls/123
 * Authorization: Bearer {token}
 *
 * // Response
 * {
 *   "status": 200,
 *   "message": "Successfully deleted URL",
 *   "data": {
 *     "id": 123,
 *     "short_code": "abc123",
 *     "deleted_at": "2025-04-12T11:30:00Z"
 *   }
 * }
 */
router.delete("/:id", accessToken, urlController.deleteUrl);

/**
 * Get analytics for a specific URL
 *
 * @route GET /api/v1/urls/:id/analytics
 * @param {string} authorization - Bearer token for user authentication
 * @param {number} id - URL ID
 * @param {string} [start_date] - Optional start date for filtering (ISO format)
 * @param {string} [end_date] - Optional end date for filtering (ISO format)
 * @param {string} [group_by='day'] - Optional grouping (day, week, month)
 * @returns {object} URL analytics data
 *
 * @example
 * // Request
 * GET /api/v1/urls/123/analytics?start_date=2025-01-01&end_date=2025-04-30&group_by=month
 * Authorization: Bearer {token}
 *
 * // Response
 * {
 *   "status": 200,
 *   "message": "Successfully retrieved URL analytics",
 *   "data": {
 *     "url_id": 123,
 *     "short_code": "abc123",
 *     "total_clicks": 42,
 *     "unique_visitors": 30,
 *     "time_series_data": [
 *       {
 *         "date": "2025-01",
 *         "clicks": 15
 *       },
 *       {
 *         "date": "2025-02",
 *         "clicks": 8
 *       },
 *       {
 *         "date": "2025-03",
 *         "clicks": 7
 *       },
 *       {
 *         "date": "2025-04",
 *         "clicks": 12
 *       }
 *     ],
 *     "browser_stats": {
 *       "Chrome": 25,
 *       "Firefox": 10,
 *       "Safari": 7
 *     },
 *     "device_stats": {
 *       "mobile": 18,
 *       "desktop": 24
 *     },
 *     "country_stats": {
 *       "US": 20,
 *       "ID": 15,
 *       "GB": 7
 *     }
 *   }
 * }
 */
router.get(
  "/:id/analytics",
  accessToken,
  validate({ query: fields.getUrlAnalytics }),
  urlController.getUrlAnalytics
);

module.exports = router;
