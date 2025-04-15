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
  sign: (payload: object) => signToken(payload, jwtConfig.access.secret, jwtConfig.access.ttl),
  verify: (token: string) => verifyToken(token, jwtConfig.access.secret),
  getExpiration: (): number => {
    // Parse the TTL to get the number of seconds/minutes/hours
    const ttl = jwtConfig.access.ttl;
    const value = parseInt(ttl);
    const unit = ttl.replace(/[0-9]/g, '');

    // Calculate expiration time based on unit
    let expiryMs = 0;
    switch (unit) {
      case 's':
        expiryMs = value * 1000;
        break;
      case 'm':
        expiryMs = value * 60 * 1000;
        break;
      case 'h':
        expiryMs = value * 60 * 60 * 1000;
        break;
      case 'd':
        expiryMs = value * 24 * 60 * 60 * 1000;
        break;
      default:
        expiryMs = 3600 * 1000; // Default to 1 hour if format not recognized
    }

    return Date.now() + expiryMs;
  },
};

/**
 * Refresh token.
 */
exports.refresh = {
  sign: (payload: object) => signToken(payload, jwtConfig.refresh.secret, jwtConfig.refresh.ttl),
  verify: (token: string) => verifyToken(token, jwtConfig.refresh.secret),
};

/**
 * Verification token.
 */
exports.verification = {
  sign: (payload: object) =>
    signToken(payload, jwtConfig.verification.secret, jwtConfig.verification.ttl),
  verify: (token: string) => verifyToken(token, jwtConfig.verification.secret),
};
