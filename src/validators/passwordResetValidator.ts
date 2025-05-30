/**
 * Password Reset Validator
 *
 * Validation rules for password reset endpoint
 * @module validators/passwordResetValidator
 */

import { body, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { validatePassword, validatePasswordConfirmation } from '../utils/passwordValidator';

/**
 * Validation rules for reset password endpoint
 */
exports.resetPasswordValidation = [
  // Query parameter validation
  query('token')
    .notEmpty()
    .withMessage('Reset token is required in query parameter')
    .isString()
    .withMessage('Reset token must be a string')
    .isLength({ min: 20 })
    .withMessage('Invalid reset token format'),

  // Body validation
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isString()
    .withMessage('Password must be a string')
    .custom(password => {
      const validation = validatePassword(password);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }
      return true;
    }),

  body('password_confirmation')
    .notEmpty()
    .withMessage('Password confirmation is required')
    .isString()
    .withMessage('Password confirmation must be a string')
    .custom((passwordConfirmation, { req }) => {
      const validation = validatePasswordConfirmation(req.body.password, passwordConfirmation);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }
      return true;
    }),

  // Error handling middleware
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const errorArray = errors.array();
      const errorMessages = errorArray.map((error: any) => error.msg);

      // Check for token errors
      const tokenErrors = errorArray.filter(
        (error: any) => error.param === 'token' || (error as any).path === 'token',
      );

      if (tokenErrors.length > 0) {
        return res.status(400).json({
          status: 400,
          message: 'Reset token is required in query parameter.',
          error_code: 'MISSING_TOKEN',
        });
      }

      // Check for password validation errors
      const passwordErrors = errorArray.filter(
        (error: any) =>
          error.param === 'password' ||
          error.param === 'password_confirmation' ||
          (error as any).path === 'password' ||
          (error as any).path === 'password_confirmation',
      );

      if (passwordErrors.length > 0) {
        // Check if it's a password strength issue
        const passwordStrengthErrors = errorMessages.filter(
          msg => msg.includes('Password must') || msg.includes('confirmation'),
        );

        if (passwordStrengthErrors.length > 0) {
          return res.status(400).json({
            status: 400,
            message: 'Password does not meet security requirements',
            errors: passwordStrengthErrors,
            error_code: 'WEAK_PASSWORD',
          });
        }

        return res.status(400).json({
          status: 400,
          message: 'Validation error',
          errors: errorMessages,
          error_code: 'VALIDATION_ERROR',
        });
      }

      return res.status(400).json({
        status: 400,
        message: 'Validation error',
        errors: errorMessages,
        error_code: 'VALIDATION_ERROR',
      });
    }

    next();
  },
];
