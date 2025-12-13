/**
 * Password Validation Utility
 *
 * Provides functions for validating password strength and security requirements
 * @module utils/passwordValidator
 */

/**
 * Password validation result interface
 */
interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Password security requirements configuration
 */
interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

/**
 * Default password security requirements
 */
const DEFAULT_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

/**
 * Validates password against security requirements
 *
 * @param {string} password - Password to validate
 * @param {PasswordRequirements} requirements - Password requirements (optional)
 * @returns {PasswordValidationResult} Validation result with errors if any
 */
export const validatePassword = (
  password: string,
  requirements: PasswordRequirements = DEFAULT_REQUIREMENTS,
): PasswordValidationResult => {
  const errors: string[] = [];

  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  // Check minimum length
  if (password.length < requirements.minLength) {
    errors.push(`Password must be at least ${requirements.minLength} characters long`);
  }

  // Check for uppercase letter
  if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for lowercase letter
  if (requirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for number
  if (requirements.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Check for special character
  if (requirements.requireSpecialChars && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validates password confirmation match
 *
 * @param {string} password - Original password
 * @param {string} passwordConfirmation - Password confirmation
 * @returns {PasswordValidationResult} Validation result
 */
export const validatePasswordConfirmation = (
  password: string,
  passwordConfirmation: string,
): PasswordValidationResult => {
  const errors: string[] = [];

  if (!passwordConfirmation) {
    errors.push('Password confirmation is required');
  } else if (password !== passwordConfirmation) {
    errors.push('Password confirmation does not match');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validates password against current password (to prevent reuse)
 *
 * @param {string} newPassword - New password
 * @param {string} currentPasswordHash - Current password hash
 * @returns {Promise<PasswordValidationResult>} Validation result
 */
export const validatePasswordNotSame = async (
  newPassword: string,
  currentPasswordHash: string,
): Promise<PasswordValidationResult> => {
  const errors: string[] = [];

  try {
    const { compare } = require('../libs/bcrypt/bcrypt.service');
    const isSame = await compare(newPassword, currentPasswordHash);

    if (isSame) {
      errors.push('New password cannot be the same as your current password');
    }
  } catch (error) {
    // If comparison fails, we'll allow the password change for security reasons
    // but log the error for monitoring
    const logger = require('../libs/winston/winston.service').default;
    logger.error('Error comparing passwords:', error);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export default {
  validatePassword,
  validatePasswordConfirmation,
  validatePasswordNotSame,
  DEFAULT_REQUIREMENTS,
};
