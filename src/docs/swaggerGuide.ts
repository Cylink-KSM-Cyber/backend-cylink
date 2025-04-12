/**
 * Swagger Guide Documentation
 *
 * Contains the Swagger documentation introduction and help content
 * that will be displayed at the top of the documentation.
 *
 * @module docs/swaggerGuide
 */

/**
 * @swagger
 * tags:
 *   name: Getting Started
 *   description: Information for getting started with the CyLink API
 *
 * /api/docs:
 *   get:
 *     summary: View the API documentation
 *     tags: [Getting Started]
 *     description: |
 *       # Welcome to CyLink API Documentation
 *
 *       This documentation provides details about the CyLink URL Shortener and QR Code Generator API.
 *       You can use this interface to explore and test all available endpoints.
 *
 *       ## Authentication
 *
 *       Most API endpoints require authentication. To use these endpoints:
 *
 *       1. Create an account or login using the `/api/v1/auth/register` or `/api/v1/auth/login` endpoints
 *       2. Get your access token from the response
 *       3. Click the "Authorize" button at the top of the page
 *       4. Enter your token in the format `Bearer your-token-here`
 *       5. Click "Authorize" and close the dialog
 *
 *       Now you're authenticated and can use the secured endpoints.
 *
 *       ## URL Shortening
 *
 *       CyLink provides two ways to shorten URLs:
 *
 *       - **Authenticated**: Using the `/api/v1/urls` endpoints, which requires authentication but provides
 *         analytics and management capabilities
 *       - **Public**: Using the `/api/v1/public/urls` endpoint, which doesn't require authentication
 *         but has more limited features
 *
 *       ## QR Code Generation
 *
 *       You can generate QR codes for your shortened URLs using the `/api/v1/qr-codes` endpoints.
 *       The API supports customizing colors, adding logos, and setting dimensions.
 *
 *       ## Response Format
 *
 *       All API responses follow a consistent format:
 *
 *       ```json
 *       {
 *         "status": 200,
 *         "message": "Success message",
 *         "data": {
 *           // Response data specific to the endpoint
 *         }
 *       }
 *       ```
 *
 *       ## Error Codes
 *
 *       - `400`: Bad Request - Check your request parameters
 *       - `401`: Unauthorized - Authentication required or invalid token
 *       - `403`: Forbidden - You don't have permission for this operation
 *       - `404`: Not Found - Resource doesn't exist
 *       - `409`: Conflict - Resource already exists (e.g., duplicate custom code)
 *       - `422`: Validation Error - Invalid input data
 *       - `500`: Internal Server Error - Something went wrong on the server
 *
 *       ## Rate Limiting
 *
 *       Public API endpoints have rate limiting to prevent abuse. Authenticated endpoints
 *       have higher limits. If you exceed the limits, you'll receive a 429 (Too Many Requests)
 *       response with a Retry-After header.
 *     responses:
 *       200:
 *         description: API documentation
 */

export {}; // This export is necessary to make TypeScript treat this as a module
