/**
 * Get Feedback List Controller
 *
 * Handles GET /v1/feedback endpoint
 * @module controllers/feedback/getFeedbackList
 */

import { Request, Response } from 'express';

const feedbackService = require('../../services/feedbackService');

/**
 * Gets paginated feedback list with filters
 * @param req - Express request
 * @param res - Express response
 */
const getFeedbackList = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    const filters = {
      type: req.query.type as string,
      status: req.query.status as string,
      sortBy: req.query.sortBy as string,
      search: req.query.search as string,
      myVotes: req.query.myVotes === 'true',
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
    };

    const result = await feedbackService.getFeedbackList(userId, filters);

    res.status(200).json({
      status: 200,
      message: 'Feedback fetched successfully',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error: any) {
    const status = error.status || 500;
    res.status(status).json({
      status,
      message: error.message || 'Internal server error',
    });
  }
};

export default getFeedbackList;
