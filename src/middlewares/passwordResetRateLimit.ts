/**
 * Password Reset Rate Limiting Middleware
 *
 * Provides specialized rate limiting for password reset attempts to prevent brute force attacks
 * @module middlewares/passwordResetRateLimit
 */

import { Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';

import logger from '../libs/winston/winston.service';

/**
 * Rate limiter for password reset attempts
 * Allows 5 attempts per 15 minutes per IP address
 */
exports.passwordResetRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 password reset requests per windowMs
  message: {
    status: 429,
    message: 'Too many password reset attempts. Please try again in 15 minutes.',
    error_code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response, _next: NextFunction) => {
    const clientIp = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
    logger.warn(
      `Password reset rate limit exceeded for IP: ${clientIp} - ${req.method} ${req.originalUrl}`,
    );

    res.status(429).json({
      status: 429,
      message: 'Too many password reset attempts. Please try again in 15 minutes.',
      error_code: 'RATE_LIMIT_EXCEEDED',
    });
  },
  // Skip counting successful requests
  skipSuccessfulRequests: true,
  // Only count failed requests (4xx and 5xx status codes)
  skipFailedRequests: false,
});

/**
 * More permissive rate limiter for password reset token validation
 * Allows 10 attempts per 5 minutes per IP address for token validation only
 */
exports.passwordResetValidationRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit each IP to 10 validation requests per windowMs
  message: {
    status: 429,
    message: 'Too many token validation attempts. Please try again in 5 minutes.',
    error_code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response, _next: NextFunction) => {
    const clientIp = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
    logger.warn(
      `Password reset validation rate limit exceeded for IP: ${clientIp} - ${req.method} ${req.originalUrl}`,
    );

    res.status(429).json({
      status: 429,
      message: 'Too many token validation attempts. Please try again in 5 minutes.',
      error_code: 'RATE_LIMIT_EXCEEDED',
    });
  },
});
