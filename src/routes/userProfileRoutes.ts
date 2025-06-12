/**
 * User Profile Routes
 *
 * Defines routes for user profile management
 * @module routes/userProfileRoutes
 */

const router = require('express').Router();

const userProfileController = require('../controllers/userProfileController');
const { accessToken } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         email:
 *           type: string
 *           example: user@example.com
 *         username:
 *           type: string
 *           example: johndoe
 *         role:
 *           type: string
 *           enum: [user, admin]
 *           example: user
 *         timezone:
 *           type: string
 *           example: Asia/Jakarta
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: "2025-04-22T10:30:00Z"
 *         updated_at:
 *           type: string
 *           format: date-time
 *           example: "2025-04-22T10:30:00Z"
 *
 *     TimezoneOption:
 *       type: object
 *       properties:
 *         value:
 *           type: string
 *           example: Asia/Jakarta
 *         label:
 *           type: string
 *           example: "Asia/Jakarta (UTC+07:00)"
 *         offset:
 *           type: integer
 *           example: 420
 *         current_time:
 *           type: string
 *           example: "4/22/2025, 5:30:00 PM"
 */

/**
 * @swagger
 * /api/v1/profile:
 *   get:
 *     summary: Get user profile information
 *     tags: [User Profile]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: User profile retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/UserProfile'
 *                     timezone_options:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["UTC", "Asia/Jakarta", "America/New_York"]
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/', accessToken, userProfileController.getUserProfile);

/**
 * @swagger
 * /api/v1/profile:
 *   put:
 *     summary: Update user profile information
 *     tags: [User Profile]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: johndoe
 *                 description: User's display name
 *               timezone:
 *                 type: string
 *                 example: Asia/Jakarta
 *                 description: User's preferred timezone
 *     responses:
 *       200:
 *         description: User profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: User profile updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/UserProfile'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.put('/', accessToken, userProfileController.updateUserProfile);

/**
 * @swagger
 * /api/v1/profile/timezone:
 *   put:
 *     summary: Update user timezone preference
 *     tags: [User Profile]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - timezone
 *             properties:
 *               timezone:
 *                 type: string
 *                 example: Asia/Jakarta
 *                 description: User's preferred timezone
 *     responses:
 *       200:
 *         description: Timezone updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Timezone updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     timezone:
 *                       type: string
 *                       example: Asia/Jakarta
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-04-22T10:30:00Z"
 *       400:
 *         description: Invalid timezone
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.put('/timezone', accessToken, userProfileController.updateUserTimezone);

/**
 * @swagger
 * /api/v1/profile/timezones:
 *   get:
 *     summary: Get available timezones with current time information
 *     tags: [User Profile]
 *     responses:
 *       200:
 *         description: Available timezones retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Available timezones retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     timezones:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/TimezoneOption'
 *                     total_count:
 *                       type: integer
 *                       example: 20
 *       500:
 *         description: Internal server error
 */
router.get('/timezones', userProfileController.getAvailableTimezones);

module.exports = router;
