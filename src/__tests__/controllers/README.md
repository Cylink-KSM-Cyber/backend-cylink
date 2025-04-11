# Controller Tests

Test cases for controllers following the SOLID principles. This directory contains tests for various API endpoints, ensuring each controller function works as expected.

## URL Controller Tests

The `urlController.test.ts` file contains tests for the URL controller endpoints, specifically focusing on the GET /api/v1/urls endpoint which retrieves all URLs for an authenticated user.

### Test Cases

#### Get All URLs Endpoint (GET /api/v1/urls)

1. **TC-URL-001: Get URLs - Success**

   - Verifies that authenticated users can retrieve their URLs
   - Tests that the endpoint returns correct URL data with pagination details

2. **TC-URL-002: Get URLs - No Data**

   - Verifies appropriate response when user has no URLs
   - Tests that the endpoint returns a 204 status when no URLs exist

3. **TC-URL-003: Get URLs - Unauthorized**

   - Verifies that unauthenticated requests are rejected
   - Tests that the endpoint returns a 401 status for missing auth token

4. **TC-URL-004: Get URLs - Pagination**

   - Verifies that pagination works correctly
   - Tests retrieving the second page of results with the correct limit

5. **TC-URL-005: Get URLs - Sorting**
   - Verifies that sorting parameters work correctly
   - Tests sorting by creation date in descending order

### Additional Tests

- **Invalid Token Test** - Tests handling of invalid authentication tokens
- **Server Error Test** - Tests graceful handling of server errors
- **Sort by Clicks Test** - Tests sorting URLs by click count
- **Sort by Title Test** - Tests sorting URLs by title

## Best Practices Used

1. **Mocking Dependencies**: All external dependencies like models and utilities are mocked to isolate the controller logic.

2. **Test Helpers**: Reusable utility functions for testing are organized in separate files:

   - `testUtils.ts` - General test utilities
   - `authTestUtils.ts` - Authentication testing utilities
   - `modelTestUtils.ts` - Model data factories and mock creators

3. **Clear Test Structure**: Each test follows a clear Arrange-Act-Assert pattern.

4. **Comprehensive Assertions**: Tests verify both response status codes and content structure.

5. **Edge Cases**: Tests cover various edge cases including errors, empty results, and pagination scenarios.

## Running Tests

To run only the URL controller tests:

```bash
npm test -- src/__tests__/controllers/urlController.test.ts
```

To run all controller tests with coverage:

```bash
npm run test:coverage
```
