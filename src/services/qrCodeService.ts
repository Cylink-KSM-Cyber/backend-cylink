import { QrCode, QrCodeCreateData } from '@/interfaces/QrCode';

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

    // Generate URLs
    const baseUrl = process.env.SHORT_URL_BASE || 'https://cylink.id/';
    const shortUrl = baseUrl + url.short_code;
    const qrCodeBaseUrl = baseUrl + 'qr/';
    const qrCodeUrl = qrCodeBaseUrl + url.short_code;
    const pngUrl = qrCodeUrl + '.png';
    const svgUrl = qrCodeUrl + '.svg';

    return {
      ...qrCode,
      short_code: url.short_code,
      short_url: shortUrl,
      qr_code_url: qrCodeUrl,
      png_url: pngUrl,
      svg_url: svgUrl,
    };
  } catch (error) {
    logger.error('Failed to create QR code:', error);
    throw new Error('Failed to generate QR code');
  }
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
