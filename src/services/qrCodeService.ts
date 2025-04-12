import { QrCode, QrCodeCreateData, QrCodeUpdateData } from '@/interfaces/QrCode';
import { generateQrCodePng, generateQrCodeSvg, mapQrCodeToOptions } from '@/utils/qrCodeGenerator';

const urlModel = require('@/models/urlModel');
const qrCodeModel = require('@/models/qrCodeModel');
const logger = require('@/utils/logger');

/**
 * QR Code Service
 *
 * Provides business logic for QR code generation and management
 * @module services/qrCodeService
 */

/**
 * QR code response data structure
 */
export interface QrCodeResponseData extends QrCode {
  short_code: string;
  short_url: string;
  qr_code_url: string;
  png_url: string;
  svg_url: string;
}

/**
 * QR code download formats
 */
export type QrCodeFormat = 'png' | 'svg';

/**
 * QR code download result
 */
export interface QrCodeDownloadResult {
  data: Buffer | string;
  contentType: string;
  filename: string;
}

/**
 * QR code generation options
 */
interface QrCodeOptions {
  urlId?: number;
  shortCode?: string;
  color?: string;
  backgroundColor?: string;
  includeLogo?: boolean;
  logoSize?: number;
  size?: number;
}

/**
 * Formats QR code data for API response
 *
 * @param {QrCode} qrCode - The QR code data from database
 * @param {string} shortCode - The short code associated with the URL
 * @returns {QrCodeResponseData} Formatted QR code data with URLs
 */
export const formatQrCodeResponse = (qrCode: QrCode, shortCode: string): QrCodeResponseData => {
  const baseUrl = process.env.SHORT_URL_BASE || 'https://cylink.id/';
  const shortUrl = baseUrl + shortCode;
  const qrCodeBaseUrl = baseUrl + 'qr/';
  const qrCodeUrl = qrCodeBaseUrl + shortCode;
  const pngUrl = qrCodeUrl + '.png';
  const svgUrl = qrCodeUrl + '.svg';

  return {
    ...qrCode,
    short_code: shortCode,
    short_url: shortUrl,
    qr_code_url: qrCodeUrl,
    png_url: pngUrl,
    svg_url: svgUrl,
  };
};

/**
 * Generates a QR code for a URL
 *
 * @param {QrCodeOptions} options - QR code generation options
 * @returns {Promise<QrCodeResponseData>} The generated QR code data
 * @throws {Error} If URL is not found or invalid parameters are provided
 */
export const generateQrCode = async (options: QrCodeOptions): Promise<QrCodeResponseData> => {
  const {
    urlId,
    shortCode,
    color = '#000000',
    backgroundColor = '#FFFFFF',
    includeLogo = true,
    logoSize = 0.2,
    size = 300,
  } = options;

  // Validate that either urlId or shortCode is provided
  if (!urlId && !shortCode) {
    throw new Error('Either url_id or short_code is required');
  }

  // Find the URL
  let url;
  if (shortCode) {
    url = await urlModel.getUrlByShortCode(shortCode);
    if (!url) {
      throw new Error('URL not found for the provided short code');
    }
  } else if (urlId) {
    url = await urlModel.getUrlById(urlId);
    if (!url) {
      throw new Error('URL not found for the provided ID');
    }
  }

  if (!url) {
    throw new Error('URL not found');
  }

  // Create QR code in database
  const qrCodeData: QrCodeCreateData = {
    url_id: url.id,
    color,
    background_color: backgroundColor,
    include_logo: includeLogo,
    logo_size: logoSize,
    size,
  };

  try {
    const qrCode = await qrCodeModel.createQrCode(qrCodeData);
    return formatQrCodeResponse(qrCode, url.short_code);
  } catch (error) {
    logger.error('Failed to create QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Downloads a QR code by its ID in the specified format
 *
 * @param {number} id - QR code ID
 * @param {QrCodeFormat} format - Format to download (png or svg)
 * @param {number} [customSize] - Optional custom size in pixels
 * @returns {Promise<QrCodeDownloadResult>} QR code download result with data and metadata
 * @throws {Error} If QR code is not found or format is invalid
 */
export const downloadQrCodeById = async (
  id: number,
  format: QrCodeFormat = 'png',
  customSize?: number,
): Promise<QrCodeDownloadResult> => {
  // Get QR code from database
  const qrCode = await qrCodeModel.getQrCodeById(id);
  if (!qrCode) {
    throw new Error('QR code not found');
  }

  // Get URL to retrieve the short_code and original URL
  const url = await urlModel.getUrlById(qrCode.url_id);
  if (!url) {
    logger.error(`URL not found for QR code ID ${id} with URL ID ${qrCode.url_id}`);
    throw new Error('Associated URL not found');
  }

  // Generate the QR code file
  return await generateQrCodeForDownload(
    url.short_code,
    url.original_url,
    qrCode,
    format,
    customSize,
  );
};

/**
 * Downloads a QR code by short code in the specified format
 *
 * @param {string} shortCode - URL short code
 * @param {QrCodeFormat} format - Format to download (png or svg)
 * @param {number} [customSize] - Optional custom size in pixels
 * @returns {Promise<QrCodeDownloadResult>} QR code download result with data and metadata
 * @throws {Error} If QR code is not found or format is invalid
 */
export const downloadQrCodeByShortCode = async (
  shortCode: string,
  format: QrCodeFormat = 'png',
  customSize?: number,
): Promise<QrCodeDownloadResult> => {
  // Get URL by short code
  const url = await urlModel.getUrlByShortCode(shortCode);
  if (!url) {
    throw new Error('URL not found for the provided short code');
  }

  // Get QR codes for this URL
  const qrCodes = await qrCodeModel.getQrCodesByUrlId(url.id);
  if (!qrCodes || qrCodes.length === 0) {
    throw new Error('No QR code found for this URL');
  }

  // Get the most recent QR code
  const latestQrCode = qrCodes.sort(
    (a: QrCode, b: QrCode) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];

  // Generate the QR code file
  return await generateQrCodeForDownload(
    shortCode,
    url.original_url,
    latestQrCode,
    format,
    customSize,
  );
};

/**
 * Generate QR code for download in specified format
 *
 * @param {string} shortCode - URL short code
 * @param {string} originalUrl - Original URL to encode
 * @param {QrCode} qrCode - QR code database entity
 * @param {QrCodeFormat} format - Format to download (png or svg)
 * @param {number} [customSize] - Optional custom size in pixels
 * @returns {Promise<QrCodeDownloadResult>} QR code download result
 * @throws {Error} If format is invalid
 */
async function generateQrCodeForDownload(
  shortCode: string,
  originalUrl: string,
  qrCode: QrCode,
  format: QrCodeFormat,
  customSize?: number,
): Promise<QrCodeDownloadResult> {
  // Map QR code entity to generation options
  const options = mapQrCodeToOptions(qrCode, customSize);

  // Generate the base filename without extension
  const baseFilename = `qrcode-${shortCode}`;

  if (format === 'png') {
    // Generate PNG QR code
    const pngBuffer = await generateQrCodePng(originalUrl, options);
    return {
      data: pngBuffer,
      contentType: 'image/png',
      filename: `${baseFilename}.png`,
    };
  } else if (format === 'svg') {
    // Generate SVG QR code
    const svgString = await generateQrCodeSvg(originalUrl, options);
    return {
      data: Buffer.from(svgString),
      contentType: 'image/svg+xml',
      filename: `${baseFilename}.svg`,
    };
  } else {
    throw new Error('Invalid format specified. Supported formats: png, svg');
  }
}

/**
 * Updates a QR code and returns formatted response data
 *
 * @param {number} id - The QR code ID to update
 * @param {QrCodeUpdateData} updateData - The update data
 * @returns {Promise<QrCodeResponseData|null>} The updated QR code or null if not found
 * @throws {Error} If the QR code is not found or update fails
 */
export const updateQrCodeWithResponse = async (
  id: number,
  updateData: QrCodeUpdateData,
): Promise<QrCodeResponseData | null> => {
  // Verify QR code exists
  const existingQrCode = await qrCodeModel.getQrCodeById(id);
  if (!existingQrCode) {
    throw new Error('QR code not found');
  }

  // Get the URL to retrieve the short_code
  const url = await urlModel.getUrlById(existingQrCode.url_id);
  if (!url) {
    logger.error(`URL not found for QR code ID ${id} with URL ID ${existingQrCode.url_id}`);
    throw new Error('Associated URL not found');
  }

  try {
    // Update the QR code
    const updatedQrCode = await qrCodeModel.updateQrCode(id, updateData);
    if (!updatedQrCode) {
      throw new Error('Failed to update QR code');
    }

    // Format the response
    return formatQrCodeResponse(updatedQrCode, url.short_code);
  } catch (error) {
    logger.error(`Failed to update QR code ${id}:`, error);
    throw new Error('Failed to update QR code');
  }
};

/**
 * Gets a QR code by its ID with formatted response data
 *
 * @param {number} id - QR code ID
 * @returns {Promise<QrCodeResponseData|null>} The formatted QR code data or null if not found
 */
export const getQrCodeResponseById = async (id: number): Promise<QrCodeResponseData | null> => {
  const qrCode = await qrCodeModel.getQrCodeById(id);

  if (!qrCode) {
    return null;
  }

  // Get the URL to retrieve the short_code
  const url = await urlModel.getUrlById(qrCode.url_id);
  if (!url) {
    logger.error(`URL not found for QR code ID ${id} with URL ID ${qrCode.url_id}`);
    return null;
  }

  return formatQrCodeResponse(qrCode, url.short_code);
};

/**
 * Gets a QR code by URL ID with formatted response data
 *
 * @param {number} urlId - URL ID
 * @returns {Promise<QrCodeResponseData|null>} The formatted QR code data or null if not found
 */
export const getQrCodeResponseByUrlId = async (
  urlId: number,
): Promise<QrCodeResponseData | null> => {
  // First, check if URL exists
  const url = await urlModel.getUrlById(urlId);
  if (!url) {
    return null;
  }

  // Find the latest QR code for this URL
  const qrCodes = await qrCodeModel.getQrCodesByUrlId(urlId);
  if (!qrCodes || qrCodes.length === 0) {
    return null;
  }

  // Sort by created_at in descending order to get the most recent one
  const latestQrCode = qrCodes.sort(
    (a: QrCode, b: QrCode) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];

  return formatQrCodeResponse(latestQrCode, url.short_code);
};

/**
 * Gets a QR code by short code with formatted response data
 *
 * @param {string} shortCode - URL short code
 * @returns {Promise<QrCodeResponseData|null>} The formatted QR code data or null if not found
 */
export const getQrCodeResponseByShortCode = async (
  shortCode: string,
): Promise<QrCodeResponseData | null> => {
  // Find the URL by short code
  const url = await urlModel.getUrlByShortCode(shortCode);
  if (!url) {
    return null;
  }

  // Find the latest QR code for this URL
  const qrCodes = await qrCodeModel.getQrCodesByUrlId(url.id);
  if (!qrCodes || qrCodes.length === 0) {
    return null;
  }

  // Sort by created_at in descending order to get the most recent one
  const latestQrCode = qrCodes.sort(
    (a: QrCode, b: QrCode) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];

  return formatQrCodeResponse(latestQrCode, shortCode);
};

/**
 * Gets all QR codes for a URL
 *
 * @param {number} urlId - The URL ID
 * @returns {Promise<QrCode[]>} List of QR codes for the URL
 */
export const getQrCodesByUrlId = async (urlId: number): Promise<QrCode[]> => {
  return await qrCodeModel.getQrCodesByUrlId(urlId);
};

/**
 * Gets a QR code by its ID
 *
 * @param {number} id - QR code ID
 * @returns {Promise<QrCode|null>} The QR code or null if not found
 */
export const getQrCodeById = async (id: number): Promise<QrCode | null> => {
  return await qrCodeModel.getQrCodeById(id);
};

/**
 * Updates an existing QR code
 *
 * @param {number} id - QR code ID
 * @param {object} updateData - Data to update
 * @returns {Promise<QrCode|null>} The updated QR code or null if not found
 */
export const updateQrCode = async (id: number, updateData: any): Promise<QrCode | null> => {
  return await qrCodeModel.updateQrCode(id, updateData);
};

/**
 * Deletes a QR code
 *
 * @param {number} id - QR code ID
 * @returns {Promise<boolean>} Whether deletion was successful
 */
export const deleteQrCode = async (id: number): Promise<boolean> => {
  return await qrCodeModel.deleteQrCode(id);
};
