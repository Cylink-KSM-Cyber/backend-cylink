const userModel = require('@/models/userModel');
const { sign, verify } = require('@/utils/jwt');
const { hash, compare } = require('@/utils/crypto');

const mailer = require('@/config/mailer');
const registerMail = require('@/mails/register.ts');
const resetPasswordMail = require('@/mails/reset-password');

/**
 * Finds user by email.
 */
exports.findUser = async (email: string) => {
  return await userModel.getUserByEmail(email);
};

/**
 * Sends user registration verification to email.
 * 
 * Verification token is used as temporary data between
 * authentication state during multi-factor-authentication.
 */
exports.register = async (user: any) => {
  const hashedPassword = await hash(user.password);

  const userData = {
    username: user.username,
    email: user.email,
    password: hashedPassword,
  };

  const verificationToken = sign.accessToken(userData);

  try {
    await mailer.sendMail({
      to: userData.email,
      from: process.env.MAILER_SENDER,
      subject: 'User Registration Verification',
      text: 'User Registration Verification',
      html: registerMail(userData.username, verificationToken),
    });
  } catch (error: any) {
    throw new Error(`Failed to send user registration mail: ${error.message}`);
  }
};

/**
 * Verifies user registration from email.
 */
exports.verifyRegister = async (verificationToken: string) => {
  const decoded = verify.accessToken(verificationToken);
  if (!decoded) {
    return false;
  }

  try {
    await userModel.createUser({
      username: decoded.username,
      email: decoded.email,
      password: decoded.password,
    });
  } catch (error: any) {
    throw new Error(`Failed to verify user email: ${error.message}`);
  }
};

/**
 * Authenticates user and gives access and refresh token.
 */
exports.login = async (user: any) => {
  const data = await userModel.getUserByEmail(user.email);
  if (!user.length) {
    return false;
  }
  
  const my = data[0];

  if (!(await compare(user.password, my.password))) {
    return false;
  }

  const userData = {
    email: my.email,
    username: my.username,
    created_at: my.created_at,
    updated_at: my.updated_at,
  };

  const accessToken = sign.accessToken(userData);
  const refreshToken = sign.refreshToken(userData);

  return {
    ...userData,
    token: {
      access: accessToken,
      refresh: refreshToken,
    },
  };
};

/**
 * Sends password reset verification to email.
 */
exports.verifyResetPassword = async (user: any) => {
  const email = user.email;

  const verificationToken = sign.accessToken({ email });

  try {
    await mailer.sendMail({
      to: email,
      from: process.env.MAILER_SENDER,
      subject: 'User Registration Verification',
      text: 'User Registration Verification',
      html: resetPasswordMail(verificationToken),
    });

    return verificationToken;
  } catch (error: any) {
    throw new Error (`Failed to send user registration mail: ${error.message}`);
  }
};

/**
 * Updates user password.
 */
exports.resetPassword = async (user: any) => {
  try {
    return await userModel.updateUser({ password: user.password });
  } catch (error: any) {
    throw new Error (`Failed to store new password: ${error.message}`);
  }
};
