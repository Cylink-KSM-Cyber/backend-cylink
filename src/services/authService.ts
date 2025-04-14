/**
 * Authentication Service
 *
 * Provides business logic for user authentication and account management
 * @module services/authService
 */

import { User } from '../collections/userCollection';

const userCollection = require('../collections/userCollection');
const registerMail = require('../mails/register');
const resendVerificationMail = require('../mails/resend-verification');
const resetPasswordMail = require('../mails/reset-password');
const userModel = require('../models/userModel');
const { hash, compare } = require('../utils/crypto');
const jwt = require('../utils/jwt');
const { sendMail } = require('../utils/mailer');

/**
 * User registration data interface
 */
interface RegistrationData {
  username: string;
  email: string;
  password: string;
  verification_token?: string;
  last_email_verify_requested_at?: number | Date;
}

/**
 * Login response interface
 */
interface LoginResponse {
  user: object | null;
  token: {
    type: string;
    access: string;
    refresh: string;
    expiresAt: number;
  };
}

/**
 * Finds user by email
 * @param {string} email - Email to search for
 * @returns {Promise<User|undefined>} User object if found
 */
exports.findUser = async (email: string): Promise<User | undefined> => {
  return await userModel.getUserByEmail(email);
};

/**
 * Create new user
 * @param {RegistrationData} user - User registration data
 * @returns {Promise<User>} Created user data
 */
exports.createUser = async (user: RegistrationData): Promise<User> => {
  const hashedPassword = await hash(user.password);

  const userData: RegistrationData = {
    username: user.username,
    email: user.email,
    password: hashedPassword,
  };
  userData.verification_token = jwt.verification.sign(userData);
  userData.last_email_verify_requested_at = Date.now();

  await userModel.createUser(userData);

  return userData as User;
};

/**
 * Sends registration verification email
 * @param {User} user - User data
 * @returns {Promise<void>}
 */
exports.sendRegistration = async (user: User): Promise<void> => {
  await sendMail(
    user.email,
    'User Registration Verification',
    'User Registration Verification',
    registerMail(user.username, user.verification_token),
  );
};

/**
 * Resends verification email
 * @param {User} user - User data
 * @returns {Promise<void>}
 */
exports.resendVerification = async (user: User): Promise<void> => {
  await sendMail(
    user.email,
    'Verification Resend',
    'Verification Resend',
    resendVerificationMail(user.verification_token),
  );
};

/**
 * Verifies user registration from email
 * @param {User} user - User data
 * @returns {Promise<object|boolean>} User data or false if already verified
 */
exports.verifyRegister = async (user: User): Promise<object | boolean> => {
  const data = await userModel.getUserByEmail(user.email);

  if (data.email_verified_at) {
    return false;
  }

  const userData = await userModel.updateUser({
    email: user.email,
    email_verified_at: Date.now(),
    verification_token: null,
  });

  return userCollection.single(userData);
};

/**
 * Authenticates user by credentials
 * @param {Pick<User, 'email' | 'password'>} credentials - User login credentials
 * @returns {Promise<User|boolean>} User data or false if authentication fails
 */
exports.authenticate = async (
  credentials: Pick<User, 'email' | 'password'>,
): Promise<User | boolean> => {
  const data = await userModel.getUserByEmail(credentials.email);

  if (!data) {
    return false;
  }

  if (!(await compare(credentials.password, data.password))) {
    return false;
  }

  return data;
};

/**
 * Creates user session
 * @param {User} userData - User data
 * @returns {LoginResponse} Session data with tokens
 */
exports.login = (userData: User): LoginResponse => {
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
 * Sends password reset verification to email
 * @param {Pick<User, 'email'>} user - User email
 * @returns {Promise<string>} Verification token
 */
exports.sendPasswordResetVerification = async (user: Pick<User, 'email'>): Promise<string> => {
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to send password reset email: ${errorMessage}`);
  }
};

/**
 * Updates user password
 * @param {Pick<User, 'email' | 'password'>} user - User data with new password
 * @returns {Promise<User>} Updated user data
 */
exports.resetPassword = async (user: Pick<User, 'email' | 'password'>): Promise<User> => {
  try {
    const hashedPassword = await hash(user.password);

    return await userModel.updateUser({
      email: user.email,
      password: hashedPassword,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to reset password: ${errorMessage}`);
  }
};

/**
 * Verifies a verification token
 * @param {string} verificationToken - Token to verify
 * @returns {Promise<object|boolean>} Decoded token or false if invalid
 */
const verifyVerificationToken = async (
  verificationToken: string,
): Promise<Record<string, unknown> | boolean> => {
  try {
    const decoded = jwt.verification.verify(verificationToken);
    return decoded || false;
  } catch (error) {
    return false;
  }
};

exports.verifyVerificationToken = verifyVerificationToken;
