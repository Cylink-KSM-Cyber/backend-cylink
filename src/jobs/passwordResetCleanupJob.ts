/**
 * Password Reset Token Cleanup Job
 *
 * Background job to clean up expired password reset tokens from the database
 * This helps maintain database performance and security
 * @module jobs/passwordResetCleanupJob
 */

import logger from '../libs/winston/winston.service';

const authService = require('../services/authService');

/**
 * Job statistics interface
 */
interface CleanupJobStats {
  lastRun: Date | null;
  totalRuns: number;
  totalTokensCleanedUp: number;
  lastCleanupCount: number;
  errors: number;
  lastError: string | null;
}

/**
 * Job statistics tracking
 */
let jobStats: CleanupJobStats = {
  lastRun: null,
  totalRuns: 0,
  totalTokensCleanedUp: 0,
  lastCleanupCount: 0,
  errors: 0,
  lastError: null,
};

/**
 * Executes the password reset token cleanup job
 *
 * @returns {Promise<boolean>} True if cleanup was successful, false otherwise
 */
export const executePasswordResetCleanupJob = async (): Promise<boolean> => {
  try {
    logger.info('Starting password reset token cleanup job...');

    const cleanedCount = await authService.cleanupExpiredPasswordResetTokens();

    // Update statistics
    jobStats.lastRun = new Date();
    jobStats.totalRuns++;
    jobStats.lastCleanupCount = cleanedCount;
    jobStats.totalTokensCleanedUp += cleanedCount;

    if (cleanedCount > 0) {
      logger.info(`Password reset cleanup job completed: ${cleanedCount} expired tokens removed`);
    } else {
      logger.debug('Password reset cleanup job completed: No expired tokens found');
    }

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Update error statistics
    jobStats.errors++;
    jobStats.lastError = errorMessage;

    logger.error(`Password reset cleanup job failed: ${errorMessage}`);
    return false;
  }
};

/**
 * Gets the current job statistics
 *
 * @returns {CleanupJobStats} Job statistics object
 */
export const getCleanupJobStats = (): CleanupJobStats => {
  return { ...jobStats };
};

/**
 * Resets the job statistics
 */
export const resetCleanupJobStats = (): void => {
  jobStats = {
    lastRun: null,
    totalRuns: 0,
    totalTokensCleanedUp: 0,
    lastCleanupCount: 0,
    errors: 0,
    lastError: null,
  };

  logger.info('Password reset cleanup job statistics reset');
};

export default {
  executePasswordResetCleanupJob,
  getCleanupJobStats,
  resetCleanupJobStats,
};
