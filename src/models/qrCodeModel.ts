const pool = require('../config/database');
import { QrCode, QrCodeCreateData, QrCodeUpdateData } from '../interfaces/QrCode';
const logger = require('../utils/logger');

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

  logger.info('createQrCode: Inserting QR code into database with data:', {
    url_id,
    color,
    background_color,
    include_logo,
    logo_size: `${logo_size} (${typeof logo_size})`,
    size,
  });

  // Additional validation for logo_size at the last line of defense
  let finalLogoSize = logo_size;
  if (typeof finalLogoSize === 'number') {
    if (finalLogoSize > 1) {
      finalLogoSize = finalLogoSize / 100;
      logger.warn(`Converting large logo_size ${logo_size} to ${finalLogoSize} as a last defense`);
    }

    // Round to 2 decimal places to ensure it meets database precision
    finalLogoSize = Math.round(finalLogoSize * 100) / 100;
    logger.info(`Final logo_size value: ${finalLogoSize}`);
  } else {
    finalLogoSize = 0.2;
    logger.warn(`Non-numeric logo_size detected in model: ${logo_size}, using default 0.2`);
  }

  try {
    logger.info(
      `Database query parameters: [${url_id}, ${color}, ${background_color}, ${include_logo}, ${finalLogoSize}, ${size}]`,
    );

    const result = await pool.query(
      `INSERT INTO qr_codes 
      (url_id, color, background_color, include_logo, logo_size, size)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [url_id, color, background_color, include_logo, finalLogoSize, size],
    );

    logger.info(
      'QR code inserted successfully, returning:',
      JSON.stringify(result.rows[0], null, 2),
    );
    return result.rows[0];
  } catch (error) {
    logger.error('Error inserting QR code into database:', error);

    // Enhanced error logging
    if (error instanceof Error) {
      logger.error(`Database error message: ${error.message}`);

      // Check for specific PostgreSQL error properties
      const pgError = error as any;
      if (pgError.code) {
        logger.error(`PostgreSQL error code: ${pgError.code}`);
      }
      if (pgError.detail) {
        logger.error(`PostgreSQL error detail: ${pgError.detail}`);
      }
      if (pgError.hint) {
        logger.error(`PostgreSQL error hint: ${pgError.hint}`);
      }
      if (pgError.where) {
        logger.error(`PostgreSQL error where: ${pgError.where}`);
      }
    }

    // Re-throw the error
    throw error;
  }
};

/**
 * Get a QR code by its ID
 *
 * @param {number} id - The QR code ID to look up
 * @returns {Promise<QrCode|null>} The QR code object or null if not found
 */
export const getQrCodeById = async (id: number): Promise<QrCode | null> => {
  const result = await pool.query('SELECT * FROM qr_codes WHERE id = $1', [id]);
  return result.rows[0] || null;
};

/**
 * Get all QR codes associated with a specific URL
 *
 * @param {number} urlId - The URL ID
 * @returns {Promise<QrCode[]>} Array of QR code objects
 */
export const getQrCodesByUrlId = async (urlId: number): Promise<QrCode[]> => {
  const result = await pool.query(
    'SELECT * FROM qr_codes WHERE url_id = $1 ORDER BY created_at DESC',
    [urlId],
  );

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
    WHERE id = $${paramCounter} 
    RETURNING *`,
    values,
  );

  return result.rows[0] || null;
};

/**
 * Delete a QR code by ID
 *
 * @param {number} id - The QR code ID to delete
 * @returns {Promise<boolean>} Whether the deletion was successful
 */
export const deleteQrCode = async (id: number): Promise<boolean> => {
  const result = await pool.query('DELETE FROM qr_codes WHERE id = $1 RETURNING id', [id]);

  return result.rowCount > 0;
};

/**
 * Check if a URL has any associated QR codes
 *
 * @param {number} urlId - The URL ID to check
 * @returns {Promise<boolean>} Whether the URL has any QR codes
 */
export const urlHasQrCodes = async (urlId: number): Promise<boolean> => {
  const result = await pool.query('SELECT 1 FROM qr_codes WHERE url_id = $1 LIMIT 1', [urlId]);

  return result.rowCount > 0;
};
