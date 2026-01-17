/**
 * Winston Logger Service
 *
 * Provides standardized logging functionality for the application
 * using winston library. All log messages are sanitized to contain
 * only ASCII characters and truncated to a maximum of 255 characters.
 *
 * @module libs/winston/winston.service
 * @version 1.2.1
 * @since 2024-01-01
 * @updated 2025-12-13 - Moved from utils/logger.ts to libs/winston structure for better modularity
 * @updated 2026-01-17 - Added 255 ASCII character limit with sanitization
 * @updated 2026-01-17 - Refactored for improved readability and maintainability
 */

import * as winston from 'winston';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Logger configuration constants.
 * Centralized configuration for easy maintenance.
 */
const LoggerConfig = {
  /** Maximum allowed length for log messages */
  MAX_MESSAGE_LENGTH: 255,

  /** Suffix appended when message is truncated */
  TRUNCATION_SUFFIX: '...',

  /** Default log directory if not specified in environment */
  DEFAULT_LOG_DIR: 'logs',

  /** Default log level if not specified in environment */
  DEFAULT_LOG_LEVEL: 'info',

  /** Maximum size per log file in bytes (5MB) */
  MAX_FILE_SIZE: 5 * 1024 * 1024,

  /** Maximum number of log files to retain */
  MAX_FILES: 5,

  /** Timestamp format for log entries */
  TIMESTAMP_FORMAT: 'YYYY-MM-DD HH:mm:ss',
} as const;

/**
 * Regex pattern to match printable ASCII characters (codes 32-126).
 * - Code 32 is the space character
 * - Code 126 is the tilde (~) character
 * - Everything outside this range is considered non-printable or non-ASCII
 */
const ASCII_PRINTABLE_REGEX = /[^\x20-\x7E]/g;

/**
 * Type guard to check if a value is a valid string.
 *
 * @param value - Value to check
 * @returns True if value is a string, false otherwise
 */
function isValidString(value: unknown): value is string {
  return typeof value === 'string';
}

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
  if (!isValidString(str)) {
    return '';
  }
  return str.replace(ASCII_PRINTABLE_REGEX, '');
}

/**
 * Truncates a string to the specified maximum length.
 * If truncation occurs, appends "..." to indicate the message was cut.
 *
 * @param str - Input string to truncate
 * @param maxLength - Maximum allowed length (default: MAX_MESSAGE_LENGTH)
 * @returns String guaranteed to be at or below maxLength characters
 *
 * @example
 * truncateMessage("Short message", 255) // returns "Short message"
 * truncateMessage("A".repeat(300), 255) // returns "AAA...AAA..." (252 A's + "...")
 */
export function truncateMessage(
  str: string,
  maxLength: number = LoggerConfig.MAX_MESSAGE_LENGTH,
): string {
  if (!isValidString(str)) {
    return '';
  }

  const isWithinLimit = str.length <= maxLength;
  if (isWithinLimit) {
    return str;
  }

  const truncationSuffixLength = LoggerConfig.TRUNCATION_SUFFIX.length;
  const preservedLength = maxLength - truncationSuffixLength;

  return str.substring(0, preservedLength) + LoggerConfig.TRUNCATION_SUFFIX;
}

/**
 * Processes a log message by sanitizing to ASCII and truncating to max length.
 * This is the main entry point for message processing.
 *
 * Pipeline: Raw Message → ASCII Sanitization → Length Truncation → Final Message
 *
 * @param message - Raw log message that may contain any characters
 * @returns Processed message that is ASCII-only and max 255 characters
 *
 * @example
 * processLogMessage("Hello 🌍 World!") // returns "Hello  World!"
 * processLogMessage("A".repeat(300) + "🎉") // returns truncated ASCII string
 */
export function processLogMessage(message: string): string {
  const sanitizedMessage = sanitizeToAscii(message);
  const truncatedMessage = truncateMessage(sanitizedMessage);
  return truncatedMessage;
}

/**
 * Custom Winston format that sanitizes and truncates log messages.
 * Applied to all log levels (debug, info, warn, error).
 *
 * This format runs first in the format chain to ensure all messages
 * are properly sanitized before any other processing.
 */
const createSanitizeFormat = () =>
  winston.format(info => {
    if (isValidString(info.message)) {
      info.message = processLogMessage(info.message);
    }
    return info;
  });

/**
 * Checks if metadata args represent a character-by-character string split.
 * Winston sometimes splits strings into individual character properties.
 *
 * @param keys - Object keys from metadata
 * @param args - Metadata object
 * @returns True if args represent a split string
 */
function isStringCharacterSplit(keys: string[], args: Record<string, unknown>): boolean {
  return keys.every(
    key => /^\d+$/.test(key) && typeof args[key] === 'string' && (args[key] as string).length === 1,
  );
}

/**
 * Reconstructs a string from character-split metadata.
 *
 * @param keys - Object keys (numeric indices)
 * @param args - Metadata object with single characters as values
 * @returns Reconstructed original string
 */
function reconstructSplitString(keys: string[], args: Record<string, unknown>): string {
  const sortedKeys = [...keys].sort((a, b) => Number(a) - Number(b));
  return sortedKeys.map(key => args[key]).join('');
}

/**
 * Formats additional metadata for log output.
 *
 * @param args - Metadata object from log call
 * @returns Formatted metadata string
 */
function formatMetadata(args: Record<string, unknown>): string {
  const keys = Object.keys(args);

  if (keys.length === 0) {
    return '';
  }

  const metadataContent = isStringCharacterSplit(keys, args)
    ? reconstructSplitString(keys, args)
    : JSON.stringify(args);

  return ': ' + metadataContent;
}

/**
 * Creates the printf format for log output.
 * Format: [TIMESTAMP] LEVEL: message: metadata
 */
const createPrintfFormat = () =>
  winston.format.printf(({ timestamp, level, message, ...args }) => {
    const baseLog = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    const metadata = formatMetadata(args);
    return baseLog + metadata;
  });

/**
 * Array of Winston formats that define the log output structure.
 * Order matters: formats are applied sequentially.
 */
const createDefaultFormats = () => [
  winston.format.timestamp({ format: LoggerConfig.TIMESTAMP_FORMAT }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  createPrintfFormat(),
];

/**
 * Combined format that includes sanitization and all default formats.
 */
const createLogFormat = () =>
  winston.format.combine(createSanitizeFormat()(), ...createDefaultFormats());

/** Environment-based log directory */
const LOG_DIR = process.env.LOG_DIR || LoggerConfig.DEFAULT_LOG_DIR;

/** Environment-based log level */
const LOG_LEVEL = process.env.LOG_LEVEL || LoggerConfig.DEFAULT_LOG_LEVEL;

/**
 * Creates console transport for logging to stdout.
 */
const createConsoleTransport = () =>
  new winston.transports.Console({
    handleExceptions: true,
  });

/**
 * Creates file transport for error-level logs only.
 */
const createErrorFileTransport = () =>
  new winston.transports.File({
    filename: path.join(LOG_DIR, 'error.log'),
    level: 'error',
    handleExceptions: true,
    maxsize: LoggerConfig.MAX_FILE_SIZE,
    maxFiles: LoggerConfig.MAX_FILES,
  });

/**
 * Creates file transport for all log levels.
 */
const createCombinedFileTransport = () =>
  new winston.transports.File({
    filename: path.join(LOG_DIR, 'combined.log'),
    handleExceptions: true,
    maxsize: LoggerConfig.MAX_FILE_SIZE,
    maxFiles: LoggerConfig.MAX_FILES,
  });

/**
 * Ensures the log directory exists.
 * Creates it if it doesn't exist.
 */
function ensureLogDirectoryExists(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

// Create log directory before initializing logger
ensureLogDirectoryExists();

/**
 * Main Winston logger instance with all transports configured.
 */
const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: createLogFormat(),
  transports: [createConsoleTransport(), createErrorFileTransport(), createCombinedFileTransport()],
  exitOnError: false,
});

/**
 * Extended Logger interface with custom request logging method.
 */
interface ExtendedLogger extends winston.Logger {
  /**
   * Logs HTTP request information with standardized format.
   *
   * @param req - Express request object
   * @param res - Express response object
   * @param message - Additional log message
   */
  request?: (req: Express.Request, res: Express.Response, message: string) => void;
}

/**
 * Custom logger instance with extended functionality.
 */
const customLogger: ExtendedLogger = logger;

/**
 * HTTP request logging method.
 * Logs request details in a standardized format.
 *
 * Format: METHOD URL STATUS_CODE RESPONSE_TIME - IP - USER_AGENT - MESSAGE
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param message - Log message
 */
customLogger.request = (req: any, res: any, message: string): void => {
  const { method, url, ip, headers } = req;
  const userAgent = headers['user-agent'] || 'Unknown';
  const statusCode = res.statusCode;
  const responseTime = res.get?.('X-Response-Time') || '';

  const logMessage = [method, url, statusCode, responseTime, '-', ip, '-', userAgent, '-', message]
    .filter(Boolean)
    .join(' ');

  logger.info(logMessage);
};

export default customLogger;
