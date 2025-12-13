/**
 * Registration Controller
 *
 * Handles HTTP requests for user registration, including validation,
 * user creation, and sending verification emails. Designed to be modular
 * and reusable, following the system's MVC and service-oriented architecture.
 *
 * @module controllers/registrationController
 */

import { Request, Response } from 'express';
import { RegistrationRequest } from '../interfaces/RegistrationRequest';
import {
  registrationValidationRules,
  registrationValidator,
} from '../validators/registrationValidator';
import registrationService from '../services/registrationService';
import logger from '../libs/winston/winston.service';

/**
 * Registers a new user and sends verification email
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Express response
 */
export const register = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userData: RegistrationRequest = req.body;
    const result = await registrationService.registerUser(userData);
    logger.info(`User registration successful for email: ${userData.email}`);
    return res.status(201).json({
      status: 201,
      message: 'Registration successful, please check your email for verification',
      data: result,
    });
  } catch (error) {
    logger.error('Registration error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.message === 'Email already taken') {
      return res.status(409).json({
        status: 409,
        message: 'Email already registered',
      });
    }
    return res.status(500).json({
      status: 500,
      message: 'Internal server error',
    });
  }
};

export { registrationValidationRules, registrationValidator };
