/**
 * Rate Limiting Middleware
 *
 * Provides rate limiting functionality to prevent abuse of API endpoints
 * @module middlewares/rateLimitMiddleware
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import logger from '../libs/winston/winston.service';

/**
 * Creates a rate limiter with the specified configuration
 * 
 * @param {Object} options - Rate limiter options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum number of requests in the time window
 * @param {string} options.message - Message to send when rate limit is exceeded
 * @param {string} options.standardHeaders - Whether to include standard rate limit headers
 * @param {string} options.legacyHeaders - Whether to include legacy rate limit headers
 * @returns {Function} Express middleware function
 */
export const createRateLimiter = ({
  windowMs = 60 * 1000, // Default: 1 minute
  max = 60, // Default: 60 requests per minute
  message = 'Rate limit exceeded. Please try again later.',
  standardHeaders = true,
  legacyHeaders = false,
}: {
  windowMs?: number;
  max?: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      status: 429,
      message,
    },
    standardHeaders,
    legacyHeaders,
    handler: (req: Request, res: Response, next: NextFunction, options: any) => {
      logger.warn(`Rate limit exceeded: ${req.ip} - ${req.method} ${req.originalUrl}`);
      res.status(429).json(options.message);
    },
  });
};

/**
 * Default public API rate limiter: 60 requests per minute per IP
 */
export const publicApiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'Rate limit exceeded. Please try again later.',
});

export default { createRateLimiter, publicApiRateLimiter }; 