const express = require('express');
const {
    createBooking,
    getAllBookings,
    getMyBookings,
    getBookingById,
    updateBookingStatus,
    cancelBooking,
    getBookingStats,
    uploadBookingPhotos,
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

// Photo upload route
router
    .route('/:id/photos')
    .post(
        restrictTo('admin'),
        require('../middleware/upload').uploadMultiple('photos'),
        require('../controllers/booking.controller').uploadBookingPhotos
    );

module.exports = router;
