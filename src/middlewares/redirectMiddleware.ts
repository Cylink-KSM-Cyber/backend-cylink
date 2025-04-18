import { Request, Response, NextFunction } from 'express';
import * as http from 'http';

const urlService = require('../services/urlService');
const logger = require('../utils/logger');

/**
 * Redirect Middleware
 *
 * Handles redirection for shortened URLs and tracks click analytics
 * @module middlewares/redirectMiddleware
 */

/**
 * Extending Express Request interface to include clickInfo and setClickId
 */
interface ExtendedRequest extends Request {
  clickInfo?: {
    ipAddress: string | string[] | undefined;
    userAgent: string | undefined;
    referrer: string | null;
    country: string | null;
    deviceType: string;
    browser: string;
    clickId?: number;
    trackingId?: string;
  };
  setClickId?: (clickId: number, urlId: number) => void;
}

/**
 * Auto-tracks a conversion for testing and development purposes
 *
 * @param {string} trackingId - The tracking ID to use
 * @param {number} goalId - The goal ID for the conversion
 * @returns {Promise<void>}
 */
async function autoTrackConversion(trackingId: string, goalId: number): Promise<void> {
  try {
    // Get the host from environment or use default localhost
    const host = process.env.HOST || 'localhost';
    const port = process.env.PORT || 5000;

    // Prepare post data
    const postData = JSON.stringify({
      tracking_id: trackingId,
      goal_id: goalId,
    });

    // Make the API call using Node.js http module
    const options = {
      hostname: host,
      port: port,
      path: '/api/v1/conversions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    // Return a promise to handle the request
    return new Promise((resolve, reject) => {
      const req = http.request(options, res => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              logger.info(
                `Conversion tracked successfully: ID=${result.data.conversion_id}, tracking_id=${trackingId}`,
              );
            } else {
              logger.error(`Error tracking conversion: ${result.message || 'Unknown error'}`);
            }
            resolve();
          } catch (e) {
            logger.error(`Error parsing conversion response: ${e}`);
            reject(e);
          }
        });
      });

      req.on('error', e => {
        logger.error(`Error sending conversion request: ${e}`);
        reject(e);
      });

      // Write data to request body
      req.write(postData);
      req.end();
    });
  } catch (error) {
    logger.error(`Exception in conversion tracking: ${error}`);
  }

  return Promise.resolve();
}

/**
 * Middleware to handle URL redirection and tracking
 *
 * @param {ExtendedRequest} req - Express request object with click info
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 */
module.exports = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
  try {
    // Extract the short code from the URL path
    const shortCode = req.path.substring(1); // Remove leading slash

    // Skip if not a potential short code (e.g., for static files or API routes)
    if (!shortCode || shortCode.includes('/') || shortCode.startsWith('api')) {
      return next();
    }

    // Extract information about the visitor for tracking
    const clickInfo = req.clickInfo || {
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      referrer: req.headers.referer || req.headers.referrer || null,
      country: null, // Would be set by a geolocation service in production
      deviceType: 'unknown',
      browser: 'unknown',
    };

    // Record the click and get the original URL and click ID
    const result = await urlService.recordClickAndGetOriginalUrl(
      shortCode,
      clickInfo,
      true, // Set to true to return the click ID
    );

    if (result) {
      const { originalUrl, clickId, urlId } = result;

      // Set the click ID in the request object to generate a tracking ID
      if (req.setClickId) {
        req.setClickId(clickId, urlId);
      }

      // Get the URL details to determine the redirect type
      const url = await urlService.getUrlByShortCode(shortCode);
      const redirectType = url?.redirect_type === '301' ? 301 : 302;

      logger.info(`Redirecting ${shortCode} to ${originalUrl} (${redirectType})`);

      // Add UTM parameters to the original URL for tracking
      let redirectUrl = originalUrl;
      if (req.clickInfo?.trackingId) {
        // Use UTM parameters format instead of cyt
        const separator = redirectUrl.includes('?') ? '&' : '?';
        redirectUrl = `${redirectUrl}${separator}utm_source=cylink&utm_medium=shortlink&utm_campaign=conversion&utm_content=${req.clickInfo.trackingId}`;

        // Auto-track conversion
        // This will send a conversion event automatically
        // Use setTimeout to make this non-blocking
        setTimeout(() => {
          autoTrackConversion(req.clickInfo!.trackingId!, 1).catch(err =>
            logger.error(`Error in auto-tracking conversion: ${err}`),
          );
        }, 100);
      }

      // Redirect to the original URL
      return res.redirect(redirectType, redirectUrl);
    }

    // Return a proper JSON 404 response when URL is not found or expired
    logger.info(`URL not found for short code: ${shortCode}`);
    return res.status(404).json({
      status: 404,
      message: 'Short URL not found or has expired',
    });
  } catch (error) {
    logger.error('Redirect error:', error);

    // Return a proper JSON 500 response for errors
    return res.status(500).json({
      status: 500,
      message: 'Internal Server Error',
    });
  }
};
