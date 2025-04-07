const { sendResponse } = require('@/utils/response');
const { verifyToken } = require('@/utils/jwt');

exports.authentication = (req: Request, res: Response, next: any) => {
  const headers: any = req.headers
  const token = headers.authorization?.split(' ')[1];

  if (!token) {
    return sendResponse(res, 401, 'Unauthorized');
  }

  try {
    const decoded = verifyToken(token);
    // req.user = decoded;
    next();
  } catch (error) {
    return sendResponse(res, 401, 'Invalid or expired access token');
  }
};
