/**
 * Forgot Password Email Template
 *
 * Professional email template for password reset request with CyLink branding
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
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  const resetUrl = `${frontendUrl}reset-password?token=${resetToken}`;
  const userDisplayName = username ?? 'there';

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>Reset your CyLink Password</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style type="text/css">
        /* Basic Resets */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #F9FAFB; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; }

        /* Main Styles based on Brand Guidelines */
        .email-wrapper {
            background-color: #F9FAFB;
            width: 100%;
        }

        .email-content-container {
            padding: 40px 20px;
        }

        .email-card {
            background-color: #FFFFFF;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            max-width: 600px;
            margin: 0 auto;
            overflow: hidden;
        }

        .header-padding {
            padding: 40px 40px 32px 40px;
            text-align: center;
        }
        
        .logo-container {
            margin-bottom: 24px;
            text-align: center;
        }
        
        .logo-image {
            max-width: 120px;
            height: auto;
            display: block;
            margin: 0 auto;
        }

        .body-padding {
            padding: 0 40px 40px 40px;
            text-align: center;
        }

        .content-inner-max-width {
            max-width: 480px;
            margin: 0 auto;
            width: 100%;
        }

        .main-heading {
            font-family: 'Inter', sans-serif;
            font-size: 24px;
            font-weight: 600;
            color: #000000;
            line-height: 1.2;
            margin-top: 0;
            margin-bottom: 16px;
            letter-spacing: -0.02em;
        }

        .subheading {
            font-family: 'Inter', sans-serif;
            font-size: 16px;
            font-weight: 400;
            color: #6B7280;
            line-height: 1.5;
            margin-top: 0;
            margin-bottom: 32px;
        }
        
        .body-text {
            font-family: 'Inter', sans-serif;
            font-size: 16px;
            font-weight: 400;
            color: #000000;
            line-height: 1.6;
            margin-top: 0;
            margin-bottom: 24px;
        }

        .pre-button-text {
            font-family: 'Inter', sans-serif;
            font-size: 16px;
            color: #000000;
            line-height: 1.6;
            margin-top: 0;
            margin-bottom: 8px;
        }

        .cta-button {
            font-family: 'Inter', sans-serif;
            background-color: #000000;
            color: #FFFFFF !important;
            font-size: 16px;
            font-weight: 500;
            text-decoration: none !important;
            padding: 16px 32px;
            border-radius: 8px;
            display: inline-block;
            min-height: 20px;
            line-height: 20px;
            mso-padding-alt: 0;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            transition: all 0.2s ease;
        }
        .cta-button:hover {
            background-color: #1F2937 !important;
        }
        .button-container {
             margin: 24px auto;
        }

        .post-button-text {
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            color: #6B7280;
            line-height: 1.5;
            margin-top: 16px;
            margin-bottom: 0;
        }

        .divider {
            border: 0;
            border-top: 1px solid #E5E7EB;
            margin: 32px 0;
            width: 100%;
        }

        .security-heading {
            font-family: 'Inter', sans-serif;
            font-size: 18px;
            font-weight: 500;
            color: #000000;
            line-height: 1.4;
            margin-top: 0;
            margin-bottom: 16px;
        }

        .security-list {
            font-family: 'Inter', sans-serif;
            list-style-type: none;
            padding-left: 0;
            margin-top: 0;
            margin-bottom: 0;
            text-align: left;
        }
        .security-list li {
            font-size: 14px;
            font-weight: 400;
            color: #6B7280;
            line-height: 1.5;
            margin-bottom: 8px;
            padding-left: 28px;
            position: relative;
        }
        .security-list li .icon {
            font-size: 16px;
            color: #6B7280;
            position: absolute;
            left: 0;
            top: 2px;
        }

        .fallback-link-text {
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            color: #6B7280;
            line-height: 1.5;
            margin-top: 24px;
            margin-bottom: 8px;
        }
        .fallback-link-text a {
            color: #000000 !important;
            text-decoration: underline !important;
        }

        .footer-container {
            padding: 32px 20px;
            text-align: center;
            max-width: 520px;
            margin: 0 auto;
        }
        .footer-text {
            font-family: 'Inter', sans-serif;
            font-size: 12px;
            font-weight: 400;
            color: #9CA3AF;
            line-height: 1.4;
            margin-bottom: 8px;
        }
        .footer-text a {
            color: #9CA3AF !important;
            text-decoration: underline !important;
        }

        /* Mobile Responsive Styles */
        @media screen and (max-width: 600px) {
            .email-content-container {
                padding: 16px !important;
            }
            .email-card {
                width: 100% !important;
                box-shadow: none !important;
            }
            .header-padding {
                padding: 24px 24px 20px 24px !important;
            }
            .body-padding {
                padding: 0 24px 32px 24px !important;
            }
            .main-heading {
                font-size: 22px !important;
            }
            .subheading, .body-text {
                font-size: 16px !important;
            }
            .security-list li, .fallback-link-text, .post-button-text {
                font-size: 14px !important;
            }
            .cta-button {
                width: 100% !important;
                padding: 16px 24px !important;
                box-sizing: border-box;
            }
            .content-inner-max-width {
                max-width: none !important;
            }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F9FAFB; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-wrapper" style="background-color: #F9FAFB;">
        <tr>
            <td align="center" class="email-content-container" style="padding: 40px 20px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="email-card" style="background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); max-width: 600px; margin: 0 auto; overflow: hidden;">
                    <tr>
                        <td align="center" class="header-padding" style="padding: 40px 40px 32px 40px; text-align: center; border-top-left-radius: 12px; border-top-right-radius: 12px;">
                            <div class="logo-container" style="margin-bottom: 24px; text-align: center;">
                                <img src="https://i.postimg.cc/HxW3kpVm/logo-cylink.png" alt="CyLink Logo" class="logo-image" style="max-width: 120px; height: auto; display: block; margin: 0 auto;" />
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" class="body-padding" style="padding: 0 40px 40px 40px; text-align: center; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px;">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="content-inner-max-width" style="max-width: 480px; margin: 0 auto;">
                                <tr>
                                    <td align="center" style="text-align: center;">
                                        <h1 class="main-heading" style="font-family: 'Inter', sans-serif; font-size: 24px; font-weight: 600; color: #000000; line-height: 1.2; margin-top: 0; margin-bottom: 16px; letter-spacing: -0.02em;">
                                            Reset your password
                                        </h1>
                                        <p class="subheading" style="font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 400; color: #6B7280; line-height: 1.5; margin-top: 0; margin-bottom: 32px;">
                                            Hi ${userDisplayName},
                                            <br /><br />
                                            We received a request to reset the password for your CyLink account. If you made this request, click the button below to create a new password.
                                        </p>
                                        <p class="pre-button-text" style="font-family: 'Inter', sans-serif; font-size: 16px; color: #000000; line-height: 1.6; margin-top: 0; margin-bottom: 8px;">
                                            Click here to reset your password:
                                        </p>
                                        <div class="button-container" style="margin: 24px auto;">
                                            <a href="${resetUrl}" target="_blank" class="cta-button" style="font-family: 'Inter', sans-serif; background-color: #000000; color: #FFFFFF !important; font-size: 16px; font-weight: 500; text-decoration: none !important; padding: 16px 32px; border-radius: 8px; display: inline-block; min-height: 20px; line-height: 20px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: all 0.2s ease;">
                                                Reset Password
                                            </a>
                                        </div>

                                        <p class="post-button-text" style="font-family: 'Inter', sans-serif; font-size: 14px; color: #6B7280; line-height: 1.5; margin-top: 16px; margin-bottom: 0;">
                                            This link will expire in 10 minutes for your security.
                                        </p>

                                        <hr class="divider" style="border: 0; border-top: 1px solid #E5E7EB; margin: 32px 0; width: 100%;" />

                                        <h3 class="security-heading" style="font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 500; color: #000000; line-height: 1.4; margin-top: 0; margin-bottom: 16px;">
                                            Important Security Information
                                        </h3>
                                        <ul class="security-list" style="font-family: 'Inter', sans-serif; list-style-type: none; padding-left: 0; margin-top: 0; margin-bottom: 0; text-align: left;">
                                            <li style="font-size: 14px; font-weight: 400; color: #6B7280; line-height: 1.5; margin-bottom: 8px; padding-left: 28px; position: relative;"><span class="icon" style="font-size:16px; color: #6B7280; position: absolute; left:0; top: 2px;">🛡️</span>This link expires in 10 minutes.</li>
                                            <li style="font-size: 14px; font-weight: 400; color: #6B7280; line-height: 1.5; margin-bottom: 8px; padding-left: 28px; position: relative;"><span class="icon" style="font-size:16px; color: #6B7280; position: absolute; left:0; top: 2px;">🛡️</span>Don't share this link with anyone.</li>
                                            <li style="font-size: 14px; font-weight: 400; color: #6B7280; line-height: 1.5; margin-bottom: 8px; padding-left: 28px; position: relative;"><span class="icon" style="font-size:16px; color: #6B7280; position: absolute; left:0; top: 2px;">🛡️</span>If you didn't request this reset, you can safely ignore this email.</li>
                                            <li style="font-size: 14px; font-weight: 400; color: #6B7280; line-height: 1.5; margin-bottom: 8px; padding-left: 28px; position: relative;"><span class="icon" style="font-size:16px; color: #6B7280; position: absolute; left:0; top: 2px;">🛡️</span>Your current password will remain unchanged until you create a new one.</li>
                                        </ul>

                                        <p class="fallback-link-text" style="font-family: 'Inter', sans-serif; font-size: 14px; color: #6B7280; line-height: 1.5; margin-top: 24px; margin-bottom: 8px;">
                                            If the button doesn't work, copy and paste this link into your browser:
                                            <br />
                                            <a href="${resetUrl}" target="_blank" style="color: #000000 !important; text-decoration: underline !important; word-break: break-all;">
                                                ${resetUrl}
                                            </a>
                                        </p>

                                        <hr class="divider" style="border: 0; border-top: 1px solid #E5E7EB; margin: 32px 0; width: 100%;" />

                                        <h3 class="security-heading" style="font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 500; color: #000000; line-height: 1.4; margin-top: 0; margin-bottom: 16px;">
                                            Didn't request this?
                                        </h3>
                                        <p class="body-text" style="font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 400; color: #000000; line-height: 1.6; margin-top: 0; margin-bottom: 24px;">
                                            If you didn't request a password reset, please ignore this email or contact our support team if you have concerns about your account security.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="footer-container" style="padding: 32px 20px; text-align: center; max-width: 520px; margin: 0 auto;">
                    <tr>
                        <td align="center" style="text-align: center;">
                            <p class="footer-text" style="font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 400; color: #9CA3AF; line-height: 1.4; margin-bottom: 8px;">
                                This email was sent by CyLink, a URL shortening service.
                            </p>
                            <p class="footer-text" style="font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 400; color: #9CA3AF; line-height: 1.4; margin-bottom: 8px;">
                                Questions? Contact us at <a href="mailto:support@cylink.app" target="_blank" style="color: #9CA3AF !important; text-decoration: underline !important;">support@cylink.app</a>
                            </p>
                            <p class="footer-text" style="font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 400; color: #9CA3AF; line-height: 1.4; margin-bottom: 8px;">
                                &copy; ${new Date().getFullYear()} CyLink. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
};
