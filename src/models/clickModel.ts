const pool = require("@/config/database");

/**
 * Click Analytics Model
 *
 * Provides functions for tracking and analyzing clicks on shortened URLs
 * @module models/clickModel
 */

/**
 * Click data interface
 */
interface ClickData {
  url_id: number;
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  country?: string;
  device_type?: string;
  browser?: string;
}

/**
 * Records a new click on a shortened URL
 *
 * @param {ClickData} clickData - Data about the click event
 * @returns {Promise<any>} The created click record
 */
exports.recordClick = async (clickData: ClickData) => {
  const {
    url_id,
    ip_address,
    user_agent,
    referrer,
    country,
    device_type,
    browser,
  } = clickData;

  const result = await pool.query(
    `INSERT INTO clicks 
    (url_id, ip_address, user_agent, referrer, country, device_type, browser)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [url_id, ip_address, user_agent, referrer, country, device_type, browser]
  );

  return result.rows[0];
};

/**
 * Get all clicks for a specific URL
 *
 * @param {number} urlId - The URL ID
 * @returns {Promise<any[]>} Array of click records
 */
exports.getClicksByUrlId = async (urlId: number) => {
  const result = await pool.query(
    "SELECT * FROM clicks WHERE url_id = $1 ORDER BY clicked_at DESC",
    [urlId]
  );

  return result.rows;
};

/**
 * Get click count for a specific URL
 *
 * @param {number} urlId - The URL ID
 * @returns {Promise<number>} Number of clicks
 */
exports.getClickCountByUrlId = async (urlId: number) => {
  const result = await pool.query(
    "SELECT COUNT(*) as count FROM clicks WHERE url_id = $1",
    [urlId]
  );

  return parseInt(result.rows[0].count, 10);
};

/**
 * Get total clicks for all URLs belonging to a user
 *
 * @param {number} userId - The user ID
 * @returns {Promise<number>} Total number of clicks
 */
exports.getTotalClicksByUserId = async (userId: number) => {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM clicks c
     JOIN urls u ON c.url_id = u.id
     WHERE u.user_id = $1`,
    [userId]
  );

  return parseInt(result.rows[0].count, 10);
};

/**
 * Get daily click statistics for a URL
 *
 * @param {number} urlId - The URL ID
 * @param {number} days - Number of past days to include (default: 30)
 * @returns {Promise<any[]>} Daily click statistics
 */
exports.getDailyClickStats = async (urlId: number, days: number = 30) => {
  const result = await pool.query(
    `SELECT 
      DATE(clicked_at) as date,
      COUNT(*) as clicks
     FROM clicks
     WHERE url_id = $1
     AND clicked_at >= NOW() - INTERVAL '${days} days'
     GROUP BY DATE(clicked_at)
     ORDER BY date DESC`,
    [urlId]
  );

  return result.rows;
};

/**
 * Get browser statistics for a URL
 *
 * @param {number} urlId - The URL ID
 * @returns {Promise<any[]>} Browser usage statistics
 */
exports.getBrowserStats = async (urlId: number) => {
  const result = await pool.query(
    `SELECT 
      browser,
      COUNT(*) as count
     FROM clicks
     WHERE url_id = $1
     GROUP BY browser
     ORDER BY count DESC`,
    [urlId]
  );

  return result.rows;
};

/**
 * Get device type statistics for a URL
 *
 * @param {number} urlId - The URL ID
 * @returns {Promise<any[]>} Device type statistics
 */
exports.getDeviceStats = async (urlId: number) => {
  const result = await pool.query(
    `SELECT 
      device_type,
      COUNT(*) as count
     FROM clicks
     WHERE url_id = $1
     GROUP BY device_type
     ORDER BY count DESC`,
    [urlId]
  );

  return result.rows;
};

/**
 * Get country statistics for a URL
 *
 * @param {number} urlId - The URL ID
 * @returns {Promise<any[]>} Country statistics
 */
exports.getCountryStats = async (urlId: number) => {
  const result = await pool.query(
    `SELECT 
      country,
      COUNT(*) as count
     FROM clicks
     WHERE url_id = $1 AND country IS NOT NULL
     GROUP BY country
     ORDER BY count DESC`,
    [urlId]
  );

  return result.rows;
};

/**
 * Get referrer statistics for a URL
 *
 * @param {number} urlId - The URL ID
 * @returns {Promise<any[]>} Referrer statistics
 */
exports.getReferrerStats = async (urlId: number) => {
  const result = await pool.query(
    `SELECT 
      referrer,
      COUNT(*) as count
     FROM clicks
     WHERE url_id = $1 AND referrer IS NOT NULL
     GROUP BY referrer
     ORDER BY count DESC`,
    [urlId]
  );

  return result.rows;
};

/**
 * Get recent clicks for a specific URL
 *
 * @param {number} urlId - The URL ID
 * @param {number} limit - Maximum number of clicks to return
 * @returns {Promise<any[]>} Array of recent click records
 */
exports.getRecentClicksByUrlId = async (urlId: number, limit: number = 10) => {
  const result = await pool.query(
    "SELECT * FROM clicks WHERE url_id = $1 ORDER BY clicked_at DESC LIMIT $2",
    [urlId, limit]
  );

  return result.rows;
};

/**
 * Get count of unique visitors for a URL
 *
 * @param {number} urlId - The URL ID
 * @param {Date} [startDate] - Optional start date for filtering
 * @param {Date} [endDate] - Optional end date for filtering
 * @returns {Promise<number>} Number of unique visitors
 */
exports.getUniqueVisitorsByUrlId = async (
  urlId: number,
  startDate?: Date,
  endDate?: Date
) => {
  let query = `
    SELECT COUNT(DISTINCT ip_address) as count
    FROM clicks
    WHERE url_id = $1
  `;

  const queryParams: any[] = [urlId];
  let paramIndex = 2;

  // Add date filtering if provided
  if (startDate) {
    query += ` AND clicked_at >= $${paramIndex}`;
    queryParams.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    query += ` AND clicked_at <= $${paramIndex}`;
    queryParams.push(endDate);
  }

  const result = await pool.query(query, queryParams);

  return parseInt(result.rows[0].count, 10);
};

/**
 * Get click count for a specific URL with date filtering
 *
 * @param {number} urlId - The URL ID
 * @param {Date} [startDate] - Optional start date for filtering
 * @param {Date} [endDate] - Optional end date for filtering
 * @returns {Promise<number>} Number of clicks
 */
exports.getClickCountByUrlIdWithDateRange = async (
  urlId: number,
  startDate?: Date,
  endDate?: Date
) => {
  let query = `
    SELECT COUNT(*) as count
    FROM clicks
    WHERE url_id = $1
  `;

  const queryParams: any[] = [urlId];
  let paramIndex = 2;

  // Add date filtering if provided
  if (startDate) {
    query += ` AND clicked_at >= $${paramIndex}`;
    queryParams.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    query += ` AND clicked_at <= $${paramIndex}`;
    queryParams.push(endDate);
  }

  const result = await pool.query(query, queryParams);

  return parseInt(result.rows[0].count, 10);
};

/**
 * Get time series data for a URL with grouping options
 *
 * @param {number} urlId - The URL ID
 * @param {string} groupBy - How to group the data ('day', 'week', 'month')
 * @param {Date} [startDate] - Optional start date for filtering
 * @param {Date} [endDate] - Optional end date for filtering
 * @returns {Promise<any[]>} Time series data
 */
exports.getTimeSeriesData = async (
  urlId: number,
  groupBy: string = "day",
  startDate?: Date,
  endDate?: Date
) => {
  // Determine the date format for grouping
  let dateFormat = "";

  switch (groupBy.toLowerCase()) {
    case "week":
      dateFormat = "YYYY-WW"; // ISO week format
      break;
    case "month":
      dateFormat = "YYYY-MM";
      break;
    case "day":
    default:
      dateFormat = "YYYY-MM-DD";
      break;
  }

  // Build the query
  let query = `
    SELECT 
      TO_CHAR(clicked_at, $2) as date,
      COUNT(*) as clicks
    FROM clicks
    WHERE url_id = $1
  `;

  const queryParams: any[] = [urlId, dateFormat];
  let paramIndex = 3;

  // Add date filtering if provided
  if (startDate) {
    query += ` AND clicked_at >= $${paramIndex}`;
    queryParams.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    query += ` AND clicked_at <= $${paramIndex}`;
    queryParams.push(endDate);
    paramIndex++;
  }

  // Group by the formatted date and order by date
  query += `
    GROUP BY TO_CHAR(clicked_at, $2)
    ORDER BY date ASC
  `;

  const result = await pool.query(query, queryParams);

  return result.rows.map((row: any) => ({
    date: row.date,
    clicks: parseInt(row.clicks, 10),
  }));
};

/**
 * Get browser statistics for a URL with date filtering
 *
 * @param {number} urlId - The URL ID
 * @param {Date} [startDate] - Optional start date for filtering
 * @param {Date} [endDate] - Optional end date for filtering
 * @returns {Promise<any[]>} Browser usage statistics
 */
exports.getBrowserStatsWithDateRange = async (
  urlId: number,
  startDate?: Date,
  endDate?: Date
) => {
  let query = `
    SELECT 
      browser,
      COUNT(*) as count
    FROM clicks
    WHERE url_id = $1
  `;

  const queryParams: any[] = [urlId];
  let paramIndex = 2;

  // Add date filtering if provided
  if (startDate) {
    query += ` AND clicked_at >= $${paramIndex}`;
    queryParams.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    query += ` AND clicked_at <= $${paramIndex}`;
    queryParams.push(endDate);
  }

  query += `
    GROUP BY browser
    ORDER BY count DESC
  `;

  const result = await pool.query(query, queryParams);

  return result.rows;
};

/**
 * Get device type statistics for a URL with date filtering
 *
 * @param {number} urlId - The URL ID
 * @param {Date} [startDate] - Optional start date for filtering
 * @param {Date} [endDate] - Optional end date for filtering
 * @returns {Promise<any[]>} Device type statistics
 */
exports.getDeviceStatsWithDateRange = async (
  urlId: number,
  startDate?: Date,
  endDate?: Date
) => {
  let query = `
    SELECT 
      device_type,
      COUNT(*) as count
    FROM clicks
    WHERE url_id = $1
  `;

  const queryParams: any[] = [urlId];
  let paramIndex = 2;

  // Add date filtering if provided
  if (startDate) {
    query += ` AND clicked_at >= $${paramIndex}`;
    queryParams.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    query += ` AND clicked_at <= $${paramIndex}`;
    queryParams.push(endDate);
  }

  query += `
    GROUP BY device_type
    ORDER BY count DESC
  `;

  const result = await pool.query(query, queryParams);

  return result.rows;
};

/**
 * Get country statistics for a URL with date filtering
 *
 * @param {number} urlId - The URL ID
 * @param {Date} [startDate] - Optional start date for filtering
 * @param {Date} [endDate] - Optional end date for filtering
 * @returns {Promise<any[]>} Country statistics
 */
exports.getCountryStatsWithDateRange = async (
  urlId: number,
  startDate?: Date,
  endDate?: Date
) => {
  let query = `
    SELECT 
      country,
      COUNT(*) as count
    FROM clicks
    WHERE url_id = $1 AND country IS NOT NULL
  `;

  const queryParams: any[] = [urlId];
  let paramIndex = 2;

  // Add date filtering if provided
  if (startDate) {
    query += ` AND clicked_at >= $${paramIndex}`;
    queryParams.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    query += ` AND clicked_at <= $${paramIndex}`;
    queryParams.push(endDate);
  }

  query += `
    GROUP BY country
    ORDER BY count DESC
  `;

  const result = await pool.query(query, queryParams);

  return result.rows;
};
