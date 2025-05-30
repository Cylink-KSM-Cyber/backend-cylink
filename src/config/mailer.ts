/**
 * Mailer Configuration
 *
 * Configures nodemailer for sending emails via SMTP
 * @module config/mailer
 */

const nodemailer = require('nodemailer');

// Create SMTP transporter using provided credentials
const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || '2525'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || '',
  },
});

// Verify connection configuration
mailer.verify((error: any, _success: boolean) => {
  if (error) {
    console.error('SMTP connection error:', error);
  } else {
    console.log('SMTP server is ready to take our messages');
  }
});

module.exports = mailer;
