/**
 * Job Scheduler
 *
 * Manages periodic execution of background jobs
 * Handles job scheduling, monitoring, and error recovery
 * @module jobs/jobScheduler
 */

import logger from '../libs/winston/winston.service';

import { executePasswordResetCleanupJob, getCleanupJobStats } from './passwordResetCleanupJob';
import { executeUrlExpirationJob, getJobStatistics, JobResult } from './urlExpirationJob';

/**
 * Job schedule configuration interface
 */
interface ScheduleConfig {
  enabled: boolean;
  intervalMinutes: number;
  passwordResetCleanupIntervalMinutes: number;
  maxConcurrentJobs: number;
  retryOnFailure: boolean;
  retryDelayMinutes: number;
  healthCheckIntervalMinutes: number;
}

/**
 * Job execution status interface
 */
interface JobStatus {
  isRunning: boolean;
  lastExecution: Date | null;
  lastSuccess: Date | null;
  lastFailure: Date | null;
  consecutiveFailures: number;
  totalExecutions: number;
  totalSuccesses: number;
  totalFailures: number;
}

/**
 * Scheduler state interface
 */
interface SchedulerState {
  isStarted: boolean;
  urlExpirationJob: JobStatus;
  passwordResetCleanupJob: JobStatus;
  timers: {
    urlExpiration: NodeJS.Timeout | null;
    passwordResetCleanup: NodeJS.Timeout | null;
    healthCheck: NodeJS.Timeout | null;
  };
}

/**
 * Default scheduler configuration
 */
const DEFAULT_SCHEDULE_CONFIG: ScheduleConfig = {
  enabled: process.env.NODE_ENV !== 'test', // Disable in test environment
  intervalMinutes: parseInt(process.env.URL_EXPIRATION_JOB_INTERVAL ?? '60'), // 1 hour default
  passwordResetCleanupIntervalMinutes: parseInt(
    process.env.PASSWORD_RESET_CLEANUP_JOB_INTERVAL ?? '60',
  ), // 1 hour default
  maxConcurrentJobs: 1,
  retryOnFailure: true,
  retryDelayMinutes: 15,
  healthCheckIntervalMinutes: 30,
};

/**
 * Initialize job status
 */
const createJobStatus = (): JobStatus => ({
  isRunning: false,
  lastExecution: null,
  lastSuccess: null,
  lastFailure: null,
  consecutiveFailures: 0,
  totalExecutions: 0,
  totalSuccesses: 0,
  totalFailures: 0,
});

/**
 * Scheduler state
 */
const schedulerState: SchedulerState = {
  isStarted: false,
  urlExpirationJob: createJobStatus(),
  passwordResetCleanupJob: createJobStatus(),
  timers: {
    urlExpiration: null,
    passwordResetCleanup: null,
    healthCheck: null,
  },
};

/**
 * Update job status after execution
 *
 * @param {JobStatus} status - Job status to update
 * @param {JobResult} result - Job execution result
 */
const updateJobStatus = (status: JobStatus, result: JobResult): void => {
  status.isRunning = false;
  status.lastExecution = result.timestamp;
  status.totalExecutions++;

  if (result.success) {
    status.lastSuccess = result.timestamp;
    status.totalSuccesses++;
    status.consecutiveFailures = 0;
  } else {
    status.lastFailure = result.timestamp;
    status.totalFailures++;
    status.consecutiveFailures++;
  }
};

/**
 * Execute URL expiration job with status tracking
 *
 * @param {ScheduleConfig} config - Schedule configuration
 * @returns {Promise<void>}
 */
const executeUrlExpirationJobWithTracking = async (config: ScheduleConfig): Promise<void> => {
  const jobStatus = schedulerState.urlExpirationJob;

  // Prevent concurrent execution
  if (jobStatus.isRunning) {
    logger.warn('URL expiration job is already running, skipping this execution');
    return;
  }

  // Check if we should skip due to consecutive failures
  if (jobStatus.consecutiveFailures >= 5) {
    logger.error(
      `URL expiration job has failed ${jobStatus.consecutiveFailures} times consecutively, manual intervention required`,
    );
    return;
  }

  jobStatus.isRunning = true;
  logger.info('Starting scheduled URL expiration job');

  try {
    const result = await executeUrlExpirationJob({
      batchSize: parseInt(process.env.URL_EXPIRATION_BATCH_SIZE ?? '1000'),
    });

    updateJobStatus(jobStatus, result);

    if (result.success) {
      logger.info(
        `URL expiration job completed successfully: ${result.expiredCount} URLs expired in ${result.executionTime}ms`,
      );
    } else {
      logger.error(`URL expiration job completed with errors: ${result.errors.join(', ')}`);

      // Schedule retry if enabled
      if (config.retryOnFailure && jobStatus.consecutiveFailures < 3) {
        logger.info(`Scheduling retry in ${config.retryDelayMinutes} minutes`);
        setTimeout(
          () => {
            executeUrlExpirationJobWithTracking(config);
          },
          config.retryDelayMinutes * 60 * 1000,
        );
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`URL expiration job execution failed: ${errorMessage}`);

    // Create a failed result for status tracking
    const failedResult: JobResult = {
      success: false,
      processedCount: 0,
      expiredCount: 0,
      errors: [errorMessage],
      executionTime: 0,
      timestamp: new Date(),
    };

    updateJobStatus(jobStatus, failedResult);
  }
};

/**
 * Perform health check and log statistics
 *
 * @returns {Promise<void>}
 */
const performHealthCheck = async (): Promise<void> => {
  try {
    logger.info('Performing job scheduler health check');

    // Get URL statistics
    const stats = await getJobStatistics();
    logger.info(`URL Statistics: ${JSON.stringify(stats)}`);

    // Get password reset cleanup statistics
    const cleanupStats = getCleanupJobStats();
    logger.info(`Password Reset Cleanup Statistics: ${JSON.stringify(cleanupStats)}`);

    // Log scheduler status
    const status = getSchedulerStatus();
    logger.info(`Scheduler Status: ${JSON.stringify(status)}`);

    // Check for concerning patterns
    const urlJob = schedulerState.urlExpirationJob;
    if (urlJob.consecutiveFailures >= 3) {
      logger.warn(`URL expiration job has ${urlJob.consecutiveFailures} consecutive failures`);
    }

    const passwordResetJob = schedulerState.passwordResetCleanupJob;
    if (passwordResetJob.consecutiveFailures >= 3) {
      logger.warn(
        `Password reset cleanup job has ${passwordResetJob.consecutiveFailures} consecutive failures`,
      );
    }

    if (urlJob.lastExecution && Date.now() - urlJob.lastExecution.getTime() > 2 * 60 * 60 * 1000) {
      logger.warn('URL expiration job has not run in over 2 hours');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Health check failed: ${errorMessage}`);
  }
};

/**
 * Start the job scheduler
 *
 * @param {Partial<ScheduleConfig>} customConfig - Custom configuration
 * @returns {boolean} True if started successfully
 */
export const startScheduler = (customConfig: Partial<ScheduleConfig> = {}): boolean => {
  if (schedulerState.isStarted) {
    logger.warn('Job scheduler is already started');
    return false;
  }

  const config = { ...DEFAULT_SCHEDULE_CONFIG, ...customConfig };

  if (!config.enabled) {
    logger.info('Job scheduler is disabled');
    return false;
  }

  logger.info(`Starting job scheduler with interval: ${config.intervalMinutes} minutes`);

  try {
    // Schedule URL expiration job
    schedulerState.timers.urlExpiration = setInterval(
      () => {
        executeUrlExpirationJobWithTracking(config);
      },
      config.intervalMinutes * 60 * 1000,
    );

    // Schedule health check
    schedulerState.timers.healthCheck = setInterval(
      () => {
        performHealthCheck();
      },
      config.healthCheckIntervalMinutes * 60 * 1000,
    );

    // Run initial health check
    setTimeout(() => performHealthCheck(), 5000);

    // Run initial job execution after a short delay
    setTimeout(() => {
      executeUrlExpirationJobWithTracking(config);
    }, 10000);

    schedulerState.isStarted = true;
    logger.info('Job scheduler started successfully');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to start job scheduler: ${errorMessage}`);
    return false;
  }
};

/**
 * Stop the job scheduler
 *
 * @returns {boolean} True if stopped successfully
 */
export const stopScheduler = (): boolean => {
  if (!schedulerState.isStarted) {
    logger.warn('Job scheduler is not running');
    return false;
  }

  logger.info('Stopping job scheduler');

  try {
    // Clear timers
    if (schedulerState.timers.urlExpiration) {
      clearInterval(schedulerState.timers.urlExpiration);
      schedulerState.timers.urlExpiration = null;
    }

    if (schedulerState.timers.healthCheck) {
      clearInterval(schedulerState.timers.healthCheck);
      schedulerState.timers.healthCheck = null;
    }

    schedulerState.isStarted = false;
    logger.info('Job scheduler stopped successfully');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to stop job scheduler: ${errorMessage}`);
    return false;
  }
};

/**
 * Get current scheduler status
 *
 * @returns {object} Scheduler status information
 */
export const getSchedulerStatus = (): object => {
  return {
    isStarted: schedulerState.isStarted,
    urlExpirationJob: {
      ...schedulerState.urlExpirationJob,
      nextExecution: schedulerState.timers.urlExpiration
        ? new Date(Date.now() + DEFAULT_SCHEDULE_CONFIG.intervalMinutes * 60 * 1000)
        : null,
    },
    configuration: DEFAULT_SCHEDULE_CONFIG,
  };
};

/**
 * Manually trigger URL expiration job
 *
 * @returns {Promise<JobResult>} Job execution result
 */
export const triggerUrlExpirationJob = async (): Promise<JobResult> => {
  logger.info('Manually triggering URL expiration job');

  const result = await executeUrlExpirationJob();
  updateJobStatus(schedulerState.urlExpirationJob, result);

  return result;
};

/**
 * Reset job statistics
 *
 * @param {string} jobName - Name of job to reset ('urlExpiration' or 'all')
 */
export const resetJobStatistics = (jobName: string = 'all'): void => {
  if (jobName === 'urlExpiration' || jobName === 'all') {
    schedulerState.urlExpirationJob = createJobStatus();
    logger.info('URL expiration job statistics reset');
  }
};

/**
 * Graceful shutdown handler
 */
export const gracefulShutdown = (): void => {
  logger.info('Gracefully shutting down job scheduler');
  stopScheduler();
};

// Handle process termination
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

/**
 * Export configuration and types for external use
 */
export { ScheduleConfig, JobStatus, SchedulerState };

/**
 * Execute password reset cleanup job manually
 *
 * @returns {Promise<boolean>} True if successful
 */
export const triggerPasswordResetCleanupJob = async (): Promise<boolean> => {
  logger.info('Manually triggering password reset cleanup job');
  return await executePasswordResetCleanupJob();
};
