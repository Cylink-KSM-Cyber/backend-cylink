import { Request, Response, NextFunction } from "express";

const urlService = require("../services/urlService");
const logger = require("../utils/logger");

/**
 * Redirect Middleware
 *
 * Handles redirection for shortened URLs and tracks click analytics
 * @module middlewares/redirectMiddleware
 */

/**
 * Extending Express Request interface to include clickInfo
 */
interface ExtendedRequest extends Request {
  clickInfo?: {
    ipAddress: string | string[] | undefined;
    userAgent: string | undefined;
    referrer: string | null;
    country: string | null;
    deviceType: string;
    browser: string;
  };
}

/**
 * Middleware to handle URL redirection and tracking
 *
 * @param {ExtendedRequest} req - Express request object with click info
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>}
 */
module.exports = async (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract the short code from the URL path
    const shortCode = req.path.substring(1); // Remove leading slash

    // Skip if not a potential short code (e.g., for static files or API routes)
    if (!shortCode || shortCode.includes("/") || shortCode.startsWith("api")) {
      return next();
    }

    // Extract information about the visitor for tracking
    const clickInfo = req.clickInfo || {
      ipAddress: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
      userAgent: req.headers["user-agent"],
      referrer: req.headers.referer || req.headers.referrer || null,
      country: null, // Would be set by a geolocation service in production
      deviceType: "unknown",
      browser: "unknown",
    };

    // Record the click and get the original URL
    const originalUrl = await urlService.recordClickAndGetOriginalUrl(
      shortCode,
      clickInfo
    );

    if (originalUrl) {
      // Get the URL details to determine the redirect type
      const url = await urlService.getUrlByShortCode(shortCode);
      const redirectType = url?.redirect_type === "301" ? 301 : 302;

      logger.info(
        `Redirecting ${shortCode} to ${originalUrl} (${redirectType})`
      );

      // Redirect to the original URL
      return res.redirect(redirectType, originalUrl);
    }

    // Return a proper JSON 404 response when URL is not found or expired
    logger.info(`URL not found for short code: ${shortCode}`);
    return res.status(404).json({
      status: 404,
      message: "Short URL not found or has expired",
    });
  } catch (error) {
    logger.error("Redirect error:", error);

    // Return a proper JSON 500 response for errors
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
};
