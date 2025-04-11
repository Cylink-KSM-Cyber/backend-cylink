import { Response } from "express";

/**
 * Response Utility
 *
 * Provides standardized response formatting for API endpoints
 * @module utils/response
 */

/**
 * Sends a standardized API response
 *
 * @param {Response} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Response message
 * @param {any} data - Response data (can be any type)
 * @returns {Response} Express response with formatted JSON
 */
exports.sendResponse = (
  res: Response,
  statusCode: number,
  message: string,
  data = null,
  pagination = null
) => {
  const layout: any = {
    status: statusCode,
    message,
  };

  if (data !== null) {
    layout.data = data;
  }

  if (pagination !== null) {
    layout.pagination = pagination;
  }

  return res.status(statusCode).json(layout);
};
