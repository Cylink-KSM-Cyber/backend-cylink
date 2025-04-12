/**
 * QR Code interfaces
 *
 * Provides type definitions for QR code related functionality
 * @module interfaces/QrCode
 */

/**
 * Represents a QR code configuration in the database
 */
export interface QrCode {
  id: number;
  url_id: number;
  color: string;
  background_color: string;
  include_logo: boolean;
  logo_size: number;
  size: number;
  created_at: Date;
  updated_at: Date | null;
}

/**
 * Represents data needed to create a new QR code
 */
export interface QrCodeCreateData {
  url_id: number;
  color?: string;
  background_color?: string;
  include_logo?: boolean;
  logo_size?: number;
  size?: number;
}

/**
 * Represents data needed to update an existing QR code
 */
export interface QrCodeUpdateData {
  color?: string;
  background_color?: string;
  include_logo?: boolean;
  logo_size?: number;
  size?: number;
}
