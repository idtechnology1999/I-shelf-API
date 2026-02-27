const express = require('express');
const authRoutes = require('./auth.route');
const authorsRoutes = require('./authors.route');
const readersRoutes = require('./readers.route');
const notificationsRoutes = require('./notifications.route');
const supportRoutes = require('./support.route');
const manageRoutes = require('./manage.route');

const router = express.Router();

router.use('/', authRoutes);
router.use('/authors', authorsRoutes);
router.use('/readers', readersRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/support', supportRoutes);
router.use('/manage', manageRoutes);

module.exports = router;
