/**
 * Public URL Service
 *
 * Provides functions for retrieving public URL information
 * @module services/publicUrlService
 */

import logger from '../utils/logger';

const urlModel = require('../models/urlModel');

/**
 * URL details interface
 * @typedef {Object} PublicUrlDetails
 * @property {string} original_url - The original URL
 * @property {string|null} title - Title of the URL (if available)
 * @property {string} short_code - The shortened URL code
 * @property {string} short_url - The full shortened URL
 * @property {string} created_at - When the URL was created
 * @property {string|null} expiry_date - When the URL expires (if applicable)
 * @property {boolean} is_active - Whether the URL is active
 */

/**
 * Get public details for a URL by its short code
 * Returns limited information suitable for public consumption
 *
 * @param {string} shortCode - Short code for the URL
 * @returns {Promise<any|null>} Public URL details or null if not found/inactive
 */
export const getPublicUrlDetails = async (shortCode: string): Promise<any | null> => {
  try {
    // Get URL from database, ensuring it's active and not deleted
    const url = await urlModel.getUrlByShortCode(shortCode);

    // Return null if URL not found or inactive
    if (!url || !url.is_active || url.deleted_at) {
      return null;
    }

    // Check if URL has expired
    if (url.expiry_date && new Date(url.expiry_date) < new Date()) {
      logger.info(`URL with short code ${shortCode} has expired`);
      return null;
    }

    // Generate the full short URL
    const baseUrl = process.env.SHORT_URL_BASE ?? 'https://cylink.id/';
    const shortUrl = baseUrl + url.short_code;

    // Generate redirect URL with UTM campaigns
    const redirectUrl = `${url.original_url}?${generateUtmParameters(url.short_code)}`;

    // Return only the required fields for public consumption
    return {
      original_url: redirectUrl,
      title: url.title ?? null,
      short_code: url.short_code,
      short_url: shortUrl,
      created_at: new Date(url.created_at).toISOString(),
      expiry_date: url.expiry_date ? new Date(url.expiry_date).toISOString() : null,
      is_active: url.is_active,
    };
  } catch (error) {
    // Log error but don't expose details
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error retrieving public URL details for ${shortCode}: ${errorMessage}`);
    throw new Error('Failed to retrieve URL details');
  }
};

/**
 * Generate UTM parameters
 * @param {string} shortCode - The short code for tracking
 * @returns {string} - The query string with UTM parameters
 */
const generateUtmParameters = (shortCode: string): string => {
  const searchParams = new URLSearchParams({
    utm_source: 'cylink',
    utm_medium: 'shortlink',
    utm_campaign: 'conversion',
    utm_content: encodeURIComponent(shortCode),
  });

  return searchParams.toString();
};

export default { getPublicUrlDetails };
