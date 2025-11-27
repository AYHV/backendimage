const express = require('express');
const authRoutes = require('./auth.routes');
const portfolioRoutes = require('./portfolio.routes');
const packageRoutes = require('./package.routes');
const bookingRoutes = require('./booking.routes');
const paymentRoutes = require('./payment.routes');
const deliveryRoutes = require('./delivery.routes');
const adminRoutes = require('./admin.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/portfolio', portfolioRoutes);
router.use('/packages', packageRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/deliveries', deliveryRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
