const router = require('express').Router();

const feedbackController = require('../controllers/feedbackController');
const { accessToken } = require('../middlewares/authMiddleware');
const validate = require('../libs/express-validator/validator.service');
const fields = require('../validators/feedbackValidator');

/**
 * Feedback Routes
 *
 * Defines routes for Feedback Board feature
 * @module routes/feedbackRoutes
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Feedback:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The feedback ID
 *           example: 1
 *         title:
 *           type: string
 *           description: Feedback title
 *           example: "Add dark mode support"
 *         description:
 *           type: string
 *           description: Detailed feedback description
 *           example: "Would love to have a dark mode option for better UX at night"
 *         type:
 *           type: string
 *           enum: [bug, feature]
 *           description: Type of feedback
 *           example: "feature"
 *         status:
 *           type: string
 *           enum: [open, under_review, planned, in_progress, completed, closed]
 *           description: Current status
 *           example: "open"
 *         user_id:
 *           type: integer
 *           description: Author user ID
 *           example: 5
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *         upvotes:
 *           type: integer
 *           description: Number of upvotes
 *           example: 42
 *         downvotes:
 *           type: integer
 *           description: Number of downvotes
 *           example: 3
 *         score:
 *           type: integer
 *           description: Net score (upvotes - downvotes)
 *           example: 39
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Tags for categorization
 *           example: ["ui", "accessibility"]
 *         use_case:
 *           type: string
 *           description: Use case for feature requests
 *           example: "Better user experience during night time usage"
 *         voters:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Voter'
 *           description: First 5 users who upvoted
 *         total_voters:
 *           type: integer
 *           description: Total count of upvotes
 *           example: 42
 *         user_vote:
 *           type: string
 *           enum: [upvote, downvote, null]
 *           description: Current user's vote
 *         author:
 *           $ref: '#/components/schemas/Author'
 *     Voter:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: "John Doe"
 *         email:
 *           type: string
 *           example: "john@example.com"
 *         avatar_url:
 *           type: string
 *           nullable: true
 *           example: "https://example.com/avatar1.jpg"
 *     Author:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 5
 *         name:
 *           type: string
 *           example: "Jane Smith"
 *         email:
 *           type: string
 *           example: "jane@example.com"
 *         avatar_url:
 *           type: string
 *           nullable: true
 *           example: "https://example.com/avatar5.jpg"
 */

/**
 * @swagger
 * /api/v1/feedback:
 *   get:
 *     summary: Get feedback list with filters and pagination
 *     tags: [Feedback]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [bug, feature, all]
 *         description: Filter by feedback type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, under_review, planned, in_progress, completed, closed, all]
 *         description: Filter by status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [trending, top_voted, newest]
 *           default: newest
 *         description: Sort algorithm
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *       - in: query
 *         name: myVotes
 *         schema:
 *           type: boolean
 *         description: Filter items user has voted on
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Feedback list fetched successfully
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
 *                   example: "Feedback fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Feedback'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total_pages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/',
  accessToken,
  validate({ query: fields.getFeedbackList, preserveBodyProps: true }),
  feedbackController.getFeedbackList,
);

/**
 * @swagger
 * /api/v1/feedback:
 *   post:
 *     summary: Create new feedback
 *     tags: [Feedback]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - type
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 255
 *                 example: "Add dark mode support"
 *               description:
 *                 type: string
 *                 minLength: 20
 *                 example: "Would love to have a dark mode option for better UX at night"
 *               type:
 *                 type: string
 *                 enum: [bug, feature]
 *                 example: "feature"
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["ui", "accessibility"]
 *               use_case:
 *                 type: string
 *                 description: For feature type
 *                 example: "Better user experience during night time usage"
 *               reproduction_steps:
 *                 type: string
 *                 description: For bug type
 *               expected_behavior:
 *                 type: string
 *                 description: For bug type
 *               actual_behavior:
 *                 type: string
 *                 description: For bug type
 *     responses:
 *       201:
 *         description: Feedback created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: "Feedback created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Feedback'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  '/',
  accessToken,
  validate({ fields: fields.createFeedback, preserveBodyProps: true }),
  feedbackController.createFeedback,
);

/**
 * @swagger
 * /api/v1/feedback/search-similar:
 *   get:
 *     summary: Search for similar feedback (duplicate detection)
 *     tags: [Feedback]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: title
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 3
 *         description: Title to search for similar items
 *     responses:
 *       200:
 *         description: Similar feedback found
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
 *                   example: "Similar feedback found"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       type:
 *                         type: string
 *                       status:
 *                         type: string
 *                       upvotes:
 *                         type: integer
 *                       score:
 *                         type: integer
 *                       created_at:
 *                         type: string
 *       400:
 *         description: Title is required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/search-similar',
  accessToken,
  validate({ query: fields.searchSimilar, preserveBodyProps: true }),
  feedbackController.searchSimilar,
);

/**
 * @swagger
 * /api/v1/feedback/{id}/vote:
 *   post:
 *     summary: Vote on feedback
 *     tags: [Feedback]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Feedback ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vote_type
 *             properties:
 *               vote_type:
 *                 type: string
 *                 enum: [upvote, downvote]
 *                 example: "upvote"
 *               reason:
 *                 type: string
 *                 enum: [not_useful, duplicate, unclear, out_of_scope, other]
 *                 description: Required for downvote
 *               comment:
 *                 type: string
 *                 maxLength: 500
 *                 description: Optional comment for downvote
 *     responses:
 *       200:
 *         description: Vote recorded successfully
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
 *                   example: "Vote recorded successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     upvotes:
 *                       type: integer
 *                     downvotes:
 *                       type: integer
 *                     score:
 *                       type: integer
 *                     user_vote:
 *                       type: string
 *                     voters:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Voter'
 *                     total_voters:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Feedback not found
 *       409:
 *         description: Cannot vote on own feedback
 *       500:
 *         description: Internal server error
 */
router.post(
  '/:id/vote',
  accessToken,
  validate({ fields: fields.voteFeedback, preserveBodyProps: true }),
  feedbackController.voteFeedback,
);

/**
 * @swagger
 * /api/v1/feedback/{id}/vote:
 *   delete:
 *     summary: Remove vote from feedback
 *     tags: [Feedback]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Feedback ID
 *     responses:
 *       200:
 *         description: Vote removed successfully
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
 *                   example: "Vote removed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     upvotes:
 *                       type: integer
 *                     downvotes:
 *                       type: integer
 *                     score:
 *                       type: integer
 *                     user_vote:
 *                       type: null
 *                     voters:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Voter'
 *                     total_voters:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Feedback or vote not found
 *       409:
 *         description: Cannot remove vote from own feedback
 *       500:
 *         description: Internal server error
 */
router.delete('/:id/vote', accessToken, feedbackController.removeVote);

/**
 * @swagger
 * /api/v1/feedback/{id}/voters:
 *   get:
 *     summary: Get voters list for feedback
 *     tags: [Feedback]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Feedback ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search voters by name or email
 *     responses:
 *       200:
 *         description: Voters fetched successfully
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
 *                   example: "Voters fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     voters:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Voter'
 *                     total:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Feedback not found
 *       500:
 *         description: Internal server error
 */
router.get(
  '/:id/voters',
  accessToken,
  validate({ query: fields.getVoters, preserveBodyProps: true }),
  feedbackController.getVoters,
);

/**
 * @swagger
 * /api/v1/feedback/{id}:
 *   delete:
 *     summary: Delete feedback
 *     tags: [Feedback]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Feedback ID
 *     responses:
 *       200:
 *         description: Feedback deleted successfully
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
 *                   example: "Feedback deleted successfully"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Feedback not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', accessToken, feedbackController.deleteFeedback);

module.exports = router;
