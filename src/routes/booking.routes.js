const express = require('express');
const {
    createBooking,
    getAllBookings,
    getMyBookings,
    getBookingById,
    updateBookingStatus,
    cancelBooking,
    getBookingStats,
} = require('../controllers/booking.controller');
const { protect, restrictTo } = require('../middleware/auth');
const {
    validate,
    createBookingSchema,
    updateBookingStatusSchema,
} = require('../middleware/validation');

const router = express.Router();

router.use(protect);

router
    .route('/')
    .get(restrictTo('admin'), getAllBookings)
    .post(validate(createBookingSchema), createBooking);

router.get('/my', getMyBookings);
router.get('/stats/overview', restrictTo('admin'), getBookingStats);

router
    .route('/:id')
    .get(getBookingById)
    .delete(cancelBooking);

router
    .route('/:id/status')
    .put(
        restrictTo('admin'),
        validate(updateBookingStatusSchema),
        updateBookingStatus
    );

module.exports = router;
