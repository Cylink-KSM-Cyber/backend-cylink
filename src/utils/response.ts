import { Response } from 'express';

exports.sendResponse = (
  res: Response,
  statusCode: number,
  message: string,
  data = null,
) => {
  const layout: any = {
    status: statusCode,
    message,
  };

  if (data) {
    layout.data = data;
  }

  return res.status(statusCode).json(layout);
}
