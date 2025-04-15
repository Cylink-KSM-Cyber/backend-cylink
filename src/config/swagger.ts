/**
 * Swagger/OpenAPI configuration
 *
 * Sets up the OpenAPI documentation with information about the API,
 * authentication, and general configuration settings.
 *
 * @module config/swagger
 */

import swaggerJsDoc from 'swagger-jsdoc';
import { Options } from 'swagger-jsdoc';

const isProd = process.env.NODE_ENV === 'production';

const swaggerOptions: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CyLink API Documentation',
      version: '1.0.0',
      description: 'API documentation for CyLink URL Shortener and QR Code Generator',
      contact: {
        name: 'CyLink Support',
        email: 'support@cylink.id',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: 'Development server',
      },
      {
        url: 'https://cylink.id',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your bearer token in the format "Bearer {token}"',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'integer',
              example: 400,
            },
            message: {
              type: 'string',
              example: 'Bad Request',
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                  },
                  message: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'integer',
              example: 200,
            },
            message: {
              type: 'string',
              example: 'Success',
            },
            data: {
              type: 'object',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Endpoints for authentication',
      },
      {
        name: 'URLs',
        description: 'Endpoints for managing shortened URLs',
      },
      {
        name: 'Public URLs',
        description: 'Public endpoints for URL shortening without authentication',
      },
      {
        name: 'QR Codes',
        description: 'Endpoints for generating and managing QR codes',
      },
      {
        name: 'Getting Started',
        description: 'Information for getting started with the CyLink API',
      },
    ],
  },
  apis: isProd
  ? [ './dist/routes/*.js', './dist/models/*.js', './dist/docs/*.js' ]
  : [ './src/routes/*.ts', './src/models/*.ts', './src/docs/*.ts' ],
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);

export default swaggerSpec;
