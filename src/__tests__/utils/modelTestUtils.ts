/**
 * Model Test Utilities
 *
 * Helper functions and classes for testing models
 * @module tests/utils/modelTestUtils
 */

/**
 * URL model factory for generating test data
 */
export class UrlTestDataFactory {
  /**
   * Creates a sample URL data object
   *
   * @param overrides - Properties to override defaults
   * @returns A URL data object for testing
   */
  static createUrl(overrides: Partial<any> = {}) {
    const defaults = {
      id: 1,
      user_id: 123,
      original_url: "https://example.com/page",
      short_code: "abc123",
      title: "Example Title",
      created_at: new Date("2023-01-01T00:00:00Z"),
      updated_at: new Date("2023-01-01T00:00:00Z"),
      expiry_date: null,
      is_active: true,
      has_password: false,
      password_hash: null,
      redirect_type: "302",
      deleted_at: null,
    };

    return { ...defaults, ...overrides };
  }

  /**
   * Creates multiple URL test objects
   *
   * @param count - Number of URLs to create
   * @param baseProps - Base properties to apply to all URLs
   * @returns Array of URL test objects
   */
  static createUrlBatch(count: number, baseProps: Partial<any> = {}) {
    return Array.from({ length: count }, (_, index) =>
      this.createUrl({
        id: index + 1,
        short_code: `code${index + 1}`,
        title: `Title ${index + 1}`,
        created_at: new Date(
          `2023-01-${String(index + 1).padStart(2, "0")}T00:00:00Z`
        ),
        ...baseProps,
      })
    );
  }
}

/**
 * Click model factory for generating test data
 */
export class ClickTestDataFactory {
  /**
   * Creates a sample click data object
   *
   * @param overrides - Properties to override defaults
   * @returns A click data object for testing
   */
  static createClick(overrides: Partial<any> = {}) {
    const defaults = {
      id: 1,
      url_id: 1,
      ip_address: "127.0.0.1",
      user_agent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      referrer: "https://google.com",
      device_type: "desktop",
      browser: "Chrome",
      os: "Windows",
      country: "US",
      city: "New York",
      created_at: new Date("2023-01-01T00:00:00Z"),
    };

    return { ...defaults, ...overrides };
  }

  /**
   * Creates multiple click test objects
   *
   * @param count - Number of clicks to create
   * @param urlId - URL ID for all clicks
   * @returns Array of click test objects
   */
  static createClickBatch(count: number, urlId: number) {
    return Array.from({ length: count }, (_, index) =>
      this.createClick({
        id: index + 1,
        url_id: urlId,
        created_at: new Date(
          `2023-01-${String(index + 1).padStart(2, "0")}T00:00:00Z`
        ),
      })
    );
  }
}

/**
 * Creates mock model functions for the URL model
 *
 * @returns Object with mocked URL model functions
 */
export const createMockUrlModel = () => {
  return {
    getUrlsByUser: jest.fn(),
    getUrlByShortCode: jest.fn(),
    getUrlById: jest.fn(),
    createUrl: jest.fn(),
    updateUrl: jest.fn(),
    deleteUrl: jest.fn(),
    shortCodeExists: jest.fn(),
  };
};

/**
 * Creates mock model functions for the Click model
 *
 * @returns Object with mocked Click model functions
 */
export const createMockClickModel = () => {
  return {
    createClick: jest.fn(),
    getClicksByUrlId: jest.fn(),
    getClickCountByUrlId: jest.fn(),
    getClickAnalyticsByUrlId: jest.fn(),
  };
};
