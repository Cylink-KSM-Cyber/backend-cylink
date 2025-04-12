import { Request, Response } from "express";

const clickModel = require("@/models/clickModel");
const urlModel = require("@/models/urlModel");
const urlService = require("@/services/urlService");
const logger = require("@/utils/logger");
const { sendResponse } = require("@/utils/response");

/**
 * URL Controller
 *
 * Handles URL-related operations including listing, creating, updating, and deleting shortened URLs
 * @module controllers/urlController
 */

/**
 * Get all URLs for an authenticated user
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with user's URLs or error
 */
exports.getAllUrls = async (req: Request, res: Response) => {
  try {
    // Get user ID from authentication token
    const userId = req.body.id;

    // Parse query parameters for pagination and sorting
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sortBy = (req.query.sortBy as string) || "created_at";
    const sortOrder = (req.query.sortOrder as string) || "desc";

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Get all URLs for the user
    const urls = await urlModel.getUrlsByUser(userId);

    // If no URLs found, return 204 status
    if (!urls || urls.length === 0) {
      return sendResponse(res, 204, "No URLs are available", []);
    }

    // For each URL, get the click count
    const urlsWithClicks = await Promise.all(
      urls.map(async (url: any) => {
        const clickCount = await clickModel.getClickCountByUrlId(url.id);

        // Format expiry_date if it exists
        const expiryDate = url.expiry_date
          ? new Date(url.expiry_date).toISOString()
          : null;

        // Generate the full short URL
        const baseUrl = process.env.SHORT_URL_BASE || "https://cylink.id/";
        const shortUrl = baseUrl + url.short_code;

        return {
          id: url.id,
          original_url: url.original_url,
          short_code: url.short_code,
          short_url: shortUrl,
          title: url.title || null,
          clicks: clickCount,
          created_at: new Date(url.created_at).toISOString(),
          expiry_date: expiryDate,
          is_active: url.is_active,
        };
      })
    );

    // Apply sorting based on sortBy and sortOrder parameters
    const sortedUrls = urlsWithClicks.sort((a: any, b: any) => {
      let comparison = 0;

      // Handle different sortBy fields
      if (sortBy === "clicks") {
        comparison = a.clicks - b.clicks;
      } else if (sortBy === "created_at") {
        comparison =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === "title") {
        comparison = (a.title || "").localeCompare(b.title || "");
      } else {
        // Default to sorting by created_at
        comparison =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }

      // Apply sort direction
      return sortOrder === "asc" ? comparison : -comparison;
    });

    // Apply pagination
    const paginatedUrls = sortedUrls.slice(offset, offset + limit);

    // Calculate pagination data
    const totalUrls = sortedUrls.length;
    const totalPages = Math.ceil(totalUrls / limit);

    // Construct pagination object
    const pagination = {
      total: totalUrls,
      page,
      limit,
      total_pages: totalPages,
    };

    logger.info(
      `Successfully retrieved ${paginatedUrls.length} URLs for user ${userId}`
    );

    // Return the response in the requested format
    return sendResponse(
      res,
      200,
      "Successfully retrieved all URLs",
      paginatedUrls,
      pagination
    );
  } catch (error: any) {
    logger.error("URL error: Failed to retrieve URLs:", error);
    return sendResponse(res, 500, "Failed to retrieve URLs", []);
  }
};

/**
 * Create a shortened URL for anonymous users
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with created URL or error
 */
exports.createAnonymousUrl = async (req: Request, res: Response) => {
  try {
    const { original_url, custom_code, title, expiry_date } = req.body;

    // Validate the URL
    if (!isValidUrl(original_url)) {
      return sendResponse(res, 400, "Invalid URL provided");
    }

    // Create options object for URL creation
    const urlOptions = {
      originalUrl: original_url,
      customShortCode: custom_code,
      title,
      expiryDate: expiry_date ? new Date(expiry_date) : undefined,
    };

    try {
      // Create the shortened URL
      const newUrl = await urlService.createShortenedUrl(urlOptions);

      // Generate the full short URL
      const baseUrl = process.env.SHORT_URL_BASE || "https://cylink.id/";
      const shortUrl = baseUrl + newUrl.short_code;

      // Format the response
      const response = {
        id: newUrl.id,
        original_url: newUrl.original_url,
        short_code: newUrl.short_code,
        short_url: shortUrl,
        title: newUrl.title || null,
        created_at: new Date(newUrl.created_at).toISOString(),
        expiry_date: newUrl.expiry_date
          ? new Date(newUrl.expiry_date).toISOString()
          : null,
        is_active: newUrl.is_active,
      };

      logger.info(`Successfully created anonymous shortened URL: ${shortUrl}`);

      return sendResponse(
        res,
        201,
        "Successfully created shortened URL",
        response
      );
    } catch (error: any) {
      // Handle custom code already taken error
      if (error.message === "This custom short code is already taken") {
        return sendResponse(res, 409, "Custom code already in use");
      }

      throw error; // Re-throw for generic error handling
    }
  } catch (error: any) {
    logger.error("URL error: Failed to create shortened URL:", error);
    return sendResponse(res, 500, "Internal Server Error");
  }
};

/**
 * Create a shortened URL for authenticated users
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with created URL or error
 */
exports.createAuthenticatedUrl = async (req: Request, res: Response) => {
  try {
    // Get user ID from authentication token
    const userId = req.body.id;

    // Extract request data
    const { original_url, custom_code, title, expiry_date } = req.body;

    // Validate the URL
    if (!isValidUrl(original_url)) {
      return sendResponse(res, 400, "Invalid URL provided");
    }

    // Create options object for URL creation
    const urlOptions = {
      userId,
      originalUrl: original_url,
      customShortCode: custom_code,
      title,
      expiryDate: expiry_date ? new Date(expiry_date) : undefined,
    };

    try {
      // Create the shortened URL
      const newUrl = await urlService.createShortenedUrl(urlOptions);

      // Generate the full short URL
      const baseUrl = process.env.SHORT_URL_BASE || "https://cylink.id/";
      const shortUrl = baseUrl + newUrl.short_code;

      // Format the response
      const response = {
        id: newUrl.id,
        original_url: newUrl.original_url,
        short_code: newUrl.short_code,
        short_url: shortUrl,
        title: newUrl.title || null,
        created_at: new Date(newUrl.created_at).toISOString(),
        expiry_date: newUrl.expiry_date
          ? new Date(newUrl.expiry_date).toISOString()
          : null,
        is_active: newUrl.is_active,
      };

      logger.info(
        `Successfully created authenticated shortened URL: ${shortUrl} for user ${userId}`
      );

      return sendResponse(
        res,
        201,
        "Successfully created shortened URL",
        response
      );
    } catch (error: any) {
      // Handle custom code already taken error
      if (error.message === "This custom short code is already taken") {
        return sendResponse(res, 409, "Custom code already in use");
      }

      throw error; // Re-throw for generic error handling
    }
  } catch (error: any) {
    logger.error("URL error: Failed to create shortened URL:", error);
    return sendResponse(res, 500, "Internal Server Error");
  }
};

/**
 * Validate if a string is a valid URL
 *
 * @param {string} url - URL to validate
 * @returns {boolean} Whether the URL is valid
 */
function isValidUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return ["http:", "https:"].includes(parsedUrl.protocol);
  } catch (error) {
    return false;
  }
}

/**
 * Get URL details by ID or short code
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with URL details or error
 */
exports.getUrlDetails = async (req: Request, res: Response) => {
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
      return sendResponse(res, 404, "URL not found");
    }

    // Check if the URL belongs to the authenticated user
    if (url.user_id && url.user_id !== userId) {
      return sendResponse(res, 401, "Unauthorized");
    }

    // Get click count
    const clickCount = await clickModel.getClickCountByUrlId(url.id);

    // Get analytics
    const analytics = await urlService.getUrlAnalytics(url.id);

    // Get recent clicks (last 10)
    const recentClicks = await clickModel.getRecentClicksByUrlId(url.id, 10);

    // Format recent clicks
    const formattedRecentClicks = recentClicks.map((click: any) => ({
      timestamp: new Date(click.clicked_at).toISOString(),
      device_type: click.device_type || "unknown",
    }));

    // Generate the full short URL
    const baseUrl = process.env.SHORT_URL_BASE || "https://cylink.id/";
    const shortUrl = baseUrl + url.short_code;

    // Format dates
    const createdAt = new Date(url.created_at).toISOString();
    const updatedAt = url.updated_at
      ? new Date(url.updated_at).toISOString()
      : createdAt;
    const expiryDate = url.expiry_date
      ? new Date(url.expiry_date).toISOString()
      : null;

    // Construct response
    const response = {
      id: url.id,
      original_url: url.original_url,
      short_code: url.short_code,
      short_url: shortUrl,
      title: url.title || null,
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
      `Successfully retrieved URL details for ${
        isId ? "ID" : "short code"
      } ${identifier}`
    );

    return sendResponse(res, 200, "Successfully retrieved URL", response);
  } catch (error: any) {
    logger.error("URL error: Failed to retrieve URL details:", error);
    return sendResponse(res, 500, "Internal Server Error");
  }
};

/**
 * Delete a URL by ID (soft delete)
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with deletion result or error
 */
exports.deleteUrl = async (req: Request, res: Response) => {
  try {
    // Get user ID from authentication token
    const userId = req.body.id;

    // Get URL ID from request parameters
    const urlId = parseInt(req.params.id);

    if (isNaN(urlId)) {
      return sendResponse(res, 400, "Invalid URL ID");
    }

    // Check if URL exists
    const url = await urlModel.getUrlById(urlId);

    if (!url) {
      return sendResponse(res, 404, "URL not found");
    }

    // Check if the URL belongs to the authenticated user
    if (url.user_id && url.user_id !== userId) {
      return sendResponse(res, 401, "Unauthorized");
    }

    // Perform soft delete
    const isDeleted = await urlModel.deleteUrl(urlId);

    if (!isDeleted) {
      return sendResponse(res, 500, "Failed to delete URL");
    }

    // Get the updated URL to return the deleted_at timestamp (including soft deleted URLs)
    const deletedUrl = await urlModel.getUrlById(urlId, true);

    // Format response
    const response = {
      id: deletedUrl.id,
      short_code: deletedUrl.short_code,
      deleted_at: new Date(deletedUrl.deleted_at).toISOString(),
    };

    logger.info(`Successfully deleted URL with ID ${urlId}`);

    return sendResponse(res, 200, "Successfully deleted URL", response);
  } catch (error: any) {
    logger.error("URL error: Failed to delete URL:", error);
    return sendResponse(res, 500, "Internal Server Error");
  }
};

/**
 * Get analytics for a specific URL
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with URL analytics or error
 */
exports.getUrlAnalytics = async (req: Request, res: Response) => {
  try {
    // Get user ID from authentication token
    const userId = req.body.id;

    // Get URL ID from request parameters
    const urlId = parseInt(req.params.id);

    if (isNaN(urlId)) {
      return sendResponse(res, 400, "Invalid URL ID");
    }

    // Check if URL exists
    const url = await urlModel.getUrlById(urlId);

    if (!url) {
      return sendResponse(res, 404, "URL not found");
    }

    // Check if the URL belongs to the authenticated user
    if (url.user_id && url.user_id !== userId) {
      return sendResponse(res, 401, "Unauthorized");
    }

    // Extract query parameters for analytics
    const { start_date, end_date, group_by } = req.query;

    // Prepare options for the analytics service
    const options: any = {};

    if (start_date) {
      options.startDate = start_date;
    }

    if (end_date) {
      options.endDate = end_date;
    }

    if (group_by && ["day", "week", "month"].includes(group_by as string)) {
      options.groupBy = group_by;
    }

    // Get analytics data with filters
    const analytics = await urlService.getUrlAnalyticsWithFilters(
      urlId,
      options
    );

    logger.info(`Successfully retrieved analytics for URL ID ${urlId}`);

    return sendResponse(
      res,
      200,
      "Successfully retrieved URL analytics",
      analytics
    );
  } catch (error: any) {
    logger.error("URL error: Failed to retrieve URL analytics:", error);

    if (error.message === "URL not found") {
      return sendResponse(res, 404, "URL not found");
    }

    return sendResponse(res, 500, "Internal Server Error");
  }
};
