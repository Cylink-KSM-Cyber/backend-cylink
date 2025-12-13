import { Request, Response } from 'express';
import { getQrCodeResponseById } from '../../services/qrCodeService';
import logger from '../../libs/winston/winston.service';
import { sendResponse } from '../../utils/response';

/**
 * Validates QR code ID from request parameters
 * @param {string} idParam - The ID parameter from the request
 * @returns {number} Parsed ID
 * @throws {Error} If ID is invalid
 */
const validateQrCodeId = (idParam: string): number => {
  const id = parseInt(idParam);
  if (isNaN(id)) {
    throw new Error('Invalid QR code ID');
  }
  return id;
};

/**
 * Gets a QR code by its ID
 *
 * This controller retrieves a QR code using its unique identifier.
 * It validates the ID parameter and returns the QR code data if found.
 *
 * @param {Request} req - Express request object with QR code ID parameter
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with QR code or error
 *
 * @example
 * // Request parameter example
 * // GET /api/qrcodes/123
 */
export const getQrCodeById = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Validate and parse QR code ID
    const id = validateQrCodeId(req.params.id);

    // Retrieve QR code from service
    const qrCode = await getQrCodeResponseById(id);

    // Return 404 if QR code not found
    if (!qrCode) {
      return sendResponse(res, 404, 'QR code not found');
    }

    logger.info(`Successfully retrieved QR code with ID: ${id}`);
    return sendResponse(res, 200, 'Successfully retrieved QR code', qrCode);
  } catch (error) {
    // Handle validation errors
    if (error instanceof Error && error.message === 'Invalid QR code ID') {
      return sendResponse(res, 400, error.message);
    }

    // Log error and return generic error message
    logger.error('Error retrieving QR code:', error);
    return sendResponse(res, 500, 'Internal Server Error');
  }
};
