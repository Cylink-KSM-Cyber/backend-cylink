/**
 * Verification Controller
 *
 * Handles HTTP requests for account verification, including token validation
 * and user status update. Designed to be modular and reusable within the
 * authentication system.
 *
 * @module controllers/verificationController
 */

import { Request, Response } from 'express';
import * as verificationService from '../services/verificationService';
import logger from '../utils/logger';

/**
 * Verifies a user account using a verification token from query parameter
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Express response
 */
export const verify = async (req: Request, res: Response): Promise<Response> => {
  const { token } = req.query;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({
      status: 400,
      message: 'Verification token is required',
    });
  }
  try {
    const user = await verificationService.verifyUserByToken(token);
    logger.info(`Account verified for email: ${user.email}`);
    return res.status(200).json({
      status: 200,
      message: 'Account verified successfully',
      data: user,
    });
  } catch (err) {
    logger.error('Account verification error:', err instanceof Error ? err.message : String(err));
    return res.status(400).json({
      status: 400,
      message: err instanceof Error ? err.message : 'Invalid or expired verification token',
    });
  }
};
