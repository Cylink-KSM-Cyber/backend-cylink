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

/**
 * Represents query parameters for QR code listing endpoint
 */
export interface QrCodeListQueryParams {
  page?: number;
  limit?: number;
  sortBy?: 'created_at' | 'url_id' | 'color' | 'include_logo' | 'size';
  sortOrder?: 'asc' | 'desc';
  search?: string;
  color?: string;
  includeLogo?: boolean;
  includeUrl?: boolean;
}

/**
 * Represents a QR code with its associated URL data
 */
export interface QrCodeWithUrl extends QrCode {
  url?: {
    id: number;
    original_url: string;
    title?: string;
    clicks?: number;
  };
}

/**
 * Represents pagination information for QR code listings
 */
export interface QrCodePagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/**
 * Represents a full response for QR code listing
 */
export interface QrCodeListResponse {
  data: QrCodeWithUrl[];
  pagination: QrCodePagination;
}
