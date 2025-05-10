/**
 * URL Controllers Index
 *
 * Exports URL-related controllers for easy importing
 * @module controllers/urls
 */

export { default as getAllUrls } from './getAllUrls';
export { default as createAnonymousUrl } from './createAnonymousUrl';
export { default as createAuthenticatedUrl } from './createAuthenticatedUrl';
export { default as getUrlDetails } from './getUrlDetails';
export { default as deleteUrl } from './deleteUrl';
export { default as getUrlAnalytics } from './getUrlAnalytics';
export { default as getTotalClicksAnalytics } from './getTotalClicksAnalytics';
export { default as getUrlsWithStatusFilter } from './getUrlsWithStatusFilter';
export { default as updateUrl } from './updateUrl';
