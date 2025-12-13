import { Request, Response } from 'express';
import { getQrCodeResponseByUrlId } from '../../services/qrCodeService';
import logger from '../../libs/winston/winston.service';
import { sendResponse } from '../../utils/response';

/**
 * Validates URL ID from request parameters
 * @param {string} urlIdParam - The URL ID parameter from the request
 * @returns {number} Parsed URL ID
 * @throws {Error} If URL ID is invalid
 */
const validateUrlId = (urlIdParam: string): number => {
  const urlId = parseInt(urlIdParam);
  if (isNaN(urlId)) {
    throw new Error('Invalid URL ID');
  }
  return urlId;
};

/**
 * Gets a QR code by its associated URL ID
 *
 * This controller retrieves a QR code using the ID of its associated URL.
 * It validates the URL ID parameter and returns the QR code data if found.
 *
 * @param {Request} req - Express request object with URL ID parameter
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with QR code or error
 *
 * @example
 * // Request parameter example
 * // GET /api/qrcodes/url/456
 */
export const getQrCodeByUrlId = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Validate and parse URL ID
    const urlId = validateUrlId(req.params.url_id);

    // Retrieve QR code from service
    const qrCode = await getQrCodeResponseByUrlId(urlId);

    // Return 404 if QR code not found
    if (!qrCode) {
      return sendResponse(res, 404, 'QR code not found');
    }

    logger.info(`Successfully retrieved QR code for URL ID: ${urlId}`);
    return sendResponse(res, 200, 'Successfully retrieved QR code', qrCode);
  } catch (error) {
    // Handle validation errors
    if (error instanceof Error && error.message === 'Invalid URL ID') {
      return sendResponse(res, 400, error.message);
    }

    // Log error and return generic error message
    logger.error('Error retrieving QR code:', error);
    return sendResponse(res, 500, 'Internal Server Error');
  }
};
