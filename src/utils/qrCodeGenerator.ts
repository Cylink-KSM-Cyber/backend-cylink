/**
 * QR Code Generator Utility
 *
 * Provides functions for generating QR codes in different formats
 * @module utils/qrCodeGenerator
 */

import * as QRCode from 'qrcode';
import { QrCode } from '@/interfaces/QrCode';

/**
 * Options for QR code generation
 */
export interface QrCodeGenerationOptions {
  color: string;
  backgroundColor: string;
  includeLogo: boolean;
  logoSize: number;
  size: number;
}

/**
 * Generates a QR code in PNG format
 *
 * @param {string} data - The data to encode in the QR code (typically a URL)
 * @param {QrCodeGenerationOptions} options - QR code generation options
 * @returns {Promise<Buffer>} Buffer containing the PNG image
 */
export const generateQrCodePng = async (
  data: string,
  options: QrCodeGenerationOptions,
): Promise<Buffer> => {
  const qrOptions: QRCode.QRCodeToBufferOptions = {
    errorCorrectionLevel: 'H', // Higher error correction for logo overlay
    type: 'png' as const, // Use a literal type to match expected 'png' type
    color: {
      dark: options.color,
      light: options.backgroundColor,
    },
    width: options.size,
    margin: 1, // Small margin to maximize QR code size
  };

  // For now, basic QR code generation without logo
  // Logo overlay would require canvas manipulation which could be added later
  // if needed as a feature enhancement
  return QRCode.toBuffer(data, qrOptions);
};

/**
 * Generates a QR code in SVG format
 *
 * @param {string} data - The data to encode in the QR code (typically a URL)
 * @param {QrCodeGenerationOptions} options - QR code generation options
 * @returns {Promise<string>} String containing the SVG markup
 */
export const generateQrCodeSvg = async (
  data: string,
  options: QrCodeGenerationOptions,
): Promise<string> => {
  const qrOptions: QRCode.QRCodeToStringOptions = {
    errorCorrectionLevel: 'H', // Higher error correction for logo overlay
    type: 'svg' as const, // Use a literal type to match expected 'svg' type
    color: {
      dark: options.color,
      light: options.backgroundColor,
    },
    width: options.size,
    margin: 1, // Small margin to maximize QR code size
  };

  // For now, basic QR code generation without logo
  // Logo overlay would require SVG manipulation which could be added later
  return QRCode.toString(data, qrOptions);
};

/**
 * Maps a QrCode database entity to generation options
 *
 * @param {QrCode} qrCode - QR code entity from database
 * @param {number} [customSize] - Optional custom size override
 * @returns {QrCodeGenerationOptions} QR code generation options
 */
export const mapQrCodeToOptions = (
  qrCode: QrCode,
  customSize?: number,
): QrCodeGenerationOptions => {
  return {
    color: qrCode.color,
    backgroundColor: qrCode.background_color,
    includeLogo: qrCode.include_logo,
    logoSize: qrCode.logo_size,
    size: customSize || qrCode.size,
  };
};
