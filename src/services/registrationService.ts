/**
 * Registration Service
 *
 * Handles business logic for user registration, including validation,
 * user creation, password hashing, verification token generation,
 * and sending verification emails. Designed for modularity and reuse
 * within the authentication system.
 *
 * @module services/registrationService
 */

import { User } from '../collections/userCollection';
import { RegistrationRequest } from '../interfaces/RegistrationRequest';
import { registrationVerificationHtml, registrationVerificationText } from '../mails/register';

import { getUserByEmail, createUser } from '../models/userModel';
const { hash } = require('../utils/crypto');
const jwt = require('../utils/jwt');
const { sendMail } = require('../utils/mailer');

const VERIFICATION_TOKEN_LENGTH = 255;
const EMAIL_SUBJECT_REGISTRATION = 'User Registration Verification';

/**
 * Registers a new user, hashes password, generates verification token, and sends email
 * @param {RegistrationRequest} userData - Registration data from client
 * @returns {Promise<Partial<User>>} Created user data (without sensitive fields)
 * @throws {Error} If email already exists or other error occurs
 */
const registerUser = async (userData: RegistrationRequest): Promise<Partial<User>> => {
  // Check for duplicate email
  const existingUser = await getUserByEmail(userData.email);
  if (existingUser) {
    throw new Error('Email already taken');
  }

  // Hash password
  const hashedPassword = await hash(userData.password);

  // Generate secure verification token (255 chars)
  const verification_token = jwt.verification
    .sign({
      email: userData.email,
      timestamp: Date.now(),
    })
    .slice(0, VERIFICATION_TOKEN_LENGTH);

  // Prepare user object
  const newUser: User = {
    username: userData.username,
    email: userData.email,
    password: hashedPassword,
    verification_token,
    last_email_verify_requested_at: new Date(),
  };

  // Save user to DB
  const createdUser = await createUser({
    ...newUser,
    email: String(newUser.email),
    password: String(newUser.password),
    username: String(newUser.username),
  });

  // Send verification email (HTML + plain text)
  try {
    await sendMail(
      createdUser.email,
      EMAIL_SUBJECT_REGISTRATION,
      registrationVerificationText(
        String(createdUser.username),
        String(createdUser.verification_token),
      ),
      registrationVerificationHtml(
        String(createdUser.username),
        String(createdUser.verification_token),
      ),
    );
  } catch (err) {
    // Consider implementing a cleanup job for unverified users if email delivery fails.
    // Optionally: rollback user creation if email fails, or mark as unverified
    throw new Error(
      'Failed to send verification email: ' + (err instanceof Error ? err.message : String(err)),
    );
  }

  // Return safe user data
  return {
    id: createdUser.id,
    username: createdUser.username,
    email: createdUser.email,
    created_at: createdUser.created_at,
    updated_at: createdUser.updated_at,
  };
};

export default {
  registerUser,
};
