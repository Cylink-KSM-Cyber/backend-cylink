/**
 * Verification Service Tests
 *
 * Unit tests for verificationService covering token validation and user verification logic.
 *
 * @module __tests__/services/verificationService.test
 */

import * as verificationService from '../../services/verificationService';

jest.mock('../../models/userModel');
jest.mock('../../utils/jwt');

const userModel = require('../../models/userModel');
const jwt = require('../../utils/jwt');

describe('verificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateVerificationToken', () => {
    it('should return decoded payload for valid token', async () => {
      jwt.verification.verify.mockReturnValue({ email: 'test@example.com' });
      const decoded = await verificationService.validateVerificationToken('valid-token');
      expect(decoded).toEqual({ email: 'test@example.com' });
    });

    it('should throw error for invalid token', async () => {
      jwt.verification.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      await expect(verificationService.validateVerificationToken('bad-token')).rejects.toThrow(
        /invalid|expired/i,
      );
    });
  });

  describe('verifyUserByToken', () => {
    it('should throw error if token payload is invalid', async () => {
      jwt.verification.verify.mockReturnValue({});
      await expect(verificationService.verifyUserByToken('bad-token')).rejects.toThrow(
        /invalid or expired verification token/i,
      );
    });

    it('should throw error if user not found', async () => {
      jwt.verification.verify.mockReturnValue({ email: 'notfound@example.com' });
      userModel.getUserByEmail.mockResolvedValue(null);
      await expect(verificationService.verifyUserByToken('valid-token')).rejects.toThrow(
        /not found/i,
      );
    });

    it('should throw error if user already verified', async () => {
      jwt.verification.verify.mockReturnValue({ email: 'verified@example.com' });
      userModel.getUserByEmail.mockResolvedValue({ email_verified_at: new Date() });
      await expect(verificationService.verifyUserByToken('valid-token')).rejects.toThrow(
        /already verified/i,
      );
    });

    it('should update user and return safe fields on success', async () => {
      jwt.verification.verify.mockReturnValue({ email: 'test@example.com' });
      userModel.getUserByEmail.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        email_verified_at: null,
      });
      userModel.updateUser.mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        email_verified_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });
      const result = await verificationService.verifyUserByToken('valid-token');
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('email', 'test@example.com');
      expect(result).toHaveProperty('email_verified_at');
    });
  });
});
