/**
 * Get URL Analytics Controller
 *
 * Controller for retrieving analytics data for a specific URL with time range and grouping options.
 *
 * @module controllers/urls/getUrlAnalytics
 */

import { Request, Response } from 'express';
import { AnalyticsOptions } from '../../interfaces/URL';
import logger from '../../utils/logger';
import { sendResponse } from '../../utils/response';

const urlModel = require('../../models/urlModel');
const urlService = require('../../services/urlService');

/**
 * Validates the URL ID from request parameters
 *
 * @param {string} idParam - The ID parameter from request
 * @returns {{ isValid: boolean, value?: number, errorMessage?: string }} Validation result
 */
const validateUrlId = (
  idParam: string,
): { isValid: boolean; value?: number; errorMessage?: string } => {
  const urlId = parseInt(idParam);

  if (isNaN(urlId)) {
    return { isValid: false, errorMessage: 'Invalid URL ID' };
  }

  return { isValid: true, value: urlId };
};

/**
 * Checks if the URL exists and belongs to the authenticated user
 *
 * @param {number} urlId - The URL ID to check
 * @param {number} userId - The authenticated user ID
 * @returns {Promise<{ isAuthorized: boolean, url?: any, errorCode?: number, errorMessage?: string }>} Authorization result
 */
const checkUrlAuthorization = async (
  urlId: number,
  userId: number,
): Promise<{ isAuthorized: boolean; url?: any; errorCode?: number; errorMessage?: string }> => {
  try {
    // Check if URL exists
    const url = await urlModel.getUrlById(urlId);

    if (!url) {
      return {
        isAuthorized: false,
        errorCode: 404,
        errorMessage: 'URL not found',
      };
    }

    // Check if the URL belongs to the authenticated user
    if (url.user_id && url.user_id !== userId) {
      return {
        isAuthorized: false,
        errorCode: 401,
        errorMessage: 'Unauthorized',
      };
    }

    return { isAuthorized: true, url };
  } catch (error) {
    logger.error(`Error checking URL authorization: ${error}`);
    return {
      isAuthorized: false,
      errorCode: 500,
      errorMessage: 'Internal server error',
    };
  }
};

/**
 * Extracts and validates the analytics options from the request query parameters
 *
 * @param {Request} req - Express request object
 * @returns {AnalyticsOptions} Formatted analytics options
 */
const extractAnalyticsOptions = (req: Request): AnalyticsOptions => {
  const { start_date, end_date, group_by } = req.query;
  const options: AnalyticsOptions = {};

  if (start_date) {
    options.startDate = start_date as string;
  }

  if (end_date) {
    options.endDate = end_date as string;
  }

  if (group_by && ['day', 'week', 'month'].includes(group_by as string)) {
    options.groupBy = group_by;
  }

  return options;
};

/**
 * Handles errors during URL analytics retrieval
 *
 * @param {unknown} error - The error that occurred
 * @param {Response} res - Express response object
 * @returns {Response} Error response
 */
const handleError = (error: unknown, res: Response): Response => {
  if (error instanceof Error && error.message === 'URL not found') {
    return sendResponse(res, 404, 'URL not found');
  } else if (error instanceof TypeError) {
    logger.error('URL error: Type error while retrieving analytics:', error.message);
    return sendResponse(res, 400, 'Invalid request format');
  } else if (error instanceof Error) {
    logger.error('URL error: Failed to retrieve URL analytics:', error.message);
    return sendResponse(res, 500, 'Internal Server Error');
  } else {
    logger.error('URL error: Unknown error while retrieving analytics:', String(error));
    return sendResponse(res, 500, 'Internal server error');
  }
};

/**
 * Get analytics for a specific URL
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with URL analytics or error
 */
export const getUrlAnalytics = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Get user ID from authentication token
    const userId = req.body.id;

    // Guard clause: Validate URL ID
    const validation = validateUrlId(req.params.id);
    if (!validation.isValid) {
      return sendResponse(res, 400, validation.errorMessage || 'Invalid URL ID');
    }
    const urlId = validation.value!;

    // Guard clause: Check if URL exists and user has permission
    const authCheck = await checkUrlAuthorization(urlId, userId);
    if (!authCheck.isAuthorized) {
      return sendResponse(
        res,
        authCheck.errorCode || 401,
        authCheck.errorMessage || 'Unauthorized',
      );
    }

    // Extract and prepare analytics options from request query
    const options = extractAnalyticsOptions(req);

    // Get analytics data with filters
    const analytics = await urlService.getUrlAnalyticsWithFilters(urlId, options);

    logger.info(`Successfully retrieved analytics for URL ID ${urlId}`);

    return sendResponse(res, 200, 'Successfully retrieved URL analytics', analytics);
  } catch (error: unknown) {
    return handleError(error, res);
  }
};

export default getUrlAnalytics;
