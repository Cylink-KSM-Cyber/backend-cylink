/**
 * Remove Vote Controller
 *
 * Handles DELETE /v1/feedback/:id/vote endpoint
 * @module controllers/feedback/removeVote
 */

import { Request, Response } from 'express';

const feedbackService = require('../../services/feedbackService');

/**
 * Removes a vote from a feedback entry
 * @param req - Express request
 * @param res - Express response
 */
const removeVote = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const feedbackId = parseInt(req.params.id, 10);

    if (!userId) {
      res.status(401).json({
        status: 401,
        message: 'Authentication required',
      });
      return;
    }

    const result = await feedbackService.removeVote(userId, feedbackId);

    res.status(200).json({
      status: 200,
      message: 'Vote removed successfully',
      data: result,
    });
  } catch (error: any) {
    const status = error.status || 500;
    res.status(status).json({
      status,
      message: error.message || 'Internal server error',
    });
  }
};

export default removeVote;
