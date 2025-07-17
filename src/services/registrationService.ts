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

import { RegistrationRequest } from '../interfaces/RegistrationRequest';
import { User } from '../collections/userCollection';
const userModel = require('../models/userModel');
const { hash } = require('../utils/crypto');
const jwt = require('../utils/jwt');
const { sendMail } = require('../utils/mailer');
import registerMail from '../mails/register';

const VERIFICATION_TOKEN_LENGTH = 255;

/**
 * Registers a new user, hashes password, generates verification token, and sends email
 * @param {RegistrationRequest} userData - Registration data from client
 * @returns {Promise<Partial<User>>} Created user data (without sensitive fields)
 * @throws {Error} If email already exists or other error occurs
 */
const registerUser = async (userData: RegistrationRequest): Promise<Partial<User>> => {
  // Check for duplicate email
  const existingUser = await userModel.getUserByEmail(userData.email);
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
  const createdUser = await userModel.createUser(newUser);

  // Send verification email
  await sendMail(
    createdUser.email,
    'User Registration Verification',
    'User Registration Verification',
    registerMail(createdUser.username, createdUser.verification_token),
  );

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
