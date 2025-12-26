/**
 * User Model OAuth Functions Tests
 *
 * Unit tests for OAuth-related user model functions
 */

import * as userModel from '../../models/userModel';
import pool from '../../config/database';

// Mock database pool
jest.mock('../../config/database');

describe('User Model - OAuth Functions', () => {
  const mockPool = pool as jest.Mocked<typeof pool>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserByGoogleId', () => {
    it('should retrieve user by Google ID', async () => {
      const mockGoogleId = '123456789';
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        google_id: mockGoogleId,
        oauth_provider: 'google',
      };

      mockPool.query.mockResolvedValue({ rows: [mockUser] } as any);

      const result = await userModel.getUserByGoogleId(mockGoogleId);

      expect(result).toEqual(mockUser);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE google_id = $1 AND deleted_at IS NULL',
        [mockGoogleId],
      );
    });

    it('should return undefined if user not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await userModel.getUserByGoogleId('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('linkGoogleAccount', () => {
    it('should link Google account to existing user', async () => {
      const userId = 1;
      const googleId = '123456789';
      const tokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
      };

      const mockUpdatedUser = {
        id: userId,
        google_id: googleId,
        oauth_provider: 'google',
        oauth_access_token: tokens.access_token,
        oauth_refresh_token: tokens.refresh_token,
      };

      mockPool.query.mockResolvedValue({ rows: [mockUpdatedUser] } as any);

      const result = await userModel.linkGoogleAccount(userId, googleId, tokens);

      expect(result).toEqual(mockUpdatedUser);
      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE users'), [
        googleId,
        'google',
        tokens.access_token,
        tokens.refresh_token,
        userId,
      ]);
    });

    it('should handle tokens without refresh token', async () => {
      const userId = 1;
      const googleId = '123456789';
      const tokens = { access_token: 'test-access-token' };

      mockPool.query.mockResolvedValue({ rows: [{}] } as any);

      await userModel.linkGoogleAccount(userId, googleId, tokens);

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE users'), [
        googleId,
        'google',
        tokens.access_token,
        null,
        userId,
      ]);
    });
  });

  describe('updateOAuthTokens', () => {
    it('should update OAuth tokens for user', async () => {
      const userId = 1;
      const tokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      };

      const mockUpdatedUser = {
        id: userId,
        oauth_access_token: tokens.access_token,
        oauth_refresh_token: tokens.refresh_token,
      };

      mockPool.query.mockResolvedValue({ rows: [mockUpdatedUser] } as any);

      const result = await userModel.updateOAuthTokens(userId, tokens);

      expect(result).toEqual(mockUpdatedUser);
      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE users'), [
        tokens.access_token,
        tokens.refresh_token,
        userId,
      ]);
    });
  });

  describe('createOAuthUser', () => {
    it('should create new OAuth user', async () => {
      const userData = {
        email: 'newuser@example.com',
        username: 'New User',
        google_id: '987654321',
        oauth_provider: 'google',
        oauth_access_token: 'test-access-token',
        oauth_refresh_token: 'test-refresh-token',
      };

      const mockCreatedUser = {
        id: 2,
        ...userData,
        email_verified_at: new Date(),
        role: 'user',
      };

      mockPool.query.mockResolvedValue({ rows: [mockCreatedUser] } as any);

      const result = await userModel.createOAuthUser(userData);

      expect(result).toEqual(mockCreatedUser);
      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO users'), [
        userData.email,
        userData.username,
        userData.google_id,
        userData.oauth_provider,
        userData.oauth_access_token,
        userData.oauth_refresh_token,
        'user',
      ]);
    });

    it('should create OAuth user without refresh token', async () => {
      const userData = {
        email: 'newuser@example.com',
        username: 'New User',
        google_id: '987654321',
        oauth_provider: 'google',
        oauth_access_token: 'test-access-token',
      };

      mockPool.query.mockResolvedValue({ rows: [{}] } as any);

      await userModel.createOAuthUser(userData);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([null]),
      );
    });
  });
});
