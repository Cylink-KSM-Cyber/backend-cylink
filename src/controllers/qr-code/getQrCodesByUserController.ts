import { Request, Response } from 'express';
import { getAllQrCodes } from '../../services/qrCodeService';
import logger from '../../utils/logger';
import { sendResponse } from '../../utils/response';

/**
 * Interface for query parameters for listing QR codes
 */
interface QueryParams {
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: string;
  search?: string;
  color?: string;
  includeLogo?: string;
  includeUrl?: string;
}

/**
 * Valid sortBy values for QR code listing
 */
const VALID_SORT_BY_VALUES = ['created_at', 'url_id', 'color', 'include_logo', 'size'] as const;

/**
 * Valid sortOrder values for QR code listing
 */
const VALID_SORT_ORDER_VALUES = ['asc', 'desc'] as const;

/**
 * Type for valid sortBy field
 */
type SortByField = (typeof VALID_SORT_BY_VALUES)[number];

/**
 * Type for valid sortOrder direction
 */
type SortOrderDirection = (typeof VALID_SORT_ORDER_VALUES)[number];

/**
 * Parse and validate pagination parameters
 *
 * @param {QueryParams} query - Request query parameters
 * @returns {{ page: number, limit: number }} Parsed pagination values
 */
const parsePagination = (query: QueryParams): { page: number; limit: number } => {
  const page = query.page ? parseInt(query.page) : 1;
  const limit = query.limit ? parseInt(query.limit) : 10;

  return { page, limit };
};

/**
 * Validates and normalizes a hex color code
 *
 * @param {string|undefined} color - Color parameter to validate
 * @returns {string|undefined} Normalized color or undefined if invalid
 */
const validateAndNormalizeColor = (color?: string): string | undefined => {
  if (!color) return undefined;

  // Make sure color is a valid hex color code (e.g., #000000)
  let normalizedColor = color.startsWith('#') ? color : `#${color}`;

  // Convert to uppercase for consistency before validation
  normalizedColor = normalizedColor.toUpperCase();

  // Validate hex color format
  if (!/^#[0-9A-F]{6}$/.test(normalizedColor)) {
    throw new Error(`Invalid color parameter: ${color}. Must be a valid hex color code.`);
  }

  return normalizedColor;
};

/**
 * Normalizes and validates sortBy parameter
 *
 * @param {string|undefined} sortByParam - Sort by parameter from request
 * @returns {SortByField} Validated sort by field (default: created_at)
 */
const normalizeSortBy = (sortByParam?: string): SortByField => {
  if (!sortByParam) return 'created_at';

  // Convert to lowercase and remove special characters
  const cleanedSortBy = sortByParam.toLowerCase().replace(/[^a-z0-9_]/g, '_');

  // Map common variations to valid values
  const sortByMap: Record<string, string> = {
    createdat: 'created_at',
    created: 'created_at',
    urlid: 'url_id',
    url: 'url_id',
    includelogo: 'include_logo',
    logo: 'include_logo',
  };

  const normalizedSortBy = sortByMap[cleanedSortBy] || cleanedSortBy;

  // Validate the normalized parameter
  if (!VALID_SORT_BY_VALUES.includes(normalizedSortBy as SortByField)) {
    throw new Error(
      `Invalid sortBy parameter: ${sortByParam}. Must be one of: ${VALID_SORT_BY_VALUES.join(', ')}`,
    );
  }

  return normalizedSortBy as SortByField;
};

/**
 * Normalizes and validates sortOrder parameter
 *
 * @param {string|undefined} sortOrderParam - Sort order parameter from request
 * @returns {SortOrderDirection} Validated sort order (default: desc)
 */
const normalizeSortOrder = (sortOrderParam?: string): SortOrderDirection => {
  if (!sortOrderParam) return 'desc';

  // Convert to lowercase and trim
  const cleaned = sortOrderParam.toLowerCase().trim();

  // Map to standard values
  if (cleaned === 'ascending') return 'asc';
  if (cleaned === 'descending') return 'desc';
  if (cleaned === 'asc' || cleaned === 'desc') return cleaned;

  // Invalid value
  throw new Error(`Invalid sortOrder parameter: ${sortOrderParam}. Must be "asc" or "desc"`);
};

/**
 * Parse boolean query parameter
 *
 * @param {string|undefined} value - Parameter value
 * @param {boolean|undefined} defaultValue - Default value if parameter is not provided
 * @returns {boolean|undefined} Parsed boolean value
 */
const parseBooleanParam = (value?: string, defaultValue?: boolean): boolean | undefined => {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
};

/**
 * Get all QR codes for the authenticated user with pagination, sorting, and filtering
 *
 * This controller retrieves all QR codes for the currently authenticated user.
 * It supports pagination, sorting, searching, and filtering by various parameters.
 *
 * @param {Request} req - Express request object with query parameters and user ID
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with QR codes or error
 *
 * @example
 * // Request example
 * // GET /api/qrcodes?page=1&limit=10&sortBy=created_at&sortOrder=desc&color=%23FF0000&includeLogo=true
 */
export const getQrCodesByUser = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Get authenticated user ID from request
    const userId = req.body.id;
    if (!userId) {
      return sendResponse(res, 401, 'Unauthorized - User ID not found in request');
    }

    // Parse query parameters using helper functions
    const { page, limit } = parsePagination(req.query);
    const search = req.query.search as string;

    let color: string | undefined;
    try {
      color = validateAndNormalizeColor(req.query.color as string);
    } catch (error) {
      if (error instanceof Error) {
        logger.warn(error.message);
        return sendResponse(res, 400, error.message);
      }
      throw error;
    }

    let sortBy: SortByField;
    try {
      sortBy = normalizeSortBy(req.query.sortBy as string);
    } catch (error) {
      if (error instanceof Error) {
        logger.warn(error.message);
        return sendResponse(res, 400, error.message);
      }
      throw error;
    }

    let sortOrder: SortOrderDirection;
    try {
      sortOrder = normalizeSortOrder(req.query.sortOrder as string);
    } catch (error) {
      if (error instanceof Error) {
        logger.warn(error.message);
        return sendResponse(res, 400, error.message);
      }
      throw error;
    }

    // Parse boolean parameters
    const includeLogo = parseBooleanParam(req.query.includeLogo as string);
    const includeUrl = parseBooleanParam(req.query.includeUrl as string, true);

    // Get QR codes from service with all parameters
    const result = await getAllQrCodes(userId, {
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      color,
      includeLogo,
      includeUrl,
    });

    // Return empty array with pagination if no results
    if (result.data.length === 0) {
      return sendResponse(res, 200, 'No QR codes found', [], result.pagination as any);
    }

    logger.info(`Successfully retrieved ${result.data.length} QR codes for user ID: ${userId}`);
    return sendResponse(
      res,
      200,
      'QR codes retrieved successfully',
      result.data,
      result.pagination as any,
    );
  } catch (error) {
    // Handle specific error conditions
    if (error instanceof Error) {
      logger.error(`Error retrieving QR codes: ${error.message}`);

      // Check for validation errors from the model or service
      if (error.message.includes('Invalid sortBy') || error.message.includes('Invalid sortOrder')) {
        return sendResponse(res, 400, error.message);
      }
    } else {
      logger.error('Error retrieving QR codes: Unknown error type', error);
    }

    return sendResponse(res, 500, 'Internal Server Error');
  }
};
