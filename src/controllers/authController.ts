import { Request, Response } from 'express';
const authService = require('@/services/authService');
const { sendResponse } = require('@/utils/response');
const logger = require('@/utils/logger');

const emailVerificationEnabled = process.env.ENABLE_EMAIL_VERIFICATION === 'true';

/**
 * Store user data and send registration OTP.
 */
exports.register = async (req: Request, res: Response) => {
  const userData: any = req.body;
  const email = userData.email;

  try {
    const data = await authService.findUser(email);
    if (data.length > 0) {
      logger.error(`Auth error: Failed to register: Email '${email}' already taken!`);
      return sendResponse(res, 400, 'Email already taken!');
    }

    const user = await authService.createUser(userData);
    logger.info(`Successfully stored '${email}' user data`);

    // Define action for web verificator
    user.action = 'user-registration';

    // Differentiates between email and direct verification
    if (emailVerificationEnabled) {
      await authService.sendRegistration(user);
      logger.info(`Successfully send user registration verification to '${email}'`);

      return sendResponse(res, 200, 'Successfully send user register verification!');
    } else {
      logger.info(`Successfully send direct verification for '${email}'`);
      return sendResponse(
        res,
        200,
        'Successfully send user register verification!',
        { token: user.verification_token },
      );
    }

  } catch (error: any) {
    logger.error('Auth error: Failed to register:', error);
    return sendResponse(res, 500, 'Internal server error');
  }
};

/**
 * Activates user data.
 */
exports.verifyRegister = async (req: Request, res: Response) => {
  try {
    const userData = req.body;
    
    const user = await authService.verifyRegister(userData);
    if (!user) {
      return sendResponse(res, 400, 'User already verified!');
    }

    logger.info(`Successfully verify registration for '${userData.email}'`);
    return sendResponse(res, 200, 'Successfully registered new user!', user);
  } catch (error: any) {
    logger.error('Auth error: Failed to verify user registration:', error);
    return sendResponse(res, 500, 'Internal server error');
  }
};

/**
 * Authenticate to the app.
 */
exports.login = async (req: Request, res: Response) => {
  try {
    const user = await authService.authenticate(req.body);

    if (!user) {
      logger.error('Auth error: Failed to login: User not found');
      return sendResponse(res, 400, 'Invalid credentials');
    }

    if (!user.email_verified_at) {
      logger.error('Auth error: Failed to login: User not activeted');
      return sendResponse(res, 400, 'User is not activated!');
    }

    const userData = authService.login(user);
    logger.info(`Successfully logged in for ${user.email}`);
    
    return sendResponse(res, 200, 'Successfully logged in!', userData);
  } catch (error: any) {
    logger.error('Auth error: Failed to login:', error);
    return sendResponse(res, 500, 'Internal server error');
  }
};

/**
 * Refresh access token after it is expired.
 */
exports.refresh = async (req: Request, res: Response) => {
  try {
    return sendResponse(res, 200, 'Successfully refresh token!', {});
  } catch (error: any) {
    logger.error('Auth error: Failed to refresh token:', error);
    return sendResponse(res, 500, 'Internal server error');
  }
};

/**
 * Send password reset verification.
 */
exports.sendPasswordResetVerification = async (req: Request, res: Response) => {
  try {
    const verified = await authService.sendPasswordResetVerification(req.body);

    if (!verified) {
      return sendResponse(res, 400, 'Failed to verify password reset!');
    }
    
    return sendResponse(res, 200, 'Successfully verify password reset!', {});
  } catch (error: any) {
    logger.error('Auth error: Failed to verify password reset:', error);
    return sendResponse(res, 500, 'Internal server error');
  }
};

/**
 * Resets user password.
 */
exports.resetPassword = async (req: Request, res: Response) => {
  try {
    // const { token: verificationToken } = req.query;
    // if (!verificationToken) {
    //   return sendResponse(res, 400, 'Token is required!');
    // }

    // const user = await authService.verifyVerificationToken(verificationToken);
    // if (!user.email) {
    //   return sendResponse(res, 400, 'Invalid token');
    // }
    // req.body.email = user.email;

    const data = await authService.resetPassword(req.body);
    if (!data) {
      return sendResponse(res, 500, '');
    }
    
    return sendResponse(res, 200, 'Successfully reset password!', {});
  } catch (error: any) {
    logger.error('Auth error: Failed to reset password:', error);
    return sendResponse(res, 500, 'Internal server error');
  }
};

/**
 * Resend verification.
 */
exports.resendVerification = async (req: Request, res: Response) => {
  const email = req.body.email;
  
  try {
    // sends users.verification_token to user's mailbox
    const data = await authService.findUser(email);
    if (data.length === 0) {
      logger.error(`Auth error: Failed to resend email verification: Email '${email}' does not exist!`);
      return sendResponse(res, 400, 'User not found!');
    }

    // checks attempt

    // sned
    await authService.resendVerification(data);
    logger.info(`Successfully resend OTP to '${email}'`);
  } catch (error: any) {
    logger.error('Auth error: Failed to resend email verification:', error);
    return sendResponse(res, 500, 'Internal server error');
  }
};
