import { Request, Response } from 'express';
import { softDeleteQrCode } from '../../services/qrCodeService';
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
 * Gets user ID from authenticated request
 * @param {Request} req - Express request object
 * @returns {number} User ID
 * @throws {Error} If user is not authenticated
 */
const getUserIdFromRequest = (req: Request): number => {
  const userId = (req as any).user?.id;
  if (!userId) {
    throw new Error('Unauthorized - User ID not found in request');
  }
  return userId;
};

/**
 * Delete a QR code (soft delete)
 *
 * This controller performs a soft delete operation on a QR code.
 * It validates the QR code ID, ensures the user is authenticated and authorized,
 * and marks the QR code as deleted in the database.
 *
 * @param {Request} req - Express request object with QR code ID parameter and authenticated user
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with deletion confirmation or error
 *
 * @example
 * // Request parameter example
 * // DELETE /api/qrcodes/123
 */
export const deleteQrCodeById = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Validate QR code ID with guard clause
    const id = validateQrCodeId(req.params.id);

    // Get authenticated user ID with guard clause
    const userId = getUserIdFromRequest(req);

    // Attempt to delete the QR code
    const deletedQrCode = await softDeleteQrCode(id, userId);

    // Guard clause: Check if deletion was successful
    if (!deletedQrCode) {
      logger.error(`Failed to delete QR code with ID: ${id}`);
      return sendResponse(res, 500, 'Failed to delete QR code');
    }

    logger.info(`Successfully deleted QR code with ID: ${id}`);
    return sendResponse(res, 200, 'QR code deleted successfully', {
      id: deletedQrCode.id,
      deleted_at: deletedQrCode.deleted_at,
    });
  } catch (error) {
    // Handle specific error conditions with guard clauses
    if (error instanceof Error) {
      // Handle authentication errors
      if (error.message.includes('Unauthorized')) {
        return sendResponse(res, 401, error.message);
      }

      // Handle validation errors
      if (error.message.includes('Invalid QR code ID')) {
        return sendResponse(res, 400, error.message);
      }

      // Handle not found errors
      if (error.message.includes('QR code not found')) {
        return sendResponse(res, 404, 'QR code not found');
      }

      if (error.message.includes('Associated URL not found')) {
        return sendResponse(res, 404, 'Associated URL not found');
      }

      // Handle permission errors
      if (error.message.includes('permission to delete')) {
        return sendResponse(res, 403, 'You do not have permission to delete this QR code');
      }

      logger.error('QR code deletion error:', error.message);
    } else {
      logger.error('QR code deletion error:', error);
    }

    return sendResponse(res, 500, 'Internal Server Error');
  }
};
