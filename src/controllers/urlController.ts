import { Request, Response } from 'express';
import { UpdateUrlRequest } from '../interfaces/URL';
import logger from '../utils/logger';
import { isValidUrl } from '../utils/urlValidator';
import {
  getAllUrls,
  createAnonymousUrl,
  createAuthenticatedUrl,
  getUrlDetails,
  deleteUrl,
  getUrlAnalytics,
  getTotalClicksAnalytics,
} from './urls';
const { sendResponse } = require('../utils/response');

const clickModel = require('../models/clickModel');
const urlModel = require('../models/urlModel');
const urlService = require('../services/urlService');

/**
 * URL Controller
 *
 * Handles URL-related operations including listing, creating, updating, and deleting shortened URLs
 * @module controllers/urlController
 */

// Export the refactored getAllUrls function
exports.getAllUrls = getAllUrls;

// Export the refactored createAnonymousUrl function
exports.createAnonymousUrl = createAnonymousUrl;

// Export the refactored createAuthenticatedUrl function
exports.createAuthenticatedUrl = createAuthenticatedUrl;

// Export the refactored getUrlDetails function
exports.getUrlDetails = getUrlDetails;

// Export the refactored deleteUrl function
exports.deleteUrl = deleteUrl;

// Export the refactored getUrlAnalytics function
exports.getUrlAnalytics = getUrlAnalytics;

// Export the refactored getTotalClicksAnalytics function
exports.getTotalClicksAnalytics = getTotalClicksAnalytics;

/**
 * Get URLs for an authenticated user with status filtering
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with filtered URLs or error
 */
exports.getUrlsWithStatusFilter = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Get user ID from authentication token
    const userId = req.body.id;

    if (!userId) {
      return sendResponse(res, 401, 'Unauthorized: No user ID');
    }

    // Parse query parameters for filtering, pagination, and sorting
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sortBy = (req.query.sortBy as string) || 'created_at';
    const sortOrder = (req.query.sortOrder as string) || 'desc';
    const status = (req.query.status as string) || 'all';
    const searchTerm = (req.query.search as string) || '';

    // Validate page and limit
    if (page < 1) {
      return sendResponse(res, 400, 'Invalid page number, must be greater than 0');
    }

    if (limit < 1 || limit > 100) {
      return sendResponse(res, 400, 'Invalid limit, must be between 1 and 100');
    }

    // Validate status parameter
    const validStatuses = ['all', 'active', 'inactive', 'expired', 'expiring-soon'];
    if (!validStatuses.includes(status)) {
      return sendResponse(res, 400, 'Invalid status parameter', null, null, null, [
        `Status must be one of: ${validStatuses.join(', ')}`,
      ]);
    }

    // If search term is provided and valid, use both search and status filtering
    if (searchTerm && searchTerm.length > 0) {
      // Minimum search term length validation
      if (searchTerm.length < 2) {
        return sendResponse(res, 400, 'Search term must be at least 2 characters long');
      }

      // Measure response time for performance monitoring
      const startTime = Date.now();

      try {
        // Call updated service function that handles both search and status filtering
        const { urls, pagination, filter_info, search_info } =
          await urlService.getUrlsWithStatusAndSearch(userId, {
            status,
            search: searchTerm,
            page,
            limit,
            sortBy,
            sortOrder,
          });

        // Calculate response time
        const responseTime = Date.now() - startTime;

        // Log the completion
        logger.info(
          `URLs filtered by status '${status}' and search term '${searchTerm}' for user ${userId} in ${responseTime}ms with ${urls.length} results (sorting by ${sortBy} ${sortOrder})`,
        );

        // If no URLs found, return 200 status with empty array and appropriate message
        if (!urls || urls.length === 0) {
          return sendResponse(
            res,
            200,
            `No URLs match the specified filter and search term "${searchTerm}"`,
            [],
            pagination,
            search_info,
            null,
            filter_info,
          );
        }

        // Return the response with filtered and searched URLs
        return sendResponse(
          res,
          200,
          'URLs filtered and searched successfully',
          urls,
          pagination,
          search_info,
          null,
          filter_info,
        );
      } catch (searchError) {
        logger.error('Search error:', searchError);

        // Check if this is a database-related error
        if (searchError instanceof Error) {
          // Log the specific error for debugging purposes
          logger.error(`Database search error: ${searchError.message}`);

          // For expected database issues, provide a cleaner message
          if (searchError.message.includes('relation') || searchError.message.includes('column')) {
            return sendResponse(res, 500, 'Database configuration error. Please contact support.');
          }
        }

        // For other unexpected errors during search
        return sendResponse(res, 500, 'An error occurred while searching URLs. Please try again.');
      }
    }

    // If no search term, just use status filtering
    // Measure response time for performance monitoring
    const startTime = Date.now();

    // Get URLs with status filtering
    const { urls, pagination, filter_info } = await urlService.getUrlsWithStatusFilter(userId, {
      status,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Log the filtering completion
    logger.info(
      `URLs filtered by status '${status}' for user ${userId} in ${responseTime}ms with ${urls.length} results (sorting by ${sortBy} ${sortOrder})`,
    );

    // If no URLs found, return 200 status with empty array and appropriate message
    if (!urls || urls.length === 0) {
      return sendResponse(
        res,
        200,
        'No URLs match the specified filter',
        [],
        pagination,
        null,
        null,
        filter_info,
      );
    }

    // Return the response with filtered URLs
    return sendResponse(
      res,
      200,
      'URLs filtered successfully',
      urls,
      pagination,
      null,
      null,
      filter_info,
    );
  } catch (error) {
    // Handle expected validation errors
    if (error instanceof Error && error.message.includes('Invalid status parameter')) {
      return sendResponse(res, 400, 'Invalid status parameter', null, null, null, [
        'Status must be one of: all, active, inactive, expired, expiring-soon',
      ]);
    }

    // Log and return unexpected errors
    logger.error('Error filtering URLs by status:', error);
    return sendResponse(res, 500, 'An error occurred while filtering URLs');
  }
};

/**
 * Update an existing URL
 * Allows authenticated users to update properties of their own URLs
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with the updated URL or error
 */
exports.updateUrl = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    // Get the user ID from authentication middleware
    const userId = req.body.id || (req as any).user?.id;

    if (!userId) {
      logger.warn('Update URL attempt without user ID');
      return sendResponse(res, 401, 'Unauthorized: No user ID');
    }

    // Convert ID to number
    const urlId = parseInt(id as string, 10);

    if (isNaN(urlId)) {
      logger.warn(`Invalid URL ID format: ${id}`);
      return sendResponse(res, 400, 'Invalid URL ID');
    }

    // Log the request with minimal details
    logger.info(`URL update request initiated - URL ID: ${urlId}, User ID: ${userId}`);

    // Get the existing URL
    const existingUrl = await urlModel.getUrlById(urlId);

    if (!existingUrl) {
      logger.warn(`URL not found - ID: ${urlId}`);
      return sendResponse(res, 404, 'URL not found');
    }

    // Check if the URL belongs to the authenticated user
    if (existingUrl.user_id !== userId) {
      logger.warn(
        `Permission denied - User ID: ${userId}, URL ID: ${urlId}, Owner ID: ${existingUrl.user_id}`,
      );
      return sendResponse(res, 403, 'You do not have permission to update this URL');
    }

    // Create a clean update object from the request body
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
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

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

    // If there are validation errors, return them
    if (validationErrors.length > 0) {
      logger.warn(
        `URL update validation failed - URL ID: ${urlId}, Errors: ${validationErrors.join(', ')}`,
      );
      return sendResponse(res, 400, 'Validation error', null, null, null, validationErrors);
    }

    // Log fields being updated
    const fieldsToUpdate = Object.keys(cleanUpdateData).join(', ');
    logger.info(`URL update fields - URL ID: ${urlId}, Fields: ${fieldsToUpdate}`);

    // Update the URL using the service to ensure proper handling
    try {
      const updatedUrl = await urlService.updateUrl(urlId, cleanUpdateData);

      if (!updatedUrl) {
        logger.error(`URL update failed - URL ID: ${urlId}`);
        return sendResponse(res, 500, 'Failed to update URL');
      }

      // Get the click count
      const clickCount = await clickModel.getClickCountByUrlId(urlId);

      // Format the response
      const baseUrl = process.env.SHORT_URL_BASE ?? 'https://cylink.id/';
      const shortUrl = baseUrl + updatedUrl.short_code;

      const formattedUrl = {
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

      // Log the successful update
      logger.info(`URL update successful - URL ID: ${urlId}, Short Code: ${updatedUrl.short_code}`);

      return sendResponse(res, 200, 'URL updated successfully', formattedUrl);
    } catch (updateError) {
      const errorMessage = updateError instanceof Error ? updateError.message : String(updateError);
      logger.error(`URL update error - URL ID: ${urlId}, Error: ${errorMessage}`);
      return sendResponse(res, 500, 'Error updating URL');
    }
  } catch (error) {
    logger.error('Unexpected error in updateUrl controller:', error);
    return sendResponse(res, 500, 'Internal server error');
  }
};
