const router = require("express").Router();

const authRoutes = require("@/routes/authRoutes");
const urlRoutes = require("@/routes/urlRoutes");

/**
 * Main router
 *
 * Combines all application routes with their respective prefixes
 * @module routes/index
 */

// Authentication routes
router.use("/auth", authRoutes);

// URL shortening and management routes
router.use("/urls", urlRoutes);

module.exports = router;
