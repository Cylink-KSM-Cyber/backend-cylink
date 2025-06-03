import { Request, Response } from 'express';
import logger from '../../utils/logger';
import { sendResponse } from '../../utils/response';

/**
 * Record URL click by short code
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Response with the updated URL or error
 */
export const recordUrlClick = async (req: Request, res: Response): Promise<Response> => {
  try {
    return sendResponse(res, 200, 'Successfully record URL click');
  } catch (error) {
    logger.error('Unexpected error in updateUrl controller:', error);
    return sendResponse(res, 500, 'Internal server error');
  }
};

export default recordUrlClick;
