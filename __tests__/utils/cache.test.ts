/**
 * Unit tests for Cache Utility
 *
 * @group utils
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';

// We need to import the class to test it in isolation
// And also the named exports to test the module's public API
import {
  MemoryCache,
  timezoneCache,
  userCache,
  urlExpirationCache,
  cacheKeys,
  getCacheStats,
  clearAllCaches,
  shutdownCaches,
} from '../../src/utils/cache';

// Mock the logger to prevent console output during tests and keep it clean
vi.mock('../../src/utils/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('utils/cache', () => {
  // Use fake timers to control time-based logic like TTL and expiration
  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  // Restore mocks after each test to ensure isolation
  afterEach(() => {
    vi.restoreAllMocks();
    clearAllCaches(); // Clear exported caches to not affect other tests
  });

  describe('MemoryCache Class', () => {
    let cache: MemoryCache;

    beforeEach(() => {
      // Create a fresh cache instance for each test
      cache = new MemoryCache(10, 5000); // 10 max items, 5s default TTL
    });

    it('should set and get a value', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
      expect(cache.size()).toBe(1);
    });

    it('should return null for a non-existent key', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should overwrite an existing key', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'newValue');
      expect(cache.get('key1')).toBe('newValue');
      expect(cache.size()).toBe(1);
    });

    it('should handle expired entries', () => {
      cache.set('key1', 'value1', 1000); // 1s TTL
      expect(cache.get('key1')).toBe('value1');

      // Advance time by 1.1 seconds
      vi.advanceTimersByTime(1100);

      expect(cache.get('key1')).toBeNull();
      expect(cache.size()).toBe(0);
    });

    it('should delete a key', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeNull();
      expect(cache.size()).toBe(0);
    });

    it('should return false when deleting a non-existent key', () => {
      expect(cache.delete('nonexistent')).toBe(false);
    });

    it('should check if a key exists with has()', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return false from has() for an expired key', () => {
      cache.set('key1', 'value1', 100);
      vi.advanceTimersByTime(101);
      expect(cache.has('key1')).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);
      cache.clear();
      expect(cache.size()).toBe(0);
      expect(cache.get('key1')).toBeNull();
    });

    it('should evict the oldest entry when max size is reached', () => {
      const smallCache = new MemoryCache(2);
      smallCache.set('a', 1);
      vi.advanceTimersByTime(10); // Ensure 'a' is older
      smallCache.set('b', 2);
      vi.advanceTimersByTime(10);
      smallCache.set('c', 3); // This should evict 'a'

      expect(smallCache.size()).toBe(2);
      expect(smallCache.get('a')).toBeNull();
      expect(smallCache.get('b')).toBe(2);
      expect(smallCache.get('c')).toBe(3);
    });

    it('should correctly track and return statistics', () => {
      cache.set('a', 1); // sets: 1, size: 1
      cache.set('b', 2); // sets: 2, size: 2
      cache.get('a'); // hits: 1
      cache.get('b'); // hits: 2
      cache.get('c'); // misses: 1
      cache.delete('a'); // deletes: 1, size: 1

      const stats = cache.getStats();
      expect(stats.sets).toBe(2);
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.deletes).toBe(1);
      expect(stats.size).toBe(1);
      expect(stats.hitRate).toBeCloseTo((2 / 3) * 100);
    });

    it('should stop the cleanup interval', () => {
      // Spying on NodeJS.Timeout functions requires a bit of setup
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      const testCache = new MemoryCache();
      testCache.stopCleanup();
      expect(clearIntervalSpy).toHaveBeenCalledOnce();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('Exported Instances and Functions', () => {
    it('should generate correct cache keys', () => {
      expect(cacheKeys.userProfile(123)).toBe('user:123:profile');
      expect(cacheKeys.urlExpiration(456, 'Asia/Jakarta')).toBe('url:456:expiry:Asia/Jakarta');
      expect(cacheKeys.timezoneOffset('UTC')).toBe('timezone:UTC:offset');
    });

    it('should clear all exported caches', () => {
      userCache.set('user1', { name: 'John' });
      timezoneCache.set('tz1', 'UTC+7');
      expect(userCache.size()).toBe(1);
      expect(timezoneCache.size()).toBe(1);

      clearAllCaches();

      expect(userCache.size()).toBe(0);
      expect(timezoneCache.size()).toBe(0);
    });

    it('should return combined statistics from getCacheStats', () => {
      userCache.set('test', 'data');
      userCache.get('test'); // hit
      timezoneCache.get('miss'); // miss

      const stats = getCacheStats();
      expect(stats).toHaveProperty('user_cache');
      expect(stats).toHaveProperty('timezone_cache');
      expect(stats).toHaveProperty('url_expiration_cache');
      expect(stats).toHaveProperty('total_memory_usage');

      expect(stats.user_cache.hits).toBe(1);
      expect(stats.timezone_cache.misses).toBe(1);
    });

    it('should call stopCleanup on all caches during shutdown', () => {
      // Spy on the method of each exported instance
      const userCacheSpy = vi.spyOn(userCache, 'stopCleanup');
      const timezoneCacheSpy = vi.spyOn(timezoneCache, 'stopCleanup');
      const urlExpirationCacheSpy = vi.spyOn(urlExpirationCache, 'stopCleanup');

      shutdownCaches();

      expect(userCacheSpy).toHaveBeenCalledOnce();
      expect(timezoneCacheSpy).toHaveBeenCalledOnce();
      expect(urlExpirationCacheSpy).toHaveBeenCalledOnce();
    });
  });
});
