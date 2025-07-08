/**
 * Short Code Utility
 *
 * Provides functionality for generating and validating short codes for URLs
 * @module utils/shortCode
 */

const { shortCodeExists } = require('../models/urlModel');

/**
 * Default character set for generating short codes
 */
const DEFAULT_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Configuration options for short code generation
 */
interface ShortCodeOptions {
  length?: number;
  chars?: string;
  prefix?: string;
  maxAttempts?: number;
}

/**
 * Generates a random short code string
 *
 * @param {number} length - Length of the short code
 * @param {string} chars - Character set to use
 * @returns {string} Generated short code
 */
const generateRandomCode = (length: number, chars: string): string => {
  let result = '';
  const charLength = chars.length;

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * charLength));
  }

  return result;
};

/**
 * Generates a unique short code for a URL
 *
 * @param {ShortCodeOptions} options - Configuration options
 * @returns {Promise<string>} A unique short code
 * @throws {Error} If unable to generate a unique code after max attempts
 */
exports.generateUniqueShortCode = async (options: ShortCodeOptions = {}): Promise<string> => {
  const { length = 6, chars = DEFAULT_CHARS, prefix = '', maxAttempts = 10 } = options;

  let attempts = 0;

  while (attempts < maxAttempts) {
    const code = prefix + generateRandomCode(length, chars);
    const exists = await shortCodeExists(code);

    if (!exists) {
      return code;
    }

    attempts++;
  }

  throw new Error(`Failed to generate a unique short code after ${maxAttempts} attempts`);
};

/**
 * Validates that a short code meets all requirements
 *
 * @param {string} shortCode - The short code to validate
 * @returns {boolean} Whether the short code is valid
 */
exports.isValidShortCode = (shortCode: string): boolean => {
  // Ensure the short code only contains valid characters
  const validCharsRegex = new RegExp(`^[${DEFAULT_CHARS}]+$`);

  // Check that the short code is an appropriate length and only contains valid characters
  return shortCode.length >= 3 && shortCode.length <= 30 && validCharsRegex.test(shortCode);
};

/**
 * Sanitizes a custom short code to ensure it meets requirements
 *
 * @param {string} shortCode - The short code to sanitize
 * @returns {string} Sanitized short code
 */
exports.sanitizeShortCode = (shortCode: string): string => {
  // Remove any characters that aren't in our allowed set
  const validCharsRegex = new RegExp(`[^${DEFAULT_CHARS}]`, 'g');

  // Replace invalid characters and truncate if necessary
  return shortCode.replace(validCharsRegex, '').substring(0, 30);
};
