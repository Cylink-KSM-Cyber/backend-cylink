/**
 * Conversion Controller
 *
 * Handles conversion tracking and analytics
 * @module controllers/conversionController
 */

import { Request as ExpressRequest, Response } from 'express';
import {
  ConversionCreate,
  ConversionRateFilters,
  ConversionGoalCreate,
  UrlGoalAssociation,
} from '../interfaces/Conversion';

// Extend Express Request to include user property
interface Request extends ExpressRequest {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

const conversionModel = require('../models/conversionModel');
const conversionGoalModel = require('../models/conversionGoalModel');
const urlModel = require('../models/urlModel');
const logger = require('../utils/logger');

/**
 * Create a new conversion goal
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Express response object
 */
exports.createConversionGoal = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { name, description }: ConversionGoalCreate = req.body;
    const userId = req.user?.id;

    if (!name) {
      return res.status(400).json({
        status: 400,
        message: 'Goal name is required',
      });
    }

    const goalData = {
      user_id: userId,
      name,
      description,
    };

    const goal = await conversionGoalModel.createGoal(goalData);

    return res.status(201).json({
      status: 201,
      message: 'Conversion goal created successfully',
      data: goal,
    });
  } catch (error) {
    logger.error(`Error creating conversion goal: ${error}`);
    return res.status(500).json({
      status: 500,
      message: 'Failed to create conversion goal',
    });
  }
};

/**
 * Associate a conversion goal with a URL
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Express response object
 */
exports.associateGoalWithUrl = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { url_id } = req.params;
    const { goal_id }: UrlGoalAssociation = req.body;
    const userId = req.user?.id;

    if (!goal_id) {
      return res.status(400).json({
        status: 400,
        message: 'Goal ID is required',
      });
    }

    // Verify URL belongs to the user
    const url = await urlModel.getUrlById(parseInt(url_id, 10));
    if (!url) {
      return res.status(404).json({
        status: 404,
        message: 'URL not found',
      });
    }

    if (url.user_id !== userId) {
      return res.status(403).json({
        status: 403,
        message: 'You do not have permission to modify this URL',
      });
    }

    // Verify goal belongs to the user
    const goal = await conversionGoalModel.getGoalById(goal_id);
    if (!goal) {
      return res.status(404).json({
        status: 404,
        message: 'Goal not found',
      });
    }

    if (goal.user_id !== userId) {
      return res.status(403).json({
        status: 403,
        message: 'You do not have permission to use this goal',
      });
    }

    // Check if the association already exists
    const associationExists = await conversionGoalModel.urlHasGoal(parseInt(url_id, 10), goal_id);
    if (associationExists) {
      return res.status(409).json({
        status: 409,
        message: 'This goal is already associated with this URL',
      });
    }

    // Create the association
    await conversionGoalModel.associateGoalWithUrl({
      url_id: parseInt(url_id, 10),
      goal_id,
    });

    // Get full details for response
    const goalDetails = await conversionGoalModel.getGoalDetails(parseInt(url_id, 10), goal_id);

    return res.status(201).json({
      status: 201,
      message: 'Goal associated with URL successfully',
      data: goalDetails,
    });
  } catch (error) {
    logger.error(`Error associating goal with URL: ${error}`);
    return res.status(500).json({
      status: 500,
      message: 'Failed to associate goal with URL',
    });
  }
};

/**
 * Remove a goal association from a URL
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Express response object
 */
exports.removeGoalFromUrl = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { url_id, goal_id } = req.params;
    const userId = req.user?.id;

    // Verify URL belongs to the user
    const url = await urlModel.getUrlById(parseInt(url_id, 10));
    if (!url) {
      return res.status(404).json({
        status: 404,
        message: 'URL not found',
      });
    }

    if (url.user_id !== userId) {
      return res.status(403).json({
        status: 403,
        message: 'You do not have permission to modify this URL',
      });
    }

    // Remove the association
    const removed = await conversionGoalModel.removeGoalFromUrl(
      parseInt(url_id, 10),
      parseInt(goal_id, 10),
    );
    if (!removed) {
      return res.status(404).json({
        status: 404,
        message: 'Goal association not found',
      });
    }

    return res.status(200).json({
      status: 200,
      message: 'Goal removed from URL successfully',
    });
  } catch (error) {
    logger.error(`Error removing goal from URL: ${error}`);
    return res.status(500).json({
      status: 500,
      message: 'Failed to remove goal from URL',
    });
  }
};

/**
 * Get all conversion goals for the authenticated user
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Express response object
 */
exports.getConversionGoals = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.id;
    const goals = await conversionGoalModel.getGoalsByUserId(userId);

    return res.status(200).json({
      status: 200,
      message: 'Conversion goals retrieved successfully',
      data: goals,
    });
  } catch (error) {
    logger.error(`Error getting conversion goals: ${error}`);
    return res.status(500).json({
      status: 500,
      message: 'Failed to retrieve conversion goals',
    });
  }
};

/**
 * Get conversion goals for a specific URL
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Express response object
 */
exports.getGoalsByUrl = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { url_id } = req.params;
    const userId = req.user?.id;

    // Verify URL belongs to the user
    const url = await urlModel.getUrlById(parseInt(url_id, 10));
    if (!url) {
      return res.status(404).json({
        status: 404,
        message: 'URL not found',
      });
    }

    if (url.user_id !== userId) {
      return res.status(403).json({
        status: 403,
        message: 'You do not have permission to access this URL',
      });
    }

    const goals = await conversionGoalModel.getGoalsByUrlId(parseInt(url_id, 10));

    return res.status(200).json({
      status: 200,
      message: 'URL conversion goals retrieved successfully',
      data: goals,
    });
  } catch (error) {
    logger.error(`Error getting URL conversion goals: ${error}`);
    return res.status(500).json({
      status: 500,
      message: 'Failed to retrieve URL conversion goals',
    });
  }
};

/**
 * Track a conversion event
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Express response object
 */
exports.trackConversion = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { tracking_id, goal_id, conversion_value, custom_data }: ConversionCreate = req.body;

    if (!tracking_id) {
      return res.status(400).json({
        status: 400,
        message: 'Tracking ID is required',
      });
    }

    // Decode the tracking ID
    const trackingData = conversionModel.decodeTrackingId(tracking_id);
    if (!trackingData) {
      return res.status(400).json({
        status: 400,
        message: 'Invalid tracking ID',
      });
    }

    const { clickId, urlId } = trackingData;

    // Check if the conversion already exists for this click
    if (goal_id && (await conversionModel.conversionExists(clickId, goal_id))) {
      return res.status(409).json({
        status: 409,
        message: 'Conversion already recorded for this click and goal',
      });
    }

    // Record the conversion
    const conversionData = {
      click_id: clickId,
      url_id: urlId,
      goal_id,
      conversion_value,
      user_agent: req.headers['user-agent'],
      ip_address: req.ip,
      referrer: req.headers.referer,
      custom_data,
    };

    const conversion = await conversionModel.recordConversion(conversionData);

    return res.status(201).json({
      status: 201,
      message: 'Conversion tracked successfully',
      data: {
        conversion_id: conversion.id,
        tracking_id,
        converted_at: conversion.converted_at,
      },
    });
  } catch (error) {
    logger.error(`Error tracking conversion: ${error}`);
    return res.status(500).json({
      status: 500,
      message: 'Failed to track conversion',
    });
  }
};

/**
 * Get conversion rate for a URL
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Express response object
 */
exports.getUrlConversionRate = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { url_id } = req.params;
    const userId = req.user?.id;
    const { start_date, end_date, goal_id, comparison } =
      req.query as unknown as ConversionRateFilters;

    // Verify URL belongs to the user
    const url = await urlModel.getUrlById(parseInt(url_id, 10));
    if (!url) {
      return res.status(404).json({
        status: 404,
        message: 'URL not found',
      });
    }

    if (url.user_id !== userId) {
      return res.status(403).json({
        status: 403,
        message: 'You do not have permission to access this URL',
      });
    }

    // Get conversion rate
    const conversionRate = await conversionModel.getConversionRate(parseInt(url_id, 10), {
      start_date,
      end_date,
      goal_id: goal_id ? parseInt(goal_id.toString(), 10) : undefined,
      comparison: comparison ? parseInt(comparison.toString(), 10) : undefined,
    });

    return res.status(200).json({
      status: 200,
      message: 'Conversion rate retrieved successfully',
      data: conversionRate,
    });
  } catch (error) {
    logger.error(`Error getting URL conversion rate: ${error}`);
    return res.status(500).json({
      status: 500,
      message: 'Failed to retrieve conversion rate',
    });
  }
};

/**
 * Get overall conversion rate for all of the user's URLs
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Express response object
 */
exports.getOverallConversionRate = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.id;
    const { start_date, end_date, goal_id, comparison } =
      req.query as unknown as ConversionRateFilters;

    // Get overall conversion rate
    const conversionRate = await conversionModel.getOverallConversionRate(userId, {
      start_date,
      end_date,
      goal_id: goal_id ? parseInt(goal_id.toString(), 10) : undefined,
      comparison: comparison ? parseInt(comparison.toString(), 10) : undefined,
    });

    return res.status(200).json({
      status: 200,
      message: 'Overall conversion rate retrieved successfully',
      data: conversionRate,
    });
  } catch (error) {
    logger.error(`Error getting overall conversion rate: ${error}`);
    return res.status(500).json({
      status: 500,
      message: 'Failed to retrieve overall conversion rate',
    });
  }
};
