/**
 * CTR Controller
 *
 * Handles Click-Through Rate (CTR) related operations
 * @module controllers/ctrController
 */

import { Request, Response } from 'express';
import logger from '../utils/logger';
import { CtrQueryParams } from '../interfaces/Impression';

// Import model directly with require to avoid TypeScript import issues
const impressionModel = require('../models/impressionModel');

/**
 * Interface for Express request with user
 */
interface RequestWithUser extends Request {
  user: {
    id: number;
    [key: string]: any;
  };
}

/**
 * Calculate days between two dates
 *
 * @param {string} startDate - Start date string (YYYY-MM-DD)
 * @param {string} endDate - End date string (YYYY-MM-DD)
 * @returns {number} Number of days between the dates
 */
const calculateDaysBetween = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Get date range for previous period comparison
 *
 * @param {string} startDate - Current period start date
 * @param {string} endDate - Current period end date
 * @param {string | undefined} comparison - Comparison type (7, 14, 30, 90, custom)
 * @param {string | undefined} customComparisonStart - Custom comparison start date
 * @param {string | undefined} customComparisonEnd - Custom comparison end date
 * @returns {Object | null} Previous period date range or null if no comparison
 */
const getPreviousPeriodDates = (
  startDate: string,
  endDate: string,
  comparison?: string,
  customComparisonStart?: string,
  customComparisonEnd?: string,
) => {
  if (!comparison) return null;

  // For custom comparison, use provided dates
  if (comparison === 'custom') {
    if (!customComparisonStart || !customComparisonEnd) {
      return null;
    }
    return {
      startDate: customComparisonStart,
      endDate: customComparisonEnd,
    };
  }

  // Calculate days in current period
  const days = calculateDaysBetween(startDate, endDate);

  // For standard periods (7, 14, 30, 90), go back that many days
  const periodDays = parseInt(comparison, 10);
  if (isNaN(periodDays)) return null;

  const currentStart = new Date(startDate);

  const prevEnd = new Date(currentStart);
  prevEnd.setDate(prevEnd.getDate() - 1);

  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - days);

  return {
    startDate: prevStart.toISOString().split('T')[0],
    endDate: prevEnd.toISOString().split('T')[0],
  };
};

/**
 * Format dates (YYYY-MM-DD) for the API parameters
 *
 * @param {string|undefined} startDate - Start date from request
 * @param {string|undefined} endDate - End date from request
 * @returns {[string, string]} Formatted start and end dates
 */
const formatDates = (startDate?: string, endDate?: string): [string, string] => {
  const end = endDate ? new Date(endDate) : new Date();

  // Default to 30 days ago if no start date
  const start = startDate ? new Date(startDate) : new Date();
  if (!startDate) {
    start.setDate(start.getDate() - 30);
  }

  return [start.toISOString().split('T')[0], end.toISOString().split('T')[0]];
};

/**
 * Get overall CTR statistics for all user URLs
 *
 * @param {RequestWithUser} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<void>}
 */
export const getOverallCTRStats = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const params = req.query as unknown as CtrQueryParams;

    // Format dates
    const [startDate, endDate] = formatDates(params.start_date, params.end_date);

    // Get comparison period dates if requested
    const prevPeriod = getPreviousPeriodDates(
      startDate,
      endDate,
      params.comparison,
      params.custom_comparison_start,
      params.custom_comparison_end,
    );

    // Get CTR statistics
    const stats = await impressionModel.getOverallCTRStats(
      null,
      userId,
      startDate,
      endDate,
      prevPeriod?.startDate || null,
      prevPeriod?.endDate || null,
    );

    // Build the response
    const response: any = {
      overall: {
        total_impressions: stats.current_period.total_impressions,
        total_clicks: stats.current_period.total_clicks,
        ctr: stats.current_period.ctr,
        unique_impressions: stats.current_period.unique_impressions,
        unique_ctr: stats.current_period.unique_ctr,
        analysis_period: {
          start_date: startDate,
          end_date: endDate,
          days: calculateDaysBetween(startDate, endDate),
        },
      },
    };

    // Add comparison data if available
    if (prevPeriod && stats.previous_period) {
      response.comparison = {
        period_days: calculateDaysBetween(prevPeriod.startDate, prevPeriod.endDate),
        previous_period: {
          start_date: prevPeriod.startDate,
          end_date: prevPeriod.endDate,
        },
        metrics: {
          impressions: stats.comparison.impressions,
          clicks: stats.comparison.clicks,
          ctr: stats.comparison.ctr,
        },
      };
    }

    // Add time series data if requested
    if (params.group_by) {
      const timeSeriesData = await impressionModel.getCTRTimeSeries(
        null,
        userId,
        startDate,
        endDate,
        params.group_by,
      );

      response.time_series = {
        data: timeSeriesData,
      };
    }

    // Add top performing days
    const topDays = await impressionModel.getTopPerformingDays(
      null,
      userId,
      startDate,
      endDate,
      5, // Top 5 days
    );

    response.top_performing_days = topDays;

    // Add CTR by source
    const sourceStats = await impressionModel.getCTRBySource(null, userId, startDate, endDate);

    response.ctr_by_source = sourceStats;

    // Send the response
    res.status(200).json({
      status: 200,
      message: 'CTR statistics retrieved successfully',
      data: response,
    });

    // Log the request
    logger.info(`User ${userId} retrieved overall CTR statistics`);
  } catch (error: any) {
    logger.error(`Error retrieving CTR statistics: ${error.message}`);
    res.status(500).json({
      status: 500,
      message: 'Failed to retrieve CTR statistics',
      error: error.message,
    });
  }
};

/**
 * Get CTR statistics for a specific URL
 *
 * @param {RequestWithUser} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<void>}
 */
export const getUrlCTRStats = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const urlId = parseInt(req.params.url_id, 10);
    const params = req.query as unknown as CtrQueryParams;

    if (isNaN(urlId)) {
      res.status(400).json({
        status: 400,
        message: 'Invalid URL ID',
        error: 'URL ID must be a number',
      });
      return;
    }

    // Format dates
    const [startDate, endDate] = formatDates(params.start_date, params.end_date);

    // Get comparison period dates if requested
    const prevPeriod = getPreviousPeriodDates(
      startDate,
      endDate,
      params.comparison,
      params.custom_comparison_start,
      params.custom_comparison_end,
    );

    // Get CTR statistics
    const stats = await impressionModel.getOverallCTRStats(
      urlId,
      null,
      startDate,
      endDate,
      prevPeriod?.startDate || null,
      prevPeriod?.endDate || null,
    );

    // Build the response
    const response: any = {
      overall: {
        total_impressions: stats.current_period.total_impressions,
        total_clicks: stats.current_period.total_clicks,
        ctr: stats.current_period.ctr,
        unique_impressions: stats.current_period.unique_impressions,
        unique_ctr: stats.current_period.unique_ctr,
        analysis_period: {
          start_date: startDate,
          end_date: endDate,
          days: calculateDaysBetween(startDate, endDate),
        },
      },
    };

    // Add comparison data if available
    if (prevPeriod && stats.previous_period) {
      response.comparison = {
        period_days: calculateDaysBetween(prevPeriod.startDate, prevPeriod.endDate),
        previous_period: {
          start_date: prevPeriod.startDate,
          end_date: prevPeriod.endDate,
        },
        metrics: {
          impressions: stats.comparison.impressions,
          clicks: stats.comparison.clicks,
          ctr: stats.comparison.ctr,
        },
      };
    }

    // Add time series data if requested
    if (params.group_by) {
      const timeSeriesData = await impressionModel.getCTRTimeSeries(
        urlId,
        null,
        startDate,
        endDate,
        params.group_by,
      );

      response.time_series = {
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

    response.top_performing_days = topDays;

    // Add CTR by source
    const sourceStats = await impressionModel.getCTRBySource(urlId, null, startDate, endDate);

    response.ctr_by_source = sourceStats;

    // Send the response
    res.status(200).json({
      status: 200,
      message: 'URL CTR statistics retrieved successfully',
      data: response,
    });

    // Log the request
    logger.info(`User ${userId} retrieved CTR statistics for URL ${urlId}`);
  } catch (error: any) {
    logger.error(`Error retrieving URL CTR statistics: ${error.message}`);
    res.status(500).json({
      status: 500,
      message: 'Failed to retrieve URL CTR statistics',
      error: error.message,
    });
  }
};

/**
 * Get CTR leaderboard of URLs
 *
 * @param {RequestWithUser} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<void>}
 */
export const getCTRLeaderboard = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const params = req.query as unknown as CtrQueryParams;

    // Format dates
    const [startDate, endDate] = formatDates(params.start_date, params.end_date);

    // Default limit and sort parameters
    const limit = params.limit ? parseInt(params.limit.toString(), 10) : 10;
    const sortBy = params.sortBy || 'ctr';
    const sortOrder = params.sortOrder || 'desc';

    // Get URL leaderboard
    const leaderboard = await impressionModel.getCTRLeaderboard(
      userId,
      startDate,
      endDate,
      limit,
      sortBy,
      sortOrder,
    );

    // Send the response
    res.status(200).json({
      status: 200,
      message: 'CTR leaderboard retrieved successfully',
      data: {
        period: {
          start_date: startDate,
          end_date: endDate,
        },
        urls: leaderboard,
      },
    });

    // Log the request
    logger.info(`User ${userId} retrieved CTR leaderboard`);
  } catch (error: any) {
    logger.error(`Error retrieving CTR leaderboard: ${error.message}`);
    res.status(500).json({
      status: 500,
      message: 'Failed to retrieve CTR leaderboard',
      error: error.message,
    });
  }
};

// Add at the end of the file
module.exports = {
  getOverallCTRStats,
  getUrlCTRStats,
  getCTRLeaderboard,
};
