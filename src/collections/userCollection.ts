/**
 * User Collection
 *
 * Transforms user data for API responses
 * @module collections/userCollection
 */

/**
 * User interface representing user data structure
 * @interface User
 */
interface User {
  id?: number;
  username?: string;
  email: string;
  password?: string;
  role?: string;
  verification_token?: string;
  email_verified_at?: Date | null;
  last_email_verify_requested_at?: Date | null;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

/**
 * Transforms a single user record into a standardized response format
 * @param {User} data - User data from database
 * @returns {object | null} Formatted user data or null if no data provided
 */
const single = (data: User): object | null => {
  if (!data) return null;

  return {
    id: data.id,
    username: data.username,
    email: data.email,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
};

/**
 * Transforms a collection of user records into standardized response format
 * @param {User[]} datas - Array of user data objects
 * @returns {object[]} Array of formatted user data objects
 */
const collection = (datas: User[]): object[] => {
  return datas.map(single).filter((item): item is object => item !== null);
};

export { single, collection, User };
