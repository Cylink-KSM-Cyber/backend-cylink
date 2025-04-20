import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
const impressionModel = require('../models/impressionModel');

/**
 * Interface for request with URL data
 */
interface RequestWithUrlData extends Request {
  url_data?: {
    id: number;
    [key: string]: any;
  };
}

/**
 * Middleware to track URL impressions
 * Records impressions when URLs are viewed or accessed
 *
 * @module middlewares/impressionTracking
 */

/**
 * Track impression for a URL
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {void}
 */
export const trackImpression = async (
  req: RequestWithUrlData,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // If the URL object is not in request (added by previous middleware), move on
    if (!req.url_data || !req.url_data.id) {
      return next();
    }

    const urlId = req.url_data.id;
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || '';
    const userAgent = req.headers['user-agent'] || '';
    const referrer = req.headers.referer || req.headers.referrer || '';
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

    // Record the impression asynchronously (don't await)
    // This prevents blocking the response while we record the impression
    impressionModel
      .recordImpression({
        url_id: urlId,
        ip_address: ipAddress,
        user_agent: userAgent as string,
        referrer: typeof referrer === 'string' ? referrer : '',
        is_unique: isUnique,
        source,
      })
      .catch((error: Error) => {
        // Log error but don't fail the request
        logger.error(`Failed to record impression for URL ${urlId}: ${error.message}`);
      });

    // Continue to the next middleware without waiting for impression recording
    next();
  } catch (error: any) {
    // Log error but don't fail the request
    logger.error(`Error in impression tracking middleware: ${error.message}`);
    next();
  }
};

export default trackImpression;
