/**
 * Registration Verification Email Template Tests
 *
 * Unit tests for the registration verification email template (HTML and plain text).
 *
 * @module __tests__/mails/registerMail.test
 */

import { registrationVerificationHtml, registrationVerificationText } from '../../mails/register';

describe('registrationVerificationHtml', () => {
  it('should include username, verification link, and Cylink logo', () => {
    const username = 'testuser';
    const token = 'abc123';
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const expectedLink = `${frontendUrl.replace(/\/?$/, '/')}register?verification_token=${token}`;
    const html = registrationVerificationHtml(username, token);
    expect(html).toContain(username);
    expect(html).toContain(expectedLink);
    expect(html).toMatch(/logo-cylink\.png/);
    expect(html).toContain('Verify your Cylink account');
    expect(html).toContain('Please verify your email address to activate your account.');
  });
});

describe('registrationVerificationText', () => {
  it('should include username and verification link', () => {
    const username = 'testuser';
    const token = 'abc123';
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const expectedLink = `${frontendUrl.replace(/\/?$/, '/')}register?verification_token=${token}`;
    const text = registrationVerificationText(username, token);
    expect(text).toContain(username);
    expect(text).toContain(expectedLink);
    expect(text).toContain('Please verify your email address by clicking the link below:');
  });
});
