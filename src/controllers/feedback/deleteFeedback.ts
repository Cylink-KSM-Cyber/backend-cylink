/**
 * Delete Feedback Controller
 *
 * Handles DELETE /v1/feedback/:id endpoint
 * @module controllers/feedback/deleteFeedback
 */

import { Request, Response } from 'express';

const feedbackService = require('../../services/feedbackService');

/**
 * Deletes a feedback entry
 * @param req - Express request
 * @param res - Express response
 */
const deleteFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const feedbackId = parseInt(req.params.id, 10);

    if (!userId) {
      res.status(401).json({
        status: 401,
        message: 'Authentication required',
      });
      return;
    }

    const isAdmin = userRole === 'admin';
    await feedbackService.deleteFeedback(userId, feedbackId, isAdmin);

    res.status(200).json({
      status: 200,
      message: 'Feedback deleted successfully',
    });
  } catch (error: any) {
    const status = error.status || 500;
    res.status(status).json({
      status,
      message: error.message || 'Internal server error',
    });
  }
};

export default deleteFeedback;
