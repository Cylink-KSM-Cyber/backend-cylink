const mailer = require('../config/mailer');

/**
 * Sends user registration verification to email.
 * 
 * Verification token is used as temporary data between
 * authentication state during multi-factor-authentication.
 */
exports.sendMail = async (
  to: string,
  subject: string,
  text: string,
  html: string,
): Promise<void> => {
  await mailer.sendMail({
    from: process.env.MAILER_SENDER,
    to,
    subject,
    text,
    html,
  });
};
