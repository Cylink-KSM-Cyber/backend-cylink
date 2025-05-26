/**
 * URL Expiration Middleware Tests
 *
 * Tests for the URL expiration middleware functionality
 * @module __tests__/middlewares/urlExpirationMiddleware
 */

import { Request, Response, NextFunction } from 'express';
import {
  urlExpirationMiddleware,
  extractTimezone,
  getCurrentDateInTimezone,
  calculateExpirationStatus,
  processUrl,
  processUrls,
} from '../../middlewares/urlExpirationMiddleware';

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('URL Expiration Middleware', () => {
  let mockRequest: any;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let originalJson: jest.Mock;

  beforeEach(() => {
    originalJson = jest.fn();
    mockRequest = {
      path: '/api/v1/urls',
      headers: {},
      user: undefined,
    };
    mockResponse = {
      json: originalJson,
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('extractTimezone', () => {
    it('should return user timezone if available', () => {
      const req = {
        user: { id: 1, email: 'test@test.com', role: 'user', timezone: 'Asia/Jakarta' },
        headers: {},
      } as any;

      const timezone = extractTimezone(req);
      expect(timezone).toBe('Asia/Jakarta');
    });

    it('should return request timezone if user timezone not available', () => {
      const req = {
        timezone: 'Europe/London',
        headers: {},
      } as any;

      const timezone = extractTimezone(req);
      expect(timezone).toBe('Europe/London');
    });

    it('should return timezone from x-timezone header', () => {
      const req = {
        headers: { 'x-timezone': 'America/New_York' },
      } as any;

      const timezone = extractTimezone(req);
      expect(timezone).toBe('America/New_York');
    });

    it('should extract timezone from Accept-Language header', () => {
      const req = {
        headers: { 'accept-language': 'id-ID,id;q=0.9,en;q=0.8' },
      } as any;

      const timezone = extractTimezone(req);
      expect(timezone).toBe('Asia/Jakarta');
    });

    it('should return UTC as default', () => {
      const req = {
        headers: {},
      } as any;

      const timezone = extractTimezone(req);
      expect(timezone).toBe('UTC');
    });
  });

  describe('getCurrentDateInTimezone', () => {
    it('should return current date for valid timezone', () => {
      const date = getCurrentDateInTimezone('UTC');
      expect(date).toBeInstanceOf(Date);
    });

    it('should fallback to current date for invalid timezone', () => {
      const date = getCurrentDateInTimezone('Invalid/Timezone');
      expect(date).toBeInstanceOf(Date);
    });
  });

  describe('calculateExpirationStatus', () => {
    const currentDate = new Date('2025-04-22T10:00:00Z');

    it('should return inactive status for manually inactive URLs', () => {
      const url = {
        id: 1,
        expiry_date: '2025-05-01T00:00:00Z',
        is_active: false,
      };

      const result = calculateExpirationStatus(url, currentDate);
      expect(result.status).toBe('inactive');
      expect(result.days_until_expiry).toBeNull();
      expect(result.is_active).toBe(false);
    });

    it('should return active status for URLs without expiry date', () => {
      const url = {
        id: 1,
        expiry_date: null,
        is_active: true,
      };

      const result = calculateExpirationStatus(url, currentDate);
      expect(result.status).toBe('active');
      expect(result.days_until_expiry).toBeNull();
      expect(result.is_active).toBe(true);
    });

    it('should return expired status for past expiry date', () => {
      const url = {
        id: 1,
        expiry_date: '2025-04-20T00:00:00Z', // 2 days ago
        is_active: true,
      };

      const result = calculateExpirationStatus(url, currentDate);
      expect(result.status).toBe('expired');
      expect(result.days_until_expiry).toBe(0);
      expect(result.is_active).toBe(false); // Should be overridden
    });

    it('should return expiring-soon status for URLs expiring within 7 days', () => {
      const url = {
        id: 1,
        expiry_date: '2025-04-25T00:00:00Z', // 3 days from now
        is_active: true,
      };

      const result = calculateExpirationStatus(url, currentDate);
      expect(result.status).toBe('expiring-soon');
      expect(result.days_until_expiry).toBe(3);
      expect(result.is_active).toBe(true);
    });

    it('should return active status for URLs expiring after 7 days', () => {
      const url = {
        id: 1,
        expiry_date: '2025-05-15T00:00:00Z', // 23 days from now
        is_active: true,
      };

      const result = calculateExpirationStatus(url, currentDate);
      expect(result.status).toBe('active');
      expect(result.days_until_expiry).toBe(23);
      expect(result.is_active).toBe(true);
    });

    it('should handle edge case of exactly 7 days until expiry', () => {
      const url = {
        id: 1,
        expiry_date: '2025-04-29T00:00:00Z', // exactly 7 days from now
        is_active: true,
      };

      const result = calculateExpirationStatus(url, currentDate);
      expect(result.status).toBe('expiring-soon');
      expect(result.days_until_expiry).toBe(7);
    });
  });

  describe('processUrl', () => {
    it('should process a single URL correctly', () => {
      const url = {
        id: 1,
        expiry_date: '2025-05-01T00:00:00Z',
        is_active: true,
      };
      const currentDate = new Date('2025-04-22T10:00:00Z');

      const result = processUrl(url, currentDate);
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('days_until_expiry');
    });
  });

  describe('processUrls', () => {
    it('should process an array of URLs correctly', () => {
      const urls = [
        { id: 1, expiry_date: '2025-05-01T00:00:00Z', is_active: true },
        { id: 2, expiry_date: null, is_active: true },
        { id: 3, expiry_date: '2025-04-20T00:00:00Z', is_active: true },
      ];
      const currentDate = new Date('2025-04-22T10:00:00Z');

      const results = processUrls(urls, currentDate);
      expect(results).toHaveLength(3);
      expect(results[0]).toHaveProperty('status');
      expect(results[1]).toHaveProperty('status');
      expect(results[2]).toHaveProperty('status');
    });
  });

  describe('urlExpirationMiddleware', () => {
    it('should process response data with URL array', () => {
      const responseData = {
        status: 200,
        message: 'Success',
        data: [
          { id: 1, expiry_date: '2025-05-01T00:00:00Z', is_active: true },
          { id: 2, expiry_date: null, is_active: true },
        ],
      };

      mockRequest.headers = { 'x-timezone': 'UTC' };

      urlExpirationMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Simulate calling res.json
      (mockResponse.json as jest.Mock)(responseData);

      expect(mockNext).toHaveBeenCalled();
      expect(responseData.data[0]).toHaveProperty('status');
      expect(responseData.data[1]).toHaveProperty('status');
    });

    it('should process response data with single URL object', () => {
      const responseData = {
        status: 200,
        message: 'Success',
        data: { id: 1, expiry_date: '2025-05-01T00:00:00Z', is_active: true },
      };

      mockRequest.headers = { 'x-timezone': 'UTC' };

      urlExpirationMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Simulate calling res.json
      (mockResponse.json as jest.Mock)(responseData);

      expect(mockNext).toHaveBeenCalled();
      expect(responseData.data).toHaveProperty('status');
      expect(responseData.data).toHaveProperty('days_until_expiry');
    });

    it('should process direct URL object response', () => {
      const responseData = {
        id: 1,
        expiry_date: '2025-05-01T00:00:00Z',
        is_active: true,
        original_url: 'https://example.com',
        short_code: 'abc123',
      };

      mockRequest.headers = { 'x-timezone': 'UTC' };

      urlExpirationMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Simulate calling res.json
      (mockResponse.json as jest.Mock)(responseData);

      expect(mockNext).toHaveBeenCalled();
      expect(responseData).toHaveProperty('status');
      expect(responseData).toHaveProperty('days_until_expiry');
    });

    it('should handle non-URL response data gracefully', () => {
      const responseData = {
        status: 200,
        message: 'Success',
        data: { some: 'other data' },
      };

      urlExpirationMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Simulate calling res.json
      (mockResponse.json as jest.Mock)(responseData);

      expect(mockNext).toHaveBeenCalled();
      expect(responseData.data).toEqual({ some: 'other data' });
    });

    it('should handle errors gracefully', () => {
      const responseData = null;

      urlExpirationMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Simulate calling res.json with null data
      expect(() => {
        (mockResponse.json as jest.Mock)(responseData);
      }).not.toThrow();

      expect(mockNext).toHaveBeenCalled();
    });

    it('should preserve original json method behavior', () => {
      const responseData = { test: 'data' };

      urlExpirationMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Simulate calling res.json
      (mockResponse.json as jest.Mock)(responseData);

      expect(originalJson).toHaveBeenCalledWith(responseData);
    });

    it('should log timezone usage for URL endpoints', () => {
      const responseData = {
        data: [{ id: 1, expiry_date: null, is_active: true }],
      };

      mockRequest = {
        ...mockRequest,
        path: '/api/v1/urls',
        user: { id: 1, email: 'test@test.com', role: 'user' },
      };

      urlExpirationMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Simulate calling res.json
      (mockResponse.json as jest.Mock)(responseData);

      // Logger should have been called
      const logger = require('../../utils/logger');
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('URL expiration processed with timezone'),
      );
    });
  });
});
