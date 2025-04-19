/**
 * Conversion Tracking Interfaces
 *
 * Type definitions for conversion tracking functionality
 * @module interfaces/Conversion
 */

/**
 * Conversion Goal model interface
 */
export interface ConversionGoal {
  id?: number;
  user_id: number;
  name: string;
  description?: string;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * URL Conversion Goal association interface
 */
export interface UrlConversionGoal {
  id?: number;
  url_id: number;
  goal_id: number;
  created_at?: Date;
}

/**
 * Conversion data interface
 */
export interface Conversion {
  id?: number;
  click_id?: number;
  url_id: number;
  goal_id?: number;
  conversion_value?: number;
  converted_at?: Date;
  user_agent?: string;
  ip_address?: string;
  referrer?: string;
  custom_data?: Record<string, any>;
}

/**
 * Interface for conversion creation
 */
export interface ConversionCreate {
  tracking_id: string;
  goal_id?: number;
  conversion_value?: number;
  custom_data?: Record<string, any>;
}

/**
 * Interface for conversion goal creation
 */
export interface ConversionGoalCreate {
  name: string;
  description?: string;
}

/**
 * Interface for URL conversion goal association
 */
export interface UrlGoalAssociation {
  url_id: number;
  goal_id: number;
}

/**
 * Interface for conversion rate filters
 */
export interface ConversionRateFilters {
  start_date?: string;
  end_date?: string;
  goal_id?: number;
  comparison?: number;
}

/**
 * Interface for conversion stats
 */
export interface ConversionStats {
  total_clicks: number;
  total_conversions: number;
  conversion_rate: number;
  total_conversion_value: number;
  average_value_per_conversion: number;
}

/**
 * Interface for goal stats
 */
export interface GoalStats {
  goal_id: number;
  name: string;
  conversions: number;
  conversion_rate: number;
  conversion_value: number;
}

/**
 * Interface for comparison stats
 */
export interface ComparisonStats {
  previous_conversion_rate: number;
  change_percentage: number;
  previous_conversions: number;
  change: number;
}

/**
 * Interface for time series data point
 */
export interface TimeSeriesDataPoint {
  date: string;
  clicks: number;
  conversions: number;
  conversion_rate: number;
  conversion_value: number;
}

/**
 * Interface for conversion rate response
 */
export interface ConversionRateResponse {
  url_id: number;
  short_code: string;
  original_url: string;
  period: {
    start_date: string;
    end_date: string;
  };
  overall_stats: ConversionStats;
  goals: GoalStats[];
  comparison?: {
    previous_period: {
      start_date: string;
      end_date: string;
    };
    overall: ComparisonStats;
    goals: {
      goal_id: number;
      previous_conversion_rate: number;
      change_percentage: number;
      previous_conversions: number;
      change: number;
    }[];
  };
  time_series: TimeSeriesDataPoint[];
}
