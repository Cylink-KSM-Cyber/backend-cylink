/**
 * Global test setup file for Jest
 *
 * This file runs before the tests and sets up global configuration,
 * mocks, and environment variables for testing.
 */

// Mock environment variables for testing
process.env.JWT_SECRET = "test-jwt-secret";
process.env.API_KEY = "test-api-key";
process.env.NODE_ENV = "test";

// Global mock cleanup
afterEach(() => {
  jest.clearAllMocks();
  jest.resetAllMocks();
});

// Global console error suppression for tests
// Comment this out if you want to see console errors during tests
const originalConsoleError = console.error;
console.error = (...args) => {
  if (args[0]?.includes?.("Warning:") || args[0]?.includes?.("Error:")) {
    return;
  }
  originalConsoleError(...args);
};
