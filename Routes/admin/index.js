const express = require('express');
const authRoutes = require('./auth.route');
const passwordRoutes = require('./password.route');
const authorsRoutes = require('./authors.route');
const readersRoutes = require('./readers.route');
const notificationsRoutes = require('./notifications.route');
const supportRoutes = require('./support.route');
const manageRoutes = require('./manage.route');
const inviteRoutes = require('./invite.route');
const booksRoutes = require('./books.route');
const dashboardRoutes = require('./dashboard.route');
const transactionsRoutes = require('./transactions.route');
const usersRoutes = require('./users.route');
const readerFinanceRoutes = require('./reader-finance.route');

const router = express.Router();

router.use('/', authRoutes);
router.use('/password', passwordRoutes);
router.use('/authors', authorsRoutes);
router.use('/readers', readersRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/support', supportRoutes);
router.use('/manage', manageRoutes);
router.use('/invite', inviteRoutes);
router.use('/books', booksRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/transactions', transactionsRoutes);
router.use('/users', usersRoutes);
router.use('/reader-finance', readerFinanceRoutes);

module.exports = router;
