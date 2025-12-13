/**
 * URL Validator Utility
 *
 * Provides functionality for validating URLs
 * @module utils/urlValidator
 */

import logger from '../libs/winston/winston.service';

/**
 * Validates if a string is a valid URL
 * Checks that the URL has a valid format and uses either http or https protocol
 *
 * @param {string} url - URL string to validate
 * @returns {boolean} Whether the URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch (error: unknown) {
    // URL constructor throws TypeError for invalid URLs
    if (error instanceof TypeError) {
      logger.debug('Invalid URL format:', url);
    }
    return false;
  }
}

/**
 * Validates if a URL string matches a specific protocol pattern
 *
 * @param {string} url - URL string to validate
 * @param {string[]} protocols - Array of allowed protocols (without colon)
 * @returns {boolean} Whether the URL matches one of the allowed protocols
 */
export function hasValidProtocol(url: string, protocols: string[] = ['http', 'https']): boolean {
  try {
    const parsedUrl = new URL(url);
    // Remove the colon from protocol for comparison
    const urlProtocol = parsedUrl.protocol.replace(':', '');
    return protocols.includes(urlProtocol);
  } catch (error) {
    return false;
  }
}

/**
 * Validates if a URL is accessible by making a HEAD request
 * Note: This is an async function that makes a network request
 *
 * @param {string} url - URL to validate
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>} Whether the URL is accessible
 */
export async function isUrlAccessible(url: string, timeout: number = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    logger.debug(`URL accessibility check failed for ${url}:`, error);
    return false;
  }
}
