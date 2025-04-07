const router = require('express').Router();

const authRoutes = require('@/routes/authRoutes');

router.use('/auth', authRoutes);

module.exports = router;
