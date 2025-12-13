/**
 * Nodemailer Service
 *
 * Provides email sending functionality using nodemailer.
 *
 * @module libs/nodemailer/nodemailer.service
 * @version 1.1.0
 * @since 2024-01-01
 * @updated 2025-12-13 - Moved from utils/mailer.ts to libs/nodemailer structure for better modularity
 */

import logger from '../winston/winston.service';

const mailer = require('../../config/mailer');

/**
 * Sends an email using the configured mailer.
 *
 * Verification token is used as temporary data between
 * authentication state during multi-factor-authentication.
 *
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text email body
 * @param {string} html - HTML email body
 * @returns {Promise<void>}
 * @throws {Error} If email sending fails
 */
exports.sendMail = async (
  to: string,
  subject: string,
  text: string,
  html: string,
): Promise<void> => {
  try {
    const mailOptions = {
      from: process.env.MAILER_SENDER ?? 'noreply@cylink.app',
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
