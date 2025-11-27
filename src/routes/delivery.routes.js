const express = require('express');
const {
    createDelivery,
    getMyDeliveries,
    getDeliveryByBookingId,
    downloadDelivery,
    deleteDelivery,
    addPhotosToDelivery,
} = require('../controllers/delivery.controller');
const { protect, restrictTo } = require('../middleware/auth');
const { validate, createDeliverySchema } = require('../middleware/validation');
const { uploadMultiple } = require('../middleware/upload');

const router = express.Router();

router.use(protect);

router.get('/my', getMyDeliveries);
router.get('/:bookingId', getDeliveryByBookingId);
router.get('/:bookingId/download', downloadDelivery);

router.post(
    '/:bookingId',
    restrictTo('admin'),
    uploadMultiple('photos'),
    validate(createDeliverySchema),
    createDelivery
);

router.delete('/:id', restrictTo('admin'), deleteDelivery);

router.post(
    '/:id/photos',
    restrictTo('admin'),
    uploadMultiple('photos'),
    addPhotosToDelivery
);

module.exports = router;
