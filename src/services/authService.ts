/**
 * Authentication Service
 *
 * Provides business logic for user authentication and account management
 * @module services/authService
 */

import { User } from '../collections/userCollection';
import forgotPasswordMail from '../mails/forgot-password';
import logger from '../utils/logger';
import {
  generatePasswordResetToken,
  generatePasswordResetExpiration,
} from '../utils/tokenGenerator';

const userCollection = require('../collections/userCollection');
const registerMail = require('../mails/register');
const resendVerificationMail = require('../mails/resend-verification');
const resetPasswordMail = require('../mails/reset-password');
const userModel = require('../models/userModel');
const { hash, compare } = require('../utils/crypto');
const jwt = require('../utils/jwt');
const { sendMail } = require('../utils/mailer');

/**
 * User registration data interface
 */
interface RegistrationData {
  username: string;
  email: string;
  password: string;
  verification_token?: string;
  last_email_verify_requested_at?: number | Date;
}

/**
 * Login response interface
 */
interface LoginResponse {
  user: object | null;
  token: {
    type: string;
    access: string;
    refresh: string;
    expiresAt: number;
  };
}

/**
 * Finds user by email
 * @param {string} email - Email to search for
 * @returns {Promise<User|undefined>} User object if found
 */
exports.findUser = async (email: string): Promise<User | undefined> => {
  return await userModel.getUserByEmail(email);
};

/**
 * Create new user
 * @param {RegistrationData} user - User registration data
 * @returns {Promise<User>} Created user data
 */
exports.createUser = async (user: RegistrationData): Promise<User> => {
  const hashedPassword = await hash(user.password);

  const userData: RegistrationData = {
    username: user.username,
    email: user.email,
    password: hashedPassword,
  };
  userData.verification_token = jwt.verification.sign(userData);
  userData.last_email_verify_requested_at = Date.now();

  await userModel.createUser(userData);

  return userData as User;
};

/**
 * Sends registration verification email
 * @param {User} user - User data
 * @returns {Promise<void>}
 */
exports.sendRegistration = async (user: User): Promise<void> => {
  await sendMail(
    user.email,
    'User Registration Verification',
    'User Registration Verification',
    registerMail(user.username, user.verification_token),
  );
};

/**
 * Resends verification email
 * @param {User} user - User data
 * @returns {Promise<void>}
 */
exports.resendVerification = async (user: User): Promise<void> => {
  await sendMail(
    user.email,
    'Verification Resend',
    'Verification Resend',
    resendVerificationMail(user.verification_token),
  );
};

/**
 * Verifies user registration from email
 * @param {User} user - User data
 * @returns {Promise<object|boolean>} User data or false if already verified
 */
exports.verifyRegister = async (user: User): Promise<object | boolean> => {
  const data = await userModel.getUserByEmail(user.email);

  if (data.email_verified_at) {
    return false;
  }

  const userData = await userModel.updateUser({
    email: user.email,
    email_verified_at: Date.now(),
    verification_token: null,
  });

  return userCollection.single(userData);
};

/**
 * Authenticates user by credentials
 * @param {Pick<User, 'email' | 'password'>} credentials - User login credentials
 * @returns {Promise<User|boolean>} User data or false if authentication fails
 */
exports.authenticate = async (
  credentials: Pick<User, 'email' | 'password'>,
): Promise<User | boolean> => {
  const data = await userModel.getUserByEmail(credentials.email);

  if (!data) {
    return false;
  }

  if (!(await compare(credentials.password, data.password))) {
    return false;
  }

  return data;
};

/**
 * Creates user session and records login event
 * @param {User} userData - User data
 * @param {string | null} ipAddress - IP address of login
 * @param {string | null} userAgent - User agent string
 * @returns {Promise<LoginResponse & { first_login: boolean }>} Session data with tokens and first_login flag
 */
exports.login = async (
  userData: User,
  ipAddress: string | null,
  userAgent: string | null,
): Promise<LoginResponse & { first_login: boolean }> => {
  // Get previous last_login before updating
  const prevLastLogin = await userModel.getLastLogin(userData.id);
  // Update last_login to now
  await userModel.updateUser({ last_login: new Date() }, userData.id);
  // Insert login record
  await userModel.insertUserLogin(userData.id, ipAddress, userAgent);
  // Build response
  return {
    user: userCollection.single({ ...userData, last_login: new Date() }),
    token: {
      type: 'bearer',
      access: jwt.access.sign(userData),
      refresh: jwt.refresh.sign(userData),
      expiresAt: jwt.access.getExpiration(),
    },
    first_login: prevLastLogin === null,
  };
};

/**
 * Sends password reset verification to email
 * @param {Pick<User, 'email'>} user - User email
 * @returns {Promise<string>} Verification token
 */
exports.sendPasswordResetVerification = async (user: Pick<User, 'email'>): Promise<string> => {
  const email = user.email;
  const verificationToken = jwt.verification.sign({ email });

  try {
    await sendMail(
      email,
      'Password Reset Verification',
      'Password Reset Verification',
      resetPasswordMail(verificationToken),
    );

    return verificationToken;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to send password reset email: ${errorMessage}`);
  }
};

/**
 * Updates user password
 * @param {Pick<User, 'email' | 'password'>} user - User data with new password
 * @returns {Promise<User>} Updated user data
 */
exports.resetPassword = async (user: Pick<User, 'email' | 'password'>): Promise<User> => {
  try {
    const hashedPassword = await hash(user.password);

    return await userModel.updateUser({
      email: user.email,
      password: hashedPassword,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to reset password: ${errorMessage}`);
  }
};

/**
 * Verifies a verification token
 * @param {string} verificationToken - Token to verify
 * @returns {Promise<object|boolean>} Decoded token or false if invalid
 */
const verifyVerificationToken = async (
  verificationToken: string,
): Promise<Record<string, unknown> | boolean> => {
  try {
    const decoded = jwt.verification.verify(verificationToken);
    return decoded ?? false;
  } catch (error) {
    logger.error(
      'Failed to verify verification token:',
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
};

exports.verifyVerificationToken = verifyVerificationToken;

/**
 * Sends password reset email with secure token
 * @param {Pick<User, 'email'>} userData - User email data
 * @returns {Promise<boolean>} True if email sent successfully, false otherwise
 */
exports.sendForgotPasswordEmail = async (userData: Pick<User, 'email'>): Promise<boolean> => {
  const { email } = userData;

  try {
    // Check if user exists (but don't reveal this information in response)
    const user = await userModel.getUserByEmail(email);

    // Always return consistent response regardless of whether user exists
    // This prevents email enumeration attacks
    if (!user) {
      // Log for security monitoring but don't expose to user
      logger.warn(`Password reset requested for non-existent email: ${email}`);
      return true; // Return true to maintain consistent response
    }

    // Check rate limiting - prevent abuse
    const isWithinRateLimit = await userModel.isWithinPasswordResetRateLimit(email, 5);
    if (isWithinRateLimit) {
      logger.warn(`Password reset rate limit exceeded for email: ${email}`);
      return true; // Return true to maintain consistent response
    }

    // Generate secure token and expiration
    const resetToken = generatePasswordResetToken();
    const expiresAt = generatePasswordResetExpiration();

    // Store token in database
    await userModel.setPasswordResetToken(email, resetToken, expiresAt);

    // Send email with reset link
    await sendMail(
      email,
      'Reset Your CyLink Password',
      'Password Reset Request',
      forgotPasswordMail(resetToken, user.username),
    );

    logger.info(`Password reset email sent to: ${email}`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to send password reset email: ${errorMessage}`);

    // Return false only for internal errors, not for user enumeration prevention
    return false;
  }
};

/**
 * Resets user password using secure token
 * @param {object} resetData - Password reset data
 * @param {string} resetData.token - Password reset token
 * @param {string} resetData.newPassword - New password
 * @returns {Promise<boolean>} True if password reset successful, false otherwise
 */
exports.resetPasswordWithToken = async (resetData: {
  token: string;
  newPassword: string;
}): Promise<boolean> => {
  const { token, newPassword } = resetData;

  try {
    // Find user by valid, non-expired token
    const user = await userModel.getUserByPasswordResetToken(token);

    if (!user) {
      logger.warn(`Invalid or expired password reset token used: ${token.substring(0, 8)}...`);
      return false;
    }

    // Hash new password
    const hashedPassword = await hash(newPassword);

    // Update password and clear reset token
    await userModel.updateUser(
      {
        password: hashedPassword,
        password_reset_token: null,
        password_reset_expires_at: null,
      },
      user.id,
    );

    logger.info(`Password successfully reset for user: ${user.email}`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to reset password: ${errorMessage}`);
    return false;
  }
};

/**
 * Validates password reset token
 * @param {string} token - Password reset token
 * @returns {Promise<User|null>} User object if token is valid, null otherwise
 */
exports.validatePasswordResetToken = async (token: string): Promise<User | null> => {
  try {
    const user = await userModel.getUserByPasswordResetToken(token);
    return user ?? null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to validate password reset token: ${errorMessage}`);
    return null;
  }
};

/**
 * Cleans up expired password reset tokens
 * @returns {Promise<number>} Number of tokens cleaned up
 */
exports.cleanupExpiredPasswordResetTokens = async (): Promise<number> => {
  try {
    const cleanedCount = await userModel.cleanupExpiredPasswordResetTokens();
    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} expired password reset tokens`);
    }
    return cleanedCount;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to cleanup expired tokens: ${errorMessage}`);
    return 0;
  }
};
