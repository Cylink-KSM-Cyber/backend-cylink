const jwt = require('jsonwebtoken');

const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || 'access';
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || 'refresh';

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

exports.sign = {
  accessToken: (payload: object) => signToken(payload, accessTokenSecret, '1h'),
  refreshToken: (payload: object) => signToken(payload, refreshTokenSecret, '7d'),
};

exports.verify = {
  accessToken: (token: string) => verifyToken(token, accessTokenSecret),
  refreshToken: (token: string) => verifyToken(token, refreshTokenSecret),
};
