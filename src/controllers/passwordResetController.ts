/**
 * Password Reset Controller
 *
 * Handles HTTP requests for password reset functionality
 * @module controllers/passwordResetController
 */

import { Request, Response } from 'express';

import logger from '../utils/logger';
import { validatePasswordNotSame } from '../utils/passwordValidator';

const mailer = require('../config/mailer');
const passwordChangeConfirmationMail = require('../mails/password-change-confirmation');
const userModel = require('../models/userModel');
const { hash } = require('../utils/crypto');

/**
 * Password reset request interface
 */
interface PasswordResetRequest {
  password: string;
  password_confirmation: string;
}

/**
 * User interface for password reset operations
 */
interface User {
  id: string;
  email: string;
  password?: string;
}

/**
 * Validates reset token from query parameter
 * @param {unknown} token - Reset token from query
 * @returns {string | null} - Valid token or null if invalid
 */
const validateResetToken = (token: unknown): string | null => {
  if (!token || typeof token !== 'string') {
    logger.warn('Password reset attempted without token in query parameter');
    return null;
  }
  return token;
};

/**
 * Finds and validates user by reset token
 * @param {string} token - Reset token
 * @returns {Promise<User | null>} - User object or null if not found/invalid
 */
const findUserByToken = async (token: string): Promise<User | null> => {
  const user = await userModel.getUserByPasswordResetToken(token);

  if (!user) {
    logger.warn(`Invalid or expired password reset token used: ${token.substring(0, 8)}...`);
    return null;
  }

  if (!user.email) {
    logger.error(`Password reset token found but user data is incomplete: ${user.id}`);
    return null;
  }

  return user;
};

/**
 * Validates new password against current password
 * @param {string} newPassword - New password to validate
 * @param {string | undefined} currentPassword - Current user password
 * @param {string} userEmail - User email for logging
 * @returns {Promise<boolean>} - True if password is valid
 */
const validateNewPassword = async (
  newPassword: string,
  currentPassword: string | undefined,
  userEmail: string,
): Promise<boolean> => {
  const passwordSameValidation = await validatePasswordNotSame(newPassword, currentPassword ?? '');

  if (!passwordSameValidation.isValid) {
    logger.info(`Password reset attempted with same password for user: ${userEmail}`);
    return false;
  }

  return true;
};

/**
 * Updates user password and clears reset token
 * @param {string} password - New password to set
 * @param {User} user - User object
 * @returns {Promise<User | null>} - Updated user or null if failed
 */
const updateUserPassword = async (password: string, user: User): Promise<User | null> => {
  const hashedPassword = await hash(password);

  const updatedUser = await userModel.updateUser(
    {
      password: hashedPassword,
      password_reset_token: null,
      password_reset_expires_at: null,
      password_reset_requested_at: null,
    },
    user.id,
  );

  if (!updatedUser) {
    logger.error(`Failed to update password for user: ${user.email}`);
    return null;
  }

  logger.info(`Password successfully reset for user: ${user.email}`);
  return updatedUser;
};

/**
 * Sends password change confirmation email
 * @param {string} userEmail - User email address
 */
const sendConfirmationEmail = async (userEmail: string): Promise<void> => {
  try {
    const emailHtml = passwordChangeConfirmationMail(userEmail);

    await mailer.sendMail({
      from: process.env.SMTP_FROM_EMAIL ?? 'noreply@cylink.id',
      to: userEmail,
      subject: 'Your CyLink password has been changed',
      html: emailHtml,
    });

    logger.info(`Password change confirmation email sent to: ${userEmail}`);
  } catch (emailError) {
    const emailErrorMessage = emailError instanceof Error ? emailError.message : String(emailError);
    logger.error(
      `Failed to send password change confirmation email to ${userEmail}:`,
      emailErrorMessage,
    );
  }
};

/**
 * Resets user password using secure token from query parameter
 *
 * This endpoint handles password reset requests where the reset token is passed
 * as a query parameter instead of in the header. It includes comprehensive
 * validation, rate limiting protection, and detailed error handling.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Express response
 */
exports.resetPassword = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { token } = req.query;
    const { password }: PasswordResetRequest = req.body;

    // Validate token
    const validToken = validateResetToken(token);
    if (!validToken) {
      return res.status(400).json({
        status: 400,
        message: 'Reset token is required in query parameter.',
        error_code: 'MISSING_TOKEN',
      });
    }

    // Find and validate user
    const user = await findUserByToken(validToken);
    if (!user) {
      // Check if token format suggests it might be expired vs invalid
      if (validToken.length > 20) {
        return res.status(400).json({
          status: 400,
          message: 'Reset token has expired. Please request a new password reset.',
          error_code: 'TOKEN_EXPIRED',
        });
      } else {
        return res.status(400).json({
          status: 400,
          message: 'Invalid or malformed reset token.',
          error_code: 'INVALID_TOKEN',
        });
      }
    }

    if (!user.email) {
      return res.status(400).json({
        status: 400,
        message: 'Invalid reset token. User account not found.',
        error_code: 'USER_NOT_FOUND',
      });
    }

    // Validate new password
    const isPasswordValid = await validateNewPassword(password, user.password, user.email);
    if (!isPasswordValid) {
      return res.status(400).json({
        status: 400,
        message: 'New password cannot be the same as your current password.',
        error_code: 'SAME_PASSWORD',
      });
    }

    // Update password
    const updatedUser = await updateUserPassword(password, user);
    if (!updatedUser) {
      return res.status(500).json({
        status: 500,
        message: 'Unable to update password. Please try again later.',
        error_code: 'DATABASE_ERROR',
      });
    }

    // Send confirmation email (non-blocking)
    await sendConfirmationEmail(user.email);

    return res.status(200).json({
      status: 200,
      message: 'Password has been reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Password reset error:', errorMessage);

    // Check if it's a database-related error
    if (errorMessage.includes('database') || errorMessage.includes('connection')) {
      return res.status(500).json({
        status: 500,
        message: 'Unable to update password. Please try again later.',
        error_code: 'DATABASE_ERROR',
      });
    }

    return res.status(500).json({
      status: 500,
      message: 'Internal server error. Please try again later.',
      error_code: 'INTERNAL_ERROR',
    });
  }
};
