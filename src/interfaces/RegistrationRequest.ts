/**
 * Registration Request DTO
 *
 * Defines the data structure for user registration requests, ensuring type safety
 * and consistency across the application. Used for validating and transferring
 * registration data between layers.
 *
 * @module interfaces/RegistrationRequest
 */

export interface RegistrationRequest {
  username: string;
  email: string;
  password: string;
  password_confirmation: string;
}
