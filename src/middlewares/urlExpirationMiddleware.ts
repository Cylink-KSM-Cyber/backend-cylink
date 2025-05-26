/**
 * URL Expiration Middleware
 *
 * Processes URL expiration status in real-time for API responses
 * Calculates expiration status based on current date and user timezone
 * @module middlewares/urlExpirationMiddleware
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { timezoneCache, cacheKeys } from '../utils/cache';

/**
 * Extended Request interface to include user timezone information
 */
interface ExtendedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    timezone?: string;
  };
  timezone?: string;
}

/**
 * URL object interface for processing
 */
interface UrlObject {
  id: number;
  expiry_date: string | null;
  is_active: boolean;
  status?: string;
  days_until_expiry?: number | null;
}

/**
 * Response data interface that may contain URLs
 */
interface ResponseData {
  data?: UrlObject | UrlObject[];
  [key: string]: any;
}

/**
 * Extract timezone from request headers or user profile
 *
 * @param {ExtendedRequest} req - Express request object
 * @returns {string} Timezone string (defaults to UTC)
 */
const extractTimezone = (req: ExtendedRequest): string => {
  // Priority order for timezone detection:
  // 1. User profile timezone (if available in JWT)
  // 2. Request timezone header
  // 3. Accept-Language header parsing
  // 4. Default to UTC

  if (req.user?.timezone) {
    return req.user.timezone;
  }

  if (req.timezone) {
    return req.timezone;
  }

  // Check for timezone in headers
  const timezoneHeader = req.headers['x-timezone'] as string;
  if (timezoneHeader) {
    return timezoneHeader;
  }

  // Try to extract from Accept-Language header
  const acceptLanguage = req.headers['accept-language'] as string;
  if (acceptLanguage) {
    // Simple timezone extraction from language header
    // This is a basic implementation - could be enhanced
    const languageMatch = acceptLanguage.match(/^([a-z]{2})-([A-Z]{2})/);
    if (languageMatch) {
      const country = languageMatch[2];
      // Map some common countries to timezones
      const countryTimezoneMap: { [key: string]: string } = {
        US: 'America/New_York',
        GB: 'Europe/London',
        ID: 'Asia/Jakarta',
        SG: 'Asia/Singapore',
        AU: 'Australia/Sydney',
        JP: 'Asia/Tokyo',
        CN: 'Asia/Shanghai',
        IN: 'Asia/Kolkata',
      };

      if (countryTimezoneMap[country]) {
        return countryTimezoneMap[country];
      }
    }
  }

  // Default to UTC
  return 'UTC';
};

/**
 * Get current date in specified timezone
 *
 * @param {string} timezone - Timezone string
 * @returns {Date} Current date in the specified timezone
 */
const getCurrentDateInTimezone = (timezone: string): Date => {
  try {
    // Create a date in the specified timezone
    const now = new Date();
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;

    // Use Intl.DateTimeFormat to get timezone offset
    const targetTime = new Date(utcTime + getTimezoneOffset(timezone) * 60000);
    return targetTime;
  } catch (error) {
    logger.warn(`Invalid timezone ${timezone}, falling back to UTC`);
    return new Date();
  }
};

/**
 * Get timezone offset in minutes (with caching)
 *
 * @param {string} timezone - Timezone string
 * @returns {number} Offset in minutes
 */
const getTimezoneOffset = (timezone: string): number => {
  // Check cache first
  const cacheKey = cacheKeys.timezoneOffset(timezone);
  const cachedOffset = timezoneCache.get<number>(cacheKey);

  if (cachedOffset !== null) {
    return cachedOffset;
  }

  try {
    const now = new Date();
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const targetDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const offset = (targetDate.getTime() - utcDate.getTime()) / (1000 * 60);

    // Cache the offset for 1 hour
    timezoneCache.set(cacheKey, offset, 3600000);

    return offset;
  } catch (error) {
    // Cache UTC offset even for errors
    timezoneCache.set(cacheKey, 0, 3600000);
    return 0; // UTC offset
  }
};

/**
 * Calculate URL expiration status and days until expiry
 *
 * @param {UrlObject} url - URL object to process
 * @param {Date} currentDate - Current date in user's timezone
 * @returns {UrlObject} URL object with updated status and days_until_expiry
 */
const calculateExpirationStatus = (url: UrlObject, currentDate: Date): UrlObject => {
  const processedUrl = { ...url };

  // If URL is manually set to inactive, keep it as inactive
  if (!url.is_active) {
    processedUrl.status = 'inactive';
    processedUrl.days_until_expiry = null;
    return processedUrl;
  }

  // If no expiry date, URL is active indefinitely
  if (!url.expiry_date) {
    processedUrl.status = 'active';
    processedUrl.days_until_expiry = null;
    return processedUrl;
  }

  // Parse expiry date
  const expiryDate = new Date(url.expiry_date);

  // Calculate time difference
  const timeDiff = expiryDate.getTime() - currentDate.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  // Set days_until_expiry (minimum 0 for expired URLs)
  processedUrl.days_until_expiry = Math.max(0, daysDiff);

  // Determine status based on expiry
  if (timeDiff <= 0) {
    // URL has expired
    processedUrl.status = 'expired';
    processedUrl.is_active = false; // Override is_active for response
  } else if (daysDiff <= 7) {
    // URL expires within 7 days
    processedUrl.status = 'expiring-soon';
  } else {
    // URL is active
    processedUrl.status = 'active';
  }

  return processedUrl;
};

/**
 * Process a single URL object
 *
 * @param {UrlObject} url - URL object to process
 * @param {Date} currentDate - Current date in user's timezone
 * @returns {UrlObject} Processed URL object
 */
const processUrl = (url: UrlObject, currentDate: Date): UrlObject => {
  return calculateExpirationStatus(url, currentDate);
};

/**
 * Process an array of URL objects
 *
 * @param {UrlObject[]} urls - Array of URL objects to process
 * @param {Date} currentDate - Current date in user's timezone
 * @returns {UrlObject[]} Array of processed URL objects
 */
const processUrls = (urls: UrlObject[], currentDate: Date): UrlObject[] => {
  return urls.map(url => processUrl(url, currentDate));
};

/**
 * URL Expiration Middleware
 *
 * Intercepts responses containing URL data and processes expiration status
 * in real-time based on user's timezone
 *
 * @param {ExtendedRequest} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export const urlExpirationMiddleware = (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction,
): void => {
  // Store original json method
  const originalJson = res.json;

  // Override res.json to process URL data
  res.json = function (data: ResponseData) {
    try {
      // Extract timezone from request
      const timezone = extractTimezone(req);
      const currentDate = getCurrentDateInTimezone(timezone);

      // Process URL data if present
      if (data && typeof data === 'object') {
        // Check if data contains URL objects
        if (data.data) {
          if (Array.isArray(data.data)) {
            // Process array of URLs
            data.data = processUrls(data.data, currentDate);
          } else if (typeof data.data === 'object' && data.data.id) {
            // Process single URL object
            data.data = processUrl(data.data, currentDate);
          }
        }

        // Also check for direct URL object (for single URL endpoints)
        else if (data.id && typeof data.expiry_date !== 'undefined') {
          // Process direct URL object
          const processedData = processUrl(data as UrlObject, currentDate);
          Object.assign(data, processedData);
        }
      }

      // Log timezone usage for monitoring
      if (req.path.includes('/urls')) {
        logger.info(
          `URL expiration processed with timezone: ${timezone} for user: ${req.user?.id || 'anonymous'}`,
        );
      }
    } catch (error) {
      // Log error but don't break the response
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`URL expiration middleware error: ${errorMessage}`);
    }

    // Call original json method with processed data
    return originalJson.call(this, data);
  };

  next();
};

/**
 * Export utility functions for testing
 */
export {
  extractTimezone,
  getCurrentDateInTimezone,
  calculateExpirationStatus,
  processUrl,
  processUrls,
};
