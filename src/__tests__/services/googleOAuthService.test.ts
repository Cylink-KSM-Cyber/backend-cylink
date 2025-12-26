/**
 * Google OAuth Service Tests
 *
 * Unit tests for Google OAuth service functions
 */

import * as googleOAuthService from '../../services/googleOAuthService';
import { google } from 'googleapis';

// Mock googleapis
jest.mock('googleapis');

describe('Google OAuth Service', () => {
  const mockOAuth2Client = {
    generateAuthUrl: jest.fn(),
    getToken: jest.fn(),
    setCredentials: jest.fn(),
    verifyIdToken: jest.fn(),
    refreshAccessToken: jest.fn(),
  };

  const mockOauth2 = {
    userinfo: {
      get: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock environment variables
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/oauth/callback';

    // Mock google.auth.OAuth2 constructor
    (google.auth.OAuth2 as jest.Mock) = jest.fn(() => mockOAuth2Client);

    // Mock google.oauth2
    (google.oauth2 as jest.Mock) = jest.fn(() => mockOauth2);
  });

  afterEach(() => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_REDIRECT_URI;
  });

  describe('getAuthorizationUrl', () => {
    it('should generate authorization URL with correct scopes', () => {
      const mockAuthUrl = 'https://accounts.google.com/o/oauth2/auth?...';
      mockOAuth2Client.generateAuthUrl.mockReturnValue(mockAuthUrl);

      const result = googleOAuthService.getAuthorizationUrl();

      expect(result).toBe(mockAuthUrl);
      expect(mockOAuth2Client.generateAuthUrl).toHaveBeenCalledWith({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email',
        ],
        prompt: 'consent',
      });
    });

    it('should throw error if environment variables are missing', () => {
      delete process.env.GOOGLE_CLIENT_ID;

      expect(() => googleOAuthService.getAuthorizationUrl()).toThrow(
        'Missing Google OAuth configuration',
      );
    });
  });

  describe('getTokensFromCode', () => {
    it('should exchange authorization code for tokens', async () => {
      const mockCode = 'test-auth-code';
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.getToken.mockResolvedValue({ tokens: mockTokens });

      const result = await googleOAuthService.getTokensFromCode(mockCode);

      expect(result).toEqual(mockTokens);
      expect(mockOAuth2Client.getToken).toHaveBeenCalledWith(mockCode);
    });

    it('should throw error if no access token received', async () => {
      const mockCode = 'test-auth-code';
      mockOAuth2Client.getToken.mockResolvedValue({ tokens: {} });

      await expect(googleOAuthService.getTokensFromCode(mockCode)).rejects.toThrow(
        'No access token received from Google',
      );
    });

    it('should throw error if token exchange fails', async () => {
      const mockCode = 'test-auth-code';
      mockOAuth2Client.getToken.mockRejectedValue(new Error('Invalid code'));

      await expect(googleOAuthService.getTokensFromCode(mockCode)).rejects.toThrow(
        'Failed to get tokens from Google',
      );
    });
  });

  describe('getUserProfile', () => {
    it('should retrieve user profile with access token', async () => {
      const mockAccessToken = 'test-access-token';
      const mockUserProfile = {
        id: '123456789',
        email: 'test@example.com',
        verified_email: true,
        name: 'Test User',
        given_name: 'Test',
        family_name: 'User',
        picture: 'https://example.com/photo.jpg',
        locale: 'en',
      };

      mockOauth2.userinfo.get.mockResolvedValue({ data: mockUserProfile });

      const result = await googleOAuthService.getUserProfile(mockAccessToken);

      expect(result).toEqual(mockUserProfile);
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        access_token: mockAccessToken,
      });
      expect(mockOauth2.userinfo.get).toHaveBeenCalled();
    });

    it('should throw error if incomplete profile data received', async () => {
      const mockAccessToken = 'test-access-token';
      mockOauth2.userinfo.get.mockResolvedValue({ data: { name: 'Test' } });

      await expect(googleOAuthService.getUserProfile(mockAccessToken)).rejects.toThrow(
        'Incomplete user profile data received from Google',
      );
    });

    it('should throw error if profile retrieval fails', async () => {
      const mockAccessToken = 'test-access-token';
      mockOauth2.userinfo.get.mockRejectedValue(new Error('API error'));

      await expect(googleOAuthService.getUserProfile(mockAccessToken)).rejects.toThrow(
        'Failed to get user profile',
      );
    });
  });

  describe('verifyIdToken', () => {
    it('should verify valid ID token', async () => {
      const mockIdToken = 'test-id-token';
      const mockPayload = { sub: '123456789', email: 'test@example.com' };

      mockOAuth2Client.verifyIdToken.mockResolvedValue({
        getPayload: () => mockPayload,
      });

      const result = await googleOAuthService.verifyIdToken(mockIdToken);

      expect(result).toBe(true);
      expect(mockOAuth2Client.verifyIdToken).toHaveBeenCalledWith({
        idToken: mockIdToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    });

    it('should return false for invalid ID token', async () => {
      const mockIdToken = 'invalid-token';
      mockOAuth2Client.verifyIdToken.mockRejectedValue(new Error('Invalid token'));

      const result = await googleOAuthService.verifyIdToken(mockIdToken);

      expect(result).toBe(false);
    });

    it('should return false if payload is missing', async () => {
      const mockIdToken = 'test-id-token';
      mockOAuth2Client.verifyIdToken.mockResolvedValue({
        getPayload: () => null,
      });

      const result = await googleOAuthService.verifyIdToken(mockIdToken);

      expect(result).toBe(false);
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token using refresh token', async () => {
      const mockRefreshToken = 'test-refresh-token';
      const mockNewTokens = {
        access_token: 'new-access-token',
        expiry_date: Date.now() + 3600000,
      };

      mockOAuth2Client.refreshAccessToken.mockResolvedValue({
        credentials: mockNewTokens,
      });

      const result = await googleOAuthService.refreshAccessToken(mockRefreshToken);

      expect(result).toEqual(mockNewTokens);
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        refresh_token: mockRefreshToken,
      });
      expect(mockOAuth2Client.refreshAccessToken).toHaveBeenCalled();
    });

    it('should throw error if no access token in refresh response', async () => {
      const mockRefreshToken = 'test-refresh-token';
      mockOAuth2Client.refreshAccessToken.mockResolvedValue({
        credentials: {},
      });

      await expect(googleOAuthService.refreshAccessToken(mockRefreshToken)).rejects.toThrow(
        'No access token received from token refresh',
      );
    });

    it('should throw error if token refresh fails', async () => {
      const mockRefreshToken = 'test-refresh-token';
      mockOAuth2Client.refreshAccessToken.mockRejectedValue(new Error('Refresh failed'));

      await expect(googleOAuthService.refreshAccessToken(mockRefreshToken)).rejects.toThrow(
        'Failed to refresh token',
      );
    });
  });
});
