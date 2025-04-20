# CyLink API Documentation

This project implements comprehensive API documentation using Swagger/OpenAPI for the CyLink URL Shortener and QR Code Generator platform. The documentation provides detailed information about all API endpoints, allowing developers to easily understand, test, and integrate with our services.

## Features

- **Complete API Documentation**: Comprehensive documentation for all API endpoints including URL Shortener and QR Code Generator.
- **Interactive Testing**: Test API endpoints directly from the documentation interface.
- **Authentication Support**: Built-in authentication setup in the documentation interface.
- **Request/Response Examples**: Clear examples for each endpoint showing exactly what to send and what to expect.
- **Error Documentation**: Detailed error codes and meanings.
- **Getting Started Guide**: A comprehensive guide for new developers.

## Accessing the Documentation

The API documentation is available at:

- **Development**: `http://localhost:3000/api/docs` (when running locally)
- **Production**: `https://cylink.id/api/docs`

## Documentation Structure

The API documentation is organized into the following sections:

1. **Getting Started**: Overview and basic information for using the API
2. **Authentication**: Endpoints for user registration, login, and token management
3. **URLs**: Endpoints for managing shortened URLs (requires authentication)
4. **Public URLs**: Public API for URL shortening (no authentication required)
5. **QR Codes**: Endpoints for generating and managing QR codes

## Using the Documentation

### Authentication

To use authenticated endpoints:

1. Create an account or login using the `/api/v1/auth/register` or `/api/v1/auth/login` endpoints
2. Get your access token from the response
3. Click the "Authorize" button at the top of the documentation page
4. Enter your token in the format `Bearer your-token-here`
5. Click "Authorize" and close the dialog

Now you're authenticated and can use the secured endpoints.

### Testing Endpoints

For each endpoint, you can:

1. Click on the endpoint to expand it
2. View the required parameters and response format
3. Click "Try it out"
4. Fill in the required parameters
5. Click "Execute" to make a real API call
6. View the response

## Implementation Details

The documentation is implemented using:

- **swagger-jsdoc**: For defining the API specification using JSDoc comments
- **swagger-ui-express**: For rendering the interactive documentation UI

The main components are:

- `src/config/swagger.ts`: Swagger configuration
- `src/middlewares/swagger.ts`: Express middleware for setting up Swagger
- `src/docs/swaggerGuide.ts`: Getting started guide
- API routes with Swagger annotations in `src/routes/`

## Development

To modify the API documentation:

1. Update the Swagger annotations in the route files
2. Edit the `src/config/swagger.ts` file to change global settings
3. Update the getting started guide in `src/docs/swaggerGuide.ts`

## Best Practices

When adding new endpoints, follow these practices:

1. Document all parameters, including their data types, format, and whether they're required
2. Include example values to make the documentation more useful
3. Document all possible response status codes and their meanings
4. Group related endpoints under appropriate tags
5. Use consistent naming and description styles

## Benefits

This API documentation provides numerous benefits for both internal developers and external API consumers:

- **Reduced Onboarding Time**: New developers can quickly understand the API
- **Self-Service Documentation**: Reduces support requests by providing clear information
- **Interactive Testing**: Makes it easy to verify understanding of the API
- **Consistent Documentation**: Ensures documentation stays in sync with the actual API
- **Visual Reference**: Provides a visual representation of the API structure

## API Endpoints

### Authentication

- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login to get access token
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/verify-email` - Verify user email
- `POST /api/v1/auth/resend-verification` - Resend verification email

### URLs (Authenticated)

- `GET /api/v1/urls` - Get all user's URLs
- `POST /api/v1/urls` - Create a new shortened URL
- `GET /api/v1/urls/:id` - Get a specific URL by ID
- `PUT /api/v1/urls/:id` - Update a URL
- `DELETE /api/v1/urls/:id` - Delete a URL
- `GET /api/v1/urls/:id/qr-code` - Get QR code for a URL
- `GET /api/v1/urls/:id/analytics` - Get analytics for a specific URL
- `GET /api/v1/urls/total-clicks` - Get aggregated click analytics across all user's URLs
  - Supports filtering by date range with `start_date` and `end_date`
  - Allows comparison with previous periods using `comparison` parameter (7, 14, 30, 90 days or custom)
  - Supports different time period groupings (daily, weekly, monthly) using `group_by`
  - Includes pagination for time series data with `page` and `limit`

### Public URLs (Unauthenticated)

- `POST /api/v1/public/urls` - Create a new anonymous shortened URL
- `GET /api/v1/public/urls/:short_code` - Resolve and redirect to original URL

### QR Codes

- `POST /api/v1/qr-codes` - Generate a new QR code
- `GET /api/v1/qr-codes/:id` - Get a specific QR code by ID

## URLs

### Get All URLs

Retrieves all URLs for the authenticated user.

**Endpoint:** `GET /api/v1/urls`

**Authentication:** Required (Bearer Token)

**Parameters:**

| Parameter | Type    | Required | Default    | Description                                             |
| --------- | ------- | -------- | ---------- | ------------------------------------------------------- |
| search    | string  | No       | -          | Text to search in original URLs or short codes          |
| page      | integer | No       | 1          | Page number for pagination                              |
| limit     | integer | No       | 10         | Number of items per page                                |
| sortBy    | string  | No       | created_at | Field to sort by (created_at, clicks, title, relevance) |
| sortOrder | string  | No       | desc       | Sort order (asc, desc)                                  |

**Response:**

```json
{
  "status": 200,
  "message": "URLs retrieved successfully",
  "data": [
    {
      "id": 123,
      "original_url": "https://example.com/very-long-url-path",
      "short_code": "abc123",
      "short_url": "https://cylink.id/abc123",
      "title": "Example URL",
      "clicks": 42,
      "created_at": "2023-04-10T12:00:00Z",
      "expiry_date": "2023-05-10T00:00:00Z",
      "is_active": true,
      "matches": {
        "original_url": ["<em>example</em>.com"],
        "short_code": null,
        "title": null
      }
    }
    // More URLs...
  ],
  "pagination": {
    "total": 24,
    "page": 1,
    "limit": 10,
    "total_pages": 3
  },
  "search_info": {
    "term": "example",
    "fields_searched": ["original_url", "short_code", "title"],
    "total_matches": 24
  }
}
```

#### Search Functionality

The URL endpoint supports a powerful search feature that allows users to find URLs by matching terms in the original URL, short code, or title.

**Search Features:**

- Case-insensitive searching
- Partial matching (finds terms anywhere in the text)
- Results ordered by relevance when using the 'relevance' sort option
- Highlighted matches in the response with HTML `<em>` tags
- Search performance optimized with database indexes
- Minimum search term length: 2 characters

**Example Searches:**

- `?search=example` - Find URLs containing "example" in any field
- `?search=example&sortBy=relevance` - Find URLs with "example" sorted by relevance
- `?search=blog&sortBy=clicks&sortOrder=desc` - Find URLs with "blog" sorted by most clicks

**Error Responses:**

```json
{
  "status": 400,
  "message": "Search term must be at least 2 characters long"
}
```
