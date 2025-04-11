import { Request, Response } from "express";
const urlModel = require("@/models/urlModel");
const clickModel = require("@/models/clickModel");
const { sendResponse } = require("@/utils/response");
const logger = require("@/utils/logger");

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
