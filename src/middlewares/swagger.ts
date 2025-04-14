/**
 * Swagger middleware
 *
 * Sets up the Swagger UI Express middleware for serving the API documentation
 * @module middlewares/swagger
 */

import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from '../config/swagger';

/**
 * Initializes Swagger UI middleware for the API documentation
 *
 * @param {Express} app - Express application instance
 * @returns {void}
 */
export const setupSwagger = (app: Express): void => {
  // Serve Swagger documentation UI
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.1.0/swagger-ui.min.css',
      customSiteTitle: 'CyLink API Documentation',
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        persistAuthorization: true,
      },
    }),
  );

  // Serve Swagger JSON
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Log to console that Swagger is available
  /* eslint-disable no-console */
  console.log(
    `📚 Swagger documentation available at http://localhost:${process.env.PORT || 3000}/api/docs`,
  );
  /* eslint-enable no-console */
};
