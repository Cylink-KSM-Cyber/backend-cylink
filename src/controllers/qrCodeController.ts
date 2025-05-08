import { Request, Response } from 'express';
import {
  generateQrCode,
  getQrCodeResponseById,
  getQrCodeResponseByUrlId,
  getQrCodeResponseByShortCode,
  updateQrCodeWithResponse,
  downloadQrCodeById,
  downloadQrCodeByShortCode,
  QrCodeFormat,
  getQrCodeColors,
  getAllQrCodes,
  softDeleteQrCode,
} from '../services/qrCodeService';
import logger from '../utils/logger';
const { sendResponse } = require('../utils/response');

/**
 * QR Code Controller
 *
 * Handles QR code generation and management operations
 * @module controllers/qrCodeController
 */

/**
 * Get predefined QR code color options
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with color options or error
 */
export const getQrCodeColorOptions = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Get the predefined color options
    const colorOptions = getQrCodeColors();

    logger.info('Successfully retrieved QR code color options');
    return sendResponse(res, 200, 'Successfully retrieved QR code color options', colorOptions);
  } catch (error) {
    logger.error('Error retrieving QR code color options:', error);
    return sendResponse(res, 500, 'Internal Server Error');
  }
};

/**
 * Create a new QR code for a URL
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with generated QR code or error
 */
export const createQrCode = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { url_id, short_code, color, background_color, include_logo, logo_size, size } = req.body;

    // Deep clone the request body to avoid direct mutation
    const qrCodeData = { ...req.body };

    // Validate logo_size to ensure it matches database constraints
    if (logo_size !== undefined) {
      // Check if logo_size is a number
      if (typeof logo_size !== 'number') {
        return sendResponse(res, 400, 'Invalid QR code parameters', {
          errors: ['logo_size must be a number'],
        });
      }

      // If logo_size is greater than 1, assume it's a percentage and convert to decimal
      const normalizedLogoSize = logo_size > 1 ? logo_size / 100 : logo_size;

      // Check if normalized value is within the allowed range
      if (normalizedLogoSize < 0.1 || normalizedLogoSize > 0.3) {
        return sendResponse(res, 400, 'Invalid QR code parameters', {
          errors: ['logo_size must be between 0.1 (10%) and 0.3 (30%)'],
        });
      }

      // Update the processed data object, not the req.body
      qrCodeData.logo_size = normalizedLogoSize;
    }

    // Generate QR code with the normalized data
    const qrCode = await generateQrCode({
      urlId: url_id,
      shortCode: short_code,
      color,
      backgroundColor: background_color,
      includeLogo: include_logo,
      logoSize: qrCodeData.logo_size, // Use the normalized value
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

/**
 * Update an existing QR code
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with updated QR code or error
 */
export const updateQrCode = async (req: Request, res: Response): Promise<Response> => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return sendResponse(res, 400, 'Invalid QR code ID');
    }

    const { color, background_color, include_logo, logo_size, size } = req.body;

    // Create a copy for our normalized data
    let normalizedLogoSize = logo_size;

    // Validate logo_size to ensure it matches database constraints
    if (logo_size !== undefined) {
      // Check if logo_size is a number
      if (typeof logo_size !== 'number') {
        return sendResponse(res, 400, 'Invalid QR code parameters', {
          errors: ['logo_size must be a number'],
        });
      }

      // If logo_size is greater than 1, assume it's a percentage and convert to decimal
      normalizedLogoSize = logo_size > 1 ? logo_size / 100 : logo_size;

      // Check if normalized value is within the allowed range
      if (normalizedLogoSize < 0.1 || normalizedLogoSize > 0.3) {
        return sendResponse(res, 400, 'Invalid QR code parameters', {
          errors: ['logo_size must be between 0.1 (10%) and 0.3 (30%)'],
        });
      }
    }

    // Prepare update data with normalized values
    const updateData = {
      ...(color !== undefined && { color }),
      ...(background_color !== undefined && { background_color }),
      ...(include_logo !== undefined && { include_logo }),
      ...(logo_size !== undefined && { logo_size: normalizedLogoSize }),
      ...(size !== undefined && { size }),
    };

    // Update QR code
    const updatedQrCode = await updateQrCodeWithResponse(id, updateData);

    logger.info(`Successfully updated QR code with ID: ${id}`);
    return sendResponse(res, 200, 'Successfully updated QR code', updatedQrCode);
  } catch (error) {
    // Handle specific error conditions
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

/**
 * Download QR code by ID in the specified format
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<void>} Sends binary file response
 */
export const downloadQrCodeByIdController = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({
        status: 400,
        message: 'Invalid QR code ID',
      });
      return;
    }

    // Get format and size from query parameters
    const format = validateFormat(req.query.format?.toString());
    const size = req.query.size ? parseInt(req.query.size.toString()) : undefined;

    if (size !== undefined && isNaN(size)) {
      res.status(400).json({
        status: 400,
        message: 'Invalid size parameter',
      });
      return;
    }

    // Generate QR code for download
    const qrCode = await downloadQrCodeById(id, format, size);

    // Set appropriate headers for file download
    res.setHeader('Content-Type', qrCode.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${qrCode.filename}"`);

    // Send the file data
    res.send(qrCode.data);

    logger.info(`Successfully downloaded QR code ID ${id} in ${format} format`);
  } catch (error) {
    handleDownloadError(res, error);
  }
};

/**
 * Download QR code by short code in the specified format
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<void>} Sends binary file response
 */
export const downloadQrCodeByShortCodeController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const shortCode = req.params.shortCode;

    if (!shortCode) {
      res.status(400).json({
        status: 400,
        message: 'Invalid short code',
      });
      return;
    }

    // Get format and size from query parameters
    const format = validateFormat(req.query.format?.toString());
    const size = req.query.size ? parseInt(req.query.size.toString()) : undefined;

    if (size !== undefined && isNaN(size)) {
      res.status(400).json({
        status: 400,
        message: 'Invalid size parameter',
      });
      return;
    }

    // Generate QR code for download
    const qrCode = await downloadQrCodeByShortCode(shortCode, format, size);

    // Set appropriate headers for file download
    res.setHeader('Content-Type', qrCode.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${qrCode.filename}"`);

    // Send the file data
    res.send(qrCode.data);

    logger.info(`Successfully downloaded QR code for short code ${shortCode} in ${format} format`);
  } catch (error) {
    handleDownloadError(res, error);
  }
};

/**
 * Validate and normalize the format parameter
 *
 * @param {string|undefined} formatParam - Format parameter from request
 * @returns {QrCodeFormat} Validated format (default: png)
 */
function validateFormat(formatParam?: string): QrCodeFormat {
  if (!formatParam) return 'png';

  const format = formatParam.toLowerCase();
  if (format === 'svg') return 'svg';
  return 'png'; // Default to PNG for any other value
}

/**
 * Handle errors in download controllers
 *
 * @param {Response} res - Express response object
 * @param {unknown} error - The error that occurred
 */
function handleDownloadError(res: Response, error: unknown): void {
  if (error instanceof Error) {
    logger.error('QR code download error:', error.message);

    if (
      error.message.includes('QR code not found') ||
      error.message.includes('URL not found') ||
      error.message.includes('No QR code found')
    ) {
      res.status(404).json({
        status: 404,
        message: 'QR code not found',
      });
    } else if (error.message.includes('Invalid format')) {
      res.status(400).json({
        status: 400,
        message: 'Invalid format specified',
      });
    } else {
      res.status(500).json({
        status: 500,
        message: 'Internal Server Error',
      });
    }
  } else {
    logger.error('QR code download error:', error);
    res.status(500).json({
      status: 500,
      message: 'Internal Server Error',
    });
  }
}

/**
 * Get a QR code by its ID
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with QR code or error
 */
export const getQrCodeById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return sendResponse(res, 400, 'Invalid QR code ID');
    }

    const qrCode = await getQrCodeResponseById(id);

    if (!qrCode) {
      return sendResponse(res, 404, 'QR code not found');
    }

    logger.info(`Successfully retrieved QR code with ID: ${id}`);
    return sendResponse(res, 200, 'Successfully retrieved QR code', qrCode);
  } catch (error) {
    logger.error('Error retrieving QR code:', error);
    return sendResponse(res, 500, 'Internal Server Error');
  }
};

/**
 * Get a QR code by URL ID
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with QR code or error
 */
export const getQrCodeByUrlId = async (req: Request, res: Response): Promise<Response> => {
  try {
    const urlId = parseInt(req.params.url_id);

    if (isNaN(urlId)) {
      return sendResponse(res, 400, 'Invalid URL ID');
    }

    const qrCode = await getQrCodeResponseByUrlId(urlId);

    if (!qrCode) {
      return sendResponse(res, 404, 'QR code not found');
    }

    logger.info(`Successfully retrieved QR code for URL ID: ${urlId}`);
    return sendResponse(res, 200, 'Successfully retrieved QR code', qrCode);
  } catch (error) {
    logger.error('Error retrieving QR code:', error);
    return sendResponse(res, 500, 'Internal Server Error');
  }
};

/**
 * Get a QR code by Short Code
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with QR code or error
 */
export const getQrCodeByShortCode = async (req: Request, res: Response): Promise<Response> => {
  try {
    const shortCode = req.params.shortCode;

    if (!shortCode) {
      return sendResponse(res, 400, 'Invalid short code');
    }

    const qrCode = await getQrCodeResponseByShortCode(shortCode);

    if (!qrCode) {
      return sendResponse(res, 404, 'QR code not found');
    }

    logger.info(`Successfully retrieved QR code for short code: ${shortCode}`);
    return sendResponse(res, 200, 'Successfully retrieved QR code', qrCode);
  } catch (error) {
    logger.error('Error retrieving QR code:', error);
    return sendResponse(res, 500, 'Internal Server Error');
  }
};

/**
 * Get all QR codes for the authenticated user with pagination, sorting, and filtering
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with QR codes or error
 */
export const getQrCodesByUser = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.body.id; // User ID from auth middleware

    // Parse query parameters
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const sortBy = req.query.sortBy as
      | 'created_at'
      | 'url_id'
      | 'color'
      | 'include_logo'
      | 'size'
      | undefined;
    const sortOrder = req.query.sortOrder as 'asc' | 'desc';
    const search = req.query.search as string;
    let color = req.query.color as string;
    const includeLogo = req.query.includeLogo ? req.query.includeLogo === 'true' : undefined;
    const includeUrl = req.query.includeUrl ? req.query.includeUrl === 'true' : true;

    // Normalize color parameter - ensure it's in the correct format
    if (color) {
      // Make sure color is a valid hex color code (e.g., #000000)
      if (!color.startsWith('#')) {
        color = '#' + color;
      }

      // Validate hex color format
      if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        logger.warn(`Invalid color parameter provided: ${color}`);
        return sendResponse(res, 400, 'Invalid color parameter. Must be a valid hex color code.');
      }

      // Ensure uppercase for consistency with database
      color = color.toUpperCase();
    }

    // Additional validation at controller level - normalize sortBy parameter before validation
    let normalizedSortBy = sortBy;
    if (sortBy) {
      // Convert sortBy to lowercase and remove any special characters
      const cleanedSortBy = sortBy.toLowerCase().replace(/[^a-z0-9_]/g, '_');

      // Map common variations to valid values
      const sortByMap: Record<string, string> = {
        createdat: 'created_at',
        created: 'created_at',
        urlid: 'url_id',
        url: 'url_id',
        includelogo: 'include_logo',
        logo: 'include_logo',
      };

      normalizedSortBy = (sortByMap[cleanedSortBy] || cleanedSortBy) as
        | 'created_at'
        | 'url_id'
        | 'color'
        | 'include_logo'
        | 'size'
        | undefined;

      // Validate the normalized parameter
      if (
        normalizedSortBy &&
        !['created_at', 'url_id', 'color', 'include_logo', 'size'].includes(normalizedSortBy)
      ) {
        logger.warn(`Invalid sortBy parameter received: ${sortBy}`);
        return sendResponse(
          res,
          400,
          'Invalid sortBy parameter. Must be one of: created_at, url_id, color, include_logo, size',
        );
      }
    }

    // Normalize and validate sortOrder parameter
    let normalizedSortOrder = sortOrder;
    if (sortOrder) {
      // Convert to lowercase and trim
      normalizedSortOrder = sortOrder.toLowerCase().trim() as 'asc' | 'desc';

      // Validate the normalized parameter
      const validSortOrders = ['asc', 'desc', 'ascending', 'descending'];
      if (!validSortOrders.includes(normalizedSortOrder as string)) {
        logger.warn(`Invalid sortOrder parameter received: ${sortOrder}`);
        return sendResponse(res, 400, 'Invalid sortOrder parameter. Must be "asc" or "desc"');
      }

      // Map ascending/descending to asc/desc
      if (normalizedSortOrder === ('ascending' as any)) {
        normalizedSortOrder = 'asc';
      }
      if (normalizedSortOrder === ('descending' as any)) {
        normalizedSortOrder = 'desc';
      }
    }

    // Ensure the sortBy and sortOrder are valid with type guards
    const validSortByValues = ['created_at', 'url_id', 'color', 'include_logo', 'size'] as const;
    const validSortOrderValues = ['asc', 'desc'] as const;

    // Type-safe assertion for sortBy
    const finalSortBy =
      normalizedSortBy && validSortByValues.includes(normalizedSortBy as any)
        ? (normalizedSortBy as (typeof validSortByValues)[number])
        : 'created_at';

    // Type-safe assertion for sortOrder
    const finalSortOrder =
      normalizedSortOrder && validSortOrderValues.includes(normalizedSortOrder as any)
        ? (normalizedSortOrder as (typeof validSortOrderValues)[number])
        : 'desc';

    // Get QR codes from service
    const result = await getAllQrCodes(userId, {
      page,
      limit,
      sortBy: finalSortBy,
      sortOrder: finalSortOrder,
      search,
      color,
      includeLogo,
      includeUrl,
    });

    if (result.data.length === 0) {
      return sendResponse(res, 200, 'No QR codes found', [], result.pagination);
    }

    logger.info(`Successfully retrieved QR codes for user ID: ${userId}`);
    return sendResponse(
      res,
      200,
      'QR codes retrieved successfully',
      result.data,
      result.pagination,
    );
  } catch (error) {
    // Handle specific error conditions
    if (error instanceof Error) {
      // Log error details
      logger.error(`Error retrieving QR codes: ${error.message}`);

      // Check for validation errors from the model or service
      if (error.message.includes('Invalid sortBy') || error.message.includes('Invalid sortOrder')) {
        logger.warn(`Validation error in QR code retrieval: ${error.message}`);
        return sendResponse(res, 400, error.message);
      }
    } else {
      logger.error('Error retrieving QR codes: Unknown error type');
    }

    return sendResponse(res, 500, 'Internal Server Error');
  }
};

/**
 * Delete a QR code (soft delete)
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with deletion confirmation or error
 */
export const deleteQrCodeById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return sendResponse(res, 400, 'Invalid QR code ID');
    }

    // Get the authenticated user ID from the request
    const userId = (req as any).user?.id;
    if (!userId) {
      return sendResponse(res, 401, 'Unauthorized');
    }

    // Attempt to delete the QR code
    const deletedQrCode = await softDeleteQrCode(id, userId);

    if (!deletedQrCode) {
      return sendResponse(res, 500, 'Failed to delete QR code');
    }

    logger.info(`Successfully deleted QR code with ID: ${id}`);
    return sendResponse(res, 200, 'QR code deleted successfully', {
      id: deletedQrCode.id,
      deleted_at: deletedQrCode.deleted_at,
    });
  } catch (error) {
    // Handle specific error conditions
    if (error instanceof Error) {
      if (error.message.includes('QR code not found')) {
        return sendResponse(res, 404, 'QR code not found');
      }

      if (error.message.includes('Associated URL not found')) {
        return sendResponse(res, 404, 'Associated URL not found');
      }

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
