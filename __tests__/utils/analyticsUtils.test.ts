import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import {
  parseAnalyticsDates,
  calculateDaysBetween,
  determineComparisonPeriod,
  calculateComparisonMetrics,
  formatISODate,
} from '../../src/utils/analyticsUtils';
import type { ClicksSummary } from '../../src/utils/analyticsUtils';

// Mock the logger to prevent console output during tests
vi.mock('../../src/utils/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('utils/analyticsUtils', () => {
  describe('parseAnalyticsDates', () => {
    // Mock system time to get predictable results for "now"
    const MOCK_DATE = '2023-10-27T10:00:00.000Z';
    beforeAll(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(MOCK_DATE));
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    it('should return default dates when no strings are provided', () => {
      const result = parseAnalyticsDates(undefined, undefined, 30);
      const expectedStartDate = new Date('2023-09-27T10:00:00.000Z');
      const expectedEndDate = new Date(MOCK_DATE);

      expect(result.startDate).toEqual(expectedStartDate);
      expect(result.endDate).toEqual(expectedEndDate);
      expect(result.error).toBeUndefined();
    });

    it('should parse valid start and end date strings', () => {
      const result = parseAnalyticsDates('2023-01-15', '2023-02-15');
      expect(result.startDate).toEqual(new Date('2023-01-15'));
      expect(result.endDate).toEqual(new Date('2023-02-15'));
      expect(result.error).toBeUndefined();
    });

    it('should use "now" as end date if only start date is provided', () => {
      const result = parseAnalyticsDates('2023-10-01');
      expect(result.startDate).toEqual(new Date('2023-10-01'));
      expect(result.endDate).toEqual(new Date(MOCK_DATE));
    });

    it('should return an error for invalid start_date format', () => {
      const result = parseAnalyticsDates('invalid-date', '2023-02-15');
      expect(result.error).toBe('Invalid start_date format. Use YYYY-MM-DD');
      expect(result.startDate).toBeUndefined();
    });

    it('should return an error for invalid end_date format', () => {
      const result = parseAnalyticsDates('2023-01-15', 'invalid-date');
      expect(result.error).toBe('Invalid end_date format. Use YYYY-MM-DD');
    });

    it('should return an error if end_date is before start_date', () => {
      const result = parseAnalyticsDates('2023-02-15', '2023-01-15');
      expect(result.error).toBe('end_date must be after start_date');
    });
  });

  describe('calculateDaysBetween', () => {
    it('should return 1 for the same start and end date', () => {
      const date = new Date('2023-01-01');
      expect(calculateDaysBetween(date, date)).toBe(1);
    });

    it('should correctly calculate days for a multi-day period', () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-08');
      expect(calculateDaysBetween(startDate, endDate)).toBe(8);
    });
  });

  describe('determineComparisonPeriod', () => {
    const mainStartDate = new Date('2023-10-01');

    it('should calculate a standard 7-day comparison period', () => {
      const result = determineComparisonPeriod('7', mainStartDate);
      expect(result.comparisonPeriodDays).toBe(7);
      expect(formatISODate(result.previousPeriodStartDate!)).toBe('2023-09-24');
      expect(formatISODate(result.previousPeriodEndDate!)).toBe('2023-09-30');
      expect(result.error).toBeUndefined();
    });

    it('should calculate a standard 30-day comparison period', () => {
      const result = determineComparisonPeriod('30', mainStartDate);
      expect(result.comparisonPeriodDays).toBe(30);
      expect(formatISODate(result.previousPeriodStartDate!)).toBe('2023-09-01');
      expect(formatISODate(result.previousPeriodEndDate!)).toBe('2023-09-30');
      expect(result.error).toBeUndefined();
    });

    it('should handle a valid custom comparison period', () => {
      const result = determineComparisonPeriod('custom', mainStartDate, '2023-08-01', '2023-08-15');
      expect(result.comparisonPeriodDays).toBe(15);
      expect(formatISODate(result.previousPeriodStartDate!)).toBe('2023-08-01');
      expect(formatISODate(result.previousPeriodEndDate!)).toBe('2023-08-15');
    });

    it('should return an error if custom period dates are missing', () => {
      const result = determineComparisonPeriod('custom', mainStartDate);
      expect(result.error).toContain(
        'custom_comparison_start and custom_comparison_end are required',
      );
    });

    it('should return an error for invalid custom date format', () => {
      const result = determineComparisonPeriod('custom', mainStartDate, 'invalid', '2023-08-15');
      expect(result.error).toBe('Invalid custom comparison date format. Use YYYY-MM-DD');
    });

    it('should return an error for invalid custom date range', () => {
      const result = determineComparisonPeriod('custom', mainStartDate, '2023-08-15', '2023-08-01');
      expect(result.error).toBe('custom_comparison_end must be after custom_comparison_start');
    });

    it('should return an error for an invalid standard period', () => {
      const result = determineComparisonPeriod('15', mainStartDate);
      expect(result.error).toBe('comparison must be one of: 7, 14, 30, 90, custom');
    });
  });

  describe('calculateComparisonMetrics', () => {
    it('should calculate positive growth correctly', () => {
      const current: ClicksSummary = { total_clicks: 150, avg_clicks_per_url: 15 };
      const previous: ClicksSummary = { total_clicks: 100, avg_clicks_per_url: 10 };
      const result = calculateComparisonMetrics(current, previous, 10, 10);

      expect(result.total_clicks.change).toBe(50);
      expect(result.total_clicks.change_percentage).toBe(50.0);
      expect(result.avg_clicks_per_url.change).toBe(5);
      expect(result.avg_clicks_per_url.change_percentage).toBe(50.0);
      expect(result.active_urls.change).toBe(0);
    });

    it('should calculate negative growth correctly', () => {
      const current: ClicksSummary = { total_clicks: 50, avg_clicks_per_url: 5 };
      const previous: ClicksSummary = { total_clicks: 200, avg_clicks_per_url: 10 };
      const result = calculateComparisonMetrics(current, previous, 10, 20);

      expect(result.total_clicks.change).toBe(-150);
      expect(result.total_clicks.change_percentage).toBe(-75.0);
      expect(result.avg_clicks_per_url.change).toBe(-5);
      expect(result.avg_clicks_per_url.change_percentage).toBe(-50.0);
      expect(result.active_urls.change).toBe(-10);
      expect(result.active_urls.change_percentage).toBe(-50.0);
    });

    it('should handle division by zero by returning 0% change', () => {
      const current: ClicksSummary = { total_clicks: 50, avg_clicks_per_url: 5 };
      const previous: ClicksSummary = { total_clicks: 0, avg_clicks_per_url: 0 };
      const result = calculateComparisonMetrics(current, previous, 10, 0);

      expect(result.total_clicks.change).toBe(50);
      expect(result.total_clicks.change_percentage).toBe(0);
      expect(result.active_urls.change).toBe(10);
      expect(result.active_urls.change_percentage).toBe(0);
    });

    it('should handle null or undefined summary inputs gracefully', () => {
      const result = calculateComparisonMetrics(null!, undefined!, 10, 5);
      expect(result.total_clicks.current).toBe(0);
      expect(result.total_clicks.previous).toBe(0);
      expect(result.total_clicks.change).toBe(0);
      expect(result.active_urls.change).toBe(5);
    });
  });

  describe('formatISODate', () => {
    it('should format a date object to a YYYY-MM-DD string', () => {
      const date = new Date('2023-05-01T12:00:00Z');
      expect(formatISODate(date)).toBe('2023-05-01');
    });
  });
});
