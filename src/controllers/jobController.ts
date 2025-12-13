/**
 * Job Controller
 *
 * Handles HTTP requests for job monitoring and management
 * @module controllers/jobController
 */

import { Request, Response } from 'express';
import logger from '../libs/winston/winston.service';
import {
  getSchedulerStatus,
  triggerUrlExpirationJob,
  resetJobStatistics,
} from '../jobs/jobScheduler';
import { getJobStatistics } from '../jobs/urlExpirationJob';
import { getCacheStats, clearAllCaches } from '../utils/cache';

const { sendResponse } = require('../utils/response');

/**
 * Extended Request interface to include user information
 */
interface ExtendedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

/**
 * Get job scheduler status and statistics
 *
 * @param {ExtendedRequest} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Express response
 */
export const getJobStatus = async (req: ExtendedRequest, res: Response): Promise<Response> => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return sendResponse(res, 403, 'Access denied. Admin role required.');
    }

    const schedulerStatus = getSchedulerStatus();
    const urlStatistics = await getJobStatistics();

    const response = {
      scheduler: schedulerStatus,
      url_statistics: urlStatistics,
      timestamp: new Date().toISOString(),
    };

    logger.info(`Job status requested by admin user: ${req.user.email}`);
    return sendResponse(res, 200, 'Job status retrieved successfully', response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error getting job status: ${errorMessage}`);
    return sendResponse(res, 500, 'Failed to retrieve job status');
  }
};

/**
 * Manually trigger URL expiration job
 *
 * @param {ExtendedRequest} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Express response
 */
export const triggerExpirationJob = async (
  req: ExtendedRequest,
  res: Response,
): Promise<Response> => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return sendResponse(res, 403, 'Access denied. Admin role required.');
    }

    logger.info(`URL expiration job manually triggered by admin user: ${req.user.email}`);

    const result = await triggerUrlExpirationJob();

    const response = {
      job_result: result,
      triggered_by: req.user.email,
      triggered_at: new Date().toISOString(),
    };

    if (result.success) {
      return sendResponse(res, 200, 'URL expiration job completed successfully', response);
    } else {
      return sendResponse(res, 500, 'URL expiration job completed with errors', response);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error triggering expiration job: ${errorMessage}`);
    return sendResponse(res, 500, 'Failed to trigger expiration job');
  }
};

/**
 * Reset job statistics
 *
 * @param {ExtendedRequest} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Express response
 */
export const resetJobStats = async (req: ExtendedRequest, res: Response): Promise<Response> => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return sendResponse(res, 403, 'Access denied. Admin role required.');
    }

    const { job_name } = req.body;
    const jobName = job_name || 'all';

    resetJobStatistics(jobName);

    logger.info(`Job statistics reset by admin user: ${req.user.email} (job: ${jobName})`);

    const response = {
      reset_job: jobName,
      reset_by: req.user.email,
      reset_at: new Date().toISOString(),
    };

    return sendResponse(res, 200, 'Job statistics reset successfully', response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error resetting job statistics: ${errorMessage}`);
    return sendResponse(res, 500, 'Failed to reset job statistics');
  }
};

/**
 * Get URL expiration statistics for monitoring
 *
 * @param {ExtendedRequest} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Express response
 */
export const getExpirationStats = async (
  req: ExtendedRequest,
  res: Response,
): Promise<Response> => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return sendResponse(res, 403, 'Access denied. Admin role required.');
    }

    const statistics = await getJobStatistics();

    const response = {
      statistics,
      generated_at: new Date().toISOString(),
      generated_by: req.user.email,
    };

    return sendResponse(res, 200, 'Expiration statistics retrieved successfully', response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error getting expiration statistics: ${errorMessage}`);
    return sendResponse(res, 500, 'Failed to retrieve expiration statistics');
  }
};

/**
 * Get cache statistics for monitoring
 *
 * @param {ExtendedRequest} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Express response
 */
export const getCacheStatistics = async (
  req: ExtendedRequest,
  res: Response,
): Promise<Response> => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return sendResponse(res, 403, 'Access denied. Admin role required.');
    }

    const cacheStats = getCacheStats();

    const response = {
      cache_statistics: cacheStats,
      generated_at: new Date().toISOString(),
      generated_by: req.user.email,
    };

    return sendResponse(res, 200, 'Cache statistics retrieved successfully', response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error getting cache statistics: ${errorMessage}`);
    return sendResponse(res, 500, 'Failed to retrieve cache statistics');
  }
};

/**
 * Clear all caches
 *
 * @param {ExtendedRequest} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Express response
 */
export const clearCaches = async (req: ExtendedRequest, res: Response): Promise<Response> => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return sendResponse(res, 403, 'Access denied. Admin role required.');
    }

    clearAllCaches();

    const response = {
      cleared_at: new Date().toISOString(),
      cleared_by: req.user.email,
    };

    logger.info(`All caches cleared by admin user: ${req.user.email}`);
    return sendResponse(res, 200, 'All caches cleared successfully', response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error clearing caches: ${errorMessage}`);
    return sendResponse(res, 500, 'Failed to clear caches');
  }
};
