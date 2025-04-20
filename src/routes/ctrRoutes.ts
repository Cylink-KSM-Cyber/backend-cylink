/**
 * CTR Routes
 *
 * Route definitions for Click-Through Rate (CTR) related operations
 * @module routes/ctrRoutes
 */

import express from 'express';
import * as ctrController from '../controllers/ctrController';

const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /api/v1/ctr/stats:
 *   get:
 *     summary: Get overall CTR statistics
 *     description: Retrieves Click-Through Rate (CTR) statistics for all URLs of the authenticated user
 *     tags: [CTR]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the analysis period (format- YYYY-MM-DD, default- 30 days ago)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the analysis period (format- YYYY-MM-DD, default- today)
 *       - in: query
 *         name: comparison
 *         schema:
 *           type: string
 *           enum: [7, 14, 30, 90, custom]
 *         description: Comparison period in days (default- 30)
 *       - in: query
 *         name: custom_comparison_start
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom comparison period (required when comparison=custom)
 *       - in: query
 *         name: custom_comparison_end
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom comparison period (required when comparison=custom)
 *       - in: query
 *         name: group_by
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *         description: How to group the time series data (default- day)
 *     responses:
 *       200:
 *         description: CTR statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: CTR statistics retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     overall:
 *                       type: object
 *                       description: Overall CTR statistics
 *                     comparison:
 *                       type: object
 *                       description: Comparison with previous period
 *                     time_series:
 *                       type: object
 *                       description: Time series data
 *                     top_performing_days:
 *                       type: array
 *                       description: Top performing days
 *                     ctr_by_source:
 *                       type: array
 *                       description: CTR statistics by source
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       500:
 *         description: Server error
 */
router.get('/stats', authMiddleware.accessToken, ctrController.getOverallCTRStats as any);

/**
 * @swagger
 * /api/v1/urls/{url_id}/ctr:
 *   get:
 *     summary: Get CTR statistics for a specific URL
 *     description: Retrieves Click-Through Rate (CTR) statistics for a specific URL
 *     tags: [CTR]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: url_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the URL to get statistics for
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the analysis period (format- YYYY-MM-DD, default- 30 days ago)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the analysis period (format- YYYY-MM-DD, default- today)
 *       - in: query
 *         name: comparison
 *         schema:
 *           type: string
 *           enum: [7, 14, 30, 90, custom]
 *         description: Comparison period in days (default- 30)
 *       - in: query
 *         name: custom_comparison_start
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom comparison period (required when comparison=custom)
 *       - in: query
 *         name: custom_comparison_end
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom comparison period (required when comparison=custom)
 *       - in: query
 *         name: group_by
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *         description: How to group the time series data (default- day)
 *     responses:
 *       200:
 *         description: URL CTR statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: URL CTR statistics retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     overall:
 *                       type: object
 *                       description: Overall CTR statistics
 *                     comparison:
 *                       type: object
 *                       description: Comparison with previous period
 *                     time_series:
 *                       type: object
 *                       description: Time series data
 *                     top_performing_days:
 *                       type: array
 *                       description: Top performing days
 *                     ctr_by_source:
 *                       type: array
 *                       description: CTR statistics by source
 *       400:
 *         description: Invalid URL ID
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       404:
 *         description: URL not found
 *       500:
 *         description: Server error
 */
// This endpoint is placed in urlRoutes.ts
// router.get('/urls/:url_id/ctr', authenticateToken, ctrController.getUrlCTRStats);

/**
 * @swagger
 * /api/v1/ctr/leaderboard:
 *   get:
 *     summary: Get CTR leaderboard
 *     description: Retrieves a leaderboard of URLs based on CTR metrics
 *     tags: [CTR]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analysis period (format- YYYY-MM-DD, default- 30 days ago)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analysis period (format- YYYY-MM-DD, default- today)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of top URLs to return (default- 10)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [ctr, clicks, impressions]
 *         description: Sort metric (default- ctr)
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order (default- desc)
 *     responses:
 *       200:
 *         description: CTR leaderboard retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: CTR leaderboard retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     period:
 *                       type: object
 *                       properties:
 *                         start_date:
 *                           type: string
 *                           format: date
 *                         end_date:
 *                           type: string
 *                           format: date
 *                     urls:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           short_code:
 *                             type: string
 *                           title:
 *                             type: string
 *                           impressions:
 *                             type: integer
 *                           clicks:
 *                             type: integer
 *                           ctr:
 *                             type: number
 *                           rank:
 *                             type: integer
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       500:
 *         description: Server error
 */
router.get('/leaderboard', authMiddleware.accessToken, ctrController.getCTRLeaderboard as any);

module.exports = router;
