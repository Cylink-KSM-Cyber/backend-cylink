const router = require('express').Router();

const authController = require('@/controllers/authController');
const { accessToken, refreshToken, verificationToken } = require('@/middlewares/authMiddleware');
const validate = require('@/utils/validator');
const fields = require('@/validators/authValidator');

/**
 * Authentication Routes
 *
 * Defines routes for user authentication, registration, and password management
 * @module routes/authRoutes
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The user ID
 *           example: 1
 *         email:
 *           type: string
 *           description: User email address
 *           example: user@example.com
 *         name:
 *           type: string
 *           description: User's full name
 *           example: John Doe
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Account creation timestamp
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *         is_verified:
 *           type: boolean
 *           description: Whether the account is verified
 *           example: true
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: User password
 *                 example: Password123!
 *               name:
 *                 type: string
 *                 description: User's full name
 *                 example: John Doe
 *     responses:
 *       201:
 *         description: Registration successful, verification email sent
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
 *                   example: Registration successful, please check your email for verification
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     verification_token:
 *                       type: string
 *                       description: Token for email verification
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Email already registered
 *       500:
 *         description: Internal server error
 */
router.post('/register', validate({ fields: fields.register }), authController.register);

/**
 * @swagger
 * /api/v1/auth/register/verify:
 *   post:
 *     summary: Verify user registration
 *     tags: [Authentication]
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *         description: Verification token received in email
 *         example: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Account verified successfully
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
 *                   example: Account verified successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid or expired verification token
 *       500:
 *         description: Internal server error
 */
router.post('/register/verify', verificationToken, authController.verifyRegister);

/**
 * @swagger
 * /api/v1/auth/reset-password/send:
 *   post:
 *     summary: Send password reset verification
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Password reset verification sent
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
 *                   example: Password reset verification sent to your email
 *                 data:
 *                   type: object
 *                   properties:
 *                     verification_token:
 *                       type: string
 *                       description: Token for password reset verification
 *       400:
 *         description: Invalid input
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post(
  '/reset-password/send',
  validate({ fields: fields.sendPasswordResetVerification }),
  authController.sendPasswordResetVerification,
);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset user password with verification token
 *     tags: [Authentication]
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *         description: Verification token received in email
 *         example: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: New password
 *                 example: NewPassword123!
 *     responses:
 *       200:
 *         description: Password reset successful
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
 *                   example: Password reset successful
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid or expired verification token
 *       500:
 *         description: Internal server error
 */
router.post(
  '/reset-password',
  verificationToken,
  validate({ fields: fields.resetPassword }),
  authController.resetPassword,
);

/**
 * @swagger
 * /api/v1/auth/resend:
 *   post:
 *     summary: Resend verification email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Verification email resent
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
 *                   example: Verification email resent
 *                 data:
 *                   type: object
 *                   properties:
 *                     verification_token:
 *                       type: string
 *                       description: New verification token
 *       400:
 *         description: Invalid input
 *       404:
 *         description: User not found
 *       409:
 *         description: User already verified
 *       500:
 *         description: Internal server error
 */
router.post(
  '/resend',
  validate({ fields: fields.resendVerification }),
  authController.resendVerification,
);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User password
 *                 example: Password123!
 *     responses:
 *       200:
 *         description: Login successful
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
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     tokens:
 *                       type: object
 *                       properties:
 *                         access_token:
 *                           type: string
 *                           description: JWT access token
 *                         refresh_token:
 *                           type: string
 *                           description: JWT refresh token
 *       400:
 *         description: Invalid credentials
 *       401:
 *         description: Account not verified
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post('/login', validate({ fields: fields.login }), authController.login);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed successfully
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
 *                   example: Token refreshed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     tokens:
 *                       type: object
 *                       properties:
 *                         access_token:
 *                           type: string
 *                           description: New JWT access token
 *                         refresh_token:
 *                           type: string
 *                           description: New JWT refresh token
 *       401:
 *         description: Invalid or expired token
 *       500:
 *         description: Internal server error
 */
router.post('/refresh', accessToken, refreshToken, authController.refresh);

module.exports = router;
