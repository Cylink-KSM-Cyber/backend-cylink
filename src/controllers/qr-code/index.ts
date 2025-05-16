/**
 * QR Code Controllers
 *
 * This module exports all QR code related controllers.
 * Each controller is responsible for handling specific QR code operations.
 * This modular approach improves maintainability and follows the Single Responsibility Principle.
 */

export { createQrCode } from './createQrCodeController';
export { updateQrCode } from './updateQrCodeController';
export { getQrCodeById } from './getQrCodeByIdController';
export { getQrCodeByUrlId } from './getQrCodeByUrlIdController';
export { getQrCodeByShortCode } from './getQrCodeByShortCodeController';
export { getQrCodeColorOptions } from './getQrCodeColorOptionsController';
export { getQrCodesByUser } from './getQrCodesByUserController';
export { deleteQrCodeById } from './deleteQrCodeByIdController';
export {
  downloadQrCodeByIdController,
  downloadQrCodeByShortCodeController,
} from './downloadQrCodeControllers';
