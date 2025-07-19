/**
 * User Registration Validator
 *
 * Provides validation rules and custom logic for user registration requests,
 * ensuring all required fields are present, properly formatted, sanitized,
 * and that password and password_confirmation match. Designed for modularity
 * and reuse within the authentication system, following best practices for
 * maintainability and extensibility.
 *
 * @module validators/registrationValidator
 */

import { Request, Response, NextFunction } from 'express';
import { check, validationResult, Meta } from 'express-validator';

function passwordConfirmationMatch(value: string, { req }: Meta) {
  if (value !== req.body.password) {
    throw new Error('Password confirmation does not match password.');
  }
  return true;
}

/**
 * Validation rules for user registration
 * - username: required, string, max 255, trimmed, escaped
 * - email: required, valid email, max 255, trimmed, normalized
 * - password: required, string, min 6, max 255, trimmed
 * - password_confirmation: required, must match password
 */
export const registrationValidationRules = [
  check('username')
    .isString()
    .withMessage('Username must be a string.')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Username is required.')
    .isLength({ max: 255 })
    .withMessage('Username must be no more than 255 characters.'),

  check('email')
    .isString()
    .withMessage('Email must be a string.')
    .trim()
    .normalizeEmail()
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Email must be valid.')
    .isLength({ max: 255 })
    .withMessage('Email must be no more than 255 characters.'),

  check('password')
    .isString()
    .withMessage('Password must be a string.')
    .trim()
    .notEmpty()
    .withMessage('Password is required.')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters.')
    .isLength({ max: 255 })
    .withMessage('Password must be no more than 255 characters.'),

  check('password_confirmation')
    .trim()
    .notEmpty()
    .withMessage('Password confirmation is required.')
    .custom(passwordConfirmationMatch),
];

/**
 * Middleware to handle validation result for registration
 * Returns 422 with error details if validation fails
 */
export function registrationValidator(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: 422,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
}
