/**
 * URL Interfaces
 *
 * Defines interfaces for URL-related operations and data structures
 * @module interfaces/URL
 */

/**
 * URL Database Entity interface
 */
export interface UrlEntity {
  id: number;
  user_id: number | null;
  original_url: string;
  short_code: string;
  title: string | null;
  expiry_date: Date | null;
  is_active: boolean;
  has_password: boolean;
  password_hash: string | null;
  redirect_type: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

/**
 * URL with click statistics interface
 */
export interface UrlWithClicks {
  id: number;
  original_url: string;
  short_code: string;
  short_url: string;
  title: string | null;
  clicks: number;
  created_at: string;
  expiry_date: string | null;
  is_active: boolean;
}

/**
 * URL with click statistics and calculated status interface
 */
export interface UrlWithStatus extends UrlWithClicks {
  status: UrlStatus;
  days_until_expiry?: number | null;
}

/**
 * Available URL Status types
 */
export type UrlStatus = 'active' | 'inactive' | 'expired' | 'expiring-soon';

/**
 * Pagination interface
 */
export interface PaginationData {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/**
 * URL Search Query Parameters interface
 */
export interface UrlSearchParams {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'created_at' | 'clicks' | 'title';
  sortOrder?: 'asc' | 'desc';
  status?: UrlStatusFilterType;
}

/**
 * URL Status Filter Types
 */
export type UrlStatusFilterType = 'all' | UrlStatus;

/**
 * Filter information for response metadata
 */
export interface FilterInfo {
  status: UrlStatusFilterType;
  total_matching: number;
  total_all: number;
}

/**
 * Match highlights for search results
 */
export interface MatchHighlights {
  original_url: string[] | null;
  short_code: string[] | null;
  title?: string[] | null;
}

/**
 * URL with search highlights interface
 */
export interface UrlWithSearchHighlights extends UrlWithClicks {
  matches?: MatchHighlights;
}

/**
 * Search information for response metadata
 */
export interface SearchInfo {
  term: string;
  fields_searched: string[];
  total_matches: number;
}

/**
 * URL Create Data interface
 */
export interface UrlCreateData {
  user_id?: number;
  original_url: string;
  short_code: string;
  title?: string;
  expiry_date?: Date;
  is_active?: boolean;
  has_password?: boolean;
  password_hash?: string;
  redirect_type?: string;
}

/**
 * URL Update Data interface
 */
export interface UrlUpdateData {
  original_url?: string;
  short_code?: string;
  title?: string;
  expiry_date?: Date;
  is_active?: boolean;
  has_password?: boolean;
  password_hash?: string;
  redirect_type?: string;
}

/**
 * Update URL Request interface
 * Used for the PUT /api/v1/urls/:id endpoint
 */
export interface UpdateUrlRequest {
  title?: string;
  original_url?: string;
  short_code?: string;
  expiry_date?: string | null;
  is_active?: boolean;
}

/**
 * Update URL Response interface
 */
export interface UpdateUrlResponse {
  status: number;
  message: string;
  data?: UrlWithClicks;
  errors?: string[];
}
