import { Request, Response } from 'express';
import {
  downloadQrCodeById,
  downloadQrCodeByShortCode,
  QrCodeFormat,
} from '../../services/qrCodeService';
import logger from '../../utils/logger';

/**
 * Interface for download parameters
 */
interface DownloadParams {
  format?: QrCodeFormat;
  size?: number;
}

/**
 * Validates and normalizes the QR code format parameter
 *
 * @param {string|undefined} formatParam - Format parameter from request
 * @returns {QrCodeFormat} Validated format (default: png)
 */
const validateFormat = (formatParam?: string): QrCodeFormat => {
  if (!formatParam) return 'png';

  const format = formatParam.toLowerCase();
  if (format === 'svg') return 'svg';
  return 'png'; // Default to PNG for any other value
};

/**
 * Validates and parses the size parameter
 *
 * @param {string|undefined} sizeParam - Size parameter from request
 * @returns {number|undefined} Parsed size or undefined if not provided
 * @throws {Error} If size is not a valid number
 */
const validateSize = (sizeParam?: string): number | undefined => {
  if (!sizeParam) return undefined;

  const size = parseInt(sizeParam);
  if (isNaN(size)) {
    throw new Error('Invalid size parameter');
  }

  return size;
};

/**
 * Parses and validates download parameters from request
 *
 * @param {Request} req - Express request object
 * @returns {DownloadParams} Validated download parameters
 * @throws {Error} If parameters are invalid
 */
const parseDownloadParams = (req: Request): DownloadParams => {
  const format = validateFormat(req.query.format?.toString());

  const size = validateSize(req.query.size?.toString());

  return { format, size };
};

/**
 * Sends the downloaded QR code to the client
 *
 * @param {Response} res - Express response object
 * @param {{ contentType: string; filename: string; data: Buffer | string }} qrCode - QR code data
 */
const sendQrCodeResponse = (
  res: Response,
  qrCode: { contentType: string; filename: string; data: Buffer | string },
): void => {
  // Set appropriate headers for file download
  res.setHeader('Content-Type', qrCode.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${qrCode.filename}"`);

  // Send the file data
  res.send(qrCode.data);
};

/**
 * Handles errors in download controllers
 *
 * @param {Response} res - Express response object
 * @param {unknown} error - Error that occurred
 */
const handleDownloadError = (res: Response, error: unknown): void => {
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
      return;
    }

    if (error.message.includes('Invalid size parameter')) {
      res.status(400).json({
        status: 400,
        message: 'Invalid size parameter',
      });
      return;
    }

    if (error.message.includes('Invalid format')) {
      res.status(400).json({
        status: 400,
        message: 'Invalid format specified',
      });
      return;
    }

    res.status(500).json({
      status: 500,
      message: 'Internal Server Error',
    });
  } else {
    logger.error('QR code download error:', error);
    res.status(500).json({
      status: 500,
      message: 'Internal Server Error',
    });
  }
};

/**
 * Download QR code by ID in the specified format
 *
 * This controller generates and serves a QR code image for download using the QR code's ID.
 * It supports PNG and SVG formats and allows specifying the size of the generated image.
 *
 * @param {Request} req - Express request object with QR code ID and format parameters
 * @param {Response} res - Express response object
 * @returns {Promise<void>} Sends binary file response
 *
 * @example
 * // Request example
 * // GET /api/qrcodes/123/download?format=png&size=300
 */
export const downloadQrCodeByIdController = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate QR code ID
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({
        status: 400,
        message: 'Invalid QR code ID',
      });
      return;
    }

    // Parse format and size parameters
    let downloadParams: DownloadParams;
    try {
      downloadParams = parseDownloadParams(req);
    } catch (error) {
      handleDownloadError(res, error);
      return;
    }

    // Generate QR code for download
    const qrCode = await downloadQrCodeById(
      id,
      downloadParams.format as QrCodeFormat,
      downloadParams.size,
    );

    // Send response
    sendQrCodeResponse(res, qrCode);

    logger.info(`Successfully downloaded QR code ID ${id} in ${downloadParams.format} format`);
  } catch (error) {
    handleDownloadError(res, error);
  }
};

/**
 * Download QR code by short code in the specified format
 *
 * This controller generates and serves a QR code image for download using the QR code's short code.
 * It supports PNG and SVG formats and allows specifying the size of the generated image.
 *
 * @param {Request} req - Express request object with short code and format parameters
 * @param {Response} res - Express response object
 * @returns {Promise<void>} Sends binary file response
 *
 * @example
 * // Request example
 * // GET /api/qrcodes/shortCode/abc123/download?format=svg&size=300
 */
export const downloadQrCodeByShortCodeController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // Validate short code
    const shortCode = req.params.shortCode;
    if (!shortCode || !shortCode.trim()) {
      res.status(400).json({
        status: 400,
        message: 'Invalid short code',
      });
      return;
    }

    // Parse format and size parameters
    let downloadParams: DownloadParams;
    try {
      downloadParams = parseDownloadParams(req);
    } catch (error) {
      handleDownloadError(res, error);
      return;
    }

    // Generate QR code for download
    const qrCode = await downloadQrCodeByShortCode(
      shortCode,
      downloadParams.format as QrCodeFormat,
      downloadParams.size,
    );

    // Send response
    sendQrCodeResponse(res, qrCode);

    logger.info(
      `Successfully downloaded QR code for short code ${shortCode} in ${downloadParams.format} format`,
    );
  } catch (error) {
    handleDownloadError(res, error);
  }
};
