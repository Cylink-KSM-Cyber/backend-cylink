const router = require('express').Router();

const authRoutes = require('../routes/authRoutes');
const publicUrlRoutes = require('../routes/publicUrlRoutes');
const urlRoutes = require('../routes/urlRoutes');
const qrCodeRoutes = require('../routes/qrCodeRoutes');

/**
 * Main router
 *
 * Combines all application routes with their respective prefixes
 * @module routes/index
 */

// Authentication routes
router.use('/auth', authRoutes);

// URL shortening and management routes (authenticated)
router.use('/urls', urlRoutes);

// Public URL shortening routes (no authentication)
router.use('/public/urls', publicUrlRoutes);

// QR code generation routes
router.use('/api/v1/qr-codes', qrCodeRoutes);

module.exports = router;
