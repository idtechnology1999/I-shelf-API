const express = require('express');
const authRoutes = require('./auth.route');
const profileRoutes = require('./profile.route');
const supportRoutes = require('./support.route');
const profileImageRoutes = require('./profile.route');

const router = express.Router();

router.use('/', authRoutes);
router.use('/', profileRoutes);
router.use('/profile', profileImageRoutes);
router.use('/support', supportRoutes);

module.exports = router;
