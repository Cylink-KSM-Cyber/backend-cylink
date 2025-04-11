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

module.exports = router;
