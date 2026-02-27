const express = require('express');
const authRoutes = require('./auth.route');
const passwordRoutes = require('./password.route');
const supportRoutes = require('./support.route');
const profileRoutes = require('./profile.route');

const router = express.Router();

router.use('/', authRoutes);
router.use('/', passwordRoutes);
router.use('/profile', profileRoutes);
router.use('/support', supportRoutes);

module.exports = router;
