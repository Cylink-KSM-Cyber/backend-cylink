/**
 * Get All URLs Controller
 *
 * Controller for retrieving URLs for an authenticated user with search, sorting, and pagination.
 *
 * @module controllers/urls/getAllUrls
 */

import { Request, Response } from 'express';
import {
  UrlWithSearchHighlights,
  SearchInfo,
  UrlEntity,
  UrlWithClicks,
  PaginationData,
} from '../../interfaces/URL';
import logger from '../../utils/logger';
import { sendResponse } from '../../utils/response';

const clickModel = require('../../models/clickModel');
const urlModel = require('../../models/urlModel');

/**
 * Interface for query parameters used in the getAllUrls controller
 */
interface GetAllUrlsQueryParams {
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: string;
  search?: string;
}

/**
 * Interface for pagination used by the response utility
 */
interface Pagination {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Validates and parses pagination parameters
 *
 * @param {GetAllUrlsQueryParams} query - Request query parameters
 * @returns {{ page: number, limit: number, isValid: boolean, errorMessage?: string }} Validated and parsed pagination parameters
 */
const validatePaginationParams = (query: GetAllUrlsQueryParams) => {
  const page = parseInt(query.page || '1');
  const limit = parseInt(query.limit || '10');

  if (page < 1) {
    return {
      page,
      limit,
      isValid: false,
      errorMessage: 'Invalid page number, must be greater than 0',
    };
  }

  if (limit < 1 || limit > 100) {
    return {
      page,
      limit,
      isValid: false,
      errorMessage: 'Invalid limit, must be between 1 and 100',
    };
  }

  return { page, limit, isValid: true };
};

/**
 * Validates search term
 *
 * @param {string} searchTerm - The search term to validate
 * @returns {{ isValid: boolean, errorMessage?: string }} Validation result
 */
const validateSearchTerm = (searchTerm: string) => {
  if (searchTerm && searchTerm.length < 2) {
    return { isValid: false, errorMessage: 'Search term must be at least 2 characters long' };
  }

  return { isValid: true };
};

/**
 * Formats a URL entity with click count and additional information
 *
 * @param {UrlEntity} url - The URL entity to format
 * @param {number} clickCount - Number of clicks for the URL
 * @param {Record<string, any>} [highlights] - Optional search highlights
 * @returns {Promise<UrlWithSearchHighlights>} Formatted URL with click information
 */
const formatUrlWithClicks = (
  url: UrlEntity,
  clickCount: number,
  highlights?: Record<string, any>,
): UrlWithSearchHighlights => {
  // Format expiry_date if it exists
  const expiryDate = url.expiry_date ? new Date(url.expiry_date).toISOString() : null;

  // Generate the full short URL
  const baseUrl = process.env.SHORT_URL_BASE ?? 'https://cylink.id/';
  const shortUrl = baseUrl + url.short_code;

  return {
    id: url.id,
    original_url: url.original_url,
    short_code: url.short_code,
    short_url: shortUrl,
    title: url.title ?? null,
    clicks: clickCount,
    created_at: new Date(url.created_at).toISOString(),
    expiry_date: expiryDate,
    is_active: url.is_active,
    matches: highlights ? highlights[url.id] || null : null,
  };
};

/**
 * Converts PaginationData to the Pagination format expected by sendResponse
 *
 * @param {PaginationData} paginationData - The PaginationData object
 * @returns {Pagination} Converted Pagination object
 */
const convertToPaginationFormat = (paginationData: PaginationData): Pagination => {
  return {
    currentPage: paginationData.page,
    totalPages: paginationData.total_pages,
    pageSize: paginationData.limit,
    totalItems: paginationData.total,
    hasNextPage: paginationData.page < paginationData.total_pages,
    hasPrevPage: paginationData.page > 1,
  };
};

/**
 * Searches URLs based on search term
 *
 * @param {number} userId - The user ID
 * @param {string} searchTerm - Term to search for
 * @param {number} page - Page number for pagination
 * @param {number} limit - Number of items per page
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - Sort order (asc/desc)
 * @returns {Promise<{ urlsWithDetails: UrlWithSearchHighlights[], pagination: Pagination, searchInfo: SearchInfo }>}
 *          Search results with pagination and search info
 */
const searchUrls = async (
  userId: number,
  searchTerm: string,
  page: number,
  limit: number,
  sortBy: string,
  sortOrder: string,
) => {
  // Measure response time for performance monitoring
  const startTime = Date.now();

  // Search URLs
  const { results, total, highlights } = await urlModel.searchUrls(
    userId,
    searchTerm,
    page,
    limit,
    sortBy,
    sortOrder,
  );

  // Calculate response time
  const responseTime = Date.now() - startTime;

  // Log the search completion
  logger.info(
    `Search for "${searchTerm}" completed for user ${userId} in ${responseTime}ms with ${total} results`,
  );

  // If no URLs found, return empty results with pagination and search info
  if (!results || results.length === 0) {
    // Construct search info metadata
    const searchInfo: SearchInfo = {
      term: searchTerm,
      fields_searched: ['original_url', 'short_code', 'title'],
      total_matches: 0,
    };

    // Construct pagination object
    const paginationData: PaginationData = {
      total: 0,
      page,
      limit,
      total_pages: 0,
    };

    const pagination = convertToPaginationFormat(paginationData);

    return { urlsWithDetails: [], pagination, searchInfo };
  }

  // For each URL, get the click count and format the response
  const urlsWithDetails = await Promise.all(
    results.map(async (url: UrlEntity) => {
      const clickCount = await clickModel.getClickCountByUrlId(url.id);
      return formatUrlWithClicks(url, clickCount, highlights);
    }),
  );

  // Calculate pagination data
  const totalPages = Math.ceil(total / limit);

  // Construct pagination object
  const paginationData: PaginationData = {
    total,
    page,
    limit,
    total_pages: totalPages,
  };

  const pagination = convertToPaginationFormat(paginationData);

  // Construct search info metadata
  const searchInfo: SearchInfo = {
    term: searchTerm,
    fields_searched: ['original_url', 'short_code', 'title'],
    total_matches: total,
  };

  logger.info(
    `Search for "${searchTerm}" returned ${urlsWithDetails.length} URLs for user ${userId} in ${responseTime}ms`,
  );

  return { urlsWithDetails, pagination, searchInfo };
};

/**
 * Gets and sorts all URLs for a user
 *
 * @param {number} userId - The user ID
 * @param {number} page - Page number for pagination
 * @param {number} limit - Number of items per page
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - Sort order (asc/desc)
 * @returns {Promise<{ paginatedUrls: UrlWithClicks[], pagination: Pagination | null }>}
 *          URLs with pagination info
 */
const getAllAndSortUrls = async (
  userId: number,
  page: number,
  limit: number,
  sortBy: string,
  sortOrder: string,
) => {
  // IMPORTANT: Don't apply offset/limit here - get ALL urls first to ensure accurate sorting
  const urls = await urlModel.getUrlsByUser(userId);

  // If no URLs found, return empty results
  if (!urls || urls.length === 0) {
    return { paginatedUrls: [], pagination: null };
  }

  logger.info(
    `Retrieved ${urls.length} total URLs for user ${userId} before processing clicks and sorting`,
  );

  // For each URL, get the click count
  const urlsWithClicks = await Promise.all(
    urls.map(async (url: UrlEntity) => {
      const clickCount = await clickModel.getClickCountByUrlId(url.id);
      return formatUrlWithClicks(url, clickCount);
    }),
  );

  // Apply sorting based on sortBy and sortOrder parameters
  const sortedUrls = [...urlsWithClicks].sort((a: UrlWithClicks, b: UrlWithClicks) => {
    let comparison = 0;

    // Handle different sortBy fields
    if (sortBy === 'clicks') {
      comparison = a.clicks - b.clicks;
    } else if (sortBy === 'created_at') {
      comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else if (sortBy === 'title') {
      comparison = (a.title ?? '').localeCompare(b.title ?? '');
    } else if (sortBy === 'expiry_date') {
      // Handle NULL expiry_date values in sorting logic
      if (!a.expiry_date && !b.expiry_date) {
        comparison = 0; // Both are null, they're equal
      } else if (!a.expiry_date) {
        comparison = sortOrder === 'asc' ? 1 : -1; // Null values appear last in ascending, first in descending
      } else if (!b.expiry_date) {
        comparison = sortOrder === 'asc' ? -1 : 1; // Null values appear last in ascending, first in descending
      } else {
        comparison = new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
      }
    } else {
      // Default to sorting by created_at
      comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }

    // Apply sort direction
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Log top URLs after sorting for debugging purposes
  if (sortBy === 'clicks' && sortOrder === 'desc') {
    const topUrls = sortedUrls.slice(0, 5).map(url => ({
      id: url.id,
      short_code: url.short_code,
      clicks: url.clicks,
    }));
    logger.info(`Top 5 URLs by clicks: ${JSON.stringify(topUrls)}`);
  }

  // Only apply pagination AFTER sorting the complete list
  const offset = (page - 1) * limit;
  const paginatedUrls = sortedUrls.slice(offset, offset + limit);

  // Calculate pagination data based on total sorted results
  const totalUrls = sortedUrls.length;
  const totalPages = Math.ceil(totalUrls / limit);

  // Construct pagination object using PaginationData format
  const paginationData: PaginationData = {
    total: totalUrls,
    page,
    limit,
    total_pages: totalPages,
  };

  // Convert to Pagination format expected by sendResponse
  const pagination = convertToPaginationFormat(paginationData);

  logger.info(`Successfully retrieved ${paginatedUrls.length} URLs for user ${userId}`);

  return { paginatedUrls, pagination };
};

/**
 * Get all URLs for an authenticated user with optional search, sorting, and pagination
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with user's URLs or error
 */
export const getAllUrls = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Remove userId extraction
    // Parse query parameters for pagination, sorting, and search
    const {
      page,
      limit,
      sortBy = 'created_at',
      sortOrder = 'desc',
      search = '',
    } = req.query as GetAllUrlsQueryParams;

    // Validate pagination parameters
    const paginationValidation = validatePaginationParams({ page, limit });
    if (!paginationValidation.isValid) {
      return sendResponse(res, 400, paginationValidation.errorMessage as string);
    }

    const validatedPage = paginationValidation.page;
    const validatedLimit = paginationValidation.limit;

    // If search term is provided, use the search functionality
    if (search && search.length > 0) {
      // Validate search term
      const searchValidation = validateSearchTerm(search);
      if (!searchValidation.isValid) {
        return sendResponse(res, 400, searchValidation.errorMessage as string);
      }

      try {
        const { urlsWithDetails, pagination, searchInfo } = await searchUrls(
          req.body.id, // Keep userId for search functionality
          search,
          validatedPage,
          validatedLimit,
          sortBy || 'created_at',
          sortOrder || 'desc',
        );

        // If no URLs found, return 200 status with empty array and appropriate message
        if (!urlsWithDetails || urlsWithDetails.length === 0) {
          return sendResponse(
            res,
            200,
            `No URLs found matching "${search}"`,
            [],
            pagination,
            searchInfo,
          );
        }

        // Return the response with search results
        return sendResponse(
          res,
          200,
          'URLs retrieved successfully',
          urlsWithDetails,
          pagination,
          searchInfo,
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

    // If no search term, use the regular getAllUrls functionality
    const { paginatedUrls, pagination } = await getAllAndSortUrls(
      req.body.id, // Keep userId for getAllAndSortUrls
      validatedPage,
      validatedLimit,
      sortBy || 'created_at',
      sortOrder || 'desc',
    );

    // If no URLs found, return 204 status
    if (!paginatedUrls || paginatedUrls.length === 0) {
      return sendResponse(res, 204, 'No URLs are available', []);
    }

    // Return the response in the requested format
    return sendResponse(res, 200, 'Successfully retrieved all URLs', paginatedUrls, pagination);
  } catch (error: unknown) {
    // Handle specific error types
    if (error instanceof TypeError) {
      logger.error('URL error: Type error while retrieving URLs:', error.message);
      return sendResponse(res, 400, 'Invalid data format');
    } else if (error instanceof Error) {
      logger.error('URL error: Failed to retrieve URLs:', error.message);
      return sendResponse(res, 500, 'Failed to retrieve URLs', []);
    } else {
      logger.error('URL error: Unknown error while retrieving URLs:', String(error));
      return sendResponse(res, 500, 'Internal server error');
    }
  }
};

export default getAllUrls;
