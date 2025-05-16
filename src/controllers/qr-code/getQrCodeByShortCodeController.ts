import { Request, Response } from 'express';
import { getQrCodeResponseByShortCode } from '../../services/qrCodeService';
import logger from '../../utils/logger';
import { sendResponse } from '../../utils/response';

/**
 * Validates the short code parameter
 *
 * @param {string|undefined} shortCode - Short code to validate
 * @returns {boolean} True if short code is valid
 */
const isValidShortCode = (shortCode?: string): boolean => {
  return Boolean(shortCode && shortCode.trim().length > 0);
};

/**
 * Get a QR code by its short code
 *
 * This controller retrieves a QR code using its unique short code.
 * It validates the short code parameter and returns the QR code data if found.
 *
 * @param {Request} req - Express request object with short code parameter
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with QR code or error
 *
 * @example
 * // Request parameter example
 * // GET /api/qrcodes/shortCode/abc123
 */
export const getQrCodeByShortCode = async (req: Request, res: Response): Promise<Response> => {
  // Validate shortCode parameter
  const shortCode = req.params.shortCode;

  if (!isValidShortCode(shortCode)) {
    logger.warn(`Invalid short code parameter provided: ${shortCode}`);
    return sendResponse(res, 400, 'Invalid short code');
  }

  try {
    // Retrieve QR code from service
    const qrCode = await getQrCodeResponseByShortCode(shortCode);

    // Guard clause: Return 404 if QR code not found
    if (!qrCode) {
      logger.info(`QR code not found for short code: ${shortCode}`);
      return sendResponse(res, 404, 'QR code not found');
    }

    logger.info(`Successfully retrieved QR code for short code: ${shortCode}`);
    return sendResponse(res, 200, 'Successfully retrieved QR code', qrCode);
  } catch (error) {
    // Log error
    logger.error(`Error retrieving QR code for short code ${shortCode}:`, error);
    return sendResponse(res, 500, 'Internal Server Error');
  }
};
