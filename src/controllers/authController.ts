import { Request, Response } from 'express';
const authService = require('@/services/authService');
const { sendResponse } = require('@/utils/response');
const logger = require('@/utils/logger');

exports.register = async (req: Request, res: Response) => {
  try {
    const userData: any = req.body;
    const email = userData?.email;

    if (await authService.findUser(email)) {
      logger.error(`Auth error: Failed to register: Email '${email}' already taken!`);
      return sendResponse(res, 400, 'Email already taken!');
    }

    await authService.register(userData);
    
    return sendResponse(res, 200, 'Successfully send OTP to register new user!');
  } catch (error: any) {
    logger.error(`Auth error: Failed to register: ${error.message}`);
    return sendResponse(res, 500, error.message);
  }
};

exports.verifyRegister = async (req: Request, res: Response) => {
  try {
    const { token: verificationToken } = req.query;
    if (!verificationToken) {
      return sendResponse(res, 400, 'Token is required!');
    }

    const verified = await authService.verifyRegister(verificationToken);

    if (!verified) {
      return sendResponse(res, 400, 'Failed to verify user registration!');
    }
    
    return sendResponse(res, 200, 'Successfully registered new user!', {});
  } catch (error: any) {
    logger.error(`Auth error: Failed to verify user registration: ${error.message}`);
    return sendResponse(res, 500, error.message);
  }
};

exports.login = async (req: Request, res: Response) => {
  try {
    const user = await authService.login(req.body);

    if (!user) {
      logger.error('Auth error: Failed to login: User not found');
      return sendResponse(res, 400, 'Invalid credentials');
    }
    
    return sendResponse(res, 200, 'Successfully logged in!', {
      user,
      authorization: {
        type: 'bearer',
        token: user.token,
      },
    });
  } catch (error: any) {
    logger.error(`Auth error: Failed to login: ${error.message}`);
    return sendResponse(res, 500, error.message);
  }
};

exports.refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken }: any = req.body;

    const token = await authService.refreshToken(refreshToken);

    if (!token) {

    }
    
    return sendResponse(res, 200, 'Successfully refresh token!', {});
  } catch (error: any) {
    logger.error(`Auth error: Failed to refresh token: ${error.message}`);
    return sendResponse(res, 500, error.message);
  }
};

exports.verifyResetPassword = async (req: Request, res: Response) => {
  try {
    const { token: verificationToken } = req.query;
    if (!verificationToken) {
      return sendResponse(res, 400, 'Token is required!');
    }

    const verified = await authService.verifyResetPassword(req.body);

    if (!verified) {
      return sendResponse(res, 400, 'Failed to verify password reset!');
    }
    
    return sendResponse(res, 200, 'Successfully verify password reset!', {});
  } catch (error: any) {
    logger.error(`Auth error: Failed to verify password reset: ${error.message}`);
    return sendResponse(res, 500, error.message);
  }
};

exports.resetPassword = async (req: Request, res: Response) => {
  try {
    const user = await authService.resetPassword(req.body);
    if (!user) {
      return sendResponse(res, 500, '');
    }
    
    return sendResponse(res, 200, 'Successfully reset password!', {});
  } catch (error: any) {
    logger.error(`Auth error: Failed to reset password: ${error.message}`);
    return sendResponse(res, 500, error.message);
  }
};
