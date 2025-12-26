/**
 * OAuth Controller
 *
 * Handles HTTP requests related to OAuth authentication
 * @module controllers/oauthController
 */

import { Request, Response } from 'express';
import * as googleOAuthService from '../services/googleOAuthService';
import logger from '../libs/winston/winston.service';

const authService = require('../services/authService');
const { sendResponse } = require('../utils/response');
const userModel = require('../models/userModel');
const jwt = require('../libs/jwt/jwt.service');
const userCollection = require('../collections/userCollection');

/**
 * Initiates Google OAuth flow for LOGIN by redirecting to Google consent page
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {void} Redirects to Google OAuth consent page
 */
exports.initiateGoogleOAuth = (req: Request, res: Response): void => {
  try {
    const authUrl = googleOAuthService.getAuthorizationUrl('login');
    logger.info('Redirecting user to Google OAuth consent page for login');
    res.redirect(authUrl);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`OAuth error: Failed to initiate Google OAuth login: ${errorMessage}`);

    // Redirect to frontend error page
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/login/oauth/error?error=initialization_failed`);
  }
};

/**
 * Initiates Google OAuth flow for REGISTRATION by redirecting to Google consent page
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {void} Redirects to Google OAuth consent page
 */
exports.initiateGoogleOAuthRegister = (req: Request, res: Response): void => {
  try {
    const authUrl = googleOAuthService.getAuthorizationUrl('register');
    logger.info('Redirecting user to Google OAuth consent page for registration');
    res.redirect(authUrl);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`OAuth error: Failed to initiate Google OAuth registration: ${errorMessage}`);

    // Redirect to frontend error page
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/login/oauth/error?error=initialization_failed`);
  }
};

/**
 * Handles Google OAuth callback after user grants permissions
 * Supports both LOGIN and REGISTER flows based on state parameter
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<void>} Redirects to frontend with success or error
 */
exports.handleGoogleCallback = async (req: Request, res: Response): Promise<void> => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  try {
    const { code, error, state } = req.query;
    const flow = (state as 'login' | 'register') || 'login';

    // Handle user denial or OAuth errors
    if (error) {
      logger.warn(`OAuth error: User denied access or error occurred: ${error}`);
      res.redirect(`${frontendUrl}/login/oauth/error?error=access_denied`);
      return;
    }

    if (!code || typeof code !== 'string') {
      logger.error('OAuth error: No authorization code received');
      res.redirect(`${frontendUrl}/login/oauth/error?error=no_code`);
      return;
    }

    // Exchange authorization code for tokens
    const tokens = await googleOAuthService.getTokensFromCode(code);

    // Get user profile from Google
    const googleProfile = await googleOAuthService.getUserProfile(tokens.access_token);

    // Check if user exists by Google ID
    let user = await userModel.getUserByGoogleId(googleProfile.id);

    // REGISTER FLOW
    if (flow === 'register') {
      // Check if user already exists (by Google ID or email)
      if (user || (await userModel.getUserByEmail(googleProfile.email))) {
        logger.warn(`OAuth registration error: Email already registered: ${googleProfile.email}`);
        res.redirect(
          `${frontendUrl}/login/oauth/error?error=email_exists&email=${encodeURIComponent(googleProfile.email)}`,
        );
        return;
      }

      // Generate temporary token for username selection
      const tempToken = jwt.verification.sign({
        email: googleProfile.email,
        name: googleProfile.name,
        googleId: googleProfile.id,
        picture: googleProfile.picture,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      });

      logger.info(`Generated temporary token for OAuth registration: ${googleProfile.email}`);
      // Redirect to username selection page
      res.redirect(`${frontendUrl}/register/oauth/username?token=${tempToken}`);
      return;
    }

    // LOGIN FLOW
    // If not found by Google ID, check by email
    if (!user) {
      user = await userModel.getUserByEmail(googleProfile.email);

      // If user exists with email but no Google ID, link the account
      if (user) {
        await userModel.linkGoogleAccount(user.id, googleProfile.id, tokens);
        logger.info(`Linked Google account to existing user: ${user.email}`);
      }
    }

    // If user still doesn't exist, they need to register first
    if (!user) {
      logger.warn(`OAuth login error: User not registered: ${googleProfile.email}`);
      res.redirect(
        `${frontendUrl}/login/oauth/error?error=not_registered&email=${encodeURIComponent(googleProfile.email)}`,
      );
      return;
    }

    // Check if user account is verified
    if (!user.email_verified_at) {
      // Auto-verify OAuth users since Google has verified their email
      await userModel.updateUser({ email_verified_at: Date.now() }, user.id);
      logger.info(`Auto-verified OAuth user: ${user.email}`);
    }

    // Get IP and user-agent for login tracking
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || null;
    const userAgent = req.headers['user-agent'] || null;

    // Create session and generate JWT tokens
    const loginData = await authService.login(user, ipAddress, userAgent);
    logger.info(`Successfully logged in via Google OAuth: ${user.email}`);

    // Redirect to frontend with JWT token
    const accessToken = loginData.token.access;
    const refreshToken = loginData.token.refresh;

    res.redirect(
      `${frontendUrl}/login/oauth/callback?` +
        `access_token=${encodeURIComponent(accessToken)}&` +
        `refresh_token=${encodeURIComponent(refreshToken)}&` +
        `first_login=${loginData.first_login}`,
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`OAuth error: Failed to handle Google callback: ${errorMessage}`);
    res.redirect(`${frontendUrl}/login/oauth/error?error=authentication_failed`);
  }
};

/**
 * Completes Google OAuth registration by creating user with selected username
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON response with tokens or error
 */
exports.completeGoogleRegistration = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { token, username } = req.body;

    if (!token || !username) {
      return sendResponse(res, 400, 'Token and username are required');
    }

    // Verify temporary token
    let decoded;
    try {
      decoded = jwt.verification.verify(token);
    } catch (error) {
      logger.error('OAuth registration error: Invalid or expired token');
      return sendResponse(res, 400, 'Invalid or expired token. Please try again.');
    }

    // Check if username is available
    const existingUser = await userModel.getUserByUsername(username);
    if (existingUser) {
      logger.warn(`OAuth registration error: Username already taken: ${username}`);
      return sendResponse(res, 400, 'Username already taken. Please choose another.');
    }

    // Create OAuth user with username
    const newUser = await userModel.createOAuthUser({
      email: decoded.email,
      name: decoded.name,
      username: username,
      google_id: decoded.googleId,
      oauth_provider: 'google',
      oauth_access_token: decoded.accessToken,
      oauth_refresh_token: decoded.refreshToken,
      email_verified_at: Date.now(), // Auto-verify OAuth users
    });

    logger.info(`Successfully created OAuth user: ${newUser.email} with username: ${username}`);

    // Get IP and user-agent for login tracking
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || null;
    const userAgent = req.headers['user-agent'] || null;

    // Generate JWT tokens and create session
    const loginData = await authService.login(newUser, ipAddress, userAgent);

    return sendResponse(res, 201, 'Registration successful!', loginData);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`OAuth registration error: Failed to complete registration: ${errorMessage}`);
    return sendResponse(res, 500, 'Internal server error');
  }
};

/**
 * Handles Google OAuth for API clients (returns JSON instead of redirect)
 * This is an alternative endpoint for API-based OAuth flow
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON response with tokens or error
 */
exports.handleGoogleCallbackAPI = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { code } = req.body;

    if (!code) {
      return sendResponse(res, 400, 'Authorization code is required');
    }

    // Exchange authorization code for tokens
    const tokens = await googleOAuthService.getTokensFromCode(code);

    // Get user profile from Google
    const googleProfile = await googleOAuthService.getUserProfile(tokens.access_token);

    // Check if user exists by Google ID
    let user = await userModel.getUserByGoogleId(googleProfile.id);

    // If not found by Google ID, check by email
    if (!user) {
      user = await userModel.getUserByEmail(googleProfile.email);

      // If user exists with email but no Google ID, link the account
      if (user) {
        await userModel.linkGoogleAccount(user.id, googleProfile.id, tokens);
        logger.info(`Linked Google account to existing user: ${user.email}`);
      }
    }

    // If user still doesn't exist, they need to register first
    if (!user) {
      logger.warn(`OAuth error: User not registered: ${googleProfile.email}`);
      return sendResponse(res, 404, 'Account not registered. Please sign up first.');
    }

    // Check if user account is verified
    if (!user.email_verified_at) {
      // Auto-verify OAuth users since Google has verified their email
      await userModel.updateUser({ email_verified_at: Date.now() }, user.id);
      logger.info(`Auto-verified OAuth user: ${user.email}`);
    }

    // Get IP and user-agent for login tracking
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || null;
    const userAgent = req.headers['user-agent'] || null;

    // Create session and generate JWT tokens
    const loginData = await authService.login(user, ipAddress, userAgent);
    logger.info(`Successfully logged in via Google OAuth: ${user.email}`);

    return sendResponse(res, 200, 'Successfully logged in!', loginData);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`OAuth error: Failed to authenticate with Google: ${errorMessage}`);
    return sendResponse(res, 500, 'Internal server error');
  }
};
