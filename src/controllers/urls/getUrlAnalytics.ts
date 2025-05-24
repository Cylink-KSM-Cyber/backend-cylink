/**
 * Get URL Analytics Controller
 *
 * Controller for retrieving analytics data for a specific URL with time range and grouping options.
 * Enhanced to include comprehensive analytics data by consolidating features from
 * /api/v1/urls/total-clicks and /api/v1/urls/{url_id}/ctr endpoints.
 *
 * @module controllers/urls/getUrlAnalytics
 */

import { Request, Response } from 'express';
import { AnalyticsOptions, EnhancedAnalyticsOptions } from '../../interfaces/URL';
import logger from '../../utils/logger';
import { sendResponse } from '../../utils/response';
import {
  parseAnalyticsDates,
  determineComparisonPeriod,
  calculateDaysBetween,
  formatISODate,
} from '../../utils/analyticsUtils';

const urlModel = require('../../models/urlModel');
const urlService = require('../../services/urlService');
const clickModel = require('../../models/clickModel');
const impressionModel = require('../../models/impressionModel');

/**
 * Validates the URL ID from request parameters
 *
 * @param {string} idParam - The ID parameter from request
 * @returns {{ isValid: boolean, value?: number, errorMessage?: string }} Validation result
 */
const validateUrlId = (
  idParam: string,
): { isValid: boolean; value?: number; errorMessage?: string } => {
  const urlId = parseInt(idParam);

  if (isNaN(urlId)) {
    return { isValid: false, errorMessage: 'Invalid URL ID' };
  }

  return { isValid: true, value: urlId };
};

/**
 * Checks if the URL exists and belongs to the authenticated user
 *
 * @param {number} urlId - The URL ID to check
 * @param {number} userId - The authenticated user ID
 * @returns {Promise<{ isAuthorized: boolean, url?: any, errorCode?: number, errorMessage?: string }>} Authorization result
 */
const checkUrlAuthorization = async (
  urlId: number,
  userId: number,
): Promise<{ isAuthorized: boolean; url?: any; errorCode?: number; errorMessage?: string }> => {
  try {
    // Check if URL exists
    const url = await urlModel.getUrlById(urlId);

    if (!url) {
      return {
        isAuthorized: false,
        errorCode: 404,
        errorMessage: 'URL not found',
      };
    }

    // Check if the URL belongs to the authenticated user
    if (url.user_id && url.user_id !== userId) {
      return {
        isAuthorized: false,
        errorCode: 401,
        errorMessage: 'Unauthorized',
      };
    }

    return { isAuthorized: true, url };
  } catch (error) {
    logger.error(`Error checking URL authorization: ${error}`);
    return {
      isAuthorized: false,
      errorCode: 500,
      errorMessage: 'Internal server error',
    };
  }
};

/**
 * Extracts and validates the analytics options from the request query parameters
 *
 * @param {Request} req - Express request object
 * @returns {EnhancedAnalyticsOptions} Formatted analytics options
 */
const extractAnalyticsOptions = (req: Request): EnhancedAnalyticsOptions => {
  const {
    start_date,
    end_date,
    group_by,
    comparison,
    custom_comparison_start,
    custom_comparison_end,
    page,
    limit,
  } = req.query;

  const options: EnhancedAnalyticsOptions = {};

  if (start_date) {
    options.startDate = start_date as string;
  }

  if (end_date) {
    options.endDate = end_date as string;
  }

  if (group_by && ['day', 'week', 'month'].includes(group_by as string)) {
    options.groupBy = group_by as 'day' | 'week' | 'month';
  }

  if (comparison && ['7', '14', '30', '90', 'custom'].includes(comparison as string)) {
    options.comparison = comparison as string;
  }

  if (custom_comparison_start) {
    options.customComparisonStart = custom_comparison_start as string;
  }

  if (custom_comparison_end) {
    options.customComparisonEnd = custom_comparison_end as string;
  }

  if (page) {
    const pageValue = parseInt(page as string, 10);
    if (!isNaN(pageValue) && pageValue > 0) {
      options.page = pageValue;
    }
  }

  if (limit) {
    const limitValue = parseInt(limit as string, 10);
    if (!isNaN(limitValue) && limitValue > 0) {
      options.limit = limitValue;
    }
  }

  return options;
};

/**
 * Handles errors during URL analytics retrieval
 *
 * @param {unknown} error - The error that occurred
 * @param {Response} res - Express response object
 * @returns {Response} Error response
 */
const handleError = (error: unknown, res: Response): Response => {
  if (error instanceof Error && error.message === 'URL not found') {
    return sendResponse(res, 404, 'URL not found');
  } else if (error instanceof Error && error.message.includes('Invalid parameters')) {
    logger.error('URL error: Invalid parameters while retrieving analytics:', error.message);
    return sendResponse(res, 400, error.message);
  } else if (error instanceof TypeError) {
    logger.error('URL error: Type error while retrieving analytics:', error.message);
    return sendResponse(res, 400, 'Invalid request format');
  } else if (error instanceof Error) {
    logger.error('URL error: Failed to retrieve URL analytics:', error.message);
    return sendResponse(res, 500, 'Internal Server Error');
  } else {
    logger.error('URL error: Unknown error while retrieving analytics:', String(error));
    return sendResponse(res, 500, 'Internal server error');
  }
};

/**
 * Get comprehensive analytics for a specific URL
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with URL analytics or error
 */
export const getUrlAnalytics = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Get user ID from authentication token
    const userId = req.body.id;

    // Guard clause: Validate URL ID
    const validation = validateUrlId(req.params.id);
    if (!validation.isValid) {
      return sendResponse(res, 400, validation.errorMessage || 'Invalid URL ID');
    }
    const urlId = validation.value!;

    // Guard clause: Check if URL exists and user has permission
    const authCheck = await checkUrlAuthorization(urlId, userId);
    if (!authCheck.isAuthorized) {
      return sendResponse(
        res,
        authCheck.errorCode || 401,
        authCheck.errorMessage || 'Unauthorized',
      );
    }

    // Extract and prepare analytics options from request query
    const options = extractAnalyticsOptions(req);

    // Guard clause: Parse and validate dates
    const dateResult = parseAnalyticsDates(options.startDate, options.endDate);
    if ('error' in dateResult) {
      return sendResponse(res, 400, dateResult.error || 'Invalid date parameters');
    }

    // Destructure with non-null assertion since we've checked for errors
    const { startDate, endDate } = dateResult;

    // Guard clause: Ensure dates are defined
    if (!startDate || !endDate) {
      return sendResponse(res, 400, 'Invalid date parameters: dates could not be parsed');
    }

    // Get comparison period data if requested
    let comparisonPeriodData = null;
    if (options.comparison) {
      const comparisonResult = determineComparisonPeriod(
        options.comparison,
        startDate,
        options.customComparisonStart,
        options.customComparisonEnd,
      );

      if ('error' in comparisonResult) {
        return sendResponse(res, 400, comparisonResult.error || 'Invalid comparison parameters');
      }

      const { comparisonPeriodDays, previousPeriodStartDate, previousPeriodEndDate } =
        comparisonResult;

      // Guard clause: Ensure comparison period dates are defined
      if (!comparisonPeriodDays || !previousPeriodStartDate || !previousPeriodEndDate) {
        return sendResponse(res, 400, 'Invalid comparison parameters: dates could not be parsed');
      }

      comparisonPeriodData = {
        comparisonPeriodDays,
        previousPeriodStartDate,
        previousPeriodEndDate,
      };
    }

    // Prepare parameters for service calls
    const analyticOptions: AnalyticsOptions = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      groupBy: options.groupBy || 'day',
    };

    // Prepare pagination options
    const paginationOptions = {
      page: options.page || 1,
      limit: options.limit || 30,
    };

    // Get base analytics data
    const baseAnalytics = await urlService.getUrlAnalyticsWithFilters(urlId, analyticOptions);

    // Prepare comprehensive response
    const comprehensiveAnalytics: any = {
      ...baseAnalytics,
    };

    // Add historical analysis if comparison is requested
    if (comparisonPeriodData) {
      const { comparisonPeriodDays, previousPeriodStartDate, previousPeriodEndDate } =
        comparisonPeriodData;

      // Get click data for the current and previous periods
      const [historicalClicks, topPerformingDays, previousPeriodClicks] = await Promise.all([
        clickModel.getTimeSeriesData(
          urlId,
          options.groupBy || 'day',
          startDate,
          endDate,
          paginationOptions,
        ),
        clickModel.getTopPerformingDays(urlId, {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          limit: 5,
        }),
        clickModel.getTimeSeriesData(
          urlId,
          options.groupBy || 'day',
          previousPeriodStartDate,
          previousPeriodEndDate,
        ),
      ]);

      // Calculate comparison metrics
      const currentTotalClicks = baseAnalytics.total_clicks;
      const previousTotalClicks = previousPeriodClicks.reduce(
        (sum: number, item: any) => sum + parseInt(item.clicks, 10),
        0,
      );

      const clickChange = currentTotalClicks - previousTotalClicks;
      const clickChangePercentage =
        previousTotalClicks > 0 ? (clickChange / previousTotalClicks) * 100 : 0;

      // Add historical analysis to the response
      comprehensiveAnalytics.historical_analysis = {
        summary: {
          analysis_period: {
            start_date: formatISODate(startDate),
            end_date: formatISODate(endDate),
            days: calculateDaysBetween(startDate, endDate),
          },
          comparison: {
            period_days: comparisonPeriodDays,
            previous_period: {
              start_date: formatISODate(previousPeriodStartDate),
              end_date: formatISODate(previousPeriodEndDate),
            },
            total_clicks: {
              current: currentTotalClicks,
              previous: previousTotalClicks,
              change: clickChange,
              change_percentage: parseFloat(clickChangePercentage.toFixed(2)),
            },
          },
        },
        time_series: {
          data: historicalClicks,
          pagination: {
            page: paginationOptions.page,
            limit: paginationOptions.limit,
            total: historicalClicks.length,
            total_pages: Math.ceil(historicalClicks.length / paginationOptions.limit),
          },
        },
        top_performing_days: topPerformingDays,
      };
    }

    // Add CTR statistics if available
    try {
      // Get CTR statistics for this URL
      const ctrStats = await impressionModel.getOverallCTRStats(
        urlId,
        null,
        startDate,
        endDate,
        comparisonPeriodData?.previousPeriodStartDate || null,
        comparisonPeriodData?.previousPeriodEndDate || null,
      );

      if (ctrStats) {
        // Build CTR statistics section
        const ctrStatistics: any = {
          overall: {
            total_impressions: ctrStats.current_period.total_impressions,
            total_clicks: ctrStats.current_period.total_clicks,
            ctr: ctrStats.current_period.ctr,
            unique_impressions: ctrStats.current_period.unique_impressions,
            unique_ctr: ctrStats.current_period.unique_ctr,
          },
        };

        // Add comparison data if available
        if (comparisonPeriodData && ctrStats.previous_period) {
          ctrStatistics.comparison = {
            period_days: comparisonPeriodData.comparisonPeriodDays,
            previous_period: {
              start_date: formatISODate(comparisonPeriodData.previousPeriodStartDate),
              end_date: formatISODate(comparisonPeriodData.previousPeriodEndDate),
            },
            metrics: {
              impressions: ctrStats.comparison.impressions,
              clicks: ctrStats.comparison.clicks,
              ctr: ctrStats.comparison.ctr,
            },
          };
        }

        // Add time series data
        if (options.groupBy) {
          const timeSeriesData = await impressionModel.getCTRTimeSeries(
            urlId,
            null,
            startDate,
            endDate,
            options.groupBy,
          );

          ctrStatistics.time_series = {
            data: timeSeriesData,
          };
        }

        // Add top performing days
        const topDays = await impressionModel.getTopPerformingDays(
          urlId,
          null,
          startDate,
          endDate,
          5, // Top 5 days
        );

        ctrStatistics.top_performing_days = topDays;

        // Add CTR by source
        const sourceStats = await impressionModel.getCTRBySource(urlId, null, startDate, endDate);
        ctrStatistics.ctr_by_source = sourceStats;

        // Add CTR statistics to the comprehensive analytics
        comprehensiveAnalytics.ctr_statistics = ctrStatistics;
      }
    } catch (error) {
      // Log but don't fail if CTR statistics are unavailable
      logger.warn(`Unable to retrieve CTR statistics for URL ${urlId}: ${error}`);
    }

    logger.info(`Successfully retrieved comprehensive analytics for URL ID ${urlId}`);

    return sendResponse(
      res,
      200,
      'Successfully retrieved comprehensive URL analytics',
      comprehensiveAnalytics,
    );
  } catch (error: unknown) {
    return handleError(error, res);
  }
};

export default getUrlAnalytics;
