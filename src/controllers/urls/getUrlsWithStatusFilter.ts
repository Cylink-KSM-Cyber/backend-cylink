/**
 * Get URLs With Status Filter Controller
 *
 * Controller for retrieving URLs with status filtering and search capabilities for authenticated users.
 * Supports filtering by URL status (active, inactive, expired, etc.), searching, sorting, and pagination.
 *
 * @module controllers/urls/getUrlsWithStatusFilter
 */

import { Request, Response } from 'express';
import logger from '../../utils/logger';
import { sendResponse } from '../../utils/response';

const urlService = require('../../services/urlService');

/**
 * Validates user authentication
 *
 * @param {number|undefined} userId - User ID from authentication token
 * @returns {{isValid: boolean, errorCode?: number, errorMessage?: string}} Validation result
 */
const validateAuthentication = (
  userId: number | undefined,
): { isValid: boolean; errorCode?: number; errorMessage?: string } => {
  if (!userId) {
    return {
      isValid: false,
      errorCode: 401,
      errorMessage: 'Unauthorized: No user ID',
    };
  }

  return { isValid: true };
};

/**
 * Validates pagination parameters
 *
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {{isValid: boolean, errorCode?: number, errorMessage?: string}} Validation result
 */
const validatePagination = (
  page: number,
  limit: number,
): { isValid: boolean; errorCode?: number; errorMessage?: string } => {
  // Validate page
  if (page < 1) {
    return {
      isValid: false,
      errorCode: 400,
      errorMessage: 'Invalid page number, must be greater than 0',
    };
  }

  // Validate limit
  if (limit < 1 || limit > 100) {
    return {
      isValid: false,
      errorCode: 400,
      errorMessage: 'Invalid limit, must be between 1 and 100',
    };
  }

  return { isValid: true };
};

/**
 * Validates status parameter
 *
 * @param {string} status - Status filter value
 * @returns {{isValid: boolean, errorCode?: number, errorMessage?: string, validationErrors?: string[]}} Validation result
 */
const validateStatus = (
  status: string,
): { isValid: boolean; errorCode?: number; errorMessage?: string; validationErrors?: string[] } => {
  const validStatuses = ['all', 'active', 'inactive', 'expired', 'expiring-soon'];
  if (!validStatuses.includes(status)) {
    return {
      isValid: false,
      errorCode: 400,
      errorMessage: 'Invalid status parameter',
      validationErrors: [`Status must be one of: ${validStatuses.join(', ')}`],
    };
  }

  return { isValid: true };
};

/**
 * Validates search term
 *
 * @param {string} searchTerm - Search term
 * @returns {{isValid: boolean, errorCode?: number, errorMessage?: string}} Validation result
 */
const validateSearchTerm = (
  searchTerm: string,
): { isValid: boolean; errorCode?: number; errorMessage?: string } => {
  if (searchTerm && searchTerm.length < 2) {
    return {
      isValid: false,
      errorCode: 400,
      errorMessage: 'Search term must be at least 2 characters long',
    };
  }

  return { isValid: true };
};

/**
 * Extract query parameters
 *
 * @param {Request} req - Express request object
 * @returns {{page: number, limit: number, sortBy: string, sortOrder: string, status: string, searchTerm: string}} Parsed query parameters
 */
const extractQueryParams = (req: Request) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const sortBy = (req.query.sortBy as string) || 'created_at';
  const sortOrder = (req.query.sortOrder as string) || 'desc';
  const status = (req.query.status as string) || 'all';
  const searchTerm = (req.query.search as string) || '';

  return {
    page,
    limit,
    sortBy,
    sortOrder,
    status,
    searchTerm,
  };
};

/**
 * Process URLs with search term
 *
 * @param {number} userId - User ID
 * @param {string} status - Status filter
 * @param {string} searchTerm - Search term
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} sortOrder - Sort order
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with URLs
 */
const processUrlsWithSearch = async (
  userId: number,
  status: string,
  searchTerm: string,
  page: number,
  limit: number,
  sortBy: string,
  sortOrder: string,
  res: Response,
): Promise<Response> => {
  // Measure response time for performance monitoring
  const startTime = Date.now();

  try {
    // Call service function that handles both search and status filtering
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
};

/**
 * Process URLs with status filter
 *
 * @param {number} userId - User ID
 * @param {string} status - Status filter
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} sortOrder - Sort order
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with URLs
 */
const processUrlsWithStatusFilter = async (
  userId: number,
  status: string,
  page: number,
  limit: number,
  sortBy: string,
  sortOrder: string,
  res: Response,
): Promise<Response> => {
  // Measure response time for performance monitoring
  const startTime = Date.now();

  try {
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
    logger.error('Error getting URLs with status filter:', error);
    return sendResponse(res, 500, 'An error occurred while filtering URLs');
  }
};

/**
 * Handle errors that occur during URL filtering
 *
 * @param {unknown} error - The error that occurred
 * @param {Response} res - Express response object
 * @returns {Response} Error response
 */
const handleError = (error: unknown, res: Response): Response => {
  // Handle expected validation errors
  if (error instanceof Error && error.message.includes('Invalid status parameter')) {
    return sendResponse(res, 400, 'Invalid status parameter', null, null, null, [
      'Status must be one of: all, active, inactive, expired, expiring-soon',
    ]);
  }

  // Log and return unexpected errors
  logger.error('Error filtering URLs by status:', error);
  return sendResponse(res, 500, 'An error occurred while filtering URLs');
};

/**
 * Get URLs for an authenticated user with status filtering
 *
 * Retrieves URLs with filtering by status (active, inactive, expired, etc.),
 * search capabilities, pagination, and sorting. Requires user authentication.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with filtered URLs or error
 */
export const getUrlsWithStatusFilter = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Get user ID from authentication token
    const userId = req.body.id;

    // Guard clause: Validate user authentication
    const authValidation = validateAuthentication(userId);
    if (!authValidation.isValid) {
      return sendResponse(
        res,
        authValidation.errorCode || 401,
        authValidation.errorMessage || 'Unauthorized',
      );
    }

    // Extract query parameters
    const { page, limit, sortBy, sortOrder, status, searchTerm } = extractQueryParams(req);

    // Guard clause: Validate pagination
    const paginationValidation = validatePagination(page, limit);
    if (!paginationValidation.isValid) {
      return sendResponse(
        res,
        paginationValidation.errorCode || 400,
        paginationValidation.errorMessage || 'Invalid pagination parameters',
      );
    }

    // Guard clause: Validate status parameter
    const statusValidation = validateStatus(status);
    if (!statusValidation.isValid) {
      return sendResponse(
        res,
        statusValidation.errorCode || 400,
        statusValidation.errorMessage || 'Invalid status parameter',
        null,
        null,
        null,
        statusValidation.validationErrors,
      );
    }

    // If search term is provided, validate and use search functionality
    if (searchTerm && searchTerm.length > 0) {
      // Guard clause: Validate search term
      const searchValidation = validateSearchTerm(searchTerm);
      if (!searchValidation.isValid) {
        return sendResponse(
          res,
          searchValidation.errorCode || 400,
          searchValidation.errorMessage || 'Invalid search term',
        );
      }

      // Process URLs with search
      return await processUrlsWithSearch(
        userId,
        status,
        searchTerm,
        page,
        limit,
        sortBy,
        sortOrder,
        res,
      );
    }

    // Process URLs with status filter only (no search)
    return await processUrlsWithStatusFilter(userId, status, page, limit, sortBy, sortOrder, res);
  } catch (error) {
    // Handle any unexpected errors
    return handleError(error, res);
  }
};

export default getUrlsWithStatusFilter;
