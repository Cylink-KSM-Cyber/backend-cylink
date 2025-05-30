/**
 * Forgot Password Email Template
 *
 * Email template for password reset request
 * @module mails/forgot-password
 */

/**
 * Generates HTML email template for password reset
 *
 * @param {string} resetToken - Password reset token
 * @param {string} username - User's username (optional)
 * @returns {string} HTML email template
 */
export default (resetToken: string, username?: string): string => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${frontendUrl}reset-password?token=${resetToken}`;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your CyLink Password</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          color: #2c3e50;
          margin-bottom: 30px;
        }
        .content {
          margin-bottom: 30px;
        }
        .reset-button {
          display: inline-block;
          background-color: #3498db;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin: 20px 0;
        }
        .reset-button:hover {
          background-color: #2980b9;
        }
        .security-notice {
          background-color: #ecf0f1;
          border-left: 4px solid #f39c12;
          padding: 15px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          color: #7f8c8d;
          font-size: 14px;
          margin-top: 30px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Reset Your CyLink Password</h1>
        </div>
        
        <div class="content">
          ${username ? `<p>Hello ${username},</p>` : '<p>Hello,</p>'}
          
          <p>We received a request to reset your password for your CyLink account. If you made this request, click the button below to reset your password:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="reset-button">Reset My Password</a>
          </div>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 3px;">
            <a href="${resetUrl}">${resetUrl}</a>
          </p>
          
          <div class="security-notice">
            <h3>🔒 Security Notice</h3>
            <ul>
              <li>This link will expire in <strong>1 hour</strong> for security reasons</li>
              <li>If you didn't request this password reset, please ignore this email</li>
              <li>Your password will not be changed unless you click the link above</li>
              <li>For security, this link can only be used once</li>
            </ul>
          </div>
          
          <p>If you continue to have problems, please contact our support team.</p>
        </div>
        
        <div class="footer">
          <p>This email was sent from CyLink. If you have any questions, please contact our support team.</p>
          <p><strong>© ${new Date().getFullYear()} CyLink. All rights reserved.</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;
};
