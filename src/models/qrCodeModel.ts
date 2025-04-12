const pool = require('@/config/database');
import { QrCode, QrCodeCreateData, QrCodeUpdateData } from '@/interfaces/QrCode';

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

  const result = await pool.query(
    `INSERT INTO qr_codes 
    (url_id, color, background_color, include_logo, logo_size, size)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [url_id, color, background_color, include_logo, logo_size, size],
  );

  return result.rows[0];
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
