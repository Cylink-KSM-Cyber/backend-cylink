/**
 * Get Public URL Details Controller
 *
 * Controller for retrieving public URL details using only the short code
 * without requiring authentication
 *
 * @module controllers/urls/getPublicUrlDetails
 */

import { Response } from 'express';

import { ClickTrackingRequest } from '../../interfaces/ClickInfo';
import logger from '../../utils/logger';
import { sendResponse } from '../../utils/response';

const clickModel = require('../../models/clickModel');
const conversionModel = require('../../models/conversionModel');
const impressionModel = require('../../models/impressionModel');
const publicUrlService = require('../../services/publicUrlService');
const urlService = require('../../services/urlService');

/**
 * Click information interface for tracking data
 */
interface ClickInfo {
  ipAddress: string | string[] | undefined;
  userAgent: string | undefined;
  referrer: string | null;
  country: string | null;
  deviceType: string;
  browser: string;
  clickId?: number;
  trackingId?: string;
}

/**
 * URL entity interface from database
 */
interface UrlEntity {
  id: number;
  user_id: number | null;
  original_url: string;
  short_code: string;
  title: string | null;
  expiry_date: Date | null;
  is_active: boolean;
  deleted_at: Date | null;
}

/**
 * Tracking data result interface
 */
interface TrackingResult {
  clickId?: number;
  trackingId?: string;
}

/**
 * Handles errors that occur during public URL details retrieval
 *
 * @param {unknown} error - The error that occurred
 * @param {Response} res - Express response object
 * @returns {Response} Error response
 */
const handleError = (error: unknown, res: Response): Response => {
  if (error instanceof Error) {
    logger.error('Public URL error: Failed to retrieve URL details:', error.message);
    return sendResponse(res, 500, 'Internal Server Error');
  } else {
    logger.error('Public URL error: Unknown error while retrieving URL details:', String(error));
    return sendResponse(res, 500, 'Internal server error');
  }
};

/**
 * Records tracking data (click, impression, conversion) for URL access
 *
 * @param {string} shortCode - The short code that was accessed
 * @param {ClickInfo} clickInfo - Information about the click/access
 * @param {number} urlId - The URL ID from database
 * @returns {Promise<TrackingResult>} Tracking information
 */
const recordTrackingData = async (
  shortCode: string,
  clickInfo: ClickInfo,
  urlId: number,
): Promise<TrackingResult> => {
  let clickId: number | undefined;
  let trackingId: string | undefined;

  try {
    // Record the click
    const clickRecord = await clickModel.recordClick({
      url_id: urlId,
      ip_address: clickInfo.ipAddress,
      user_agent: clickInfo.userAgent,
      referrer: clickInfo.referrer,
      country: clickInfo.country,
      device_type: clickInfo.deviceType,
      browser: clickInfo.browser,
    });

    if (clickRecord) {
      clickId = clickRecord.id;

      // Generate tracking ID for conversion tracking
      trackingId = conversionModel.generateTrackingId({
        clickId,
        urlId,
      });

      logger.info(
        `Recorded click for ${shortCode}: click_id=${clickId}, tracking_id=${trackingId}`,
      );
    }
  } catch (error) {
    // Log error but continue - don't fail the request if click recording fails
    logger.error(`Failed to record click for ${shortCode}:`, error);
  }

  try {
    // Record impression
    const ipAddress = clickInfo.ipAddress;
    const userAgent = clickInfo.userAgent || '';
    const referrer = clickInfo.referrer || '';
    let source = '';

    // Extract source from referrer if available
    if (referrer && typeof referrer === 'string') {
      try {
        const url = new URL(referrer);
        source = url.hostname;
      } catch (error) {
        // Invalid URL, use referrer as is
        source = referrer;
      }
    }

    // Check if this IP has viewed this URL recently (for unique impressions)
    const isUnique = !(await impressionModel.hasRecentImpression(urlId, ipAddress));

    // Record impression asynchronously
    impressionModel
      .recordImpression({
        url_id: urlId,
        ip_address: ipAddress,
        user_agent: userAgent,
        referrer: typeof referrer === 'string' ? referrer : '',
        is_unique: isUnique,
        source,
      })
      .then(() => {
        logger.info(`Recorded impression for URL ${urlId}`);
      })
      .catch((error: Error) => {
        logger.error(`Failed to record impression for URL ${urlId}: ${error.message}`);
      });
  } catch (impressionError) {
    logger.error(`Error tracking impression: ${impressionError}`);
  }

  return { clickId, trackingId };
};

/**
 * Get public URL details by short code
 * This endpoint doesn't require authentication and returns limited URL information
 * It also records tracking data (clicks, impressions) for analytics
 *
 * @param {ClickTrackingRequest} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with URL details or error
 */
export const getPublicUrlDetails = async (
  req: ClickTrackingRequest,
  res: Response,
): Promise<Response> => {
  try {
    // Extract short code from request parameters
    const { shortCode } = req.params;

    // Guard clause: Validate short code
    if (!shortCode || typeof shortCode !== 'string') {
      return sendResponse(res, 400, 'Invalid short code');
    }

    // First, get URL from database to validate it exists and is active
    const url: UrlEntity = await urlService.getUrlByShortCode(shortCode);

    // Check if URL exists, is active, and not deleted
    if (!url || !url.is_active || url.deleted_at) {
      return sendResponse(res, 404, 'URL not found or inactive');
    }

    // Check if URL has expired
    if (url.expiry_date && new Date(url.expiry_date) < new Date()) {
      logger.info(`URL with short code ${shortCode} has expired`);

      // Mark URL as inactive since it's expired
      await urlService.updateUrl(url.id, { is_active: false });
      return sendResponse(res, 404, 'URL not found or inactive');
    }

    // Record tracking data (clicks, impressions) for analytics
    const { clickId, trackingId } = await recordTrackingData(shortCode, req.clickInfo, url.id);

    // Update clickInfo with tracking data for UTM parameter generation
    if (clickId && trackingId) {
      req.clickInfo.clickId = clickId;
      req.clickInfo.trackingId = trackingId;
    }

    // Get URL details from service with updated tracking info
    const urlDetails = await publicUrlService.getPublicUrlDetails(shortCode, req.clickInfo);

    // URL not found or inactive (double check after tracking)
    if (!urlDetails) {
      return sendResponse(res, 404, 'URL not found or inactive');
    }

    // Log successful request
    logger.info(`Successfully retrieved public URL details for short code ${shortCode}`);

    // Return successful response
    return sendResponse(res, 200, 'URL details retrieved successfully', urlDetails);
  } catch (error: unknown) {
    return handleError(error, res);
  }
};

export default getPublicUrlDetails;
