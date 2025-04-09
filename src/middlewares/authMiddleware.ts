import { Request, Response } from 'express';
const { sendResponse } = require('@/utils/response');
const { verify } = require('@/utils/jwt');

exports.accessToken = (req: Request, res: Response, next: any) => {
  const headers: any = req.headers
  const token = headers.authorization?.split(' ')[1];

  if (!token) {
    return sendResponse(res, 401, 'Unauthorized');
  }

  try {
    req.body = verify.accessToken(token);
    next();
  } catch (error) {
    return sendResponse(res, 401, 'Invalid or expired access token');
  }
};

exports.refreshToken = (req: Request, res: Response, next: any) => {
  const refreshToken = req.body.refresh_token;

  if (!refreshToken) {
    return sendResponse(res, 401, 'Refresh token is required!');
  }

  try {
    req.body = verify.refreshToken(refreshToken);
  } catch (error) {

  } finally {
    next();
  }
};

exports.verificationToken = (req: Request, res: Response, next: any) => {
  const { token: verificationToken } = req.body;

  if (!verificationToken) {
    return sendResponse(res, 401, 'Token is required!');
  }

  try {
    req.body = verify.verificationToken(verificationToken);
    next();
  } catch (error) {
    return sendResponse(res, 401, 'Invalid or expired verification token');
  }
};
