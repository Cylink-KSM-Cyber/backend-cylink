const pool = require('../config/database');
import {
  QrCode,
  QrCodeCreateData,
  QrCodeUpdateData,
  QrCodeListQueryParams,
} from '../interfaces/QrCode';

/**
 * QR Code Model
 *
 * Provides functions for interacting with the qr_codes table
 * @module models/qrCodeModel
 */

/**
 * Create a new QR code
 *
 * @param {QrCodeCreateData} qrCodeData - The QR code data
 * @returns {Promise<QrCode>} The created QR code object
 */
export const createQrCode = async (qrCodeData: QrCodeCreateData): Promise<QrCode> => {
  const {
    url_id,
    color = '#000000',
    background_color = '#FFFFFF',
    include_logo = true,
    logo_size = 0.2,
    size = 300,
  } = qrCodeData;

  // Additional validation for logo_size at the last line of defense
  let finalLogoSize = logo_size;
  if (typeof finalLogoSize === 'number') {
    if (finalLogoSize > 1) {
      finalLogoSize = finalLogoSize / 100;
    }

    // Round to 2 decimal places to ensure it meets database precision
    finalLogoSize = Math.round(finalLogoSize * 100) / 100;
  } else {
    finalLogoSize = 0.2;
  }

  const result = await pool.query(
    `INSERT INTO qr_codes 
    (url_id, color, background_color, include_logo, logo_size, size)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [url_id, color, background_color, include_logo, finalLogoSize, size],
  );

  return result.rows[0];
};

/**
 * Get a QR code by its ID
 *
 * @param {number} id - The QR code ID to look up
 * @param {boolean} includeDeleted - Whether to include soft-deleted QR codes
 * @returns {Promise<QrCode|null>} The QR code object or null if not found
 */
export const getQrCodeById = async (id: number, includeDeleted = false): Promise<QrCode | null> => {
  const query = includeDeleted
    ? 'SELECT * FROM qr_codes WHERE id = $1'
    : 'SELECT * FROM qr_codes WHERE id = $1 AND deleted_at IS NULL';

  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

/**
 * Get all QR codes associated with a specific URL
 *
 * @param {number} urlId - The URL ID
 * @param {boolean} includeDeleted - Whether to include soft-deleted QR codes
 * @returns {Promise<QrCode[]>} Array of QR code objects
 */
export const getQrCodesByUrlId = async (
  urlId: number,
  includeDeleted = false,
): Promise<QrCode[]> => {
  const query = includeDeleted
    ? 'SELECT * FROM qr_codes WHERE url_id = $1 ORDER BY created_at DESC'
    : 'SELECT * FROM qr_codes WHERE url_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC';

  const result = await pool.query(query, [urlId]);
  return result.rows;
};

/**
 * Update an existing QR code
 *
 * @param {number} id - The QR code ID to update
 * @param {QrCodeUpdateData} updateData - The fields to update
 * @returns {Promise<QrCode|null>} The updated QR code or null if not found
 */
export const updateQrCode = async (
  id: number,
  updateData: QrCodeUpdateData,
): Promise<QrCode | null> => {
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
    `UPDATE qr_codes SET ${setClause.join(', ')} 
    WHERE id = $${paramCounter} AND deleted_at IS NULL
    RETURNING *`,
    values,
  );

  return result.rows[0] || null;
};

/**
 * Soft delete a QR code by ID
 *
 * @param {number} id - The QR code ID to delete
 * @returns {Promise<QrCode|null>} The deleted QR code with deleted_at timestamp or null if not found
 */
export const deleteQrCode = async (id: number): Promise<QrCode | null> => {
  const result = await pool.query(
    'UPDATE qr_codes SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *',
    [id],
  );

  return result.rows[0] || null;
};

/**
 * Hard delete a QR code by ID (for administrative purposes only)
 *
 * @param {number} id - The QR code ID to permanently delete
 * @returns {Promise<boolean>} Whether the deletion was successful
 */
export const hardDeleteQrCode = async (id: number): Promise<boolean> => {
  const result = await pool.query('DELETE FROM qr_codes WHERE id = $1 RETURNING id', [id]);
  return result.rowCount > 0;
};

/**
 * Check if a URL has any associated QR codes
 *
 * @param {number} urlId - The URL ID to check
 * @param {boolean} includeDeleted - Whether to include soft-deleted QR codes
 * @returns {Promise<boolean>} Whether the URL has any QR codes
 */
export const urlHasQrCodes = async (urlId: number, includeDeleted = false): Promise<boolean> => {
  const query = includeDeleted
    ? 'SELECT 1 FROM qr_codes WHERE url_id = $1 LIMIT 1'
    : 'SELECT 1 FROM qr_codes WHERE url_id = $1 AND deleted_at IS NULL LIMIT 1';

  const result = await pool.query(query, [urlId]);
  return result.rowCount > 0;
};

/**
 * Get all QR codes for a specific user with pagination, sorting, and filtering
 *
 * @param {number} userId - The ID of the user
 * @param {QrCodeListQueryParams} queryParams - Query parameters for pagination, sorting, and filtering
 * @param {boolean} includeDeleted - Whether to include soft-deleted QR codes
 * @returns {Promise<{qrCodes: QrCode[], total: number}>} QR codes and total count
 * @throws {Error} If invalid parameters are provided
 */
export const getQrCodesByUser = async (
  userId: number,
  queryParams: QrCodeListQueryParams,
  includeDeleted = false,
): Promise<{ qrCodes: QrCode[]; total: number }> => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'created_at',
    sortOrder = 'desc',
    search,
    color,
    includeLogo,
    includeUrl = true,
  } = queryParams;

  // Validate and sanitize the sort column to prevent SQL injection
  const validSortColumns: Record<string, string> = {
    // Standard values
    created_at: 'qc.created_at',
    url_id: 'qc.url_id',
    color: 'qc.color',
    include_logo: 'qc.include_logo',
    size: 'qc.size',
    // Alternative formats that users might send
    createdat: 'qc.created_at',
    created: 'qc.created_at',
    date: 'qc.created_at',
    urlid: 'qc.url_id',
    url: 'qc.url_id',
    includelogo: 'qc.include_logo',
    logo: 'qc.include_logo',
  };

  // Normalize sortBy to handle case differences and common variations
  const normalizedSortBy =
    typeof sortBy === 'string' ? sortBy.toLowerCase().replace(/[^a-z0-9_]/g, '') : 'created_at';

  // Map to valid database column
  const sortColumn = validSortColumns[normalizedSortBy] || 'qc.created_at';

  // Validate and normalize sortOrder - be lenient with format
  const normalizedSortOrder =
    typeof sortOrder === 'string' ? sortOrder.toLowerCase().trim() : 'desc';
  const validOrder =
    normalizedSortOrder === 'asc' || normalizedSortOrder === 'ascending' ? 'ASC' : 'DESC';

  const offset = (page - 1) * limit;

  // Build the base query
  let baseQuery = `
    FROM qr_codes qc
    JOIN urls u ON qc.url_id = u.id
    WHERE u.user_id = $1
      AND u.deleted_at IS NULL
  `;

  // Add condition to exclude deleted QR codes unless includeDeleted is true
  if (!includeDeleted) {
    baseQuery += ' AND qc.deleted_at IS NULL';
  }

  const queryValues: any[] = [userId];
  let paramIndex = 2;

  // Add search functionality
  if (search) {
    baseQuery += ` AND (
      u.original_url ILIKE $${paramIndex} OR 
      u.short_code ILIKE $${paramIndex} OR
      u.title ILIKE $${paramIndex}
    )`;
    queryValues.push(`%${search}%`);
    paramIndex++;
  }

  // Add color filter
  if (color) {
    baseQuery += ` AND qc.color = $${paramIndex}`;
    queryValues.push(color);
    paramIndex++;
  }

  // Add include_logo filter
  if (includeLogo !== undefined) {
    baseQuery += ` AND qc.include_logo = $${paramIndex}`;
    queryValues.push(includeLogo);
    paramIndex++;
  }

  // Get total count
  const countQuery = `SELECT COUNT(*) ${baseQuery}`;
  const countResult = await pool.query(countQuery, queryValues);
  const total = parseInt(countResult.rows[0].count, 10);

  // Get paginated and sorted QR codes
  let selectFields = 'qc.*';
  if (includeUrl) {
    selectFields +=
      ', u.id as url_id, u.original_url, u.title, u.short_code, (SELECT COUNT(*) FROM clicks c WHERE c.url_id = u.id) as clicks';
  }

  const dataQuery = `
    SELECT ${selectFields}
    ${baseQuery}
    ORDER BY ${sortColumn} ${validOrder}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  queryValues.push(limit, offset);
  const dataResult = await pool.query(dataQuery, queryValues);

  // Format the results
  const qrCodes = dataResult.rows.map((row: any) => {
    if (includeUrl) {
      // If includeUrl is true, format the data to include URL information
      const { original_url, title, clicks, short_code, ...qrCodeData } = row;

      return {
        ...qrCodeData,
        short_code, // Include the short_code directly in the QR code object
        url: {
          id: row.url_id,
          original_url,
          title,
          clicks: clicks || 0,
          short_code,
        },
      };
    }
    return row;
  });

  return { qrCodes, total };
};
