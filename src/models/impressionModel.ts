const pool = require('../config/database');
const { ImpressionCreateData } = require('../interfaces/Impression');

/**
 * Impression Model
 *
 * Provides functions for tracking and analyzing impressions on shortened URLs
 * @module models/impressionModel
 */

/**
 * Records a new impression on a shortened URL
 *
 * @param {ImpressionCreateData} impressionData - Data about the impression event
 * @returns {Promise<any>} The created impression record
 */
exports.recordImpression = async (impressionData: typeof ImpressionCreateData) => {
  const { url_id, ip_address, user_agent, referrer, is_unique = false, source } = impressionData;

  const result = await pool.query(
    `INSERT INTO impressions 
    (url_id, ip_address, user_agent, referrer, is_unique, source)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [url_id, ip_address, user_agent, referrer, is_unique, source],
  );

  return result.rows[0];
};

/**
 * Get all impressions for a specific URL
 *
 * @param {number} urlId - The URL ID
 * @returns {Promise<any[]>} Array of impression records
 */
exports.getImpressionsByUrlId = async (urlId: number) => {
  const result = await pool.query(
    'SELECT * FROM impressions WHERE url_id = $1 ORDER BY timestamp DESC',
    [urlId],
  );

  return result.rows;
};

/**
 * Get impression count for a specific URL
 *
 * @param {number} urlId - The URL ID
 * @param {boolean} uniqueOnly - Whether to count only unique impressions
 * @returns {Promise<number>} Number of impressions
 */
exports.getImpressionCountByUrlId = async (urlId: number, uniqueOnly: boolean = false) => {
  let query = 'SELECT COUNT(*) as count FROM impressions WHERE url_id = $1';

  if (uniqueOnly) {
    query += ' AND is_unique = TRUE';
  }

  const result = await pool.query(query, [urlId]);

  return parseInt(result.rows[0].count, 10);
};

/**
 * Get total impressions for all URLs belonging to a user
 *
 * @param {number} userId - The user ID
 * @param {boolean} uniqueOnly - Whether to count only unique impressions
 * @returns {Promise<number>} Total number of impressions
 */
exports.getTotalImpressionsByUserId = async (userId: number, uniqueOnly: boolean = false) => {
  let query = `
    SELECT COUNT(*) as count FROM impressions i
    JOIN urls u ON i.url_id = u.id
    WHERE u.user_id = $1`;

  if (uniqueOnly) {
    query += ' AND i.is_unique = TRUE';
  }

  const result = await pool.query(query, [userId]);

  return parseInt(result.rows[0].count, 10);
};

/**
 * Get daily impression statistics for a URL
 *
 * @param {number} urlId - The URL ID
 * @param {number} days - Number of past days to include (default: 30)
 * @param {boolean} uniqueOnly - Whether to count only unique impressions
 * @returns {Promise<any[]>} Daily impression statistics
 */
exports.getDailyImpressionStats = async (
  urlId: number,
  days: number = 30,
  uniqueOnly: boolean = false,
) => {
  let query = `
    SELECT 
      DATE(timestamp) as date,
      COUNT(*) as impressions
    FROM impressions
    WHERE url_id = $1
    AND timestamp >= NOW() - INTERVAL '${days} days'`;

  if (uniqueOnly) {
    query += ' AND is_unique = TRUE';
  }

  query += `
    GROUP BY DATE(timestamp)
    ORDER BY date DESC`;

  const result = await pool.query(query, [urlId]);

  return result.rows;
};

/**
 * Get source statistics for a URL's impressions
 *
 * @param {number} urlId - The URL ID
 * @param {boolean} uniqueOnly - Whether to count only unique impressions
 * @returns {Promise<any[]>} Source statistics
 */
exports.getSourceStats = async (urlId: number, uniqueOnly: boolean = false) => {
  let query = `
    SELECT 
      source,
      COUNT(*) as count
    FROM impressions
    WHERE url_id = $1 AND source IS NOT NULL`;

  if (uniqueOnly) {
    query += ' AND is_unique = TRUE';
  }

  query += `
    GROUP BY source
    ORDER BY count DESC`;

  const result = await pool.query(query, [urlId]);

  return result.rows;
};

/**
 * Get recent impressions for a specific URL
 *
 * @param {number} urlId - The URL ID
 * @param {number} limit - Maximum number of impressions to return
 * @returns {Promise<any[]>} Array of impression records
 */
exports.getRecentImpressions = async (urlId: number, limit: number = 10) => {
  const result = await pool.query(
    'SELECT * FROM impressions WHERE url_id = $1 ORDER BY timestamp DESC LIMIT $2',
    [urlId, limit],
  );

  return result.rows;
};

/**
 * Check if an IP has viewed a URL within a specific time window
 * Used to identify unique impressions
 *
 * @param {number} urlId - The URL ID
 * @param {string} ipAddress - The visitor's IP address
 * @param {number} timeWindowMinutes - Time window in minutes (default: 30 minutes)
 * @returns {Promise<boolean>} Whether the impression already exists
 */
exports.hasRecentImpression = async (
  urlId: number,
  ipAddress: string,
  timeWindowMinutes: number = 30,
) => {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM impressions
     WHERE url_id = $1 
     AND ip_address = $2 
     AND timestamp >= NOW() - INTERVAL '${timeWindowMinutes} minutes'`,
    [urlId, ipAddress],
  );

  return parseInt(result.rows[0].count, 10) > 0;
};

/**
 * Get time series data for CTR analysis
 *
 * @param {number|null} urlId - The URL ID (null for all URLs of a user)
 * @param {number|null} userId - The user ID (required if urlId is null)
 * @param {string} startDate - Start date for analysis (YYYY-MM-DD)
 * @param {string} endDate - End date for analysis (YYYY-MM-DD)
 * @param {string} groupBy - How to group data (day, week, month)
 * @returns {Promise<any[]>} Time series data with impressions, clicks, and CTR
 */
exports.getCTRTimeSeries = async (
  urlId: number | null,
  userId: number | null,
  startDate: string,
  endDate: string,
  groupBy: string = 'day',
) => {
  // Define time interval format based on groupBy
  let timeInterval;
  let dateFormat;

  switch (groupBy.toLowerCase()) {
    case 'week':
      timeInterval = 'week';
      dateFormat = 'YYYY-MM-DD'; // First day of week
      break;
    case 'month':
      timeInterval = 'month';
      dateFormat = 'YYYY-MM';
      break;
    case 'day':
    default:
      timeInterval = 'day';
      dateFormat = 'YYYY-MM-DD';
  }

  let query = `
    WITH impression_data AS (
      SELECT 
        to_char(date_trunc('${timeInterval}', i.timestamp), '${dateFormat}') as period,
        COUNT(*) as impressions
      FROM impressions i
      JOIN urls u ON i.url_id = u.id
      WHERE i.timestamp BETWEEN $1 AND $2
  `;

  if (urlId) {
    query += ` AND i.url_id = $3`;
  } else if (userId) {
    query += ` AND u.user_id = $3`;
  }

  query += `
      GROUP BY period
    ),
    click_data AS (
      SELECT 
        to_char(date_trunc('${timeInterval}', c.clicked_at), '${dateFormat}') as period,
        COUNT(*) as clicks
      FROM clicks c
      JOIN urls u ON c.url_id = u.id
      WHERE c.clicked_at BETWEEN $1 AND $2
  `;

  if (urlId) {
    query += ` AND c.url_id = $3`;
  } else if (userId) {
    query += ` AND u.user_id = $3`;
  }

  query += `
      GROUP BY period
    ),
    all_periods AS (
      SELECT to_char(d, '${dateFormat}') as period
      FROM generate_series(
        date_trunc('${timeInterval}', $1::timestamp),
        date_trunc('${timeInterval}', $2::timestamp),
        ('1 ' || '${timeInterval}')::interval
      ) d
    )
    SELECT 
      p.period as date,
      COALESCE(i.impressions, 0) as impressions,
      COALESCE(c.clicks, 0) as clicks,
      CASE 
        WHEN COALESCE(i.impressions, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(c.clicks, 0)::numeric / COALESCE(i.impressions, 0)::numeric) * 100, 2)
      END as ctr
    FROM all_periods p
    LEFT JOIN impression_data i ON p.period = i.period
    LEFT JOIN click_data c ON p.period = c.period
    ORDER BY p.period ASC
  `;

  const params = [startDate, endDate];

  if (urlId !== null || userId !== null) {
    params.push(urlId !== null ? urlId.toString() : userId!.toString());
  }

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Get CTR statistics grouped by source
 *
 * @param {number|null} urlId - The URL ID (null for all URLs of a user)
 * @param {number|null} userId - The user ID (required if urlId is null)
 * @param {string} startDate - Start date for analysis (YYYY-MM-DD)
 * @param {string} endDate - End date for analysis (YYYY-MM-DD)
 * @returns {Promise<any[]>} CTR statistics by referrer source
 */
exports.getCTRBySource = async (
  urlId: number | null,
  userId: number | null,
  startDate: string,
  endDate: string,
) => {
  let query = `
    WITH impression_data AS (
      SELECT 
        COALESCE(i.source, 'direct') as source,
        COUNT(*) as impressions
      FROM impressions i
      JOIN urls u ON i.url_id = u.id
      WHERE i.timestamp BETWEEN $1 AND $2
  `;

  if (urlId) {
    query += ` AND i.url_id = $3`;
  } else if (userId) {
    query += ` AND u.user_id = $3`;
  }

  query += `
      GROUP BY source
    ),
    click_data AS (
      SELECT 
        COALESCE(c.referrer, 'direct') as source,
        COUNT(*) as clicks
      FROM clicks c
      JOIN urls u ON c.url_id = u.id
      WHERE c.clicked_at BETWEEN $1 AND $2
  `;

  if (urlId) {
    query += ` AND c.url_id = $3`;
  } else if (userId) {
    query += ` AND u.user_id = $3`;
  }

  query += `
      GROUP BY source
    ),
    all_sources AS (
      SELECT source FROM (
        SELECT COALESCE(i.source, 'direct') as source FROM impressions i 
        JOIN urls u ON i.url_id = u.id
        WHERE i.timestamp BETWEEN $1 AND $2
  `;

  if (urlId) {
    query += ` AND i.url_id = $3`;
  } else if (userId) {
    query += ` AND u.user_id = $3`;
  }

  query += `
        UNION
        SELECT COALESCE(c.referrer, 'direct') as source FROM clicks c
        JOIN urls u ON c.url_id = u.id
        WHERE c.clicked_at BETWEEN $1 AND $2
  `;

  if (urlId) {
    query += ` AND c.url_id = $3`;
  } else if (userId) {
    query += ` AND u.user_id = $3`;
  }

  query += `
      ) src
      GROUP BY source
    )
    SELECT 
      s.source,
      COALESCE(i.impressions, 0) as impressions,
      COALESCE(c.clicks, 0) as clicks,
      CASE 
        WHEN COALESCE(i.impressions, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(c.clicks, 0)::numeric / COALESCE(i.impressions, 0)::numeric) * 100, 2)
      END as ctr
    FROM all_sources s
    LEFT JOIN impression_data i ON s.source = i.source
    LEFT JOIN click_data c ON s.source = c.source
    ORDER BY impressions DESC
  `;

  const params = [startDate, endDate];

  if (urlId !== null || userId !== null) {
    params.push(urlId !== null ? urlId.toString() : userId!.toString());
  }

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Get top performing days based on CTR
 *
 * @param {number|null} urlId - The URL ID (null for all URLs of a user)
 * @param {number|null} userId - The user ID (required if urlId is null)
 * @param {string} startDate - Start date for analysis (YYYY-MM-DD)
 * @param {string} endDate - End date for analysis (YYYY-MM-DD)
 * @param {number} limit - Number of top days to return
 * @returns {Promise<any[]>} Top performing days by CTR
 */
exports.getTopPerformingDays = async (
  urlId: number | null,
  userId: number | null,
  startDate: string,
  endDate: string,
  limit: number = 5,
) => {
  let query = `
    WITH impression_data AS (
      SELECT 
        DATE(i.timestamp) as date,
        COUNT(*) as impressions
      FROM impressions i
      JOIN urls u ON i.url_id = u.id
      WHERE i.timestamp BETWEEN $1 AND $2
  `;

  if (urlId) {
    query += ` AND i.url_id = $3`;
  } else if (userId) {
    query += ` AND u.user_id = $3`;
  }

  query += `
      GROUP BY date
    ),
    click_data AS (
      SELECT 
        DATE(c.clicked_at) as date,
        COUNT(*) as clicks
      FROM clicks c
      JOIN urls u ON c.url_id = u.id
      WHERE c.clicked_at BETWEEN $1 AND $2
  `;

  if (urlId) {
    query += ` AND c.url_id = $3`;
  } else if (userId) {
    query += ` AND u.user_id = $3`;
  }

  query += `
      GROUP BY date
    ),
    ctr_data AS (
      SELECT 
        COALESCE(i.date, c.date) as date,
        COALESCE(i.impressions, 0) as impressions,
        COALESCE(c.clicks, 0) as clicks,
        CASE 
          WHEN COALESCE(i.impressions, 0) = 0 THEN 0
          ELSE (COALESCE(c.clicks, 0)::numeric / COALESCE(i.impressions, 0)::numeric) * 100
        END as ctr
      FROM impression_data i
      FULL OUTER JOIN click_data c ON i.date = c.date
      WHERE COALESCE(i.impressions, 0) > 0
    )
    SELECT 
      to_char(date, 'YYYY-MM-DD') as date,
      impressions,
      clicks,
      ROUND(ctr, 2) as ctr
    FROM ctr_data
    WHERE impressions >= 5  -- Minimum threshold to avoid statistical anomalies
    ORDER BY ctr DESC, impressions DESC
    LIMIT $4
  `;

  const params = [startDate, endDate];

  if (urlId !== null || userId !== null) {
    params.push(urlId !== null ? urlId.toString() : userId!.toString());
  }

  params.push(limit.toString());

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Get CTR leaderboard of URLs
 *
 * @param {number} userId - The user ID
 * @param {string} startDate - Start date for analysis (YYYY-MM-DD)
 * @param {string} endDate - End date for analysis (YYYY-MM-DD)
 * @param {number} limit - Number of URLs to return
 * @param {string} sortBy - Sort metric (ctr, clicks, impressions)
 * @param {string} sortOrder - Sort order (asc, desc)
 * @returns {Promise<any[]>} CTR leaderboard of URLs
 */
exports.getCTRLeaderboard = async (
  userId: number,
  startDate: string,
  endDate: string,
  limit: number = 10,
  sortBy: string = 'ctr',
  sortOrder: string = 'desc',
) => {
  // Validate sort parameters
  const validSortColumns = ['ctr', 'clicks', 'impressions'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'ctr';
  const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const query = `
    WITH impression_counts AS (
      SELECT 
        i.url_id,
        COUNT(*) as impressions
      FROM impressions i
      JOIN urls u ON i.url_id = u.id
      WHERE u.user_id = $1
      AND i.timestamp BETWEEN $2 AND $3
      GROUP BY i.url_id
    ),
    click_counts AS (
      SELECT 
        c.url_id,
        COUNT(*) as clicks
      FROM clicks c
      JOIN urls u ON c.url_id = u.id
      WHERE u.user_id = $1
      AND c.clicked_at BETWEEN $2 AND $3
      GROUP BY c.url_id
    ),
    ctr_data AS (
      SELECT 
        u.id,
        u.short_code,
        u.title,
        COALESCE(i.impressions, 0) as impressions,
        COALESCE(c.clicks, 0) as clicks,
        CASE 
          WHEN COALESCE(i.impressions, 0) = 0 THEN 0
          ELSE (COALESCE(c.clicks, 0)::numeric / COALESCE(i.impressions, 0)::numeric) * 100
        END as ctr
      FROM urls u
      LEFT JOIN impression_counts i ON u.id = i.url_id
      LEFT JOIN click_counts c ON u.id = c.url_id
      WHERE u.user_id = $1
      AND u.deleted_at IS NULL
      AND (i.impressions > 0 OR c.clicks > 0)  -- Only include URLs with activity
    )
    SELECT 
      id,
      short_code,
      title,
      impressions,
      clicks,
      ROUND(ctr, 2) as ctr,
      ROW_NUMBER() OVER (ORDER BY ${sortColumn} ${order}, id ASC) as rank
    FROM ctr_data
    ORDER BY ${sortColumn} ${order}, id ASC
    LIMIT $4
  `;

  const result = await pool.query(query, [userId, startDate, endDate, limit]);
  return result.rows;
};

/**
 * Get overall CTR statistics
 *
 * @param {number|null} urlId - The URL ID (null for all URLs of a user)
 * @param {number|null} userId - The user ID (required if urlId is null)
 * @param {string} startDate - Start date for current period (YYYY-MM-DD)
 * @param {string} endDate - End date for current period (YYYY-MM-DD)
 * @param {string|null} prevStartDate - Start date for previous period (YYYY-MM-DD)
 * @param {string|null} prevEndDate - End date for previous period (YYYY-MM-DD)
 * @returns {Promise<any>} Overall CTR statistics with comparison
 */
exports.getOverallCTRStats = async (
  urlId: number | null,
  userId: number | null,
  startDate: string,
  endDate: string,
  prevStartDate: string | null = null,
  prevEndDate: string | null = null,
) => {
  // Query for current period stats
  let currQuery = `
    WITH impression_data AS (
      SELECT 
        COUNT(*) as total_impressions,
        COUNT(*) FILTER (WHERE is_unique = TRUE) as unique_impressions
      FROM impressions i
      JOIN urls u ON i.url_id = u.id
      WHERE i.timestamp BETWEEN $1 AND $2
  `;

  if (urlId) {
    currQuery += ` AND i.url_id = $3`;
  } else if (userId) {
    currQuery += ` AND u.user_id = $3`;
  }

  currQuery += `
    ),
    click_data AS (
      SELECT 
        COUNT(*) as total_clicks
      FROM clicks c
      JOIN urls u ON c.url_id = u.id
      WHERE c.clicked_at BETWEEN $1 AND $2
  `;

  if (urlId) {
    currQuery += ` AND c.url_id = $3`;
  } else if (userId) {
    currQuery += ` AND u.user_id = $3`;
  }

  currQuery += `
    )
    SELECT 
      COALESCE(i.total_impressions, 0) as total_impressions,
      COALESCE(i.unique_impressions, 0) as unique_impressions,
      COALESCE(c.total_clicks, 0) as total_clicks,
      CASE 
        WHEN COALESCE(i.total_impressions, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(c.total_clicks, 0)::numeric / COALESCE(i.total_impressions, 0)::numeric) * 100, 2)
      END as ctr,
      CASE 
        WHEN COALESCE(i.unique_impressions, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(c.total_clicks, 0)::numeric / COALESCE(i.unique_impressions, 0)::numeric) * 100, 2)
      END as unique_ctr
    FROM impression_data i
    CROSS JOIN click_data c
  `;

  const currParams = [startDate, endDate];

  if (urlId !== null || userId !== null) {
    currParams.push(urlId !== null ? urlId.toString() : userId!.toString());
  }

  const currResult = await pool.query(currQuery, currParams);
  const currStats = currResult.rows[0];

  // If no previous period, return only current period stats
  if (!prevStartDate || !prevEndDate) {
    return {
      current_period: {
        ...currStats,
        start_date: startDate,
        end_date: endDate,
      },
    };
  }

  // Query for previous period stats
  let prevQuery = `
    WITH impression_data AS (
      SELECT 
        COUNT(*) as total_impressions,
        COUNT(*) FILTER (WHERE is_unique = TRUE) as unique_impressions
      FROM impressions i
      JOIN urls u ON i.url_id = u.id
      WHERE i.timestamp BETWEEN $1 AND $2
  `;

  if (urlId) {
    prevQuery += ` AND i.url_id = $3`;
  } else if (userId) {
    prevQuery += ` AND u.user_id = $3`;
  }

  prevQuery += `
    ),
    click_data AS (
      SELECT 
        COUNT(*) as total_clicks
      FROM clicks c
      JOIN urls u ON c.url_id = u.id
      WHERE c.clicked_at BETWEEN $1 AND $2
  `;

  if (urlId) {
    prevQuery += ` AND c.url_id = $3`;
  } else if (userId) {
    prevQuery += ` AND u.user_id = $3`;
  }

  prevQuery += `
    )
    SELECT 
      COALESCE(i.total_impressions, 0) as total_impressions,
      COALESCE(i.unique_impressions, 0) as unique_impressions,
      COALESCE(c.total_clicks, 0) as total_clicks,
      CASE 
        WHEN COALESCE(i.total_impressions, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(c.total_clicks, 0)::numeric / COALESCE(i.total_impressions, 0)::numeric) * 100, 2)
      END as ctr,
      CASE 
        WHEN COALESCE(i.unique_impressions, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(c.total_clicks, 0)::numeric / COALESCE(i.unique_impressions, 0)::numeric) * 100, 2)
      END as unique_ctr
    FROM impression_data i
    CROSS JOIN click_data c
  `;

  const prevParams = [prevStartDate, prevEndDate];

  if (urlId !== null || userId !== null) {
    prevParams.push(urlId !== null ? urlId.toString() : userId!.toString());
  }

  const prevResult = await pool.query(prevQuery, prevParams);
  const prevStats = prevResult.rows[0];

  // Calculate changes and percentages
  const calculateChange = (curr: number, prev: number) => {
    return {
      current: curr,
      previous: prev,
      change: curr - prev,
      change_percentage: prev === 0 ? 0 : parseFloat((((curr - prev) / prev) * 100).toFixed(2)),
    };
  };

  return {
    current_period: {
      ...currStats,
      start_date: startDate,
      end_date: endDate,
    },
    previous_period: {
      ...prevStats,
      start_date: prevStartDate,
      end_date: prevEndDate,
    },
    comparison: {
      impressions: calculateChange(currStats.total_impressions, prevStats.total_impressions),
      unique_impressions: calculateChange(
        currStats.unique_impressions,
        prevStats.unique_impressions,
      ),
      clicks: calculateChange(currStats.total_clicks, prevStats.total_clicks),
      ctr: calculateChange(currStats.ctr, prevStats.ctr),
      unique_ctr: calculateChange(currStats.unique_ctr, prevStats.unique_ctr),
    },
  };
};
