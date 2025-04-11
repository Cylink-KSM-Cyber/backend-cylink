const router = require("express").Router();
const validate = require("@/utils/validator");
const fields = require("@/validators/urlValidator");

const urlController = require("@/controllers/urlController");

/**
 * Public URL Routes
 *
 * Defines routes for public URL shortening and management that don't require authentication
 * @module routes/publicUrlRoutes
 */

/**
 * Create a shortened URL for anonymous users
 *
 * @route POST /api/v1/public/urls
 * @param {string} original_url - The original URL to shorten
 * @param {string} [custom_code] - Optional custom short code
 * @param {string} [title] - Optional title for the URL
 * @param {string} [expiry_date] - Optional expiration date in ISO format
 * @returns {object} The created shortened URL object
 *
 * @example
 * // Request
 * POST /api/v1/public/urls
 * {
 *   "original_url": "https://example.com/very-long-url-path",
 *   "custom_code": "mylink",
 *   "title": "Example Title",
 *   "expiry_date": "2025-05-10T00:00:00Z"
 * }
 *
 * // Response
 * {
 *   "status": 201,
 *   "message": "Successfully created shortened URL",
 *   "data": {
 *     "id": 124,
 *     "original_url": "https://example.com/very-long-url-path",
 *     "short_code": "xyz789",
 *     "short_url": "https://cylink.id/xyz789",
 *     "title": "Example Title",
 *     "created_at": "2025-04-10T12:30:00Z",
 *     "expiry_date": "2025-05-10T00:00:00Z",
 *     "is_active": true
 *   }
 * }
 */
router.post(
  "/",
  validate({ fields: fields.createUrl }),
  urlController.createAnonymousUrl
);

module.exports = router;
