const logEnabled = (process.env.ENABLE_LOG || 'false') === 'true';

exports.log = (message: string): void => {
  logEnabled && console.log(message);
};

exports.info = (message: string): void => {
  logEnabled && console.info(message);
};

exports.error = (message: string): void => {
  logEnabled && console.error(message);
};
