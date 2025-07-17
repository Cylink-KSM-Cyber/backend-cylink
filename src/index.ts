/**
 * Main application entry point
 *
 * Sets up middleware, routes, and starts the server
 * @module index
 */
require('dotenv').config();

// IMPORTANT: Import Sentry instrument at the very top - must be first
require('./instrument');

// Set up module aliases before anything else
// import './moduleAlias';

import express, { json, urlencoded, Request, Response } from 'express';
import { setupSwagger } from './middlewares/swagger';
import { startScheduler } from './jobs/jobScheduler';
import cors from 'cors';
import logger from './utils/logger';

import * as Sentry from '@sentry/node'; 
const app = express();
const port = process.env.PORT || 3000;
const clickTrackerMiddleware = require('./middlewares/clickTracker');
const redirectMiddleware = require('./middlewares/redirectMiddleware');
const routes = require('./routes');

// CORS middleware - allow cross-origin requests
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(
  cors({
    origin: [frontendUrl, 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  }),
);

// Basic middleware
app.use(json());
app.use(urlencoded({ extended: true }));

// Track information about clicks for analytics
app.use(clickTrackerMiddleware);

// Setup Swagger documentation
setupSwagger(app);

// API routes
app.use('/api/v1', routes);

app.get('/test', (req: any, res: any) => {
  logger.error('test error', 'test error json');
  return res.status(200).json({ message: 'test' });
});

// Sentry middleware
Sentry.setupExpressErrorHandler(app);

// Handle URL redirects for shortened URLs
// This should be after the API routes to avoid conflicting with them
app.use(redirectMiddleware);

/**
 * Global 404 handler for routes that don't match any endpoint
 *
 * This catches any request that wasn't handled by API routes or URL redirects
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Response} 404 JSON response
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 404,
    message: 'Not Found',
  });
});

// Start the server
app.listen(port, () => {
  /* eslint-disable no-console */
  console.log(`App listening on port ${port}`);
  /* eslint-enable no-console */

  // Start background job scheduler
  startScheduler();
});
