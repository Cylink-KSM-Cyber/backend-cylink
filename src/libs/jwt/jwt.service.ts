/**
 * JWT Service
 *
 * Provides JWT token signing and verification functionality
 * using jsonwebtoken library.
 *
 * @module libs/jwt/jwt.service
 * @version 1.1.0
 * @since 2024-01-01
 * @updated 2025-12-13 - Moved from utils/jwt.ts to libs/jwt structure for better modularity
 */

const jwt = require('jsonwebtoken');

const jwtConfig = require('../../config/jwt');

/**
 * Signs a payload into a JWT token.
 *
 * @param {object} payload - The payload to sign
 * @param {string} secret - The secret key to use for signing
 * @param {string} expiresIn - Token expiration time
 * @returns {string} The signed JWT token
 */
const signToken = (payload: object, secret: string, expiresIn: string): string => {
  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Verifies a JWT token.
 *
 * @param {string} token - The token to verify
 * @param {string} secret - The secret key to use for verification
 * @returns {object | string} The decoded payload or throws an error
 * @throws {Error} If the token is invalid or expired
 */
const verifyToken = (token: string, secret: string): object | string => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Access token operations.
 *
 * Used in authentication to access resources within this REST API.
 */
exports.access = {
  sign: (payload: object) => signToken(payload, jwtConfig.access.secret, jwtConfig.access.ttl),
  verify: (token: string) => verifyToken(token, jwtConfig.access.secret),
  getExpiration: (): number => {
    // Parse the TTL to get the number of seconds/minutes/hours
    const ttl = jwtConfig.access.ttl;
    const value = parseInt(ttl);
    const unit = ttl.replace(/[0-9]/g, '');

    // Calculate expiration time based on unit
    let expiryMs = 0;
    switch (unit) {
      case 's':
        expiryMs = value * 1000;
        break;
      case 'm':
        expiryMs = value * 60 * 1000;
        break;
      case 'h':
        expiryMs = value * 60 * 60 * 1000;
        break;
      case 'd':
        expiryMs = value * 24 * 60 * 60 * 1000;
        break;
      default:
        expiryMs = 3600 * 1000; // Default to 1 hour if format not recognized
    }

    return Date.now() + expiryMs;
  },
};

/**
 * Refresh token operations.
 *
 * Used to refresh access token after it expires.
 */
exports.refresh = {
  sign: (payload: object) => signToken(payload, jwtConfig.refresh.secret, jwtConfig.refresh.ttl),
  verify: (token: string) => verifyToken(token, jwtConfig.refresh.secret),
};

/**
 * Verification token operations.
 *
 * Used as temporary token for verification.
 */
exports.verification = {
  sign: (payload: object) =>
    signToken(payload, jwtConfig.verification.secret, jwtConfig.verification.ttl),
  verify: (token: string) => verifyToken(token, jwtConfig.verification.secret),
};
