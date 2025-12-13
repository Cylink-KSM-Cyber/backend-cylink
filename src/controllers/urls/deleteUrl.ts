/**
 * Delete URL Controller
 *
 * Controller for soft-deleting URLs by ID for authenticated users.
 *
 * @module controllers/urls/deleteUrl
 */

import { Request, Response } from 'express';
import logger from '../../libs/winston/winston.service';
import { sendResponse } from '../../utils/response';

const urlModel = require('../../models/urlModel');

/**
 * Interface for URL info with ID and short code
 */
interface UrlInfo {
  id: number;
  short_code: string;
}

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
 * Formats the response for a successfully deleted URL
 *
 * @param {any} deletedUrl - The deleted URL object
 * @param {UrlInfo} urlInfo - Fallback URL info if deletedUrl is not available
 * @returns {object} Formatted response object
 */
const formatDeletedUrlResponse = (deletedUrl: any, urlInfo: UrlInfo): object => {
  if (deletedUrl) {
    return {
      id: deletedUrl.id,
      short_code: deletedUrl.short_code,
      deleted_at: new Date(deletedUrl.deleted_at).toISOString(),
    };
  } else {
    // Fallback in case we can't retrieve the deleted URL
    return {
      id: urlInfo.id,
      short_code: urlInfo.short_code,
      deleted_at: new Date().toISOString(),
    };
  }
};

/**
 * Handles errors during URL deletion
 *
 * @param {unknown} error - The error that occurred
 * @param {Response} res - Express response object
 * @returns {Response} Error response
 */
const handleError = (error: unknown, res: Response): Response => {
  if (error instanceof TypeError) {
    const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
    logger.error(`URL error: Type error while deleting URL: ${errorMsg}`);
    return sendResponse(res, 400, 'Invalid request format');
  } else if (error instanceof Error) {
    logger.error(`URL error: Failed to delete URL: ${error.message}`);
    return sendResponse(res, 500, 'Internal Server Error');
  } else {
    logger.error(`URL error: Unknown error while deleting URL: ${JSON.stringify(error)}`);
    return sendResponse(res, 500, 'Internal server error');
  }
};

/**
 * Delete a URL by ID (soft delete)
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with deletion result or error
 */
export const deleteUrl = async (req: Request, res: Response): Promise<Response> => {
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

    // Store some information about the URL before deletion
    const urlInfo: UrlInfo = {
      id: authCheck.url!.id,
      short_code: authCheck.url!.short_code,
    };

    // Perform soft delete
    const isDeleted = await urlModel.deleteUrl(urlId);

    // Guard clause: Check if deletion was successful
    if (!isDeleted) {
      return sendResponse(res, 500, 'Failed to delete URL');
    }

    try {
      // Get the updated URL to return the deleted_at timestamp (including soft deleted URLs)
      const deletedUrl = await urlModel.getUrlById(urlId, true);

      // Format and return response
      const response = formatDeletedUrlResponse(deletedUrl, urlInfo);

      logger.info(`Successfully deleted URL with ID ${urlId}`);
      return sendResponse(res, 200, 'Successfully deleted URL', response);
    } catch (retrieveError) {
      // If we can't retrieve the deleted URL, still return success with basic info
      logger.warn(`Error retrieving deleted URL with ID ${urlId}: ${retrieveError}`);
      return sendResponse(res, 200, 'Successfully deleted URL', {
        id: urlInfo.id,
        short_code: urlInfo.short_code,
      });
    }
  } catch (error: unknown) {
    return handleError(error, res);
  }
};

export default deleteUrl;
