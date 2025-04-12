import express, { Express } from "express";
import request from "supertest";

/**
 * Creates a test Express app with the specified middleware and routes
 *
 * @param middleware - Array of middleware functions to apply
 * @param routes - Object mapping route paths to route handlers
 * @returns Express application configured for testing
 */
export const createTestApp = (
  middleware: any[] = [],
  routes: Record<string, any> = {}
): Express => {
  const app = express();

  // Apply basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Apply custom middleware
  middleware.forEach((mw) => app.use(mw));

  // Apply routes
  Object.entries(routes).forEach(([path, router]) => {
    app.use(path, router);
  });

  return app;
};

/**
 * Creates a test request object for the given Express app
 *
 * @param app - Express application to test
 * @returns Supertest request object
 */
export const createTestRequest = (app: Express) => {
  return request(app);
};

/**
 * Creates mock request and response objects for unit testing Express middleware and controllers
 *
 * @returns Object containing mock req, res, and next function
 */
export const createMockReqRes = () => {
  const req: any = {
    body: {},
    params: {},
    query: {},
    headers: {},
    cookies: {},
    session: {},
    user: null,
  };

  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  };

  const next = jest.fn();

  return { req, res, next };
};
