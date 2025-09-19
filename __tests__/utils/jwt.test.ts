/**
 * Unit tests for utils/jwt.ts
 * @group utils
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

async function importJwt() {
  vi.resetModules();
  const mod = await import('../../dist/utils/jwt.js');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (mod as any).default ?? (mod as any);
}

describe('utils/jwt', () => {
  beforeEach(() => {
    process.env.ACCESS_TOKEN_SECRET = 'access-secret';
    process.env.REFRESH_TOKEN_SECRET = 'refresh-secret';
    process.env.VERIFICATION_TOKEN_SECRET = 'verification-secret';
    vi.useRealTimers();
  });

  it('access.sign and access.verify should roundtrip payload', async () => {
    const jwtUtils: any = await importJwt();
    const token = jwtUtils.access.sign({ userId: 123, role: 'user' });
    expect(typeof token).toBe('string');
    const payload = jwtUtils.access.verify(token) as any;
    expect(payload.userId).toBe(123);
    expect(payload.role).toBe('user');
  });

  it('refresh.sign and refresh.verify should roundtrip payload', async () => {
    const jwtUtils: any = await importJwt();
    const token = jwtUtils.refresh.sign({ sid: 'abc' });
    const payload = jwtUtils.refresh.verify(token) as any;
    expect(payload.sid).toBe('abc');
  });

  it('verification.sign and verification.verify should roundtrip payload', async () => {
    const jwtUtils: any = await importJwt();
    const token = jwtUtils.verification.sign({ email: 'u@example.com' });
    const payload = jwtUtils.verification.verify(token) as any;
    expect(payload.email).toBe('u@example.com');
  });

  it('verify should throw with invalid token or wrong secret', async () => {
    const jwtUtils: any = await importJwt();
    const accessToken = jwtUtils.access.sign({ a: 1 });
    // Trying to verify an access token with the refresh secret should fail
    expect(() => jwtUtils.refresh.verify(accessToken)).toThrowError('Invalid or expired token');
    // Invalid token string
    expect(() => jwtUtils.access.verify('invalid.token.string')).toThrowError(
      'Invalid or expired token',
    );
  });

  it('access.getExpiration should compute from TTL and current time', async () => {
    const fixedDate = new Date('2025-01-01T00:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(fixedDate);

    const jwtUtils: any = await importJwt();
    const expiration = jwtUtils.access.getExpiration();
    // access TTL is 1h per config file
    expect(expiration).toBe(new Date(fixedDate.getTime() + 1 * 60 * 60 * 1000).getTime());
  });
});
