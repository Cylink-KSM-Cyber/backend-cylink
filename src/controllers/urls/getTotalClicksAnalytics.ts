/**
 * Get Total Clicks Analytics Controller
 *
 * Controller for retrieving total clicks analytics across all URLs for an authenticated user.
 * Provides time series data, comparison metrics, and top performing days.
 *
 * @module controllers/urls/getTotalClicksAnalytics
 */

import { Request, Response } from 'express';
import { TotalClicksAnalyticsResponse } from '../../interfaces/URL';
import logger from '../../libs/winston/winston.service';
import {
  parseAnalyticsDates,
  determineComparisonPeriod,
  calculateComparisonMetrics,
  formatISODate,
  calculateDaysBetween,
} from '../../utils/analyticsUtils';
import { sendResponse } from '../../utils/response';

const clickModel = require('../../models/clickModel');

/**
 * Validates the user authentication
 *
 * @param {number|undefined} userId - User ID from authentication token
 * @returns {{isValid: boolean, errorCode?: number, errorMessage?: string}} Validation result
 */
const validateAuthentication = (
  userId: number | undefined,
): { isValid: boolean; errorCode?: number; errorMessage?: string } => {
  if (!userId) {
    return {
      isValid: false,
      errorCode: 401,
      errorMessage: 'Unauthorized: No user ID',
    };
  }

  return { isValid: true };
};

/**
 * Extract and parse query parameters for analytics
 *
 * @param {Request} req - Express request object
 * @returns {{
 *   startDateString: string,
 *   endDateString: string,
 *   comparison: string,
 *   customComparisonStartString?: string,
 *   customComparisonEndString?: string,
 *   groupBy: 'day'|'week'|'month',
 *   page: number,
 *   limit: number
 * }} Parsed query parameters
 */
const extractQueryParams = (req: Request) => {
  const startDateString = req.query.start_date as string;
  const endDateString = req.query.end_date as string;
  const comparison = (req.query.comparison as string) ?? '30';
  const customComparisonStartString = req.query.custom_comparison_start as string | undefined;
  const customComparisonEndString = req.query.custom_comparison_end as string | undefined;
  const groupBy = (req.query.group_by as 'day' | 'week' | 'month') ?? 'day';
  const page = parseInt(req.query.page as string) ?? 1;
  // Cap limit at 90 data points
  const limit = Math.min(parseInt(req.query.limit as string) || 30, 90);

  return {
    startDateString,
    endDateString,
    comparison,
    customComparisonStartString,
    customComparisonEndString,
    groupBy,
    page,
    limit,
  };
};

/**
 * Formats and constructs the analytics response data
 *
 * @param {Object} params - Parameters for formatting the response
 * @param {any[]} params.clicksAnalytics - Time series click analytics data
 * @param {any} params.summary - Summary data for current period
 * @param {any[]} params.topPerformingDays - Top performing days data
 * @param {number} params.activeUrlsCount - Count of active URLs in current period
 * @param {any} params.previousSummary - Summary data for previous period
 * @param {number} params.previousActiveUrlsCount - Count of active URLs in previous period
 * @param {Date} params.startDate - Current period start date
 * @param {Date} params.endDate - Current period end date
 * @param {number} params.analysisPeriodDays - Number of days in analysis period
 * @param {number} params.comparisonPeriodDays - Number of days in comparison period
 * @param {Date} params.previousPeriodStartDate - Previous period start date
 * @param {Date} params.previousPeriodEndDate - Previous period end date
 * @param {number} params.page - Current page number
 * @param {number} params.limit - Items per page
 * @returns {TotalClicksAnalyticsResponse} Formatted analytics response data
 */
const formatResponseData = ({
  clicksAnalytics,
  summary,
  topPerformingDays,
  activeUrlsCount,
  previousSummary,
  previousActiveUrlsCount,
  startDate,
  endDate,
  analysisPeriodDays,
  comparisonPeriodDays,
  previousPeriodStartDate,
  previousPeriodEndDate,
  page,
  limit,
}: {
  clicksAnalytics: any[];
  summary: any;
  topPerformingDays: any[];
  activeUrlsCount: number;
  previousSummary: any;
  previousActiveUrlsCount: number;
  startDate: Date;
  endDate: Date;
  analysisPeriodDays: number;
  comparisonPeriodDays: number;
  previousPeriodStartDate: Date;
  previousPeriodEndDate: Date;
  page: number;
  limit: number;
}): TotalClicksAnalyticsResponse => {
  // Apply pagination to time series data
  const totalItems = clicksAnalytics.length;
  const totalPages = Math.ceil(totalItems / limit);
  const offset = (page - 1) * limit;
  const paginatedTimeSeries = clicksAnalytics.slice(offset, offset + limit);

  // Format dates for response
  const analysisStartDateStr = formatISODate(startDate);
  const analysisEndDateStr = formatISODate(endDate);
  const prevStartDateStr = formatISODate(previousPeriodStartDate);
  const prevEndDateStr = formatISODate(previousPeriodEndDate);

  // Calculate comparison metrics
  const comparisonMetrics = calculateComparisonMetrics(
    summary,
    previousSummary,
    activeUrlsCount || 0,
    previousActiveUrlsCount || 0,
  );

  // Construct the response
  return {
    summary: {
      total_clicks: summary?.total_clicks ?? 0,
      total_urls: summary?.total_urls ?? 0,
      avg_clicks_per_url: summary?.avg_clicks_per_url ?? 0,
      analysis_period: {
        start_date: analysisStartDateStr,
        end_date: analysisEndDateStr,
        days: analysisPeriodDays,
      },
      comparison: {
        period_days: comparisonPeriodDays,
        previous_period: {
          start_date: prevStartDateStr,
          end_date: prevEndDateStr,
        },
        ...comparisonMetrics,
      },
    },
    time_series: {
      data: paginatedTimeSeries,
      pagination: {
        total_items: totalItems,
        total_pages: totalPages,
        current_page: page,
        limit,
      },
    },
    top_performing_days: topPerformingDays,
  };
};

/**
 * Handle errors that occur during analytics processing
 *
 * @param {unknown} error - The error that occurred
 * @param {Response} res - Express response object
 * @returns {Response} Error response
 */
const handleError = (error: unknown, res: Response): Response => {
  if (error instanceof TypeError) {
    logger.error('URL error: Type error while retrieving total clicks analytics:', error.message);
    return sendResponse(res, 400, 'Invalid request format');
  } else if (error instanceof Error) {
    logger.error('URL error: Failed to retrieve total clicks analytics:', error.message);
    return sendResponse(res, 500, 'Failed to retrieve total clicks analytics');
  } else {
    logger.error('URL error: Unknown error while retrieving total clicks:', String(error));
    return sendResponse(res, 500, 'Internal server error');
  }
};

/**
 * Get total clicks analytics for all URLs of a user
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with analytics data
 */
export const getTotalClicksAnalytics = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Get user ID from authentication token
    const userId = req.body.id;

    // Guard clause: Validate user authentication
    const authValidation = validateAuthentication(userId);
    if (!authValidation.isValid) {
      return sendResponse(
        res,
        authValidation.errorCode || 401,
        authValidation.errorMessage || 'Unauthorized',
      );
    }

    // Extract query parameters
    const {
      startDateString,
      endDateString,
      comparison,
      customComparisonStartString,
      customComparisonEndString,
      groupBy,
      page,
      limit,
    } = extractQueryParams(req);

    // Guard clause: Parse and validate dates
    const dateResult = parseAnalyticsDates(startDateString, endDateString);
    if ('error' in dateResult) {
      return sendResponse(res, 400, dateResult.error || 'Invalid date parameters');
    }

    // Destructure with non-null assertion since we've checked for errors
    const { startDate, endDate } = dateResult;

    // Guard clause: Validate startDate and endDate are present
    if (!startDate || !endDate) {
      logger.error('Unexpected: dateResult has no error but missing date values');
      return sendResponse(res, 500, 'Internal Server Error');
    }

    // Calculate days in the analysis period
    const analysisPeriodDays = calculateDaysBetween(startDate, endDate);

    // Guard clause: Determine comparison period
    const comparisonResult = determineComparisonPeriod(
      comparison,
      startDate,
      customComparisonStartString,
      customComparisonEndString,
    );

    if ('error' in comparisonResult) {
      return sendResponse(res, 400, comparisonResult.error || 'Invalid comparison parameters');
    }

    const { comparisonPeriodDays, previousPeriodStartDate, previousPeriodEndDate } =
      comparisonResult;

    // Guard clause: Validate comparison period data
    if (!comparisonPeriodDays || !previousPeriodStartDate || !previousPeriodEndDate) {
      logger.error('Unexpected: comparisonResult has no error but missing period values');
      return sendResponse(res, 500, 'Internal Server Error');
    }

    // Prepare query options
    const options = { startDate, endDate, groupBy };
    const previousPeriodOptions = {
      startDate: previousPeriodStartDate,
      endDate: previousPeriodEndDate,
    };

    // Fetch analytics data in parallel for better performance
    const [
      clicksAnalytics,
      summary,
      topPerformingDays,
      activeUrlsCount,
      previousSummary,
      previousActiveUrlsCount,
    ] = await Promise.all([
      clickModel.getTotalClicksAnalytics(userId, options),
      clickModel.getTotalClicksSummary(userId, options),
      clickModel.getTopPerformingDays(userId, options),
      clickModel.getActiveUrlsCount(userId, options),
      clickModel.getTotalClicksSummary(userId, previousPeriodOptions),
      clickModel.getActiveUrlsCount(userId, previousPeriodOptions),
    ]);

    // Format the response data
    const responseData = formatResponseData({
      clicksAnalytics,
      summary,
      topPerformingDays,
      activeUrlsCount,
      previousSummary,
      previousActiveUrlsCount,
      startDate,
      endDate,
      analysisPeriodDays,
      comparisonPeriodDays,
      previousPeriodStartDate,
      previousPeriodEndDate,
      page,
      limit,
    });

    logger.info(`Successfully retrieved total clicks analytics for user ${userId}`);
    return sendResponse(res, 200, 'Successfully retrieved total clicks analytics', responseData);
  } catch (error: unknown) {
    return handleError(error, res);
  }
};

export default getTotalClicksAnalytics;
