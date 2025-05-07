/**
 * URL Service
 *
 * Provides business logic for URL shortening and management
 * @module services/urlService
 */

const bcrypt = require('bcrypt');
import logger from '../utils/logger';

const clickModel = require('../models/clickModel');
const urlModel = require('../models/urlModel');
const shortCodeUtil = require('../utils/shortCode');
const conversionGoalModel = require('../models/conversionGoalModel');
const pool = require('../config/database');

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
  goalId?: number;
}

/**
 * URL filter and pagination options interface
 */
interface UrlFilterOptions {
  status?: 'all' | 'active' | 'inactive' | 'expired' | 'expiring-soon';
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
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
    redirectType = '302',
    goalId,
  } = options;

  // Generate or use custom short code
  let shortCode;
  if (customShortCode && shortCodeUtil.isValidShortCode(customShortCode)) {
    const exists = await urlModel.shortCodeExists(customShortCode);
    if (exists) {
      throw new Error('This custom short code is already taken');
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

  // Create the URL first
  const newUrl = await urlModel.createUrl(urlData);

  // If goalId is provided, associate it with the URL
  if (goalId && newUrl.id) {
    try {
      // Check if the goal exists first
      const goal = await conversionGoalModel.getGoalById(goalId);
      if (goal) {
        await conversionGoalModel.associateGoalWithUrl({
          url_id: newUrl.id,
          goal_id: goalId,
        });
        logger.info(`Associated goal ID ${goalId} with URL ID ${newUrl.id}`);
      } else {
        logger.warn(`Goal ID ${goalId} not found, URL created without goal association`);
      }
    } catch (error) {
      logger.error(`Error associating goal with URL: ${error}`);
      // Don't fail the URL creation if goal association fails
    }
  }

  return newUrl;
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
  try {
    logger.info(
      `URL update processing - URL ID: ${urlId}, Fields: ${Object.keys(updateData).join(', ')}`,
    );

    // Sanitize the update data to ensure only valid fields are updated
    const validFields = [
      'title',
      'original_url',
      'expiry_date',
      'is_active',
      'password',
      'short_code',
    ];
    const sanitizedUpdateData: Record<string, any> = {};

    Object.keys(updateData).forEach(key => {
      if (validFields.includes(key) && updateData[key] !== undefined) {
        sanitizedUpdateData[key] = updateData[key];
      }
    });

    // Validate short_code if provided
    if (sanitizedUpdateData.short_code !== undefined) {
      // Validate short code format
      if (!shortCodeUtil.isValidShortCode(sanitizedUpdateData.short_code)) {
        throw new Error('Invalid short code format');
      }

      // Check if the short code is already in use by another URL
      const exists = await urlModel.shortCodeExists(sanitizedUpdateData.short_code);
      if (exists) {
        // Get the URL with this short code to see if it's the same URL we're updating
        const existingUrl = await urlModel.getUrlByShortCode(sanitizedUpdateData.short_code);
        if (existingUrl && existingUrl.id !== urlId) {
          logger.warn(
            `Short code already in use - URL ID: ${urlId}, Short Code: ${sanitizedUpdateData.short_code}`,
          );
          throw new Error('This short code is already taken');
        }
      }
    }

    // Handle password updates if included
    if (sanitizedUpdateData.password !== undefined) {
      if (sanitizedUpdateData.password) {
        sanitizedUpdateData.password_hash = await bcrypt.hash(sanitizedUpdateData.password, 10);
        sanitizedUpdateData.has_password = true;
      } else {
        sanitizedUpdateData.password_hash = null;
        sanitizedUpdateData.has_password = false;
      }
      delete sanitizedUpdateData.password;
    }

    // If no valid fields to update, return early
    if (Object.keys(sanitizedUpdateData).length === 0) {
      logger.warn(`No valid fields to update - URL ID: ${urlId}`);
      return null;
    }

    // Update the URL
    const updatedUrl = await urlModel.updateUrl(urlId, sanitizedUpdateData);

    if (!updatedUrl) {
      logger.warn(`URL update operation returned no results - URL ID: ${urlId}`);
      return null;
    }

    logger.info(`URL update completed - URL ID: ${urlId}`);
    return updatedUrl;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`URL update error - URL ID: ${urlId}, Error: ${errorMessage}`);
    throw error;
  }
};

/**
 * Verifies a password for a password-protected URL
 *
 * @param {any} url - The URL object
 * @param {string} password - The password to verify
 * @returns {Promise<boolean>} Whether the password is correct
 */
exports.verifyUrlPassword = async (url: any, password: string): Promise<boolean> => {
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
 * @param {boolean} returnClickId - Whether to return the click ID
 * @returns {Promise<string|object|null>} The original URL, or object with originalUrl and clickId, or null if not found/expired/inactive
 */
exports.recordClickAndGetOriginalUrl = async (
  shortCode: string,
  clickInfo: any,
  returnClickId: boolean = false,
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
    let clickRecord;
    try {
      clickRecord = await clickModel.recordClick({
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

    // Return appropriate result based on returnClickId flag
    if (returnClickId && clickRecord) {
      return {
        originalUrl: url.original_url,
        clickId: clickRecord.id,
        urlId: url.id,
      };
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
    formattedBrowserStats[stat.browser || 'unknown'] = parseInt(stat.count, 10);
  });

  // Format device stats into an object
  const formattedDeviceStats: Record<string, number> = {};
  deviceStats.forEach((stat: any) => {
    formattedDeviceStats[stat.device_type || 'unknown'] = parseInt(stat.count, 10);
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
exports.getUrlAnalyticsWithFilters = async (urlId: number, options: any = {}) => {
  const { startDate, endDate, groupBy = 'day' } = options;

  // Get the URL details
  const url = await urlModel.getUrlById(urlId);
  if (!url) {
    throw new Error('URL not found');
  }

  // Parse dates if they are provided as strings
  const parsedStartDate = startDate ? new Date(startDate) : undefined;
  const parsedEndDate = endDate ? new Date(endDate) : undefined;

  // Gather all analytics data in parallel
  const [totalClicks, uniqueVisitors, timeSeriesData, browserStats, deviceStats, countryStats] =
    await Promise.all([
      clickModel.getClickCountByUrlIdWithDateRange(urlId, parsedStartDate, parsedEndDate),
      clickModel.getUniqueVisitorsByUrlId(urlId, parsedStartDate, parsedEndDate),
      clickModel.getTimeSeriesData(urlId, groupBy, parsedStartDate, parsedEndDate),
      clickModel.getBrowserStatsWithDateRange(urlId, parsedStartDate, parsedEndDate),
      clickModel.getDeviceStatsWithDateRange(urlId, parsedStartDate, parsedEndDate),
      clickModel.getCountryStatsWithDateRange(urlId, parsedStartDate, parsedEndDate),
    ]);

  // Format browser stats into an object
  const formattedBrowserStats: Record<string, number> = {};
  browserStats.forEach((stat: any) => {
    formattedBrowserStats[stat.browser || 'unknown'] = parseInt(stat.count, 10);
  });

  // Format device stats into an object
  const formattedDeviceStats: Record<string, number> = {};
  deviceStats.forEach((stat: any) => {
    formattedDeviceStats[stat.device_type || 'unknown'] = parseInt(stat.count, 10);
  });

  // Format country stats into an object
  const formattedCountryStats: Record<string, number> = {};
  countryStats.forEach((stat: any) => {
    formattedCountryStats[stat.country || 'unknown'] = parseInt(stat.count, 10);
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

/**
 * Gets URLs with optional filtering by status
 *
 * @param {number} userId - The user ID
 * @param {UrlFilterOptions} options - Filter and pagination options
 * @returns {Promise<{urls: any[], pagination: any, filter_info: any}>} URLs with pagination and filter info
 */
exports.getUrlsWithStatusFilter = async (userId: number, options: UrlFilterOptions) => {
  const {
    status = 'all',
    page = 1,
    limit = 10,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = options;

  // Validate status parameter
  const validStatuses = ['all', 'active', 'inactive', 'expired', 'expiring-soon'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status parameter. Must be one of: ${validStatuses.join(', ')}`);
  }

  // If sorting by clicks, we need to get all URLs first before sorting
  const modifiedOptions: UrlFilterOptions = {
    status,
    sortBy: sortBy === 'clicks' ? 'created_at' : sortBy, // Default sort for database query if sorting by clicks
    sortOrder,
    page,
    limit,
  };

  // Skip pagination at database level if sorting by clicks
  if (sortBy === 'clicks') {
    // Get all URLs with filter (without pagination)
    modifiedOptions.limit = 1000; // High limit to get all URLs
    modifiedOptions.page = 1;
  } else {
    // Use requested pagination if not sorting by clicks
    modifiedOptions.page = page;
    modifiedOptions.limit = limit;
  }

  // Get URLs with filter
  const { urls, total, total_all } = await urlModel.getUrlsByUserWithFilters(
    userId,
    modifiedOptions,
  );

  console.log(
    `getUrlsWithStatusFilter - Retrieved ${urls.length} URLs with status ${status} before processing (total in database: ${total})`,
  );

  // For each URL, get the click count and calculate status and days until expiry
  const processedUrls = await Promise.all(
    urls.map(async (url: any) => {
      const clickCount = await clickModel.getClickCountByUrlId(url.id);

      // Format expiry_date if it exists
      const expiryDate = url.expiry_date ? new Date(url.expiry_date) : null;
      const expiryDateISO = expiryDate ? expiryDate.toISOString() : null;

      // Generate the full short URL
      const baseUrl = process.env.SHORT_URL_BASE ?? 'https://cylink.id/';
      const shortUrl = baseUrl + url.short_code;

      // Calculate URL status and days until expiry
      let urlStatus: 'active' | 'inactive' | 'expired' | 'expiring-soon';
      let daysUntilExpiry: number | null = null;

      const now = new Date();

      if (!url.is_active) {
        urlStatus = 'inactive';
      } else if (expiryDate && expiryDate < now) {
        urlStatus = 'expired';
      } else if (expiryDate) {
        // Calculate days until expiry
        const diffTime = expiryDate.getTime() - now.getTime();
        daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry <= 7) {
          urlStatus = 'expiring-soon';
        } else {
          urlStatus = 'active';
        }
      } else {
        urlStatus = 'active';
      }

      // Create URL with status data
      return {
        id: url.id,
        original_url: url.original_url,
        short_code: url.short_code,
        short_url: shortUrl,
        title: url.title ?? null,
        clicks: clickCount,
        created_at: new Date(url.created_at).toISOString(),
        expiry_date: expiryDateISO,
        is_active: url.is_active,
        status: urlStatus,
        days_until_expiry: daysUntilExpiry,
      };
    }),
  );

  // Apply sorting by clicks if requested (since this can't be done at the database level)
  if (sortBy === 'clicks') {
    processedUrls.sort((a, b) => {
      if (sortOrder === 'desc') {
        return b.clicks - a.clicks;
      } else {
        return a.clicks - b.clicks;
      }
    });

    // Log top URLs after sorting by clicks for debugging
    if (sortOrder === 'desc') {
      const topUrls = processedUrls.slice(0, 5).map(url => ({
        id: url.id,
        short_code: url.short_code,
        clicks: url.clicks,
      }));
      console.log(`getUrlsWithStatusFilter - Top 5 URLs by clicks: ${JSON.stringify(topUrls)}`);
    }
  } else if (sortBy === 'title') {
    // Sort alphabetically by title
    processedUrls.sort((a, b) => {
      // Handle null titles by treating them as empty strings
      const titleA = a.title || '';
      const titleB = b.title || '';

      // Apply sort direction
      return sortOrder === 'asc' ? titleA.localeCompare(titleB) : titleB.localeCompare(titleA);
    });
  }

  // Apply pagination manually for clicks sorting
  let paginatedUrls = processedUrls;
  if (sortBy === 'clicks') {
    const startIndex = (page - 1) * limit;
    paginatedUrls = processedUrls.slice(startIndex, startIndex + limit);
  }

  // Calculate pagination data
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Prepare response objects
  const pagination = {
    total,
    page,
    limit,
    total_pages: totalPages,
  };

  const filterInfo = {
    status,
    total_matching: total,
    total_all,
  };

  return {
    urls: paginatedUrls,
    pagination,
    filter_info: filterInfo,
  };
};

/**
 * Gets URLs with combined status filtering and search functionality
 *
 * @param {number} userId - The user ID
 * @param {UrlFilterOptions} options - Filter and pagination options including search
 * @returns {Promise<{urls: any[], pagination: any, filter_info: any, search_info: any}>} URLs with pagination, filter and search info
 */
exports.getUrlsWithStatusAndSearch = async (userId: number, options: UrlFilterOptions) => {
  const {
    status = 'all',
    search = '',
    page = 1,
    limit = 10,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = options;

  // Validate status parameter
  const validStatuses = ['all', 'active', 'inactive', 'expired', 'expiring-soon'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status parameter. Must be one of: ${validStatuses.join(', ')}`);
  }

  // Validate search parameter
  if (search && search.length < 2) {
    throw new Error('Search term must be at least 2 characters long');
  }

  try {
    // Perform search first to get matching URLs
    const {
      results,
      total: searchTotal,
      highlights,
    } = await urlModel.searchUrls(
      userId,
      search,
      1, // Get all results first, then we'll filter and paginate
      1000, // High limit to get more results for filtering
      sortBy,
      sortOrder,
    );

    // Count all URLs for the user (unfiltered)
    const totalAllQuery = `SELECT COUNT(*) FROM urls WHERE user_id = $1 AND deleted_at IS NULL`;
    const totalAllResult = await pool.query(totalAllQuery, [userId]);
    const totalAll = parseInt(totalAllResult.rows[0].count, 10);

    // If no search results, return empty with proper metadata
    if (!results || results.length === 0) {
      const pagination = {
        total: 0,
        page,
        limit,
        total_pages: 0,
      };

      const filterInfo = {
        status,
        total_matching: 0,
        total_all: totalAll,
      };

      const searchInfo = {
        term: search,
        fields_searched: ['original_url', 'short_code', 'title'],
        total_matches: 0,
      };

      return {
        urls: [],
        pagination,
        filter_info: filterInfo,
        search_info: searchInfo,
      };
    }

    console.log(
      `getUrlsWithStatusAndSearch - Found ${results.length} URLs matching search "${search}"`,
    );

    // Now filter the search results by status
    let filteredResults = [...results];
    const now = new Date();

    if (status !== 'all') {
      filteredResults = results.filter((url: any) => {
        const expiryDate = url.expiry_date ? new Date(url.expiry_date) : null;

        if (status === 'active') {
          // Active URLs: not expired and is_active = true
          return url.is_active && (!expiryDate || expiryDate > now);
        } else if (status === 'inactive') {
          // Inactive URLs: is_active = false
          return !url.is_active;
        } else if (status === 'expired') {
          // Expired URLs: expiry_date < current date
          return expiryDate && expiryDate < now;
        } else if (status === 'expiring-soon') {
          // Expiring soon: expires within the next 7 days, not yet expired
          if (!expiryDate || expiryDate <= now) {
            return false;
          }
          // Calculate days until expiry
          const diffTime = expiryDate.getTime() - now.getTime();
          const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return daysUntilExpiry <= 7;
        }
        return false;
      });
    }

    console.log(
      `getUrlsWithStatusAndSearch - After status filter: ${filteredResults.length} URLs with status "${status}"`,
    );

    // If we need to sort by clicks, we need to get click counts for all filtered URLs before pagination
    if (sortBy === 'clicks') {
      // Fetch click counts for all filtered results
      const urlsWithClicks = await Promise.all(
        filteredResults.map(async url => {
          const clickCount = await clickModel.getClickCountByUrlId(url.id);
          return { ...url, clicks: clickCount };
        }),
      );

      // Sort by clicks before pagination
      urlsWithClicks.sort((a, b) => {
        if (sortOrder === 'desc') {
          return b.clicks - a.clicks;
        } else {
          return a.clicks - b.clicks;
        }
      });

      // Log top URLs after sorting by clicks for debugging
      if (sortOrder === 'desc') {
        const topUrls = urlsWithClicks.slice(0, 5).map(url => ({
          id: url.id,
          short_code: url.short_code,
          clicks: url.clicks,
        }));
        console.log(
          `getUrlsWithStatusAndSearch - Top 5 URLs by clicks: ${JSON.stringify(topUrls)}`,
        );
      }

      // Replace filteredResults with sorted results
      filteredResults = urlsWithClicks;
    } else if (sortBy === 'title') {
      // Sort alphabetically by title before pagination
      filteredResults.sort((a, b) => {
        // Handle null titles by treating them as empty strings
        const titleA = a.title || '';
        const titleB = b.title || '';

        // Apply sort direction
        return sortOrder === 'asc' ? titleA.localeCompare(titleB) : titleB.localeCompare(titleA);
      });
    }

    // Apply pagination to the filtered (and possibly sorted) results
    const totalFiltered = filteredResults.length;
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, totalFiltered);
    const paginatedResults = filteredResults.slice(startIndex, endIndex);

    // For each URL, get the click count and calculate status and days until expiry
    const processedUrls = await Promise.all(
      paginatedResults.map(async url => {
        // If we've already fetched the clicks for sorting, use that value
        const clickCount =
          url.clicks !== undefined ? url.clicks : await clickModel.getClickCountByUrlId(url.id);

        // Format expiry_date if it exists
        const expiryDate = url.expiry_date ? new Date(url.expiry_date) : null;
        const expiryDateISO = expiryDate ? expiryDate.toISOString() : null;

        // Generate the full short URL
        const baseUrl = process.env.SHORT_URL_BASE ?? 'https://cylink.id/';
        const shortUrl = baseUrl + url.short_code;

        // Calculate URL status and days until expiry
        let urlStatus: 'active' | 'inactive' | 'expired' | 'expiring-soon';
        let daysUntilExpiry: number | null = null;

        if (!url.is_active) {
          urlStatus = 'inactive';
        } else if (expiryDate && expiryDate < now) {
          urlStatus = 'expired';
        } else if (expiryDate) {
          // Calculate days until expiry
          const diffTime = expiryDate.getTime() - now.getTime();
          daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (daysUntilExpiry <= 7) {
            urlStatus = 'expiring-soon';
          } else {
            urlStatus = 'active';
          }
        } else {
          urlStatus = 'active';
        }

        // Create URL with status data and search highlights
        return {
          id: url.id,
          original_url: url.original_url,
          short_code: url.short_code,
          short_url: shortUrl,
          title: url.title ?? null,
          clicks: clickCount,
          created_at: new Date(url.created_at).toISOString(),
          expiry_date: expiryDateISO,
          is_active: url.is_active,
          status: urlStatus,
          days_until_expiry: daysUntilExpiry,
          matches: highlights[url.id] || null,
        };
      }),
    );

    // Calculate pagination data
    const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));

    // Prepare response objects
    const pagination = {
      total: totalFiltered,
      page,
      limit,
      total_pages: totalPages,
    };

    const filterInfo = {
      status,
      total_matching: totalFiltered,
      total_all: totalAll,
    };

    const searchInfo = {
      term: search,
      fields_searched: ['original_url', 'short_code', 'title'],
      total_matches: searchTotal,
    };

    return {
      urls: processedUrls,
      pagination,
      filter_info: filterInfo,
      search_info: searchInfo,
    };
  } catch (error) {
    // Re-throw with better context
    if (error instanceof Error) {
      throw new Error(`Error filtering and searching URLs: ${error.message}`);
    }
    throw error;
  }
};
