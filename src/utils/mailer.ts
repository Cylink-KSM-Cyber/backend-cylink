/**
 * Mailer Utility
 *
 * Provides email sending functionality
 * @module utils/mailer
 */

const mailer = require('../config/mailer');
import logger from './logger';

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
  try {
    const mailOptions = {
      from: process.env.MAILER_SENDER || 'noreply@cylink.app',
      to,
      subject,
      text,
      html,
    };

    await mailer.sendMail(mailOptions);
    logger.info(`Email sent successfully to: ${to}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to send email to ${to}: ${errorMessage}`);
    throw new Error(`Email sending failed: ${errorMessage}`);
  }
};
