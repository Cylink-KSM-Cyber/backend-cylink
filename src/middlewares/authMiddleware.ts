/**
 * Authentication Middleware
 *
 * Provides middleware functions for verifying JWT tokens
 * @module middlewares/authMiddleware
 */

import { Request, Response, NextFunction } from 'express';

const jwt = require('@/utils/jwt');
const { sendResponse } = require('@/utils/response');

/**
 * Extended request interface with token payload
 */
interface AuthenticatedRequest extends Request {
  user?: Record<string, unknown>;
}

/**
 * Middleware to verify access tokens in the Authorization header
 * @param {AuthenticatedRequest} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {void}
 */
exports.accessToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    sendResponse(res, 401, 'Unauthorized');
    return;
  }

  try {
    const payload = jwt.verify.accessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    sendResponse(res, 401, 'Invalid or expired access token');
  }
};

/**
 * Middleware to verify refresh tokens in the request body
 * @param {AuthenticatedRequest} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {void}
 */
exports.refreshToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const refreshToken = req.body.refresh_token;

  if (!refreshToken) {
    sendResponse(res, 401, 'Refresh token is required!');
    return;
  }

  try {
    const payload = jwt.verify.refreshToken(refreshToken);
    req.user = payload;
    next();
  } catch (error) {
    // Token is invalid, but we let the controller handle this case
    // to potentially issue a new token or handle the error appropriately
    next();
  }
};

/**
 * Middleware to verify email verification tokens in the request body
 * @param {AuthenticatedRequest} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {void}
 */
exports.verificationToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const { token: verificationToken } = req.body;

  if (!verificationToken) {
    sendResponse(res, 401, 'Token is required!');
    return;
  }

  try {
    const payload = jwt.verify.verificationToken(verificationToken);
    req.user = payload;
    next();
  } catch (error) {
    sendResponse(res, 401, 'Invalid or expired verification token');
  }
};
