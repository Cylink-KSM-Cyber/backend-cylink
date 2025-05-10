import { Request, Response } from 'express';
import { UrlWithSearchHighlights, SearchInfo, UpdateUrlRequest } from '../interfaces/URL';
import logger from '../utils/logger';
import { isValidUrl } from '../utils/urlValidator';
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

/**
 * URL Database Entity interface
 */
interface UrlEntity {
  id: number;
  user_id: number | null;
  original_url: string;
  short_code: string;
  title: string | null;
  expiry_date: Date | null;
  is_active: boolean;
  has_password: boolean;
  password_hash: string | null;
  redirect_type: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

/**
 * URL with click statistics interface
 */
interface UrlWithClicks {
  id: number;
  original_url: string;
  short_code: string;
  short_url: string;
  title: string | null;
  clicks: number;
  created_at: string;
  expiry_date: string | null;
  is_active: boolean;
}

/**
 * Pagination interface
 */
interface PaginationData {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/**
 * Get all URLs for an authenticated user
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with user's URLs or error
 */
exports.getAllUrls = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Get user ID from authentication token
    const userId = req.body.id;

    if (!userId) {
      return sendResponse(res, 401, 'Unauthorized: No user ID');
    }

    // Parse query parameters for pagination, sorting, and search
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sortBy = (req.query.sortBy as string) || 'created_at';
    const sortOrder = (req.query.sortOrder as string) || 'desc';
    const searchTerm = (req.query.search as string) || '';

    // Validate page and limit
    if (page < 1) {
      return sendResponse(res, 400, 'Invalid page number, must be greater than 0');
    }

    if (limit < 1 || limit > 100) {
      return sendResponse(res, 400, 'Invalid limit, must be between 1 and 100');
    }

    // If search term is provided, use the search functionality
    if (searchTerm && searchTerm.length > 0) {
      // Minimum search term length validation
      if (searchTerm.length < 2) {
        return sendResponse(res, 400, 'Search term must be at least 2 characters long');
      }

      try {
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

        // If no URLs found, return 200 status with empty array and appropriate message
        if (!results || results.length === 0) {
          // Construct search info metadata
          const searchInfo: SearchInfo = {
            term: searchTerm,
            fields_searched: ['original_url', 'short_code', 'title'],
            total_matches: 0,
          };

          // Construct pagination object
          const pagination: PaginationData = {
            total: 0,
            page,
            limit,
            total_pages: 0,
          };

          return sendResponse(
            res,
            200,
            `No URLs found matching "${searchTerm}"`,
            [],
            pagination,
            searchInfo,
          );
        }

        // For each URL, get the click count and format the response
        const urlsWithDetails = await Promise.all(
          results.map(async (url: UrlEntity) => {
            const clickCount = await clickModel.getClickCountByUrlId(url.id);

            // Format expiry_date if it exists
            const expiryDate = url.expiry_date ? new Date(url.expiry_date).toISOString() : null;

            // Generate the full short URL
            const baseUrl = process.env.SHORT_URL_BASE ?? 'https://cylink.id/';
            const shortUrl = baseUrl + url.short_code;

            // Create URL with clicks data
            const urlWithClicks: UrlWithSearchHighlights = {
              id: url.id,
              original_url: url.original_url,
              short_code: url.short_code,
              short_url: shortUrl,
              title: url.title ?? null,
              clicks: clickCount,
              created_at: new Date(url.created_at).toISOString(),
              expiry_date: expiryDate,
              is_active: url.is_active,
              matches: highlights[url.id] || null,
            };

            return urlWithClicks;
          }),
        );

        // Calculate pagination data
        const totalPages = Math.ceil(total / limit);

        // Construct pagination object
        const pagination: PaginationData = {
          total,
          page,
          limit,
          total_pages: totalPages,
        };

        // Construct search info metadata
        const searchInfo: SearchInfo = {
          term: searchTerm,
          fields_searched: ['original_url', 'short_code', 'title'],
          total_matches: total,
        };

        logger.info(
          `Search for "${searchTerm}" returned ${urlsWithDetails.length} URLs for user ${userId} in ${responseTime}ms`,
        );

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
    // IMPORTANT: Don't apply offset/limit here - get ALL urls first to ensure accurate sorting
    const urls = await urlModel.getUrlsByUser(userId);

    // If no URLs found, return 204 status
    if (!urls || urls.length === 0) {
      return sendResponse(res, 204, 'No URLs are available', []);
    }

    logger.info(
      `Retrieved ${urls.length} total URLs for user ${userId} before processing clicks and sorting`,
    );

    // For each URL, get the click count
    const urlsWithClicks = await Promise.all(
      urls.map(async (url: UrlEntity) => {
        const clickCount = await clickModel.getClickCountByUrlId(url.id);

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
        };
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

    // Construct pagination object
    const pagination: PaginationData = {
      total: totalUrls,
      page,
      limit,
      total_pages: totalPages,
    };

    logger.info(`Successfully retrieved ${paginatedUrls.length} URLs for user ${userId}`);

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

/**
 * Create a shortened URL for anonymous users
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with created URL or error
 */
exports.createAnonymousUrl = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { original_url, custom_code, title, expiry_date, goal_id } = req.body;

    // Validate the URL
    if (!isValidUrl(original_url)) {
      return sendResponse(res, 400, 'Invalid URL provided');
    }

    // Create options object for URL creation
    const urlOptions = {
      originalUrl: original_url,
      customShortCode: custom_code,
      title,
      expiryDate: expiry_date ? new Date(expiry_date) : undefined,
      goalId: goal_id ? parseInt(goal_id) : undefined,
    };

    try {
      // Create the shortened URL
      const newUrl = await urlService.createShortenedUrl(urlOptions);

      // Generate the full short URL
      const baseUrl = process.env.SHORT_URL_BASE ?? 'https://cylink.id/';
      const shortUrl = baseUrl + newUrl.short_code;

      // Format the response
      const response = {
        id: newUrl.id,
        original_url: newUrl.original_url,
        short_code: newUrl.short_code,
        short_url: shortUrl,
        title: newUrl.title ?? null,
        created_at: new Date(newUrl.created_at).toISOString(),
        expiry_date: newUrl.expiry_date ? new Date(newUrl.expiry_date).toISOString() : null,
        is_active: newUrl.is_active,
        goal_id: goal_id ? parseInt(goal_id) : null,
      };

      logger.info(`Successfully created anonymous shortened URL: ${shortUrl}`);

      return sendResponse(res, 201, 'Successfully created shortened URL', response);
    } catch (error) {
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
    }
  } catch (error: unknown) {
    // Handle specific error types
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

/**
 * Create a shortened URL for authenticated users
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with created URL or error
 */
exports.createAuthenticatedUrl = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Get user ID from authentication token
    const userId = req.body.id;

    // Extract request data
    const { original_url, custom_code, title, expiry_date, goal_id } = req.body;

    // Validate the URL
    if (!isValidUrl(original_url)) {
      return sendResponse(res, 400, 'Invalid URL provided');
    }

    // Create options object for URL creation
    const urlOptions = {
      userId,
      originalUrl: original_url,
      customShortCode: custom_code,
      title,
      expiryDate: expiry_date ? new Date(expiry_date) : undefined,
      goalId: goal_id ? parseInt(goal_id) : undefined,
    };

    try {
      // Create the shortened URL
      const newUrl = await urlService.createShortenedUrl(urlOptions);

      // Generate the full short URL
      const baseUrl = process.env.SHORT_URL_BASE ?? 'https://cylink.id/';
      const shortUrl = baseUrl + newUrl.short_code;

      // Format the response
      const response = {
        id: newUrl.id,
        original_url: newUrl.original_url,
        short_code: newUrl.short_code,
        short_url: shortUrl,
        title: newUrl.title ?? null,
        created_at: new Date(newUrl.created_at).toISOString(),
        expiry_date: newUrl.expiry_date ? new Date(newUrl.expiry_date).toISOString() : null,
        is_active: newUrl.is_active,
        goal_id: goal_id ? parseInt(goal_id) : null,
      };

      logger.info(
        `Successfully created authenticated shortened URL: ${shortUrl} for user ${userId}`,
      );

      return sendResponse(res, 201, 'Successfully created shortened URL', response);
    } catch (error: unknown) {
      // Handle custom code already taken error
      if (error instanceof Error && error.message === 'This custom short code is already taken') {
        return sendResponse(res, 409, 'Custom code already in use');
      } else if (error instanceof TypeError) {
        logger.error('URL error: Type error while creating authenticated URL:', error.message);
        return sendResponse(res, 400, 'Invalid data format');
      } else if (error instanceof Error) {
        logger.error('URL error: Failed to create authenticated URL:', error.message);
        return sendResponse(res, 500, 'Internal Server Error');
      } else {
        logger.error('URL error: Unknown error while creating authenticated URL:', String(error));
        return sendResponse(res, 500, 'Internal server error');
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('URL error: Failed to create shortened URL:', errorMessage);
    return sendResponse(res, 500, 'Internal Server Error');
  }
};

/**
 * Recent click information interface
 */
interface RecentClick {
  clicked_at: Date;
  device_type: string;
}

/**
 * Get URL details by ID or short code
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with URL details or error
 */
exports.getUrlDetails = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Get user ID from authentication token
    const userId = req.body.id;

    // Get identifier (could be an ID or a short code)
    const { identifier } = req.params;

    // Determine if it's an ID (number) or a short code (string)
    const isId = !isNaN(Number(identifier));

    // Get the URL details
    let url;
    if (isId) {
      url = await urlModel.getUrlById(Number(identifier));
    } else {
      url = await urlModel.getUrlByShortCode(identifier);
    }

    // Check if URL exists
    if (!url) {
      return sendResponse(res, 404, 'URL not found');
    }

    // Check if the URL belongs to the authenticated user
    if (url.user_id && url.user_id !== userId) {
      return sendResponse(res, 401, 'Unauthorized');
    }

    // Get click count
    const clickCount = await clickModel.getClickCountByUrlId(url.id);

    // Get analytics
    const analytics = await urlService.getUrlAnalytics(url.id);

    // Get recent clicks (last 10)
    const recentClicks = await clickModel.getRecentClicksByUrlId(url.id, 10);

    // Format recent clicks
    const formattedRecentClicks = recentClicks.map((click: RecentClick) => ({
      timestamp: new Date(click.clicked_at).toISOString(),
      device_type: click.device_type ?? 'unknown',
    }));

    // Generate the full short URL
    const baseUrl = process.env.SHORT_URL_BASE ?? 'https://cylink.id/';
    const shortUrl = baseUrl + url.short_code;

    // Format dates
    const createdAt = new Date(url.created_at).toISOString();
    const updatedAt = url.updated_at ? new Date(url.updated_at).toISOString() : createdAt;
    const expiryDate = url.expiry_date ? new Date(url.expiry_date).toISOString() : null;

    // Construct response
    const response = {
      id: url.id,
      original_url: url.original_url,
      short_code: url.short_code,
      short_url: shortUrl,
      title: url.title ?? null,
      clicks: clickCount,
      created_at: createdAt,
      updated_at: updatedAt,
      expiry_date: expiryDate,
      is_active: url.is_active,
      analytics: {
        browser_stats: analytics.browserStats,
        device_stats: analytics.deviceStats,
        recent_clicks: formattedRecentClicks,
      },
    };

    logger.info(
      `Successfully retrieved URL details for ${isId ? 'ID' : 'short code'} ${identifier}`,
    );

    return sendResponse(res, 200, 'Successfully retrieved URL', response);
  } catch (error: unknown) {
    if (error instanceof TypeError) {
      logger.error('URL error: Type error while retrieving URL details:', error.message);
      return sendResponse(res, 400, 'Invalid request format');
    } else if (error instanceof Error) {
      logger.error('URL error: Failed to retrieve URL details:', error.message);
      return sendResponse(res, 500, 'Internal Server Error');
    } else {
      logger.error('URL error: Unknown error while retrieving URL details:', String(error));
      return sendResponse(res, 500, 'Internal server error');
    }
  }
};

/**
 * Delete a URL by ID (soft delete)
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with deletion result or error
 */
exports.deleteUrl = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Get user ID from authentication token
    const userId = req.body.id;

    // Get URL ID from request parameters
    const urlId = parseInt(req.params.id);

    if (isNaN(urlId)) {
      return sendResponse(res, 400, 'Invalid URL ID');
    }

    // Check if URL exists
    const url = await urlModel.getUrlById(urlId);

    if (!url) {
      return sendResponse(res, 404, 'URL not found');
    }

    // Check if the URL belongs to the authenticated user
    if (url.user_id && url.user_id !== userId) {
      return sendResponse(res, 401, 'Unauthorized');
    }

    // Store some information about the URL before deletion
    const urlInfo = {
      id: url.id,
      short_code: url.short_code,
    };

    // Perform soft delete
    const isDeleted = await urlModel.deleteUrl(urlId);

    if (!isDeleted) {
      return sendResponse(res, 500, 'Failed to delete URL');
    }

    try {
      // Get the updated URL to return the deleted_at timestamp (including soft deleted URLs)
      const deletedUrl = await urlModel.getUrlById(urlId, true);

      if (deletedUrl) {
        // Format response
        const response = {
          id: deletedUrl.id,
          short_code: deletedUrl.short_code,
          deleted_at: new Date(deletedUrl.deleted_at).toISOString(),
        };

        logger.info(`Successfully deleted URL with ID ${urlId}`);

        return sendResponse(res, 200, 'Successfully deleted URL', response);
      } else {
        // This shouldn't happen, but handle it just in case
        logger.warn(`URL with ID ${urlId} was deleted but couldn't be retrieved afterwards`);
        return sendResponse(res, 200, 'Successfully deleted URL', {
          id: urlInfo.id,
          short_code: urlInfo.short_code,
          deleted_at: new Date().toISOString(),
        });
      }
    } catch (retrieveError) {
      // If we can't retrieve the deleted URL, still return success
      logger.warn(`Error retrieving deleted URL with ID ${urlId}: ${retrieveError}`);
      return sendResponse(res, 200, 'Successfully deleted URL', {
        id: urlInfo.id,
        short_code: urlInfo.short_code,
      });
    }
  } catch (error: unknown) {
    if (error instanceof TypeError) {
      logger.error(
        `URL error: Type error while deleting URL: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
      );
      return sendResponse(res, 400, 'Invalid request format');
    } else if (error instanceof Error) {
      logger.error(`URL error: Failed to delete URL: ${error.message}`);
      return sendResponse(res, 500, 'Internal Server Error');
    } else {
      logger.error(`URL error: Unknown error while deleting URL: ${JSON.stringify(error)}`);
      return sendResponse(res, 500, 'Internal server error');
    }
  }
};

/**
 * Analytics filter options interface
 */
interface AnalyticsOptions {
  startDate?: string;
  endDate?: string;
  groupBy?: unknown;
}

/**
 * Get analytics for a specific URL
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with URL analytics or error
 */
exports.getUrlAnalytics = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Get user ID from authentication token
    const userId = req.body.id;

    // Get URL ID from request parameters
    const urlId = parseInt(req.params.id);

    if (isNaN(urlId)) {
      return sendResponse(res, 400, 'Invalid URL ID');
    }

    // Check if URL exists
    const url = await urlModel.getUrlById(urlId);

    if (!url) {
      return sendResponse(res, 404, 'URL not found');
    }

    // Check if the URL belongs to the authenticated user
    if (url.user_id && url.user_id !== userId) {
      return sendResponse(res, 401, 'Unauthorized');
    }

    // Extract query parameters for analytics
    const { start_date, end_date, group_by } = req.query;

    // Prepare options for the analytics service
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

    // Get analytics data with filters
    const analytics = await urlService.getUrlAnalyticsWithFilters(urlId, options);

    logger.info(`Successfully retrieved analytics for URL ID ${urlId}`);

    return sendResponse(res, 200, 'Successfully retrieved URL analytics', analytics);
  } catch (error: unknown) {
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
  }
};

/**
 * Response for total clicks analytics
 */
interface TotalClicksAnalyticsResponse {
  summary: {
    total_clicks: number;
    total_urls: number;
    avg_clicks_per_url: number;
    analysis_period: {
      start_date: string;
      end_date: string;
      days: number;
    };
    comparison: {
      period_days: number;
      previous_period: {
        start_date: string;
        end_date: string;
      };
      total_clicks: {
        current: number;
        previous: number;
        change: number;
        change_percentage: number;
      };
      avg_clicks_per_url: {
        current: number;
        previous: number;
        change: number;
        change_percentage: number;
      };
      active_urls: {
        current: number;
        previous: number;
        change: number;
        change_percentage: number;
      };
    };
  };
  time_series: {
    data: Array<{
      date: string;
      clicks: number;
      urls_count: number;
      avg_clicks: number;
    }>;
    pagination: {
      total_items: number;
      total_pages: number;
      current_page: number;
      limit: number;
    };
  };
  top_performing_days: Array<{
    date: string;
    clicks: number;
    urls_count: number;
    avg_clicks: number;
  }>;
}

/**
 * Summary data interface for click analytics
 */
interface ClicksSummary {
  total_clicks?: number;
  total_urls?: number;
  avg_clicks_per_url?: number;
}

/**
 * Parse and validate date parameters for analytics
 *
 * @param startDateString Optional start date string
 * @param endDateString Optional end date string
 * @returns Object with validated dates or error response
 */
const parseAnalyticsDates = (startDateString?: string, endDateString?: string) => {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;

  // Parse start date
  if (startDateString) {
    startDate = new Date(startDateString);
    if (isNaN(startDate.getTime())) {
      return { error: 'Invalid start_date format. Use YYYY-MM-DD' };
    }
  } else {
    // Default to 30 days ago
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
  }

  // Parse end date
  if (endDateString) {
    endDate = new Date(endDateString);
    if (isNaN(endDate.getTime())) {
      return { error: 'Invalid end_date format. Use YYYY-MM-DD' };
    }
  }

  // Validate date range
  if (endDate < startDate) {
    return { error: 'end_date must be after start_date' };
  }

  return { startDate, endDate };
};

/**
 * Determine comparison period for analytics
 *
 * @param comparison Comparison type
 * @param startDate Analysis start date
 * @param customStartString Custom comparison start date
 * @param customEndString Custom comparison end date
 * @returns Object with comparison period info or error
 */
const determineComparisonPeriod = (
  comparison: string,
  startDate: Date,
  customStartString?: string,
  customEndString?: string,
) => {
  let comparisonPeriodDays: number;
  let previousPeriodStartDate: Date;
  let previousPeriodEndDate: Date;

  if (comparison === 'custom') {
    // Custom comparison period
    if (!customStartString || !customEndString) {
      return {
        error:
          'custom_comparison_start and custom_comparison_end are required when comparison=custom',
      };
    }

    previousPeriodStartDate = new Date(customStartString);
    previousPeriodEndDate = new Date(customEndString);

    if (isNaN(previousPeriodStartDate.getTime()) || isNaN(previousPeriodEndDate.getTime())) {
      return { error: 'Invalid custom comparison date format. Use YYYY-MM-DD' };
    }

    if (previousPeriodEndDate < previousPeriodStartDate) {
      return { error: 'custom_comparison_end must be after custom_comparison_start' };
    }

    comparisonPeriodDays =
      Math.ceil(
        (previousPeriodEndDate.getTime() - previousPeriodStartDate.getTime()) /
          (1000 * 60 * 60 * 24),
      ) + 1;
  } else {
    // Standard comparison periods
    comparisonPeriodDays = parseInt(comparison) || 30;

    if (![7, 14, 30, 90].includes(comparisonPeriodDays)) {
      return { error: 'comparison must be one of: 7, 14, 30, 90, custom' };
    }

    // Calculate previous period dates
    previousPeriodEndDate = new Date(startDate);
    previousPeriodEndDate.setDate(previousPeriodEndDate.getDate() - 1);

    previousPeriodStartDate = new Date(previousPeriodEndDate);
    previousPeriodStartDate.setDate(previousPeriodStartDate.getDate() - (comparisonPeriodDays - 1));
  }

  return {
    comparisonPeriodDays,
    previousPeriodStartDate,
    previousPeriodEndDate,
  };
};

/**
 * Calculate comparison metrics for analytics
 *
 * @param current Current period data
 * @param previous Previous period data
 * @param activeUrlsCount Current period active URLs
 * @param previousActiveUrlsCount Previous period active URLs
 * @returns Comparison metrics
 */
const calculateComparisonMetrics = (
  current: ClicksSummary,
  previous: ClicksSummary,
  activeUrlsCount: number,
  previousActiveUrlsCount: number,
) => {
  const currentTotalClicks = current?.total_clicks ?? 0;
  const previousTotalClicks = previous?.total_clicks ?? 0;
  const clicksChange = currentTotalClicks - previousTotalClicks;
  const clicksChangePercentage =
    previousTotalClicks === 0
      ? 0
      : parseFloat(((clicksChange / previousTotalClicks) * 100).toFixed(2));

  const currentAvgClicks = current?.avg_clicks_per_url ?? 0;
  const previousAvgClicks = previous?.avg_clicks_per_url ?? 0;
  const avgClicksChange = currentAvgClicks - previousAvgClicks;
  const avgClicksChangePercentage =
    previousAvgClicks === 0
      ? 0
      : parseFloat(((avgClicksChange / previousAvgClicks) * 100).toFixed(2));

  const urlsChange = activeUrlsCount - previousActiveUrlsCount;
  const urlsChangePercentage =
    previousActiveUrlsCount === 0
      ? 0
      : parseFloat(((urlsChange / previousActiveUrlsCount) * 100).toFixed(2));

  return {
    total_clicks: {
      current: currentTotalClicks,
      previous: previousTotalClicks,
      change: clicksChange,
      change_percentage: clicksChangePercentage,
    },
    avg_clicks_per_url: {
      current: currentAvgClicks,
      previous: previousAvgClicks,
      change: avgClicksChange,
      change_percentage: avgClicksChangePercentage,
    },
    active_urls: {
      current: activeUrlsCount,
      previous: previousActiveUrlsCount,
      change: urlsChange,
      change_percentage: urlsChangePercentage,
    },
  };
};

/**
 * Get total clicks analytics for all URLs of a user
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with analytics data
 */
exports.getTotalClicksAnalytics = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Get user ID from authentication token
    const userId = req.body.id;

    if (!userId) {
      return sendResponse(res, 401, 'Unauthorized: No user ID');
    }

    // Parse query parameters
    const startDateString = req.query.start_date as string;
    const endDateString = req.query.end_date as string;
    const comparison = (req.query.comparison as string) ?? '30';
    const customComparisonStartString = req.query.custom_comparison_start as string;
    const customComparisonEndString = req.query.custom_comparison_end as string;
    const groupBy = (req.query.group_by as 'day' | 'week' | 'month') ?? 'day';
    const page = parseInt(req.query.page as string) ?? 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 90); // Cap at 90 data points

    // Parse and validate dates
    const dateResult = parseAnalyticsDates(startDateString, endDateString);
    if ('error' in dateResult) {
      return sendResponse(res, 400, dateResult.error);
    }
    const { startDate, endDate } = dateResult;

    // Calculate days in the analysis period
    const analysisPeriodDays =
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Determine comparison period
    const comparisonResult = determineComparisonPeriod(
      comparison,
      startDate,
      customComparisonStartString,
      customComparisonEndString,
    );

    if ('error' in comparisonResult) {
      return sendResponse(res, 400, comparisonResult.error);
    }

    const { comparisonPeriodDays, previousPeriodStartDate, previousPeriodEndDate } =
      comparisonResult;

    // Prepare query options
    const options = { startDate, endDate, groupBy };
    const previousPeriodOptions = {
      startDate: previousPeriodStartDate,
      endDate: previousPeriodEndDate,
    };

    // Fetch analytics data
    const [
      clicksAnalytics,
      summary,
      topPerformingDays,
      activeUrlsCount,
      previousSummary,
      previousActiveUrlsCount,
    ] = await Promise.all([
      clickModel.getTotalClicksAnalytics(userId, options),
      clickModel.getTotalClicksSummary(userId, options),
      clickModel.getTopPerformingDays(userId, options),
      clickModel.getActiveUrlsCount(userId, options),
      clickModel.getTotalClicksSummary(userId, previousPeriodOptions),
      clickModel.getActiveUrlsCount(userId, previousPeriodOptions),
    ]);

    // Apply pagination to time series data
    const totalItems = clicksAnalytics.length;
    const totalPages = Math.ceil(totalItems / limit);
    const offset = (page - 1) * limit;
    const paginatedTimeSeries = clicksAnalytics.slice(offset, offset + limit);

    // Format dates for response
    const analysisStartDateStr = startDate.toISOString().split('T')[0];
    const analysisEndDateStr = endDate.toISOString().split('T')[0];
    const prevStartDateStr = previousPeriodStartDate.toISOString().split('T')[0];
    const prevEndDateStr = previousPeriodEndDate.toISOString().split('T')[0];

    // Calculate comparison metrics
    const comparisonMetrics = calculateComparisonMetrics(
      summary,
      previousSummary,
      activeUrlsCount,
      previousActiveUrlsCount,
    );

    // Construct the response
    const responseData: TotalClicksAnalyticsResponse = {
      summary: {
        total_clicks: summary?.total_clicks ?? 0,
        total_urls: summary?.total_urls ?? 0,
        avg_clicks_per_url: summary?.avg_clicks_per_url ?? 0,
        analysis_period: {
          start_date: analysisStartDateStr,
          end_date: analysisEndDateStr,
          days: analysisPeriodDays,
        },
        comparison: {
          period_days: comparisonPeriodDays,
          previous_period: {
            start_date: prevStartDateStr,
            end_date: prevEndDateStr,
          },
          ...comparisonMetrics,
        },
      },
      time_series: {
        data: paginatedTimeSeries,
        pagination: {
          total_items: totalItems,
          total_pages: totalPages,
          current_page: page,
          limit,
        },
      },
      top_performing_days: topPerformingDays,
    };

    logger.info(`Successfully retrieved total clicks analytics for user ${userId}`);
    return sendResponse(res, 200, 'Successfully retrieved total clicks analytics', responseData);
  } catch (error: unknown) {
    if (error instanceof TypeError) {
      logger.error('URL error: Type error while retrieving total clicks analytics:', error.message);
      return sendResponse(res, 400, 'Invalid request format');
    } else if (error instanceof Error) {
      logger.error('URL error: Failed to retrieve total clicks analytics:', error.message);
      return sendResponse(res, 500, 'Failed to retrieve total clicks analytics');
    } else {
      logger.error('URL error: Unknown error while retrieving total clicks:', String(error));
      return sendResponse(res, 500, 'Internal server error');
    }
  }
};

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
