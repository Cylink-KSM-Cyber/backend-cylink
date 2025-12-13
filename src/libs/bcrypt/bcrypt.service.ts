/**
 * Bcrypt Service
 *
 * Provides password hashing and comparison functionality
 * using bcrypt library.
 *
 * @module libs/bcrypt/bcrypt.service
 * @version 1.1.0
 * @since 2024-01-01
 * @updated 2025-12-13 - Moved from utils/crypto.ts to libs/bcrypt structure for better modularity
 */

const bcrypt = require('bcrypt');

/**
 * Hashes a string using bcrypt.
 *
 * @param {string} string - The string to hash
 * @returns {Promise<string>} The hashed string
 */
exports.hash = async (string: string): Promise<string> => {
  return await bcrypt.hash(string, 10);
};

/**
 * Compares a string with a hashed string.
 *
 * @param {string} string - The plain string to compare
 * @param {string} hashedString - The hashed string to compare against
 * @returns {Promise<boolean>} True if the strings match, false otherwise
 */
exports.compare = async (string: string, hashedString: string): Promise<boolean> => {
  return await bcrypt.compare(string, hashedString);
};
