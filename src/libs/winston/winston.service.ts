/**
 * Winston Logger Service
 *
 * Provides standardized logging functionality for the application
 * using winston library. All log messages are sanitized to contain
 * only ASCII characters and truncated to a maximum of 255 characters.
 *
 * @module libs/winston/winston.service
 * @version 1.2.0
 * @since 2024-01-01
 * @updated 2025-12-13 - Moved from utils/logger.ts to libs/winston structure for better modularity
 * @updated 2026-01-17 - Added 255 ASCII character limit with sanitization
 */

// Winston logger requires types to be installed
// Run: npm install --save-dev @types/winston
import * as winston from 'winston';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// Constants
// ============================================

/**
 * Maximum allowed length for log messages
 */
const MAX_LOG_MESSAGE_LENGTH = 255;

// ============================================
// Utility Functions
// ============================================

/**
 * Removes non-ASCII characters from a string.
 * Only allows printable ASCII characters (codes 32-126: space to tilde).
 *
 * @param str - Input string that may contain unicode, emoji, or other non-ASCII characters
 * @returns String containing only printable ASCII characters
 *
 * @example
 * sanitizeToAscii("Hello 🌍 World!") // returns "Hello  World!"
 * sanitizeToAscii("日本語 Test") // returns " Test"
 */
export function sanitizeToAscii(str: string): string {
  if (typeof str !== 'string') {
    return '';
  }
  // Regex matches printable ASCII characters (space to tilde)
  return str.replace(/[^\x20-\x7E]/g, '');
}

/**
 * Truncates a string to the specified maximum length.
 * If truncation occurs, appends "..." to indicate the message was cut.
 *
 * @param str - Input string to truncate
 * @param maxLength - Maximum allowed length (default: MAX_LOG_MESSAGE_LENGTH)
 * @returns String guaranteed to be at or below maxLength characters
 *
 * @example
 * truncateMessage("Short message", 255) // returns "Short message"
 * truncateMessage("A".repeat(300), 255) // returns "AAA...AAA..." (252 A's + "...")
 */
export function truncateMessage(str: string, maxLength: number = MAX_LOG_MESSAGE_LENGTH): string {
  if (typeof str !== 'string') {
    return '';
  }
  if (str.length <= maxLength) {
    return str;
  }
  // Leave room for "..." suffix
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Processes a log message by sanitizing to ASCII and truncating to max length.
 * This is the main entry point for message processing.
 *
 * @param message - Raw log message that may contain any characters
 * @returns Processed message that is ASCII-only and max 255 characters
 *
 * @example
 * processLogMessage("Hello 🌍 World!") // returns "Hello  World!"
 * processLogMessage("A".repeat(300) + "🎉") // returns truncated ASCII string
 */
export function processLogMessage(message: string): string {
  const sanitized = sanitizeToAscii(message);
  return truncateMessage(sanitized);
}

/**
 * Custom Winston format that sanitizes and truncates log messages.
 * Applied to all log levels (debug, info, warn, error).
 */
const sanitizeFormat = winston.format(info => {
  if (typeof info.message === 'string') {
    info.message = processLogMessage(info.message);
  }
  return info;
});

// ============================================
// Log Format Configuration
// ============================================

// Define log format
const defaultFormat = [
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ timestamp, level, message, ...args }: any) => {
    let log = `[${timestamp}] ${level.toUpperCase()}: ${message}`;

    const keys = Object.keys(args);
    if (keys.length > 0) {
      log += ': ';

      if (
        // if stack is type of object-string
        keys.every(k => /^\d+$/.test(k) && typeof args[k] === 'string' && args[k].length === 1)
      ) {
        const sortedKeys = [...keys].sort((a, b) => Number(a) - Number(b));
        const reconstructed = sortedKeys.map(key => args[key]).join('');
        log += reconstructed;
      } else {
        log += JSON.stringify(args);
      }
    }

    return log;
  }),
];
const logFormat = winston.format.combine(sanitizeFormat(), ...defaultFormat);

// Get the log directory from environment or use default
const LOG_DIR = process.env.LOG_DIR || 'logs';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Create the logger with console and file transports
const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: logFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      // format: winston.format.combine(
      // ...defaultFormat,
      // winston.format.colorize(),
      // winston.format.simple(),
      // ),
      handleExceptions: true,
    }),
    // File transport for errors
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      handleExceptions: true,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      handleExceptions: true,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  exitOnError: false, // Don't exit on handled exceptions
});

// Create log directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR);
}

// Add request logging method for API requests
interface Logger extends winston.Logger {
  request?: (req: any, res: any, message: string) => void;
}

const customLogger: Logger = logger;

/**
 * Logs HTTP request information.
 *
 * @param {any} req - Express request object
 * @param {any} res - Express response object
 * @param {string} message - Log message
 */
customLogger.request = (req, res, message) => {
  const { method, url, ip, headers } = req;
  const userAgent = headers['user-agent'];
  const statusCode = res.statusCode;
  const responseTime = res.get('X-Response-Time') || '';

  logger.info(`${method} ${url} ${statusCode} ${responseTime} - ${ip} - ${userAgent} - ${message}`);
};

export default customLogger;
