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
 * Get all URLs created by a specific user
 *
 * @param {number} userId - The user ID
 * @returns {Promise<any[]>} Array of URL objects
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
    // For relevance sorting, prioritize exact matches, then beginning matches, then contains matches
    searchQuery += `
      ORDER BY
        CASE
          WHEN LOWER(short_code) = LOWER($3) THEN 0
          WHEN LOWER(original_url) = LOWER($3) THEN 1
          WHEN LOWER(title) = LOWER($3) THEN 2
          WHEN LOWER(short_code) LIKE LOWER($3 || '%') THEN 3
          WHEN LOWER(original_url) LIKE LOWER($3 || '%') THEN 4
          WHEN LOWER(title) LIKE LOWER($3 || '%') THEN 5
          ELSE 6
        END ${sortOrder === 'asc' ? 'ASC' : 'DESC'},
        created_at DESC
    `;
  } else {
    // Apply other sorting options
    const validColumns: Record<string, string> = {
      created_at: 'created_at',
      title: 'title',
      clicks: 'clicks',
    };

    const column = validColumns[sortBy] || 'created_at';
    searchQuery += `ORDER BY ${column} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
  }

  // Apply pagination
  searchQuery += ` LIMIT $4 OFFSET $5`;

  // Execute count query
  const countResult = await pool.query(countQuery, [userId, likePattern]);
  const total = parseInt(countResult.rows[0].count, 10);

  // Execute search query
  const offset = (page - 1) * limit;
  const searchResult = await pool.query(searchQuery, [
    userId,
    likePattern,
    sanitizedTerm,
    limit,
    offset,
  ]);

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
 * Update an existing URL
 *
 * @param {number} id - The URL ID to update
 * @param {typeof UrlUpdateData} updateData - The fields to update
 * @returns {Promise<any|null>} The updated URL or null if not found
 */
exports.updateUrl = async (id: number, updateData: typeof UrlUpdateData) => {
  // Build dynamic update query
  const setClause = [];
  const values = [];
  let paramCounter = 1;

  Object.entries(updateData).forEach(([key, value]) => {
    setClause.push(`${key} = $${paramCounter}`);
    values.push(value);
    paramCounter++;
  });

  // Add updated_at timestamp
  setClause.push(`updated_at = NOW()`);

  // Add the ID to the values array
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
 * Get a URL by its ID (including soft deleted URLs)
 *
 * @param {number} id - The URL ID to look up
 * @param {boolean} includeDeleted - Whether to include soft deleted URLs
 * @returns {Promise<any|null>} The URL object or null if not found
 */
exports.getUrlById = async (id: number, includeDeleted = false) => {
  let query = 'SELECT * FROM urls WHERE id = $1';

  if (!includeDeleted) {
    query += ' AND deleted_at IS NULL';
  }

  const result = await pool.query(query, [id]);

  return result.rows[0] || null;
};
