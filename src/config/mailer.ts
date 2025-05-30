/**
 * Mailer Configuration
 *
 * Configures nodemailer for sending emails via SMTP
 * @module config/mailer
 */

import logger from '../utils/logger';

const nodemailer = require('nodemailer');

// Create SMTP transporter using provided credentials
const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT ?? '2525'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASSWORD ?? '',
  },
});

// Verify connection configuration
mailer.verify((error: Error | null, _success: boolean) => {
  if (error) {
    logger.error('SMTP connection error:', error);
  } else {
    logger.info('SMTP server is ready to take our messages');
  }
});

module.exports = mailer;
