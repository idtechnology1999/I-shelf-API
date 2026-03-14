const express = require('express');
const authRoutes = require('./auth.route');
const passwordRoutes = require('./password.route');
const supportRoutes = require('./support.route');
const profileRoutes = require('./profile.route');
const booksRoutes = require('./books.route');
const paymentRoutes = require('./payment.route');
const cartRoutes = require('./cart.route');
const referralRoutes = require('./referral.route');

const router = express.Router();

router.use('/', authRoutes);
router.use('/', passwordRoutes);
router.use('/profile', profileRoutes);
router.use('/support', supportRoutes);
router.use('/books', booksRoutes);
router.use('/payment', paymentRoutes);
router.use('/cart', cartRoutes);
router.use('/referral', referralRoutes);

module.exports = router;
