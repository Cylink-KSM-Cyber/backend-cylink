/**
 * Conversion Routes
 *
 * API endpoints for conversion goals and tracking
 * @module routes/conversionRoutes
 */

import express from 'express';
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
const conversionController = require('../controllers/conversionController');

/**
 * @swagger
 * /api/v1/conversion-goals:
 *   post:
 *     summary: Create a new conversion goal
 *     tags: [Conversions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the conversion goal
 *               description:
 *                 type: string
 *                 description: Description of the conversion goal
 *     responses:
 *       201:
 *         description: Conversion goal created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  '/conversion-goals',
  authMiddleware.accessToken,
  conversionController.createConversionGoal,
);

/**
 * @swagger
 * /api/v1/conversion-goals:
 *   get:
 *     summary: Get all conversion goals for the authenticated user
 *     tags: [Conversions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Goals retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  '/conversion-goals',
  authMiddleware.accessToken,
  conversionController.getConversionGoals,
);

/**
 * @swagger
 * /api/v1/urls/{url_id}/goals:
 *   post:
 *     summary: Associate a goal with a URL
 *     tags: [Conversions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: url_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: URL ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - goal_id
 *             properties:
 *               goal_id:
 *                 type: integer
 *                 description: ID of the conversion goal
 *     responses:
 *       201:
 *         description: Goal associated with URL successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: URL or goal not found
 *       409:
 *         description: Goal already associated with URL
 *       500:
 *         description: Server error
 */
router.post(
  '/urls/:url_id/goals',
  authMiddleware.accessToken,
  conversionController.associateGoalWithUrl,
);

/**
 * @swagger
 * /api/v1/urls/{url_id}/goals:
 *   get:
 *     summary: Get conversion goals for a specific URL
 *     tags: [Conversions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: url_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: URL ID
 *     responses:
 *       200:
 *         description: Goals retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: URL not found
 *       500:
 *         description: Server error
 */
router.get('/urls/:url_id/goals', authMiddleware.accessToken, conversionController.getGoalsByUrl);

/**
 * @swagger
 * /api/v1/urls/{url_id}/goals/{goal_id}:
 *   delete:
 *     summary: Remove a goal association from a URL
 *     tags: [Conversions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: url_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: URL ID
 *       - in: path
 *         name: goal_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Goal ID
 *     responses:
 *       200:
 *         description: Goal removed from URL successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: URL, goal, or association not found
 *       500:
 *         description: Server error
 */
router.delete(
  '/urls/:url_id/goals/:goal_id',
  authMiddleware.accessToken,
  conversionController.removeGoalFromUrl,
);

/**
 * @swagger
 * /api/v1/conversions:
 *   post:
 *     summary: Track a conversion event
 *     tags: [Conversions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tracking_id
 *             properties:
 *               tracking_id:
 *                 type: string
 *                 description: Tracking ID encoded from click information
 *               goal_id:
 *                 type: integer
 *                 description: ID of the conversion goal
 *               conversion_value:
 *                 type: number
 *                 format: float
 *                 description: Monetary value of the conversion
 *               custom_data:
 *                 type: object
 *                 description: Additional conversion metadata
 *     responses:
 *       201:
 *         description: Conversion tracked successfully
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Conversion already recorded
 *       500:
 *         description: Server error
 */
router.post('/conversions', conversionController.trackConversion);

/**
 * @swagger
 * /api/v1/urls/{url_id}/conversion-rate:
 *   get:
 *     summary: Get conversion rate for a URL
 *     tags: [Conversions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: url_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: URL ID
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analysis (YYYY-MM-DD)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analysis (YYYY-MM-DD)
 *       - in: query
 *         name: goal_id
 *         schema:
 *           type: integer
 *         description: Filter by specific conversion goal
 *       - in: query
 *         name: comparison
 *         schema:
 *           type: integer
 *           enum: [7, 14, 30, 90]
 *         description: Comparison period in days
 *     responses:
 *       200:
 *         description: Conversion rate retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: URL not found
 *       500:
 *         description: Server error
 */
router.get(
  '/urls/:url_id/conversion-rate',
  authMiddleware.accessToken,
  conversionController.getUrlConversionRate,
);

/**
 * @swagger
 * /api/v1/conversion-rate:
 *   get:
 *     summary: Get overall conversion rate for all of the user's URLs
 *     tags: [Conversions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analysis (YYYY-MM-DD)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analysis (YYYY-MM-DD)
 *       - in: query
 *         name: goal_id
 *         schema:
 *           type: integer
 *         description: Filter by specific conversion goal
 *       - in: query
 *         name: comparison
 *         schema:
 *           type: integer
 *           enum: [7, 14, 30, 90]
 *         description: Comparison period in days
 *     responses:
 *       200:
 *         description: Overall conversion rate retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  '/conversion-rate',
  authMiddleware.accessToken,
  conversionController.getOverallConversionRate,
);

/**
 * @swagger
 * /api/v1/conversion-tracking.js:
 *   get:
 *     summary: Get the conversion tracking script
 *     tags: [Conversions]
 *     responses:
 *       200:
 *         description: Conversion tracking script
 *         content:
 *           application/javascript:
 *             schema:
 *               type: string
 */
router.get('/conversion-tracking.js', (req, res) => {
  const fs = require('fs');
  const path = require('path');

  // First try dist directory for production build
  let scriptPath = path.join(__dirname, '../../../dist/utils/conversionTrackingScript.js');

  if (!fs.existsSync(scriptPath)) {
    // Try direct transpiled file from ts-node
    scriptPath = path.join(__dirname, '../utils/conversionTrackingScript.js');
  }

  if (fs.existsSync(scriptPath)) {
    res.setHeader('Content-Type', 'application/javascript');
    // Set caching headers - cache for 1 day
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(scriptPath).pipe(res);
  } else {
    // Fallback to serving raw TS file content
    res.setHeader('Content-Type', 'application/javascript');
    const tsPath = path.join(__dirname, '../utils/conversionTrackingScript.ts');

    // Read the file manually and serve its content
    try {
      const content = fs.readFileSync(tsPath, 'utf8');
      // Remove TypeScript-specific code
      const jsContent = content
        .replace(/interface\s+\w+\s*\{[\s\S]*?\}/g, '')
        .replace(/declare global[\s\S]*?\}/g, '')
        .replace(/export\s*\{\};?/, '')
        .replace(/:\s*\w+(\[\])?\s*=/g, ' =')
        .replace(/:\s*\w+(\[\])?\s*\)/g, ')')
        .replace(/<.*?>/g, '');

      res.send(jsContent);
    } catch (err) {
      console.error('Error serving conversion tracking script:', err);
      res.status(500).send('// Error loading conversion tracking script');
    }
  }
});

export = router;
