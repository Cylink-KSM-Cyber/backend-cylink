/**
 * Registration Validator Tests
 *
 * Unit tests for the registration validator, covering all validation rules:
 * required fields, email format, password length, password confirmation match, and sanitization.
 *
 * @module __tests__/validators/registrationValidator.test
 */

require('dotenv').config();

import {
  registrationValidationRules,
  registrationValidator,
} from '../../validators/registrationValidator';

const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPassword!123';
const SHORT_PASSWORD = process.env.TEST_SHORT_PASSWORD || '123';

async function setupAndRunValidation(body: Record<string, unknown>, res: any, next: any) {
  const req: any = { body };
  for (const rule of registrationValidationRules) {
    await rule.run(req);
  }
  registrationValidator(req, res, next);
  return req;
}

/**
 * Helper to DRY up validation error tests.
 * @param body - request body to validate
 * @param expectedErrorFields - array of field names expected to have errors
 * @param customAssert - optional function for custom assertions on the error response
 */
async function expectValidationError(
  body: Record<string, unknown>,
  expectedErrorFields: string[],
  customAssert?: (jsonCall: any) => void,
) {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  const next = jest.fn();
  await setupAndRunValidation(body, res, next);
  expect(res.status).toHaveBeenCalledWith(422);
  const jsonCall = res.json.mock.calls[0][0];
  expect(jsonCall).toHaveProperty('message', 'Validation failed');
  const errorPaths = jsonCall.errors.map((e: any) => e.path);
  for (const field of expectedErrorFields) {
    expect(errorPaths).toContain(field);
  }
  if (customAssert) customAssert(jsonCall);
}

describe('registrationValidator', () => {
  let res: any, next: any;

  beforeEach(() => {
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    next = jest.fn();
  });

  it('should pass validation for valid input', async () => {
    await setupAndRunValidation(
      {
        username: 'testuser',
        email: 'test@example.com',
        password: TEST_PASSWORD,
        password_confirmation: TEST_PASSWORD,
      },
      res,
      next,
    );
    expect(next).toHaveBeenCalled();
  });

  it('should fail if required fields are missing', async () => {
    await expectValidationError({}, ['username', 'email', 'password', 'password_confirmation']);
  });

  it('should fail for invalid email format', async () => {
    await expectValidationError(
      {
        username: 'testuser',
        email: 'invalid-email',
        password: TEST_PASSWORD,
        password_confirmation: TEST_PASSWORD,
      },
      ['email'],
    );
  });

  it('should fail for short password', async () => {
    await expectValidationError(
      {
        username: 'testuser',
        email: 'test@example.com',
        password: SHORT_PASSWORD,
        password_confirmation: SHORT_PASSWORD,
      },
      ['password'],
    );
  });

  it('should fail if password and confirmation do not match', async () => {
    await expectValidationError(
      {
        username: 'testuser',
        email: 'test@example.com',
        password: TEST_PASSWORD,
        password_confirmation: 'notmatching',
      },
      ['password_confirmation'],
    );
  });

  it('should sanitize and trim input fields', async () => {
    const req = await setupAndRunValidation(
      {
        username: '  testuser  ',
        email: '  test@example.com  ',
        password: `  ${TEST_PASSWORD}  `,
        password_confirmation: `  ${TEST_PASSWORD}  `,
      },
      res,
      next,
    );
    expect(next).toHaveBeenCalled();
    expect(req.body.username).toBe('testuser');
    expect(req.body.email).toBe('test@example.com');
    expect(req.body.password).toBe(TEST_PASSWORD);
    expect(req.body.password_confirmation).toBe(TEST_PASSWORD);
  });
});
