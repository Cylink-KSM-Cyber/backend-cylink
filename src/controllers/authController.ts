/**
 * Authentication Controller
 *
 * Handles HTTP requests related to authentication
 * @module controllers/authController
 */

import { Request, Response } from 'express';

import { User } from '../collections/userCollection';
import logger from '../utils/logger';

const authService = require('../services/authService');
const { sendResponse } = require('../utils/response');

/**
 * Flag to determine if email verification is enabled based on environment variable
 */
const emailVerificationEnabled = process.env.ENABLE_EMAIL_VERIFICATION === 'true';

/**
 * User registration request data interface
 */
interface RegistrationRequest {
  username: string;
  email: string;
  password: string;
  action?: string;
  verification_token?: string;
}

/**
 * Forgot password request interface
 */
interface ForgotPasswordRequest {
  email: string;
}

/**
 * Token-based password reset request interface
 */
interface TokenPasswordResetRequest {
  token: string;
  password: string;
}

/**
 * Registers a new user and optionally sends verification email
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Express response
 */
exports.register = async (req: Request, res: Response): Promise<Response> => {
  const userData: RegistrationRequest = req.body;
  const email = userData.email;

  try {
    const existingUser = await authService.findUser(email);
    if (existingUser) {
      logger.error(`Auth error: Failed to register: Email '${email}' already taken!`);
      return sendResponse(res, 400, 'Email already taken!');
    }

    const user = await authService.createUser(userData);
    logger.info(`Successfully stored '${email}' user data`);

    // Define action for web verificator
    user.action = 'user-registration';

    // Differentiates between email and direct verification
    if (emailVerificationEnabled) {
      await authService.sendRegistration(user);
      logger.info(`Successfully send user registration verification to '${email}'`);

      return sendResponse(res, 200, 'Successfully send user register verification!');
    } else {
      logger.info(`Successfully send direct verification for '${email}'`);
      return sendResponse(res, 200, 'Successfully send user register verification!', {
        token: user.verification_token,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Auth error: Failed to register:', errorMessage);
    return sendResponse(res, 500, 'Internal server error');
  }
};

/**
 * Verifies and activates a user account
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Express response
 */
exports.verifyRegister = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userData: Pick<User, 'email'> = req.body;

    const user = await authService.verifyRegister(userData);
    if (!user) {
      return sendResponse(res, 400, 'User already verified!');
    }

    logger.info(`Successfully verify registration for '${userData.email}'`);
    return sendResponse(res, 200, 'Successfully registered new user!', user);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Auth error: Failed to verify user registration:', errorMessage);
    return sendResponse(res, 500, 'Internal server error');
  }
};

/**
 * Authenticates a user and creates a session with tokens
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Express response
 */
exports.login = async (req: Request, res: Response): Promise<Response> => {
  try {
    const credentials: Pick<User, 'email' | 'password'> = req.body;

    const user = await authService.authenticate(credentials);

    if (!user) {
      logger.error('Auth error: Failed to login: User not found');
      return sendResponse(res, 400, 'Invalid credentials');
    }

    if (typeof user !== 'boolean' && !user.email_verified_at) {
      logger.error('Auth error: Failed to login: User not activated');
      return sendResponse(res, 400, 'User is not activated!');
    }

    // Get IP and user-agent
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || null;
    const userAgent = req.headers['user-agent'] || null;

    // Await new async login logic
    const userData = await authService.login(user as User, ipAddress, userAgent);
    logger.info(`Successfully logged in for ${(user as User).email}`);

    // Add first_login to response
    return sendResponse(res, 200, 'Successfully logged in!', userData);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Auth error: Failed to login:', errorMessage);
    return sendResponse(res, 500, 'Internal server error');
  }
};

/**
 * Refreshes an access token after it expires
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Express response
 */
exports.refresh = async (req: Request, res: Response): Promise<Response> => {
  try {
    return sendResponse(res, 200, 'Successfully refresh token!', {});
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Auth error: Failed to refresh token:', errorMessage);
    return sendResponse(res, 500, 'Internal server error');
  }
};

/**
 * Sends a password reset verification email
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Express response
 */
exports.sendPasswordResetVerification = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userData: Pick<User, 'email'> = req.body;
    const verified = await authService.sendPasswordResetVerification(userData);

    if (!verified) {
      return sendResponse(res, 400, 'Failed to verify password reset!');
    }

    return sendResponse(res, 200, 'Successfully verify password reset!', {});
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Auth error: Failed to verify password reset:', errorMessage);
    return sendResponse(res, 500, 'Internal server error');
  }
};

/**
 * Handles forgot password requests by sending reset email
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Express response
 */
exports.forgotPassword = async (req: Request, res: Response): Promise<Response> => {
  try {
    const requestData: ForgotPasswordRequest = req.body;

    // Send password reset email (always returns consistent response)
    const emailSent = await authService.sendForgotPasswordEmail(requestData);

    if (!emailSent) {
      // Only return error for internal server issues, not user enumeration
      logger.error('Failed to process password reset request due to internal error');
      return sendResponse(res, 500, 'Internal server error');
    }

    // Always return the same response regardless of whether email exists
    // This prevents email enumeration attacks
    logger.info(`Password reset requested for email: ${requestData.email}`);
    return sendResponse(
      res,
      200,
      'If an account with that email exists, we have sent a password reset link.',
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Auth error: Failed to process forgot password request:', errorMessage);
    return sendResponse(res, 500, 'Internal server error');
  }
};

/**
 * Validates a password reset token
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Express response
 */
exports.validateResetToken = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { token } = req.params;

    if (!token) {
      return sendResponse(res, 400, 'Token is required');
    }

    const user = await authService.validatePasswordResetToken(token);

    if (!user) {
      return sendResponse(res, 400, 'Invalid or expired token');
    }

    return sendResponse(res, 200, 'Token is valid', {
      valid: true,
      email: user.email, // Can show email since token is already validated
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Auth error: Failed to validate reset token:', errorMessage);
    return sendResponse(res, 500, 'Internal server error');
  }
};

/**
 * Resets user password using secure token
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Express response
 */
exports.resetPasswordWithToken = async (req: Request, res: Response): Promise<Response> => {
  try {
    const resetData: TokenPasswordResetRequest = req.body;

    if (!resetData.token || !resetData.password) {
      return sendResponse(res, 400, 'Token and password are required');
    }

    const success = await authService.resetPasswordWithToken({
      token: resetData.token,
      newPassword: resetData.password,
    });

    if (!success) {
      return sendResponse(res, 400, 'Invalid or expired token');
    }

    logger.info('Password successfully reset using token');
    return sendResponse(res, 200, 'Password has been reset successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Auth error: Failed to reset password with token:', errorMessage);
    return sendResponse(res, 500, 'Internal server error');
  }
};

/**
 * Resets a user's password (legacy function for backward compatibility)
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Express response
 */
exports.resetPassword = async (req: Request, res: Response): Promise<Response> => {
  try {
    const passwordResetData = req.body;

    const data = await authService.resetPassword(passwordResetData);
    if (!data) {
      return sendResponse(res, 500, 'Failed to reset password');
    }

    return sendResponse(res, 200, 'Successfully reset password!', {});
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Auth error: Failed to reset password:', errorMessage);
    return sendResponse(res, 500, 'Internal server error');
  }
};

/**
 * Resends verification email to a user
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Express response
 */
exports.resendVerification = async (req: Request, res: Response): Promise<Response> => {
  const email: string = req.body.email;

  try {
    // Sends users.verification_token to user's mailbox
    const user = await authService.findUser(email);
    if (!user) {
      logger.error(
        `Auth error: Failed to resend email verification: Email '${email}' does not exist!`,
      );
      return sendResponse(res, 400, 'User not found!');
    }

    // Check for rate limiting could be added here

    // Send verification email
    await authService.resendVerification(user);
    logger.info(`Successfully resend verification to '${email}'`);

    return sendResponse(res, 200, 'Verification email has been resent!');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Auth error: Failed to resend email verification:', errorMessage);
    return sendResponse(res, 500, 'Internal server error');
  }
};
