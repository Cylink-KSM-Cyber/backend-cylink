module.exports = {
  /**
   * Used in authentication to access resources
   * within this REST API.
   */
  access: {
    ttl: '1h',
    secret: process.env.ACCESS_TOKEN_SECRET || 'access',
  },

  /**
   * Used to refresh access token after it expires.
   */
  refresh: {
    ttl: '7d',
    secret: process.env.REFRESH_TOKEN_SECRET || 'refresh',
  },

  /**
   * Used as temporary token for verification.
   */
  verification: {
    ttl: '30m',
    secret: process.env.VERIFICATION_TOKEN_SECRET || 'verification',
  },
};
