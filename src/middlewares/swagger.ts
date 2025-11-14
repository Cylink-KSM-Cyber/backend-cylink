/**
 * Swagger middleware
 *
 * Sets up the Swagger UI Express middleware for serving the API documentation
 * @module middlewares/swagger
 */

import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from '../config/swagger';
import basicAuth from 'express-basic-auth';

/**
 * Initializes Swagger UI middleware for the API documentation
 *
 * @param {Express} app - Express application instance
 * @returns {void}
 */
export const setupSwagger = (app: Express): void => {
  // Basic auth protection for documentation
  const docsAuth = basicAuth({
    users: { 
      [process.env.DOCS_USERNAME || 'admin']: process.env.DOCS_PASSWORD || 'password' 
    },
    challenge: true,
    realm: 'CyLink API Documentation',
  });

  // Serve Swagger documentation UI with basic auth
  app.use(
    '/api/docs',
    docsAuth,
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'CyLink API Documentation',
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        persistAuthorization: true,
      },
    }),
  );

  // Serve Swagger JSON with basic auth
  app.get('/api/docs.json', docsAuth, (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Log to console that Swagger is available
  /* eslint-disable no-console */
  console.log(
    `📚 Swagger documentation available at http://localhost:${process.env.PORT || 3000}/api/docs`,
  );
  console.log(
    `🔐 Authentication required - Username: ${process.env.DOCS_USERNAME || 'admin'}`,
  );
  /* eslint-enable no-console */
};
