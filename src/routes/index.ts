const router = require("express").Router();

const authRoutes = require("@/routes/authRoutes");
const urlRoutes = require("@/routes/urlRoutes");
const publicUrlRoutes = require("@/routes/publicUrlRoutes");

/**
 * Main router
 *
 * Combines all application routes with their respective prefixes
 * @module routes/index
 */

// Authentication routes
router.use("/auth", authRoutes);

// URL shortening and management routes (authenticated)
router.use("/urls", urlRoutes);

// Public URL shortening routes (no authentication)
router.use("/public/urls", publicUrlRoutes);

module.exports = router;
