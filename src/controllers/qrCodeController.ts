/**
 * QR Code Controller
 *
 * Handles QR code generation and management operations
 * Note: This file has been refactored into smaller, modular controllers in src/controllers/qr-code/
 * This file now serves as an aggregation point that re-exports all the controllers to maintain
 * backward compatibility with existing routes.
 * @module controllers/qrCodeController
 */

// Import refactored controllers
import {
  createQrCode,
  updateQrCode,
  getQrCodeById,
  getQrCodeByUrlId,
  getQrCodeByShortCode,
  getQrCodeColorOptions,
  getQrCodesByUser,
  deleteQrCodeById,
  downloadQrCodeByIdController,
  downloadQrCodeByShortCodeController,
} from './qr-code';

// Export all refactored controllers to maintain backward compatibility with existing routes
exports.createQrCode = createQrCode;
exports.updateQrCode = updateQrCode;
exports.getQrCodeById = getQrCodeById;
exports.getQrCodeByUrlId = getQrCodeByUrlId;
exports.getQrCodeByShortCode = getQrCodeByShortCode;
exports.getQrCodeColorOptions = getQrCodeColorOptions;
exports.getQrCodesByUser = getQrCodesByUser;
exports.deleteQrCodeById = deleteQrCodeById;
exports.downloadQrCodeByIdController = downloadQrCodeByIdController;
exports.downloadQrCodeByShortCodeController = downloadQrCodeByShortCodeController;
