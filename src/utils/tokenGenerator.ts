/**
 * Token Generator Utility
 *
 * Provides functions for generating secure, cryptographically safe tokens
 * @module utils/tokenGenerator
 */

import crypto from 'crypto';

/**
 * Generates a cryptographically secure, URL-safe password reset token
 *
 * @param {number} length - Token length in bytes (default: 32)
 * @returns {string} URL-safe base64 encoded token
 */
export const generatePasswordResetToken = (length: number = 32): string => {
  // Generate random bytes
  const randomBytes = crypto.randomBytes(length);

  // Convert to URL-safe base64
  return randomBytes.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

/**
 * Generates expiration timestamp for password reset token (10 minutes from now)
 *
 * @returns {Date} Expiration timestamp
 */
export const generatePasswordResetExpiration = (): Date => {
  const now = new Date();
  const tenMinutes = 10 * 60 * 1000; // 10 minutes in milliseconds
  return new Date(now.getTime() + tenMinutes);
};

/**
 * Checks if a password reset token has expired
 *
 * @param {Date | null} expiresAt - Token expiration timestamp
 * @returns {boolean} True if token has expired, false otherwise
 */
export const isPasswordResetTokenExpired = (expiresAt: Date | null): boolean => {
  if (!expiresAt) return true;
  return new Date() > expiresAt;
};

export default {
  generatePasswordResetToken,
  generatePasswordResetExpiration,
  isPasswordResetTokenExpired,
};
