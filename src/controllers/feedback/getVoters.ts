/**
 * Get Voters Controller
 *
 * Handles GET /v1/feedback/:id/voters endpoint
 * @module controllers/feedback/getVoters
 */

import { Request, Response } from 'express';

const feedbackService = require('../../services/feedbackService');

/**
 * Gets voters list for a feedback entry
 * @param req - Express request
 * @param res - Express response
 */
const getVoters = async (req: Request, res: Response): Promise<void> => {
  try {
    const feedbackId = parseInt(req.params.id, 10);
    const search = req.query.search as string | undefined;

    const result = await feedbackService.getVoters(feedbackId, search);

    res.status(200).json({
      status: 200,
      message: 'Voters fetched successfully',
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

export default getVoters;
