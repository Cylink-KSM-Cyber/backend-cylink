/**
 * URL Service
 *
 * Provides business logic for URL shortening and management
 * @module services/urlService
 */

const bcrypt = require("bcrypt");

const clickModel = require("../models/clickModel");
const urlModel = require("../models/urlModel");
const logger = require("../utils/logger");
const shortCodeUtil = require("../utils/shortCode");



/**
 * URL creation options interface
 */
interface CreateUrlOptions {
  userId?: number;
  originalUrl: string;
  customShortCode?: string;
  title?: string;
  expiryDate?: Date;
  isPasswordProtected?: boolean;
  password?: string;
  redirectType?: string;
}

/**
 * Creates a new shortened URL
 *
 * @param {CreateUrlOptions} options - URL creation options
 * @returns {Promise<any>} The created URL object
 */
exports.createShortenedUrl = async (options: CreateUrlOptions) => {
  const {
    userId,
    originalUrl,
    customShortCode,
    title,
    expiryDate,
    isPasswordProtected = false,
    password,
    redirectType = "302",
  } = options;

  // Generate or use custom short code
  let shortCode;
  if (customShortCode && shortCodeUtil.isValidShortCode(customShortCode)) {
    const exists = await urlModel.shortCodeExists(customShortCode);
    if (exists) {
      throw new Error("This custom short code is already taken");
    }
    shortCode = customShortCode;
  } else if (customShortCode) {
    shortCode = shortCodeUtil.sanitizeShortCode(customShortCode);
  } else {
    shortCode = await shortCodeUtil.generateUniqueShortCode();
  }

  // Hash password if needed
  let passwordHash = null;
  let hasPassword = false;
  if (isPasswordProtected && password) {
    passwordHash = await bcrypt.hash(password, 10);
    hasPassword = true;
  }

  // Create the URL entry
  const urlData = {
    user_id: userId,
    original_url: originalUrl,
    short_code: shortCode,
    title,
    expiry_date: expiryDate,
    is_active: true,
    has_password: hasPassword,
    password_hash: passwordHash,
    redirect_type: redirectType,
  };

  return await urlModel.createUrl(urlData);
};

/**
 * Retrieves a URL by its short code
 *
 * @param {string} shortCode - The short code to look up
 * @returns {Promise<any|null>} The URL object or null if not found
 */
exports.getUrlByShortCode = async (shortCode: string) => {
  return await urlModel.getUrlByShortCode(shortCode);
};

/**
 * Updates an existing URL
 *
 * @param {number} urlId - The URL ID to update
 * @param {object} updateData - Data to update
 * @returns {Promise<any|null>} The updated URL or null if not found
 */
exports.updateUrl = async (urlId: number, updateData: any) => {
  // Handle password updates if included
  if (updateData.password !== undefined) {
    if (updateData.password) {
      updateData.password_hash = await bcrypt.hash(updateData.password, 10);
      updateData.has_password = true;
    } else {
      updateData.password_hash = null;
      updateData.has_password = false;
    }
    delete updateData.password;
  }

  return await urlModel.updateUrl(urlId, updateData);
};

/**
 * Verifies a password for a password-protected URL
 *
 * @param {any} url - The URL object
 * @param {string} password - The password to verify
 * @returns {Promise<boolean>} Whether the password is correct
 */
exports.verifyUrlPassword = async (
  url: any,
  password: string
): Promise<boolean> => {
  if (!url.has_password || !url.password_hash) {
    return true; // No password protection
  }

  return await bcrypt.compare(password, url.password_hash);
};

/**
 * Records a click on a URL and returns the original URL
 *
 * @param {string} shortCode - The short code that was clicked
 * @param {object} clickInfo - Information about the click
 * @returns {Promise<string|null>} The original URL or null if not found/expired/inactive
 */
exports.recordClickAndGetOriginalUrl = async (
  shortCode: string,
  clickInfo: any
) => {
  try {
    // Get the URL
    const url = await urlModel.getUrlByShortCode(shortCode);

    // Check if URL exists and is active
    if (!url || !url.is_active) {
      logger.info(`URL not found or inactive for short code: ${shortCode}`);
      return null;
    }

    // Check if the URL has expired
    if (url.expiry_date && new Date(url.expiry_date) < new Date()) {
      logger.info(`URL expired for short code: ${shortCode}`);

      // Mark URL as inactive since it's expired
      await urlModel.updateUrl(url.id, { is_active: false });
      return null;
    }

    // Record the click with error handling
    try {
      await clickModel.recordClick({
        url_id: url.id,
        ip_address: clickInfo.ipAddress,
        user_agent: clickInfo.userAgent,
        referrer: clickInfo.referrer,
        country: clickInfo.country,
        device_type: clickInfo.deviceType,
        browser: clickInfo.browser,
      });
    } catch (error) {
      // If click recording fails, log the error but still allow the redirect
      logger.error(`Failed to record click for ${shortCode}:`, error);
    }

    return url.original_url;
  } catch (error) {
    logger.error(`Error processing redirect for ${shortCode}:`, error);
    return null;
  }
};

/**
 * Gets formatted analytics data for a URL
 *
 * @param {number} urlId - The URL ID
 * @returns {Promise<object>} Formatted analytics data
 */
exports.getUrlAnalytics = async (urlId: number) => {
  const totalClicks = await clickModel.getClickCountByUrlId(urlId);
  const browserStats = await clickModel.getBrowserStats(urlId);
  const deviceStats = await clickModel.getDeviceStats(urlId);

  // Format browser stats into an object
  const formattedBrowserStats: Record<string, number> = {};
  browserStats.forEach((stat: any) => {
    formattedBrowserStats[stat.browser || "unknown"] = parseInt(stat.count, 10);
  });

  // Format device stats into an object
  const formattedDeviceStats: Record<string, number> = {};
  deviceStats.forEach((stat: any) => {
    formattedDeviceStats[stat.device_type || "unknown"] = parseInt(
      stat.count,
      10
    );
  });

  return {
    totalClicks,
    browserStats: formattedBrowserStats,
    deviceStats: formattedDeviceStats,
  };
};

/**
 * Gets a URL with its analytics data
 *
 * @param {string} shortCode - The short code to look up
 * @returns {Promise<object|null>} URL with analytics or null if not found
 */
exports.getUrlWithAnalytics = async (shortCode: string) => {
  const url = await urlModel.getUrlByShortCode(shortCode);
  if (!url) {
    return null;
  }

  const analytics = await exports.getUrlAnalytics(url.id);

  return {
    ...url,
    analytics,
  };
};

/**
 * Gets comprehensive URL analytics with filtering options
 *
 * @param {number} urlId - The URL ID
 * @param {object} options - Analytics options
 * @param {Date} [options.startDate] - Start date for filtering
 * @param {Date} [options.endDate] - End date for filtering
 * @param {string} [options.groupBy] - Group time series by ('day', 'week', 'month')
 * @returns {Promise<object>} Comprehensive analytics data
 */
exports.getUrlAnalyticsWithFilters = async (
  urlId: number,
  options: any = {}
) => {
  const { startDate, endDate, groupBy = "day" } = options;

  // Get the URL details
  const url = await urlModel.getUrlById(urlId);
  if (!url) {
    throw new Error("URL not found");
  }

  // Parse dates if they are provided as strings
  const parsedStartDate = startDate ? new Date(startDate) : undefined;
  const parsedEndDate = endDate ? new Date(endDate) : undefined;

  // Gather all analytics data in parallel
  const [
    totalClicks,
    uniqueVisitors,
    timeSeriesData,
    browserStats,
    deviceStats,
    countryStats,
  ] = await Promise.all([
    clickModel.getClickCountByUrlIdWithDateRange(
      urlId,
      parsedStartDate,
      parsedEndDate
    ),
    clickModel.getUniqueVisitorsByUrlId(urlId, parsedStartDate, parsedEndDate),
    clickModel.getTimeSeriesData(
      urlId,
      groupBy,
      parsedStartDate,
      parsedEndDate
    ),
    clickModel.getBrowserStatsWithDateRange(
      urlId,
      parsedStartDate,
      parsedEndDate
    ),
    clickModel.getDeviceStatsWithDateRange(
      urlId,
      parsedStartDate,
      parsedEndDate
    ),
    clickModel.getCountryStatsWithDateRange(
      urlId,
      parsedStartDate,
      parsedEndDate
    ),
  ]);

  // Format browser stats into an object
  const formattedBrowserStats: Record<string, number> = {};
  browserStats.forEach((stat: any) => {
    formattedBrowserStats[stat.browser || "unknown"] = parseInt(stat.count, 10);
  });

  // Format device stats into an object
  const formattedDeviceStats: Record<string, number> = {};
  deviceStats.forEach((stat: any) => {
    formattedDeviceStats[stat.device_type || "unknown"] = parseInt(
      stat.count,
      10
    );
  });

  // Format country stats into an object
  const formattedCountryStats: Record<string, number> = {};
  countryStats.forEach((stat: any) => {
    formattedCountryStats[stat.country || "unknown"] = parseInt(stat.count, 10);
  });

  // Construct comprehensive analytics data
  return {
    url_id: url.id,
    short_code: url.short_code,
    total_clicks: totalClicks,
    unique_visitors: uniqueVisitors,
    time_series_data: timeSeriesData,
    browser_stats: formattedBrowserStats,
    device_stats: formattedDeviceStats,
    country_stats: formattedCountryStats,
  };
};
