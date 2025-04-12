/**
 * Authentication Test Utilities
 *
 * Helper functions for testing authenticated endpoints
 * @module tests/utils/authTestUtils
 */

import { Request } from "express";

/**
 * Provides utility functions for mocking authentication in tests
 */
export class AuthTestHelper {
  /**
   * Creates a mock JWT verification function
   *
   * @param mockUserId - The user ID to return in the token verification
   * @returns A mock function that can replace the JWT verification
   */
  static createMockJwtVerifier(mockUserId: number | string) {
    return jest.fn().mockReturnValue({ id: mockUserId });
  }

  /**
   * Creates a mock JWT verification function that throws an error
   *
   * @param errorMessage - Optional custom error message
   * @returns A mock function that throws an error when called
   */
  static createInvalidJwtVerifier(errorMessage = "Invalid token") {
    return jest.fn().mockImplementation(() => {
      throw new Error(errorMessage);
    });
  }

  /**
   * Mocks req.body with user authentication data
   *
   * @param req - Express request object to modify
   * @param userId - User ID to set in the request body
   * @returns Modified request object
   */
  static mockAuthenticatedRequest(req: Request, userId: number | string) {
    req.body = { ...req.body, id: userId };
    return req;
  }

  /**
   * Helper method to create common auth test scenarios
   *
   * @param verifyMock - Mock JWT verify function
   * @returns Object containing setup functions for common auth tests
   */
  static createAuthScenarios(verifyMock: jest.Mock) {
    return {
      /**
       * Sets up an authenticated user scenario
       *
       * @param userId - User ID to authenticate with
       */
      authenticatedUser: (userId: number | string) => {
        verifyMock.mockReturnValue({ id: userId });
      },

      /**
       * Sets up an expired token scenario
       */
      expiredToken: () => {
        verifyMock.mockImplementation(() => {
          throw new Error("Token expired");
        });
      },

      /**
       * Sets up an invalid token scenario
       */
      invalidToken: () => {
        verifyMock.mockImplementation(() => {
          throw new Error("Invalid token");
        });
      },
    };
  }
}

/**
 * Returns authorization header with Bearer token
 *
 * @param token - Token to include in the authorization header
 * @returns Object containing the Authorization header
 */
export const authHeader = (token: string) => ({
  Authorization: `Bearer ${token}`,
});
