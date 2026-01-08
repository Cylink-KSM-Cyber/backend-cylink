/**
 * Create Feedback Controller
 *
 * Handles POST /v1/feedback endpoint
 * @module controllers/feedback/createFeedback
 */

import { Request, Response } from 'express';

const feedbackService = require('../../services/feedbackService');

/**
 * Creates a new feedback entry
 * @param req - Express request
 * @param res - Express response
 */
const createFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({
        status: 401,
        message: 'Authentication required',
      });
      return;
    }

    const data = {
      title: req.body.title,
      description: req.body.description,
      type: req.body.type,
      tags: req.body.tags,
      use_case: req.body.use_case,
      reproduction_steps: req.body.reproduction_steps,
      expected_behavior: req.body.expected_behavior,
      actual_behavior: req.body.actual_behavior,
    };

    const result = await feedbackService.createFeedback(userId, data);

    res.status(201).json({
      status: 201,
      message: 'Feedback created successfully',
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

export default createFeedback;
