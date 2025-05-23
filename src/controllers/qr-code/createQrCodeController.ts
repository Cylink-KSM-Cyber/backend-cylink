import { Request, Response } from 'express';
import { generateQrCode } from '../../services/qrCodeService';
import logger from '../../utils/logger';
import { sendResponse } from '../../utils/response';

/**
 * Interface for QR code creation request body
 * @interface CreateQrCodeRequest
 */
interface CreateQrCodeRequest {
  url_id: number;
  short_code?: string;
  color?: string;
  background_color?: string;
  include_logo?: boolean;
  logo_size?: number;
  size?: number;
}

/**
 * Validates and normalizes the logo size parameter
 * @param {number} logoSize - The logo size to validate
 * @returns {number} Normalized logo size
 * @throws {Error} If logo size is invalid
 */
const validateLogoSize = (logoSize: number): number => {
  if (typeof logoSize !== 'number') {
    throw new Error('logo_size must be a number');
  }

  // If logo_size is greater than 1, assume it's a percentage and convert to decimal
  const normalizedLogoSize = logoSize > 1 ? logoSize / 100 : logoSize;

  // Check if normalized value is within the allowed range
  if (normalizedLogoSize < 0.1 || normalizedLogoSize > 0.3) {
    throw new Error('logo_size must be between 0.1 (10%) and 0.3 (30%)');
  }

  return normalizedLogoSize;
};

/**
 * Creates a new QR code for a URL
 *
 * This controller handles the creation of QR codes with various customization options.
 * It validates the input parameters and generates a QR code using the QR code service.
 *
 * @param {Request} req - Express request object containing QR code parameters
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with generated QR code or error
 *
 * @example
 * // Request body example
 * {
 *   "url_id": 123,
 *   "color": "#000000",
 *   "background_color": "#FFFFFF",
 *   "include_logo": true,
 *   "logo_size": 0.2,
 *   "size": 300
 * }
 */
export const createQrCode = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { url_id, short_code, color, background_color, include_logo, logo_size, size } =
      req.body as CreateQrCodeRequest;

    // Deep clone the request body to avoid direct mutation
    const qrCodeData = { ...req.body };

    // Validate and normalize logo_size if provided
    if (logo_size !== undefined) {
      try {
        qrCodeData.logo_size = validateLogoSize(logo_size);
      } catch (error) {
        if (error instanceof Error) {
          return sendResponse(res, 400, 'Invalid QR code parameters', {
            errors: [error.message],
          });
        }
        throw error;
      }
    }

    // Generate QR code with the normalized data
    const qrCode = await generateQrCode({
      urlId: url_id,
      shortCode: short_code,
      color,
      backgroundColor: background_color,
      includeLogo: include_logo,
      logoSize: qrCodeData.logo_size,
      size,
    });

    logger.info(`Successfully generated QR code for URL ID: ${qrCode.url_id}`);
    return sendResponse(res, 201, 'Successfully generated QR code', qrCode);
  } catch (error) {
    // Handle specific error conditions
    if (error instanceof Error) {
      if (error.message.includes('URL not found')) {
        return sendResponse(res, 404, 'URL not found');
      }

      if (error.message.includes('invalid parameters')) {
        return sendResponse(res, 400, 'Invalid QR code parameters', {
          errors: [error.message],
        });
      }

      logger.error('QR code generation error:', error.message);
    } else {
      logger.error('QR code generation error:', error);
    }

    return sendResponse(res, 500, 'Internal Server Error');
  }
};
