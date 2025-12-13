import { Request, Response } from 'express';
import { updateQrCodeWithResponse } from '../../services/qrCodeService';
import logger from '../../libs/winston/winston.service';
import { sendResponse } from '../../utils/response';

/**
 * Interface for QR code update request body
 * @interface UpdateQrCodeRequest
 */
interface UpdateQrCodeRequest {
  color?: string;
  background_color?: string;
  include_logo?: boolean;
  logo_size?: number;
  size?: number;
}

/**
 * Interface for QR code update data after validation
 * @interface UpdateQrCodeData
 */
interface UpdateQrCodeData {
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
  // Check if logo_size is a number
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
 * Prepares update data object with only defined fields
 * @param {UpdateQrCodeRequest} requestBody - The request body with QR code update data
 * @param {number} normalizedLogoSize - The validated and normalized logo size
 * @returns {UpdateQrCodeData} Prepared update data
 */
const prepareUpdateData = (
  requestBody: UpdateQrCodeRequest,
  normalizedLogoSize?: number,
): UpdateQrCodeData => {
  const { color, background_color, include_logo, size } = requestBody;

  return {
    ...(color !== undefined && { color }),
    ...(background_color !== undefined && { background_color }),
    ...(include_logo !== undefined && { include_logo }),
    ...(normalizedLogoSize !== undefined && { logo_size: normalizedLogoSize }),
    ...(size !== undefined && { size }),
  };
};

/**
 * Updates an existing QR code with the provided parameters
 *
 * This controller handles updating QR codes with various customization options.
 * It validates input parameters, ensures the ID is valid, and updates the QR code
 * using the QR code service.
 *
 * @param {Request} req - Express request object with QR code ID and update parameters
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with updated QR code or error
 *
 * @example
 * // Request body example
 * {
 *   "color": "#000000",
 *   "background_color": "#FFFFFF",
 *   "include_logo": true,
 *   "logo_size": 0.2,
 *   "size": 300
 * }
 */
export const updateQrCode = async (req: Request, res: Response): Promise<Response> => {
  // Validate QR code ID
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return sendResponse(res, 400, 'Invalid QR code ID');
  }

  try {
    const { logo_size } = req.body as UpdateQrCodeRequest;
    let normalizedLogoSize: number | undefined;

    // Validate and normalize logo_size if provided
    if (logo_size !== undefined) {
      try {
        normalizedLogoSize = validateLogoSize(logo_size);
      } catch (error) {
        if (error instanceof Error) {
          return sendResponse(res, 400, 'Invalid QR code parameters', {
            errors: [error.message],
          });
        }
        throw error;
      }
    }

    // Prepare update data with normalized values
    const updateData = prepareUpdateData(req.body, normalizedLogoSize);

    // Update QR code
    const updatedQrCode = await updateQrCodeWithResponse(id, updateData);

    logger.info(`Successfully updated QR code with ID: ${id}`);
    return sendResponse(res, 200, 'Successfully updated QR code', updatedQrCode);
  } catch (error) {
    // Handle specific error conditions with guard clauses
    if (error instanceof Error) {
      if (error.message.includes('QR code not found')) {
        return sendResponse(res, 404, 'QR code not found');
      }

      if (error.message.includes('Associated URL not found')) {
        return sendResponse(res, 404, 'Associated URL not found');
      }

      if (
        error.message.includes('invalid parameters') ||
        error.message.includes('Failed to update QR code')
      ) {
        return sendResponse(res, 400, 'Invalid QR code parameters', {
          errors: [error.message],
        });
      }

      logger.error('QR code update error:', error.message);
    } else {
      logger.error('QR code update error:', error);
    }

    return sendResponse(res, 500, 'Internal Server Error');
  }
};
