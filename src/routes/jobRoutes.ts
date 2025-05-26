/**
 * Job Routes
 *
 * Defines routes for job monitoring and management (admin only)
 * @module routes/jobRoutes
 */

const router = require('express').Router();

const jobController = require('../controllers/jobController');
const { accessToken } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     JobStatus:
 *       type: object
 *       properties:
 *         scheduler:
 *           type: object
 *           properties:
 *             isStarted:
 *               type: boolean
 *               example: true
 *             urlExpirationJob:
 *               type: object
 *               properties:
 *                 isRunning:
 *                   type: boolean
 *                   example: false
 *                 lastExecution:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-04-22T10:30:00Z"
 *                 lastSuccess:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-04-22T10:30:00Z"
 *                 consecutiveFailures:
 *                   type: integer
 *                   example: 0
 *                 totalExecutions:
 *                   type: integer
 *                   example: 24
 *                 totalSuccesses:
 *                   type: integer
 *                   example: 24
 *         url_statistics:
 *           type: object
 *           properties:
 *             total_urls:
 *               type: string
 *               example: "1250"
 *             active_urls:
 *               type: string
 *               example: "1100"
 *             expired_urls:
 *               type: string
 *               example: "150"
 *             auto_expired_urls:
 *               type: string
 *               example: "145"
 */

/**
 * @swagger
 * /api/v1/jobs/status:
 *   get:
 *     summary: Get job scheduler status and statistics (Admin only)
 *     tags: [Jobs]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Job status retrieved successfully
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
 *                   example: Job status retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/JobStatus'
 *       403:
 *         description: Access denied - Admin role required
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/status', accessToken, jobController.getJobStatus);

/**
 * @swagger
 * /api/v1/jobs/expiration/trigger:
 *   post:
 *     summary: Manually trigger URL expiration job (Admin only)
 *     tags: [Jobs]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: URL expiration job completed successfully
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
 *                   example: URL expiration job completed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     job_result:
 *                       type: object
 *                       properties:
 *                         success:
 *                           type: boolean
 *                           example: true
 *                         processedCount:
 *                           type: integer
 *                           example: 50
 *                         expiredCount:
 *                           type: integer
 *                           example: 15
 *                         executionTime:
 *                           type: integer
 *                           example: 1250
 *                         errors:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: []
 *                     triggered_by:
 *                       type: string
 *                       example: admin@cylink.id
 *                     triggered_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-04-22T10:30:00Z"
 *       403:
 *         description: Access denied - Admin role required
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Job execution failed or completed with errors
 */
router.post('/expiration/trigger', accessToken, jobController.triggerExpirationJob);

/**
 * @swagger
 * /api/v1/jobs/statistics/reset:
 *   post:
 *     summary: Reset job statistics (Admin only)
 *     tags: [Jobs]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               job_name:
 *                 type: string
 *                 enum: [urlExpiration, all]
 *                 default: all
 *                 description: Name of job to reset statistics for
 *                 example: urlExpiration
 *     responses:
 *       200:
 *         description: Job statistics reset successfully
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
 *                   example: Job statistics reset successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     reset_job:
 *                       type: string
 *                       example: urlExpiration
 *                     reset_by:
 *                       type: string
 *                       example: admin@cylink.id
 *                     reset_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-04-22T10:30:00Z"
 *       403:
 *         description: Access denied - Admin role required
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.post('/statistics/reset', accessToken, jobController.resetJobStats);

/**
 * @swagger
 * /api/v1/jobs/expiration/statistics:
 *   get:
 *     summary: Get URL expiration statistics (Admin only)
 *     tags: [Jobs]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Expiration statistics retrieved successfully
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
 *                   example: Expiration statistics retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     statistics:
 *                       type: object
 *                       properties:
 *                         total_urls:
 *                           type: string
 *                           example: "1250"
 *                         active_urls:
 *                           type: string
 *                           example: "1100"
 *                         inactive_urls:
 *                           type: string
 *                           example: "150"
 *                         expired_urls:
 *                           type: string
 *                           example: "150"
 *                         auto_expired_urls:
 *                           type: string
 *                           example: "145"
 *                         expiring_soon_urls:
 *                           type: string
 *                           example: "25"
 *                     generated_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-04-22T10:30:00Z"
 *                     generated_by:
 *                       type: string
 *                       example: admin@cylink.id
 *       403:
 *         description: Access denied - Admin role required
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/expiration/statistics', accessToken, jobController.getExpirationStats);

module.exports = router;
