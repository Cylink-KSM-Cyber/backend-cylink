# Test Utilities

This directory contains utility functions and helper classes for testing. These utilities follow SOLID principles and are designed to be reusable across different test suites.

## Available Utilities

### 1. `testUtils.ts` - General Test Utilities

Provides base testing utilities for Express applications:

```typescript
import {
  createTestApp,
  createTestRequest,
  createMockReqRes,
} from "../utils/testUtils";

// Create a test Express app with routes
const app = createTestApp([myMiddleware], { "/api": myRouter });

// Create a supertest request object
const request = createTestRequest(app);

// Create mock req/res objects for middleware testing
const { req, res, next } = createMockReqRes();
```

### 2. `authTestUtils.ts` - Authentication Testing Utilities

Helper functions for testing authenticated endpoints:

```typescript
import { AuthTestHelper, authHeader } from "../utils/authTestUtils";

// Create JWT mock scenarios
const authScenarios = AuthTestHelper.createAuthScenarios(verify.accessToken);

// Setup an authenticated user
authScenarios.authenticatedUser(123);

// Setup an invalid token scenario
authScenarios.invalidToken();

// Create authorization header
const headers = authHeader("my-token"); // { Authorization: 'Bearer my-token' }
```

### 3. `modelTestUtils.ts` - Model Data Factories

Factory classes for generating test data:

```typescript
import {
  UrlTestDataFactory,
  ClickTestDataFactory,
  createMockUrlModel,
  createMockClickModel,
} from "../utils/modelTestUtils";

// Create a single URL test object
const url = UrlTestDataFactory.createUrl({ title: "Custom Title" });

// Create a batch of URL test objects
const urls = UrlTestDataFactory.createUrlBatch(5, { user_id: 123 });

// Create a batch of click test objects
const clicks = ClickTestDataFactory.createClickBatch(10, 1);

// Create mock model functions
jest.mock("@/models/urlModel", () => createMockUrlModel());
```

## Best Practices

These utilities implement several best practices:

1. **Separation of Concerns**: Each utility file focuses on a specific testing aspect.

2. **Factory Pattern**: Test data is created using factory methods with sensible defaults and customization options.

3. **Mock Flexibility**: Mocks maintain the same interface as the real implementations but with controlled behavior.

4. **Type Safety**: TypeScript is used to ensure type safety and provide better IDE support.

5. **Consistent Formatting**: Test data follows a consistent format across different tests.

## Usage Guidelines

1. **Prefer Factory Methods**: Use factory methods instead of creating test data manually to ensure consistency.

2. **Import After Mocking**: Always import modules after setting up mocks to ensure the mocks are applied.

3. **Clear Mock State**: Use `jest.clearAllMocks()` in `beforeEach` to reset mock state between tests.

4. **Reuse Utilities**: Favor reusing these utilities over creating duplicate helper functions in individual test files.
