/**
 * Impression Interfaces
 *
 * Defines interfaces for impression-related operations and data structures
 * @module interfaces/Impression
 */

/**
 * Impression Database Entity interface
 */
export interface ImpressionEntity {
  id: number;
  url_id: number;
  timestamp: Date;
  ip_address: string | null;
  user_agent: string | null;
  referrer: string | null;
  is_unique: boolean;
  source: string | null;
}

/**
 * Impression Create Data interface
 */
export interface ImpressionCreateData {
  url_id: number;
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  is_unique?: boolean;
  source?: string;
}

/**
 * CTR Statistics Period interface
 */
export interface CtrPeriod {
  start_date: string;
  end_date: string;
  days?: number;
}

/**
 * CTR Metric interface
 */
export interface CtrMetric {
  current: number;
  previous: number;
  change: number;
  change_percentage: number;
}

/**
 * CTR Metrics Comparison interface
 */
export interface CtrMetricsComparison {
  impressions: CtrMetric;
  clicks: CtrMetric;
  ctr: CtrMetric;
}

/**
 * CTR Comparison interface
 */
export interface CtrComparison {
  period_days: number;
  previous_period: CtrPeriod;
  metrics: CtrMetricsComparison;
}

/**
 * CTR Time Series Data Point interface
 */
export interface CtrTimeSeriesDataPoint {
  date: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

/**
 * CTR Source Data Point interface
 */
export interface CtrSourceDataPoint {
  source: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

/**
 * CTR Overall Statistics interface
 */
export interface CtrOverallStats {
  total_impressions: number;
  total_clicks: number;
  ctr: number;
  unique_impressions: number;
  unique_ctr: number;
  analysis_period: CtrPeriod;
}

/**
 * CTR Statistics interface
 */
export interface CtrStatistics {
  overall: CtrOverallStats;
  comparison?: CtrComparison;
  time_series?: {
    data: CtrTimeSeriesDataPoint[];
  };
  top_performing_days?: CtrTimeSeriesDataPoint[];
  ctr_by_source?: CtrSourceDataPoint[];
}

/**
 * CTR Leaderboard URL interface
 */
export interface CtrLeaderboardUrl {
  id: number;
  short_code: string;
  title: string | null;
  impressions: number;
  clicks: number;
  ctr: number;
  rank: number;
}

/**
 * CTR Leaderboard interface
 */
export interface CtrLeaderboard {
  period: CtrPeriod;
  urls: CtrLeaderboardUrl[];
}

/**
 * CTR Query Parameters interface
 */
export interface CtrQueryParams {
  start_date?: string;
  end_date?: string;
  comparison?: '7' | '14' | '30' | '90' | 'custom';
  custom_comparison_start?: string;
  custom_comparison_end?: string;
  group_by?: 'day' | 'week' | 'month';
  limit?: number;
  sortBy?: 'ctr' | 'clicks' | 'impressions';
  sortOrder?: 'asc' | 'desc';
}
