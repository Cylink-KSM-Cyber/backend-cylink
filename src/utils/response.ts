import { Response } from 'express';
import { SearchInfo } from '../interfaces/URL';

/**
 * Response Utility
 *
 * Provides standardized response formatting for API endpoints
 * @module utils/response
 */

/**
 * Pagination information interface
 */
interface Pagination {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * API Response structure interface
 */
interface ApiResponse<T> {
  status: number;
  message: string;
  data?: T;
  pagination?: Pagination | any;
  search_info?: SearchInfo;
  filter_info?: any;
  errors?: string[];
}

/**
 * Sends a standardized API response
 *
 * @param {Response} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Response message
 * @param {T} data - Response data
 * @param {Pagination} pagination - Pagination information
 * @param {SearchInfo} searchInfo - Search information
 * @param {string[]} errors - Validation errors
 * @param {any} filterInfo - Filter information
 * @returns {Response} Express response with formatted JSON
 */
export function sendResponse<T>(
  res: Response,
  statusCode: number,
  message: string,
  data: T | null = null,
  pagination: Pagination | null = null,
  searchInfo: SearchInfo | null = null,
  errors: string[] | null = null,
  filterInfo: any = null,
): Response {
  const response: ApiResponse<T> = {
    status: statusCode,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  if (pagination !== null) {
    response.pagination = pagination;
  }

  if (searchInfo !== null) {
    response.search_info = searchInfo;
  }

  if (errors !== null && errors.length > 0) {
    response.errors = errors;
  }

  if (filterInfo !== null) {
    response.filter_info = filterInfo;
  }

  return res.status(statusCode).json(response);
}
