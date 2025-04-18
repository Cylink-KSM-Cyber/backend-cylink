/**
 * Conversion Model
 *
 * Provides functions for tracking and analyzing conversions
 * @module models/conversionModel
 */

import { Conversion, ConversionRateFilters } from '../interfaces/Conversion';
const pool = require('../config/database');
const crypto = require('crypto');

/**
 * Generate a tracking ID for a click
 *
 * @param {object} data - The data to encode in the tracking ID
 * @param {number} data.clickId - The click ID
 * @param {number} data.urlId - The URL ID
 * @returns {string} The generated tracking ID
 */
exports.generateTrackingId = (data: { clickId: number; urlId: number }): string => {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64');
  const hmac = crypto.createHmac('sha256', process.env.APP_KEY || 'cylink-secret');
  const hash = hmac.update(payload).digest('hex').substring(0, 10);
  return `c_${payload}_${hash}`;
};

/**
 * Decode a tracking ID to get click and URL information
 *
 * @param {string} trackingId - The tracking ID to decode
 * @returns {object|null} The decoded data or null if invalid
 */
exports.decodeTrackingId = (trackingId: string): { clickId: number; urlId: number } | null => {
  try {
    // Format: c_base64payload_hash
    const parts = trackingId.split('_');
    if (parts.length !== 3 || parts[0] !== 'c') {
      return null;
    }

    const payload = parts[1];
    const providedHash = parts[2];

    // Verify the payload
    const hmac = crypto.createHmac('sha256', process.env.APP_KEY || 'cylink-secret');
    const expectedHash = hmac.update(payload).digest('hex').substring(0, 10);

    if (providedHash !== expectedHash) {
      return null;
    }

    const decodedData = JSON.parse(Buffer.from(payload, 'base64').toString());
    return {
      clickId: decodedData.clickId,
      urlId: decodedData.urlId,
    };
  } catch (error) {
    return null;
  }
};

/**
 * Record a conversion
 *
 * @param {Conversion} conversionData - Data about the conversion
 * @returns {Promise<Conversion>} The created conversion record
 */
exports.recordConversion = async (conversionData: Conversion): Promise<Conversion> => {
  const {
    click_id,
    url_id,
    goal_id,
    conversion_value,
    user_agent,
    ip_address,
    referrer,
    custom_data,
  } = conversionData;

  const result = await pool.query(
    `INSERT INTO conversions 
     (click_id, url_id, goal_id, conversion_value, user_agent, ip_address, referrer, custom_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      click_id,
      url_id,
      goal_id,
      conversion_value,
      user_agent,
      ip_address,
      referrer,
      custom_data ? JSON.stringify(custom_data) : null,
    ],
  );

  return result.rows[0];
};

/**
 * Check if a conversion already exists for a click
 *
 * @param {number} clickId - The click ID
 * @param {number} goalId - The goal ID
 * @returns {Promise<boolean>} Whether the conversion exists
 */
exports.conversionExists = async (clickId: number, goalId?: number): Promise<boolean> => {
  let query = 'SELECT 1 FROM conversions WHERE click_id = $1';
  const params: any[] = [clickId];

  if (goalId) {
    query += ' AND goal_id = $2';
    params.push(goalId);
  }

  const result = await pool.query(query, params);
  return result.rowCount > 0;
};

/**
 * Get conversion count for a specific URL
 *
 * @param {number} urlId - The URL ID
 * @param {object} filters - Optional filters
 * @param {string} filters.startDate - Start date (ISO format)
 * @param {string} filters.endDate - End date (ISO format)
 * @param {number} filters.goalId - Filter by goal ID
 * @returns {Promise<number>} Number of conversions
 */
exports.getConversionCountByUrlId = async (
  urlId: number,
  filters: { startDate?: string; endDate?: string; goalId?: number } = {},
): Promise<number> => {
  const { startDate, endDate, goalId } = filters;
  let query = 'SELECT COUNT(*) as count FROM conversions WHERE url_id = $1';
  const params: any[] = [urlId];

  let paramIndex = 2;

  if (startDate) {
    query += ` AND converted_at >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    query += ` AND converted_at <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  if (goalId) {
    query += ` AND goal_id = $${paramIndex}`;
    params.push(goalId);
  }

  const result = await pool.query(query, params);

  return parseInt(result.rows[0].count, 10);
};

/**
 * Get conversion value sum for a specific URL
 *
 * @param {number} urlId - The URL ID
 * @param {object} filters - Optional filters
 * @param {string} filters.startDate - Start date (ISO format)
 * @param {string} filters.endDate - End date (ISO format)
 * @param {number} filters.goalId - Filter by goal ID
 * @returns {Promise<number>} Sum of conversion values
 */
exports.getConversionValueByUrlId = async (
  urlId: number,
  filters: { startDate?: string; endDate?: string; goalId?: number } = {},
): Promise<number> => {
  const { startDate, endDate, goalId } = filters;
  let query =
    'SELECT COALESCE(SUM(conversion_value), 0) as total FROM conversions WHERE url_id = $1';
  const params: any[] = [urlId];

  let paramIndex = 2;

  if (startDate) {
    query += ` AND converted_at >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    query += ` AND converted_at <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  if (goalId) {
    query += ` AND goal_id = $${paramIndex}`;
    params.push(goalId);
  }

  const result = await pool.query(query, params);

  return parseFloat(result.rows[0].total);
};

/**
 * Get daily conversion statistics for a URL
 *
 * @param {number} urlId - The URL ID
 * @param {ConversionRateFilters} filters - Filters for the stats
 * @returns {Promise<any[]>} Daily conversion statistics
 */
exports.getDailyConversionStats = async (
  urlId: number,
  filters: ConversionRateFilters = {},
): Promise<any[]> => {
  const { start_date, end_date, goal_id } = filters;

  // Default to last 30 days if not specified
  const startDate =
    start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = end_date || new Date().toISOString().split('T')[0];

  let query = `
    WITH dates AS (
      SELECT generate_series(
        $1::date,
        $2::date,
        '1 day'::interval
      )::date AS date
    ),
    clicks AS (
      SELECT 
        DATE(clicked_at) as date,
        COUNT(*) as count
      FROM clicks
      WHERE url_id = $3
        AND clicked_at >= $1::date
        AND clicked_at <= ($2::date + '1 day'::interval)
      GROUP BY DATE(clicked_at)
    ),
    conversions AS (
      SELECT 
        DATE(converted_at) as date,
        COUNT(*) as count,
        COALESCE(SUM(conversion_value), 0) as value
      FROM conversions
      WHERE url_id = $3
        AND converted_at >= $1::date
        AND converted_at <= ($2::date + '1 day'::interval)
  `;

  const params: any[] = [startDate, endDate, urlId];
  const paramIndex = 4;

  if (goal_id) {
    query += ` AND goal_id = $${paramIndex}`;
    params.push(goal_id);
  }

  query += `
      GROUP BY DATE(converted_at)
    )
    SELECT 
      d.date,
      COALESCE(c.count, 0) as clicks,
      COALESCE(cv.count, 0) as conversions,
      CASE 
        WHEN COALESCE(c.count, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(cv.count, 0)::numeric / COALESCE(c.count, 0)::numeric) * 100, 2)
      END as conversion_rate,
      COALESCE(cv.value, 0) as conversion_value
    FROM dates d
    LEFT JOIN clicks c ON d.date = c.date
    LEFT JOIN conversions cv ON d.date = cv.date
    ORDER BY d.date ASC
  `;

  const result = await pool.query(query, params);

  return result.rows;
};

/**
 * Get conversion rate for a URL with comparison to previous period
 *
 * @param {number} urlId - The URL ID
 * @param {ConversionRateFilters} filters - Filters and comparison period
 * @returns {Promise<any>} Conversion rate statistics
 */
exports.getConversionRate = async (
  urlId: number,
  filters: ConversionRateFilters = {},
): Promise<any> => {
  const { start_date, end_date, goal_id, comparison = 30 } = filters;

  // Default to last 30 days if not specified
  const endDate = end_date ? new Date(end_date) : new Date();
  const startDate = start_date
    ? new Date(start_date)
    : new Date(endDate.getTime() - comparison * 24 * 60 * 60 * 1000);

  // Calculate previous period
  const periodDuration = endDate.getTime() - startDate.getTime();
  const previousEndDate = new Date(startDate.getTime() - 1);
  const previousStartDate = new Date(previousEndDate.getTime() - periodDuration);

  // Current period stats
  const currentPeriodStats = await pool.query(
    `
    SELECT
      COUNT(DISTINCT c.id) as total_clicks,
      COUNT(DISTINCT cv.id) as total_conversions,
      COALESCE(SUM(cv.conversion_value), 0) as total_value
    FROM clicks c
    LEFT JOIN conversions cv ON c.url_id = cv.url_id AND c.id = cv.click_id
    WHERE c.url_id = $1
      AND c.clicked_at >= $2
      AND c.clicked_at <= $3
      ${goal_id ? 'AND (cv.goal_id = $4 OR cv.id IS NULL)' : ''}
  `,
    goal_id
      ? [urlId, startDate.toISOString(), endDate.toISOString(), goal_id]
      : [urlId, startDate.toISOString(), endDate.toISOString()],
  );

  // Previous period stats
  const previousPeriodStats = await pool.query(
    `
    SELECT
      COUNT(DISTINCT c.id) as total_clicks,
      COUNT(DISTINCT cv.id) as total_conversions,
      COALESCE(SUM(cv.conversion_value), 0) as total_value
    FROM clicks c
    LEFT JOIN conversions cv ON c.url_id = cv.url_id AND c.id = cv.click_id
    WHERE c.url_id = $1
      AND c.clicked_at >= $2
      AND c.clicked_at <= $3
      ${goal_id ? 'AND (cv.goal_id = $4 OR cv.id IS NULL)' : ''}
  `,
    goal_id
      ? [urlId, previousStartDate.toISOString(), previousEndDate.toISOString(), goal_id]
      : [urlId, previousStartDate.toISOString(), previousEndDate.toISOString()],
  );

  // Goal-specific stats for current period
  let goalStats: any[] = [];
  if (!goal_id) {
    const goalStatsResult = await pool.query(
      `
      SELECT
        cg.id as goal_id,
        cg.name,
        COUNT(DISTINCT cv.id) as conversions,
        COALESCE(SUM(cv.conversion_value), 0) as conversion_value
      FROM conversion_goals cg
      JOIN url_conversion_goals ucg ON cg.id = ucg.goal_id
      LEFT JOIN conversions cv ON cg.id = cv.goal_id AND cv.url_id = ucg.url_id
        AND cv.converted_at >= $2 AND cv.converted_at <= $3
      WHERE ucg.url_id = $1
      GROUP BY cg.id, cg.name
    `,
      [urlId, startDate.toISOString(), endDate.toISOString()],
    );

    goalStats = goalStatsResult.rows;

    // Goal-specific stats for previous period
    const previousGoalStatsResult = await pool.query(
      `
      SELECT
        cg.id as goal_id,
        COUNT(DISTINCT cv.id) as conversions,
        COALESCE(SUM(cv.conversion_value), 0) as conversion_value
      FROM conversion_goals cg
      JOIN url_conversion_goals ucg ON cg.id = ucg.goal_id
      LEFT JOIN conversions cv ON cg.id = cv.goal_id AND cv.url_id = ucg.url_id
        AND cv.converted_at >= $2 AND cv.converted_at <= $3
      WHERE ucg.url_id = $1
      GROUP BY cg.id
    `,
      [urlId, previousStartDate.toISOString(), previousEndDate.toISOString()],
    );

    const previousGoalStats = previousGoalStatsResult.rows;

    // Merge goal stats with previous period data
    goalStats = goalStats.map(goal => {
      const previousGoal = previousGoalStats.find(
        (pg: { goal_id: number }) => pg.goal_id === goal.goal_id,
      ) || {
        conversions: 0,
        conversion_value: 0,
      };

      const currentRate =
        currentPeriodStats.rows[0].total_clicks > 0
          ? (goal.conversions / currentPeriodStats.rows[0].total_clicks) * 100
          : 0;

      const previousRate =
        previousPeriodStats.rows[0].total_clicks > 0
          ? (previousGoal.conversions / previousPeriodStats.rows[0].total_clicks) * 100
          : 0;

      return {
        ...goal,
        conversion_rate: parseFloat(currentRate.toFixed(2)),
        previous_conversion_rate: parseFloat(previousRate.toFixed(2)),
        change_percentage:
          previousRate > 0
            ? parseFloat((((currentRate - previousRate) / previousRate) * 100).toFixed(2))
            : null,
        previous_conversions: parseInt(previousGoal.conversions, 10),
        change: parseInt(goal.conversions, 10) - parseInt(previousGoal.conversions, 10),
      };
    });
  }

  // Get URL info
  const urlInfo = await pool.query(
    `
    SELECT short_code, original_url FROM urls WHERE id = $1
  `,
    [urlId],
  );

  // Calculate conversion rate stats
  const current = currentPeriodStats.rows[0];
  const previous = previousPeriodStats.rows[0];

  const currentConversionRate =
    current.total_clicks > 0 ? (current.total_conversions / current.total_clicks) * 100 : 0;

  const previousConversionRate =
    previous.total_clicks > 0 ? (previous.total_conversions / previous.total_clicks) * 100 : 0;

  const conversionRateChange =
    previousConversionRate > 0
      ? ((currentConversionRate - previousConversionRate) / previousConversionRate) * 100
      : null;

  // Get time series data
  const timeSeriesData = await exports.getDailyConversionStats(urlId, {
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    goal_id,
  });

  return {
    url_id: urlId,
    short_code: urlInfo.rows[0]?.short_code,
    original_url: urlInfo.rows[0]?.original_url,
    period: {
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    },
    overall_stats: {
      total_clicks: parseInt(current.total_clicks, 10),
      total_conversions: parseInt(current.total_conversions, 10),
      conversion_rate: parseFloat(currentConversionRate.toFixed(2)),
      total_conversion_value: parseFloat(current.total_value),
      average_value_per_conversion:
        current.total_conversions > 0
          ? parseFloat((current.total_value / current.total_conversions).toFixed(2))
          : 0,
    },
    goals: goalStats.map(goal => ({
      goal_id: goal.goal_id,
      name: goal.name,
      conversions: parseInt(goal.conversions, 10),
      conversion_rate: goal.conversion_rate,
      conversion_value: parseFloat(goal.conversion_value),
    })),
    comparison: {
      previous_period: {
        start_date: previousStartDate.toISOString().split('T')[0],
        end_date: previousEndDate.toISOString().split('T')[0],
      },
      overall: {
        previous_conversion_rate: parseFloat(previousConversionRate.toFixed(2)),
        change_percentage:
          conversionRateChange !== null ? parseFloat(conversionRateChange.toFixed(2)) : null,
        previous_conversions: parseInt(previous.total_conversions, 10),
        change: parseInt(current.total_conversions, 10) - parseInt(previous.total_conversions, 10),
      },
      goals: goalStats.map(goal => ({
        goal_id: goal.goal_id,
        previous_conversion_rate: goal.previous_conversion_rate,
        change_percentage: goal.change_percentage,
        previous_conversions: goal.previous_conversions,
        change: goal.change,
      })),
    },
    time_series: timeSeriesData,
  };
};

/**
 * Get overall conversion statistics across all URLs for a user
 *
 * @param {number} userId - The user ID
 * @param {ConversionRateFilters} filters - Filters and comparison period
 * @returns {Promise<any>} Overall conversion statistics
 */
exports.getOverallConversionRate = async (
  userId: number,
  filters: ConversionRateFilters = {},
): Promise<any> => {
  const { start_date, end_date, goal_id, comparison = 30 } = filters;

  // Default to last 30 days if not specified
  const endDate = end_date ? new Date(end_date) : new Date();
  const startDate = start_date
    ? new Date(start_date)
    : new Date(endDate.getTime() - comparison * 24 * 60 * 60 * 1000);

  // Calculate previous period
  const periodDuration = endDate.getTime() - startDate.getTime();
  const previousEndDate = new Date(startDate.getTime() - 1);
  const previousStartDate = new Date(previousEndDate.getTime() - periodDuration);

  // Current period stats
  const currentPeriodStats = await pool.query(
    `
    SELECT
      COUNT(DISTINCT c.id) as total_clicks,
      COUNT(DISTINCT cv.id) as total_conversions,
      COALESCE(SUM(cv.conversion_value), 0) as total_value
    FROM clicks c
    JOIN urls u ON c.url_id = u.id
    LEFT JOIN conversions cv ON c.url_id = cv.url_id AND c.id = cv.click_id
    WHERE u.user_id = $1
      AND c.clicked_at >= $2
      AND c.clicked_at <= $3
      ${goal_id ? 'AND (cv.goal_id = $4 OR cv.id IS NULL)' : ''}
  `,
    goal_id
      ? [userId, startDate.toISOString(), endDate.toISOString(), goal_id]
      : [userId, startDate.toISOString(), endDate.toISOString()],
  );

  // Previous period stats
  const previousPeriodStats = await pool.query(
    `
    SELECT
      COUNT(DISTINCT c.id) as total_clicks,
      COUNT(DISTINCT cv.id) as total_conversions,
      COALESCE(SUM(cv.conversion_value), 0) as total_value
    FROM clicks c
    JOIN urls u ON c.url_id = u.id
    LEFT JOIN conversions cv ON c.url_id = cv.url_id AND c.id = cv.click_id
    WHERE u.user_id = $1
      AND c.clicked_at >= $2
      AND c.clicked_at <= $3
      ${goal_id ? 'AND (cv.goal_id = $4 OR cv.id IS NULL)' : ''}
  `,
    goal_id
      ? [userId, previousStartDate.toISOString(), previousEndDate.toISOString(), goal_id]
      : [userId, previousStartDate.toISOString(), previousEndDate.toISOString()],
  );

  // Goal-specific stats for current period
  let goalStats: any[] = [];
  if (!goal_id) {
    const goalStatsResult = await pool.query(
      `
      SELECT
        cg.id as goal_id,
        cg.name,
        COUNT(DISTINCT cv.id) as conversions,
        COALESCE(SUM(cv.conversion_value), 0) as conversion_value
      FROM conversion_goals cg
      WHERE cg.user_id = $1
      LEFT JOIN conversions cv ON cg.id = cv.goal_id
        AND cv.converted_at >= $2 AND cv.converted_at <= $3
      GROUP BY cg.id, cg.name
    `,
      [userId, startDate.toISOString(), endDate.toISOString()],
    );

    goalStats = goalStatsResult.rows;

    // Goal-specific stats for previous period
    const previousGoalStatsResult = await pool.query(
      `
      SELECT
        cg.id as goal_id,
        COUNT(DISTINCT cv.id) as conversions,
        COALESCE(SUM(cv.conversion_value), 0) as conversion_value
      FROM conversion_goals cg
      WHERE cg.user_id = $1
      LEFT JOIN conversions cv ON cg.id = cv.goal_id
        AND cv.converted_at >= $2 AND cv.converted_at <= $3
      GROUP BY cg.id
    `,
      [userId, previousStartDate.toISOString(), previousEndDate.toISOString()],
    );

    const previousGoalStats = previousGoalStatsResult.rows;

    // Merge goal stats with previous period data
    goalStats = goalStats.map(goal => {
      const previousGoal = previousGoalStats.find(
        (pg: { goal_id: number }) => pg.goal_id === goal.goal_id,
      ) || {
        conversions: 0,
        conversion_value: 0,
      };

      const currentRate =
        currentPeriodStats.rows[0].total_clicks > 0
          ? (goal.conversions / currentPeriodStats.rows[0].total_clicks) * 100
          : 0;

      const previousRate =
        previousPeriodStats.rows[0].total_clicks > 0
          ? (previousGoal.conversions / previousPeriodStats.rows[0].total_clicks) * 100
          : 0;

      return {
        ...goal,
        conversion_rate: parseFloat(currentRate.toFixed(2)),
        previous_conversion_rate: parseFloat(previousRate.toFixed(2)),
        change_percentage:
          previousRate > 0
            ? parseFloat((((currentRate - previousRate) / previousRate) * 100).toFixed(2))
            : null,
        previous_conversions: parseInt(previousGoal.conversions, 10),
        change: parseInt(goal.conversions, 10) - parseInt(previousGoal.conversions, 10),
      };
    });
  }

  // Calculate conversion rate stats
  const current = currentPeriodStats.rows[0];
  const previous = previousPeriodStats.rows[0];

  const currentConversionRate =
    current.total_clicks > 0 ? (current.total_conversions / current.total_clicks) * 100 : 0;

  const previousConversionRate =
    previous.total_clicks > 0 ? (previous.total_conversions / previous.total_clicks) * 100 : 0;

  const conversionRateChange =
    previousConversionRate > 0
      ? ((currentConversionRate - previousConversionRate) / previousConversionRate) * 100
      : null;

  return {
    period: {
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    },
    overall_stats: {
      total_clicks: parseInt(current.total_clicks, 10),
      total_conversions: parseInt(current.total_conversions, 10),
      conversion_rate: parseFloat(currentConversionRate.toFixed(2)),
      total_conversion_value: parseFloat(current.total_value),
      average_value_per_conversion:
        current.total_conversions > 0
          ? parseFloat((current.total_value / current.total_conversions).toFixed(2))
          : 0,
    },
    goals: goalStats.map(goal => ({
      goal_id: goal.goal_id,
      name: goal.name,
      conversions: parseInt(goal.conversions, 10),
      conversion_rate: goal.conversion_rate,
      conversion_value: parseFloat(goal.conversion_value),
    })),
    comparison: {
      previous_period: {
        start_date: previousStartDate.toISOString().split('T')[0],
        end_date: previousEndDate.toISOString().split('T')[0],
      },
      overall: {
        previous_conversion_rate: parseFloat(previousConversionRate.toFixed(2)),
        change_percentage:
          conversionRateChange !== null ? parseFloat(conversionRateChange.toFixed(2)) : null,
        previous_conversions: parseInt(previous.total_conversions, 10),
        change: parseInt(current.total_conversions, 10) - parseInt(previous.total_conversions, 10),
      },
      goals: goalStats.map(goal => ({
        goal_id: goal.goal_id,
        previous_conversion_rate: goal.previous_conversion_rate,
        change_percentage: goal.change_percentage,
        previous_conversions: goal.previous_conversions,
        change: goal.change,
      })),
    },
  };
};
