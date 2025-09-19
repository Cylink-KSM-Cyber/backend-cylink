/**
 * Cache Utility
 *
 * Simple in-memory cache for performance optimization
 * @module utils/cache
 */

import logger from './logger';

/**
 * Cache entry interface
 */
interface CacheEntry<T> {
  value: T;
  expiry: number;
  createdAt: number;
}

/**
 * Cache statistics interface
 */
interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
  hitRate: number;
}

/**
 * Simple in-memory cache implementation
 */
export class MemoryCache {
  private cache: Map<string, CacheEntry<any>>;
  private stats: CacheStats;
  private maxSize: number;
  private defaultTTL: number;
  private cleanupInterval: NodeJS.Timeout | null;

  constructor(maxSize: number = 1000, defaultTTL: number = 300000) {
    // 5 minutes default
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0,
      hitRate: 0,
    };
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.cleanupInterval = null;

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Get value from cache
   *
   * @param {string} key - Cache key
   * @returns {T | null} Cached value or null if not found/expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.deletes++;
      this.updateStats();
      return null;
    }

    this.stats.hits++;
    this.updateHitRate();
    return entry.value;
  }

  /**
   * Set value in cache
   *
   * @param {string} key - Cache key
   * @param {T} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const actualTTL = ttl || this.defaultTTL;
    const expiry = Date.now() + actualTTL;

    // Check if we need to evict entries
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      value,
      expiry,
      createdAt: Date.now(),
    };

    this.cache.set(key, entry);
    this.stats.sets++;
    this.updateStats();
  }

  /**
   * Delete value from cache
   *
   * @param {string} key - Cache key
   * @returns {boolean} True if key existed and was deleted
   */
  delete(key: string): boolean {
    const existed = this.cache.delete(key);
    if (existed) {
      this.stats.deletes++;
      this.updateStats();
    }
    return existed;
  }

  /**
   * Check if key exists in cache
   *
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.stats.deletes++;
      this.updateStats();
      return false;
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.deletes += size;
    this.updateStats();
  }

  /**
   * Get cache statistics
   *
   * @returns {CacheStats} Cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache size
   *
   * @returns {number} Number of entries in cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Evict oldest entry from cache
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.deletes++;
    }
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    this.stats.size = this.cache.size;
    this.updateHitRate();
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Start cleanup interval to remove expired entries
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Run cleanup every minute
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Remove expired entries from cache
   */
  private cleanup(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      this.stats.deletes += expiredCount;
      this.updateStats();
      logger.info(`Cache cleanup: removed ${expiredCount} expired entries`);
    }
  }
}

/**
 * Global cache instances
 */
export const timezoneCache = new MemoryCache(500, 3600000); // 1 hour TTL for timezone data
export const userCache = new MemoryCache(1000, 900000); // 15 minutes TTL for user data
export const urlExpirationCache = new MemoryCache(2000, 300000); // 5 minutes TTL for URL expiration data

/**
 * Cache key generators
 */
export const cacheKeys = {
  userTimezone: (userId: number) => `user:${userId}:timezone`,
  userProfile: (userId: number) => `user:${userId}:profile`,
  urlExpiration: (urlId: number, timezone: string) => `url:${urlId}:expiry:${timezone}`,
  timezoneOffset: (timezone: string) => `timezone:${timezone}:offset`,
};

/**
 * Get cache statistics for monitoring
 *
 * @returns {object} Combined cache statistics
 */
export const getCacheStats = (): object => {
  return {
    timezone_cache: timezoneCache.getStats(),
    user_cache: userCache.getStats(),
    url_expiration_cache: urlExpirationCache.getStats(),
    total_memory_usage: process.memoryUsage(),
  };
};

/**
 * Clear all caches
 */
export const clearAllCaches = (): void => {
  timezoneCache.clear();
  userCache.clear();
  urlExpirationCache.clear();
  logger.info('All caches cleared');
};

/**
 * Graceful shutdown for cache cleanup
 */
export const shutdownCaches = (): void => {
  timezoneCache.stopCleanup();
  userCache.stopCleanup();
  urlExpirationCache.stopCleanup();
  logger.info('Cache cleanup intervals stopped');
};

// Handle process termination
process.on('SIGTERM', shutdownCaches);
process.on('SIGINT', shutdownCaches);
