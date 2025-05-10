/**
 * Create Anonymous URL Controller
 *
 * Controller for creating shortened URLs without user authentication.
 *
 * @module controllers/urls/createAnonymousUrl
 */

import { Request, Response } from 'express';
import logger from '../../utils/logger';
import { isValidUrl } from '../../utils/urlValidator';
import { sendResponse } from '../../utils/response';

const urlService = require('../../services/urlService');

/**
 * URL creation request parameters interface
 */
interface CreateUrlRequest {
  original_url: string;
  custom_code?: string;
  title?: string;
  expiry_date?: string;
  goal_id?: string | number;
}

/**
 * Validates URL creation request parameters
 *
 * @param {CreateUrlRequest} requestBody - The request body to validate
 * @returns {{ isValid: boolean, errorMessage?: string }} Validation result
 */
const validateUrlCreationRequest = (requestBody: CreateUrlRequest) => {
  const { original_url } = requestBody;

  // Guard clause: Check if URL is provided
  if (!original_url) {
    return { isValid: false, errorMessage: 'URL is required' };
  }

  // Guard clause: Check if URL is valid
  if (!isValidUrl(original_url)) {
    return { isValid: false, errorMessage: 'Invalid URL provided' };
  }

  return { isValid: true };
};

/**
 * Formats URL creation options from request parameters
 *
 * @param {CreateUrlRequest} requestBody - The validated request body
 * @returns {Object} Formatted URL creation options
 */
const formatUrlCreationOptions = (requestBody: CreateUrlRequest) => {
  const { original_url, custom_code, title, expiry_date, goal_id } = requestBody;

  return {
    originalUrl: original_url,
    customShortCode: custom_code,
    title,
    expiryDate: expiry_date ? new Date(expiry_date) : undefined,
    goalId: goal_id ? parseInt(String(goal_id)) : undefined,
  };
};

/**
 * Formats URL response from the created URL object
 *
 * @param {any} newUrl - The newly created URL object
 * @param {string|number|undefined} goal_id - Optional goal ID
 * @returns {Object} Formatted URL response
 */
const formatUrlResponse = (newUrl: any, goal_id?: string | number) => {
  // Generate the full short URL
  const baseUrl = process.env.SHORT_URL_BASE ?? 'https://cylink.id/';
  const shortUrl = baseUrl + newUrl.short_code;

  return {
    id: newUrl.id,
    original_url: newUrl.original_url,
    short_code: newUrl.short_code,
    short_url: shortUrl,
    title: newUrl.title ?? null,
    created_at: new Date(newUrl.created_at).toISOString(),
    expiry_date: newUrl.expiry_date ? new Date(newUrl.expiry_date).toISOString() : null,
    is_active: newUrl.is_active,
    goal_id: goal_id ? parseInt(String(goal_id)) : null,
  };
};

/**
 * Handles errors during URL creation
 *
 * @param {unknown} error - The error that occurred
 * @param {Response} res - Express response object
 * @returns {Response} Error response
 */
const handleUrlCreationError = (error: unknown, res: Response) => {
  // Handle custom code already taken error
  if (error instanceof Error && error.message === 'This custom short code is already taken') {
    return sendResponse(res, 409, 'Custom code already in use');
  } else if (error instanceof TypeError) {
    logger.error('URL error: Type error while creating anonymous URL:', error.message);
    return sendResponse(res, 400, 'Invalid data format');
  } else if (error instanceof Error) {
    logger.error('URL error: Failed to create anonymous URL:', error.message);
    return sendResponse(res, 500, 'Internal Server Error');
  } else {
    logger.error('URL error: Unknown error while creating anonymous URL:', String(error));
    return sendResponse(res, 500, 'Internal server error');
  }
};

/**
 * Create a shortened URL for anonymous users
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with created URL or error
 */
export const createAnonymousUrl = async (req: Request, res: Response): Promise<Response> => {
  try {
    const requestBody = req.body as CreateUrlRequest;

    // Validate request parameters
    const validation = validateUrlCreationRequest(requestBody);
    if (!validation.isValid) {
      return sendResponse(res, 400, validation.errorMessage || 'Invalid request');
    }

    try {
      // Format URL creation options
      const urlOptions = formatUrlCreationOptions(requestBody);

      // Create the shortened URL
      const newUrl = await urlService.createShortenedUrl(urlOptions);

      // Format the response
      const response = formatUrlResponse(newUrl, requestBody.goal_id);

      // Log success
      logger.info(`Successfully created anonymous shortened URL: ${response.short_url}`);

      // Return successful response
      return sendResponse(res, 201, 'Successfully created shortened URL', response);
    } catch (error) {
      return handleUrlCreationError(error, res);
    }
  } catch (error: unknown) {
    // Handle outer unexpected errors
    if (error instanceof TypeError) {
      logger.error('URL error: Type error while creating shortened URL:', error.message);
      return sendResponse(res, 400, 'Invalid data format');
    } else if (error instanceof Error) {
      logger.error('URL error: Failed to create shortened URL:', error.message);
      return sendResponse(res, 500, 'Internal Server Error');
    } else {
      logger.error('URL error: Unknown error while creating shortened URL:', String(error));
      return sendResponse(res, 500, 'Internal server error');
    }
  }
};

export default createAnonymousUrl;
