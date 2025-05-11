import {
  getAllUrls,
  createAnonymousUrl,
  createAuthenticatedUrl,
  getUrlDetails,
  deleteUrl,
  getUrlAnalytics,
  getTotalClicksAnalytics,
  getUrlsWithStatusFilter,
  updateUrl,
} from './urls';

import getPublicUrlDetails from './urls/getPublicUrlDetails';

/**
 * URL Controller
 *
 * Handles URL-related operations including listing, creating, updating, and deleting shortened URLs
 * @module controllers/urlController
 */

// Export the refactored getAllUrls function
exports.getAllUrls = getAllUrls;

// Export the refactored createAnonymousUrl function
exports.createAnonymousUrl = createAnonymousUrl;

// Export the refactored createAuthenticatedUrl function
exports.createAuthenticatedUrl = createAuthenticatedUrl;

// Export the refactored getUrlDetails function
exports.getUrlDetails = getUrlDetails;

// Export the refactored deleteUrl function
exports.deleteUrl = deleteUrl;

// Export the refactored getUrlAnalytics function
exports.getUrlAnalytics = getUrlAnalytics;

// Export the refactored getTotalClicksAnalytics function
exports.getTotalClicksAnalytics = getTotalClicksAnalytics;

// Export the refactored getUrlsWithStatusFilter function
exports.getUrlsWithStatusFilter = getUrlsWithStatusFilter;

// Export the refactored updateUrl function
exports.updateUrl = updateUrl;

// Export the getPublicUrlDetails function
exports.getPublicUrlDetails = getPublicUrlDetails;
