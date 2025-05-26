/**
 * User Profile Controller
 *
 * Handles HTTP requests for user profile management
 * @module controllers/userProfileController
 */

import { Request, Response } from 'express';
import logger from '../utils/logger';

const { sendResponse } = require('../utils/response');
const userModel = require('../models/userModel');

/**
 * Extended Request interface to include user information
 */
interface ExtendedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    timezone?: string;
  };
}

/**
 * Valid timezone list for validation
 */
const VALID_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'America/Denver',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Asia/Jakarta',
  'Asia/Singapore',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
  'Africa/Cairo',
  'Africa/Johannesburg',
];

/**
 * Get user profile information
 *
 * @param {ExtendedRequest} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Express response
 */
export const getUserProfile = async (req: ExtendedRequest, res: Response): Promise<Response> => {
  try {
    if (!req.user?.id) {
      return sendResponse(res, 401, 'Authentication required');
    }

    const user = await userModel.getUserById(req.user.id);

    if (!user) {
      return sendResponse(res, 404, 'User not found');
    }

    // Remove sensitive information
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, verification_token, ...safeUserData } = user;

    const response = {
      user: safeUserData,
      timezone_options: VALID_TIMEZONES,
    };

    logger.info(`User profile retrieved for user: ${req.user.email}`);
    return sendResponse(res, 200, 'User profile retrieved successfully', response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error getting user profile: ${errorMessage}`);
    return sendResponse(res, 500, 'Failed to retrieve user profile');
  }
};

/**
 * Update user profile information
 *
 * @param {ExtendedRequest} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Express response
 */
export const updateUserProfile = async (req: ExtendedRequest, res: Response): Promise<Response> => {
  try {
    if (!req.user?.id) {
      return sendResponse(res, 401, 'Authentication required');
    }

    const { username, timezone } = req.body;

    // Validate timezone if provided
    if (timezone && !VALID_TIMEZONES.includes(timezone)) {
      return sendResponse(res, 400, 'Invalid timezone. Please select from available options.');
    }

    // Prepare update data
    const updateData: { username?: string; timezone?: string } = {};

    if (username !== undefined) {
      updateData.username = username;
    }

    if (timezone !== undefined) {
      updateData.timezone = timezone;
    }

    if (Object.keys(updateData).length === 0) {
      return sendResponse(res, 400, 'No valid fields provided for update');
    }

    const updatedUser = await userModel.updateUser(updateData, req.user.id);

    if (!updatedUser) {
      return sendResponse(res, 404, 'User not found');
    }

    // Remove sensitive information
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, verification_token, ...safeUserData } = updatedUser;

    logger.info(
      `User profile updated for user: ${req.user.email}, fields: ${Object.keys(updateData).join(', ')}`,
    );
    return sendResponse(res, 200, 'User profile updated successfully', { user: safeUserData });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error updating user profile: ${errorMessage}`);
    return sendResponse(res, 500, 'Failed to update user profile');
  }
};

/**
 * Update user timezone specifically
 *
 * @param {ExtendedRequest} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Express response
 */
export const updateUserTimezone = async (
  req: ExtendedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user?.id) {
      return sendResponse(res, 401, 'Authentication required');
    }

    const { timezone } = req.body;

    if (!timezone) {
      return sendResponse(res, 400, 'Timezone is required');
    }

    if (!VALID_TIMEZONES.includes(timezone)) {
      return sendResponse(res, 400, 'Invalid timezone. Please select from available options.');
    }

    const updatedUser = await userModel.updateUser({ timezone }, req.user.id);

    if (!updatedUser) {
      return sendResponse(res, 404, 'User not found');
    }

    const response = {
      timezone: updatedUser.timezone,
      updated_at: updatedUser.updated_at,
    };

    logger.info(`Timezone updated for user: ${req.user.email} to ${timezone}`);
    return sendResponse(res, 200, 'Timezone updated successfully', response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error updating user timezone: ${errorMessage}`);
    return sendResponse(res, 500, 'Failed to update timezone');
  }
};

/**
 * Get available timezones
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Express response
 */
export const getAvailableTimezones = async (req: Request, res: Response): Promise<Response> => {
  try {
    const timezoneData = VALID_TIMEZONES.map(tz => {
      const now = new Date();
      const offset = getTimezoneOffset(tz);
      const offsetHours = Math.floor(Math.abs(offset) / 60);
      const offsetMinutes = Math.abs(offset) % 60;
      const offsetSign = offset >= 0 ? '+' : '-';
      const offsetString = `UTC${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`;

      return {
        value: tz,
        label: `${tz} (${offsetString})`,
        offset: offset,
        current_time: now.toLocaleString('en-US', { timeZone: tz }),
      };
    });

    return sendResponse(res, 200, 'Available timezones retrieved successfully', {
      timezones: timezoneData,
      total_count: timezoneData.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error getting available timezones: ${errorMessage}`);
    return sendResponse(res, 500, 'Failed to retrieve available timezones');
  }
};

/**
 * Get timezone offset in minutes
 *
 * @param {string} timezone - Timezone string
 * @returns {number} Offset in minutes
 */
const getTimezoneOffset = (timezone: string): number => {
  try {
    const now = new Date();
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const targetDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    return (targetDate.getTime() - utcDate.getTime()) / (1000 * 60);
  } catch (error) {
    return 0; // UTC offset
  }
};
