/**
 * Search Similar Controller
 *
 * Handles GET /v1/feedback/search-similar endpoint
 * @module controllers/feedback/searchSimilar
 */

import { Request, Response } from 'express';

const feedbackService = require('../../services/feedbackService');

/**
 * Searches for similar feedback entries
 * @param req - Express request
 * @param res - Express response
 */
const searchSimilar = async (req: Request, res: Response): Promise<void> => {
  try {
    const title = req.query.title as string;

    if (!title || title.length < 3) {
      res.status(400).json({
        status: 400,
        message: 'Title is required and must be at least 3 characters',
      });
      return;
    }

    const result = await feedbackService.searchSimilar(title);

    res.status(200).json({
      status: 200,
      message: 'Similar feedback found',
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

export default searchSimilar;
