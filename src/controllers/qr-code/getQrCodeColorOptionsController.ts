import { Request, Response } from 'express';
import { getQrCodeColors } from '../../services/qrCodeService';
import logger from '../../utils/logger';
import { sendResponse } from '../../utils/response';

/**
 * Get predefined QR code color options
 *
 * This controller retrieves all predefined color options available for QR code customization.
 * The color options are defined in the QR code service and returned to the client.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with color options or error
 *
 * @example
 * // GET /api/qrcode/colors
 * // Response example:
 * // {
 * //   "status": 200,
 * //   "message": "Successfully retrieved QR code color options",
 * //   "data": {
 * //     "background": ["#FFFFFF", "#000000", ...],
 * //     "foreground": ["#000000", "#FFFFFF", ...]
 * //   }
 * // }
 */
export const getQrCodeColorOptions = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Get the predefined color options from service
    const colorOptions = getQrCodeColors();

    // Log successful retrieval
    logger.info('Successfully retrieved QR code color options');

    // Return color options with success response
    return sendResponse(res, 200, 'Successfully retrieved QR code color options', colorOptions);
  } catch (error) {
    // Log error
    logger.error('Error retrieving QR code color options:', error);

    // Return error response
    return sendResponse(res, 500, 'Internal Server Error');
  }
};
