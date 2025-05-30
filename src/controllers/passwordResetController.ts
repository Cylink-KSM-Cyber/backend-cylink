/**
 * Password Reset Controller
 *
 * Handles HTTP requests for password reset functionality
 * @module controllers/passwordResetController
 */

import { Request, Response } from 'express';
import logger from '../utils/logger';
import { validatePasswordNotSame } from '../utils/passwordValidator';

const userModel = require('../models/userModel');
const { hash } = require('../utils/crypto');
const mailer = require('../config/mailer');
const passwordChangeConfirmationMail = require('../mails/password-change-confirmation');

/**
 * Password reset request interface
 */
interface PasswordResetRequest {
  password: string;
  password_confirmation: string;
}

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

    // Validate that token exists (should be caught by validation middleware, but defensive programming)
    if (!token || typeof token !== 'string') {
      logger.warn('Password reset attempted without token in query parameter');
      return res.status(400).json({
        status: 400,
        message: 'Reset token is required in query parameter.',
        error_code: 'MISSING_TOKEN',
      });
    }

    // Find user by valid, non-expired token
    const user = await userModel.getUserByPasswordResetToken(token);

    if (!user) {
      logger.warn(`Invalid or expired password reset token used: ${token.substring(0, 8)}...`);

      // Check if token format suggests it might be expired vs invalid
      if (token.length > 20) {
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

    // Check if user account exists (defensive check)
    if (!user.email) {
      logger.error(`Password reset token found but user data is incomplete: ${user.id}`);
      return res.status(400).json({
        status: 400,
        message: 'Invalid reset token. User account not found.',
        error_code: 'USER_NOT_FOUND',
      });
    }

    // Validate that the new password is not the same as the current password
    const passwordSameValidation = await validatePasswordNotSame(password, user.password || '');
    if (!passwordSameValidation.isValid) {
      logger.info(`Password reset attempted with same password for user: ${user.email}`);
      return res.status(400).json({
        status: 400,
        message: 'New password cannot be the same as your current password.',
        error_code: 'SAME_PASSWORD',
      });
    }

    // Hash the new password
    const hashedPassword = await hash(password);

    // Update password and clear reset token in a single operation
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
      return res.status(500).json({
        status: 500,
        message: 'Unable to update password. Please try again later.',
        error_code: 'DATABASE_ERROR',
      });
    }

    // Log successful password reset for security monitoring
    logger.info(`Password successfully reset for user: ${user.email}`);

    // Send password change confirmation email
    try {
      const emailHtml = passwordChangeConfirmationMail(user.email);

      await mailer.sendMail({
        from: process.env.SMTP_FROM_EMAIL || 'noreply@cylink.id',
        to: user.email,
        subject: 'Your CyLink password has been changed',
        html: emailHtml,
      });

      logger.info(`Password change confirmation email sent to: ${user.email}`);
    } catch (emailError) {
      // Don't fail the password reset if email sending fails
      const emailErrorMessage =
        emailError instanceof Error ? emailError.message : String(emailError);
      logger.error(
        `Failed to send password change confirmation email to ${user.email}:`,
        emailErrorMessage,
      );
    }

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
