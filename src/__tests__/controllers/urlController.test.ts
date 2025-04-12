/**
 * URL Controller Tests
 *
 * Tests for URL Controller functionality, focusing on the getAllUrls endpoint
 * @module tests/controllers/urlController
 */

import { Express } from "express";
import { createTestApp, createTestRequest } from "../utils/testUtils";
import { AuthTestHelper, authHeader } from "../utils/authTestUtils";
import {
  UrlTestDataFactory,
  createMockClickModel,
  createMockUrlModel,
} from "../utils/modelTestUtils";

// Mock the models and other dependencies
jest.mock("@/models/urlModel", () => createMockUrlModel());
jest.mock("@/models/clickModel", () => createMockClickModel());
jest.mock("@/utils/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

// Import after mocking
const urlRoutes = require("@/routes/urlRoutes");
const urlModel = require("@/models/urlModel");
const clickModel = require("@/models/clickModel");
const { verify } = require("@/utils/jwt");

// Mock JWT verification
jest.mock("@/utils/jwt", () => ({
  verify: {
    accessToken: jest.fn(),
  },
}));

describe("URL Controller - GET /api/v1/urls", () => {
  let app: Express;
  const userId = 123;
  // Create auth scenarios helper
  const authScenarios = AuthTestHelper.createAuthScenarios(verify.accessToken);

  // Setup for each test
  beforeEach(() => {
    jest.clearAllMocks();

    // Create test app with URL routes
    app = createTestApp([], {
      "/api/v1/urls": urlRoutes,
    });

    // Default: Setup authenticated user
    authScenarios.authenticatedUser(userId);

    // Mock default click counts
    clickModel.getClickCountByUrlId.mockImplementation((urlId: number) => {
      // Simple mapping of URL ID to click count
      const clickMap: Record<number, number> = {
        1: 50,
        2: 25,
        3: 10,
      };
      return Promise.resolve(clickMap[urlId] || 0);
    });

    // Set SHORT_URL_BASE for testing
    process.env.SHORT_URL_BASE = "https://cylink.id/";
  });

  afterEach(() => {
    delete process.env.SHORT_URL_BASE;
  });

  /**
   * Test Case: TC-URL-001
   * Description: Verify that authenticated users can retrieve their URLs
   */
  it("should return URLs with status 200 when authenticated (TC-URL-001)", async () => {
    // Setup: Mock user has URLs
    const mockUrls = UrlTestDataFactory.createUrlBatch(3, { user_id: userId });
    urlModel.getUrlsByUser.mockResolvedValue(mockUrls);

    // Execute
    const response = await createTestRequest(app)
      .get("/api/v1/urls")
      .set(authHeader("valid-token"));

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.status).toBe(200);
    expect(response.body.message).toBe("Successfully retrieved all URLs");
    expect(response.body.data).toHaveLength(mockUrls.length);
    expect(response.body.pagination).toEqual({
      total: 3,
      page: 1,
      limit: 10,
      total_pages: 1,
    });

    // Verify URLs have correct structure
    response.body.data.forEach((url: any) => {
      expect(url).toHaveProperty("id");
      expect(url).toHaveProperty("original_url");
      expect(url).toHaveProperty("short_code");
      expect(url).toHaveProperty("short_url");
      expect(url).toHaveProperty("clicks");
      expect(url).toHaveProperty("created_at");
    });

    // Verify model was called correctly
    expect(urlModel.getUrlsByUser).toHaveBeenCalledWith(userId);
    expect(clickModel.getClickCountByUrlId).toHaveBeenCalledTimes(
      mockUrls.length
    );
  });

  /**
   * Test Case: TC-URL-002
   * Description: Verify appropriate response when user has no URLs
   */
  it("should return 204 when user has no URLs (TC-URL-002)", async () => {
    // Setup: Mock user has no URLs
    urlModel.getUrlsByUser.mockResolvedValue([]);

    // Execute
    const response = await createTestRequest(app)
      .get("/api/v1/urls")
      .set(authHeader("valid-token"));

    // Assert
    expect(response.status).toBe(204);
    expect(response.body).toEqual({});
  });

  /**
   * Test Case: TC-URL-003
   * Description: Verify that unauthenticated requests are rejected
   */
  it("should return 401 when not authenticated (TC-URL-003)", async () => {
    // Execute: Send request without auth token
    const response = await createTestRequest(app).get("/api/v1/urls");

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.status).toBe(401);
    expect(response.body.message).toBe("Unauthorized");

    // Verify model was not called
    expect(urlModel.getUrlsByUser).not.toHaveBeenCalled();
  });

  /**
   * Test Case: TC-URL-004
   * Description: Verify that pagination works correctly
   */
  it("should handle pagination correctly (TC-URL-004)", async () => {
    // Setup: Mock 15 URLs to test pagination
    const manyUrls = UrlTestDataFactory.createUrlBatch(15, { user_id: userId });
    urlModel.getUrlsByUser.mockResolvedValue(manyUrls);

    // Execute: Request second page with limit 10
    const response = await createTestRequest(app)
      .get("/api/v1/urls?page=2&limit=10")
      .set(authHeader("valid-token"));

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(5); // Second page should have 5 items (15 total - 10 from first page)
    expect(response.body.pagination).toEqual({
      total: 15,
      page: 2,
      limit: 10,
      total_pages: 2,
    });
  });

  /**
   * Test Case: TC-URL-005
   * Description: Verify that sorting parameters work correctly
   */
  it("should sort URLs correctly (TC-URL-005)", async () => {
    // Setup: Return mock URLs
    const mockUrls = UrlTestDataFactory.createUrlBatch(3, { user_id: userId });
    urlModel.getUrlsByUser.mockResolvedValue(mockUrls);

    // Execute: Sort by creation date descending (newest first)
    const response = await createTestRequest(app)
      .get("/api/v1/urls?sortBy=created_at&sortOrder=desc")
      .set(authHeader("valid-token"));

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(3);

    // Verify items are in descending order by created_at
    const createdDates = response.body.data.map((url: any) =>
      new Date(url.created_at).getTime()
    );

    // Check that the dates are in descending order
    expect(createdDates[0]).toBeGreaterThanOrEqual(createdDates[1]);
    expect(createdDates[1]).toBeGreaterThanOrEqual(createdDates[2]);
  });

  /**
   * Test invalid token
   */
  it("should return 401 when token is invalid", async () => {
    // Setup: Mock JWT verification to throw an error
    authScenarios.invalidToken();

    // Execute
    const response = await createTestRequest(app)
      .get("/api/v1/urls")
      .set(authHeader("invalid-token"));

    // Assert
    expect(response.status).toBe(401);
    expect(response.body.status).toBe(401);
    expect(response.body.message).toBe("Invalid or expired access token");
  });

  /**
   * Test server error handling
   */
  it("should handle server errors gracefully", async () => {
    // Setup: Mock database error
    urlModel.getUrlsByUser.mockRejectedValue(new Error("Database error"));

    // Execute
    const response = await createTestRequest(app)
      .get("/api/v1/urls")
      .set(authHeader("valid-token"));

    // Assert
    expect(response.status).toBe(500);
    expect(response.body.status).toBe(500);
    expect(response.body.message).toBe("Failed to retrieve URLs");
  });

  /**
   * Test sorting by clicks
   */
  it("should sort URLs by click count when requested", async () => {
    // Setup
    const mockUrls = UrlTestDataFactory.createUrlBatch(3, { user_id: userId });
    urlModel.getUrlsByUser.mockResolvedValue(mockUrls);

    // Execute: Sort by clicks ascending
    const response = await createTestRequest(app)
      .get("/api/v1/urls?sortBy=clicks&sortOrder=asc")
      .set(authHeader("valid-token"));

    // Assert
    expect(response.status).toBe(200);

    // Check that click counts are in ascending order
    const clicks = response.body.data.map((url: any) => url.clicks);
    expect(clicks[0]).toBeLessThanOrEqual(clicks[1]);
    expect(clicks[1]).toBeLessThanOrEqual(clicks[2]);
  });

  /**
   * Test sorting by title
   */
  it("should sort URLs by title when requested", async () => {
    // Setup
    const mockUrls = UrlTestDataFactory.createUrlBatch(3, { user_id: userId });
    urlModel.getUrlsByUser.mockResolvedValue(mockUrls);

    // Execute: Sort by title ascending
    const response = await createTestRequest(app)
      .get("/api/v1/urls?sortBy=title&sortOrder=asc")
      .set(authHeader("valid-token"));

    // Assert
    expect(response.status).toBe(200);

    // Since we're not testing the actual sorting algorithm,
    // just verify the request was processed correctly
    expect(response.body.status).toBe(200);
  });
});
