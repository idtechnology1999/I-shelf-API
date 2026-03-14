const express = require('express');
const authRoutes = require('./auth.route');
const profileRoutes = require('./profile.route');
const supportRoutes = require('./support.route');
const passwordRoutes = require('./password.route');
const paymentRoutes = require('./payment.route');
const bookRoutes = require('./book.route');
const statsRoutes = require('./stats.route');
const virtualAccountRoutes = require('./virtualAccount.route');
const subaccountRoutes = require('./subaccount.route');
const withdrawalRoutes = require('./withdrawal.route');

const router = express.Router();

router.use('/', authRoutes);
router.use('/', passwordRoutes);
router.use('/', profileRoutes);
router.use('/profile', profileRoutes);
router.use('/support', supportRoutes);
router.use('/payment', paymentRoutes);
router.use('/book', bookRoutes);
router.use('/dashboard', statsRoutes);
router.use('/virtual-account', virtualAccountRoutes);
router.use('/subaccount', subaccountRoutes);
router.use('/withdrawal', withdrawalRoutes);

module.exports = router;
