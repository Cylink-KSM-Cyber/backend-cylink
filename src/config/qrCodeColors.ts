/**
 * QR Code Colors Configuration
 *
 * Defines predefined color options for QR code customization
 * @module config/qrCodeColors
 */

/**
 * Color option interface
 */
export interface ColorOption {
  name: string;
  hex: string;
}

/**
 * QR code color options interface
 */
export interface QrCodeColorOptions {
  foreground_colors: ColorOption[];
  background_colors: ColorOption[];
}

/**
 * Predefined foreground colors for QR codes
 */
export const foregroundColors: ColorOption[] = [
  {
    name: 'Black',
    hex: '#000000',
  },
  {
    name: 'KSM Blue',
    hex: '#1E88E5',
  },
  {
    name: 'KSM Red',
    hex: '#E53935',
  },
  {
    name: 'KSM Green',
    hex: '#43A047',
  },
  {
    name: 'KSM Purple',
    hex: '#8E24AA',
  },
];

/**
 * Predefined background colors for QR codes
 */
export const backgroundColors: ColorOption[] = [
  {
    name: 'White',
    hex: '#FFFFFF',
  },
  {
    name: 'Light Gray',
    hex: '#F5F5F5',
  },
  {
    name: 'Light Blue',
    hex: '#E3F2FD',
  },
  {
    name: 'Light Yellow',
    hex: '#FFFDE7',
  },
  {
    name: 'Light Green',
    hex: '#E8F5E9',
  },
];

/**
 * Get all predefined QR code color options
 *
 * @returns {QrCodeColorOptions} Object containing foreground and background color options
 */
export const getQrCodeColorOptions = (): QrCodeColorOptions => {
  return {
    foreground_colors: foregroundColors,
    background_colors: backgroundColors,
  };
};
