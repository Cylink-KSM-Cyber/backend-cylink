/**
 * Get Public URL Details Controller
 *
 * Controller for retrieving public URL details using only the short code
 * without requiring authentication
 *
 * @module controllers/urls/getPublicUrlDetails
 */

import { Response } from 'express';
import logger from '../../utils/logger';
import { sendResponse } from '../../utils/response';
import { ClickTrackingRequest } from '../../interfaces/ClickInfo';

const publicUrlService = require('../../services/publicUrlService');

/**
 * Handles errors that occur during public URL details retrieval
 *
 * @param {unknown} error - The error that occurred
 * @param {Response} res - Express response object
 * @returns {Response} Error response
 */
const handleError = (error: unknown, res: Response): Response => {
  if (error instanceof Error) {
    logger.error('Public URL error: Failed to retrieve URL details:', error.message);
    return sendResponse(res, 500, 'Internal Server Error');
  } else {
    logger.error('Public URL error: Unknown error while retrieving URL details:', String(error));
    return sendResponse(res, 500, 'Internal server error');
  }
};

/**
 * Get public URL details by short code
 * This endpoint doesn't require authentication and returns limited URL information
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with URL details or error
 */
export const getPublicUrlDetails = async (
  req: ClickTrackingRequest,
  res: Response,
): Promise<Response> => {
  try {
    // Extract short code from request parameters
    const { shortCode } = req.params;

    // Guard clause: Validate short code
    if (!shortCode || typeof shortCode !== 'string') {
      return sendResponse(res, 400, 'Invalid short code');
    }

    // Get URL details from service
    const urlDetails = await publicUrlService.getPublicUrlDetails(shortCode, req.clickInfo);

    // URL not found or inactive
    if (!urlDetails) {
      return sendResponse(res, 404, 'URL not found or inactive');
    }

    // Log successful request
    logger.info(`Successfully retrieved public URL details for short code ${shortCode}`);

    // Return successful response
    return sendResponse(res, 200, 'URL details retrieved successfully', urlDetails);
  } catch (error: unknown) {
    return handleError(error, res);
  }
};

export default getPublicUrlDetails;
