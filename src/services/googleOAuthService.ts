/**
 * Google OAuth Service
 *
 * Handles Google OAuth 2.0 authentication flow
 * @module services/googleOAuthService
 */

import { google } from 'googleapis';
import logger from '../libs/winston/winston.service';

/**
 * Google OAuth user profile interface
 */
export interface GoogleUserProfile {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

/**
 * OAuth tokens interface
 */
export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  id_token?: string;
}

/**
 * Initialize OAuth2 client with credentials from environment variables
 */
const getOAuth2Client = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Missing Google OAuth configuration. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI in environment variables.',
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

/**
 * Generate Google OAuth authorization URL
 * @param {string} flow - OAuth flow type: 'login' or 'register'
 * @returns {string} Authorization URL for Google consent page
 */
export const getAuthorizationUrl = (flow: 'login' | 'register' = 'login'): string => {
  const oauth2Client = getOAuth2Client();

  const scopes = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Request refresh token
    scope: scopes,
    prompt: 'consent', // Force consent screen to get refresh token
    state: flow, // Add state to track flow type (login or register)
  });

  logger.info('Generated Google OAuth authorization URL');
  return authUrl;
};

/**
 * Exchange authorization code for access and refresh tokens
 * @param {string} code - Authorization code from Google callback
 * @returns {Promise<OAuthTokens>} OAuth tokens
 */
export const getTokensFromCode = async (code: string): Promise<OAuthTokens> => {
  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new Error('No access token received from Google');
    }

    logger.info('Successfully exchanged authorization code for tokens');
    return tokens as OAuthTokens;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to exchange authorization code for tokens: ${errorMessage}`);
    throw new Error(`Failed to get tokens from Google: ${errorMessage}`);
  }
};

/**
 * Retrieve user profile information from Google
 * @param {string} accessToken - Google OAuth access token
 * @returns {Promise<GoogleUserProfile>} User profile data
 */
export const getUserProfile = async (accessToken: string): Promise<GoogleUserProfile> => {
  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2',
    });

    const { data } = await oauth2.userinfo.get();

    if (!data.id || !data.email) {
      throw new Error('Incomplete user profile data received from Google');
    }

    logger.info(`Successfully retrieved user profile for Google ID: ${data.id}`);
    return data as GoogleUserProfile;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to retrieve user profile from Google: ${errorMessage}`);
    throw new Error(`Failed to get user profile: ${errorMessage}`);
  }
};

/**
 * Verify Google ID token
 * @param {string} idToken - Google ID token
 * @returns {Promise<boolean>} True if token is valid
 */
export const verifyIdToken = async (idToken: string): Promise<boolean> => {
  try {
    const oauth2Client = getOAuth2Client();
    const ticket = await oauth2Client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return false;
    }

    logger.info('Successfully verified Google ID token');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to verify Google ID token: ${errorMessage}`);
    return false;
  }
};

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Google OAuth refresh token
 * @returns {Promise<OAuthTokens>} New OAuth tokens
 */
export const refreshAccessToken = async (refreshToken: string): Promise<OAuthTokens> => {
  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error('No access token received from token refresh');
    }

    logger.info('Successfully refreshed access token');
    return credentials as OAuthTokens;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to refresh access token: ${errorMessage}`);
    throw new Error(`Failed to refresh token: ${errorMessage}`);
  }
};
