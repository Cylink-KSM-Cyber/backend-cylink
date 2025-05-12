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
 *
 * Fields:
 * - `title` (optional): The new title for the URL.
 * - `original_url` (optional): The updated original URL.
 * - `short_code` (optional): A custom short code for the URL. If provided, it must be unique.
 * - `expiry_date` (optional): The new expiry date for the URL, or `null` to remove the expiry.
 * - `is_active` (optional): Indicates whether the URL should be active or inactive.
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

/**
 * Recent click information interface
 */
export interface RecentClick {
  clicked_at: Date;
  device_type: string;
}

/**
 * Analytics filter options interface
 */
export interface AnalyticsOptions {
  startDate?: string;
  endDate?: string;
  groupBy?: unknown;
}

/**
 * Response for total clicks analytics
 */
export interface TotalClicksAnalyticsResponse {
  summary: {
    total_clicks: number;
    total_urls: number;
    avg_clicks_per_url: number;
    analysis_period: {
      start_date: string;
      end_date: string;
      days: number;
    };
    comparison: {
      period_days: number;
      previous_period: {
        start_date: string;
        end_date: string;
      };
      total_clicks: {
        current: number;
        previous: number;
        change: number;
        change_percentage: number;
      };
      avg_clicks_per_url: {
        current: number;
        previous: number;
        change: number;
        change_percentage: number;
      };
      active_urls: {
        current: number;
        previous: number;
        change: number;
        change_percentage: number;
      };
    };
  };
  time_series: {
    data: Array<{
      date: string;
      clicks: number;
      urls_count: number;
      avg_clicks: number;
    }>;
    pagination: {
      total_items: number;
      total_pages: number;
      current_page: number;
      limit: number;
    };
  };
  top_performing_days: Array<{
    date: string;
    clicks: number;
    urls_count: number;
    avg_clicks: number;
  }>;
}

/**
 * Time series data point for analytics
 */
export interface TimeSeriesDataPoint {
  date: string;
  clicks: number;
  urls_count: number;
  avg_clicks: number;
}

/**
 * Top performing day data for analytics
 */
export interface TopPerformingDay {
  date: string;
  clicks: number;
  urls_count: number;
  avg_clicks: number;
}

/**
 * URL Analytics response for a specific URL
 */
export interface UrlAnalyticsResponse {
  url_id: number;
  short_code: string;
  total_clicks: number;
  unique_visitors: number;
  time_series_data: Array<TimeSeriesDataPoint>;
  browser_stats: Record<string, number>;
  device_stats: Record<string, number>;
  top_referrers: Array<{
    referrer: string;
    count: number;
  }>;
}

/**
 * Total clicks analytics options interface
 */
export interface TotalClicksAnalyticsOptions {
  startDate?: Date;
  endDate?: Date;
  groupBy?: 'day' | 'week' | 'month';
  limit?: number;
  page?: number;
}

/**
 * Click summary options interface
 */
export interface ClickSummaryOptions {
  startDate?: Date;
  endDate?: Date;
}
