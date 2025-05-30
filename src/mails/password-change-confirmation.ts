/**
 * Password Change Confirmation Email Template
 *
 * Sends confirmation email after successful password reset
 * @module mails/password-change-confirmation
 */

/**
 * Formats date for email display
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
const formatDateForEmail = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return date.toLocaleDateString('en-US', options);
};

/**
 * Formats time for email display
 * @param {Date} date - Date to format
 * @returns {string} Formatted time string
 */
const formatTimeForEmail = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  };
  return date.toLocaleTimeString('en-US', options);
};

/**
 * Generates password change confirmation email HTML
 * @param {string} userEmail - User's email address
 * @param {string} _username - User's name (optional, unused for now)
 * @returns {string} HTML email template
 */
const passwordChangeConfirmationMail = (userEmail: string, _username?: string): string => {
  const now = new Date();
  const formattedDate = formatDateForEmail(now);
  const formattedTime = formatTimeForEmail(now);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Password Change Confirmation</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        /* Normalisasi dan Reset Dasar */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

        /* Warna Brand */
        :root {
            --primary-black: #000000;
            --secondary-white: #FFFFFF;
            --primary-text: #000000;
            --secondary-text: #6B7280;
            --success-accent: #10B981;
            --background-main: #F9FAFB;
            --background-card: #FFFFFF;
            --background-success-subtle: #F0FDF4;
            --interactive-primary-button: #000000;
            --interactive-button-text: #FFFFFF;
            --interactive-link-color: #000000;
            --border-color: #E5E7EB;
            --success-indicator-text-color: #059669;
            --success-indicator-border-color: #D1FAE5;
            --information-card-background: #F8FAFC;
        }

        /* Gaya Umum */
        .email-container {
            background-color: var(--background-main);
            padding: 40px 20px;
            width: 100%;
        }
        .email-body {
            max-width: 600px;
            margin: 0 auto;
            background-color: var(--background-card);
        }
        .header-section {
            background-color: var(--background-card);
            padding: 32px 40px 24px 40px;
            border-top-left-radius: 12px;
            border-top-right-radius: 12px;
            text-align: center;
        }
        .logo {
            width: 120px;
            margin-bottom: 16px;
        }
        .success-icon {
            width: 48px;
            height: 48px;
            margin-bottom: 8px;
        }
        .main-content {
            background-color: var(--background-card);
            padding: 0 40px 40px 40px;
            border-bottom-left-radius: 12px;
            border-bottom-right-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .h1-confirmation {
            font-size: 24px;
            font-weight: 600;
            line-height: 1.2;
            color: var(--primary-text);
            margin-top: 0;
            margin-bottom: 8px;
            text-align: center;
        }
        .success-indicator-text {
            font-size: 14px;
            font-weight: 500;
            color: var(--success-accent);
            text-align: center;
            margin-bottom: 24px;
        }
        .timestamp-text {
            font-size: 14px;
            font-weight: 400;
            line-height: 1.5;
            color: var(--secondary-text);
            text-align: center;
            margin-bottom: 4px;
        }
         .account-reference-text {
            font-size: 14px;
            font-weight: 400;
            line-height: 1.5;
            color: var(--secondary-text);
            text-align: center;
            margin-bottom: 24px;
        }

        .success-indicator-box {
            background-color: var(--background-success-subtle);
            border: 1px solid var(--success-indicator-border-color);
            border-radius: 8px;
            padding: 16px 20px;
            margin: 24px 0;
            color: var(--success-indicator-text-color);
            font-size: 14px;
            font-weight: 500;
            text-align: center;
        }
        .body-primary {
            font-size: 16px;
            font-weight: 400;
            line-height: 1.6;
            color: var(--primary-text);
            margin-top: 0;
            margin-bottom: 16px;
        }
        .body-secondary {
            font-size: 14px;
            font-weight: 400;
            line-height: 1.5;
            color: var(--secondary-text);
            margin-top: 0;
            margin-bottom: 16px;
        }
        .section-heading {
            font-size: 18px;
            font-weight: 600;
            color: var(--primary-text);
            margin-top: 32px;
            margin-bottom: 16px;
        }
        .list {
            padding-left: 20px;
            margin-top: 0;
            margin-bottom: 16px;
        }
        .list li {
            margin-bottom: 8px;
            font-size: 16px;
            line-height: 1.6;
            color: var(--primary-text);
        }
        .information-card {
            background-color: var(--information-card-background);
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid var(--primary-black);
        }
        .divider-line {
            height: 1px;
            background-color: var(--border-color);
            margin: 28px 0;
            border: none;
        }
        .footer-section {
            padding: 32px 20px;
            text-align: center;
            max-width: 520px;
            margin: 0 auto;
        }
        .footer-text {
            font-size: 12px;
            line-height: 1.5;
            color: var(--secondary-text);
            margin-bottom: 8px;
        }
        .footer-link {
            color: var(--secondary-text);
            text-decoration: underline;
            font-size: 12px;
        }
        .button {
            background-color: var(--interactive-primary-button);
            color: var(--interactive-button-text);
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 500;
            display: inline-block;
            margin-top: 16px;
        }

        /* Gaya Responsif */
        @media screen and (max-width: 480px) {
            .email-container { padding: 20px 10px !important; }
            .header-section { padding: 24px 16px 16px 16px !important; }
            .main-content { padding: 0 16px 24px 16px !important; }
            .logo { width: 100px !important; }
            .success-icon { width: 40px !important; height: 40px !important; }
            .h1-confirmation { font-size: 20px !important; }
            .success-indicator-text { font-size: 13px !important; margin-bottom: 20px !important; }
            .timestamp-text, .account-reference-text { font-size: 13px !important; }
            .account-reference-text { margin-bottom: 20px !important; }
            .section-heading { font-size: 17px !important; margin-top: 24px !important; }
            .body-primary, .list li { font-size: 15px !important; }
            .body-secondary { font-size: 13px !important; }
            .success-indicator-box { padding: 12px 16px !important; margin: 20px 0 !important; }
            .information-card { padding: 16px !important; margin: 16px 0 !important; }
            .divider-line { margin: 24px 0 !important; }
            .footer-section { padding: 24px 10px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F9FAFB;">
    <center class="email-container" style="width: 100%; background-color: #F9FAFB; padding: 40px 20px;">
        <!--[if (gte mso 9)|(IE)]>
        <table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
        <tr>
        <td align="center" valign="top" width="600">
        <![endif]-->
        <table border="0" cellpadding="0" cellspacing="0" class="email-body" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF;">
            <tr>
                <td class="header-section" style="background-color: #FFFFFF; padding: 32px 40px 24px 40px; border-top-left-radius: 12px; border-top-right-radius: 12px; text-align: center;">
                    <img src="https://i.postimg.cc/HxW3kpVm/logo-cylink.png" alt="CyLink Logo" class="logo" style="width: 120px; margin-bottom: 16px; border:0;">
                    <br>
                    <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0yNCA0OEMxMC43NDUyIDQ4IDAgMzcuMjU0OCAwIDI0QzAgMTAuNzQ1MiAxMC43NDUyIDAgMjQgMEMzNy4yNTQ4IDAgNDggMTAuNzQ1MiA0OCAyNEM0OCAzNy4yNTQ4IDM3LjI1NDggNDggMjQgNDhaTTIxLjY1NjkgMzIuMzQzMUwxNC41ODU4IDI1LjI3MjFMMTYuNzIzOSAyMy4xMTM3TDIxLjY1NjkgMjguMDI1MUwzMS4yNzYxIDE4LjQwMzlMMzMuNDM0MyAyMC41NjIyTDIxLjY1NjkgMzIuMzQzMVoiIGZpbGw9IiMxMEI5ODEiLz4KPC9zdmc+Cg==" alt="Password change successful" class="success-icon" style="width: 48px; height: 48px; margin-bottom: 8px; border:0;">
                </td>
            </tr>
            <tr>
                <td class="main-content" style="background-color: #FFFFFF; padding: 0 40px 40px 40px; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td style="padding-top: 24px;"> 
                                <h1 class="h1-confirmation" style="font-size: 24px; font-weight: 600; line-height: 1.2; color: #000000; margin-top: 0; margin-bottom: 8px; text-align: center;">Password changed successfully</h1>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <p class="timestamp-text" style="font-size: 14px; font-weight: 400; line-height: 1.5; color: #6B7280; text-align: center; margin-top:0; margin-bottom: 4px;">Your account password was successfully updated.</p>
                                <p class="timestamp-text" style="font-size: 14px; font-weight: 400; line-height: 1.5; color: #6B7280; text-align: center; margin-top:0; margin-bottom: 4px;">Changed on ${formattedDate} at ${formattedTime}</p>
                                <p class="account-reference-text" style="font-size: 14px; font-weight: 400; line-height: 1.5; color: #6B7280; text-align: center; margin-top:0; margin-bottom: 24px;">Account: ${userEmail}</p>
                            </td>
                        </tr>

                        <tr>
                            <td>
                                <h2 class="section-heading" style="font-size: 18px; font-weight: 600; color: #000000; margin-top: 0; margin-bottom: 16px;">What this means</h2>
                                <ul class="list" style="padding-left: 20px; margin-top: 0; margin-bottom: 16px; list-style-type: disc;">
                                    <li style="margin-bottom: 8px; font-size: 16px; line-height: 1.6; color: #000000;">You can now sign in using your new password.</li>
                                    <li style="margin-bottom: 8px; font-size: 16px; line-height: 1.6; color: #000000;">Your account remains secure and protected.</li>
                                    <li style="margin-bottom: 8px; font-size: 16px; line-height: 1.6; color: #000000;">All active sessions will remain logged in.</li>
                                </ul>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding-top: 8px;"> 
                                <div class="information-card" style="background-color: #F8FAFC; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #000000;">
                                    <h2 class="section-heading" style="font-size: 18px; font-weight: 600; color: #000000; margin-top: 0; margin-bottom: 16px;">Didn't make this change?</h2>
                                    <p class="body-primary" style="font-size: 16px; font-weight: 400; line-height: 1.6; color: #000000; margin-top: 0; margin-bottom: 16px;">If you did not authorize this password change:</p>
                                    <ol class="list" style="padding-left: 20px; margin-top: 0; margin-bottom: 16px;">
                                        <li style="margin-bottom: 8px; font-size: 16px; line-height: 1.6; color: #000000;">Contact our support team immediately.</li>
                                        <li style="margin-bottom: 8px; font-size: 16px; line-height: 1.6; color: #000000;">Review your account activity.</li>
                                        <li style="margin-bottom: 8px; font-size: 16px; line-height: 1.6; color: #000000;">Consider enabling additional security features.</li>
                                    </ol>
                                    <p class="body-secondary" style="font-size: 14px; font-weight: 400; line-height: 1.5; color: #6B7280; margin-top: 0; margin-bottom: 0;">
                                        Reach us at <a href="mailto:support@cylink.id" style="color: #000000; text-decoration: underline;">support@cylink.id</a> or through your account settings.
                                    </p>
                                </div>
                            </td>
                        </tr>

                    </table>
                </td>
            </tr>
            <tr>
                <td class="footer-section" style="padding: 32px 20px; text-align: center; max-width: 520px; margin: 0 auto;">
                     <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 auto; max-width: 520px;">
                        <tr>
                            <td style="text-align: center;">
                                <p class="footer-text" style="font-size: 12px; line-height: 1.5; color: #6B7280; margin-bottom: 8px; margin-top:0;">
                                    This notification was sent by CyLink for your account security.
                                </p>
                                <p class="footer-text" style="font-size: 12px; line-height: 1.5; color: #6B7280; margin-bottom: 8px; margin-top:0;">
                                    Questions? Contact <a href="mailto:support@cylink.id" class="footer-link" style="color: #6B7280; text-decoration: underline; font-size: 12px;">support@cylink.id</a>
                                </p>
                                <p class="footer-text" style="font-size: 12px; line-height: 1.5; color: #6B7280; margin-bottom: 0; margin-top:0;">
                                    <a href="#" class="footer-link" style="color: #6B7280; text-decoration: underline; font-size: 12px;">Privacy Policy</a> | <a href="#" class="footer-link" style="color: #6B7280; text-decoration: underline; font-size: 12px;">Terms of Service</a>
                                </p>
                                <p class="footer-text" style="font-size: 12px; line-height: 1.5; color: #6B7280; margin-bottom: 0; margin-top:8px;">
                                    © 2025 CyLink. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        <!--[if (gte mso 9)|(IE)]>
        </td>
        </tr>
        </table>
        <![endif]-->
    </center>
</body>
</html>`;
};

module.exports = passwordChangeConfirmationMail;
