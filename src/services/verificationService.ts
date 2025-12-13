/**
 * Verification Service
 *
 * Handles business logic for account verification, including token validation,
 * user status update, and error handling. Designed for modularity and reuse
 * within the authentication system.
 *
 * @module services/verificationService
 */

import { User } from '../collections/userCollection';
import logger from '../libs/winston/winston.service';

const userModel = require('../models/userModel');
const jwt = require('../libs/jwt/jwt.service');

export interface VerificationTokenPayload {
  email: string;
  [key: string]: unknown;
}

/**
 * Validates a verification token and returns the decoded payload if valid
 * @param {string} token - Verification token
 * @returns {VerificationTokenPayload} Decoded payload if valid
 * @throws {Error} If token is invalid or expired
 */
export async function validateVerificationToken(token: string): Promise<VerificationTokenPayload> {
  try {
    const decoded = jwt.verification.verify(token) as VerificationTokenPayload;
    if (!decoded || typeof decoded !== 'object' || !decoded.email) {
      throw new Error('Invalid token payload');
    }
    return decoded;
  } catch (err) {
    logger.error(
      'Verification token validation failed:',
      err instanceof Error ? err.message : String(err),
    );
    throw new Error('Invalid or expired verification token');
  }
}

/**
 * Verifies a user account by token, updates user status, and invalidates token
 * @param {string} token - Verification token
 * @returns {Promise<Partial<User>>} Verified user data (safe fields)
 * @throws {Error} If token is invalid, expired, or user not found
 */
export async function verifyUserByToken(token: string): Promise<Partial<User>> {
  const decoded = await validateVerificationToken(token);
  const email = decoded.email;
  if (!email) throw new Error('Invalid token payload');

  const user = await userModel.getUserByEmail(email);
  if (!user) throw new Error('User not found');
  if (user.email_verified_at) throw new Error('User already verified');

  // Update user: set email_verified_at, nullify verification_token
  const updatedUser = await userModel.updateUser(
    {
      email_verified_at: new Date(),
      verification_token: null,
    },
    user.id,
  );

  return {
    id: updatedUser.id,
    username: updatedUser.username,
    email: updatedUser.email,
    email_verified_at: updatedUser.email_verified_at,
    created_at: updatedUser.created_at,
    updated_at: updatedUser.updated_at,
  };
}
