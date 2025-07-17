/**
 * Registration Validator Tests
 *
 * Unit tests for the registration validator, covering all validation rules:
 * required fields, email format, password length, password confirmation match, and sanitization.
 *
 * @module __tests__/validators/registrationValidator.test
 */

import {
  registrationValidationRules,
  registrationValidator,
} from '../../validators/registrationValidator';
import { createMockReqRes } from '../utils/testUtils';

describe('registrationValidator', () => {
  let req: any, res: any, next: any;

  beforeEach(() => {
    ({ req, res, next } = createMockReqRes());
    res.status = jest.fn().mockReturnThis();
    res.json = jest.fn().mockReturnThis();
    next = jest.fn();
  });

  it('should pass validation for valid input', async () => {
    req.body = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123!',
      password_confirmation: 'Password123!',
    };
    for (const rule of registrationValidationRules) {
      await rule.run(req);
    }
    registrationValidator(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should fail if required fields are missing', async () => {
    req.body = {};
    for (const rule of registrationValidationRules) {
      await rule.run(req);
    }
    registrationValidator(req, res, next);
    expect(res.status).toHaveBeenCalledWith(422);
    const jsonCall = res.json.mock.calls[0][0];
    expect(jsonCall).toHaveProperty('message', 'Validation failed');
    // Check that at least one error for each field exists
    const errorPaths = jsonCall.errors.map((e: any) => e.path);
    expect(errorPaths).toContain('username');
    expect(errorPaths).toContain('email');
    expect(errorPaths).toContain('password');
    expect(errorPaths).toContain('password_confirmation');
  });

  it('should fail for invalid email format', async () => {
    req.body = {
      username: 'testuser',
      email: 'invalid-email',
      password: 'Password123!',
      password_confirmation: 'Password123!',
    };
    for (const rule of registrationValidationRules) {
      await rule.run(req);
    }
    registrationValidator(req, res, next);
    expect(res.status).toHaveBeenCalledWith(422);
    const jsonCall = res.json.mock.calls[0][0];
    expect(jsonCall).toHaveProperty('message', 'Validation failed');
    expect(jsonCall.errors.some((e: any) => e.path === 'email')).toBe(true);
  });

  it('should fail for short password', async () => {
    req.body = {
      username: 'testuser',
      email: 'test@example.com',
      password: '123',
      password_confirmation: '123',
    };
    for (const rule of registrationValidationRules) {
      await rule.run(req);
    }
    registrationValidator(req, res, next);
    expect(res.status).toHaveBeenCalledWith(422);
    const jsonCall = res.json.mock.calls[0][0];
    expect(jsonCall).toHaveProperty('message', 'Validation failed');
    expect(jsonCall.errors.some((e: any) => e.path === 'password')).toBe(true);
  });

  it('should fail if password and confirmation do not match', async () => {
    req.body = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123!',
      password_confirmation: 'Password321!',
    };
    for (const rule of registrationValidationRules) {
      await rule.run(req);
    }
    registrationValidator(req, res, next);
    expect(res.status).toHaveBeenCalledWith(422);
    const jsonCall = res.json.mock.calls[0][0];
    expect(jsonCall).toHaveProperty('message', 'Validation failed');
    expect(jsonCall.errors.some((e: any) => e.path === 'password_confirmation')).toBe(true);
  });

  it('should sanitize and trim input fields', async () => {
    req.body = {
      username: '  testuser  ',
      email: '  test@example.com  ',
      password: '  Password123!  ',
      password_confirmation: '  Password123!  ',
    };
    for (const rule of registrationValidationRules) {
      await rule.run(req);
    }
    registrationValidator(req, res, next);
    expect(next).toHaveBeenCalled();
    // express-validator mutates req.body in-place for .trim(), .escape(), .normalizeEmail()
    expect(req.body.username).toBe('testuser');
    expect(req.body.email).toBe('test@example.com');
    expect(req.body.password).toBe('Password123!');
    expect(req.body.password_confirmation).toBe('Password123!');
  });
});
