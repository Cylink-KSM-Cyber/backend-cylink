const userModel = require('@/models/userModel');
const jwt = require('@/utils/jwt');
const { hash, compare } = require('@/utils/crypto');

const { sendMail } = require('@/utils/mailer');
const registerMail = require('@/mails/register');
const resetPasswordMail = require('@/mails/reset-password');
const resendVerificationMail = require('@/mails/resend-verification');

const userCollection = require('@/collections/userCollection');

/**
 * Finds user by email.
 */
exports.findUser = async (email: string) => {
  return await userModel.getUserByEmail(email);
};

/**
 * Create new user.
 */
exports.createUser = async (user: any) => {
  const hashedPassword = await hash(user.password);

  const userData: any = {
    username: user.username,
    email: user.email,
    password: hashedPassword,
  };
  userData.verification_token = jwt.verification.sign(userData);
  userData.last_email_verify_requested_at = Date.now();

  await userModel.createUser(userData);

  return userData;
};

exports.sendRegistration = async (user: any): Promise<void> => {
  await sendMail(
    user.email,
    'User Registration Verification',
    'User Registration Verification',
    registerMail(user.username, user.verification_token),
  );
};

exports.resendVerification = async (user: any): Promise<void> => {
  await sendMail(
    user.email,
    'Verification Resend',
    'Verification Resend',
    resendVerificationMail(user.verification_token),
  );
};

/**
 * Verifies user registration from email.
 */
exports.verifyRegister = async (user: any) => {
  const data = await userModel.getUserByEmail(user.email);

  if (data.email_verified_at) {
    return false;
  }

  const userData = await userModel.updateUser(user.email, {
    email_verified_at: Date.now(),
    verification_token: null,
  });

  return userCollection.single(userData);
};

/**
 * Authenticates user by its credentials.
 */
exports.authenticate = async (user: any) => {
  const data = await userModel.getUserByEmail(user.email);
  if (!user.length) {
    return false;
  }

  if (!(await compare(user.password, data.password))) {
    return false;
  }

  return user;
};

/**
 * Creates user session.
 */
exports.login = (userData: any): object => {
  return {
    user: userCollection.single(userData),
    token: {
      type: 'bearer',
      access: jwt.access.sign(userData),
      refresh: jwt.refresh.sign(userData),
      expiresAt: jwt.access.getExpiration(),
    },
  };
};

/**
 * Sends password reset verification to email.
 */
exports.sendPasswordResetVerification = async (user: any) => {
  const email = user.email;

  const verificationToken = jwt.verification.sign({ email });

  try {
    await sendMail(
      email,
      'Password Reset Verification',
      'Password Reset Verification',
      resetPasswordMail(verificationToken),
    );

    return verificationToken;
  } catch (error: any) {
    throw new Error(`Failed to send user registration mail: ${error.message}`);
  }
};

/**
 * Updates user password.
 */
exports.resetPassword = async (user: any) => {
  try {
    
  } catch (error: any) {
    throw new Error(`Failed to `);
  }

  try {
    return await userModel.updateUser({ password: user.password });
  } catch (error: any) {
    throw new Error(`Failed to store new password: ${error.message}`);
  }
};

const verifyVerificationToken = async (verificationToken: string) => {
  const decoded = jwt.verification.verify(verificationToken);

  if (!decoded) {
    return false;
  }

  return decoded;
};
exports.verifyVerificationToken = verifyVerificationToken;
