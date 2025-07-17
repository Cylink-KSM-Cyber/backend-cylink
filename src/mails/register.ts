/**
 * Registration Verification Email Template
 *
 * Generates HTML and plain text email templates for user registration verification,
 * including Cylink branding, clear instructions, and a verification button/link.
 * Designed to be responsive, accessible, and compatible with most email clients.
 *
 * @module mails/register
 */

const CYLINK_LOGO_URL = 'https://i.postimg.cc/HxW3kpVm/logo-cylink.png';

function getVerificationUrl(token: string): string {
  const base = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  return `${base.replace(/\/?$/, '/')}register?verification_token=${token}`;
}

/**
 * Generates the HTML email template for registration verification
 * @param {string} username - User's name
 * @param {string} verificationToken - Verification token
 * @returns {string} HTML email template
 */
export function registrationVerificationHtml(username: string, verificationToken: string): string {
  const redirect = getVerificationUrl(verificationToken);
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Cylink Account</title>
    <style>
      body { background: #f9fafb; font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 0; }
      .container { max-width: 480px; margin: 40px auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); overflow: hidden; }
      .header { text-align: center; padding: 32px 24px 16px 24px; }
      .logo { width: 120px; margin-bottom: 16px; }
      .title { font-size: 22px; font-weight: 600; color: #111; margin-bottom: 8px; }
      .subtitle { font-size: 16px; color: #444; margin-bottom: 24px; }
      .button { display: inline-block; background: #000; color: #fff; text-decoration: none; font-weight: 500; padding: 14px 32px; border-radius: 6px; font-size: 16px; margin: 24px 0 8px 0; }
      .link { color: #000; word-break: break-all; font-size: 14px; }
      .footer { text-align: center; font-size: 13px; color: #888; padding: 24px 16px 16px 16px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <img src="${CYLINK_LOGO_URL}" alt="Cylink Logo" class="logo"/>
        <div class="title">Verify your Cylink account</div>
        <div class="subtitle">Hello, <b>${username}</b>!<br/>Thank you for registering. Please verify your email address to activate your account.</div>
        <a href="${redirect}" class="button">Verify Account</a>
        <div style="margin: 16px 0 0 0; font-size: 14px; color: #666;">If the button above doesn't work, copy and paste this link into your browser:</div>
        <div class="link">${redirect}</div>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} Cylink. All rights reserved.<br/>
        If you did not request this, please ignore this email or contact support.
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Generates the plain text fallback for registration verification
 * @param {string} username - User's name
 * @param {string} verificationToken - Verification token
 * @returns {string} Plain text email
 */
export function registrationVerificationText(username: string, verificationToken: string): string {
  const redirect = getVerificationUrl(verificationToken);
  return `Hello, ${username}!

Thank you for registering at Cylink.

Please verify your email address by clicking the link below:
${redirect}

If you did not request this, please ignore this email or contact support.

Cylink Team`;
}
