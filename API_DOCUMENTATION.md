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
- `GET /api/v1/public/urls/:short_code` - Get details of a shortened URL without authentication
- `GET /:short_code` - Resolve and redirect to original URL

### Public URL Details

Retrieves public details about a shortened URL by its short code without requiring authentication.

**Request:**

- Method: GET
- Endpoint: `/api/v1/public/urls/{shortCode}`
- Authentication: None required

**Parameters:**

- `shortCode` (path parameter, required): The short code of the URL to retrieve

**Rate Limiting:**

- 60 requests per minute per IP address

**Response:**

- Success (200):

  ```json
  {
    "status": 200,
    "message": "URL details retrieved successfully",
    "data": {
      "original_url": "https://example.com/very-long-url-path",
      "title": "Example Website - Optional Title",
      "short_code": "abc123",
      "short_url": "https://cylink.id/abc123",
      "created_at": "2025-04-10T12:00:00Z",
      "expiry_date": "2025-05-10T00:00:00Z",
      "is_active": true
    }
  }
  ```

- Error (Not Found):

  ```json
  {
    "status": 404,
    "message": "URL not found or inactive"
  }
  ```

- Error (Rate Limit Exceeded):

  ```json
  {
    "status": 429,
    "message": "Rate limit exceeded. Please try again later."
  }
  ```

### QR Codes

- `POST /api/v1/qr-codes` - Generate a new QR code
- `GET /api/v1/qr-codes/:id` - Get a specific QR code by ID

### Delete QR Code

Soft-deletes a QR code.

**Request:**

- Method: DELETE
- Endpoint: `/api/v1/qr-codes/{id}`
- Authorization: Bearer Token

**Response:**

- Success:

  ```json
  {
    "status": 200,
    "message": "QR code deleted successfully",
    "data": {
      "id": 45,
      "deleted_at": "2023-04-18T15:30:00Z"
    }
  }
  ```

- Error (Not Found):

  ```json
  {
    "status": 404,
    "message": "QR code not found"
  }
  ```

- Error (Unauthorized):

  ```json
  {
    "status": 401,
    "message": "Unauthorized"
  }
  ```

- Error (Forbidden):
  ```json
  {
    "status": 403,
    "message": "You do not have permission to delete this QR code"
  }
  ```

## URLs API Endpoints

### Get URLs with Filtering and Search

```
GET /api/v1/urls
```

**Authentication Required**: Yes (Bearer Token)

**Query Parameters**:

- `status` (optional): Filter by URL status - 'all', 'active', 'inactive', 'expired', 'expiring-soon' (default: 'all')
- `search` (optional): Search term to filter results
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page (default: 10)
- `sortBy` (optional): Field to sort by - 'created_at', 'clicks', 'title', 'relevance' (default: 'created_at')
- `sortOrder` (optional): Order of sorting - 'asc', 'desc' (default: 'desc')

**Response**:

```json
{
  "status": 200,
  "message": "URLs filtered successfully",
  "data": [
    {
      "id": 123,
      "original_url": "https://example.com/path",
      "short_code": "abc123",
      "short_url": "https://cylink.id/abc123",
      "title": "Example URL",
      "clicks": 42,
      "created_at": "2025-04-10T12:00:00Z",
      "updated_at": "2025-04-11T09:30:00Z",
      "expiry_date": "2025-05-10T00:00:00Z",
      "is_active": true,
      "status": "active",
      "days_until_expiry": 30
    }
    // More URLs...
  ],
  "pagination": {
    "total": 24,
    "page": 1,
    "limit": 10,
    "total_pages": 3
  },
  "filter_info": {
    "status": "active",
    "total_matching": 24,
    "total_all": 35
  }
}
```

**Status Filtering Options**:

- `all`: Returns all URLs (default)
- `active`: Only returns URLs that are currently active (not expired and is_active=true)
- `inactive`: Only returns URLs that are manually set to inactive (is_active=false)
- `expired`: Only returns URLs that have passed their expiry date
- `expiring-soon`: Only returns URLs that will expire within the next 7 days

**Combined Search and Status Filtering**:
You can combine the `status` and `search` parameters to find URLs that match both criteria. For example:

```
GET /api/v1/urls?status=active&search=example
```

This will return only active URLs that contain "example" in their original URL, short code, or title.

When both search and status filtering are used, the response will include both `filter_info` and `search_info`:

```json
{
  "status": 200,
  "message": "URLs filtered and searched successfully",
  "data": [
    // Filtered and searched URLs...
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "total_pages": 1
  },
  "filter_info": {
    "status": "active",
    "total_matching": 5,
    "total_all": 35
  },
  "search_info": {
    "term": "example",
    "fields_searched": ["original_url", "short_code", "title"],
    "total_matches": 8
  }
}
```

If no URLs match the specified filter and search:

```json
{
  "status": 200,
  "message": "No URLs match the specified filter and search term \"example\"",
  "data": [],
  "pagination": {
    "total": 0,
    "page": 1,
    "limit": 10,
    "total_pages": 0
  },
  "filter_info": {
    "status": "expired",
    "total_matching": 0,
    "total_all": 35
  },
  "search_info": {
    "term": "example",
    "fields_searched": ["original_url", "short_code", "title"],
    "total_matches": 8
  }
}
```

**Error Responses**:

- 400: Invalid parameters (e.g., invalid status value)

```json
{
  "status": 400,
  "message": "Invalid status parameter",
  "errors": ["Status must be one of: all, active, inactive, expired, expiring-soon"]
}
```

- 401: Unauthorized (invalid or missing token)
- 500: Server error
