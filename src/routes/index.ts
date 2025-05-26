const router = require('express').Router();

const authRoutes = require('../routes/authRoutes');
const publicUrlRoutes = require('../routes/publicUrlRoutes');
const urlRoutes = require('../routes/urlRoutes');
const qrCodeRoutes = require('../routes/qrCodeRoutes');
const conversionRoutes = require('../routes/conversionRoutes');
const ctrRoutes = require('../routes/ctrRoutes');
const jobRoutes = require('../routes/jobRoutes');
const userProfileRoutes = require('../routes/userProfileRoutes');

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
router.use('/qr-codes', qrCodeRoutes);

// Conversion tracking routes
router.use('/', conversionRoutes);

// CTR (Click-Through Rate) routes
router.use('/ctr', ctrRoutes);

// Job management routes (admin only)
router.use('/jobs', jobRoutes);

// User profile management routes
router.use('/profile', userProfileRoutes);

module.exports = router;
