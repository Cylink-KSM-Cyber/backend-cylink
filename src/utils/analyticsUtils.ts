/**
 * Analytics Utilities
 *
 * Provides functions for handling dates, periods, and metrics calculations for analytics
 * @module utils/analyticsUtils
 */

import logger from './logger';

/**
 * Interface for date-related results with possible error
 */
export interface DateResult {
  startDate?: Date;
  endDate?: Date;
  error?: string;
}

/**
 * Interface for period comparison results with possible error
 */
export interface ComparisonPeriodResult {
  comparisonPeriodDays?: number;
  previousPeriodStartDate?: Date;
  previousPeriodEndDate?: Date;
  error?: string;
}

/**
 * Interface for basic click analytics summary
 */
export interface ClicksSummary {
  total_clicks?: number;
  total_urls?: number;
  avg_clicks_per_url?: number;
}

/**
 * Interface for comparison metrics between two periods
 */
export interface ComparisonMetrics {
  total_clicks: {
    current: number;
    previous: number;
    change: number;
    change_percentage: number;
  };
  avg_clicks_per_url: {
    current: number;
    previous: number;
    change: number;
    change_percentage: number;
  };
  active_urls: {
    current: number;
    previous: number;
    change: number;
    change_percentage: number;
  };
}

/**
 * Parse and validate date parameters for analytics
 *
 * @param {string} [startDateString] - Optional start date string (format: YYYY-MM-DD)
 * @param {string} [endDateString] - Optional end date string (format: YYYY-MM-DD)
 * @param {number} [defaultDays=30] - Default number of days to look back if no start date is provided
 * @returns {DateResult} Object with validated dates or error response
 */
export function parseAnalyticsDates(
  startDateString?: string,
  endDateString?: string,
  defaultDays: number = 30,
): DateResult {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;

  // Parse start date
  if (startDateString) {
    startDate = new Date(startDateString);
    if (isNaN(startDate.getTime())) {
      logger.debug(`Invalid start_date format: ${startDateString}`);
      return { error: 'Invalid start_date format. Use YYYY-MM-DD' };
    }
  } else {
    // Default to specified days ago
    startDate = new Date();
    startDate.setDate(startDate.getDate() - defaultDays);
  }

  // Parse end date
  if (endDateString) {
    endDate = new Date(endDateString);
    if (isNaN(endDate.getTime())) {
      logger.debug(`Invalid end_date format: ${endDateString}`);
      return { error: 'Invalid end_date format. Use YYYY-MM-DD' };
    }
  }

  // Validate date range
  if (endDate < startDate) {
    logger.debug(`Invalid date range: ${startDateString} to ${endDateString}`);
    return { error: 'end_date must be after start_date' };
  }

  return { startDate, endDate };
}

/**
 * Calculate days between two dates (inclusive)
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {number} Number of days between dates (inclusive)
 */
export function calculateDaysBetween(startDate: Date, endDate: Date): number {
  return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Determine comparison period for analytics
 *
 * @param {string} comparison - Comparison type or period days ("7", "14", "30", "90", "custom")
 * @param {Date} startDate - Analysis start date
 * @param {string} [customStartString] - Custom comparison start date
 * @param {string} [customEndString] - Custom comparison end date
 * @returns {ComparisonPeriodResult} Object with comparison period info or error
 */
export function determineComparisonPeriod(
  comparison: string,
  startDate: Date,
  customStartString?: string,
  customEndString?: string,
): ComparisonPeriodResult {
  let comparisonPeriodDays: number;
  let previousPeriodStartDate: Date;
  let previousPeriodEndDate: Date;

  if (comparison === 'custom') {
    // Custom comparison period
    if (!customStartString || !customEndString) {
      return {
        error:
          'custom_comparison_start and custom_comparison_end are required when comparison=custom',
      };
    }

    previousPeriodStartDate = new Date(customStartString);
    previousPeriodEndDate = new Date(customEndString);

    if (isNaN(previousPeriodStartDate.getTime()) || isNaN(previousPeriodEndDate.getTime())) {
      logger.debug(
        `Invalid custom comparison date format: ${customStartString} to ${customEndString}`,
      );
      return { error: 'Invalid custom comparison date format. Use YYYY-MM-DD' };
    }

    if (previousPeriodEndDate < previousPeriodStartDate) {
      logger.debug(`Invalid custom comparison range: ${customStartString} to ${customEndString}`);
      return { error: 'custom_comparison_end must be after custom_comparison_start' };
    }

    comparisonPeriodDays = calculateDaysBetween(previousPeriodStartDate, previousPeriodEndDate);
  } else {
    // Standard comparison periods
    comparisonPeriodDays = parseInt(comparison) || 30;

    const validPeriods = [7, 14, 30, 90];
    if (!validPeriods.includes(comparisonPeriodDays)) {
      return { error: `comparison must be one of: ${validPeriods.join(', ')}, custom` };
    }

    // Calculate previous period dates
    previousPeriodEndDate = new Date(startDate);
    previousPeriodEndDate.setDate(previousPeriodEndDate.getDate() - 1);

    previousPeriodStartDate = new Date(previousPeriodEndDate);
    previousPeriodStartDate.setDate(previousPeriodStartDate.getDate() - (comparisonPeriodDays - 1));
  }

  return {
    comparisonPeriodDays,
    previousPeriodStartDate,
    previousPeriodEndDate,
  };
}

/**
 * Calculate comparison metrics for analytics
 *
 * @param {ClicksSummary} current - Current period data
 * @param {ClicksSummary} previous - Previous period data
 * @param {number} activeUrlsCount - Current period active URLs count
 * @param {number} previousActiveUrlsCount - Previous period active URLs count
 * @returns {ComparisonMetrics} Comparison metrics object
 */
export function calculateComparisonMetrics(
  current: ClicksSummary,
  previous: ClicksSummary,
  activeUrlsCount: number,
  previousActiveUrlsCount: number,
): ComparisonMetrics {
  // Get values with fallbacks to 0
  const currentTotalClicks = current?.total_clicks ?? 0;
  const previousTotalClicks = previous?.total_clicks ?? 0;
  const currentAvgClicks = current?.avg_clicks_per_url ?? 0;
  const previousAvgClicks = previous?.avg_clicks_per_url ?? 0;

  // Calculate changes
  const clicksChange = currentTotalClicks - previousTotalClicks;
  const avgClicksChange = currentAvgClicks - previousAvgClicks;
  const urlsChange = activeUrlsCount - previousActiveUrlsCount;

  // Calculate percentages safely (avoid division by zero)
  const clicksChangePercentage = calculateChangePercentage(clicksChange, previousTotalClicks);
  const avgClicksChangePercentage = calculateChangePercentage(avgClicksChange, previousAvgClicks);
  const urlsChangePercentage = calculateChangePercentage(urlsChange, previousActiveUrlsCount);

  return {
    total_clicks: {
      current: currentTotalClicks,
      previous: previousTotalClicks,
      change: clicksChange,
      change_percentage: clicksChangePercentage,
    },
    avg_clicks_per_url: {
      current: currentAvgClicks,
      previous: previousAvgClicks,
      change: avgClicksChange,
      change_percentage: avgClicksChangePercentage,
    },
    active_urls: {
      current: activeUrlsCount,
      previous: previousActiveUrlsCount,
      change: urlsChange,
      change_percentage: urlsChangePercentage,
    },
  };
}

/**
 * Helper function to calculate percentage change
 *
 * @param {number} change - The numerical change
 * @param {number} previous - Previous value
 * @returns {number} Percentage change, rounded to 2 decimal places
 */
function calculateChangePercentage(change: number, previous: number): number {
  if (previous === 0) {
    return 0;
  }
  return parseFloat(((change / previous) * 100).toFixed(2));
}

/**
 * Format a date as an ISO date string (YYYY-MM-DD)
 *
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}
