/**
 * Logger Utility
 *
 * Provides standardized logging functionality for the application
 * @module utils/logger
 */

// Winston logger requires types to be installed
// Run: npm install --save-dev @types/winston
import * as winston from 'winston';
import * as fs from 'fs';
import * as path from 'path';

// Define log format
const defaultFormat = [
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ timestamp, level, message, ...args }: any) => {
    let log = `[${timestamp}] ${level.toUpperCase()}: ${message}`;

    if (args) {
      log += ': ';

      const keys = Object.keys(args);
      if (
        // if stack is type of object-string
        keys.length > 0
        && keys.every(k => /^\d+$/.test(k)
        && typeof args[k] === 'string'
        && args[k].length === 1)
      ) {
        const reconstructed = Object.keys(args)
          .sort((a, b) => Number(a) - Number(b))
          .map(key => args[key])
          .join('');
        log += reconstructed;
      } else {
        log += JSON.stringify(args);
      }
    }

    return log;
  }),
];
const logFormat = winston.format.combine(...defaultFormat);

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

// Add request logging method
customLogger.request = (req, res, message) => {
  const { method, url, ip, headers } = req;
  const userAgent = headers['user-agent'];
  const statusCode = res.statusCode;
  const responseTime = res.get('X-Response-Time') || '';

  logger.info(`${method} ${url} ${statusCode} ${responseTime} - ${ip} - ${userAgent} - ${message}`);
};

export default customLogger;
