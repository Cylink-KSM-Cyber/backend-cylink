import { Request, Response } from 'express';
import {
  QrCodeResponseData,
  generateQrCode,
  getQrCodeResponseById,
  getQrCodeResponseByUrlId,
  getQrCodeResponseByShortCode,
} from '@/services/qrCodeService';

const logger = require('@/utils/logger');
const { sendResponse } = require('@/utils/response');

/**
 * QR Code Controller
 *
 * Handles QR code generation and management operations
 * @module controllers/qrCodeController
 */

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

    // Generate QR code
    const qrCode = await generateQrCode({
      urlId: url_id,
      shortCode: short_code,
      color,
      backgroundColor: background_color,
      includeLogo: include_logo,
      logoSize: logo_size,
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
