/**
 * Click Tracker Middleware
 *
 * Extracts and processes information about URL clicks for analytics
 * @module middlewares/clickTracker
 */

/**
 * Detects browser information from user agent string
 *
 * @param {string} userAgent - The user agent string
 * @returns {string} Browser name
 */
const detectBrowser = (userAgent: string): string => {
  if (!userAgent) return "unknown";

  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("SamsungBrowser")) return "Samsung Internet";
  if (userAgent.includes("Opera") || userAgent.includes("OPR")) return "Opera";
  if (userAgent.includes("Edg")) return "Edge";
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Safari")) return "Safari";
  if (userAgent.includes("MSIE") || userAgent.includes("Trident/"))
    return "Internet Explorer";

  return "Others";
};

/**
 * Detects device type from user agent string
 *
 * @param {string} userAgent - The user agent string
 * @returns {string} Device type (mobile, tablet, desktop)
 */
const detectDeviceType = (userAgent: string): string => {
  if (!userAgent) return "unknown";

  // Check for mobile devices
  if (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      userAgent
    )
  ) {
    // Check for tablets specifically
    if (/iPad|Android(?!.*Mobile)/i.test(userAgent)) {
      return "tablet";
    }
    return "mobile";
  }

  return "desktop";
};

/**
 * Middleware to extract information about the visitor for click tracking
 *
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
module.exports = (req: any, res: any, next: any) => {
  // Extract and parse visitor information
  const clickInfo = {
    ipAddress: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
    userAgent: req.headers["user-agent"],
    referrer: req.headers.referer || req.headers.referrer || null,
    // Note: country would typically be determined by a geolocation service
    country: null,
    deviceType: detectDeviceType(req.headers["user-agent"]),
    browser: detectBrowser(req.headers["user-agent"]),
  };

  // Attach to request object for use in route handlers
  req.clickInfo = clickInfo;

  next();
};
