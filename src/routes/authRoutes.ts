const router = require('express').Router();

const authController = require('../controllers/authController');
const passwordResetController = require('../controllers/passwordResetController');
const { accessToken, refreshToken } = require('../middlewares/authMiddleware');
const { passwordResetRateLimit } = require('../middlewares/passwordResetRateLimit');
const { createRateLimiter } = require('../middlewares/rateLimitMiddleware');
const validate = require('../utils/validator');
const fields = require('../validators/authValidator');
const { resetPasswordValidation } = require('../validators/passwordResetValidator');
const registrationController = require('../controllers/registrationController');
const verificationController = require('../controllers/verificationController');

/**
 * Rate limiter for forgot password endpoint
 * Temporarily increased for local testing - 50 requests per minute
 */
const forgotPasswordRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 requests per minute (increased for testing)
  message: 'Too many password reset requests. Please try again later.',
});

const registerRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: 'Too many registration attempts. Please try again in a minute.',
});
const verifyRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many verification attempts. Please try again in a minute.',
});

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
 *               - username
 *               - email
 *               - password
 *               - password_confirmation
 *             properties:
 *               username:
 *                 type: string
 *                 description: User's username
 *                 example: johndoe
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 description: User password
 *                 example: Password123!
 *               password_confirmation:
 *                 type: string
 *                 format: password
 *                 description: Password confirmation (must match password)
 *                 example: Password123!
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
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Email already registered
 *       500:
 *         description: Internal server error
 */
router.post(
  '/register',
  registerRateLimiter,
  registrationController.registrationValidationRules,
  registrationController.registrationValidator,
  registrationController.register,
);

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
 *     summary: Reset user password with secure token from query parameter
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Password reset token received in email
 *         example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *               - password_confirmation
 *             properties:
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: New password (must meet security requirements)
 *                 example: "newSecurePassword123!"
 *               password_confirmation:
 *                 type: string
 *                 format: password
 *                 description: Password confirmation (must match password)
 *                 example: "newSecurePassword123!"
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
 *                   example: "Password has been reset successfully. You can now log in with your new password."
 *       400:
 *         description: Bad request - various validation errors
 *         content:
 *           application/json:
 *             oneOf:
 *               - schema:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: integer
 *                       example: 400
 *                     message:
 *                       type: string
 *                       example: "Reset token is required in query parameter."
 *                     error_code:
 *                       type: string
 *                       example: "MISSING_TOKEN"
 *               - schema:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: integer
 *                       example: 400
 *                     message:
 *                       type: string
 *                       example: "Invalid or malformed reset token."
 *                     error_code:
 *                       type: string
 *                       example: "INVALID_TOKEN"
 *               - schema:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: integer
 *                       example: 400
 *                     message:
 *                       type: string
 *                       example: "Reset token has expired. Please request a new password reset."
 *                     error_code:
 *                       type: string
 *                       example: "TOKEN_EXPIRED"
 *               - schema:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: integer
 *                       example: 400
 *                     message:
 *                       type: string
 *                       example: "Password does not meet security requirements"
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Password must be at least 8 characters long", "Password must contain at least one uppercase letter"]
 *                     error_code:
 *                       type: string
 *                       example: "WEAK_PASSWORD"
 *               - schema:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: integer
 *                       example: 400
 *                     message:
 *                       type: string
 *                       example: "New password cannot be the same as your current password."
 *                     error_code:
 *                       type: string
 *                       example: "SAME_PASSWORD"
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 429
 *                 message:
 *                   type: string
 *                   example: "Too many password reset attempts. Please try again in 15 minutes."
 *                 error_code:
 *                   type: string
 *                   example: "RATE_LIMIT_EXCEEDED"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: "Internal server error. Please try again later."
 *                 error_code:
 *                   type: string
 *                   example: "INTERNAL_ERROR"
 */
router.post(
  '/reset-password',
  passwordResetRateLimit,
  ...resetPasswordValidation,
  passwordResetController.resetPassword,
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
 *                   example: Successfully logged in!
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 11
 *                         username:
 *                           type: string
 *                           example: Nugraha Adhitama Haryono
 *                         email:
 *                           type: string
 *                           example: nugrahaadhitama22@gmail.com
 *                         created_at:
 *                           type: string
 *                           format: date-time
 *                           example: 2025-07-22T06:01:00.911Z
 *                         updated_at:
 *                           type: string
 *                           format: date-time
 *                           example: 2025-07-22T06:02:45.684Z
 *                         last_login:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                           example: 2025-07-22T07:00:00.000Z
 *                     token:
 *                       type: object
 *                       properties:
 *                         type:
 *                           type: string
 *                           example: bearer
 *                         access:
 *                           type: string
 *                           description: JWT access token
 *                         refresh:
 *                           type: string
 *                           description: JWT refresh token
 *                         expiresAt:
 *                           type: integer
 *                           description: Expiration timestamp (ms)
 *                     first_login:
 *                       type: boolean
 *                       description: True if this is the user's first login
 *                       example: false
 *             example:
 *               status: 200
 *               message: Successfully logged in!
 *               data:
 *                 user:
 *                   id: 11
 *                   username: Nugraha Adhitama Haryono
 *                   email: nugrahaadhitama22@gmail.com
 *                   created_at: 2025-07-22T06:01:00.911Z
 *                   updated_at: 2025-07-22T06:02:45.684Z
 *                   last_login: 2025-07-22T07:00:00.000Z
 *                 token:
 *                   type: bearer
 *                   access: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                   refresh: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                   expiresAt: 1753198434251
 *                 first_login: false
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

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request password reset email
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
 *         description: Password reset email sent (consistent response regardless of email existence)
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
 *                   example: If an account with that email exists, we have sent a password reset link.
 *       400:
 *         description: Invalid email format
 *       429:
 *         description: Too many requests (rate limited)
 *       500:
 *         description: Internal server error
 */
router.post(
  '/forgot-password',
  forgotPasswordRateLimiter,
  validate({ fields: fields.forgotPassword }),
  authController.forgotPassword,
);

/**
 * @swagger
 * /api/v1/auth/verify:
 *   get:
 *     summary: Verify user account
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Verification token received in email
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
 *       400:
 *         description: Invalid or expired verification token
 *       500:
 *         description: Internal server error
 */
router.get('/register/verify', verifyRateLimiter, verificationController.verify);

module.exports = router;
