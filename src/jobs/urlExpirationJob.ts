/**
 * URL Expiration Background Job
 *
 * Handles batch processing of expired URLs and database updates
 * Runs periodically to maintain database consistency
 * @module jobs/urlExpirationJob
 */

import logger from '../utils/logger';

const pool = require('../config/database');

/**
 * Job execution result interface
 */
interface JobResult {
  success: boolean;
  processedCount: number;
  expiredCount: number;
  errors: string[];
  executionTime: number;
  timestamp: Date;
}

/**
 * Expired URL interface
 */
interface ExpiredUrl {
  id: number;
  short_code: string;
  user_id: number | null;
  expiry_date: Date;
  original_url: string;
}

/**
 * Job configuration interface
 */
interface JobConfig {
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
  timezone: string;
}

/**
 * Default job configuration
 */
const DEFAULT_CONFIG: JobConfig = {
  batchSize: 1000,
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
  timezone: 'UTC',
};

/**
 * Get expired URLs that are still marked as active
 *
 * @param {number} limit - Maximum number of URLs to fetch
 * @param {number} offset - Offset for pagination
 * @returns {Promise<ExpiredUrl[]>} Array of expired URLs
 */
const getExpiredUrls = async (limit: number = 1000, offset: number = 0): Promise<ExpiredUrl[]> => {
  const query = `
    SELECT 
      id, 
      short_code, 
      user_id, 
      expiry_date, 
      original_url
    FROM urls 
    WHERE expiry_date < NOW() 
      AND is_active = true 
      AND deleted_at IS NULL
      AND auto_expired_at IS NULL
    ORDER BY expiry_date ASC
    LIMIT $1 OFFSET $2
  `;

  try {
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error fetching expired URLs: ${errorMessage}`);
    throw error;
  }
};

/**
 * Update URLs to expired status in batch
 *
 * @param {number[]} urlIds - Array of URL IDs to update
 * @returns {Promise<number>} Number of updated URLs
 */
const updateExpiredUrls = async (urlIds: number[]): Promise<number> => {
  if (urlIds.length === 0) {
    return 0;
  }

  const query = `
    UPDATE urls 
    SET 
      is_active = false,
      auto_expired_at = NOW(),
      updated_at = NOW()
    WHERE id = ANY($1::int[])
      AND is_active = true
      AND auto_expired_at IS NULL
    RETURNING id
  `;

  try {
    const result = await pool.query(query, [urlIds]);
    return result.rowCount || 0;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error updating expired URLs: ${errorMessage}`);
    throw error;
  }
};

/**
 * Log expiration events for audit trail
 *
 * @param {ExpiredUrl[]} expiredUrls - Array of expired URLs
 * @param {number} updatedCount - Number of successfully updated URLs
 */
const logExpirationEvents = (expiredUrls: ExpiredUrl[], updatedCount: number): void => {
  logger.info(
    `URL Expiration Job: Processed ${expiredUrls.length} expired URLs, updated ${updatedCount} records`,
  );

  // Log individual URL expirations for audit
  expiredUrls.forEach(url => {
    logger.info(
      `URL expired: ${url.short_code} (ID: ${url.id}, User: ${url.user_id || 'anonymous'}, Expiry: ${url.expiry_date})`,
    );
  });

  // Log summary statistics
  const userStats = expiredUrls.reduce(
    (acc, url) => {
      const userId = url.user_id || 'anonymous';
      acc[userId] = (acc[userId] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  logger.info(`URL Expiration Summary: ${JSON.stringify(userStats)}`);
};

/**
 * Process a batch of expired URLs
 *
 * @param {JobConfig} config - Job configuration
 * @param {number} offset - Current offset for pagination
 * @returns {Promise<{ processedCount: number; expiredCount: number }>} Processing results
 */
const processBatch = async (
  config: JobConfig,
  offset: number = 0,
): Promise<{ processedCount: number; expiredCount: number }> => {
  logger.info(`Processing URL expiration batch: offset ${offset}, limit ${config.batchSize}`);

  // Fetch expired URLs
  const expiredUrls = await getExpiredUrls(config.batchSize, offset);

  if (expiredUrls.length === 0) {
    logger.info('No more expired URLs to process');
    return { processedCount: 0, expiredCount: 0 };
  }

  // Extract URL IDs for batch update
  const urlIds = expiredUrls.map(url => url.id);

  // Update URLs in database
  const updatedCount = await updateExpiredUrls(urlIds);

  // Log expiration events
  logExpirationEvents(expiredUrls, updatedCount);

  return {
    processedCount: expiredUrls.length,
    expiredCount: updatedCount,
  };
};

/**
 * Execute URL expiration job with retry logic
 *
 * @param {Partial<JobConfig>} customConfig - Custom job configuration
 * @returns {Promise<JobResult>} Job execution result
 */
export const executeUrlExpirationJob = async (
  customConfig: Partial<JobConfig> = {},
): Promise<JobResult> => {
  const startTime = Date.now();
  const config = { ...DEFAULT_CONFIG, ...customConfig };

  const result: JobResult = {
    success: false,
    processedCount: 0,
    expiredCount: 0,
    errors: [],
    executionTime: 0,
    timestamp: new Date(),
  };

  logger.info('Starting URL expiration job');

  try {
    let offset = 0;
    let totalProcessed = 0;
    let totalExpired = 0;
    let hasMoreData = true;

    // Process URLs in batches
    while (hasMoreData) {
      let retryCount = 0;
      let batchSuccess = false;

      // Retry logic for each batch
      while (retryCount < config.maxRetries && !batchSuccess) {
        try {
          const batchResult = await processBatch(config, offset);

          totalProcessed += batchResult.processedCount;
          totalExpired += batchResult.expiredCount;

          // If no URLs were processed, we've reached the end
          if (batchResult.processedCount === 0) {
            hasMoreData = false;
          } else {
            offset += config.batchSize;
          }

          batchSuccess = true;
        } catch (error) {
          retryCount++;
          const errorMessage = error instanceof Error ? error.message : String(error);

          logger.warn(
            `Batch processing failed (attempt ${retryCount}/${config.maxRetries}): ${errorMessage}`,
          );
          result.errors.push(`Batch ${offset}: ${errorMessage}`);

          if (retryCount < config.maxRetries) {
            logger.info(`Retrying batch in ${config.retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, config.retryDelay));
          } else {
            logger.error(
              `Batch processing failed after ${config.maxRetries} attempts, skipping batch`,
            );
            offset += config.batchSize; // Skip this batch and continue
            hasMoreData = totalProcessed > 0; // Continue if we've processed some data
          }
        }
      }
    }

    result.processedCount = totalProcessed;
    result.expiredCount = totalExpired;
    result.success = result.errors.length === 0 || totalExpired > 0;

    const executionTime = Date.now() - startTime;
    result.executionTime = executionTime;

    logger.info(
      `URL expiration job completed: ${totalExpired} URLs expired out of ${totalProcessed} processed in ${executionTime}ms`,
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`URL expiration job failed: ${errorMessage}`);
    result.errors.push(errorMessage);
    result.success = false;
  }

  result.executionTime = Date.now() - startTime;
  return result;
};

/**
 * Get job statistics for monitoring
 *
 * @returns {Promise<object>} Job statistics
 */
export const getJobStatistics = async (): Promise<object> => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_urls,
        COUNT(*) FILTER (WHERE is_active = true) as active_urls,
        COUNT(*) FILTER (WHERE is_active = false) as inactive_urls,
        COUNT(*) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date < NOW()) as expired_urls,
        COUNT(*) FILTER (WHERE auto_expired_at IS NOT NULL) as auto_expired_urls,
        COUNT(*) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date > NOW() AND expiry_date < NOW() + INTERVAL '7 days') as expiring_soon_urls
      FROM urls 
      WHERE deleted_at IS NULL
    `);

    return stats.rows[0];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error getting job statistics: ${errorMessage}`);
    throw error;
  }
};

/**
 * Cleanup old auto-expired records (optional maintenance)
 *
 * @param {number} daysOld - Number of days old to consider for cleanup
 * @returns {Promise<number>} Number of cleaned up records
 */
export const cleanupOldExpiredRecords = async (daysOld: number = 90): Promise<number> => {
  const query = `
    UPDATE urls 
    SET deleted_at = NOW()
    WHERE auto_expired_at < NOW() - INTERVAL '${daysOld} days'
      AND deleted_at IS NULL
    RETURNING id
  `;

  try {
    const result = await pool.query(query);
    const cleanedCount = result.rowCount || 0;

    if (cleanedCount > 0) {
      logger.info(
        `Cleaned up ${cleanedCount} old expired URL records (older than ${daysOld} days)`,
      );
    }

    return cleanedCount;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error cleaning up old expired records: ${errorMessage}`);
    throw error;
  }
};

/**
 * Export job configuration for external use
 */
export { JobConfig, JobResult, DEFAULT_CONFIG };
