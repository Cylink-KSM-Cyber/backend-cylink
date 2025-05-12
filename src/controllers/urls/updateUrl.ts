/**
 * Update URL Controller
 *
 * Controller for updating existing URLs owned by authenticated users.
 * Provides validation, authorization, and update functionality for URL properties.
 *
 * @module controllers/urls/updateUrl
 */

import { Request, Response } from 'express';
import { UpdateUrlRequest } from '../../interfaces/URL';
import logger from '../../utils/logger';
import { isValidUrl } from '../../utils/urlValidator';
import { sendResponse } from '../../utils/response';

const clickModel = require('../../models/clickModel');
const urlModel = require('../../models/urlModel');
const urlService = require('../../services/urlService');

/**
 * Validates user authentication and extracts user ID
 *
 * @param {Request} req - Express request object
 * @returns {{isValid: boolean, userId?: number, errorCode?: number, errorMessage?: string}} Validation result
 */
const validateAuthentication = (
  req: Request,
): { isValid: boolean; userId?: number; errorCode?: number; errorMessage?: string } => {
  const userId = req.body.id || (req as any).user?.id;

  if (!userId) {
    logger.warn('Update URL attempt without user ID');
    return {
      isValid: false,
      errorCode: 401,
      errorMessage: 'Unauthorized: No user ID',
    };
  }

  return { isValid: true, userId };
};

/**
 * Validates and parses URL ID from request parameters
 *
 * @param {string} idParam - URL ID from request parameters
 * @returns {{isValid: boolean, urlId?: number, errorCode?: number, errorMessage?: string}} Validation result
 */
const validateAndParseUrlId = (
  idParam: string,
): { isValid: boolean; urlId?: number; errorCode?: number; errorMessage?: string } => {
  const urlId = parseInt(idParam, 10);

  if (isNaN(urlId)) {
    logger.warn(`Invalid URL ID format: ${idParam}`);
    return {
      isValid: false,
      errorCode: 400,
      errorMessage: 'Invalid URL ID',
    };
  }

  return { isValid: true, urlId };
};

/**
 * Validates URL ownership
 *
 * @param {number} urlId - URL ID to check
 * @param {number} userId - User ID to verify ownership
 * @returns {Promise<{isValid: boolean, url?: any, errorCode?: number, errorMessage?: string}>} Validation result
 */
const validateUrlOwnership = async (
  urlId: number,
  userId: number,
): Promise<{ isValid: boolean; url?: any; errorCode?: number; errorMessage?: string }> => {
  // Get the existing URL
  const existingUrl = await urlModel.getUrlById(urlId);

  if (!existingUrl) {
    logger.warn(`URL not found - ID: ${urlId}`);
    return {
      isValid: false,
      errorCode: 404,
      errorMessage: 'URL not found',
    };
  }

  // Check if the URL belongs to the authenticated user
  if (existingUrl.user_id !== userId) {
    logger.warn(
      `Permission denied - User ID: ${userId}, URL ID: ${urlId}, Owner ID: ${existingUrl.user_id}`,
    );
    return {
      isValid: false,
      errorCode: 403,
      errorMessage: 'You do not have permission to update this URL',
    };
  }

  return { isValid: true, url: existingUrl };
};

/**
 * Extracts and cleans update data from request body
 *
 * @param {Request} req - Express request object
 * @returns {UpdateUrlRequest} Clean update data
 */
const extractUpdateData = (req: Request): UpdateUrlRequest => {
  const updateData: UpdateUrlRequest = {
    title: req.body.title,
    original_url: req.body.original_url,
    short_code: req.body.short_code,
    expiry_date: req.body.expiry_date,
    is_active: req.body.is_active !== undefined ? Boolean(req.body.is_active) : undefined,
  };

  // Only keep defined fields
  const cleanUpdateData = Object.entries(updateData)
    .filter(([_, value]) => value !== undefined)
    .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {}) as UpdateUrlRequest;

  return cleanUpdateData;
};

/**
 * Validates update data
 *
 * @param {UpdateUrlRequest} updateData - Data to validate
 * @returns {{isValid: boolean, errors?: string[]}} Validation result
 */
const validateUpdateData = (
  updateData: UpdateUrlRequest,
): { isValid: boolean; errors?: string[] } => {
  const validationErrors: string[] = [];

  // Validate original_url if provided
  if (updateData.original_url !== undefined) {
    if (!isValidUrl(updateData.original_url)) {
      validationErrors.push('Original URL must be a valid URL');
    }
  }

  // Validate short_code if provided
  if (updateData.short_code !== undefined) {
    if (updateData.short_code.length < 1) {
      validationErrors.push('Short code cannot be empty');
    }
    // Additional validations can be added here based on your requirements
    // For example, checking for special characters, length limits, etc.
  }

  // Validate expiry_date if provided
  if (updateData.expiry_date && updateData.expiry_date !== null) {
    const expiryDate = new Date(updateData.expiry_date);
    const now = new Date();

    if (isNaN(expiryDate.getTime())) {
      validationErrors.push('Expiry date must be a valid date');
    } else if (expiryDate <= now) {
      validationErrors.push('Expiry date must be in the future');
    }
  }

  return {
    isValid: validationErrors.length === 0,
    errors: validationErrors.length > 0 ? validationErrors : undefined,
  };
};

/**
 * Formats URL data for response
 *
 * @param {any} updatedUrl - Updated URL data from database
 * @param {number} clickCount - Click count for the URL
 * @returns {any} Formatted URL object
 */
const formatUrlResponse = (updatedUrl: any, clickCount: number): any => {
  const baseUrl = process.env.SHORT_URL_BASE ?? 'https://cylink.id/';
  const shortUrl = baseUrl + updatedUrl.short_code;

  return {
    id: updatedUrl.id,
    original_url: updatedUrl.original_url,
    short_code: updatedUrl.short_code,
    short_url: shortUrl,
    title: updatedUrl.title,
    clicks: clickCount,
    created_at: new Date(updatedUrl.created_at).toISOString(),
    updated_at: new Date(updatedUrl.updated_at).toISOString(),
    expiry_date: updatedUrl.expiry_date ? new Date(updatedUrl.expiry_date).toISOString() : null,
    is_active: updatedUrl.is_active,
  };
};

/**
 * Handles errors in update process
 *
 * @param {unknown} error - Error that occurred
 * @param {number} urlId - URL ID being updated
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Error response
 */
const handleUpdateError = (error: unknown, urlId: number, res: Response): Response => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error(`URL update error - URL ID: ${urlId}, Error: ${errorMessage}`);
  return sendResponse(res, 500, 'Error updating URL');
};

/**
 * Update an existing URL
 * Allows authenticated users to update properties of their own URLs
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with the updated URL or error
 */
export const updateUrl = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    // Guard clause: Validate authentication
    const authResult = validateAuthentication(req);
    if (!authResult.isValid) {
      return sendResponse(
        res,
        authResult.errorCode || 401,
        authResult.errorMessage || 'Unauthorized',
      );
    }
    const userId = authResult.userId as number;

    // Guard clause: Validate URL ID
    const idValidation = validateAndParseUrlId(id);
    if (!idValidation.isValid) {
      return sendResponse(
        res,
        idValidation.errorCode || 400,
        idValidation.errorMessage || 'Invalid URL ID',
      );
    }
    const urlId = idValidation.urlId as number;

    // Log the request with minimal details
    logger.info(`URL update request initiated - URL ID: ${urlId}, User ID: ${userId}`);

    // Guard clause: Validate URL ownership
    const ownershipResult = await validateUrlOwnership(urlId, userId);
    if (!ownershipResult.isValid) {
      return sendResponse(
        res,
        ownershipResult.errorCode || 403,
        ownershipResult.errorMessage || 'Permission denied',
      );
    }

    // Extract and clean update data
    const cleanUpdateData = extractUpdateData(req);

    // Guard clause: Validate update data
    const dataValidation = validateUpdateData(cleanUpdateData);
    if (!dataValidation.isValid && dataValidation.errors) {
      logger.warn(
        `URL update validation failed - URL ID: ${urlId}, Errors: ${dataValidation.errors.join(', ')}`,
      );
      return sendResponse(res, 400, 'Validation error', null, null, null, dataValidation.errors);
    }

    // Log fields being updated
    const fieldsToUpdate = Object.keys(cleanUpdateData).join(', ');
    logger.info(`URL update fields - URL ID: ${urlId}, Fields: ${fieldsToUpdate}`);

    // Update the URL
    try {
      const updatedUrl = await urlService.updateUrl(urlId, cleanUpdateData);

      // Guard clause: Check if update was successful
      if (!updatedUrl) {
        logger.error(`URL update failed - URL ID: ${urlId}`);
        return sendResponse(res, 500, 'Failed to update URL');
      }

      // Get the click count
      const clickCount = await clickModel.getClickCountByUrlId(urlId);

      // Format the response
      const formattedUrl = formatUrlResponse(updatedUrl, clickCount);

      // Log the successful update
      logger.info(`URL update successful - URL ID: ${urlId}, Short Code: ${updatedUrl.short_code}`);

      return sendResponse(res, 200, 'URL updated successfully', formattedUrl);
    } catch (updateError) {
      return handleUpdateError(updateError, urlId, res);
    }
  } catch (error) {
    logger.error('Unexpected error in updateUrl controller:', error);
    return sendResponse(res, 500, 'Internal server error');
  }
};

export default updateUrl;
