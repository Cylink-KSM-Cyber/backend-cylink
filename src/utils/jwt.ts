const jwt = require('jsonwebtoken');

const jwtConfig = require('@/config/jwt');

const signToken = (payload: object, secret: string, expiresIn: string): string => {
  return jwt.sign(payload, secret, { expiresIn });
};

const verifyToken = (token: string, secret: string): object | string => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Access token.
 */
exports.access = {
  sign: (payload: object) => signToken(
    payload, jwtConfig.access.secret, jwtConfig.access.ttl,
  ),
  verify: (token: string) => verifyToken(
    token, jwtConfig.access.secret,
  ),
  getExpiration: (): number => {
    return Date.now() - jwtConfig.access.ttl;
  },
};

/**
 * Refresh token.
 */
exports.refresh = {
  sign: (payload: object) => signToken(
    payload, jwtConfig.refresh.secret, jwtConfig.refresh.ttl,
  ),
  verify: (token: string) => verifyToken(
    token, jwtConfig.refresh.secret,
  ),
};

/**
 * Verification token.
 */
exports.verification = {
  sign: (payload: object) => signToken(
    payload, jwtConfig.verification.secret, jwtConfig.verification.ttl,
  ),
  verify: (token: string) => verifyToken(
    token, jwtConfig.verification.secret,
  ),
};
