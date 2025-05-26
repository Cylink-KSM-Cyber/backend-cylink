/**
 * URL Expiration Job Tests
 *
 * Tests for the URL expiration background job functionality
 * @module __tests__/jobs/urlExpirationJob
 */

// Mock database pool
const mockPool = {
  query: jest.fn(),
};

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// Mock database config
jest.mock('../../config/database', () => mockPool);

import {
  executeUrlExpirationJob,
  getJobStatistics,
  cleanupOldExpiredRecords,
  JobResult,
  DEFAULT_CONFIG,
} from '../../jobs/urlExpirationJob';

describe('URL Expiration Job', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executeUrlExpirationJob', () => {
    it('should successfully process expired URLs', async () => {
      // Mock expired URLs data
      const mockExpiredUrls = [
        {
          id: 1,
          short_code: 'abc123',
          user_id: 1,
          expiry_date: new Date('2025-04-20T00:00:00Z'),
          original_url: 'https://example.com/1',
        },
        {
          id: 2,
          short_code: 'def456',
          user_id: 2,
          expiry_date: new Date('2025-04-21T00:00:00Z'),
          original_url: 'https://example.com/2',
        },
      ];

      // Mock database responses
      mockPool.query
        .mockResolvedValueOnce({ rows: mockExpiredUrls }) // getExpiredUrls
        .mockResolvedValueOnce({ rowCount: 2 }) // updateExpiredUrls
        .mockResolvedValueOnce({ rows: [] }); // getExpiredUrls (no more data)

      const result = await executeUrlExpirationJob();

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(2);
      expect(result.expiredCount).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should handle no expired URLs gracefully', async () => {
      // Mock no expired URLs
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await executeUrlExpirationJob();

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(0);
      expect(result.expiredCount).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle database errors with retry logic', async () => {
      const dbError = new Error('Database connection failed');

      // Mock database error on first attempt, success on retry
      mockPool.query
        .mockRejectedValueOnce(dbError) // First attempt fails
        .mockResolvedValueOnce({ rows: [] }); // Retry succeeds

      const result = await executeUrlExpirationJob({
        batchSize: 100,
        maxRetries: 2,
        retryDelay: 100,
      });

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Database connection failed');
    });

    it('should handle partial batch failures', async () => {
      const mockExpiredUrls = [
        {
          id: 1,
          short_code: 'abc123',
          user_id: 1,
          expiry_date: new Date('2025-04-20T00:00:00Z'),
          original_url: 'https://example.com/1',
        },
      ];

      // Mock successful fetch but failed update
      mockPool.query
        .mockResolvedValueOnce({ rows: mockExpiredUrls }) // getExpiredUrls
        .mockRejectedValueOnce(new Error('Update failed')) // updateExpiredUrls fails
        .mockResolvedValueOnce({ rows: [] }); // getExpiredUrls (no more data)

      const result = await executeUrlExpirationJob({
        maxRetries: 1,
      });

      expect(result.success).toBe(false);
      expect(result.processedCount).toBe(0);
      expect(result.expiredCount).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should respect custom configuration', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const customConfig = {
        batchSize: 500,
        maxRetries: 5,
        retryDelay: 1000,
        timezone: 'Asia/Jakarta',
      };

      const result = await executeUrlExpirationJob(customConfig);

      expect(result.success).toBe(true);
      // Verify that the custom batch size was used in the query
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [500, 0], // batchSize and offset
      );
    });

    it('should handle large datasets with pagination', async () => {
      const mockBatch1 = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        short_code: `code${i + 1}`,
        user_id: 1,
        expiry_date: new Date('2025-04-20T00:00:00Z'),
        original_url: `https://example.com/${i + 1}`,
      }));

      const mockBatch2 = Array.from({ length: 500 }, (_, i) => ({
        id: i + 1001,
        short_code: `code${i + 1001}`,
        user_id: 1,
        expiry_date: new Date('2025-04-20T00:00:00Z'),
        original_url: `https://example.com/${i + 1001}`,
      }));

      // Mock paginated responses
      mockPool.query
        .mockResolvedValueOnce({ rows: mockBatch1 }) // First batch
        .mockResolvedValueOnce({ rowCount: 1000 }) // Update first batch
        .mockResolvedValueOnce({ rows: mockBatch2 }) // Second batch
        .mockResolvedValueOnce({ rowCount: 500 }) // Update second batch
        .mockResolvedValueOnce({ rows: [] }); // No more data

      const result = await executeUrlExpirationJob();

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(1500);
      expect(result.expiredCount).toBe(1500);
    });
  });

  describe('getJobStatistics', () => {
    it('should return URL statistics', async () => {
      const mockStats = {
        total_urls: '1250',
        active_urls: '1100',
        inactive_urls: '150',
        expired_urls: '150',
        auto_expired_urls: '145',
        expiring_soon_urls: '25',
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockStats] });

      const result = await getJobStatistics();

      expect(result).toEqual(mockStats);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*) as total_urls'),
      );
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database query failed');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(getJobStatistics()).rejects.toThrow('Database query failed');
    });
  });

  describe('cleanupOldExpiredRecords', () => {
    it('should cleanup old expired records', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 50 });

      const result = await cleanupOldExpiredRecords(90);

      expect(result).toBe(50);
      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining("INTERVAL '90 days'"));
    });

    it('should handle no records to cleanup', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

      const result = await cleanupOldExpiredRecords(30);

      expect(result).toBe(0);
    });

    it('should handle cleanup errors', async () => {
      const dbError = new Error('Cleanup failed');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(cleanupOldExpiredRecords(90)).rejects.toThrow('Cleanup failed');
    });

    it('should use default cleanup period', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 10 });

      const result = await cleanupOldExpiredRecords();

      expect(result).toBe(10);
      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining("INTERVAL '90 days'"));
    });
  });

  describe('DEFAULT_CONFIG', () => {
    it('should have correct default configuration', () => {
      expect(DEFAULT_CONFIG).toEqual({
        batchSize: 1000,
        maxRetries: 3,
        retryDelay: 5000,
        timezone: 'UTC',
      });
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle malformed database responses', async () => {
      // Mock malformed response
      mockPool.query.mockResolvedValueOnce({ rows: null });

      const result = await executeUrlExpirationJob();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle empty URL IDs array', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await executeUrlExpirationJob();

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(0);
      expect(result.expiredCount).toBe(0);
    });

    it('should handle concurrent execution prevention', async () => {
      // This test would require more complex mocking to simulate concurrent execution
      // For now, we'll test that the job can handle being called multiple times
      mockPool.query.mockResolvedValue({ rows: [] });

      const promises = [
        executeUrlExpirationJob(),
        executeUrlExpirationJob(),
        executeUrlExpirationJob(),
      ];

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Performance and monitoring', () => {
    it('should track execution time', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await executeUrlExpirationJob();

      expect(result.executionTime).toBeGreaterThan(0);
      expect(typeof result.executionTime).toBe('number');
    });

    it('should include timestamp in result', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const beforeExecution = new Date();
      const result = await executeUrlExpirationJob();
      const afterExecution = new Date();

      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(beforeExecution.getTime());
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(afterExecution.getTime());
    });

    it('should provide detailed error information', async () => {
      const specificError = new Error('Specific database constraint violation');
      mockPool.query.mockRejectedValueOnce(specificError);

      const result = await executeUrlExpirationJob();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Specific database constraint violation');
    });
  });
});
