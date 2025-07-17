/**
 * Registration Controller Tests
 *
 * Tests for registration and verification endpoints, covering success, validation, duplicate email, and error cases.
 * Uses modular test utilities and mocks for maintainability and flexibility.
 *
 * @module __tests__/controllers/registrationController.test
 */

import { Express } from 'express';
import { createTestApp, createTestRequest } from '../utils/testUtils';
import { register } from '../../controllers/registrationController';
import { verify } from '../../controllers/verificationController';
import registrationService from '../../services/registrationService';
import * as verificationService from '../../services/verificationService';
import { RegistrationRequest } from '../../interfaces/RegistrationRequest';

jest.mock('../../services/registrationService');
jest.mock('../../services/verificationService');

const mockRegisterUser = registrationService.registerUser as jest.Mock;
const mockVerifyUserByToken = verificationService.verifyUserByToken as jest.Mock;

describe('Registration & Verification Controller', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp([], {
      '/api/v1/auth/register': register,
      '/api/v1/auth/verify': verify,
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const reqBody: RegistrationRequest = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
        password_confirmation: 'Password123!',
      };
      mockRegisterUser.mockResolvedValue({ id: 1, ...reqBody });

      const response = await createTestRequest(app).post('/api/v1/auth/register').send(reqBody);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe(201);
      expect(response.body.message).toMatch(/Registration successful/i);
      expect(mockRegisterUser).toHaveBeenCalledWith(reqBody);
    });

    it('should return 409 for duplicate email', async () => {
      const reqBody: RegistrationRequest = {
        username: 'testuser',
        email: 'duplicate@example.com',
        password: 'Password123!',
        password_confirmation: 'Password123!',
      };
      mockRegisterUser.mockImplementation(() => {
        throw new Error('Email already taken');
      });

      const response = await createTestRequest(app).post('/api/v1/auth/register').send(reqBody);

      expect(response.status).toBe(409);
      expect(response.body.message).toMatch(/already registered/i);
    });

    it('should return 500 for internal errors', async () => {
      const reqBody: RegistrationRequest = {
        username: 'testuser',
        email: 'error@example.com',
        password: 'Password123!',
        password_confirmation: 'Password123!',
      };
      mockRegisterUser.mockImplementation(() => {
        throw new Error('Some internal error');
      });

      const response = await createTestRequest(app).post('/api/v1/auth/register').send(reqBody);

      expect(response.status).toBe(500);
      expect(response.body.message).toMatch(/internal server error/i);
    });
  });

  describe('GET /api/v1/auth/verify', () => {
    it('should verify user successfully', async () => {
      mockVerifyUserByToken.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        email_verified_at: new Date(),
      });
      const response = await createTestRequest(app)
        .get('/api/v1/auth/verify')
        .query({ token: 'valid-token' });
      expect(response.status).toBe(200);
      expect(response.body.status).toBe(200);
      expect(response.body.message).toMatch(/verified/i);
      expect(mockVerifyUserByToken).toHaveBeenCalledWith('valid-token');
    });

    it('should return 400 for invalid or expired token', async () => {
      mockVerifyUserByToken.mockImplementation(() => {
        throw new Error('Invalid or expired verification token');
      });
      const response = await createTestRequest(app)
        .get('/api/v1/auth/verify')
        .query({ token: 'invalid-token' });
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/invalid|expired/i);
    });

    it('should return 400 for missing token', async () => {
      const response = await createTestRequest(app).get('/api/v1/auth/verify');
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/token is required/i);
    });
  });
});
