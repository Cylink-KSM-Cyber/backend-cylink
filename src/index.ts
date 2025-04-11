require("dotenv").config();

import express, { Request, Response } from "express";
const app = express();
const port = process.env.PORT || 3000;
const routes = require("@/routes");
const clickTrackerMiddleware = require("@/middlewares/clickTracker");
const redirectMiddleware = require("@/middlewares/redirectMiddleware");

/**
 * Main application entry point
 *
 * Sets up middleware, routes, and starts the server
 * @module index
 */

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Track information about clicks for analytics
app.use(clickTrackerMiddleware);

// API routes
app.use("/api/v1", routes);

// Handle URL redirects for shortened URLs
// This should be after the API routes to avoid conflicting with them
app.use(redirectMiddleware);

// 404 handler for non-existent routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 404,
    message: "Not Found",
  });
});

// Start the server
app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
