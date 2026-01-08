/**
 * Vote Feedback Controller
 *
 * Handles POST /v1/feedback/:id/vote endpoint
 * @module controllers/feedback/voteFeedback
 */

import { Request, Response } from 'express';

const feedbackService = require('../../services/feedbackService');

/**
 * Votes on a feedback entry
 * @param req - Express request
 * @param res - Express response
 */
const voteFeedback = async (req: Request, res: Response): Promise<void> => {
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

    const { vote_type, reason, comment } = req.body;

    const result = await feedbackService.voteFeedback(
      userId,
      feedbackId,
      vote_type,
      reason,
      comment,
    );

    res.status(200).json({
      status: 200,
      message: 'Vote recorded successfully',
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

export default voteFeedback;
