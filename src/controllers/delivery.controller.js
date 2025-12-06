const Delivery = require('../models/Delivery');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { AppError, catchAsync } = require('../utils/errorHandler');
const { uploadMultipleImages, deleteMultipleImages } = require('../services/cloudinary.service');
const { sendPhotoDeliveryEmail } = require('../services/email.service');
const { Op } = require('sequelize');

/**
 * @desc    Create delivery for booking
 * @route   POST /api/v1/deliveries/:bookingId
 * @access  Private/Admin
 */
const createDelivery = catchAsync(async (req, res, next) => {
    const { bookingId } = req.params;
    const { albumName, description, expiresAt, password, isPublic, allowDownload, watermarkEnabled } = req.body;

    // Check if booking exists
    const booking = await Booking.findByPk(bookingId, {
        include: [{ model: User, as: 'user' }]
    });

    if (!booking) {
        return next(new AppError('Booking not found', 404));
    }

    // Check if delivery already exists
    const existingDelivery = await Delivery.findOne({ where: { bookingId } });
    if (existingDelivery) {
        return next(new AppError('Delivery already exists for this booking', 400));
    }

    // Upload photos
    if (!req.files || req.files.length === 0) {
        return next(new AppError('Please upload at least one photo', 400));
    }

    const uploadedPhotos = await uploadMultipleImages(req.files, 'deliveries');
    const photos = uploadedPhotos.map((photo, index) => ({
        url: photo.url,
        publicId: photo.publicId,
        thumbnail: photo.url, // You can generate actual thumbnails if needed
        filename: req.files[index].originalname,
        size: photo.size,
        format: photo.format,
        watermarked: watermarkEnabled,
        order: index,
    }));

    // Create delivery
    const delivery = await Delivery.create({
        bookingId,
        albumName,
        description,
        photos,
        expiresAt,
        password,
        isPublic,
        allowDownload,
        watermarkEnabled,
    });

    // Update booking status to completed if not already
    if (booking.bookingStatus !== 'Completed') {
        booking.bookingStatus = 'Completed';
        booking.completedAt = new Date();
        await booking.save();
    }

    // Send notification email
    sendPhotoDeliveryEmail(booking.user.email, {
        clientName: booking.contactInfo.name,
        albumName,
        photoCount: photos.length,
        accessLink: `${process.env.FRONTEND_URL}/deliveries/${delivery.id}`,
        expiresAt: expiresAt ? new Date(expiresAt).toLocaleDateString() : null,
    }).catch((err) => console.error('Failed to send delivery email:', err));

    delivery.notifiedAt = new Date();
    await delivery.save();

    res.status(201).json({
        success: true,
        message: 'Delivery created successfully',
        data: {
            delivery,
        },
    });
});

/**
 * @desc    Get user's deliveries
 * @route   GET /api/v1/deliveries/my
 * @access  Private
 */
const getMyDeliveries = catchAsync(async (req, res, next) => {
    // Find bookings for this user
    const bookings = await Booking.findAll({
        where: { userId: req.user.id },
        attributes: ['id']
    });
    const bookingIds = bookings.map((b) => b.id);

    // Find deliveries for these bookings
    const deliveries = await Delivery.findAll({
        where: { bookingId: { [Op.in]: bookingIds } },
        include: [
            {
                model: Booking,
                as: 'booking',
                attributes: ['bookingDate'],
                include: [{ model: User, as: 'user', attributes: ['name'] }]
            }
        ],
        order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
        success: true,
        count: deliveries.length,
        data: {
            deliveries,
        },
    });
});

/**
 * @desc    Get delivery by booking ID
 * @route   GET /api/v1/deliveries/:bookingId
 * @access  Private
 */
const getDeliveryByBookingId = catchAsync(async (req, res, next) => {
    const delivery = await Delivery.findOne({
        where: { bookingId: req.params.bookingId },
        include: [{ model: Booking, as: 'booking' }]
    });

    if (!delivery) {
        return next(new AppError('Delivery not found', 404));
    }

    // Check authorization
    const booking = await Booking.findByPk(delivery.bookingId);
    if (req.user.role !== 'admin' && booking.userId !== req.user.id) {
        return next(new AppError('You are not authorized to view this delivery', 403));
    }

    // Check if expired
    if (delivery.isExpired()) {
        return next(new AppError('This delivery has expired', 410));
    }

    // Increment views
    delivery.views += 1;
    await delivery.save({ validate: false });

    res.status(200).json({
        success: true,
        data: {
            delivery,
        },
    });
});

/**
 * @desc    Download delivery photos
 * @route   GET /api/v1/deliveries/:bookingId/download
 * @access  Private
 */
const downloadDelivery = catchAsync(async (req, res, next) => {
    const delivery = await Delivery.findOne({
        where: { bookingId: req.params.bookingId }
    });

    if (!delivery) {
        return next(new AppError('Delivery not found', 404));
    }

    // Check authorization
    const booking = await Booking.findByPk(delivery.bookingId);
    if (req.user.role !== 'admin' && booking.userId !== req.user.id) {
        return next(new AppError('You are not authorized to download this delivery', 403));
    }

    if (!delivery.allowDownload) {
        return next(new AppError('Downloads are not allowed for this delivery', 403));
    }

    if (delivery.isExpired()) {
        return next(new AppError('This delivery has expired', 410));
    }

    // Increment downloads
    delivery.downloads += 1;
    await delivery.save({ validate: false });

    res.status(200).json({
        success: true,
        message: 'Download links retrieved successfully',
        data: {
            photos: delivery.photos.map((photo) => ({
                url: photo.url,
                filename: photo.filename,
            })),
        },
    });
});

/**
 * @desc    Delete delivery
 * @route   DELETE /api/v1/deliveries/:id
 * @access  Private/Admin
 */
const deleteDelivery = catchAsync(async (req, res, next) => {
    const delivery = await Delivery.findByPk(req.params.id);

    if (!delivery) {
        return next(new AppError('Delivery not found', 404));
    }

    // Delete photos from Cloudinary
    const publicIds = delivery.photos.map((photo) => photo.publicId);
    if (publicIds.length > 0) {
        await deleteMultipleImages(publicIds).catch((err) =>
            console.error('Failed to delete images:', err)
        );
    }

    await delivery.destroy();

    res.status(200).json({
        success: true,
        message: 'Delivery deleted successfully',
    });
});

/**
 * @desc    Add photos to existing delivery
 * @route   POST /api/v1/deliveries/:id/photos
 * @access  Private/Admin
 */
const addPhotosToDelivery = catchAsync(async (req, res, next) => {
    const delivery = await Delivery.findByPk(req.params.id);

    if (!delivery) {
        return next(new AppError('Delivery not found', 404));
    }

    if (!req.files || req.files.length === 0) {
        return next(new AppError('Please upload at least one photo', 400));
    }

    const uploadedPhotos = await uploadMultipleImages(req.files, 'deliveries');
    const newPhotos = uploadedPhotos.map((photo, index) => ({
        url: photo.url,
        publicId: photo.publicId,
        thumbnail: photo.url,
        filename: req.files[index].originalname,
        size: photo.size,
        format: photo.format,
        watermarked: delivery.watermarkEnabled,
        order: delivery.photos.length + index,
    }));

    // Update photos array
    const updatedPhotos = [...delivery.photos, ...newPhotos];
    delivery.photos = updatedPhotos;
    await delivery.save();

    res.status(200).json({
        success: true,
        message: 'Photos added successfully',
        data: {
            delivery,
        },
    });
});

module.exports = {
    createDelivery,
    getMyDeliveries,
    getDeliveryByBookingId,
    downloadDelivery,
    deleteDelivery,
    addPhotosToDelivery,
};
