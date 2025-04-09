const logEnabled = (process.env.ENABLE_LOG || 'false') === 'true';

const log = (level: keyof Console, ...args: any[]): void => {
  logEnabled && (console[level] as (...args: any[]) => void)(...args);
};

exports.log = (...args: any[]): void => log('log', ...args);
exports.info = (...args: any[]): void => log('info', ...args);
exports.error = (...args: any[]): void => log('error', ...args);
