/**
 * Logger Utility
 *
 * Provides logging functionality with environment-based control
 * @module utils/logger
 */

/**
 * Flag to enable/disable logging based on environment variable
 */
const logEnabled = (process.env.ENABLE_LOG || 'false') === 'true';

/**
 * Log function types matching console methods
 */
type LogLevel = 'log' | 'info' | 'error' | 'warn' | 'debug';

/**
 * Generic log function that delegates to the appropriate console method
 * @param {LogLevel} level - The logging level to use
 * @param {unknown[]} args - Arguments to pass to the logging function
 */
const log = (level: LogLevel, ...args: unknown[]): void => {
  if (logEnabled) {
    /* eslint-disable no-console */
    console[level](...args);
    /* eslint-enable no-console */
  }
};

/**
 * Log a message at the 'log' level
 * @param {unknown[]} args - Arguments to log
 */
const logMessage = (...args: unknown[]): void => log('log', ...args);

/**
 * Log a message at the 'info' level
 * @param {unknown[]} args - Arguments to log
 */
const infoMessage = (...args: unknown[]): void => log('info', ...args);

/**
 * Log a message at the 'error' level
 * @param {unknown[]} args - Arguments to log
 */
const errorMessage = (...args: unknown[]): void => log('error', ...args);

/**
 * Log a message at the 'warn' level
 * @param {unknown[]} args - Arguments to log
 */
const warnMessage = (...args: unknown[]): void => log('warn', ...args);

/**
 * Log a message at the 'debug' level
 * @param {unknown[]} args - Arguments to log
 */
const debugMessage = (...args: unknown[]): void => log('debug', ...args);

export = {
  log: logMessage,
  info: infoMessage,
  error: errorMessage,
  warn: warnMessage,
  debug: debugMessage,
};
