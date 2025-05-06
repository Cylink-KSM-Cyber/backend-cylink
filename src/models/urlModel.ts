const pool = require('../config/database');
const { UrlCreateData, UrlUpdateData } = require('../interfaces/URL');

/**
 * URL Model
 *
 * Provides functions for interacting with the URLs table
 * @module models/urlModel
 */

/**
 * URL object interface
 * @typedef {Object} URL
 * @property {number} id - The URL's unique identifier
 * @property {number|null} user_id - The ID of the user who created the URL
 * @property {string} original_url - The original long URL
 * @property {string} short_code - The shortened URL code
 * @property {string|null} title - Optional title for the URL
 * @property {Date|null} expiry_date - Optional expiration date
 * @property {boolean} is_active - Whether the URL is active
 * @property {boolean} has_password - Whether the URL is password protected
 * @property {string|null} password_hash - Hashed password if protected
 * @property {string} redirect_type - HTTP redirect type (301 or 302)
 * @property {Date} created_at - When the URL was created
 * @property {Date} updated_at - When the URL was last updated
 * @property {Date|null} deleted_at - When the URL was soft deleted (if applicable)
 */

/**
 * Create a new shortened URL
 *
 * @param {typeof UrlCreateData} urlData - The URL data
 * @returns {Promise<any>} The created URL object
 */
exports.createUrl = async (urlData: typeof UrlCreateData) => {
  const {
    user_id,
    original_url,
    short_code,
    title,
    expiry_date,
    is_active = true,
    has_password = false,
    password_hash,
    redirect_type = '302',
  } = urlData;

  const result = await pool.query(
    `INSERT INTO urls 
    (user_id, original_url, short_code, title, expiry_date, is_active, has_password, password_hash, redirect_type)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      user_id,
      original_url,
      short_code,
      title,
      expiry_date,
      is_active,
      has_password,
      password_hash,
      redirect_type,
    ],
  );

  return result.rows[0];
};

/**
 * Get a URL by its short code
 *
 * @param {string} shortCode - The short code to look up
 * @returns {Promise<any|null>} The URL object or null if not found
 */
exports.getUrlByShortCode = async (shortCode: string) => {
  const result = await pool.query(
    'SELECT * FROM urls WHERE short_code = $1 AND is_active = TRUE AND deleted_at IS NULL',
    [shortCode],
  );

  return result.rows[0] || null;
};

/**
 * Get all URLs for a specific user
 * NOTE: This returns ALL URLs for a user without pagination.
 * Pagination should be applied at the controller level AFTER processing and sorting,
 * especially when sorting by metrics that are computed after the database query (like clicks).
 *
 * @param {number} userId - The user ID
 * @returns {Promise<any[]>} Array of URL records
 */
exports.getUrlsByUser = async (userId: number) => {
  const result = await pool.query(
    'SELECT * FROM urls WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
    [userId],
  );

  return result.rows;
};

/**
 * URL search highlights interface
 */
interface UrlHighlights {
  [key: string]: {
    original_url: string[] | null;
    short_code: string[] | null;
    title: string[] | null;
  };
}

/**
 * Search URLs by original_url, short_code, or title for a specific user
 *
 * @param {number} userId - The user ID
 * @param {string} searchTerm - The search term to look for
 * @param {number} page - Page number for pagination
 * @param {number} limit - Number of results per page
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - Sort order (asc or desc)
 * @returns {Promise<{results: any[], total: number, highlights: UrlHighlights}>} Search results, total count, and highlights
 */
exports.searchUrls = async (
  userId: number,
  searchTerm: string,
  page: number = 1,
  limit: number = 10,
  sortBy: string = 'relevance',
  sortOrder: string = 'desc',
) => {
  try {
    // Sanitize the search term to prevent SQL injection
    const sanitizedTerm = searchTerm.replace(/[%_\\]/g, '\\$&');

    // Create the LIKE pattern with case-insensitive search
    const likePattern = `%${sanitizedTerm}%`;

    // Base query for search
    const baseQuery = `
      FROM urls
      WHERE user_id = $1
        AND deleted_at IS NULL
        AND (
          LOWER(original_url) LIKE LOWER($2) OR
          LOWER(short_code) LIKE LOWER($2) OR
          (title IS NOT NULL AND LOWER(title) LIKE LOWER($2))
        )
    `;

    // Count query to get total results
    const countQuery = `SELECT COUNT(*) ${baseQuery}`;

    // Build the search query with different sorting options
    let searchQuery = `
      SELECT id, original_url, short_code, title, expiry_date, is_active, created_at, updated_at
      ${baseQuery}
    `;

    // Apply sorting based on sortBy parameter
    if (sortBy === 'relevance') {
      // Use string literals instead of parameters for the CASE expression to avoid type issues
      // We've already sanitized the term to prevent SQL injection
      searchQuery += `
        ORDER BY
          CASE
            WHEN LOWER(short_code) = LOWER('${sanitizedTerm}') THEN 0
            WHEN LOWER(original_url) = LOWER('${sanitizedTerm}') THEN 1
            WHEN LOWER(title) = LOWER('${sanitizedTerm}') THEN 2
            WHEN LOWER(short_code) LIKE LOWER('${sanitizedTerm}%') THEN 3
            WHEN LOWER(original_url) LIKE LOWER('${sanitizedTerm}%') THEN 4
            WHEN LOWER(title) LIKE LOWER('${sanitizedTerm}%') THEN 5
            ELSE 6
          END ${sortOrder === 'asc' ? 'ASC' : 'DESC'},
          created_at DESC
      `;
    } else {
      // Apply other sorting options
      const validColumns: Record<string, string> = {
        created_at: 'created_at',
        title: 'title',
      };

      const column = validColumns[sortBy] || 'created_at';
      searchQuery += `ORDER BY ${column} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
    }

    // Apply pagination
    searchQuery += ` LIMIT $3 OFFSET $4`;

    // Execute count query
    const countResult = await pool.query(countQuery, [userId, likePattern]);
    const total = parseInt(countResult.rows[0].count, 10);

    // If no results found, return empty array with zero total
    if (total === 0) {
      return {
        results: [],
        total: 0,
        highlights: {},
      };
    }

    // Execute search query
    const offset = (page - 1) * limit;

    // Now we only need 4 parameters: userId, likePattern, limit, offset
    const searchResult = await pool.query(searchQuery, [userId, likePattern, limit, offset]);

    // Generate highlights for matched content
    const highlights: UrlHighlights = {};

    searchResult.rows.forEach((url: any) => {
      highlights[url.id] = {
        original_url: highlightMatches(url.original_url, sanitizedTerm),
        short_code: highlightMatches(url.short_code, sanitizedTerm),
        title: url.title ? highlightMatches(url.title, sanitizedTerm) : null,
      };
    });

    return {
      results: searchResult.rows,
      total,
      highlights,
    };
  } catch (error) {
    // Log and rethrow with better context
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error searching URLs with term "${searchTerm}": ${errorMessage}`);

    // Check for specific database errors and provide more context
    if (error instanceof Error) {
      // Connection errors
      if (errorMessage.includes('connect')) {
        throw new Error(`Database connection error: ${errorMessage}`);
      }

      // Query syntax/column errors
      if (
        errorMessage.includes('column') ||
        errorMessage.includes('parameter') ||
        errorMessage.includes('data type')
      ) {
        throw new Error(`Database query error: ${errorMessage}`);
      }

      // Other database errors
      if (errorMessage.includes('database') || errorMessage.includes('sql')) {
        throw new Error(`Database error: ${errorMessage}`);
      }
    }

    // Rethrow the original error with better context
    throw new Error(`Failed to search URLs: ${errorMessage}`);
  }
};

/**
 * Helper function to generate highlights for matched text
 *
 * @param {string} text - The text to search in
 * @param {string} term - The search term to highlight
 * @returns {string[]} Array of highlighted matches or null if no matches
 */
function highlightMatches(text: string, term: string): string[] | null {
  if (!text) return null;

  const matches = [];
  const lowerText = text.toLowerCase();
  const lowerTerm = term.toLowerCase();

  let startPos = 0;
  let foundPos;

  // Find all occurrences of the term in the text
  while ((foundPos = lowerText.indexOf(lowerTerm, startPos)) !== -1) {
    // Get some context around the match (10 chars before and after)
    const contextStart = Math.max(0, foundPos - 10);
    const contextEnd = Math.min(text.length, foundPos + term.length + 10);

    // Extract the context and add HTML emphasis tags for highlighting
    let match = text.substring(contextStart, contextEnd);

    // Find the actual match in the extracted context
    const matchStartInContext = foundPos - contextStart;
    const matchEndInContext = matchStartInContext + term.length;

    // Insert the highlighting tags
    match =
      match.substring(0, matchStartInContext) +
      '<em>' +
      match.substring(matchStartInContext, matchEndInContext) +
      '</em>' +
      match.substring(matchEndInContext);

    matches.push(match);

    // Move to position after this match
    startPos = foundPos + term.length;
  }

  return matches.length > 0 ? matches : null;
}

/**
 * Update a URL by ID
 *
 * @param {number} id - The URL ID to update
 * @param {UrlUpdateData} updateData - The data to update
 * @returns {Promise<any>} The updated URL object
 */
exports.updateUrl = async (id: number, updateData: typeof UrlUpdateData) => {
  const keys = Object.keys(updateData).filter(
    key => updateData[key as keyof typeof updateData] !== undefined,
  );

  if (keys.length === 0) {
    return null;
  }

  const setClause = [];
  const values = [];
  let paramCounter = 1;

  // Add each field to be updated to the SET clause
  for (const key of keys) {
    setClause.push(`${key} = $${paramCounter}`);
    values.push(updateData[key as keyof typeof updateData]);
    paramCounter++;
  }

  // Always update the updated_at timestamp
  setClause.push(`updated_at = NOW()`);

  // Add the URL ID as the last parameter
  values.push(id);

  const result = await pool.query(
    `UPDATE urls SET ${setClause.join(', ')} WHERE id = $${paramCounter} RETURNING *`,
    values,
  );

  return result.rows[0] || null;
};

/**
 * Soft delete a URL by ID
 *
 * @param {number} id - The URL ID to delete
 * @returns {Promise<boolean>} Whether the deletion was successful
 */
exports.deleteUrl = async (id: number) => {
  const result = await pool.query(
    'UPDATE urls SET deleted_at = NOW(), is_active = FALSE WHERE id = $1 RETURNING id',
    [id],
  );

  return result.rowCount > 0;
};

/**
 * Check if a short code already exists
 *
 * @param {string} shortCode - The short code to check
 * @returns {Promise<boolean>} Whether the short code exists
 */
exports.shortCodeExists = async (shortCode: string) => {
  const result = await pool.query('SELECT 1 FROM urls WHERE short_code = $1', [shortCode]);

  return result.rowCount > 0;
};

/**
 * Get a URL by ID
 *
 * @param {number} id - The URL ID to retrieve
 * @param {boolean} [includeSoftDeleted=false] - Whether to include soft-deleted URLs
 * @returns {Promise<any|null>} The URL object or null if not found
 */
exports.getUrlById = async (id: number, includeSoftDeleted: boolean = false) => {
  const query = includeSoftDeleted
    ? 'SELECT * FROM urls WHERE id = $1'
    : 'SELECT * FROM urls WHERE id = $1 AND deleted_at IS NULL';

  const result = await pool.query(query, [id]);

  return result.rows[0] || null;
};

/**
 * Interface for URL filtering and pagination options
 */
interface UrlFilterOptions {
  status?: 'all' | 'active' | 'inactive' | 'expired' | 'expiring-soon';
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Get all URLs created by a specific user with optional status filtering
 *
 * @param {number} userId - The user ID
 * @param {UrlFilterOptions} options - Query options including pagination, sorting, and filtering
 * @param {string} [options.status='all'] - Filter by URL status (all, active, inactive, expired, expiring-soon)
 * @param {number} [options.page=1] - Page number for pagination
 * @param {number} [options.limit=10] - Number of items per page
 * @param {string} [options.sortBy='created_at'] - Field to sort by
 * @param {string} [options.sortOrder='desc'] - Sort order (asc or desc)
 * @returns {Promise<{urls: any[], total: number, total_all: number}>} URLs, total matching count, and total overall count
 */
exports.getUrlsByUserWithFilters = async (userId: number, options: UrlFilterOptions = {}) => {
  const {
    status = 'all',
    page = 1,
    limit = 10,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = options;

  // Calculate offset for pagination
  const offset = (page - 1) * limit;

  // Base where clause: user_id and not deleted
  let whereClause = 'user_id = $1 AND deleted_at IS NULL';
  const params: (number | string)[] = [userId];
  let paramIndex = 2; // Start from $2 since $1 is userId

  // Add status filtering
  if (status !== 'all') {
    if (status === 'active') {
      // Active URLs: not expired and is_active = true
      whereClause += ` AND is_active = TRUE AND (expiry_date IS NULL OR expiry_date > NOW())`;
    } else if (status === 'inactive') {
      // Inactive URLs: is_active = false
      whereClause += ` AND is_active = FALSE`;
    } else if (status === 'expired') {
      // Expired URLs: expiry_date < current date
      whereClause += ` AND expiry_date IS NOT NULL AND expiry_date < NOW()`;
    } else if (status === 'expiring-soon') {
      // Expiring soon: expires within the next 7 days, not yet expired
      whereClause += ` AND expiry_date IS NOT NULL AND expiry_date > NOW() AND expiry_date < NOW() + INTERVAL '7 days'`;
    }
  }

  // Get total count of all URLs for the user
  const totalAllQuery = `SELECT COUNT(*) FROM urls WHERE user_id = $1 AND deleted_at IS NULL`;
  const totalAllResult = await pool.query(totalAllQuery, [userId]);
  const totalAll = parseInt(totalAllResult.rows[0].count, 10);

  // Get total count of filtered URLs
  const totalQuery = `SELECT COUNT(*) FROM urls WHERE ${whereClause}`;
  const totalResult = await pool.query(totalQuery, params);
  const total = parseInt(totalResult.rows[0].count, 10);

  // Determine sort column and order
  const validColumns: Record<string, string> = {
    created_at: 'created_at',
    title: 'title',
    // Note: both clicks and title sorting are fully handled in application logic after querying
    // Database-level sorting for title may not work correctly with null values or case sensitivity
  };

  let orderClause = '';
  if (sortBy === 'clicks') {
    // NOTE: Sorting by clicks cannot be done at the database level since clicks are in a separate table
    // This sorting will be handled at the application level after fetching the data
    orderClause = `ORDER BY created_at ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
  } else if (sortBy === 'title') {
    // NOTE: Title sorting is done at application level for consistent null handling and case sensitivity
    // We'll sort at database level first but it will be overridden in the service layer
    orderClause = `ORDER BY title ${sortOrder === 'asc' ? 'ASC' : 'DESC'} NULLS LAST`;
  } else {
    const column = validColumns[sortBy] || 'created_at';
    orderClause = `ORDER BY ${column} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
  }

  // Get filtered URLs with pagination
  const urlsQuery = `
    SELECT * FROM urls 
    WHERE ${whereClause}
    ${orderClause}
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  params.push(limit, offset);

  const urlsResult = await pool.query(urlsQuery, params);

  return {
    urls: urlsResult.rows,
    total,
    total_all: totalAll,
  };
};
