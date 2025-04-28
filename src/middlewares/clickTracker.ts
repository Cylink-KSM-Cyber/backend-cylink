/**
 * Click Tracker Middleware
 *
 * Extracts and processes information about URL clicks for analytics
 * @module middlewares/clickTracker
 */

import { Request, Response, NextFunction } from 'express';
const conversionModel = require('../models/conversionModel');

/**
 * Click information interface
 */
interface ClickInfo {
  ipAddress: string | string[] | undefined;
  userAgent: string | undefined;
  referrer: string | null;
  country: string | null;
  deviceType: string;
  browser: string;
  clickId?: number; // Added for conversion tracking
  trackingId?: string; // Added for conversion tracking
}

/**
 * Extended request interface with click tracking information
 */
interface ClickTrackingRequest extends Request {
  clickInfo: ClickInfo;
}

/**
 * Detects browser information from user agent string
 *
 * @param {string} userAgent - The user agent string
 * @returns {string} Browser name
 */
const detectBrowser = (userAgent: string | undefined): string => {
  if (!userAgent) return 'unknown';

  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('SamsungBrowser')) return 'Samsung Internet';
  if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera';
  if (userAgent.includes('Edg')) return 'Edge';
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) return 'Internet Explorer';

  return 'Others';
};

/**
 * Detects device type from user agent string
 *
 * @param {string} userAgent - The user agent string
 * @returns {string} Device type (mobile, tablet, desktop)
 */
const detectDeviceType = (userAgent: string | undefined): string => {
  if (!userAgent) return 'unknown';

  // Check for mobile devices
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
    // Check for tablets specifically
    if (/iPad|Android(?!.*Mobile)/i.test(userAgent)) {
      return 'tablet';
    }
    return 'mobile';
  }

  return 'desktop';
};

/**
 * Middleware to extract information about the visitor for click tracking
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
module.exports = (req: Request, res: Response, next: NextFunction): void => {
  // Extract and parse visitor information
  const clickInfo: ClickInfo = {
    ipAddress: req.headers['x-forwarded-for'] || (req.socket?.remoteAddress as string | undefined),
    userAgent: req.headers['user-agent'] as string | undefined,
    referrer:
      (req.headers.referer as string | undefined) ||
      (req.headers.referrer as string | undefined) ||
      null,
    // Note: country would typically be determined by a geolocation service
    country: null,
    deviceType: detectDeviceType(req.headers['user-agent'] as string | undefined),
    browser: detectBrowser(req.headers['user-agent'] as string | undefined),
  };

  // Attach to request object for use in route handlers
  (req as ClickTrackingRequest).clickInfo = clickInfo;

  // Add a method to set the click ID after it's recorded
  // This will be used by the redirect middleware to generate a tracking ID
  (req as any).setClickId = (clickId: number, urlId: number): void => {
    clickInfo.clickId = clickId;

    // Generate a tracking ID for conversion tracking
    if (clickId && urlId) {
      clickInfo.trackingId = conversionModel.generateTrackingId({
        clickId,
        urlId,
      });
    }
  };

  next();
};
