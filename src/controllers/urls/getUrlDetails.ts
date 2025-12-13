/**
 * Get URL Details Controller
 *
 * Controller for retrieving detailed information about a URL by ID or short code.
 *
 * @module controllers/urls/getUrlDetails
 */

import { Request, Response } from 'express';
import { RecentClick } from '../../interfaces/URL';
import logger from '../../libs/winston/winston.service';
import { sendResponse } from '../../utils/response';

const clickModel = require('../../models/clickModel');
const urlModel = require('../../models/urlModel');
const urlService = require('../../services/urlService');

/**
 * Retrieves a URL by either ID or short code
 *
 * @param {string} identifier - URL ID or short code
 * @returns {Promise<any>} URL object or null if not found
 */
const getUrlByIdentifier = async (identifier: string): Promise<any> => {
  // Determine if it's an ID (number) or a short code (string)
  const isId = !isNaN(Number(identifier));

  // Get the URL details
  if (isId) {
    return await urlModel.getUrlById(Number(identifier));
  } else {
    return await urlModel.getUrlByShortCode(identifier);
  }
};

/**
 * Verifies if user has permission to access the URL
 *
 * @param {any} url - URL object
 * @param {number} userId - Authenticated user ID
 * @returns {boolean} True if user has permission, false otherwise
 */
const hasPermission = (url: any, userId: number): boolean => {
  // If URL has no user_id, it's public and accessible to all
  // If URL has user_id, it must match the authenticated user's ID
  return !url.user_id || url.user_id === userId;
};

/**
 * Formats recent clicks data for response
 *
 * @param {RecentClick[]} recentClicks - Recent clicks array from database
 * @returns {Array<{timestamp: string, device_type: string}>} Formatted recent clicks
 */
const formatRecentClicks = (
  recentClicks: RecentClick[],
): Array<{ timestamp: string; device_type: string }> => {
  return recentClicks.map((click: RecentClick) => ({
    timestamp: new Date(click.clicked_at).toISOString(),
    device_type: click.device_type ?? 'unknown',
  }));
};

/**
 * Formats date fields from URL object
 *
 * @param {any} url - URL object from database
 * @returns {Object} Formatted date fields
 */
const formatDates = (
  url: any,
): { createdAt: string; updatedAt: string; expiryDate: string | null } => {
  const createdAt = new Date(url.created_at).toISOString();
  return {
    createdAt,
    updatedAt: url.updated_at ? new Date(url.updated_at).toISOString() : createdAt,
    expiryDate: url.expiry_date ? new Date(url.expiry_date).toISOString() : null,
  };
};

/**
 * Formats complete URL response object
 *
 * @param {any} url - URL object from database
 * @param {number} clickCount - Number of clicks
 * @param {any} analytics - Analytics data
 * @param {Array<{timestamp: string, device_type: string}>} formattedRecentClicks - Formatted recent clicks
 * @param {Object} dates - Formatted date fields
 * @returns {Object} Complete formatted response
 */
const formatResponse = (
  url: any,
  clickCount: number,
  analytics: any,
  formattedRecentClicks: Array<{ timestamp: string; device_type: string }>,
  dates: { createdAt: string; updatedAt: string; expiryDate: string | null },
): any => {
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
    created_at: dates.createdAt,
    updated_at: dates.updatedAt,
    expiry_date: dates.expiryDate,
    is_active: url.is_active,
    analytics: {
      browser_stats: analytics.browserStats,
      device_stats: analytics.deviceStats,
      recent_clicks: formattedRecentClicks,
    },
  };
};

/**
 * Handles errors that occur during URL details retrieval
 *
 * @param {unknown} error - The error that occurred
 * @param {Response} res - Express response object
 * @returns {Response} Error response
 */
const handleError = (error: unknown, res: Response): Response => {
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
};

/**
 * Get URL details by ID or short code
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with URL details or error
 */
export const getUrlDetails = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Get user ID from authentication token
    const userId = req.body.id;

    // Extract identifier from request parameters
    const { identifier } = req.params;
    const isId = !isNaN(Number(identifier));

    // Guard clause: Fetch URL by identifier
    const url = await getUrlByIdentifier(identifier);
    if (!url) {
      return sendResponse(res, 404, 'URL not found');
    }

    // Guard clause: Check authorization
    if (!hasPermission(url, userId)) {
      return sendResponse(res, 401, 'Unauthorized');
    }

    // Fetch all required data in parallel for better performance
    const [clickCount, analytics, recentClicks] = await Promise.all([
      clickModel.getClickCountByUrlId(url.id),
      urlService.getUrlAnalytics(url.id),
      clickModel.getRecentClicksByUrlId(url.id, 10),
    ]);

    // Process and format the data
    const formattedRecentClicks = formatRecentClicks(recentClicks);
    const dates = formatDates(url);

    // Build the response
    const response = formatResponse(url, clickCount, analytics, formattedRecentClicks, dates);

    logger.info(
      `Successfully retrieved URL details for ${isId ? 'ID' : 'short code'} ${identifier}`,
    );

    // Return successful response
    return sendResponse(res, 200, 'Successfully retrieved URL', response);
  } catch (error: unknown) {
    return handleError(error, res);
  }
};

export default getUrlDetails;
